import { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError, hasToken } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=not auth, object=auth
  const [setupRequired, setSetupRequired] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const st = await api.get("/setup/status");
        setSetupRequired(st.data.setup_required);
        if (st.data.setup_required) { setUser(false); return; }
      } catch {
        setSetupRequired(false);
      }
      // Only call /auth/me if we actually have a token, to avoid noisy expected 401s.
      if (!hasToken()) { setUser(false); return; }
      try {
        const me = await api.get("/auth/me");
        setUser(me.data);
      } catch {
        setUser(false);
      }
    })();

    const onAuthLost = () => setUser(false);
    window.addEventListener("asys-auth-lost", onAuthLost);
    return () => window.removeEventListener("asys-auth-lost", onAuthLost);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) localStorage.setItem("asys_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const setupAdmin = async (email, name, password, phone = "") => {
    const { data } = await api.post("/setup/admin", { email, name, password, phone });
    if (data.access_token) localStorage.setItem("asys_token", data.access_token);
    setUser(data.user);
    setSetupRequired(false);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.removeItem("asys_token");
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, setupRequired, login, logout, setupAdmin, formatApiError }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
