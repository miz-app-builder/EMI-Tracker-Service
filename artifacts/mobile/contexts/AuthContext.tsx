import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AuthUser,
  SignupData,
  authLogin,
  authLogout,
  authMe,
  authSignup,
  clearToken,
  setToken,
} from "@/services/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token } = await authLogin(email, password);
    await setToken(token);
    setUser(u);
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    const { user: u, token } = await authSignup(data);
    await setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
