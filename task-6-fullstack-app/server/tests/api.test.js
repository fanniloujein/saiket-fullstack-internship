// Integration tests against a real PostgreSQL database (TEST_DATABASE_URL). All its tables are emptied.
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
import { DEMO_PASSWORD, seedDemo } from "../src/db/seed.js";
import { createLoginLimiter } from "../src/middleware/rateLimit.js";

const db = createDb(process.env.TEST_DATABASE_URL || "postgres://saiket:saiket@localhost:5432/orbit_test");
let app;

before(() => migrate(db, { log: () => {} }));
beforeEach(async () => {
  await db.query("TRUNCATE activity, sessions, users");
  await seedDemo(db, { log: () => {} });
  app = createApp({ db, silent: true, limiter: createLoginLimiter({ maxFailures: 3 }) }).app;
});
after(() => db.close());

// A supertest "agent" keeps cookies between requests, like a browser
async function loginAs(email, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}
const newUser = { name: "Loujein Fanni", email: "loujein@example.com", age: 25, password: "Secret123" };

describe("authentication", () => {
  it("signs up, sets an HttpOnly cookie and returns the profile", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/register").send(newUser).expect(201);
    assert.match(res.headers["set-cookie"][0], /orbit_sid=.+; Path=\/; HttpOnly; SameSite=Lax/);
    assert.equal(res.body.data.role, "user");
    assert.equal(res.body.data.password_hash, undefined);
    const me = await agent.get("/api/auth/me").expect(200);
    assert.equal(me.body.data.email, "loujein@example.com");
  });

  it("stores a scrypt hash, never the password", async () => {
    await request(app).post("/api/auth/register").send(newUser).expect(201);
    const { rows } = await db.query("SELECT password_hash FROM users WHERE email = $1", [newUser.email]);
    assert.match(rows[0].password_hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it("validates sign-up data", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "L", email: "x", age: 8, password: "short" }).expect(400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ["age", "email", "name", "password"]);
    await request(app).post("/api/auth/register").send({ ...newUser, email: "amira@orbit.demo" }).expect(409);
  });

  it("refuses a wrong password with a generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "amira@orbit.demo", password: "Wrong1234" }).expect(401);
    assert.equal(res.body.error.message, "E-mail ou mot de passe incorrect.");
    await request(app).post("/api/auth/login").send({ email: "nobody@orbit.demo", password: "Wrong1234" }).expect(401);
  });

  it("blocks brute force after too many failures (429)", async () => {
    for (let i = 0; i < 3; i++) await request(app).post("/api/auth/login").send({ email: "amira@orbit.demo", password: "Nope12345" }).expect(401);
    const res = await request(app).post("/api/auth/login").send({ email: "amira@orbit.demo", password: DEMO_PASSWORD }).expect(429);
    assert.ok(Number(res.headers["retry-after"]) > 0);
  });

  it("logs out and revokes the session in the database", async () => {
    const agent = await loginAs("amira@orbit.demo");
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/me").expect(401);
    const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM sessions");
    assert.equal(rows[0].n, 0);
  });

  it("makes the very first account an administrator", async () => {
    await db.query("TRUNCATE activity, sessions, users");
    const res = await request(app).post("/api/auth/register").send(newUser).expect(201);
    assert.equal(res.body.data.role, "admin");
  });
});

