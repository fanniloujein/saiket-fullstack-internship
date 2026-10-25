// npm run db:reset  -> empty every table and recreate the demo accounts
import { createDb } from "./pool.js";
import { migrate } from "./migrate.js";
import { seedDemo } from "./seed.js";

const db = createDb();
try {
  if (process.argv[2] !== "reset") throw new Error("Usage: node src/db/cli.js reset");
  await migrate(db);
  await db.query("TRUNCATE activity, sessions, users");
  console.log("✓ tables emptied");
  await seedDemo(db);
} catch (err) {
  console.error("✗", err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
