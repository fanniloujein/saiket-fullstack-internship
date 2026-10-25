// /api/users: administrators manage every user (full CRUD)
import { Router } from "express";
import { parseListQuery, validate } from "../validation/user.js";
import { hashPassword } from "../services/passwords.js";
import { conflict, notFound } from "../utils/httpError.js";
import { requireAdmin } from "../middleware/auth.js";

export function usersRouter({ users, sessions, activity }) {
  const router = Router();
  router.use(requireAdmin);

  async function getOr404(id) {
    const user = await users.findById(id);
    if (!user) throw notFound("Utilisateur introuvable.");
    return user;
  }

  router.get("/", async (req, res) => {
    const options = parseListQuery(req.query);
    const { items, total } = await users.findAll(options);
    res.json({ data: items, meta: { total, page: options.page, limit: options.limit, pages: Math.max(1, Math.ceil(total / options.limit)) } });
  });

  router.get("/stats", async (req, res) => {
    res.json({ data: await users.stats() });
  });

  router.get("/:id", async (req, res) => {
    res.json({ data: await getOr404(req.params.id) });
  });

  router.post("/", async (req, res) => {
    const data = validate(req.body, {
      allowed: ["name", "email", "age", "bio", "role", "password"],
      required: ["name", "email", "age", "password"],
    });
    const user = await users.create({ ...data, passwordHash: await hashPassword(data.password) });
    await activity.log({ actorId: req.user.id, userId: user.id, action: "user.create", details: { name: user.name } });
    res.status(201).location(`/api/users/${user.id}`).json({ data: user });
  });

  router.patch("/:id", async (req, res) => {
    const target = await getOr404(req.params.id);
    const data = validate(req.body, { allowed: ["name", "email", "age", "bio", "role", "password"] });

    if (data.role && data.role !== target.role) {
      if (target.id === req.user.id) throw conflict("Vous ne pouvez pas changer votre propre rôle.");
      if (target.role === "admin" && (await users.countAdmins()) === 1) throw conflict("Il doit rester au moins un administrateur.");
    }

    const { password, ...fields } = data;
    const changed = Object.keys(fields).filter((k) => fields[k] !== target[k]);
    let user = await users.update(target.id, fields);

    if (password) {
      await users.setPasswordHash(target.id, await hashPassword(password));
      await sessions.destroyAll(target.id); // the user must log in again with the new password
      changed.push("password");
      user = await users.findById(target.id);
    }
    if (changed.length) {
      const action = changed.includes("role") ? "role.change" : "user.update";
      await activity.log({ actorId: req.user.id, userId: target.id, action, details: { name: user.name, fields: changed, role: user.role } });
    }
    res.json({ data: user });
  });

  router.delete("/:id", async (req, res) => {
    const target = await getOr404(req.params.id);
    if (target.id === req.user.id) throw conflict("Pour supprimer votre propre compte, passez par « Mon profil ».");
    await activity.log({ actorId: req.user.id, userId: target.id, action: "user.delete", details: { name: target.name } });
    await users.remove(target.id);
    res.status(204).end();
  });

  return router;
}
