// /api/me: a logged-in user views, updates and deletes their own profile
import { Router } from "express";
import { validate } from "../validation/user.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { clearSessionCookie, requireAuth } from "../middleware/auth.js";

export function meRouter({ users, sessions, activity }) {
  const router = Router();
  router.use(requireAuth);

  async function checkPassword(userId, password) {
    if (typeof password !== "string" || !password) throw badRequest("Confirmez avec votre mot de passe.", [{ field: "password", message: "Mot de passe obligatoire." }]);
    if (!(await verifyPassword(password, await users.getPasswordHash(userId)))) {
      throw unauthorized("Mot de passe incorrect.");
    }
  }

  // View
  router.get("/", (req, res) => res.json({ data: req.user }));

  // Update (role cannot be changed here)
  router.patch("/", async (req, res) => {
    const data = validate(req.body, { allowed: ["name", "email", "age", "bio"] });
    const changed = Object.keys(data).filter((k) => data[k] !== req.user[k]);
    const user = await users.update(req.user.id, data);
    if (changed.length) {
      await activity.log({ actorId: user.id, userId: user.id, action: "profile.update", details: { name: user.name, fields: changed } });
    }
    res.json({ data: user });
  });

  // Change password: other devices are logged out
  router.put("/password", async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    await checkPassword(req.user.id, currentPassword);
    const { password } = validate({ password: newPassword }, { allowed: ["password"], required: ["password"] });
    if (password === currentPassword) throw badRequest("Le nouveau mot de passe doit être différent de l'actuel.", [{ field: "newPassword", message: "Identique à l'actuel." }]);
    await users.setPasswordHash(req.user.id, await hashPassword(password));
    await sessions.destroyOthers(req.user.id, req.sessionToken);
    await activity.log({ actorId: req.user.id, userId: req.user.id, action: "password.change", details: { name: req.user.name } });
    res.status(204).end();
  });

  // Delete my account (password required, last admin protected)
  router.delete("/", async (req, res) => {
    await checkPassword(req.user.id, req.body?.password);
    if (req.user.role === "admin" && (await users.countAdmins()) === 1) {
      throw conflict("Vous êtes le dernier administrateur : nommez d'abord un autre administrateur.");
    }
    await activity.log({ actorId: null, userId: req.user.id, action: "account.delete", details: { name: req.user.name, actorName: req.user.name } });
    await users.remove(req.user.id); // sessions are deleted by ON DELETE CASCADE
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get("/activity", async (req, res) => {
    res.json({ data: await activity.list({ limit: 15, forUser: req.user.id }) });
  });

  return router;
}
