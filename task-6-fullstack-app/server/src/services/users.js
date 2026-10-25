// Every SQL query on the users table. The password hash never leaves this file
// except through findByEmailWithHash / getPasswordHash, used only for login checks.
import { badRequest, conflict } from "../utils/httpError.js";

const COLUMNS = "id, name, email, age, bio, role, created_at, updated_at, last_login_at";
const SORT_COLUMNS = { name: "name", email: "email", age: "age", createdAt: "created_at", lastLoginAt: "last_login_at" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE = ["name", "email", "age", "bio", "role"];

export function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    age: row.age,
    bio: row.bio,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  };
}

function translate(err) {
  if (err.code === "23505") {
    return conflict("Cette adresse e-mail est déjà utilisée.", [{ field: "email", message: "Cette adresse e-mail est déjà utilisée." }]);
  }
  if (err.code === "23514") return badRequest("Données refusées par la base de données.");
  return err;
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export function createUserService(db) {
  return {
    async findAll({ search = "", role, sort = "createdAt", order = "desc", page = 1, limit = 10 } = {}) {
      const where = [];
      const params = [];
      if (search) {
        params.push(`%${escapeLike(search)}%`);
        where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }
      if (role) {
        params.push(role);
        where.push(`role = $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const nulls = sort === "lastLoginAt" ? " NULLS LAST" : "";
      const orderSql = `ORDER BY ${SORT_COLUMNS[sort]} ${order === "asc" ? "ASC" : "DESC"}${nulls}, id`;

      const [count, rows] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM users ${whereSql}`, params),
        db.query(
          `SELECT ${COLUMNS} FROM users ${whereSql} ${orderSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, (page - 1) * limit]
        ),
      ]);
      return { items: rows.rows.map(toUser), total: count.rows[0].total };
    },

    async findById(id) {
      if (!UUID_RE.test(id)) return null;
      const { rows } = await db.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async findByEmailWithHash(email) {
      const { rows } = await db.query(`SELECT ${COLUMNS}, password_hash FROM users WHERE email = $1`, [email]);
      return rows[0] ?? null;
    },

    async getPasswordHash(id) {
      const { rows } = await db.query("SELECT password_hash FROM users WHERE id = $1", [id]);
      return rows[0]?.password_hash ?? null;
    },

    async create({ name, email, age, bio = "", role = "user", passwordHash }) {
      try {
        const { rows } = await db.query(
          `INSERT INTO users (name, email, age, bio, role, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
          [name, email, age, bio, role, passwordHash]
        );
        return toUser(rows[0]);
      } catch (err) {
        throw translate(err);
      }
    },

    // Only the fields present in `data` are updated (dynamic SET, whitelisted columns)
    async update(id, data) {
      const fields = Object.keys(data).filter((k) => EDITABLE.includes(k));
      if (fields.length === 0) return this.findById(id);
      const sets = fields.map((k, i) => `${k} = $${i + 2}`);
      try {
        const { rows } = await db.query(
          `UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
          [id, ...fields.map((k) => data[k])]
        );
        return rows[0] ? toUser(rows[0]) : null;
      } catch (err) {
        throw translate(err);
      }
    },

    async setPasswordHash(id, passwordHash) {
      await db.query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
    },

    async touchLogin(id) {
      await db.query("UPDATE users SET last_login_at = now() WHERE id = $1", [id]);
    },

    async remove(id) {
      if (!UUID_RE.test(id)) return false;
      const { rowCount } = await db.query("DELETE FROM users WHERE id = $1", [id]);
      return rowCount > 0;
    },

    async countAdmins() {
      const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'");
      return rows[0].n;
    },

    async stats() {
      const [summary, brackets, signups] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total,
                         COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
                         COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_this_week,
                         COUNT(*) FILTER (WHERE last_login_at > now() - interval '7 days')::int AS active_this_week,
                         ROUND(AVG(age), 1)::float AS average_age
                  FROM users`),
        db.query(`SELECT CASE WHEN age < 18 THEN '13-17' WHEN age < 25 THEN '18-24' WHEN age < 35 THEN '25-34'
                              WHEN age < 50 THEN '35-49' ELSE '50+' END AS bracket,
                         COUNT(*)::int AS users
                  FROM users GROUP BY bracket ORDER BY MIN(age)`),
        // Sign-ups per day over the last 14 days (generate_series fills the empty days with 0)
        db.query(`SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(u.id)::int AS users
                  FROM generate_series(current_date - 13, current_date, interval '1 day') AS d(day)
                  LEFT JOIN users u ON u.created_at::date = d.day::date
                  GROUP BY d.day ORDER BY d.day`),
      ]);
      const s = summary.rows[0];
      return {
        total: s.total,
        admins: s.admins,
        newThisWeek: s.new_this_week,
        activeThisWeek: s.active_this_week,
        averageAge: s.average_age,
        ageBrackets: brackets.rows,
        signups: signups.rows,
      };
    },
  };
}
