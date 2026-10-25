// npm run db:migrate | db:seed | db:reset
import { createDb, createPool } from "./pool.js";
import { migrate, seed } from "./migrate.js";

const command = process.argv[2];
const db = createDb(createPool());

try {
  if (command === "migrate") {
    await migrate(db);
  } else if (command === "seed") {
    await migrate(db);
    await seed(db);
  } else if (command === "reset") {
    await migrate(db);
    await db.query("TRUNCATE users");
    console.log("✓ users table emptied");
    await seed(db);
  } else {
    console.log("Usage: node src/db/cli.js migrate | seed | reset");
    process.exitCode = 1;
  }
} catch (err) {
  console.error("✗", err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
