// /api/auth: sign up, log in, log out, current user
import { Router } from "express";
import { validate } from "../validation/user.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { clearSessionCookie, setSessionCookie } from "../middleware/auth.js";
import { toUser } from "../services/users.js";

// A fixed hash compared when the email is unknown, so the response time
// does not reveal whether an account exists.
const DUMMY_HASH = await hashPassword("not-a-real-password-1");

export function authRouter({ users, sessions, activity, limiter }) {
  const router = Router();

  async function startSession(req, res, user) {
    const token = await sessions.create(user.id, req.get("User-Agent") || "");
    setSessionCookie(res, token);
  }

  // Sign up = "add my profile". The very first account becomes administrator.
  router.post("/register", async (req, res) => {
    const data = validate(req.body, { allowed: ["name", "email", "age", "password"], required: ["name", "email", "age", "password"] });
    const isFirst = (await users.countAdmins()) === 0;
    const user = await users.create({ ...data, role: isFirst ? "admin" : "user", passwordHash: await hashPassword(data.password) });
    await users.touchLogin(user.id);
    await activity.log({ actorId: user.id, userId: user.id, action: "register", details: { name: user.name } });
    await startSession(req, res, user);
    res.status(201).json({ data: { ...user, lastLoginAt: new Date().toISOString() } });
  });

  router.post("/login", limiter.check, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) throw badRequest("E-mail et mot de passe obligatoires.");

    const row = await users.findByEmailWithHash(email);
    const ok = await verifyPassword(password, row ? row.password_hash : DUMMY_HASH);
    if (!row || !ok) {
      limiter.fail(req);
      throw unauthorized("E-mail ou mot de passe incorrect.");
    }
    limiter.succeed(req);
    await users.touchLogin(row.id);
    await activity.log({ actorId: row.id, userId: row.id, action: "login", details: { name: row.name } });
    await startSession(req, res, row);
    res.json({ data: { ...toUser(row), lastLoginAt: new Date().toISOString() } });
  });

  router.post("/logout", async (req, res) => {
    await sessions.destroy(req.sessionToken);
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get("/me", (req, res) => {
    res.json({ data: req.user }); // null when not logged in
  });

  return router;
}
