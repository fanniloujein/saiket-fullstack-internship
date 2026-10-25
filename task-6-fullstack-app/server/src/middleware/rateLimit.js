// Brute-force protection for the login form: 5 failed attempts per email + IP, then wait 15 minutes.
// Kept in memory, which is enough for a single server.
import { tooManyRequests } from "../utils/httpError.js";

export function createLoginLimiter({ maxFailures = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map(); // key -> { count, resetAt }

  const keyOf = (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`;

  return {
    check(req, res, next) {
      const entry = failures.get(keyOf(req));
      if (entry && entry.resetAt > Date.now() && entry.count >= maxFailures) {
        const seconds = Math.ceil((entry.resetAt - Date.now()) / 1000);
        res.set("Retry-After", String(seconds));
        return next(tooManyRequests(`Trop de tentatives. Réessayez dans ${Math.ceil(seconds / 60)} minute(s).`));
      }
      next();
    },
    fail(req) {
      const key = keyOf(req);
      const entry = failures.get(key);
      if (!entry || entry.resetAt <= Date.now()) failures.set(key, { count: 1, resetAt: Date.now() + windowMs });
      else entry.count += 1;
    },
    succeed(req) {
      failures.delete(keyOf(req));
    },
  };
}
