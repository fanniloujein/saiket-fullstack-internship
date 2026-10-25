// CRUD endpoints for /api/users, now backed by PostgreSQL
//   GET    /api/users        list (search, age filter, sort, pagination)
//   GET    /api/users/stats  aggregates computed in SQL (COUNT, AVG, GROUP BY)
//   GET    /api/users/:id    read one
//   POST   /api/users        create            -> 201 + Location header
//   PUT    /api/users/:id    replace all fields
//   PATCH  /api/users/:id    update some fields
//   DELETE /api/users/:id    delete            -> 204 No Content
import { Router } from "express";
import { parseListQuery, validateUser } from "../validation/user.js";
import { notFound } from "../utils/httpError.js";

export function usersRouter(store) {
  const router = Router();

  async function getUserOr404(id) {
    const user = await store.findById(id);
    if (!user) throw notFound(`User ${id} not found`);
    return user;
  }

  router.get("/", async (req, res) => {
    const options = parseListQuery(req.query);
    const { items, total } = await store.findAll(options);
    res.json({
      data: items,
      meta: { total, page: options.page, limit: options.limit, pages: Math.max(1, Math.ceil(total / options.limit)) },
    });
  });

  // Declared before "/:id", otherwise "stats" would be read as an id
  router.get("/stats", async (req, res) => {
    res.json({ data: await store.stats() });
  });

  router.get("/:id", async (req, res) => {
    res.json({ data: await getUserOr404(req.params.id) });
  });

  // Email uniqueness is enforced by the database (UNIQUE constraint -> 409 in the store)
  router.post("/", async (req, res) => {
    const data = validateUser(req.body, "create");
    const user = await store.create(data);
    res.status(201).location(`${req.baseUrl}/${user.id}`).json({ data: user });
  });

  router.put("/:id", async (req, res) => {
    await getUserOr404(req.params.id);
    const data = validateUser(req.body, "replace");
    res.json({ data: await store.update(req.params.id, data) });
  });

  router.patch("/:id", async (req, res) => {
    await getUserOr404(req.params.id);
    const data = validateUser(req.body, "patch");
    res.json({ data: await store.update(req.params.id, data) });
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await store.remove(req.params.id);
    if (!deleted) throw notFound(`User ${req.params.id} not found`);
    res.status(204).end();
  });

  return router;
}
