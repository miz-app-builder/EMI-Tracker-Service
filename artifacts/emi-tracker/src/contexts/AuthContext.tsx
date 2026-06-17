import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { saveToken, clearToken, authFetch } from "@/lib/token";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const POLL_INTERVAL_MS = 5_000;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  address?: string | null;
  profilePhotoUrl?: string | null;
  themePreference?: string | null;
  emailVerifiedAt?: string | null;
  passwordChangedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  hasPinLogin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refetch: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function doLogout() {
    clearToken();
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("emi-theme");
    setUser(null);
  }

  async function fetchMe(isPolling = false) {
    try {
      const res = await authFetch(`${basePath}/api/auth/me`, { cache: "no-store" });
      if (res.ok) {
        setUser(await res.json());
      } else if (res.status === 401) {
        doLogout();
      } else if (!isPolling) {
        setUser(null);
      }
    } catch {
      if (!isPolling) setUser(null);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  function logout() {
    authFetch(`${basePath}/api/auth/logout`, { method: "POST" }).catch(() => {});
    doLogout();
  }

  function startPolling() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      fetchMe(true);
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    fetchMe().then(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [!!user]);

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
