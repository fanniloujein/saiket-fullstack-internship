// Authentication with an HttpOnly session cookie (JavaScript in the page cannot read it).
import { toUser } from "../services/users.js";
import { forbidden, unauthorized } from "../utils/httpError.js";
import { SESSION_DAYS } from "../services/sessions.js";

export const COOKIE_NAME = "orbit_sid";

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`
  );
}

export function clearSessionCookie(res) {
  res.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Runs on every /api request: attaches req.user when the session cookie is valid
export function loadSession(sessions) {
  return async (req, res, next) => {
    req.sessionToken = readCookie(req, COOKIE_NAME);
    const row = await sessions.findUser(req.sessionToken);
    req.user = row ? toUser(row) : null;
    if (req.sessionToken && !row) clearSessionCookie(res); // expired or revoked
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden("Réservé aux administrateurs."));
  next();
}
