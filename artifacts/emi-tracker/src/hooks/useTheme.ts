import { useState, useEffect } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("emi-theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = getInitialTheme();
    applyTheme(t);
    return t;
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("emi-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
