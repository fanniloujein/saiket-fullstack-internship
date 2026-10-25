import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Api } from "../api/client";

const AuthContext = createContext(null);

// Knows who is logged in, for the whole app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the server whether the session cookie is still valid
  useEffect(() => {
    Api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await Api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (fields) => {
    const u = await Api.register(fields);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
