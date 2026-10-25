import { Link, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import { HomeRedirect, PublicOnly, RequireAdmin, RequireAuth } from "./components/Guards";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";

function NotFound() {
  return (
    <div className="center-page">
      <div className="empty">
        <span aria-hidden="true">🛸</span>
        <p className="empty-title">Cette page s'est perdue dans l'espace.</p>
        <Link to="/" className="btn btn-primary">Revenir à l'accueil</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
