"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ExternalLink, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Search, Clock, CheckCircle,
  XCircle, Plane, Ban, Plus, TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Vacacion {
  id: string;
  empleado: string;
  empleado_id?: string;
  departamento?: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: string;
  tipo: string;
  periodo_correspondiente?: string;
  anio?: number | null;
  fecha_creacion?: string;
  fecha_solicitud?: string;
  balance_anio?: number;
  balance_asignados?: number;
  balance_tomados?: number;
  balance_pendientes?: number;
  balance_restantes?: number;
}

const ESTADOS = [
  { v: "",           l: "Todos",      icon: CalendarDays, accent: "#334155" },
  { v: "pendiente",  l: "Pendiente",  icon: Clock,        accent: "#b45309" },
  { v: "aprobado",   l: "Aprobada",   icon: CheckCircle,  accent: "#047857" },
  { v: "rechazado",  l: "Rechazada",  icon: XCircle,      accent: "#991b1b" },
  { v: "gozado",     l: "Gozada",     icon: Plane,        accent: "#1e40af" },
  { v: "cancelado",  l: "Cancelada",  icon: Ban,          accent: "#475569" },
];

const ESTADO_STYLES: Record<string, { chip: string; dot: string; border: string }> = {
  pendiente: {
    chip:   "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 ring-1 ring-amber-200/70 dark:ring-amber-900/40",
    dot:    "bg-amber-500",
    border: "border-l-amber-500",
  },
  aprobado: {
    chip:   "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-200/70 dark:ring-emerald-900/40",
    dot:    "bg-emerald-600",
    border: "border-l-emerald-600",
  },
  rechazado: {
    chip:   "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-1 ring-rose-200/70 dark:ring-rose-900/40",
    dot:    "bg-rose-600",
    border: "border-l-rose-600",
  },
  gozado: {
    chip:   "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 ring-1 ring-sky-200/70 dark:ring-sky-900/40",
    dot:    "bg-sky-600",
    border: "border-l-sky-600",
  },
  cancelado: {
    chip:   "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700",
    dot:    "bg-slate-400",
    border: "border-l-slate-400",
  },
};

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso);
  if (isNaN(+then)) return "";
  const mins = Math.floor((Date.now() - +then) / 60000);
  if (mins < 1) return "hace un instante";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h${mins % 60 ? `, ${mins % 60} min` : ""}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months !== 1 ? "es" : ""}`;
}

export default function GestionVacaciones() {
  const [data, setData] = useState<{ results: Vacacion[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [q, setQ] = useState("");
  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
      if (estadoFilter) p.estado = estadoFilter;
      const res = await api.getVacacionesRH(p);
      setData(res as unknown as { results: Vacacion[]; count: number });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, estadoFilter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  const filtrados = useMemo(() => {
    if (!data) return [] as Vacacion[];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.results;
    return data.results.filter(v =>
      (v.empleado || "").toLowerCase().includes(needle) ||
      (v.departamento || "").toLowerCase().includes(needle) ||
      (v.periodo_correspondiente || "").toLowerCase().includes(needle)
    );
  }, [data, q]);

  const kpis = useMemo(() => {
    const counts = { pendiente: 0, aprobado: 0, gozado: 0, rechazado: 0, cancelado: 0 };
    (data?.results ?? []).forEach(v => {
      const k = v.estado as keyof typeof counts;
      if (k in counts) counts[k]++;
    });
    return counts;
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-6 space-y-5">

        {/* ── Hero elegante (slate oscuro + acento esmeralda) ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-6 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.08),transparent_50%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-emerald-500/25">
                Recursos Humanos
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                  <CalendarDays size={20} className="text-emerald-400" />
                </span>
                Gestión de Vacaciones
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 font-medium">
                {loading ? "Cargando registros…" : `${data?.count ?? 0} solicitud${(data?.count ?? 0) !== 1 ? "es" : ""} registradas`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <Link href="/rh/vacaciones/nueva"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/30 transition-colors">
                <Plus size={13} /> Nueva Solicitud
              </Link>
            </div>
          </div>

          {/* KPIs */}
          <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
            <Kpi label="Pendientes"  value={kpis.pendiente} accent="bg-amber-400" />
            <Kpi label="Aprobadas"   value={kpis.aprobado}  accent="bg-emerald-400" />
            <Kpi label="Gozadas"     value={kpis.gozado}    accent="bg-sky-400" />
            <Kpi label="Rechazadas"  value={kpis.rechazado} accent="bg-rose-400" />
            <Kpi label="Canceladas"  value={kpis.cancelado} accent="bg-slate-400" />
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar empleado, depto, periodo…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 focus:bg-white dark:focus:bg-slate-900" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ESTADOS.map(e => {
              const Icon = e.icon;
              const on = estadoFilter === e.v;
              return (
                <button key={e.v} onClick={() => { setEstadoFilter(e.v); setPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    on
                      ? "text-white border border-transparent shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  style={on ? { background: e.accent } : {}}>
                  <Icon size={11} /> {e.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Lista ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Cargando registros…
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                <AlertTriangle size={26} className="text-rose-500" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No se pudieron cargar las vacaciones.</p>
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">/rh/api/vacaciones/</code>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CalendarDays size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Sin resultados</p>
              <p className="text-xs text-slate-400">Ajusta los filtros o registra una nueva solicitud.</p>
              <Link href="/rh/vacaciones/nueva"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
                <Plus size={13} /> Nueva Solicitud
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["#", "Empleado", "Periodo", "Fechas", "Días", "Restantes", "Estado", "Registrado", ""].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filtrados.map((v, i) => {
                    const est = ESTADO_STYLES[v.estado] ?? ESTADO_STYLES.cancelado;
                    const restantes = v.balance_restantes ?? 0;
                    const asignados = v.balance_asignados ?? 0;
                    const pct = asignados > 0 ? Math.max(0, Math.min(100, (restantes / asignados) * 100)) : 0;
                    const restTone = restantes === 0
                      ? "text-rose-600 dark:text-rose-400"
                      : restantes < 5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-700 dark:text-emerald-400";
                    const barTone = restantes === 0
                      ? "bg-rose-500"
                      : restantes < 5
                        ? "bg-amber-500"
                        : "bg-emerald-600";
                    return (
                      <tr key={v.id} className={`group border-l-2 border-transparent hover:border-l-2 hover:${est.border.replace("border-l-", "border-l-")} hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`}>
                        <td className="px-3 py-3 text-[11px] font-bold text-slate-300 dark:text-slate-600 tabular-nums">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">
                              {initials(v.empleado)}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${est.dot} ring-2 ring-white dark:ring-slate-900`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{v.empleado}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                {v.departamento || v.tipo || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {v.periodo_correspondiente || "—"}
                          </span>
                          <div className="text-[10.5px] text-slate-400 tabular-nums mt-0.5">{v.anio ?? "—"}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          <div className="flex items-baseline gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">INI</span>
                            <span className="tabular-nums">{fmtDate(v.fecha_inicio)}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">FIN</span>
                            <span className="tabular-nums">{fmtDate(v.fecha_fin)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-baseline gap-0.5">
                            <span className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{v.dias}</span>
                            <span className="text-[9px] font-bold text-slate-400 ml-0.5 uppercase tracking-wider">días</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 min-w-[140px]">
                          {asignados > 0 ? (
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-black tabular-nums ${restTone}`}>{restantes}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">/ {asignados}</span>
                                {restantes === 0 && <TrendingDown size={11} className="text-rose-500 ml-0.5" />}
                              </div>
                              <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full ${barTone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {v.balance_tomados ?? 0} tomados · {v.balance_pendientes ?? 0} en trámite
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sin configurar</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold capitalize ${est.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} /> {v.estado}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[11px]">
                          <div className="text-slate-600 dark:text-slate-300 font-semibold tabular-nums">{fmtDate(v.fecha_creacion || v.fecha_solicitud || "")}</div>
                          <div className="text-slate-400">{timeAgo(v.fecha_creacion)}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/rh/vacaciones/${v.id}`} title="Ver detalle"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all opacity-70 group-hover:opacity-100">
                            <ExternalLink size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm px-4 py-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Página <span className="text-slate-900 dark:text-white">{page}</span> de <span className="text-slate-900 dark:text-white">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={13} /> Anterior
              </button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="relative rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-2.5 overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent}`} />
      <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="text-2xl font-black text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}
