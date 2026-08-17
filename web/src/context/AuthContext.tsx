import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SANDBOX_TTL_MS, ADMIN_CREDENTIALS } from "@/config/env";
import { freshDataSet, type DataSet } from "@/services/mockDb";
import { setAuthToken, setActiveDataSet, login as apiLogin } from "@/services/api";
import { platformAdmin } from "@/data/adminSeed";
import type { User } from "@/lib/types";

// AuthContext handles both real (JWT) and sandbox modes. In sandbox mode a
// deep-cloned DataSet is created and pointed at by the service layer so all
// CRUD mutates an isolated in-memory copy that dies with the tab.

interface AuthState {
  user: User | null;
  token: string | null;
  isSandbox: boolean;
  expiresAt: number | null;
}

interface SandboxLaunch {
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue extends AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  startSandbox: (info: SandboxLaunch) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "pactlink.token";
const SANDBOX_KEY = "pactlink.sandbox";
const ADMIN_TOKEN = "mock.admin.jwt";

interface SandboxSession {
  isSandbox: true;
  user: { name: string; email: string; role: string };
  createdAt: number;
  expiresAt: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isSandbox: false,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);
  // Sandbox dataset clone lives here so it's isolated per session.
  const [sandboxDb, setSandboxDb] = useState<DataSet | null>(null);

  // Restore a session on mount (real token in localStorage, sandbox in
  // sessionStorage so it dies with the tab).
  useEffect(() => {
    const raw = sessionStorage.getItem(SANDBOX_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as SandboxSession;
        if (s.expiresAt > Date.now()) {
          const ds = freshDataSet();
          ds.user = {
            ...ds.user,
            name: s.user.name,
            email: s.user.email,
            role: "demo",
          };
          setSandboxDb(ds);
          setActiveDataSet(ds);
          setState({
            user: ds.user,
            token: "sandbox",
            isSandbox: true,
            expiresAt: s.expiresAt,
          });
          setLoading(false);
          return;
        }
        sessionStorage.removeItem(SANDBOX_KEY);
      } catch {
        sessionStorage.removeItem(SANDBOX_KEY);
      }
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token === ADMIN_TOKEN) {
      setAuthToken(token);
      setActiveDataSet(null);
      setState({ user: platformAdmin, token, isSandbox: false, expiresAt: null });
      setLoading(false);
      return;
    }
    if (token) {
      setAuthToken(token);
      // Real-user restore: in mock mode we know the seeded demo user; in API
      // mode the dashboard loader will fetch /auth/me-equivalent data lazily.
      const ds = freshDataSet();
      setActiveDataSet(null); // use the shared default dataset for real (non-sandbox)
      setState({
        user: ds.user,
        token,
        isSandbox: false,
        expiresAt: null,
      });
    }
    setLoading(false);
  }, []);

  // Sandbox expiry watchdog.
  useEffect(() => {
    if (!state.isSandbox || !state.expiresAt) return;
    const ms = state.expiresAt - Date.now();
    if (ms <= 0) {
      logout();
      return;
    }
    const t = setTimeout(() => logout(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isSandbox, state.expiresAt]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    // Platform admin is recognised from frontend env creds in mock mode.
    if (
      email.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === ADMIN_CREDENTIALS.password
    ) {
      localStorage.setItem(TOKEN_KEY, ADMIN_TOKEN);
      setAuthToken(ADMIN_TOKEN);
      setActiveDataSet(null);
      setSandboxDb(null);
      setState({ user: platformAdmin, token: ADMIN_TOKEN, isSandbox: false, expiresAt: null });
      return platformAdmin;
    }
    const { token, user } = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setActiveDataSet(null);
    setSandboxDb(null);
    setState({ user, token, isSandbox: false, expiresAt: null });
    return user;
  }, []);

  const startSandbox = useCallback((info: SandboxLaunch) => {
    const ds = freshDataSet();
    ds.user = {
      ...ds.user,
      name: info.name,
      email: info.email,
      role: "demo",
    };
    const expiresAt = Date.now() + SANDBOX_TTL_MS;
    const session: SandboxSession = {
      isSandbox: true,
      user: info,
      createdAt: Date.now(),
      expiresAt,
    };
    sessionStorage.setItem(SANDBOX_KEY, JSON.stringify(session));
    setSandboxDb(ds);
    setActiveDataSet(ds);
    setState({ user: ds.user, token: "sandbox", isSandbox: true, expiresAt });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SANDBOX_KEY);
    setAuthToken(null);
    setActiveDataSet(null);
    setSandboxDb(null);
    setState({ user: null, token: null, isSandbox: false, expiresAt: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loading,
      isAuthenticated: !!state.token,
      login,
      startSandbox,
      logout,
    }),
    [state, loading, login, startSandbox, logout]
  );

  // Keep the service layer pointed at the right dataset across renders.
  useEffect(() => {
    setActiveDataSet(state.isSandbox ? sandboxDb : null);
  }, [state.isSandbox, sandboxDb]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
