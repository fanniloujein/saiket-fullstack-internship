import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ActivityList from "../components/ActivityList";
import { AgeBars, SignupChart } from "../components/Charts";
import { Spinner } from "../components/ui";

function StatCard({ icon, label, value, note }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="muted small">{label}</p>
        <p className="stat-value">{value}</p>
        {note && <p className="muted small">{note}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([Api.stats(), Api.activity(12)])
      .then(([s, a]) => { setStats(s); setActivity(a); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <Spinner />;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bonjour {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Voici ce qui se passe dans Orbit. Toutes les données viennent de PostgreSQL.</p>
        </div>
        <Link to="/admin/users" className="btn btn-primary">Gérer les utilisateurs →</Link>
      </header>

      <div className="stats-grid">
        <StatCard icon="👥" label="Utilisateurs" value={stats.total} note={`dont ${stats.admins} administrateur${stats.admins > 1 ? "s" : ""}`} />
        <StatCard icon="🌱" label="Nouveaux (7 jours)" value={stats.newThisWeek} />
        <StatCard icon="⚡" label="Actifs (7 jours)" value={stats.activeThisWeek} note="connectés cette semaine" />
        <StatCard icon="🎂" label="Âge moyen" value={stats.averageAge == null ? "—" : `${String(stats.averageAge).replace(".", ",")} ans`} />
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Inscriptions sur 14 jours</h2>
          <SignupChart days={stats.signups} />
          <h2 className="mt">Répartition par âge</h2>
          <AgeBars brackets={stats.ageBrackets} total={stats.total} />
        </section>
        <section className="card">
          <h2>Activité récente</h2>
          <ActivityList items={activity} />
        </section>
      </div>
    </div>
  );
}
