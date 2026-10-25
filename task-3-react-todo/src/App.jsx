import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Header from "./components/Header";
import Garden from "./components/Garden";
import TaskForm from "./components/TaskForm";
import Toolbar from "./components/Toolbar";
import TaskList from "./components/TaskList";
import UndoToast from "./components/UndoToast";
import { PRIORITIES, createTask, tasksReducer } from "./state/tasksReducer";
import { readStorage, usePersist } from "./hooks/useLocalStorage";
import { addDays, todayISO } from "./utils/dates";

// A few example tasks for the very first visit
function demoTasks() {
  const today = todayISO();
  const done = (task) => ({ ...task, done: true, doneAt: Date.now() });
  return [
    createTask({ title: "Préparer la vidéo LinkedIn du stage", category: "travail", priority: "medium", due: addDays(today, 3) }),
    createTask({ title: "Finir la tâche 3 du stage SaiKet (React)", category: "travail", priority: "high", due: today }),
    createTask({ title: "Réviser les hooks : useState, useEffect, useReducer", category: "etudes", priority: "medium", due: addDays(today, 1) }),
    createTask({ title: "30 minutes de marche", category: "sante", priority: "low" }),
    done(createTask({ title: "Rendre la tâche 2 (landing page e-commerce)", category: "travail", priority: "high" })),
    done(createTask({ title: "Boire 1,5 L d'eau", category: "sante", priority: "low" })),
  ];
}

const SORTERS = {
  manual: null,
  due: (a, b) => (a.due || "9999").localeCompare(b.due || "9999"),
  priority: (a, b) => PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank,
  recent: (a, b) => b.createdAt - a.createdAt,
};

export default function App() {
  // useReducer: all task changes are described as actions (see tasksReducer.js)
  const [tasks, dispatch] = useReducer(tasksReducer, null, () => readStorage("bloom-tasks", null) ?? demoTasks());
  usePersist("bloom-tasks", tasks);

  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("manual");
  const [undo, setUndo] = useState(null);
  const inputRef = useRef(null);

  // Keyboard shortcut: "N" focuses the new-task field
  useEffect(() => {
    function onKey(e) {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (!typing && (e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(
    () => ({ all: tasks.length, active: tasks.filter((t) => !t.done).length, done: tasks.filter((t) => t.done).length }),
    [tasks]
  );

  // Derived data: the list on screen is computed from state, never stored twice
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tasks.filter(
      (t) =>
        (status === "all" || (status === "done" ? t.done : !t.done)) &&
        (category === "all" || t.category === category) &&
        (!q || t.title.toLowerCase().includes(q))
    );
    return SORTERS[sort] ? [...list].sort(SORTERS[sort]) : list;
  }, [tasks, status, category, query, sort]);

  const addTask = (fields) => dispatch({ type: "add", task: createTask(fields) });
  const toggleTask = (id) => dispatch({ type: "toggle", id });
  const editTask = (id, changes) => dispatch({ type: "edit", id, changes });
  const moveTask = (fromId, toId) => dispatch({ type: "move", fromId, toId });

  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    const task = tasks[index];
    dispatch({ type: "delete", id });
    setUndo({ id: Date.now(), label: `« ${task.title} » supprimée`, restore: [{ task, index }] });
  }

  function clearCompleted() {
    const removed = tasks.map((task, index) => ({ task, index })).filter(({ task }) => task.done);
    dispatch({ type: "clearCompleted" });
    setUndo({ id: Date.now(), label: `${removed.length} tâche${removed.length > 1 ? "s" : ""} terminée${removed.length > 1 ? "s" : ""} effacée${removed.length > 1 ? "s" : ""}`, restore: removed });
  }

  function undoDelete() {
    undo.restore.forEach(({ task, index }) => dispatch({ type: "restore", task, index }));
    setUndo(null);
  }

  const closeUndo = useCallback(() => setUndo(null), []);

  const filtered = status !== "all" || category !== "all" || query.trim();
  const emptyMessage = tasks.length === 0
    ? "Aucune tâche pour l'instant. Ajoute la première ci-dessus !"
    : filtered
      ? "Aucune tâche ne correspond à ces filtres."
      : "Rien à afficher.";

  return (
    <div className="app">
      <Header />
      <main>
        <Garden tasks={tasks} />
        <TaskForm onAdd={addTask} inputRef={inputRef} />

        <section className="card list-card" aria-label="Liste des tâches">
          <Toolbar
            counts={counts}
            status={status} onStatus={setStatus}
            category={category} onCategory={setCategory}
            query={query} onQuery={setQuery}
            sort={sort} onSort={setSort}
          />
          <TaskList
            tasks={visible}
            canReorder={sort === "manual" && !filtered}
            onToggle={toggleTask}
            onEdit={editTask}
            onDelete={deleteTask}
            onMove={moveTask}
            emptyMessage={emptyMessage}
          />
          <footer className="list-footer">
            <span className="muted small">
              {counts.active} tâche{counts.active > 1 ? "s" : ""} à faire
              {sort === "manual" && !filtered && counts.all > 1 ? " · glisse ⋮⋮ pour réordonner" : ""}
              {" · double-clic pour modifier"}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearCompleted} disabled={counts.done === 0}>
              Effacer les terminées ({counts.done})
            </button>
          </footer>
        </section>
      </main>

      <p className="credits muted small">
        Bloom · React {"·"} SaiKet Systems Task 3 · Loujein Fanni
      </p>

      <UndoToast undo={undo} onUndo={undoDelete} onClose={closeUndo} />
    </div>
  );
}
