"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, Box, Calendar, DollarSign, FileSpreadsheet,
  Loader2, ScrollText, TrendingUp, Truck,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

type ReporteId =
  | "existencias" | "valorizacion" | "kardex" | "movimientos"
  | "rotacion" | "caducidades";

interface ReporteDef {
  id: ReporteId;
  titulo: string;
  descripcion: string;
  icono: any;
  color: string;
  fetcher: () => Promise<any>;
}

const REPORTES: ReporteDef[] = [
  {
    id: "existencias", titulo: "Existencias actuales",
    descripcion: "Stock disponible, reservado y en transito por producto y almacen.",
    icono: Box, color: "#10B981",
    fetcher: () => api.getReporteExistencias({ page_size: "200" }),
  },
  {
    id: "valorizacion", titulo: "Valorizacion de inventario",
    descripcion: "Valor monetario total del inventario por almacen al costo promedio.",
    icono: DollarSign, color: "#22C55E",
    fetcher: () => api.getReporteValorizacion({}),
  },
  {
    id: "kardex", titulo: "Kardex (historico de movimientos)",
    descripcion: "Historial completo con saldo y costo running por producto.",
    icono: ScrollText, color: "#3B82F6",
    fetcher: () => api.getReporteKardex({ page_size: "200" }),
  },
  {
    id: "movimientos", titulo: "Movimientos por periodo",
    descripcion: "Entradas, salidas, transferencias y ajustes filtrables por fechas.",
    icono: TrendingUp, color: "#8B5CF6",
    fetcher: () => api.getReporteMovimientos({ page_size: "200" }),
  },
  {
    id: "rotacion", titulo: "Rotacion y productos lentos",
    descripcion: "Velocidad de movimiento por producto. Identifica stock muerto.",
    icono: BarChart3, color: "#F59E0B",
    fetcher: () => api.getReporteRotacion({}),
  },
  {
    id: "caducidades", titulo: "Caducidades proximas",
    descripcion: "Lotes vencidos o por vencer en los proximos 30/60/90 dias.",
    icono: AlertTriangle, color: "#EF4444",
    fetcher: () => api.getReporteCaducidades({}),
  },
];

export default function ReportesAlmacenPage() {
  const { theme, isDarkMode } = useTheme();
  const [active, setActive] = useState<ReporteId | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ejecutar = useCallback(async (rep: ReporteDef) => {
    setActive(rep.id);
    setLoading(true); setErr(null); setData(null);
    try {
      const r = await rep.fetcher();
      setData(r);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EAB308)" }}>
          <ScrollText className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Reportes de Almacen</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Existencias, valorizacion, kardex, rotacion y caducidades.</p>
        </div>
      </div>

      {/* Cards de reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTES.map((rep) => {
          const Icon = rep.icono;
          const isActive = active === rep.id;
          return (
            <button key={rep.id} onClick={() => ejecutar(rep)}
              className={`text-left rounded-2xl border p-5 transition-all hover:scale-[1.01] ${
                isActive
                  ? "shadow-xl border-amber-500/50"
                  : isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06] hover:border-white/[0.12]"
                              : "bg-white border-slate-200/70 hover:border-slate-300"
              }`}
              style={isActive ? { background: "linear-gradient(135deg,rgba(245,158,11,0.06),rgba(234,179,8,0.04))" } : {}}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: rep.color + "20" }}>
                  <Icon className="w-4 h-4" style={{ color: rep.color }} />
                </div>
                <h3 className={`text-sm font-black ${theme.textPrimary}`}>{rep.titulo}</h3>
              </div>
              <p className={`text-xs ${theme.textSecondary}`}>{rep.descripcion}</p>
            </button>
          );
        })}
      </div>

      {/* Resultado */}
      {active && (
        <div className={`rounded-2xl border p-5 ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>
              Resultado · {REPORTES.find((r) => r.id === active)?.titulo}
            </h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
          </div>
          {err && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              {err}
            </div>
          )}
          {!loading && !err && data && (
            <ResultViewer data={data} theme={theme} isDarkMode={isDarkMode} />
          )}
          {!loading && !err && !data && (
            <div className={`text-center py-12 ${theme.textTertiary}`}>Sin datos para este reporte aun.</div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultViewer({ data, theme, isDarkMode }: { data: any; theme: any; isDarkMode: boolean }) {
  // Soporta varias formas de respuesta: array directo, {results: []}, objeto.
  const rows: any[] = Array.isArray(data) ? data
    : Array.isArray(data?.results) ? data.results
    : Array.isArray(data?.data) ? data.data : [];

  if (rows.length === 0) {
    // Si es un objeto plano, lo muestro como key/value.
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const entries = Object.entries(data).filter(([k]) => !["count", "next", "previous"].includes(k));
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {entries.map(([k, v]) => (
            <div key={k} className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/[0.02] border-white/[0.05]" : "bg-slate-50/50 border-slate-200/50"}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{k}</div>
              <div className={`text-sm font-bold mt-1 ${theme.textPrimary} break-all`}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <div className={`text-center py-12 ${theme.textTertiary} text-sm`}>Sin filas.</div>;
  }

  const cols = Object.keys(rows[0]).slice(0, 8);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
          <tr className={theme.textSecondary}>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((r, i) => (
            <tr key={i} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
              {cols.map((c) => (
                <td key={c} className={`px-3 py-2 ${theme.textPrimary}`}>
                  {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 200 && (
        <div className={`text-[11px] text-center mt-2 ${theme.textTertiary}`}>Mostrando 200 de {rows.length} filas.</div>
      )}
    </div>
  );
}
