import { createApp } from "./app.js";
import { createDb, createPool } from "./db/pool.js";
import { migrate, seedIfEmpty } from "./db/migrate.js";
import { createPgUserStore } from "./store/pgUserStore.js";

const PORT = Number(process.env.PORT) || 3000;

try {
  const db = createDb(createPool());
  await migrate(db);       // create / update the tables
  await seedIfEmpty(db);   // sample users on a brand-new database

  const server = createApp({ store: createPgUserStore(db) }).listen(PORT, () => {
    console.log(`SaiKet Users API (PostgreSQL) running on http://localhost:${PORT}`);
    console.log(`API explorer:  http://localhost:${PORT}/`);
  });

  // Close the HTTP server and the database pool cleanly (Ctrl+C, Render redeploy…)
  const shutdown = () => server.close(() => db.close().then(() => process.exit(0)));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (err) {
  console.error("✗ Could not start the API:", err.message);
  console.error("  Check DATABASE_URL in your .env file and that PostgreSQL is running.");
  process.exit(1);
}
