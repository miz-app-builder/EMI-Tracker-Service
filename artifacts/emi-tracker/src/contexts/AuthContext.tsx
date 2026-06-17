import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { saveToken, clearToken, authFetch } from "@/lib/token";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

  async function fetchMe() {
    try {
      const res = await authFetch(`${basePath}/api/auth/me`);
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    authFetch(`${basePath}/api/auth/logout`, { method: "POST" }).catch(() => {});
    clearToken();
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("emi-theme");
    window.location.href = `${basePath}/`;
  }

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
