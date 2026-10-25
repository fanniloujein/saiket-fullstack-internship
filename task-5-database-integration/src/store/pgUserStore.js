// PostgreSQL user store: same methods as the in-memory store of Task 4,
// so the routes only needed one change (the store passed to the app).
import { badRequest, conflict } from "../utils/httpError.js";

const COLUMNS = "id, name, email, age, created_at, updated_at";
const SORT_COLUMNS = { name: "name", email: "email", age: "age", createdAt: "created_at" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Database row (snake_case) -> API object (camelCase)
function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    age: row.age,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Turn PostgreSQL error codes into clean HTTP errors
function translate(err) {
  if (err.code === "23505") return conflict("This email is already used by another user", [{ field: "email", message: "must be unique" }]);
  if (err.code === "23514") return badRequest("Invalid user data", [{ field: err.constraint, message: "violates a database rule" }]);
  return err;
}

// Escape % and _ so a search for "50%" is not treated as a wildcard
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export function createPgUserStore(db) {
  return {
    async findAll({ search = "", minAge, maxAge, sort = "createdAt", order = "asc", page = 1, limit = 10 } = {}) {
      const where = [];
      const params = [];
      if (search) {
        params.push(`%${escapeLike(search)}%`);
        where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }
      if (minAge !== undefined) {
        params.push(minAge);
        where.push(`age >= $${params.length}`);
      }
      if (maxAge !== undefined) {
        params.push(maxAge);
        where.push(`age <= $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // Column names cannot be parameters: they come from a whitelist instead
      const orderSql = `ORDER BY ${SORT_COLUMNS[sort]} ${order === "desc" ? "DESC" : "ASC"}, id`;

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
      if (!UUID_RE.test(id)) return null; // not a UUID: cannot exist
      const { rows } = await db.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async create({ name, email, age }) {
      try {
        const { rows } = await db.query(
          `INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
          [name, email, age]
        );
        return toUser(rows[0]);
      } catch (err) {
        throw translate(err);
      }
    },

    async update(id, data) {
      const fields = Object.keys(data).filter((key) => ["name", "email", "age"].includes(key));
      const sets = fields.map((key, i) => `${key} = $${i + 2}`);
      try {
        const { rows } = await db.query(
          `UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
          [id, ...fields.map((key) => data[key])]
        );
        return rows[0] ? toUser(rows[0]) : null;
      } catch (err) {
        throw translate(err);
      }
    },

    async remove(id) {
      if (!UUID_RE.test(id)) return false;
      const { rowCount } = await db.query("DELETE FROM users WHERE id = $1", [id]);
      return rowCount > 0;
    },

    // Aggregates computed by PostgreSQL (COUNT, AVG, MIN, MAX, GROUP BY)
    async stats() {
      const [summary, brackets, domains] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total, ROUND(AVG(age), 1)::float AS average_age,
                         MIN(age) AS youngest, MAX(age) AS oldest, MAX(created_at) AS last_created
                  FROM users`),
        db.query(`SELECT CASE WHEN age < 18 THEN 'under 18' WHEN age < 25 THEN '18-24'
                              WHEN age < 35 THEN '25-34' WHEN age < 50 THEN '35-49' ELSE '50+' END AS bracket,
                         COUNT(*)::int AS users
                  FROM users GROUP BY bracket ORDER BY MIN(age)`),
        db.query(`SELECT split_part(email, '@', 2) AS domain, COUNT(*)::int AS users
                  FROM users GROUP BY domain ORDER BY users DESC, domain LIMIT 5`),
      ]);
      const s = summary.rows[0];
      return {
        total: s.total,
        averageAge: s.average_age,
        youngest: s.youngest,
        oldest: s.oldest,
        lastCreatedAt: s.last_created ? s.last_created.toISOString() : null,
        ageBrackets: brackets.rows,
        emailDomains: domains.rows,
      };
    },

    async ping() {
      await db.query("SELECT 1");
    },
  };
}
