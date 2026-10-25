// Dates are stored as "YYYY-MM-DD" strings (the format of <input type="date">).

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

// Returns { label, tone } for a due date: tone is "late", "today", "soon" or "later"
export function describeDue(due, today = todayISO()) {
  if (!due) return null;
  const [y, m, d] = due.split("-").map(Number);
  const short = new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (due < today) return { label: `En retard · ${short}`, tone: "late" };
  if (due === today) return { label: "Aujourd'hui", tone: "today" };
  if (due === addDays(today, 1)) return { label: "Demain", tone: "soon" };
  return { label: short, tone: "later" };
}
