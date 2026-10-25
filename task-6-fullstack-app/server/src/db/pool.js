// PostgreSQL connection pool. All queries are parameterised ($1, $2…) to prevent SQL injection.
import pg from "pg";

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.");
  }
  const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
  const pool = new pg.Pool({ connectionString, ssl, max: 10 });
  pool.on("error", (err) => console.error("PostgreSQL pool error:", err.message));

  return {
    pool,
    query: (text, params) => pool.query(text, params),
    close: () => pool.end(),
  };
}
