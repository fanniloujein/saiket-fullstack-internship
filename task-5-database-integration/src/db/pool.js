// PostgreSQL connection pool + a small query() helper.
// Every query is parameterised ($1, $2…): values are never pasted into the SQL text,
// which is what protects the API against SQL injection.
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

// Remembers the queries run while handling the current HTTP request (shown by the API explorer)
export const sqlLog = new AsyncLocalStorage();

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
  const pool = new pg.Pool({ connectionString, ssl, max: 10 });
  pool.on("error", (err) => console.error("PostgreSQL pool error:", err.message));
  return pool;
}

export function createDb(pool) {
  return {
    pool,
    async query(text, params = []) {
      const start = process.hrtime.bigint();
      const result = await pool.query(text, params);
      const log = sqlLog.getStore();
      if (log) {
        log.push({
          sql: text.replace(/\s+/g, " ").trim(),
          params,
          rows: result.rowCount,
          ms: Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(1)),
        });
      }
      return result;
    },
    close: () => pool.end(),
  };
}
