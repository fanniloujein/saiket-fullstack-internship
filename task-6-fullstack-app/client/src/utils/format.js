// Dates and activity sentences in French
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function timeAgo(iso) {
  if (!iso) return "jamais";
  const seconds = Math.round((new Date(iso) - Date.now()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "à l'instant";
}

export function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

const FIELD_LABELS = { name: "nom", email: "e-mail", age: "âge", bio: "bio", role: "rôle", password: "mot de passe" };
const fieldsText = (fields = []) => fields.map((f) => FIELD_LABELS[f] || f).join(", ");

// French elision: "de Amira" -> "d'Amira"
const de = (name) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(name) ? `d'${name}` : `de ${name}`);

export function describeActivity(a) {
  // The person acting; for actions on one's own account, the name saved in details is a fallback
  const actor = a.actorName || a.details.actorName || a.details.name || "Quelqu'un";
  const target = a.targetName || "un compte supprimé";
  switch (a.action) {
    case "register": return { icon: "✨", text: `${actor} a créé son compte` };
    case "login": return { icon: "🔑", text: `Connexion ${de(actor)}` };
    case "profile.update": return { icon: "✏️", text: `${actor} a modifié son profil (${fieldsText(a.details.fields)})` };
    case "password.change": return { icon: "🔒", text: `${actor} a changé son mot de passe` };
    case "account.delete": return { icon: "👋", text: `${a.details.name} a supprimé son compte` };
    case "user.create": return { icon: "➕", text: `${actor} a créé le compte ${de(target)}` };
    case "user.update": return { icon: "🛠️", text: `${actor} a modifié ${target} (${fieldsText(a.details.fields)})` };
    case "role.change": return { icon: "🛡️", text: `${actor} a passé ${target} en ${a.details.role === "admin" ? "administrateur" : "utilisateur"}` };
    case "user.delete": return { icon: "🗑️", text: `${actor} a supprimé le compte ${de(a.details.name)}` };
    default: return { icon: "•", text: a.action };
  }
}
