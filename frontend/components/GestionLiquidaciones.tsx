"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight,
  Plus, Search, ExternalLink, X, Filter, ChevronDown,
  Clock, CheckCircle, XCircle, BadgeCheck, Ban,
  Calendar, MapPin, FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import Combobox, { type ComboOption } from "@/components/Combobox";

interface Liquidacion {
  id: number;
  folio: string;
  operador: string;
  operador_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  estado_display: string;
  fecha_pago: string;
  total_viajes: string;
  total_extras: string;
  total_descuentos: string;
  total_pagar: string;
  conceptos_count: number;
  creado_en: string;
}

const ESTADOS = [
  { v: "",          l: "Todas",     color: "#334155" },
  { v: "BORRADOR",  l: "Borrador",  color: "#64748b" },
  { v: "APROBADA",  l: "Aprobada",  color: "#1d4ed8" },
  { v: "PAGADA",    l: "Pagada",    color: "#047857" },
  { v: "CANCELADA", l: "Cancelada", color: "#991b1b" },
];

const ESTADO_CHIP: Record<string, string> = {
  BORRADOR:  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200",
  APROBADA:  "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/70",
  PAGADA:    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/70",
  CANCELADA: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/70",
};

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function useMemoOpts<T>(items: T[], mapper: (i: T) => ComboOption): ComboOption[] {
  return useMemo(() => items.map(mapper), [items, mapper]);
}

