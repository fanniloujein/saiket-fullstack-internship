import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

let app;
beforeEach(() => {
  app = createApp({ silent: true }); // a fresh app (and fresh data) for every test
});

const alice = { name: "Alice Martin", email: "alice@example.com", age: 30 };

describe("GET /api/users", () => {
  it("lists the seeded users with pagination info", async () => {
    const res = await request(app).get("/api/users").expect(200);
    assert.equal(res.body.data.length, 5);
    assert.deepEqual(res.body.meta, { total: 5, page: 1, limit: 10, pages: 1 });
  });

  it("searches, filters by age, sorts and paginates", async () => {
    const res = await request(app).get("/api/users?minAge=20&maxAge=40&sort=-age&limit=2").expect(200);
    assert.deepEqual(res.body.data.map((u) => u.age), [31, 28]);
    assert.equal(res.body.meta.total, 3);
    assert.equal(res.body.meta.pages, 2);

    const search = await request(app).get("/api/users?search=gharbi").expect(200);
    assert.equal(search.body.data[0].name, "Salma Gharbi");
  });

  it("rejects invalid query parameters", async () => {
    const res = await request(app).get("/api/users?limit=500&sort=password").expect(400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ["limit", "sort"]);
  });
});

describe("POST /api/users", () => {
  it("creates a user (201 + Location header)", async () => {
    const res = await request(app).post("/api/users").send({ ...alice, email: "  ALICE@Example.com " }).expect(201);
    assert.match(res.body.data.id, /^[0-9a-f-]{36}$/);
    assert.equal(res.body.data.email, "alice@example.com");
    assert.equal(res.headers.location, `/api/users/${res.body.data.id}`);
    await request(app).get(res.headers.location).expect(200);
  });

  it("validates every field", async () => {
    const res = await request(app).post("/api/users").send({ name: "A", email: "nope", age: 12.5, role: "admin" }).expect(400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ["age", "email", "name", "role"]);
  });

  it("requires all fields", async () => {
    const res = await request(app).post("/api/users").send({ name: "Alice" }).expect(400);
    assert.deepEqual(res.body.error.details.map((d) => d.field), ["email", "age"]);
  });

  it("refuses a duplicate email (409)", async () => {
    await request(app).post("/api/users").send(alice).expect(201);
    const res = await request(app).post("/api/users").send({ ...alice, name: "Other Alice" }).expect(409);
    assert.equal(res.body.error.code, "CONFLICT");
  });

  it("returns 400 for broken JSON and 415 for non-JSON bodies", async () => {
    await request(app).post("/api/users").set("Content-Type", "application/json").send('{"name": ').expect(400);
    await request(app).post("/api/users").set("Content-Type", "text/plain").send("hello").expect(415);
  });
});

describe("GET / PUT / PATCH / DELETE /api/users/:id", () => {
  async function createAlice() {
    return (await request(app).post("/api/users").send(alice)).body.data;
  }

  it("reads one user, or 404", async () => {
    const user = await createAlice();
    const res = await request(app).get(`/api/users/${user.id}`).expect(200);
    assert.deepEqual(res.body.data, user);
    await request(app).get("/api/users/unknown-id").expect(404);
  });

  it("replaces a user with PUT (all fields required)", async () => {
    const user = await createAlice();
    const res = await request(app).put(`/api/users/${user.id}`).send({ name: "Alice Dupont", email: "alice.d@example.com", age: 31 }).expect(200);
    assert.equal(res.body.data.name, "Alice Dupont");
    assert.notEqual(res.body.data.updatedAt, undefined);
    await request(app).put(`/api/users/${user.id}`).send({ age: 40 }).expect(400);
  });

  it("updates some fields with PATCH", async () => {
    const user = await createAlice();
    const res = await request(app).patch(`/api/users/${user.id}`).send({ age: 31 }).expect(200);
    assert.equal(res.body.data.age, 31);
    assert.equal(res.body.data.name, alice.name);
    await request(app).patch(`/api/users/${user.id}`).send({}).expect(400);
  });

  it("refuses to take another user's email", async () => {
    const user = await createAlice();
    await request(app).patch(`/api/users/${user.id}`).send({ email: "amira.bensalah@example.tn" }).expect(409);
    await request(app).patch(`/api/users/${user.id}`).send({ email: alice.email }).expect(200); // its own email is fine
  });

  it("deletes a user (204), then 404", async () => {
    const user = await createAlice();
    await request(app).delete(`/api/users/${user.id}`).expect(204);
    await request(app).get(`/api/users/${user.id}`).expect(404);
    await request(app).delete(`/api/users/${user.id}`).expect(404);
  });
});

describe("misc", () => {
  it("has a health check, an index and JSON 404s", async () => {
    await request(app).get("/api/health").expect(200);
    await request(app).get("/api").expect(200);
    const res = await request(app).get("/api/nothing").expect(404);
    assert.equal(res.body.error.code, "NOT_FOUND");
    assert.ok(res.headers["x-request-id"]);
  });

  it("answers CORS preflight requests", async () => {
    const res = await request(app).options("/api/users").expect(204);
    assert.equal(res.headers["access-control-allow-origin"], "*");
  });
});
