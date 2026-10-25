import { useState } from "react";
import { CATEGORIES, PRIORITIES, validateTitle } from "../state/tasksReducer";

// Controlled form: every field value lives in React state.
export default function TaskForm({ onAdd, inputRef }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("perso");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const message = validateTitle(title);
    setError(message);
    if (message) {
      inputRef.current?.focus();
      return;
    }
    onAdd({ title, category, priority, due });
    setTitle("");
    setDue("");
    inputRef.current?.focus();
  }

  return (
    <form className="card task-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <label htmlFor="new-task" className="sr-only">Nouvelle tâche</label>
        <input
          id="new-task"
          ref={inputRef}
          className={`input input-lg ${error ? "is-invalid" : ""}`}
          placeholder="Qu'as-tu à faire ? (raccourci : N)"
          value={title}
          maxLength={140}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(validateTitle(e.target.value));
          }}
          aria-invalid={Boolean(error)}
          aria-describedby="new-task-error"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">Ajouter</button>
      </div>
      <p id="new-task-error" className="field-error" role="alert">{error}</p>

      <div className="form-options">
        <label className="option">
          <span className="muted small">Catégorie</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </select>
        </label>

        <fieldset className="option">
          <legend className="muted small">Priorité</legend>
          <div className="segmented">
            {Object.entries(PRIORITIES).map(([key, p]) => (
              <label key={key} className={`seg seg-${key} ${priority === key ? "active" : ""}`}>
                <input type="radio" name="priority" value={key} checked={priority === key} onChange={() => setPriority(key)} />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="option">
          <span className="muted small">Échéance</span>
          <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>
    </form>
  );
}
