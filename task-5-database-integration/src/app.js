// Builds the Express application. The PostgreSQL store is passed in, so tests can use their own database.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { usersRouter } from "./routes/users.js";
import { cors, errorHandler, exposeSql, logger, notFoundHandler, requestId, requireJson } from "./middleware/index.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp({ store, silent = false, showSql = process.env.SHOW_SQL !== "false" }) {
  const app = express();
  const startedAt = Date.now();

  app.disable("x-powered-by");
  app.set("json spaces", 2);

  app.use(requestId);
  app.use(logger({ silent }));
  app.use(cors);
  app.use(exposeSql(showSql));
  app.use(express.json({ limit: "10kb" }));

  // API explorer page (public/index.html)
  app.use(express.static(publicDir));

  app.get("/api", (req, res) => {
    res.json({
      name: "SaiKet Users API",
      version: "2.0.0",
      database: "PostgreSQL",
      endpoints: {
        "GET /api/health": "Health check (includes the database)",
        "GET /api/users": "List users (?search=&minAge=&maxAge=&sort=name|-age|createdAt&page=&limit=)",
        "GET /api/users/stats": "Statistics computed in SQL",
        "GET /api/users/:id": "Get one user",
        "POST /api/users": "Create a user { name, email, age }",
        "PUT /api/users/:id": "Replace a user { name, email, age }",
        "PATCH /api/users/:id": "Update some fields of a user",
        "DELETE /api/users/:id": "Delete a user",
      },
    });
  });

  app.get("/api/health", async (req, res) => {
    let database = "connected";
    try {
      await store.ping();
    } catch {
      database = "unreachable";
    }
    res.status(database === "connected" ? 200 : 503).json({
      status: database === "connected" ? "ok" : "degraded",
      database,
      uptime: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  app.use("/api/users", requireJson, usersRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
