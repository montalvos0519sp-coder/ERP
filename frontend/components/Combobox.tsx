"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export interface ComboOption {
  id: string;
  label: string;       // texto principal
  sublabel?: string;   // línea secundaria opcional
  prefix?: string;     // chip mono al principio (ej. "OR000001")
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyHint?: string;
  className?: string;
  error?: boolean;
}

export default function Combobox({
  options, value, onChange, placeholder = "Buscar o seleccionar…",
  emptyHint = "Sin resultados", className = "", error = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(-1);

  const selected = useMemo(() => options.find(o => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      (o.label || "").toLowerCase().includes(q) ||
      (o.sublabel || "").toLowerCase().includes(q) ||
      (o.prefix || "").toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setHi(filtered.findIndex(o => o.id === value));
    } else {
      setQuery("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && filtered[hi]) pick(filtered[hi].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const triggerCls = `w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer flex items-center gap-2 transition-colors ${
    error
      ? "border-red-300 dark:border-red-700 ring-2 ring-red-200 dark:ring-red-900/40"
      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
  }`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div onClick={() => setOpen(o => !o)} className={triggerCls}>
        <Search size={13} className="text-slate-400 shrink-0" />
        {selected ? (
          <span className="flex-1 truncate flex items-center gap-1.5">
            {selected.prefix && (
              <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {selected.prefix}
              </span>
            )}
            <span className="truncate">{selected.label}</span>
            {selected.sublabel && <span className="text-[11px] text-slate-400 truncate">· {selected.sublabel}</span>}
          </span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {selected && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
            <X size={12} />
          </button>
        )}
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[200] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Buscar…"
                className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-[11.5px] text-slate-400 italic">{emptyHint}</li>
            ) : filtered.map((o, i) => {
              const isSelected = o.id === value;
              return (
                <li key={o.id}
                  onClick={() => pick(o.id)}
                  onMouseEnter={() => setHi(i)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                    hi === i ? "bg-blue-50 dark:bg-blue-950/40" : ""
                  } ${isSelected ? "bg-blue-100/60 dark:bg-blue-950/30" : ""}`}>
                  {o.prefix && (
                    <span className="font-mono text-[10.5px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                      {o.prefix}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{o.label}</div>
                    {o.sublabel && <div className="text-[10.5px] text-slate-500 truncate">{o.sublabel}</div>}
                  </div>
                  {isSelected && <Check size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