describe("my profile (/api/me)", () => {
  it("views and updates my profile, ignoring the role", async () => {
    const agent = await loginAs("amira@orbit.demo");
    const res = await agent.patch("/api/me").send({ name: "Amira B.", age: 25, bio: "Hello" }).expect(200);
    assert.deepEqual([res.body.data.name, res.body.data.age, res.body.data.bio], ["Amira B.", 25, "Hello"]);
    await agent.patch("/api/me").send({ role: "admin" }).expect(400); // not allowed here
  });

  it("changes my password and logs out my other devices", async () => {
    const phone = await loginAs("amira@orbit.demo");
    const laptop = await loginAs("amira@orbit.demo");
    await laptop.put("/api/me/password").send({ currentPassword: "bad", newPassword: "NewPass123" }).expect(401);
    await laptop.put("/api/me/password").send({ currentPassword: DEMO_PASSWORD, newPassword: "NewPass123" }).expect(204);
    await laptop.get("/api/me").expect(200);
    await phone.get("/api/me").expect(401);
    await loginAs("amira@orbit.demo", "NewPass123");
  });

  it("deletes my account after confirming the password", async () => {
    const agent = await loginAs("amira@orbit.demo");
    await agent.delete("/api/me").send({ password: "wrong" }).expect(401);
    await agent.delete("/api/me").send({ password: DEMO_PASSWORD }).expect(204);
    await request(app).post("/api/auth/login").send({ email: "amira@orbit.demo", password: DEMO_PASSWORD }).expect(401);
  });

  it("shows my own activity", async () => {
    const agent = await loginAs("amira@orbit.demo");
    await agent.patch("/api/me").send({ age: 26 });
    const res = await agent.get("/api/me/activity").expect(200);
    assert.deepEqual(res.body.data.map((a) => a.action).slice(0, 2), ["profile.update", "login"]);
  });

  it("requires a session", async () => {
    await request(app).get("/api/me").expect(401);
  });
});

describe("administration (/api/users)", () => {
  it("is reserved for administrators", async () => {
    const user = await loginAs("amira@orbit.demo");
    await user.get("/api/users").expect(403);
    await request(app).get("/api/users").expect(401);
  });

  it("lists, searches, filters by role and paginates", async () => {
    const admin = await loginAs("admin@orbit.demo");
    const all = await admin.get("/api/users?limit=5").expect(200);
    assert.deepEqual(all.body.meta, { total: 8, page: 1, limit: 5, pages: 2 });
    const admins = await admin.get("/api/users?role=admin&sort=name").expect(200);
    assert.deepEqual(admins.body.data.map((u) => u.name), ["Admin Orbit", "Karim Haddad"]);
    const search = await admin.get("/api/users?search=sfax").expect(200);
    assert.equal(search.body.meta.total, 0); // search looks at name and email only
  });

  it("creates, updates, resets the password and deletes a user", async () => {
    const admin = await loginAs("admin@orbit.demo");
    const created = await admin.post("/api/users").send({ ...newUser, role: "user" }).expect(201);
    const id = created.body.data.id;
    const updated = await admin.patch(`/api/users/${id}`).send({ role: "admin", age: 26, password: "Reset1234" }).expect(200);
    assert.deepEqual([updated.body.data.role, updated.body.data.age], ["admin", 26]);
    await loginAs(newUser.email, "Reset1234");
    await admin.delete(`/api/users/${id}`).expect(204);
    await admin.get(`/api/users/${id}`).expect(404);
  });

  it("protects the last administrator and the admin's own account", async () => {
    const admin = await loginAs("admin@orbit.demo");
    const { body } = await admin.get("/api/users?role=admin&sort=name");
    const [me, karim] = body.data;
    await admin.patch(`/api/users/${me.id}`).send({ role: "user" }).expect(409); // own role
    await admin.delete(`/api/users/${me.id}`).expect(409); // own account (use /api/me)
    await admin.patch(`/api/users/${karim.id}`).send({ role: "user" }).expect(200); // now the only admin
    await admin.delete("/api/me").send({ password: DEMO_PASSWORD }).expect(409); // last admin
  });

  it("returns statistics and the activity log (JOIN)", async () => {
    const admin = await loginAs("admin@orbit.demo");
    await admin.post("/api/users").send(newUser).expect(201);
    const stats = await admin.get("/api/users/stats").expect(200);
    assert.equal(stats.body.data.total, 9);
    assert.equal(stats.body.data.admins, 2);
    assert.equal(stats.body.data.signups.length, 14);
    const log = await admin.get("/api/activity").expect(200);
    assert.deepEqual(log.body.data[0], { ...log.body.data[0], action: "user.create", actorName: "Admin Orbit", targetName: "Loujein Fanni" });
  });
});

describe("misc", () => {
  it("health, JSON 404 and security headers", async () => {
    const res = await request(app).get("/api/health").expect(200);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    await request(app).get("/api/nope").expect(404);
  });
});
