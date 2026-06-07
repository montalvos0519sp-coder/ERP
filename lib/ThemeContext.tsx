"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "synergy.theme.dark";

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Arranca en oscuro (estable para SSR). El efecto lee la preferencia real.
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    try {
      const attr = document.documentElement.getAttribute("data-theme");
      const dark = attr ? attr !== "light" : localStorage.getItem(STORAGE_KEY) !== "false";
      setIsDarkMode(dark);
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

  return <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
