// Custom Express middleware, written by hand to show how the request pipeline works.
import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/httpError.js";
import { sqlLog } from "../db/pool.js";

// 1. Give every request an id (sent back in the X-Request-Id header and in errors)
export function requestId(req, res, next) {
  req.id = req.get("X-Request-Id") || randomUUID();
  res.set("X-Request-Id", req.id);
  next();
}

// 2. Log "METHOD /path -> status (time)" when the response is finished
export function logger({ silent = false } = {}) {
  return (req, res, next) => {
    if (silent) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
    });
    next();
  };
}

// 3. Allow the API to be called from any website (browser fetch, Postman web, etc.)
export function cors(req, res, next) {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-Id",
    "Access-Control-Expose-Headers": "Location, X-Request-Id, X-Sql-Queries",
  });
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}

// 3b. Record the SQL run for this request and send it back in the X-Sql-Queries header
//     (learning feature used by the API explorer; turn it off with SHOW_SQL=false)
export function exposeSql(enabled) {
  return (req, res, next) => {
    if (!enabled) return next();
    const queries = [];
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
      if (queries.length) {
        const value = encodeURIComponent(JSON.stringify(queries.slice(0, 10)));
        if (value.length < 7000) this.setHeader("X-Sql-Queries", value);
      }
      return writeHead.apply(this, args);
    };
    sqlLog.run(queries, next);
  };
}

// 4. Bodies of POST / PUT / PATCH must be JSON
export function requireJson(req, res, next) {
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return next(new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the body as JSON with the header Content-Type: application/json"));
  }
  next();
}

// 5. Unknown route
export function notFoundHandler(req, res, next) {
  next(new HttpError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} does not exist`));
}

// 6. Turn every error into the same JSON shape: { error: { status, code, message, details } }
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let error = err;
  if (err.type === "entity.parse.failed") {
    error = new HttpError(400, "INVALID_JSON", "The request body is not valid JSON");
  } else if (err.type === "entity.too.large") {
    error = new HttpError(413, "PAYLOAD_TOO_LARGE", "The request body is too large");
  } else if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(err.code) || /^(08|57P)/.test(err.code || "")) {
    console.error("Database unavailable:", err.message);
    error = new HttpError(503, "DATABASE_UNAVAILABLE", "The database is not reachable right now, try again in a moment");
  } else if (!(err instanceof HttpError)) {
    console.error(err);
    error = new HttpError(500, "INTERNAL_ERROR", "Something went wrong on the server");
  }

  res.status(error.status).json({
    error: {
      status: error.status,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
    requestId: req.id,
  });
}
