import { useTheme } from "../ThemeContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-logo" aria-hidden="true">✿</span>
        <div>
          <h1>Bloom</h1>
          <p className="muted small">La to-do list qui fleurit · {today}</p>
        </div>
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
        title="Changer de thème"
      >
        {theme === "dark" ? "☀︎" : "☾"}
      </button>
    </header>
  );
}
