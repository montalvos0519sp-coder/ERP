"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/UserContext";

export type FontFamilyKey =
  | "system" | "poppins" | "nunito" | "raleway" | "playfair" | "spacegrotesk" | "mono";
export type FontSizeKey = "sm" | "md" | "lg" | "xl";

export interface UserPrefs {
  fontFamily: FontFamilyKey;
  fontSize: FontSizeKey;
  accent: string;
  darkOverridesAccent: boolean;
}

const DEFAULTS: UserPrefs = {
  fontFamily: "system",
  fontSize: "md",
  accent: "#1A73E8",
  darkOverridesAccent: true,
};

export const DARK_NEUTRAL_GRADIENT = "linear-gradient(90deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)";

const FONT_STACKS: Record<FontFamilyKey, string> = {
  system: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
  raleway: "'Raleway', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  spacegrotesk: "'Space Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
};

const SIZE_BASE: Record<FontSizeKey, string> = { sm: "14px", md: "16px", lg: "17.5px", xl: "19px" };

export const FONT_FAMILY_LABEL: Record<FontFamilyKey, string> = {
  system: "Sistema (por defecto)",
  poppins: "Poppins · geometrica",
  nunito: "Nunito · redondeada",
  raleway: "Raleway · elegante",
  playfair: "Playfair · serif",
  spacegrotesk: "Space Grotesk · moderna",
  mono: "JetBrains Mono · monoespaciada",
};

export const FONT_SIZE_LABEL: Record<FontSizeKey, string> = {
  sm: "Pequeno", md: "Normal", lg: "Grande", xl: "Extra grande",
};

export const ACCENT_SWATCHES: { name: string; value: string }[] = [
  { name: "Azul", value: "#1A73E8" },
  { name: "Indigo", value: "#4F46E5" },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Esmeralda", value: "#059669" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Ambar", value: "#F59E0B" },
  { name: "Rojo", value: "#DC2626" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Slate", value: "#475569" },
];

interface Ctx {
  prefs: UserPrefs;
  setFontFamily: (v: FontFamilyKey) => void;
  setFontSize: (v: FontSizeKey) => void;
  setAccent: (hex: string) => void;
  setDarkOverridesAccent: (v: boolean) => void;
  reset: () => void;
}

const UserPrefsCtx = createContext<Ctx | null>(null);
const STORAGE_PREFIX = "erp.user-prefs";

function storageKey(username: string | null | undefined) {
  return `${STORAGE_PREFIX}::${(username || "__guest__").trim().toLowerCase()}`;
}

function load(key: string): UserPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch { return DEFAULTS; }
}

function hexToRgb(hex: string) {
  const h = (hex || "").replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const num = parseInt(n || "0", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function shiftHue(hex: string, deg: number) {
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R: h = (G - B) / d + (G < B ? 6 : 0); break;
      case G: h = (B - R) / d + 2; break;
      default: h = (R - G) / d + 4;
    }
    h /= 6;
  }
  h = (h + deg / 360) % 1; if (h < 0) h += 1;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(hue2rgb(p, q, h + 1 / 3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1 / 3))}`;
}

const ORIGINAL_HEADER_GRADIENT = "linear-gradient(90deg, #1A73E8 0%, #14B8A6 100%)";

function gradientFromAccent(accent: string) {
  if (accent.toLowerCase() === DEFAULTS.accent.toLowerCase()) return ORIGINAL_HEADER_GRADIENT;
  const a2 = shiftHue(accent, 40);
  const a3 = shiftHue(accent, -25);
  return `linear-gradient(90deg, ${accent} 0%, ${a2} 55%, ${a3} 100%)`;
}

function apply(p: UserPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--user-font-family", FONT_STACKS[p.fontFamily]);
  root.style.setProperty("--user-font-size", SIZE_BASE[p.fontSize]);
  root.style.setProperty("--user-accent", p.accent);
  const isDark = root.getAttribute("data-theme") === "dark";
  const useNeutral = p.darkOverridesAccent && isDark;
  root.style.setProperty("--user-header-bg", useNeutral ? DARK_NEUTRAL_GRADIENT : gradientFromAccent(p.accent));
  root.setAttribute("data-user-header", useNeutral ? "dark-neutral" : "accent");
  document.body.style.fontFamily = FONT_STACKS[p.fontFamily];
  root.style.fontSize = SIZE_BASE[p.fontSize];
}

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const key = storageKey(user?.username);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);

  useEffect(() => {
    const loaded = load(key);
    setPrefs(loaded);
    apply(loaded);
  }, [key]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const obs = new MutationObserver(() => apply(prefs));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [prefs]);

  const update = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* */ }
      apply(next);
      return next;
    });
  }, [key]);

  const value = useMemo<Ctx>(() => ({
    prefs,
    setFontFamily: (v) => update({ fontFamily: v }),
    setFontSize: (v) => update({ fontSize: v }),
    setAccent: (hex) => update({ accent: hex }),
    setDarkOverridesAccent: (v) => update({ darkOverridesAccent: v }),
    reset: () => {
      try { window.localStorage.removeItem(key); } catch { /* */ }
      setPrefs(DEFAULTS);
      apply(DEFAULTS);
    },
  }), [prefs, update, key]);

  return <UserPrefsCtx.Provider value={value}>{children}</UserPrefsCtx.Provider>;
}

export function useUserPrefs(): Ctx {
  const ctx = useContext(UserPrefsCtx);
  if (!ctx) throw new Error("useUserPrefs debe usarse dentro de UserPrefsProvider");
  return ctx;
}
