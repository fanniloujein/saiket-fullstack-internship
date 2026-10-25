import { createApp } from "./app.js";
import { createDb } from "./db/pool.js";
import { migrate } from "./db/migrate.js";
import { seedDemoIfEmpty } from "./db/seed.js";

const PORT = Number(process.env.PORT) || 3000;

try {
  const db = createDb();
  await migrate(db);
  if (process.env.SEED_DEMO !== "false") await seedDemoIfEmpty(db);

  const { app, ctx } = createApp({ db });
  const server = app.listen(PORT, () => {
    console.log(`Orbit running on http://localhost:${PORT}`);
  });

  // Remove expired sessions once an hour
  const timer = setInterval(() => ctx.sessions.purgeExpired().catch(() => {}), 60 * 60 * 1000);

  const shutdown = () => {
    clearInterval(timer);
    server.close(() => db.close().then(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (err) {
  console.error("✗ Could not start Orbit:", err.message);
  console.error("  Check DATABASE_URL in server/.env and that PostgreSQL is running.");
  process.exit(1);
}
