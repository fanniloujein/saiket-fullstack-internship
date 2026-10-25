// Builds the Express application. Kept separate from server.js so tests can use it without opening a port.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { usersRouter } from "./routes/users.js";
import { createMemoryUserStore } from "./store/memoryUserStore.js";
import { cors, errorHandler, logger, notFoundHandler, requestId, requireJson } from "./middleware/index.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp({ store = createMemoryUserStore(), silent = false } = {}) {
  const app = express();
  const startedAt = Date.now();

  app.disable("x-powered-by");
  app.set("json spaces", 2);

  app.use(requestId);
  app.use(logger({ silent }));
  app.use(cors);
  app.use(express.json({ limit: "10kb" }));

  // API explorer page (public/index.html)
  app.use(express.static(publicDir));

  app.get("/api", (req, res) => {
    res.json({
      name: "SaiKet Users API",
      version: "1.0.0",
      endpoints: {
        "GET /api/health": "Health check",
        "GET /api/users": "List users (?search=&minAge=&maxAge=&sort=name|-age|createdAt&page=&limit=)",
        "GET /api/users/:id": "Get one user",
        "POST /api/users": "Create a user { name, email, age }",
        "PUT /api/users/:id": "Replace a user { name, email, age }",
        "PATCH /api/users/:id": "Update some fields of a user",
        "DELETE /api/users/:id": "Delete a user",
      },
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: Math.round((Date.now() - startedAt) / 1000) });
  });

  app.use("/api/users", requireJson, usersRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
