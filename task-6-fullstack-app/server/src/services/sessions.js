// Login sessions stored in PostgreSQL. The cookie holds a random token; the table holds its hash.
import { createHash, randomBytes } from "node:crypto";

export const SESSION_DAYS = 7;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function createSessionService(db) {
  return {
    async create(userId, userAgent = "") {
      const token = randomBytes(32).toString("base64url");
      await db.query(
        `INSERT INTO sessions (token_hash, user_id, user_agent, expires_at)
         VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
        [sha256(token), userId, userAgent.slice(0, 200), SESSION_DAYS]
      );
      return token;
    },

    // Returns the user of a valid (not expired) session, or null
    async findUser(token) {
      if (!token) return null;
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.age, u.bio, u.role, u.created_at, u.updated_at, u.last_login_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)]
      );
      return rows[0] ?? null;
    },

    async destroy(token) {
      if (token) await db.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
    },

    // After a password change: log out every other device
    async destroyOthers(userId, keepToken) {
      await db.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [userId, sha256(keepToken)]);
    },

    async destroyAll(userId) {
      await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    },

    async purgeExpired() {
      await db.query("DELETE FROM sessions WHERE expires_at <= now()");
    },
  };
}
