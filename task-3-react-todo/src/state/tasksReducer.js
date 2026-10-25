// All task changes go through this reducer (used with React's useReducer).
// It is a pure function: same state + same action => same new state, easy to test.

export const CATEGORIES = {
  perso: { label: "Perso", color: "#f472b6" },
  travail: { label: "Travail", color: "#60a5fa" },
  etudes: { label: "Études", color: "#a78bfa" },
  sante: { label: "Santé", color: "#34d399" },
};

export const PRIORITIES = {
  high: { label: "Haute", rank: 0 },
  medium: { label: "Moyenne", rank: 1 },
  low: { label: "Basse", rank: 2 },
};

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createTask({ title, category = "perso", priority = "medium", due = "" }) {
  return {
    id: newId(),
    title: title.trim(),
    category,
    priority,
    due: due || "",
    done: false,
    createdAt: Date.now(),
    doneAt: null,
  };
}

export function tasksReducer(tasks, action) {
  switch (action.type) {
    case "add":
      return [action.task, ...tasks];

    case "toggle":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, done: !t.done, doneAt: t.done ? null : Date.now() } : t
      );

    case "edit":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, ...action.changes, title: (action.changes.title ?? t.title).trim() } : t
      );

    case "delete":
      return tasks.filter((t) => t.id !== action.id);

    // Put a deleted task back where it was (used by "Undo")
    case "restore": {
      const copy = [...tasks];
      copy.splice(Math.min(action.index, copy.length), 0, action.task);
      return copy;
    }

    case "clearCompleted":
      return tasks.filter((t) => !t.done);

    // Drag & drop: move the task `fromId` to the position of `toId`
    case "move": {
      const from = tasks.findIndex((t) => t.id === action.fromId);
      const to = tasks.findIndex((t) => t.id === action.toId);
      if (from < 0 || to < 0 || from === to) return tasks;
      const copy = [...tasks];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    }

    case "replaceAll":
      return action.tasks;

    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function validateTitle(title) {
  const value = title.trim();
  if (!value) return "Écris le nom de la tâche.";
  if (value.length < 2) return "Au moins 2 caractères.";
  if (value.length > 120) return "120 caractères maximum.";
  return "";
}
