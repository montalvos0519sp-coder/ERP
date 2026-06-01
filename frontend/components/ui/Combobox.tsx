"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export interface ComboOption {
  id: string | number;
  label: string;      // valor que se muestra en el input (clave)
  description?: string; // texto secundario (descripcion)
  raw?: any;
}

interface Props {
  value: string;
  onChange: (val: string, option?: ComboOption) => void;
  search: (q: string) => Promise<ComboOption[]>;
  placeholder?: string;
  className?: string;
  minChars?: number;
  /** Si true, llama search('') al abrir aunque no haya texto. */
  showAllOnOpen?: boolean;
  /** Etiqueta de boton invisible accesible. */
  ariaLabel?: string;
}

/**
 * Combobox con autocompletado contra una funcion de busqueda async (API).
 * - Debounce 250ms.
 * - Cache simple para no repetir requests del mismo query.
 * - Navegacion por teclado: ↑ ↓ Enter Esc.
 * - Dropdown renderizado en un PORTAL fuera del flujo normal con position:fixed
 *   para que SIEMPRE flote sobre cualquier elemento (no se corta por Cards).
 */
export default function Combobox({
  value, onChange, search, placeholder, className = "",
  minChars = 1, showAllOnOpen = false, ariaLabel,
}: Props) {
  const { isDarkMode: isDark, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [selectedDesc, setSelectedDesc] = useState<string>("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "down" | "up" } | null>(null);
  const [mounted, setMounted] = useState(false);

  const cache = useRef(new Map<string, ComboOption[]>());
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Sincroniza value externo con el input.
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Calcula posicion del dropdown relativo a la ventana.
  const updateCoords = useCallback(() => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const DROPDOWN_H = 288; // max-h-72 = 18rem ~ 288px
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placeUp = spaceBelow < DROPDOWN_H && spaceAbove > spaceBelow;
    setCoords({
      top: placeUp ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: r.width,
      placement: placeUp ? "up" : "down",
    });
  }, []);

  // Reposiciona al abrir, al hacer scroll, o al redimensionar.
  useEffect(() => {
    if (!open) return;
    updateCoords();
    const onChangeView = () => updateCoords();
    window.addEventListener("scroll", onChangeView, true);
    window.addEventListener("resize", onChangeView);
    return () => {
      window.removeEventListener("scroll", onChangeView, true);
      window.removeEventListener("resize", onChangeView);
    };
  }, [open, updateCoords]);

  // Click fuera cierra el dropdown.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boxRef.current?.contains(target)) return;
      // Si el click es dentro del dropdown (portal), tampoco cerrar.
      const dropdown = document.getElementById(`combobox-portal-${dropdownId.current}`);
      if (dropdown && dropdown.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Busqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < minChars && !showAllOnOpen) {
      setOptions([]);
      return;
    }
    const cached = cache.current.get(q);
    if (cached) {
      setOptions(cached);
      setHighlighted(0);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      search(q)
        .then((res) => {
          cache.current.set(q, res);
          setOptions(res);
          setHighlighted(0);
        })
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, minChars, showAllOnOpen, search]);

  const dropdownId = useRef(Math.random().toString(36).slice(2, 8));

  const pick = (opt: ComboOption) => {
    onChange(opt.label, opt);
    setQuery(opt.label);
    setSelectedDesc(opt.description || "");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (options[highlighted]) pick(options[highlighted]);
    }
    else if (e.key === "Escape") setOpen(false);
  };

  const dropdown = open && mounted && coords ? (
    <div
      id={`combobox-portal-${dropdownId.current}`}
      className={`fixed max-h-72 overflow-y-auto custom-scrollbar rounded-xl border shadow-2xl ${theme.surfaceElevated}`}
      style={{
        top: coords.placement === "down" ? coords.top : undefined,
        bottom: coords.placement === "up" ? window.innerHeight - coords.top : undefined,
        left: coords.left,
        width: coords.width,
        zIndex: 99999,
      }}
    >
      {loading && options.length === 0 ? (
        <div className={`p-3 text-xs ${theme.textTertiary}`}>Buscando...</div>
      ) : options.length === 0 ? (
        <div className={`p-3 text-xs ${theme.textTertiary}`}>
          {query.trim().length < minChars
            ? `Escribe al menos ${minChars} caracter(es)...`
            : "Sin coincidencias."}
        </div>
      ) : (
        options.map((opt, i) => {
          const active = i === highlighted;
          const selected = String(value) === String(opt.label);
          return (
            <button
              key={`${opt.id}-${i}`}
              type="button"
              onClick={() => pick(opt)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b last:border-b-0 transition-colors ${
                active ? (isDark ? "bg-white/[0.05]" : "bg-slate-100") : ""
              } ${theme.divider}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold ${theme.textPrimary}`}>{opt.label}</span>
                  {selected && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                {opt.description && (
                  <p className={`text-[11px] truncate ${theme.textSecondary}`}>{opt.description}</p>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  ) : null;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          aria-label={ariaLabel}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className={`w-full pr-16 ${inputCls(isDark)}`}
          autoComplete="off"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          {query && !loading && (
            <button type="button" onClick={() => { setQuery(""); onChange(""); setSelectedDesc(""); inputRef.current?.focus(); }}
              className={`p-1 rounded hover:bg-white/10 ${theme.textTertiary}`} aria-label="Limpiar">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
            className={`p-1 rounded ${theme.textTertiary}`}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {selectedDesc && !open && (
        <p className={`text-[10px] mt-1 truncate ${theme.textTertiary}`}>{selectedDesc}</p>
      )}

      {mounted && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

function inputCls(dark: boolean) {
  return dark
    ? "bg-[#1E293B]/40 border border-white/[0.05] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#14B8A6]/50 focus:shadow-[0_0_15px_rgba(20,184,166,0.1)] transition-all"
    : "bg-white/80 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A73E8]/50 transition-all";
}
