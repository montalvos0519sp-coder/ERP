"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search, Filter, Download, UserPlus, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, RefreshCw, ExternalLink, AlertTriangle,
  Users, UserCheck, FileText, Eye, Edit, ChevronDown as Arrow,
  X, Calendar, Upload, FileSpreadsheet, CheckCircle2, Link2, Search as SearchIcon,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  numero_empleado?: string;
  email?: string;
  departamento?: string;
  departamento_id?: number;
  puesto?: string;
  puesto_id?: number;
  empresa?: string;
  empresa_display?: string;
  // División operativa: M2M en el modelo; el backend devuelve los nombres
  // ya resueltos como lista y como string concatenado para mostrar.
  divisiones?: string[];
  divisiones_display?: string;
  fecha_contratacion?: string;
  fecha_ingreso?: string;
  dias_laborados?: number;
  fecha_nacimiento?: string;
  age?: number;
  curp?: string;
  rfc?: string;
  nss?: string;
  activo: boolean;
  eliminado?: boolean;
  indice_descendente?: number;
  user_sistema?: number | null;
  user_sistema_nombre?: string | null;
}

interface PageData {
  results: Empleado[];
  count: number;
  total_activos?: number;
  next: string | null;
  previous: string | null;
}

interface SelectOption { id: string | number; nombre: string; }

type SortKey = "nombre_completo" | "puesto" | "fecha_contratacion" | "empresa" | "numero_empleado";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(emp: Empleado) {
  const n = emp.nombre?.[0] ?? "";
  const a = emp.apellido?.[0] ?? emp.nombre_completo?.[emp.nombre_completo.indexOf(" ") + 1] ?? "";
  return (n + a).toUpperCase() || "?";
}

