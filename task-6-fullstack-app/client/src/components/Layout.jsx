import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "./Toast";
import { Avatar, RoleBadge } from "./ui";

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("orbit-theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true"><span /></span>
      Orbit
    </span>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    notify("À bientôt ! Vous êtes déconnecté·e.");
    navigate("/login");
  }

  const links = [
    ...(user.role === "admin"
      ? [
          { to: "/admin", label: "Tableau de bord", icon: "📊", end: true },
          { to: "/admin/users", label: "Utilisateurs", icon: "👥" },
        ]
      : []),
    { to: "/profile", label: "Mon profil", icon: "🙂" },
  ];

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button type="button" className="icon-btn only-mobile" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">✕</button>
        </div>
        <nav aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link" onClick={() => setMenuOpen(false)}>
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <Avatar user={user} size={38} />
          <div className="sidebar-user-text">
            <strong>{user.name}</strong>
            <RoleBadge role={user.role} />
          </div>
        </div>
        <div className="sidebar-actions">
          <button type="button" className="btn btn-ghost" onClick={toggleTheme}>
            {theme === "dark" ? "☀︎ Mode clair" : "☾ Mode sombre"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>↪ Se déconnecter</button>
        </div>
      </aside>
      {menuOpen && <div className="backdrop only-mobile" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar only-mobile">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">☰</button>
          <Logo />
          <Avatar user={user} size={32} />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
