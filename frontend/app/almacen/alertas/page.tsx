"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Alerta {
  id: number;
  tipo?: string;
  tipo_display?: string;
  producto?: number;
  producto_codigo?: string;
  producto_nombre?: string;
  almacen?: number;
  almacen_nombre?: string;
  fecha?: string;
  creado?: string;
  dias_restantes?: number | null;
  atendida?: boolean;
  comentario?: string;
}

const PAGE_SIZE = 25;
const TIPO_COLOR: Record<string, string> = {
  STOCK_MINIMO: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  STOCK_MAXIMO: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  CADUCIDAD: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  SIN_MOVIMIENTO: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export default function AlertasPage() {
  const { theme, isDarkMode } = useTheme();

  const [items, setItems] = useState<Alerta[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        atendida: "false",
        page: String(page),
        page_size: String(PAGE_SIZE),
        ordering: "-creado",
      };
      if (filtroTipo) params.tipo = filtroTipo;
      const r = await api.getAlertasAlmacen(params);
      setItems(r.results || []);
      setCount(r.count || (r.results || []).length);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [page, filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const atender = async (id: number) => {
    if (!confirm("Marcar esta alerta como atendida?")) return;
    try {
      await api.atenderAlertaAlmacen(id);
      cargar();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const recalcular = async () => {
    setGenerando(true);
    try {
      const r = await api.generarAlertasAlmacen();
      const total = r?.creadas ?? r?.total ?? "actualizadas";
      alert(`Alertas recalculadas: ${total}`);
      cargar();
    } catch (e) {
      alert((e as Error).message);
    } finally { setGenerando(false); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Alertas activas</h1>
            <p className={`text-sm ${theme.textSecondary}`}>{count} alertas pendientes de atender.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select value={filtroTipo} onChange={(e) => { setPage(1); setFiltroTipo(e.target.value); }}
            className={`px-3 py-2 rounded-lg text-sm border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
            <option value="">Todos los tipos</option>
            <option value="STOCK_MINIMO">Stock minimo</option>
            <option value="STOCK_MAXIMO">Stock maximo</option>
            <option value="CADUCIDAD">Caducidad</option>
            <option value="SIN_MOVIMIENTO">Sin movimiento</option>
          </select>
          <button onClick={recalcular} disabled={generando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
            <RefreshCw className={`w-4 h-4 ${generando ? "animate-spin" : ""}`} />
            {generando ? "Recalculando…" : "Recalcular alertas"}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Tipo</Th><Th>Producto</Th><Th>Almacen</Th>
                <Th>Fecha</Th><Th align="right">Dias restantes</Th>
                <Th align="right">Accion</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-12 text-center ${theme.textTertiary}`}>
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Sin alertas activas. Todo en orden.
                  </td>
                </tr>
              ) : items.map((a) => (
                <tr key={a.id} className={`border-t ${isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`}>
                  <Td>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${TIPO_COLOR[a.tipo || ""] || TIPO_COLOR.SIN_MOVIMIENTO}`}>
                      {a.tipo_display || a.tipo || "Alerta"}
                    </span>
                  </Td>
                  <Td>
                    <div className={`text-sm font-bold ${theme.textPrimary}`}>{a.producto_nombre || "—"}</div>
                    {a.producto_codigo && <div className={`text-xs font-mono ${theme.textTertiary}`}>{a.producto_codigo}</div>}
                  </Td>
                  <Td><span className={`text-sm ${theme.textSecondary}`}>{a.almacen_nombre || "—"}</span></Td>
                  <Td><span className="text-xs">{a.fecha || a.creado ? new Date(a.fecha || a.creado || "").toLocaleDateString() : "—"}</span></Td>
                  <Td align="right">
                    {a.dias_restantes !== null && a.dias_restantes !== undefined ? (
                      <span className={`font-bold ${Number(a.dias_restantes) < 7 ? "text-rose-400" : Number(a.dias_restantes) < 30 ? "text-amber-400" : theme.textPrimary}`}>
                        {a.dias_restantes}
                      </span>
                    ) : <span className={theme.textTertiary}>—</span>}
                  </Td>
                  <Td align="right">
                    <button onClick={() => atender(a.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25">
                      <Check className="w-3.5 h-3.5" /> Marcar atendida
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {count > PAGE_SIZE && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
            <div className={`text-xs ${theme.textTertiary}`}>Pagina {page} de {totalPages} · {count} alertas</div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
