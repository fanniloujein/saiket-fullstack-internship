// Express app: JSON API under /api, and the built React app for every other URL.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createUserService } from "./services/users.js";
import { createSessionService } from "./services/sessions.js";
import { createActivityService } from "./services/activity.js";
import { createLoginLimiter } from "./middleware/rateLimit.js";
import { loadSession, requireAdmin } from "./middleware/auth.js";
import { apiNotFound, errorHandler, logger, requestId, requireJson, securityHeaders } from "./middleware/common.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { usersRouter } from "./routes/users.js";

const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "client", "dist");

export function createApp({ db, silent = false, limiter = createLoginLimiter() }) {
  const ctx = {
    users: createUserService(db),
    sessions: createSessionService(db),
    activity: createActivityService(db),
    limiter,
  };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind Render's proxy: req.ip is the real visitor IP

  app.use(requestId);
  app.use(securityHeaders);
  app.use(logger({ silent }));

  const api = express.Router();
  api.use(express.json({ limit: "10kb" }));
  api.use(requireJson);
  api.use(loadSession(ctx.sessions));
  api.get("/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  });
  api.use("/auth", authRouter(ctx));
  api.use("/me", meRouter(ctx));
  api.use("/users", usersRouter(ctx));
  api.get("/activity", requireAdmin, async (req, res) => {
    res.json({ data: await ctx.activity.list({ limit: req.query.limit }) });
  });
  api.use(apiNotFound);
  app.use("/api", api);

  // Production: serve the React build, and index.html for client-side routes (/profile, /admin…)
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return { app, ctx };
}
