// Same rules as the server (server/src/validation/user.js), checked in the browser for instant feedback.
const NAME_RE = /^[\p{L}][\p{L}\s'’.-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const rules = {
  name(v) {
    const t = String(v ?? "").trim();
    if (!t) return "Le nom est obligatoire.";
    if (t.length < 2 || t.length > 60) return "Entre 2 et 60 caractères.";
    if (!NAME_RE.test(t)) return "Lettres, espaces, apostrophes, points et tirets uniquement.";
    return "";
  },
  email(v) {
    const t = String(v ?? "").trim();
    if (!t) return "L'adresse e-mail est obligatoire.";
    if (!EMAIL_RE.test(t)) return "Adresse e-mail invalide (ex. : nom@domaine.com).";
    return "";
  },
  age(v) {
    if (v === "" || v === null || v === undefined) return "L'âge est obligatoire.";
    const n = Number(v);
    if (!Number.isInteger(n)) return "Un nombre entier, s'il vous plaît.";
    if (n < 13 || n > 120) return "Entre 13 et 120 ans.";
    return "";
  },
  bio(v) {
    return String(v ?? "").length > 160 ? "160 caractères maximum." : "";
  },
  password(v) {
    const t = String(v ?? "");
    if (!t) return "Le mot de passe est obligatoire.";
    if (t.length < 8) return "Au moins 8 caractères.";
    if (!/[A-Za-zÀ-ÿ]/.test(t) || !/\d/.test(t)) return "Au moins une lettre et un chiffre.";
    return "";
  },
};

// Validate several fields at once: returns { field: message } for the invalid ones only
export function validateFields(values, fields) {
  const errors = {};
  for (const f of fields) {
    const message = rules[f](values[f]);
    if (message) errors[f] = message;
  }
  return errors;
}

// 0 to 4: used by the password strength meter
export function passwordStrength(pw = "") {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
