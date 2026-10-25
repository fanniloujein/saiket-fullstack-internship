// Server-side validation. The React app checks the same rules (client/src/utils/validation.js),
// but the server never trusts the browser and checks everything again.
import { badRequest } from "../utils/httpError.js";

const NAME_RE = /^[\p{L}][\p{L}\s'’.-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const RULES = {
  name(v) {
    if (typeof v !== "string" || !v.trim()) return "Le nom est obligatoire.";
    const t = v.trim();
    if (t.length < 2 || t.length > 60) return "Le nom doit contenir entre 2 et 60 caractères.";
    if (!NAME_RE.test(t)) return "Lettres, espaces, apostrophes, points et tirets uniquement.";
    return null;
  },
  email(v) {
    if (typeof v !== "string" || !v.trim()) return "L'adresse e-mail est obligatoire.";
    if (v.trim().length > 254 || !EMAIL_RE.test(v.trim())) return "Adresse e-mail invalide (ex. : nom@domaine.com).";
    return null;
  },
  age(v) {
    if (v === undefined || v === null || v === "") return "L'âge est obligatoire.";
    if (typeof v !== "number" || !Number.isInteger(v)) return "L'âge doit être un nombre entier.";
    if (v < 13 || v > 120) return "L'âge doit être compris entre 13 et 120 ans.";
    return null;
  },
  bio(v) {
    if (typeof v !== "string") return "La bio doit être un texte.";
    if (v.length > 160) return "160 caractères maximum.";
    return null;
  },
  role(v) {
    return v === "user" || v === "admin" ? null : "Rôle invalide (user ou admin).";
  },
  password(v) {
    if (typeof v !== "string" || !v) return "Le mot de passe est obligatoire.";
    if (v.length < 8) return "Au moins 8 caractères.";
    if (v.length > 128) return "128 caractères maximum.";
    if (!/[A-Za-zÀ-ÿ]/.test(v) || !/\d/.test(v)) return "Au moins une lettre et un chiffre.";
    return null;
  },
};

/**
 * Validate a body against a list of allowed fields.
 * required: fields that must be present. At least one field must be sent when nothing is required.
 */
export function validate(body, { allowed, required = [] }) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Le corps de la requête doit être un objet JSON.");
  }
  const details = [];
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) details.push({ field: key, message: "Champ non autorisé." });
  }
  if (required.length === 0 && !allowed.some((f) => body[f] !== undefined)) {
    throw badRequest("Aucun champ à modifier.");
  }
  for (const field of allowed) {
    if (body[field] === undefined) {
      if (required.includes(field)) details.push({ field, message: RULES[field](undefined) });
      continue;
    }
    const message = RULES[field](body[field]);
    if (message) details.push({ field, message });
  }
  if (details.length) throw badRequest("Certains champs sont invalides.", details);

  const clean = {};
  for (const field of allowed) {
    if (body[field] === undefined) continue;
    if (field === "name") clean.name = body.name.trim().replace(/\s+/g, " ");
    else if (field === "email") clean.email = body.email.trim().toLowerCase();
    else if (field === "bio") clean.bio = body.bio.trim();
    else clean[field] = body[field];
  }
  return clean;
}

export function parseListQuery(query) {
  const details = [];
  const int = (key, min, max, fallback) => {
    if (query[key] === undefined || query[key] === "") return fallback;
    const n = Number(query[key]);
    if (!Number.isInteger(n) || n < min || n > max) {
      details.push({ field: key, message: `Entier entre ${min} et ${max}.` });
      return fallback;
    }
    return n;
  };
  const options = {
    search: typeof query.search === "string" ? query.search.trim().toLowerCase() : "",
    role: undefined,
    page: int("page", 1, 100000, 1),
    limit: int("limit", 1, 100, 10),
    sort: "createdAt",
    order: "desc",
  };
  if (query.role) {
    if (["user", "admin"].includes(query.role)) options.role = query.role;
    else details.push({ field: "role", message: "user ou admin." });
  }
  if (query.sort) {
    const field = String(query.sort).replace(/^-/, "");
    if (["name", "email", "age", "createdAt", "lastLoginAt"].includes(field)) {
      options.sort = field;
      options.order = String(query.sort).startsWith("-") ? "desc" : "asc";
    } else {
      details.push({ field: "sort", message: "name, email, age, createdAt ou lastLoginAt." });
    }
  }
  if (details.length) throw badRequest("Paramètres de recherche invalides.", details);
  return options;
}
