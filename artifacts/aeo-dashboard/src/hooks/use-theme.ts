import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

// Bumped from "aeo-theme" so the old dark-by-default preference is reset — the
// portal now defaults to light (white) for everyone. The toggle still persists
// a user's choice under this key going forward.
const STORAGE_KEY = "aeo-theme-v2";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
    } catch {}
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const isDark = theme === "dark";

  return { theme, isDark, toggleTheme };
}