export default function GestionLiquidaciones() {
  const [data, setData] = useState<{ results: Liquidacion[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [q, setQ] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [lugares, setLugares] = useState<Array<{ id: number; nombre: string; id_ubicacion?: string }>>([]);
  const PAGE_SIZE = 20;

  // Cargar catálogo de lugares para los filtros
  useEffect(() => {
    (api as any).getCatLugares?.()
      .then((r: any) => setLugares(Array.isArray(r) ? r : (r.results ?? [])))
      .catch(() => setLugares([]));
  }, []);

  // Opciones para los comboboxes
  const estadoOpts = useMemo<ComboOption[]>(() =>
    ESTADOS.filter(e => e.v !== "").map(e => ({ id: e.v, label: e.l })), []);
  const lugarOpts = useMemo<ComboOption[]>(() =>
    lugares.map(l => ({
      id: String(l.id),
      label: l.nombre,
      prefix: l.id_ubicacion || undefined,
    })), [lugares]);

  // Construye los parámetros activos del filtro (también se usan para el export)
  const buildParams = (): Record<string, string> => {
    const p: Record<string, string> = {};
    if (estadoFilter) p.estado = estadoFilter;
    if (q.trim()) p.search = q.trim();
    if (fechaDesde) p.fecha_desde = fechaDesde;
    if (fechaHasta) p.fecha_hasta = fechaHasta;
    if (origenId) p.origen_id = origenId;
    if (destinoId) p.destino_id = destinoId;
    return p;
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE), ...buildParams() };
      const res = await api.getLiquidaciones(p);
      setData(res as any);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las liquidaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, estadoFilter, fechaDesde, fechaHasta, origenId, destinoId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  const kpis = useMemo(() => {
    const all = data?.results ?? [];
    const totalMonto = all.reduce((s, l) => s + parseFloat(l.total_pagar || "0"), 0);
    const counts = { BORRADOR: 0, APROBADA: 0, PAGADA: 0, CANCELADA: 0 };
    all.forEach(l => {
      const k = l.estado as keyof typeof counts;
      if (k in counts) counts[k]++;
    });
    return { totalMonto, ...counts };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-transparent bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 p-6 shadow-sm dark:shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_60%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-emerald-200 dark:ring-emerald-500/25">
                Operadores · Pagos
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-white/10 flex items-center justify-center ring-1 ring-emerald-200 dark:ring-white/10">
                  <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                Liquidaciones de Operador
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                {loading ? "Cargando…" : `${data?.count ?? 0} liquidacion${(data?.count ?? 0) !== 1 ? "es" : ""} en total`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <a href={api.getLiquidacionesExportExcelUrl(buildParams())}
                target="_blank" rel="noopener noreferrer"
                title="Exportar liquidaciones filtradas a Excel"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-700 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-sm transition-colors">
                <FileSpreadsheet size={13} /> Exportar Excel
              </a>
              <Link href="/liquidaciones/nuevo"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-colors">
                <Plus size={13} /> Nueva Liquidación
              </Link>
            </div>
          </div>

          {/* Mini KPIs */}
          <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
            <Kpi label="Total a pagar" value={MXN(kpis.totalMonto)} highlight />
            <Kpi label="Borrador"   value={String(kpis.BORRADOR)} />
            <Kpi label="Aprobadas"  value={String(kpis.APROBADA)} />
            <Kpi label="Pagadas"    value={String(kpis.PAGADA)} />
            <Kpi label="Canceladas" value={String(kpis.CANCELADA)} />
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Search size={11} /> Búsqueda
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (setPage(1), load())}
                placeholder="Folio, operador…"
                className="w-full pl-8 pr-20 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60" />
              <button onClick={() => { setPage(1); load(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-500">
                <Search size={10} /> Buscar
              </button>
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Filter size={11} /> Estado
            </label>
            <Combobox options={estadoOpts} value={estadoFilter}
              onChange={(id) => { setEstadoFilter(id); setPage(1); }}
              placeholder="Todas" emptyHint="Sin opciones" />
          </div>

          {/* Acciones */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 flex flex-col">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <RefreshCw size={11} /> Acciones
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => { setQ(""); setEstadoFilter(""); setFechaDesde(""); setFechaHasta(""); setOrigenId(""); setDestinoId(""); setPage(1); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X size={11} /> Limpiar
              </button>
              <button onClick={load}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Recargar
              </button>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Calendar size={11} /> Rango de fechas (periodo)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
                placeholder="Desde"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60" />
              <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
                placeholder="Hasta"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60" />
            </div>
          </div>

          {/* Origen */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} className="text-emerald-500" /> Origen
            </label>
            <Combobox options={lugarOpts} value={origenId}
              onChange={(id) => { setOrigenId(id); setPage(1); }}
              placeholder="Todos los orígenes" emptyHint="Sin lugares" />
          </div>

          {/* Destino */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} className="text-rose-500" /> Destino
            </label>
            <Combobox options={lugarOpts} value={destinoId}
              onChange={(id) => { setDestinoId(id); setPage(1); }}
              placeholder="Todos los destinos" emptyHint="Sin lugares" />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando…</div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertTriangle size={26} className="mx-auto text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">{error}</p>
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="p-16 text-center">
              <Wallet size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Sin liquidaciones</p>
              <p className="text-xs text-slate-400">Genera la primera liquidación a partir de un operador y rango de fechas.</p>
              <Link href="/liquidaciones/nuevo"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">
                <Plus size={13} /> Nueva Liquidación
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["Folio", "Operador", "Periodo", "Viajes", "Total", "Estado", "Pago", ""].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {data.results.map(l => (
                    <tr key={l.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors group">
                      <td className="px-3 py-3">
                        <Link href={`/liquidaciones/${l.id}`} className="font-mono font-black text-emerald-700 dark:text-emerald-400 hover:underline">
                          {l.folio}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800 dark:text-white">{l.operador}</div>
                        <div className="text-[10.5px] text-slate-500">{l.conceptos_count} concepto{l.conceptos_count !== 1 ? "s" : ""}</div>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] text-slate-700 dark:text-slate-300">
                        <div>{fmtDate(l.fecha_inicio)}</div>
                        <div className="text-slate-400">a {fmtDate(l.fecha_fin)}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums">{MXN(parseFloat(l.total_viajes || "0"))}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-baseline gap-0.5 font-mono text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {MXN(parseFloat(l.total_pagar || "0"))}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold ${ESTADO_CHIP[l.estado] ?? ESTADO_CHIP.BORRADOR}`}>
                          {l.estado_display}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">{l.fecha_pago ? fmtDate(l.fecha_pago) : "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/liquidaciones/${l.id}`} title="Ver detalle"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-600 transition-all opacity-70 group-hover:opacity-100">
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm px-4 py-3">
            <span className="text-xs font-bold text-slate-500">
              Página <span className="text-slate-900 dark:text-white">{page}</span> de <span className="text-slate-900 dark:text-white">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                <ChevronLeft size={13} /> Anterior
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`relative rounded-xl px-3 py-2.5 ${highlight
      ? "bg-emerald-600 dark:bg-emerald-600 text-white border border-emerald-700 dark:border-emerald-500"
      : "bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 backdrop-blur-sm"}`}>
      <div className={`text-[9.5px] font-extrabold uppercase tracking-[0.2em] ${highlight ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className={`text-lg font-black mt-0.5 tabular-nums ${highlight ? "text-white" : "text-slate-800 dark:text-white"}`}>{value}</div>
    </div>
  );
}
