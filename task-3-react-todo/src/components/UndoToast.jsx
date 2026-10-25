import { useEffect } from "react";

// Shows "Task deleted · Undo" for a few seconds, then disappears on its own.
export default function UndoToast({ undo, onUndo, onClose, duration = 5000 }) {
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer); // cleanup: cancel the timer if the toast changes
  }, [undo, onClose, duration]);

  if (!undo) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{undo.label}</span>
      <button type="button" className="btn btn-light" onClick={onUndo}>Annuler</button>
      <span className="toast-bar" style={{ animationDuration: `${duration}ms` }} key={undo.id} />
    </div>
  );
}
