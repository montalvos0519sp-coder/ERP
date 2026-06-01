"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck, ExternalLink, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight,
  Plus, Search, MapPin, Clock, X, ChevronDown, Filter, FileSpreadsheet, Calendar,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import Combobox, { type ComboOption } from "@/components/Combobox";

interface LugarCat { id: number; nombre: string; id_ubicacion?: string; tipo?: string; municipio?: string; estado?: string; }

interface Viaje {
  id: number;
  numero_viaje: number;
  id_viaje: string;
  folio_carta?: string;
  folio_carga: string;
  fecha_viaje: string;
  operador: string;
  unidad: string;
  origen: string;
  origen_codigo: string;
  destino: string;
  destino_codigo: string;
  estado: string;
  kms_totales: string;
  creado_en: string;
}

const ESTADOS = [
  { v: "",            l: "Todos",       color: "#334155" },
  { v: "PLANIFICADO", l: "Planificado", color: "#0284c7" },
  { v: "EN_RUTA",     l: "En Ruta",     color: "#d97706" },
  { v: "ENTREGADO",   l: "Entregado",   color: "#047857" },
  { v: "CANCELADO",   l: "Cancelado",   color: "#475569" },
];

const ESTADO_CHIP: Record<string, string> = {
  PLANIFICADO: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200/70",
  EN_RUTA:     "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/70",
  ENTREGADO:   "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/70",
  CANCELADO:   "bg-slate-100 dark:bg-slate-800 text-slate-500 ring-1 ring-slate-200",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GestionViajes() {
  const [data, setData] = useState<{ results: Viaje[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [q, setQ] = useState("");
  const [lugares, setLugares] = useState<LugarCat[]>([]);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const PAGE_SIZE = 20;

  useEffect(() => {
    (api.getCatLugares() as any)
      .then((r: any) => setLugares(r?.results ?? r ?? []))
      .catch(() => setLugares([]));
  }, []);

  const buildFilters = () => {
    const p: Record<string, string> = {};
    if (estadoFilter) p.estado = estadoFilter;
    if (q.trim()) p.search = q.trim();
    if (origenId) p.origen_id = origenId;
    if (destinoId) p.destino_id = destinoId;
    if (fechaDesde) p.fecha_desde = fechaDesde;
    if (fechaHasta) p.fecha_hasta = fechaHasta;
    return p;
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE), ...buildFilters() };
      const res = await api.getViajes(p);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la bitácora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, estadoFilter, origenId, destinoId, fechaDesde, fechaHasta]);

  const lugarOptions: ComboOption[] = useMemo(() =>
    lugares.map(l => ({
      id: String(l.id),
      label: l.nombre,
      sublabel: [l.municipio, l.estado].filter(Boolean).join(", ") || undefined,
      prefix: l.id_ubicacion || undefined,
    })),
  [lugares]);

  const origenOptions = useMemo(() =>
    lugarOptions.filter(o => {
      const tipo = lugares.find(l => String(l.id) === o.id)?.tipo;
      return !tipo || tipo === "ORIGEN" || tipo === "AMBOS";
    }),
  [lugarOptions, lugares]);

  const destinoOptions = useMemo(() =>
    lugarOptions.filter(o => {
      const tipo = lugares.find(l => String(l.id) === o.id)?.tipo;
      return !tipo || tipo === "DESTINO" || tipo === "AMBOS";
    }),
  [lugarOptions, lugares]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-transparent bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900 p-6 shadow-sm dark:shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_60%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-blue-200 dark:ring-blue-500/25">
                Logística · Cartas de Traslado
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-white/10 flex items-center justify-center ring-1 ring-blue-200 dark:ring-white/10">
                  <Truck size={20} className="text-blue-600 dark:text-blue-400" />
                </span>
                Bitácora de Viajes
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                {loading ? "Cargando…" : `${data?.count ?? 0} viaje${(data?.count ?? 0) !== 1 ? "s" : ""} registrados`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <a
                href={api.getViajesExportExcelUrl(buildFilters())}
                target="_blank" rel="noopener noreferrer"
                title="Exportar viajes (respeta los filtros) a Excel (.xlsx)"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-colors">
                <FileSpreadsheet size={13} /> Exportar Excel
              </a>
              <Link href="/viajes/nuevo"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors">
                <Plus size={13} /> Nuevo Viaje
              </Link>
            </div>
          </div>
        </div>

        {/* Filtros: combobox para origen/destino, rango de fechas y resto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda libre */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Search size={11} /> Búsqueda
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (setPage(1), load())}
                placeholder="ID viaje, folio, operador, unidad…"
                className="w-full pl-8 pr-20 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60" />
              <button onClick={() => { setPage(1); load(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500">
                <Search size={10} /> Buscar
              </button>
            </div>
          </div>

          {/* Filtro Estado */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Filter size={11} /> Estado
            </label>
            <div className="relative">
              <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
                className="w-full appearance-none px-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 cursor-pointer">
                {ESTADOS.map(e => (
                  <option key={e.v} value={e.v}>{e.l}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {estadoFilter && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{ background: ESTADOS.find(x => x.v === estadoFilter)?.color ?? "#334155" }} />
              )}
            </div>
          </div>

          {/* Acciones / Reset */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3 flex flex-col">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <RefreshCw size={11} /> Acciones
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => { setQ(""); setEstadoFilter(""); setOrigenId(""); setDestinoId(""); setFechaDesde(""); setFechaHasta(""); setPage(1); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <X size={11} /> Limpiar
              </button>
              <button onClick={load}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white transition-colors">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Recargar
              </button>
            </div>
          </div>

          {/* Origen */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} className="text-emerald-500" /> Origen
            </label>
            <Combobox options={origenOptions} value={origenId}
              onChange={v => { setOrigenId(v); setPage(1); }}
              placeholder="Todos los orígenes" emptyHint="Sin lugares" />
          </div>

          {/* Destino */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} className="text-rose-500" /> Destino
            </label>
            <Combobox options={destinoOptions} value={destinoId}
              onChange={v => { setDestinoId(v); setPage(1); }}
              placeholder="Todos los destinos" emptyHint="Sin lugares" />
          </div>

          {/* Fecha Desde */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Calendar size={11} /> Desde
            </label>
            <input type="date" value={fechaDesde}
              onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60" />
          </div>

          {/* Fecha Hasta */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Calendar size={11} /> Hasta
            </label>
            <input type="date" value={fechaHasta}
              onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60" />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando…</div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertTriangle size={26} className="mx-auto text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">No se pudo cargar la bitácora.</p>
              <p className="text-[11.5px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 inline-block px-3 py-1.5 rounded-lg mt-2">{error}</p>
              <p className="text-[11px] text-slate-400 mt-3 max-w-md mx-auto">
                Lo más probable: el servidor Django no recibió las migraciones nuevas. Corre <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">python manage.py migrate ternium</code> y reinicia el runserver.
              </p>
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="p-16 text-center">
              <Truck size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Sin viajes registrados</p>
              <p className="text-xs text-slate-400">Comienza creando el primer viaje.</p>
              <Link href="/viajes/nuevo"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800">
                <Plus size={13} /> Nuevo Viaje
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["#", "Folio del Viaje", "Fecha", "Operador / Unidad", "Origen → Destino", "Kms", "Estado", ""].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {data.results.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-3 py-3">
                        <span className="font-mono font-black text-[13px] text-slate-400 dark:text-slate-500 tabular-nums">#{v.numero_viaje}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/viajes/${v.id}`} className="inline-flex flex-col group">
                          <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400 group-hover:underline tabular-nums">{v.folio_carta || v.id_viaje}</span>
                          {v.folio_carga && <span className="text-[10.5px] text-slate-400 font-mono">F. Carga: {v.folio_carga}</span>}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-slate-700 dark:text-slate-300 tabular-nums">{fmtDate(v.fecha_viaje)}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800 dark:text-white">{v.operador}</div>
                        <div className="text-[11px] text-slate-500">{v.unidad}</div>
                      </td>
                      <td className="px-3 py-3 text-[12px]">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin size={10} className="text-emerald-500" />
                          <span className="font-mono text-[10.5px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">{v.origen_codigo || "—"}</span>
                          <span className="truncate max-w-[120px]">{v.origen}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 mt-1">
                          <MapPin size={10} className="text-rose-500" />
                          <span className="font-mono text-[10.5px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">{v.destino_codigo || "—"}</span>
                          <span className="truncate max-w-[120px]">{v.destino}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-700 dark:text-slate-200">{Number(v.kms_totales).toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold capitalize ${ESTADO_CHIP[v.estado] ?? "bg-slate-100 text-slate-500"}`}>
                          {v.estado.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <a
                            href={api.getViajePdfUrl(v.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Descargar Carta de Traslado (PDF)"
                            className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60 hover:bg-red-600 hover:text-white hover:border-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm opacity-90 group-hover:opacity-100"
                          >
                            <FileText size={16} strokeWidth={2.25} />
                            <span className="absolute bottom-0.5 right-0.5 text-[7px] font-black leading-none px-1 rounded-sm bg-red-600 text-white shadow-sm">
                              PDF
                            </span>
                          </a>
                          <Link href={`/viajes/${v.id}`} title="Ver detalle"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all opacity-70 group-hover:opacity-100">
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginador */}
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
