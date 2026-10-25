import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/httpError.js";

export function requestId(req, res, next) {
  req.id = randomUUID();
  res.set("X-Request-Id", req.id);
  next();
}

export function logger({ silent = false } = {}) {
  return (req, res, next) => {
    if (silent || !req.path.startsWith("/api")) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
    });
    next();
  };
}

// Security headers for every response
export function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  });
  next();
}

// The API only accepts JSON bodies (this also blocks simple cross-site form posts)
export function requireJson(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers["content-length"] > 0 && !req.is("application/json")) {
    return next(new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Le corps doit être envoyé en JSON (Content-Type: application/json)."));
  }
  next();
}

export function apiNotFound(req, res, next) {
  next(new HttpError(404, "NOT_FOUND", `La route ${req.method} ${req.originalUrl} n'existe pas.`));
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let error = err;
  if (err.type === "entity.parse.failed") error = new HttpError(400, "INVALID_JSON", "Le corps de la requête n'est pas un JSON valide.");
  else if (err.type === "entity.too.large") error = new HttpError(413, "PAYLOAD_TOO_LARGE", "Requête trop volumineuse.");
  else if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(err.code) || /^(08|57P)/.test(err.code || "")) {
    console.error("Database unavailable:", err.message);
    error = new HttpError(503, "DATABASE_UNAVAILABLE", "La base de données est momentanément indisponible.");
  } else if (!(err instanceof HttpError)) {
    console.error(err);
    error = new HttpError(500, "INTERNAL_ERROR", "Une erreur inattendue s'est produite.");
  }
  res.status(error.status).json({
    error: { status: error.status, code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    requestId: req.id,
  });
}
