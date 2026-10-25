// A tiny migration runner: applies the files of sql/migrations/ in order, once each.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sqlDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "sql");

export async function migrate(db, { log = console.log } = {}) {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const files = (await fs.readdir(path.join(sqlDir, "migrations"))).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await db.query("SELECT name FROM schema_migrations");
  const done = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(sqlDir, "migrations", file), "utf8");
    // Each migration runs in a transaction: all of it is applied, or nothing
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log(`✓ migration applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
}
