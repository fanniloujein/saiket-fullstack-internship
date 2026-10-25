import { useEffect, useRef, useState } from "react";
import { CATEGORIES, PRIORITIES, validateTitle } from "../state/tasksReducer";
import { describeDue } from "../utils/dates";

export default function TaskItem({ task, onToggle, onEdit, onDelete, draggable, dragHandlers, isDragOver }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const [error, setError] = useState("");
  const editInputRef = useRef(null);

  // useEffect + useRef: put the cursor in the field as soon as edit mode opens
  useEffect(() => {
    if (editing) editInputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(task);
    setError("");
    setEditing(true);
  }

  function save(e) {
    e.preventDefault();
    const message = validateTitle(draft.title);
    if (message) {
      setError(message);
      return;
    }
    onEdit(task.id, { title: draft.title, category: draft.category, priority: draft.priority, due: draft.due });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="task editing">
        <form className="edit-form" onSubmit={save} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} noValidate>
          <label className="sr-only" htmlFor={`edit-${task.id}`}>Modifier la tâche</label>
          <input
            id={`edit-${task.id}`}
            ref={editInputRef}
            className={`input ${error ? "is-invalid" : ""}`}
            value={draft.title}
            maxLength={140}
            onChange={(e) => {
              setDraft({ ...draft, title: e.target.value });
              if (error) setError(validateTitle(e.target.value));
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={`edit-err-${task.id}`}
          />
          <p id={`edit-err-${task.id}`} className="field-error" role="alert">{error}</p>
          <div className="edit-row">
            <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} aria-label="Catégorie">
              {Object.entries(CATEGORIES).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
            <select className="input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} aria-label="Priorité">
              {Object.entries(PRIORITIES).map(([key, p]) => <option key={key} value={key}>Priorité {p.label.toLowerCase()}</option>)}
            </select>
            <input type="date" className="input" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} aria-label="Échéance" />
            <div className="edit-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  const category = CATEGORIES[task.category];
  const due = describeDue(task.due);

  return (
    <li
      className={`task ${task.done ? "done" : ""} ${isDragOver ? "drag-over" : ""}`}
      style={{ "--cat": category.color }}
      draggable={draggable}
      {...dragHandlers}
    >
      {draggable && <span className="handle" aria-hidden="true" title="Glisser pour réordonner">⋮⋮</span>}

      <label className="check">
        <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} aria-label={`Marquer « ${task.title} » comme ${task.done ? "à faire" : "terminée"}`} />
        <span className="check-box" aria-hidden="true">✓</span>
      </label>

      <div className="task-body" onDoubleClick={startEdit}>
        <p className="task-title">{task.title}</p>
        <div className="badges">
          <span className="badge badge-cat"><span className="dot" />{category.label}</span>
          <span className={`badge badge-prio prio-${task.priority}`}>{PRIORITIES[task.priority].label}</span>
          {due && <span className={`badge due-${task.done ? "later" : due.tone}`}>📅 {due.label}</span>}
        </div>
      </div>

      <div className="task-actions">
        <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Modifier « ${task.title} »`} title="Modifier">✎</button>
        <button type="button" className="icon-btn danger" onClick={() => onDelete(task.id)} aria-label={`Supprimer « ${task.title} »`} title="Supprimer">🗑</button>
      </div>
    </li>
  );
}
