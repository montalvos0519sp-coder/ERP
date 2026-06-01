"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Hit { id: string; text: string; }

interface Props {
  tipo?: string;              // 'ClaveProdServ' | 'ClaveUnidad' | etc.
  value: string;              // clave seleccionada
  onChange: (clave: string, descripcion: string) => void;
  placeholder?: string;
  className?: string;
  initialLabel?: string;      // texto inicial cuando hay value pero no se hizo búsqueda
  minChars?: number;
}

export default function SatCombobox({
  tipo = "ClaveProdServ",
  value,
  onChange,
  placeholder = "Buscar en catálogo SAT…",
  className = "",
  initialLabel,
  minChars = 2,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Hit[]>([]);
  const [hi, setHi] = useState(-1);
  const [display, setDisplay] = useState(initialLabel ?? value ?? "");

  // Si cambia el value externamente, refresca el display
  useEffect(() => {
    if (!value) {
      setDisplay("");
      return;
    }
    if (initialLabel) setDisplay(initialLabel);
    else if (!display.startsWith(value)) setDisplay(value);
  }, [value, initialLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < minChars) { setResults([]); setHi(-1); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.buscarCatalogoSAT(q, tipo) as { results: Hit[] };
        setResults(r.results || []);
        setHi(r.results.length > 0 ? 0 : -1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, tipo, open, minChars]);

  const pick = (hit: Hit) => {
    // El text viene como "CLAVE - Descripción". Separamos.
    const sep = hit.text.indexOf(" - ");
    const desc = sep > -1 ? hit.text.slice(sep + 3) : hit.text;
    onChange(hit.id, desc);
    setDisplay(`${hit.id} — ${desc}`);
    setOpen(false);
    setQuery("");
    setResults([]);
    setHi(-1);
  };

  const clear = () => {
    onChange("", "");
    setDisplay("");
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && results[hi]) pick(results[hi]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger / display */}
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer flex items-center gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <Search size={13} className="text-slate-400 shrink-0" />
        {display ? (
          <span className="flex-1 truncate font-mono text-[12px]">{display}</span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {display && (
          <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        )}
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[300] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {loading && <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder={`Escribe al menos ${minChars} caracteres…`}
                className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {query.trim().length < minChars ? (
              <li className="px-3 py-3 text-[11px] text-slate-400 italic">
                Escribe al menos {minChars} caracteres para buscar en el catálogo SAT…
              </li>
            ) : loading && results.length === 0 ? (
              <li className="px-3 py-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Buscando…
              </li>
            ) : results.length === 0 ? (
              <li className="px-3 py-3 text-[11px] text-slate-400 italic">Sin resultados para "{query.trim()}".</li>
            ) : results.map((hit, i) => {
              const sep = hit.text.indexOf(" - ");
              const desc = sep > -1 ? hit.text.slice(sep + 3) : hit.text;
              return (
                <li key={hit.id + i}
                  onClick={() => pick(hit)}
                  onMouseEnter={() => setHi(i)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${hi === i ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] font-bold text-blue-600 dark:text-blue-400 shrink-0">{hit.id}</span>
                    <span className="text-[12px] text-slate-700 dark:text-slate-200 truncate">{desc}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            ↑↓ navegar · Enter seleccionar · Esc cerrar
          </div>
        </div>
      )}
    </div>
  );
}