function fmtDate(d?: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${dd} ${months[+m - 1]} ${y}`;
}

const EMPRESA_COLORS: Record<string, string> = {};
const PALETTE = ["#3b82f6","#22c55e","#a855f7","#f59e0b","#ef4444","#14b8a6","#f97316","#06b6d4","#f43f5e","#84cc16"];
let colorIdx = 0;
function empresaColor(empresa?: string) {
  if (!empresa) return "#64748b";
  if (!EMPRESA_COLORS[empresa]) {
    EMPRESA_COLORS[empresa] = PALETTE[colorIdx++ % PALETTE.length];
  }
  return EMPRESA_COLORS[empresa];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ emp }: { emp: Empleado }) {
  const color = empresaColor(emp.empresa ?? emp.empresa_display);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
    >
      {initials(emp)}
    </div>
  );
}

function StatusBadge({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
      activo
        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
        : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
    }`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function SortIcon({ col, sortKey, sortAsc }: { col: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sortAsc ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />;
}

// ─── Document Dropdown ────────────────────────────────────────────────────────

function DocDropdown({ empId, nombre }: { empId: number; nombre: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const docs = [
    { slug: "contrato-indeterminado", label: "Contrato Indeterminado" },
    { slug: "aviso-privacidad",       label: "Aviso de Privacidad" },
    { slug: "convenio-confidencialidad", label: "Convenio Confidencialidad" },
    { slug: "descripcion-puesto",     label: "Descripción de Puesto" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors inline-flex items-center gap-0.5"
        title="Documentos"
      >
        <FileText size={13} /><Arrow size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 w-52 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg py-1.5 text-xs">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
            Expediente de {nombre.split(" ")[0]}
          </div>
          <a
            href={`${API_BASE}/rh/descargar-documentos-zip/${empId}/`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold"
            onClick={() => setOpen(false)}
          >
            Descargar Todo (ZIP)
          </a>
          <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
          {docs.map(d => (
            <a
              key={d.slug}
              href={`${API_BASE}/rh/descargar-documento-individual/${empId}/${d.slug}/`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              onClick={() => setOpen(false)}
            >
              {d.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GestionEmpleados() {
  const { isDarkMode } = useTheme();

  const [data, setData]         = useState<PageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | false>(false);
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 20;

  // Vinculación empleado ↔ usuario del sistema
  const [vincular, setVincular] = useState<Empleado | null>(null);

  // Importación de Excel/CSV
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Filters
  const [nombre, setNombre]           = useState("");
  const [deptFilter, setDeptFilter]   = useState("");
  const [puestoFilter, setPuestoFilter] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState("");
  const [fechaIni, setFechaIni]       = useState("");
  const [fechaFin, setFechaFin]       = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Sort
  const [sortKey, setSortKey]   = useState<SortKey>("nombre_completo");
  const [sortAsc, setSortAsc]   = useState(true);

  // Catalog data for filter selects
  const [departamentos, setDepartamentos] = useState<SelectOption[]>([]);
  const [puestos, setPuestos]             = useState<SelectOption[]>([]);
  const [empresasCat, setEmpresasCat]     = useState<SelectOption[]>([]);

  // Códigos de empresa (CharField con choices en el modelo Empleado de RH)
  // → etiqueta legible. Tiene que mantenerse sincronizado con RH/models.py
  // (EMPRESA_CHOICES).
  const EMPRESA_LABELS: Record<string, string> = useMemo(() => ({
    MIGMAR:         "Migmar",
    MARCO_MORALES:  "Marco Morales",
    CHIHUAHUA:      "Chihuahua",
  }), []);

  // Mapa id → nombre del catálogo Ternium (por compatibilidad si el backend
  // alguna vez devolviera el ID en lugar del code).
  const empresaNameById = useMemo(() => {
    const m = new Map<string, string>();
    empresasCat.forEach(e => { m.set(String(e.id), e.nombre); });
    return m;
  }, [empresasCat]);

  /**
   * Resuelve un valor de empresa al nombre legible.
   *  · Si es un code de choice (MIGMAR / MARCO_MORALES / CHIHUAHUA) → nombre bonito.
   *  · Si es un ID numérico del catálogo Ternium → busca por ID.
   *  · Si ya es un nombre legible → se devuelve tal cual.
   */
  const resolveEmpresaNombre = (raw?: string | number | null) => {
    if (raw === null || raw === undefined || raw === "") return "";
    const s = String(raw);
    // Code de choice → label
    if (EMPRESA_LABELS[s]) return EMPRESA_LABELS[s];
    // Code de choice en mayúsculas distintas / con espacios → normaliza y busca
    const normalized = s.toUpperCase().replace(/\s+/g, "_");
    if (EMPRESA_LABELS[normalized]) return EMPRESA_LABELS[normalized];
    // ID numérico del catálogo Ternium
    if (/^\d+$/.test(s)) return empresaNameById.get(s) || s;
    // Ya es nombre legible
    return s;
  };

  // Pending filter values (applied on submit)
  const [pendingNombre, setPendingNombre]       = useState("");
  const [pendingDept, setPendingDept]           = useState("");
  const [pendingPuesto, setPendingPuesto]       = useState("");
  const [pendingEmpresa, setPendingEmpresa]     = useState("");
  const [pendingFechaIni, setPendingFechaIni]   = useState("");
  const [pendingFechaFin, setPendingFechaFin]   = useState("");

  const buildParams = useCallback((): Record<string, string> => {
    const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (nombre)       p.search    = nombre;
    if (deptFilter)   p.departamento = deptFilter;
    if (puestoFilter) p.puesto    = puestoFilter;
    if (empresaFilter) p.empresa  = empresaFilter;
    if (fechaIni)     p.fecha_inicio = fechaIni;
    if (fechaFin)     p.fecha_fin    = fechaFin;
    p.ordering = `${sortAsc ? "" : "-"}${sortKey}`;
    return p;
  }, [page, nombre, deptFilter, puestoFilter, empresaFilter, fechaIni, fechaFin, sortKey, sortAsc]);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await api.getEmpleados(buildParams());
      setData(res as unknown as PageData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getRHDepartamentos().then((r: any) => setDepartamentos(Array.isArray(r) ? r : r.results ?? [])).catch(() => {});
    api.getRHPuestos().then((r: any) => setPuestos(Array.isArray(r) ? r : r.results ?? [])).catch(() => {});
    api.getCatEmpresas().then((r: any) => setEmpresasCat(r.results ?? r)).catch(() => {});
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setNombre(pendingNombre);
    setDeptFilter(pendingDept);
    setPuestoFilter(pendingPuesto);
    setEmpresaFilter(pendingEmpresa);
    setFechaIni(pendingFechaIni);
    setFechaFin(pendingFechaFin);
    setPage(1);
  }

  function clearFilters() {
    setPendingNombre(""); setPendingDept(""); setPendingPuesto("");
    setPendingEmpresa(""); setPendingFechaIni(""); setPendingFechaFin("");
    setNombre(""); setDeptFilter(""); setPuestoFilter("");
    setEmpresaFilter(""); setFechaIni(""); setFechaFin("");
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  const totalPages  = data ? Math.ceil(data.count / PAGE_SIZE) : 1;
  const totalActivos = data?.total_activos ?? data?.results.filter(e => e.activo).length ?? 0;

  const inputCls = `text-sm border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 w-full transition-shadow ${
    isDarkMode
      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500"
      : "bg-white border-slate-200 text-slate-700 placeholder-slate-400"
  }`;
  const selectCls = inputCls + " cursor-pointer";

  const thCls = "px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300 whitespace-nowrap";

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Gestión de Empleados</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {data ? `${data.count.toLocaleString("es-MX")} registros totales` : "Cargando…"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw size={13} /> Actualizar
          </button>
          <a
            href={api.getRHExportUrl(buildParams())}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <Download size={13} /> Exportar Excel
          </a>
          <button
            onClick={() => { setImportResult(null); setImportFile(null); setOpenImport(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
          >
            <Upload size={13} /> Importar Excel
          </button>
          <Link
            href="/rh/empleados/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
          >
            <UserPlus size={13} /> Nuevo Empleado
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Users,     label: "Total de Empleados",  value: data?.count ?? 0,        color: "#64748b" },
          { icon: UserCheck, label: "Empleados Activos",   value: totalActivos,             color: "#22c55e" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
              <p className="text-3xl font-black mt-0.5" style={{ color }}>{value.toLocaleString("es-MX")}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Panel ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowFilters(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-blue-500" />
            <span className="font-bold text-slate-800 dark:text-white text-sm">Filtros de Búsqueda</span>
          </div>
          {showFilters ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showFilters && (
          <form onSubmit={applyFilters} className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nombre o Apellido</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text" value={pendingNombre}
                    onChange={e => setPendingNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className={inputCls + " pl-8"}
                  />
                </div>
              </div>
              {/* Departamento */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Departamento</label>
                <select value={pendingDept} onChange={e => setPendingDept(e.target.value)} className={selectCls}>
                  <option value="">Todos los departamentos</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              {/* Puesto */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Puesto</label>
                <select value={pendingPuesto} onChange={e => setPendingPuesto(e.target.value)} className={selectCls}>
                  <option value="">Todos los puestos</option>
                  {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              {/* Fecha desde */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Contratación desde</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="date" value={pendingFechaIni} onChange={e => setPendingFechaIni(e.target.value)} className={inputCls + " pl-8"} />
                </div>
              </div>
              {/* Fecha hasta */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Contratación hasta</label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="date" value={pendingFechaFin} onChange={e => setPendingFechaFin(e.target.value)} className={inputCls + " pl-8"} />
                </div>
              </div>
              {/* Empresa */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Empresa</label>
                <select value={pendingEmpresa} onChange={e => setPendingEmpresa(e.target.value)} className={selectCls}>
                  <option value="">Todas las empresas</option>
                  {/* Empresa en Empleado es un CharField con choices (MIGMAR /
                      MARCO_MORALES / CHIHUAHUA). El filtro envía el code para
                      que el backend pueda matchear contra ese campo. */}
                  {Object.entries(EMPRESA_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none transition-colors">
                  <Search size={12} /> Aplicar Filtros
                </button>
                <button type="button" onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <X size={12} /> Limpiar
                </button>
              </div>
              <a
                href={api.getRHExportUrl({ ...buildParams(), page: "1", page_size: "9999" })}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <Download size={12} /> Exportar resultados
              </a>
            </div>
          </form>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-blue-500" />
            <span className="font-bold text-slate-800 dark:text-white text-sm">Directorio de Personal</span>
            {data && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f625" }}>
                {data.count} registros
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400 animate-pulse">Cargando empleados…</div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={30} className="text-amber-400" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-1">No se pudo conectar</h3>
            <p className="text-xs text-slate-400 mb-1">Endpoint: <code>/rh/api/empleados/</code></p>
            {error && error !== "true" && <p className="text-xs text-red-400 mb-4 font-mono">{error}</p>}
            <button onClick={load} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className={thCls + " w-12 text-center cursor-default"}>No.</th>
                  <th className={thCls} onClick={() => handleSort("nombre_completo")}>
                    <span className="inline-flex items-center gap-1">Nombre Completo <SortIcon col="nombre_completo" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className={thCls} onClick={() => handleSort("puesto")}>
                    <span className="inline-flex items-center gap-1">Puesto / Depto. <SortIcon col="puesto" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className={thCls + " cursor-default"}>Docs. Oficiales</th>
                  <th className={thCls} onClick={() => handleSort("fecha_contratacion")}>
                    <span className="inline-flex items-center gap-1">Antigüedad <SortIcon col="fecha_contratacion" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className={thCls + " text-center cursor-default"}>Nacimiento</th>
                  <th className={thCls + " cursor-default"}>
                    <span className="inline-flex items-center gap-1">División Operativa</span>
                  </th>
                  <th className={thCls + " text-center cursor-default"}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {!data?.results.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                          <Search size={26} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Sin resultados</h4>
                        <p className="text-sm text-slate-400">Intenta ajustar los filtros</p>
                        <button onClick={clearFilters} className="text-xs font-bold text-blue-600 hover:underline">Limpiar filtros</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.results.map((emp, idx) => {
                    const num = emp.indice_descendente ?? ((page - 1) * PAGE_SIZE + idx + 1);
                    const eColor = empresaColor(emp.empresa ?? emp.empresa_display);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                        {/* No. */}
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            #{num}
                          </span>
                        </td>
                        {/* Nombre */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar emp={emp} />
                            <div className="min-w-0 flex-1">
                              {/* Nombre completo: se muestra entero (sin truncar).
                                  Si es muy largo, hace wrap en 2 líneas; el tooltip
                                  con `title` ayuda en pantallas estrechas. */}
                              <p
                                title={emp.nombre_completo}
                                className="font-bold text-slate-800 dark:text-white leading-tight whitespace-normal break-words"
                              >
                                {emp.nombre_completo}
                              </p>
                              <p
                                title={emp.email ?? ""}
                                className="text-[11px] text-slate-400 dark:text-slate-500 truncate"
                              >
                                {emp.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Puesto / Depto */}
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs leading-tight">{emp.puesto ?? "—"}</p>
                          <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">{emp.departamento ?? "—"}</p>
                        </td>
                        {/* Docs oficiales */}
                        <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                          <div><span className="font-bold text-slate-600 dark:text-slate-300">CURP:</span> {emp.curp ?? "—"}</div>
                          <div><span className="font-bold text-slate-600 dark:text-slate-300">RFC:</span> {emp.rfc ?? "—"}</div>
                          <div><span className="font-bold text-slate-600 dark:text-slate-300">NSS:</span> {emp.nss ?? "—"}</div>
                        </td>
                        {/* Antigüedad */}
                        <td className="px-3 py-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{fmtDate(emp.fecha_contratacion ?? emp.fecha_ingreso)}</p>
                          {emp.dias_laborados != null && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{emp.dias_laborados.toLocaleString("es-MX")} días</p>
                          )}
                        </td>
                        {/* Nacimiento */}
                        <td className="px-3 py-3 text-center">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{fmtDate(emp.fecha_nacimiento)}</p>
                          {emp.age != null && (
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              {emp.age} años
                            </span>
                          )}
                        </td>
                        {/* División Operativa */}
                        <td className="px-3 py-3">
                          {(() => {
                            const divs = emp.divisiones ?? [];
                            if (divs.length === 0) {
                              return <span className="text-[11px] text-slate-400">N/A</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {divs.map((d, i) => {
                                  // Color consistente por nombre de división (reusa la
                                  // paleta del helper `empresaColor`).
                                  const c = empresaColor(d);
                                  return (
                                    <span
                                      key={`${d}-${i}`}
                                      title={d}
                                      className="inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-md leading-tight"
                                      style={{ background: `${c}15`, color: c, border: `1px solid ${c}25` }}
                                    >
                                      {d}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>
                        {/* Acciones */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setVincular(emp)}
                              className={`p-1.5 rounded transition-colors ${emp.user_sistema ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"}`}
                              title={emp.user_sistema ? `Usuario vinculado: ${emp.user_sistema_nombre || ""}` : "Vincular usuario del sistema"}
                            >
                              <Link2 size={14} />
                            </button>
                            <Link
                              href={`/rh/empleados/${emp.id}`}
                              className="p-1.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                              title="Ver ficha"
                            >
                              <Eye size={14} />
                            </Link>
                            <Link
                              href={`/rh/empleados/${emp.id}/editar`}
                              className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </Link>
                            <DocDropdown empId={emp.id} nombre={emp.nombre_completo} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Mostrando{" "}
            <span className="font-bold text-slate-700 dark:text-slate-300">{(page - 1) * PAGE_SIZE + 1}</span>
            {" – "}
            <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(page * PAGE_SIZE, data?.count ?? 0)}</span>
            {" de "}
            <span className="font-bold text-slate-700 dark:text-slate-300">{data?.count.toLocaleString("es-MX")}</span> registros
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >«</button>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            ><ChevronLeft size={14} /></button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    p === page
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            ><ChevronRight size={14} /></button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >»</button>
          </div>
        </div>
      )}

      {/* ── Modal Importar Empleados desde Excel ─────────────────────── */}
      {openImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !importing && setOpenImport(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Upload size={16} className="text-violet-500" /> Importar Empleados desde Excel
                </h3>
                <p className="text-[11.5px] text-slate-500 mt-1">
                  Sube un archivo <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">.xlsx</code> o <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">.csv</code> con las columnas estándar.
                </p>
              </div>
              <button onClick={() => !importing && setOpenImport(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!importResult && (
                <>
                  {/* Columnas esperadas */}
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 p-3">
                    <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-widest mb-1.5">Columnas reconocidas</p>
                    <p className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-mono font-bold">Nombre · Licencia · C.P. · Calle · Numero Exterior · Colonia · Localidad · Municipio · Estado · Pais · Fecha de Nacimiento · NSS · RFC · CURP · Departamento · Puesto</span>
                    </p>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 space-y-0.5 list-disc list-inside">
                      <li>El <b>Nombre</b> se parte automáticamente en nombre + apellido.</li>
                      <li>Si el <b>Departamento</b> o <b>Puesto</b> no existe, se crea al vuelo.</li>
                      <li>Las filas con <b>CURP</b> o <b>RFC</b> duplicado se saltan.</li>
                    </ul>
                  </div>

                  {/* Dropzone */}
                  <label className={`block rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${importFile
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-950/20"
                  }`}>
                    <input type="file" accept=".xlsx,.xls,.csv"
                      onChange={e => setImportFile(e.target.files?.[0] ?? null)} className="hidden" />
                    {importFile ? (
                      <>
                        <FileSpreadsheet size={32} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{importFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{(importFile.size / 1024).toFixed(1)} KB · clic para cambiar</p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clic para seleccionar archivo</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">o arrastra aquí (formatos: .xlsx, .xls, .csv)</p>
                      </>
                    )}
                  </label>
                </>
              )}

              {/* Resultado */}
              {importResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 text-center">
                      <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-1" />
                      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{importResult.creados}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Creados</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-center">
                      <AlertTriangle size={20} className="mx-auto text-amber-500 mb-1" />
                      <div className="text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums">{importResult.omitidos_duplicados}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Duplicados</div>
                    </div>
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-center">
                      <X size={20} className="mx-auto text-rose-500 mb-1" />
                      <div className="text-2xl font-black text-rose-700 dark:text-rose-300 tabular-nums">{importResult.errores_count}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:text-rose-400">Errores</div>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-500 text-center">
                    {importResult.total_filas} filas procesadas · columnas detectadas: <b>{Object.keys(importResult.columnas_detectadas || {}).length}</b>
                  </p>
                  {importResult.errores && importResult.errores.length > 0 && (
                    <details className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-2">
                      <summary className="text-[11px] font-bold text-rose-700 dark:text-rose-300 cursor-pointer">Ver errores ({importResult.errores.length})</summary>
                      <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {importResult.errores.map((e: any, i: number) => (
                          <li key={i} className="text-[11px] text-rose-700 dark:text-rose-400 font-mono">
                            Fila {e.fila}: {e.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
              {importResult ? (
                <>
                  <button onClick={() => { setImportResult(null); setImportFile(null); }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    Importar otro
                  </button>
                  <button onClick={() => { setOpenImport(false); load(); }}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-500 inline-flex items-center gap-1.5">
                    <CheckCircle2 size={11} /> Cerrar y recargar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setOpenImport(false)} disabled={importing}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button onClick={async () => {
                    if (!importFile) return;
                    setImporting(true);
                    try {
                      const fd = new FormData();
                      fd.append("archivo", importFile);
                      const r = await api.importarEmpleadosRH(fd);
                      setImportResult(r);
                    } catch (e: unknown) {
                      alert(e instanceof Error ? e.message : "Error al importar");
                    } finally { setImporting(false); }
                  }} disabled={!importFile || importing}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                    {importing ? <><RefreshCw size={11} className="animate-spin" /> Importando…</> : <><Upload size={11} /> Iniciar importación</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {vincular && (
        <VincularUsuarioModal emp={vincular} isDark={isDarkMode}
          onClose={() => setVincular(null)}
          onSaved={() => { setVincular(null); load(); }} />
      )}
    </div>
  );
}

// Modal para vincular un empleado con un usuario del sistema (para su portal).
function VincularUsuarioModal({ emp, isDark, onClose, onSaved }: {
  emp: Empleado; isDark: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number | null>(emp.user_sistema ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getUsuariosVinculables().then((u) => setUsuarios(u || [])).catch(() => setUsuarios([]));
  }, []);

  const filtrados = usuarios.filter((u) =>
    !q || `${u.nombre} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const guardar = async (userId: number | null) => {
    setBusy(true);
    try {
      await api.actualizarEmpleadoRH(emp.id, { user_sistema: userId });
      onSaved();
    } catch (e) { alert(e instanceof Error ? e.message : "Error"); setBusy(false); }
  };

  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border overflow-hidden max-h-[90vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Link2 className="w-4 h-4" /> Vincular usuario</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Conecta a <b>{emp.nombre_completo}</b> con un usuario del sistema. Así el empleado verá su <b>portal</b> (vacaciones, préstamos, permisos y capacitaciones) en su perfil.
          </p>
          <div className="relative">
            <SearchIcon className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario…" className={`${inp} pl-8`} />
          </div>
          <div className={`rounded-xl border max-h-64 overflow-auto divide-y ${isDark ? "border-white/[0.06] divide-white/[0.04]" : "border-slate-200 divide-slate-100"}`}>
            <button type="button" onClick={() => setSel(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${sel === null ? (isDark ? "bg-rose-500/10" : "bg-rose-50") : ""}`}>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${sel === null ? "bg-rose-500 border-rose-500" : isDark ? "border-white/20" : "border-slate-300"}`}>{sel === null && <CheckCircle2 className="w-3 h-3 text-white" />}</span>
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>Sin usuario (desvincular)</span>
            </button>
            {filtrados.map((u) => {
              const ocupadoPorOtro = u.ya_vinculado && u.id !== emp.user_sistema;
              return (
                <button key={u.id} type="button" disabled={ocupadoPorOtro} onClick={() => setSel(u.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm ${sel === u.id ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""} ${ocupadoPorOtro ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${sel === u.id ? "bg-indigo-500 border-indigo-500" : isDark ? "border-white/20" : "border-slate-300"}`}>{sel === u.id && <CheckCircle2 className="w-3 h-3 text-white" />}</span>
                    <span className="min-w-0">
                      <span className={`block font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{u.nombre}</span>
                      <span className={`block text-[11px] truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>@{u.username}{u.email ? ` · ${u.email}` : ""}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase">
                    {ocupadoPorOtro ? <span className="text-amber-500">ocupado</span> : <span className={isDark ? "text-slate-500" : "text-slate-400"}>{u.rol}</span>}
                  </span>
                </button>
              );
            })}
            {filtrados.length === 0 && <p className={`text-sm text-center py-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin usuarios disponibles.</p>}
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={() => guardar(sel)} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-indigo-500 to-violet-600">{busy ? "Guardando…" : "Guardar vínculo"}</button>
        </div>
      </div>
    </div>
  );
}
