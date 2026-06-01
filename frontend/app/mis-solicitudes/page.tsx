"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote, CheckCircle, Clock, FileText, Plus, RefreshCw, Sun, X, XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Solicitud {
  id: number;
  tipo: number;
  tipo_nombre: string;
  tipo_categoria: "PERMISO" | "VACACION" | "PRESTAMO";
  tipo_color: string;
  empleado_nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  monto: string | null;
  cuotas: number | null;
  motivo: string;
  estado: "PEND" | "APROB" | "RECH" | "CANC";
  fecha_solicitud: string;
  documento: string | null;
  comentarios_aprobacion: string;
  aprobado_por_username: string;
}

const CATEGORIA_ICON: Record<string, any> = {
  PERMISO: FileText,
  VACACION: Sun,
  PRESTAMO: Banknote,
};

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PEND: { label: "Pendiente", color: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-200/70", icon: Clock },
  APROB: { label: "Aprobada", color: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200/70", icon: CheckCircle },
  RECH: { label: "Rechazada", color: "#EF4444", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-200/70", icon: XCircle },
  CANC: { label: "Cancelada", color: "#94A3B8", bg: "bg-slate-100 dark:bg-slate-800 text-slate-500 ring-slate-200", icon: X },
};

const FILTROS = [
  { v: "", l: "Todas" },
  { v: "PEND", l: "Pendientes" },
  { v: "APROB", l: "Aprobadas" },
  { v: "RECH", l: "Rechazadas" },
  { v: "CANC", l: "Canceladas" },
];

function fmt(d: string | null) {
  if (!d) return "—";
  const t = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (isNaN(+t)) return d;
  return t.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MisSolicitudesPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const [data, setData] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getMisSolicitudes();
      setData(r.results || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filtroEstado ? data.filter((s) => s.estado === filtroEstado) : data,
    [data, filtroEstado]
  );

  const counts = useMemo(() => ({
    total: data.length,
    pend: data.filter((s) => s.estado === "PEND").length,
    aprob: data.filter((s) => s.estado === "APROB").length,
    rech: data.filter((s) => s.estado === "RECH").length,
  }), [data]);

  const cancelar = async (id: number) => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    try {
      await api.cancelarSolicitudRH(id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 dark:border-transparent bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900 p-5 sm:p-6 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_60%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-indigo-200 dark:ring-indigo-500/25">
                Centro Operativo · Mis Solicitudes
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-white/10 flex items-center justify-center ring-1 ring-indigo-200 dark:ring-white/10 shrink-0">
                  <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                </span>
                Mis Solicitudes
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                Permisos, vacaciones y prestamos · {counts.total} solicitud{counts.total !== 1 ? "es" : ""} ·
                <span className="text-amber-600 dark:text-amber-400 font-bold"> {counts.pend} pendiente{counts.pend !== 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <Link href="/mis-solicitudes/nueva"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm"
                style={{ background: "linear-gradient(135deg,#6366F1,#3B82F6)" }}>
                <Plus size={13} /> Nueva solicitud
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs estado */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {FILTROS.map((f) => {
            const sel = filtroEstado === f.v;
            return (
              <button key={f.v} onClick={() => setFiltroEstado(f.v)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                  sel
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}>
                {f.l}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <FileText size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Sin solicitudes</p>
              <p className="text-xs text-slate-400 mb-4">
                {filtroEstado ? "No hay solicitudes en este estado." : "Crea tu primera solicitud."}
              </p>
              {!filtroEstado && (
                <Link href="/mis-solicitudes/nueva"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg,#6366F1,#3B82F6)" }}>
                  <Plus size={13} /> Crear solicitud
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => {
                const Icon = CATEGORIA_ICON[s.tipo_categoria] || FileText;
                const estado = ESTADO_INFO[s.estado] || ESTADO_INFO.PEND;
                const EstadoIcon = estado.icon;
                return (
                  <div key={s.id} className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: (s.tipo_color || "#6366F1") + "22", color: s.tipo_color || "#6366F1" }}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-black text-sm sm:text-base text-slate-800 dark:text-white">{s.tipo_nombre}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: (s.tipo_color || "#6366F1") + "22", color: s.tipo_color || "#6366F1" }}>
                            {s.tipo_categoria}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${estado.bg}`}>
                            <EstadoIcon className="w-3 h-3" /> {estado.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {s.empleado_nombre} · {fmt(s.fecha_inicio)}
                          {s.fecha_fin && ` → ${fmt(s.fecha_fin)}`}
                          {s.dias > 0 && ` · ${s.dias} dia${s.dias !== 1 ? "s" : ""}`}
                          {s.monto && ` · $${Number(s.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                        </p>
                        {s.motivo && (
                          <p className="text-[11px] mt-1.5 text-slate-600 dark:text-slate-400 line-clamp-2">
                            <span className="font-bold">Motivo:</span> {s.motivo}
                          </p>
                        )}
                        {s.comentarios_aprobacion && s.estado !== "PEND" && (
                          <p className="text-[11px] mt-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                            <span className="font-bold">{s.aprobado_por_username || "Staff"}:</span> {s.comentarios_aprobacion}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <p className="text-[10px] font-mono text-slate-400">{fmt(s.fecha_solicitud)}</p>
                        {s.estado === "PEND" && (
                          <button onClick={() => cancelar(s.id)}
                            className="text-[10px] font-bold text-rose-500 hover:underline">
                            Cancelar
                          </button>
                        )}
                        {s.documento && (
                          <a href={s.documento} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-500 hover:underline">
                            Ver documento
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
