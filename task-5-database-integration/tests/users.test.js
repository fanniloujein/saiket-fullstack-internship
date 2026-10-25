// Integration tests against a real PostgreSQL database (TEST_DATABASE_URL).
// Warning: the users table of that database is emptied before every test.
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createDb, createPool } from "../src/db/pool.js";
import { migrate, seed } from "../src/db/migrate.js";
import { createPgUserStore } from "../src/store/pgUserStore.js";

const url = process.env.TEST_DATABASE_URL || "postgres://saiket:saiket@localhost:5432/saiket_users_test";
let db, app;

before(async () => {
  db = createDb(createPool(url));
  await migrate(db, { log: () => {} });
  app = createApp({ store: createPgUserStore(db), silent: true, showSql: true });
});

beforeEach(async () => {
  await db.query("TRUNCATE users");
  await seed(db, { log: () => {} });
});

after(() => db.close());

const alice = { name: "Alice Martin", email: "alice@example.com", age: 30 };

describe("GET /api/users (SELECT)", () => {
  it("lists the seeded users with pagination info", async () => {
    const res = await request(app).get("/api/users").expect(200);
    assert.equal(res.body.data.length, 8);
    assert.deepEqual(res.body.meta, { total: 8, page: 1, limit: 10, pages: 1 });
  });

  it("filters with WHERE, sorts with ORDER BY and paginates with LIMIT/OFFSET", async () => {
    const res = await request(app).get("/api/users?minAge=20&maxAge=40&sort=-age&limit=2&page=2").expect(200);
    assert.equal(res.body.meta.total, 5); // 22, 24, 28, 31, 36
    assert.deepEqual(res.body.data.map((u) => u.age), [28, 24]);
  });

  it("searches name and email case-insensitively (ILIKE)", async () => {
    const res = await request(app).get("/api/users?search=GHARBI").expect(200);
    assert.deepEqual(res.body.data.map((u) => u.name), ["Salma Gharbi"]);
  });

  it("is safe against SQL injection", async () => {
    const res = await request(app).get("/api/users").query({ search: "' OR 1=1; DROP TABLE users; --" }).expect(200);
    assert.equal(res.body.meta.total, 0);
    const still = await db.query("SELECT COUNT(*)::int AS n FROM users");
    assert.equal(still.rows[0].n, 8); // the table is still there
  });

  it("treats % and _ as normal characters in a search", async () => {
    const res = await request(app).get("/api/users?search=%25").expect(200);
    assert.equal(res.body.meta.total, 0);
  });
});

describe("POST /api/users (INSERT)", () => {
  it("inserts a row and returns 201 + Location", async () => {
    const res = await request(app).post("/api/users").send(alice).expect(201);
    assert.equal(res.headers.location, `/api/users/${res.body.data.id}`);
    const { rows } = await db.query("SELECT name, email, age FROM users WHERE id = $1", [res.body.data.id]);
    assert.deepEqual(rows[0], { name: "Alice Martin", email: "alice@example.com", age: 30 });
  });

  it("maps the UNIQUE constraint to 409 Conflict", async () => {
    await request(app).post("/api/users").send(alice).expect(201);
    const res = await request(app).post("/api/users").send({ ...alice, email: "ALICE@example.com" }).expect(409);
    assert.equal(res.body.error.code, "CONFLICT");
  });

  it("still validates the body before touching the database", async () => {
    const res = await request(app).post("/api/users").send({ name: "A", email: "x", age: 0 }).expect(400);
    assert.equal(res.body.error.details.length, 3);
  });
});

describe("GET / PUT / PATCH / DELETE /api/users/:id", () => {
  async function createAlice() {
    return (await request(app).post("/api/users").send(alice)).body.data;
  }

  it("reads one row, 404 for unknown or malformed ids", async () => {
    const user = await createAlice();
    assert.deepEqual((await request(app).get(`/api/users/${user.id}`).expect(200)).body.data, user);
    await request(app).get("/api/users/00000000-0000-0000-0000-000000000000").expect(404);
    await request(app).get("/api/users/not-a-uuid").expect(404);
    await request(app).delete("/api/users/not-a-uuid").expect(404);
  });

  it("updates with PUT and PATCH; the trigger refreshes updated_at", async () => {
    const user = await createAlice();
    await new Promise((r) => setTimeout(r, 15));
    const put = await request(app).put(`/api/users/${user.id}`).send({ name: "Alice Dupont", email: "alice.d@example.com", age: 31 }).expect(200);
    assert.equal(put.body.data.name, "Alice Dupont");
    assert.ok(put.body.data.updatedAt > user.updatedAt);
    const patch = await request(app).patch(`/api/users/${user.id}`).send({ age: 32 }).expect(200);
    assert.deepEqual([patch.body.data.name, patch.body.data.age], ["Alice Dupont", 32]);
  });

  it("refuses to take another user's email on update (409)", async () => {
    const user = await createAlice();
    await request(app).patch(`/api/users/${user.id}`).send({ email: "amira.bensalah@example.tn" }).expect(409);
  });

  it("deletes the row (204), then 404", async () => {
    const user = await createAlice();
    await request(app).delete(`/api/users/${user.id}`).expect(204);
    const { rowCount } = await db.query("SELECT 1 FROM users WHERE id = $1", [user.id]);
    assert.equal(rowCount, 0);
    await request(app).delete(`/api/users/${user.id}`).expect(404);
  });
});

describe("persistence and SQL features", () => {
  it("keeps data between two app instances (it is really in the database)", async () => {
    const created = (await request(app).post("/api/users").send(alice)).body.data;
    const otherApp = createApp({ store: createPgUserStore(db), silent: true });
    await request(otherApp).get(`/api/users/${created.id}`).expect(200);
  });

  it("computes statistics with COUNT, AVG, MIN, MAX and GROUP BY", async () => {
    const { body } = await request(app).get("/api/users/stats").expect(200);
    assert.equal(body.data.total, 8);
    assert.equal(body.data.youngest, 19);
    assert.equal(body.data.oldest, 52);
    assert.equal(body.data.averageAge, 32.1); // (24+31+19+45+28+36+22+52) / 8 = 32.125
    assert.equal(body.data.ageBrackets.reduce((n, b) => n + b.users, 0), 8);
    assert.deepEqual(body.data.emailDomains[0], { domain: "example.tn", users: 6 });
  });

  it("the database rejects invalid data even without the API (CHECK constraint)", async () => {
    await assert.rejects(db.query("INSERT INTO users (name, email, age) VALUES ('Too Old', 'old@example.com', 200)"), /check constraint/);
  });

  it("returns the executed SQL in the X-Sql-Queries header", async () => {
    const res = await request(app).get("/api/users?search=amira").expect(200);
    const queries = JSON.parse(decodeURIComponent(res.headers["x-sql-queries"]));
    assert.ok(queries.some((q) => q.sql.startsWith("SELECT id, name, email, age") && q.params[0] === "%amira%"));
  });

  it("health check reports the database", async () => {
    const res = await request(app).get("/api/health").expect(200);
    assert.equal(res.body.database, "connected");
  });
});
