import { useEffect, useId, useRef } from "react";
import { passwordStrength } from "../utils/validation";

// Initials on a colour computed from the user id (always the same colour for a user)
export function Avatar({ user, size = 40 }) {
  const seed = [...(user?.id || user?.email || "x")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hue = seed % 360;
  const initials = (user?.name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 40) % 360} 75% 52%))` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function RoleBadge({ role }) {
  return <span className={`badge role-${role}`}>{role === "admin" ? "Administrateur" : "Utilisateur"}</span>;
}

// Label + input + error message, wired for accessibility
export function Field({ label, error, hint, as = "input", children, ...props }) {
  const id = useId();
  const Tag = as;
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children ?? (
        <Tag id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
      )}
      {hint && !error && <small id={`${id}-hint`} className="hint">{hint}</small>}
      {error && <small id={`${id}-err`} className="error" role="alert">{error}</small>}
    </div>
  );
}

export function PasswordMeter({ value }) {
  const score = passwordStrength(value);
  const labels = ["Trop faible", "Faible", "Correct", "Bon", "Excellent"];
  return (
    <div className="meter" aria-live="polite">
      <div className="meter-bars">{[0, 1, 2, 3].map((i) => <span key={i} className={i < score ? `on s${score}` : ""} />)}</div>
      <small>{value ? labels[score] : "8 caractères minimum, avec une lettre et un chiffre"}</small>
    </div>
  );
}

// Accessible modal: <dialog> element, Esc closes it, focus stays inside
export function Modal({ open, title, onClose, children, footer, size = "md" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Fallback to the "open" attribute where showModal() is missing (older browsers, tests)
    if (open && !dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (dialog.close) dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="modal-inner">
          <header className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function Spinner({ label = "Chargement…" }) {
  return <div className="spinner" role="status"><span /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ icon = "🪐", title, children }) {
  return (
    <div className="empty">
      <span aria-hidden="true">{icon}</span>
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}
