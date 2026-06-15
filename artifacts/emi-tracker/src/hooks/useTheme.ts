import { useState, useEffect, useRef } from "react";

type Theme = "light" | "dark";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function getLocalTheme(): Theme | null {
  const stored = localStorage.getItem("emi-theme");
  if (stored === "dark" || stored === "light") return stored;
  return null;
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

async function saveThemeToServer(theme: Theme) {
  try {
    await fetch(`${basePath}/api/users/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themePreference: theme }),
    });
  } catch {
    // silently ignore — localStorage is the fallback
  }
}

export function useTheme(serverTheme?: string | null) {
  const initialised = useRef(false);

  const [theme, setTheme] = useState<Theme>(() => {
    // Priority: server preference → localStorage → system
    const t = (serverTheme === "dark" || serverTheme === "light")
      ? serverTheme
      : (getLocalTheme() ?? getSystemTheme());
    applyTheme(t);
    return t;
  });

  // When serverTheme loads (after auth), sync to it once
  useEffect(() => {
    if (initialised.current) return;
    if (serverTheme === "dark" || serverTheme === "light") {
      initialised.current = true;
      setTheme(serverTheme);
      applyTheme(serverTheme);
      localStorage.setItem("emi-theme", serverTheme);
    }
  }, [serverTheme]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("emi-theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      saveThemeToServer(next);
      return next;
    });
  };

  return { theme, toggle };
}
