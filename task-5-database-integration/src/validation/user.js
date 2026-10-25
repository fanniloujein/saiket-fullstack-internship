// Validation rules for the User entity, written by hand (no library) to show how it works.
import { badRequest } from "../utils/httpError.js";

const FIELDS = ["name", "email", "age"];
const NAME_RE = /^[\p{L}][\p{L}\s'’.-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name(value) {
    if (typeof value !== "string") return "must be a string";
    const v = value.trim();
    if (v.length < 2 || v.length > 60) return "must be between 2 and 60 characters";
    if (!NAME_RE.test(v)) return "may only contain letters, spaces, apostrophes, dots and hyphens";
    return null;
  },
  email(value) {
    if (typeof value !== "string") return "must be a string";
    const v = value.trim();
    if (v.length > 254 || !EMAIL_RE.test(v)) return "must be a valid email address (e.g. name@domain.com)";
    return null;
  },
  age(value) {
    if (typeof value !== "number" || !Number.isInteger(value)) return "must be an integer";
    if (value < 1 || value > 120) return "must be between 1 and 120";
    return null;
  },
};

/**
 * Validate a request body.
 * mode "create" / "replace": every field is required (POST, PUT)
 * mode "patch": at least one field, all optional (PATCH)
 * Returns a clean object (trimmed name, lowercased email) or throws a 400 HttpError.
 */
export function validateUser(body, mode) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object");
  }

  const details = [];

  for (const key of Object.keys(body)) {
    if (!FIELDS.includes(key)) details.push({ field: key, message: "is not an allowed field" });
  }

  const present = FIELDS.filter((f) => body[f] !== undefined);
  if (mode === "patch" && present.length === 0) {
    throw badRequest("Send at least one field to update: name, email or age");
  }

  for (const field of FIELDS) {
    if (body[field] === undefined) {
      if (mode !== "patch") details.push({ field, message: "is required" });
      continue;
    }
    const error = RULES[field](body[field]);
    if (error) details.push({ field, message: error });
  }

  if (details.length) throw badRequest("Invalid user data", details);

  const clean = {};
  if (body.name !== undefined) clean.name = body.name.trim().replace(/\s+/g, " ");
  if (body.email !== undefined) clean.email = body.email.trim().toLowerCase();
  if (body.age !== undefined) clean.age = body.age;
  return clean;
}

const SORT_FIELDS = ["name", "email", "age", "createdAt"];

// Validate ?search=&minAge=&maxAge=&sort=&page=&limit= on GET /api/users
export function parseListQuery(query) {
  const details = [];
  const toInt = (key, min, max, fallback) => {
    if (query[key] === undefined || query[key] === "") return fallback;
    const n = Number(query[key]);
    if (!Number.isInteger(n) || n < min || n > max) {
      details.push({ field: key, message: `must be an integer between ${min} and ${max}` });
      return fallback;
    }
    return n;
  };

  const options = {
    search: typeof query.search === "string" ? query.search.trim().toLowerCase() : "",
    minAge: toInt("minAge", 1, 120, undefined),
    maxAge: toInt("maxAge", 1, 120, undefined),
    page: toInt("page", 1, 100000, 1),
    limit: toInt("limit", 1, 100, 10),
    sort: "createdAt",
    order: "asc",
  };

  if (query.sort) {
    const desc = String(query.sort).startsWith("-");
    const field = String(query.sort).replace(/^-/, "");
    if (!SORT_FIELDS.includes(field)) {
      details.push({ field: "sort", message: `must be one of ${SORT_FIELDS.join(", ")} (prefix with - for descending)` });
    } else {
      options.sort = field;
      options.order = desc ? "desc" : "asc";
    }
  }

  if (options.minAge && options.maxAge && options.minAge > options.maxAge) {
    details.push({ field: "minAge", message: "must be less than or equal to maxAge" });
  }

  if (details.length) throw badRequest("Invalid query parameters", details);
  return options;
}
