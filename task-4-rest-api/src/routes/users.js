// CRUD endpoints for /api/users
//   GET    /api/users        list (search, age filter, sort, pagination)
//   GET    /api/users/:id    read one
//   POST   /api/users        create            -> 201 + Location header
//   PUT    /api/users/:id    replace all fields
//   PATCH  /api/users/:id    update some fields
//   DELETE /api/users/:id    delete            -> 204 No Content
import { Router } from "express";
import { parseListQuery, validateUser } from "../validation/user.js";
import { conflict, notFound } from "../utils/httpError.js";

export function usersRouter(store) {
  const router = Router();

  async function getUserOr404(id) {
    const user = await store.findById(id);
    if (!user) throw notFound(`User ${id} not found`);
    return user;
  }

  // Emails are unique: refuse an email already used by another user
  async function ensureEmailIsFree(email, currentId) {
    if (!email) return;
    const existing = await store.findByEmail(email);
    if (existing && existing.id !== currentId) {
      throw conflict("This email is already used by another user", [{ field: "email", message: "must be unique" }]);
    }
  }

  router.get("/", async (req, res) => {
    const options = parseListQuery(req.query);
    const { items, total } = await store.findAll(options);
    res.json({
      data: items,
      meta: { total, page: options.page, limit: options.limit, pages: Math.max(1, Math.ceil(total / options.limit)) },
    });
  });

  router.get("/:id", async (req, res) => {
    res.json({ data: await getUserOr404(req.params.id) });
  });

  router.post("/", async (req, res) => {
    const data = validateUser(req.body, "create");
    await ensureEmailIsFree(data.email);
    const user = await store.create(data);
    res.status(201).location(`${req.baseUrl}/${user.id}`).json({ data: user });
  });

  router.put("/:id", async (req, res) => {
    await getUserOr404(req.params.id);
    const data = validateUser(req.body, "replace");
    await ensureEmailIsFree(data.email, req.params.id);
    res.json({ data: await store.update(req.params.id, data) });
  });

  router.patch("/:id", async (req, res) => {
    await getUserOr404(req.params.id);
    const data = validateUser(req.body, "patch");
    await ensureEmailIsFree(data.email, req.params.id);
    res.json({ data: await store.update(req.params.id, data) });
  });

  router.delete("/:id", async (req, res) => {
    await getUserOr404(req.params.id);
    await store.remove(req.params.id);
    res.status(204).end();
  });

  return router;
}
