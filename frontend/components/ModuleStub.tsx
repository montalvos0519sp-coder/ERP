"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, type LucideIcon } from "lucide-react";

import { useTheme } from "@/lib/ThemeContext";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  gradient: string;
  iconBgColor: string;
  loader: () => Promise<any>;
  columns: { label: string; key: string; format?: (v: any, row?: any) => React.ReactNode; align?: "right" | "left" }[];
  emptyMessage?: string;
}

/**
 * Componente reutilizable que renderiza un modulo del ERP con:
 *  - Hero card con gradiente y KPI total.
 *  - Toolbar de busqueda + refrescar + nuevo.
 *  - Tabla scrolleable con columnas dinamicas.
 *  - Estado vacio personalizado.
 */
export default function ModuleStub({
  icon: Icon, title, subtitle, gradient, iconBgColor,
  loader, columns, emptyMessage = "Sin registros aun. Crea el primero para empezar.",
}: Props) {
  const { isDarkMode: isDark, theme } = useTheme();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    loader()
      .then((r) => setRows(r.results || r || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = !search
    ? rows
    : rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl border overflow-hidden"
        style={{ background: gradient, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
        <div className="p-6 sm:p-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: iconBgColor }}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>{title}</h1>
            <p className={`text-sm ${theme.textSecondary}`}>{subtitle}</p>
          </div>
          <div className={`px-4 py-2 rounded-2xl border text-center ${theme.divider}`}
            style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)" }}>
            <p className={`text-2xl font-black ${theme.textPrimary}`}>{rows.length}</p>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>Registros</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className={`flex-1 max-w-md ${theme.inputBase} border rounded-xl px-4 py-2 text-sm`}
        />
        <button onClick={load} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${theme.surfaceElevated} hover:scale-105 transition-all`}>
          <RefreshCw className="w-4 h-4" /> Refrescar
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg opacity-50 cursor-not-allowed"
          style={{ background: iconBgColor }}>
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className={`rounded-3xl border ${theme.divider}`}
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
        {loading ? (
          <div className={`p-16 text-center ${theme.textTertiary}`}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Icon className={`w-12 h-12 mx-auto mb-3 ${theme.textTertiary}`} />
            <p className={`text-sm font-bold ${theme.textPrimary}`}>Sin registros</p>
            <p className={`text-xs mt-1 ${theme.textTertiary}`}>{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`text-left text-[10px] uppercase tracking-[0.2em] font-black ${theme.textTertiary} border-b ${theme.divider}`}>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`px-6 py-3 ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any, i: number) => (
                  <tr key={i} className={`border-b ${theme.divider}`}>
                    {columns.map((c) => {
                      const val = c.key.split(".").reduce((o: any, k: string) => (o ? o[k] : undefined), r);
                      return (
                        <td key={c.key} className={`px-6 py-3 ${c.align === "right" ? "text-right font-mono" : ""} ${theme.textPrimary}`}>
                          {c.format ? c.format(val, r) : (val ?? "-")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
