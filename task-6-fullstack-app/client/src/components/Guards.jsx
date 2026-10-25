import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Spinner } from "./ui";

// Pages that need a logged-in user
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-page"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// Pages for administrators only
export function RequireAdmin({ children }) {
  const { user } = useAuth();
  return <RequireAuth>{user?.role === "admin" ? children : <Navigate to="/profile" replace />}</RequireAuth>;
}

// Login / sign-up pages: already logged in => go home
export function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page"><Spinner /></div>;
  return user ? <Navigate to="/" replace /> : children;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/profile"} replace />;
}
