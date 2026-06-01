"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { getTheme, type Theme } from "@/lib/theme";

const STORAGE_KEY = "erp.theme.dark";

interface ThemeContextValue {
  isDarkMode: boolean;
  theme: Theme;
  toggleTheme: () => void;
  /** True una vez que React hidrato y leyo localStorage. Antes de eso es false. */
  hydrated: boolean;
  // Aliases para compatibilidad con codigo viejo.
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR y primer render del cliente arrancan con dark=true (estable, sin DOM access).
  // El useEffect lee el tema real de localStorage / data-theme y ajusta.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const fromAttr = document.documentElement.getAttribute("data-theme");
      const dark = fromAttr ? fromAttr !== "light" : (localStorage.getItem(STORAGE_KEY) !== "false");
      setIsDarkMode(dark);
    } catch { /* */ }
    setHydrated(true);
  }, []);

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const setDark = useCallback((next: boolean) => {
    setIsDarkMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    } catch { /* */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((p) => {
      const next = !p;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      } catch { /* */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{
      isDarkMode, theme, toggleTheme, hydrated,
      isDark: isDarkMode, toggle: toggleTheme, setDark,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
