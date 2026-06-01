"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Banknote, Bell, BookOpen, Briefcase, Building2,
  Cake, Check, Clock, CloudDownload, CloudUpload,
  ExternalLink, Factory, FileSpreadsheet, FolderOpen, Gauge, Info,
  MapPin, Network, Package, PlaneTakeoff, RefreshCw, Sun, Tag,
  Trash2, UserPlus, UserX, Users, Wallet, X,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTip, ResponsiveContainer,
} from "recharts";
import { API_BASE, api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

const PALETTE = ["#3b82f6","#22c55e","#a855f7","#f59e0b","#ef4444","#64748b","#14b8a6","#f97316","#06b6d4","#f43f5e"];

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface AlertaRH {
  tipo: "danger" | "warning" | "info";
  titulo: string;
  descripcion: string;
  fecha: string;
  empleado_id?: number;
  empresa?: string;
  division?: string;
  departamento?: string;
  puesto?: string;
  categoria?: string;
  icono?: string;
}
interface CumpleanoItem {
  empleado: { nombre: string; apellido: string; puesto?: { nombre: string } };
  edad_a_cumplir: number;
}
interface VacacionItem {
  empleado: { nombre_completo: string };
  fecha_inicio: string; fecha_fin: string;
  dias: number; estado: "aprobado" | "pendiente" | "rechazado"; dias_restantes: number;
}
interface PrestamoItem {
  empleado: { nombre_completo: string };
  monto_total: number; plazo_meses: number; monto_pagado: number;
  saldo_pendiente: number; progreso_pago: number;
}
interface DeptItem { nombre: string; count: number; }
interface EmpresaCat { id: number; nombre: string; prefijo?: string; }
interface OperadoresEmpresa { empresa_id?: number; empresa: string; total: number; }
interface DashboardData {
  total_empleados: number; empleados_activos: number; empleados_inactivos: number;
  empleados_activos_porcentaje: number; empleados_inactivos_porcentaje: number;
  total_departamentos: number;
  // legacy fields (kept for backward compat)
  operadores_migmar?: number; operadores_marco?: number;
  // new dynamic field (preferred)
  operadores_por_empresa?: OperadoresEmpresa[];
  vacaciones_activas: number; vacaciones_pendientes: number; vacaciones_progreso: number;
  prestamos_activos: number; total_prestamos_activos: number; prestamos_progreso: number;
  total_eliminados: number; alertas_rh: AlertaRH[]; cumpleanos_hoy: CumpleanoItem[];
  proximas_vacaciones: VacacionItem[]; prestamos_pendientes: PrestamoItem[];
  departamento_distribucion: DeptItem[]; today: string; user_is_superuser: boolean;
}

function fmt(n: number) { return n.toLocaleString("es-MX"); }

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/70 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
      />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  color, icon: Icon, label, value, badge, footer,
}: {
  color: string; icon: React.ElementType; label: string;
  value: string | number; badge?: string; footer?: React.ReactNode;
}) {
  const { isDarkMode } = useTheme();
  const bg = isDarkMode
    ? `linear-gradient(145deg, ${color}18 0%, #0f172a 55%)`
    : `linear-gradient(145deg, ${color}10 0%, #ffffff 55%)`;
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" style={{ background: bg }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
      <div className="p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
            <p className="text-4xl font-black mt-1 leading-none" style={{ color }}>{value}</p>
            {badge && (
              <span
                className="inline-flex items-center mt-2.5 text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
              >
                {badge}
              </span>
            )}
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${color}25, ${color}10)`, border: `1px solid ${color}30` }}
          >
            <Icon size={26} style={{ color }} />
          </div>
        </div>
        {footer && (
          <div className="mt-4 pt-3.5" style={{ borderTop: `1px solid ${color}20` }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon, label, color, href, external, onClick,
}: {
  icon: React.ElementType; label: string; color: string;
  href?: string; external?: boolean; onClick?: () => void;
}) {
  const inner = (
    <div
      className="group flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-2xl h-full text-center cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ ["--qa-color" as string]: color }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-all duration-200 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}0d)`,
          border: `1px solid ${color}25`,
        }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight whitespace-pre-line group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
        {label}
      </span>
    </div>
  );
  if (onClick)   return <button onClick={onClick} className="h-full w-full">{inner}</button>;
  if (external && href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>;
  if (href)      return <Link href={href} className="block h-full">{inner}</Link>;
  return inner;
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title, badge, badgeColor = "#3b82f6", accentColor = "#3b82f6", children, footer,
}: {
  title: string; badge?: string; badgeColor?: string; accentColor?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}60)` }} />
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h2>
        </div>
        {badge && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}25` }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}

// ─── Skeleton / Error ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-24 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <AlertTriangle size={32} className="text-amber-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No se pudo cargar el dashboard</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Verifica que el endpoint Django esté activo:</p>
      <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-mono">
        GET /rh/api/dashboard/
      </code>
      <div className="mt-5">
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}

// ─── Checadas Modal ────────────────────────────────────────────────────────────

function ChecadasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = formRef.current?.querySelector<HTMLInputElement>("#archivo_excel");
    if (!input?.files?.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("archivo_excel", input.files[0]);
      const _tok = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
      const res = await fetch(`${API_BASE}/rh/procesar-checadas/`, {
        method: "POST", body: fd, credentials: "include",
        headers: _tok ? { Authorization: `Bearer ${_tok}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "checadas_procesadas.xlsx"; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch { alert("Error al procesar el archivo."); }
    finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-b border-orange-100 dark:border-orange-900/30">
          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Clock size={20} className="text-orange-500" />
          </div>
          <h5 className="font-bold text-slate-800 dark:text-white text-base">Procesar Checadas</h5>
          <button onClick={onClose} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sube el archivo Excel del checador. El sistema calculará retardos y tiempos extra.
          </p>
          <div>
            <label htmlFor="archivo_excel" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Archivo Excel (.xlsx, .xls)
            </label>
            <input
              id="archivo_excel" type="file" accept=".xlsx,.xls" required
              className="block w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 dark:file:bg-orange-900/40 file:text-orange-700 dark:file:text-orange-300 file:text-xs file:font-bold"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 inline-flex items-center gap-2 shadow-sm shadow-orange-200 dark:shadow-none transition-all">
              {loading && <RefreshCw size={13} className="animate-spin" />}
              {loading ? "Procesando…" : "Procesar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Empleados por Empresa Card ────────────────────────────────────────────────

const EMP_COLORS = ["#38bdf8","#a78bfa","#34d399","#fb923c","#f472b6","#facc15","#60a5fa","#4ade80","#f87171","#a3e635"];

function EmpleadosEmpresaCard({
  operadoresList,
  totalOperadores,
  hiddenIds,
  onToggle,
}: {
  operadoresList: { id?: number; nombre: string; total: number; color: string }[];
  totalOperadores: number;
  hiddenIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const { isDarkMode } = useTheme();
  const [showHidden, setShowHidden] = useState(false);

  const divider  = isDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const labelCls = isDarkMode ? "text-slate-400" : "text-slate-500";

  const visible = operadoresList.filter(e => e.id == null || !hiddenIds.has(e.id));
  const hidden  = operadoresList.filter(e => e.id != null &&  hiddenIds.has(e.id));
  const display = showHidden ? operadoresList : visible;

  const cols = display.length === 0 ? 1
    : display.length <= 2 ? 2
    : display.length === 3 ? 3 : 2;

  return (
    <div
      className="rounded-2xl p-5 overflow-hidden relative border flex flex-col"
      style={isDarkMode
        ? { background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderColor: "#1e293b" }
        : { background: "#ffffff", borderColor: "#e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }
      }
    >
      {isDarkMode && (
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #38bdf8, transparent)", transform: "translate(30%,-30%)" }} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg,#38bdf8,#a78bfa)" }} />
          <p className={`text-[11px] font-bold uppercase tracking-widest ${labelCls}`}>Empleados por Empresa</p>
        </div>
        {hidden.length > 0 && (
          <button
            onClick={() => setShowHidden(v => !v)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors"
            style={isDarkMode ? { color: "#94a3b8", background: "rgba(255,255,255,0.06)" } : { color: "#64748b", background: "#f1f5f9" }}
          >
            {showHidden ? "Ocultar" : `+${hidden.length} ocultas`}
          </button>
        )}
      </div>

      {/* ── Empresa tiles ── */}
      {display.length === 0 ? (
        <p className={`text-xs text-center py-4 ${labelCls}`}>
          Sin empresas. Configura en <strong>Catálogos → Empresas</strong>.
        </p>
      ) : (
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {display.map((e) => {
            const isHidden = e.id != null && hiddenIds.has(e.id);
            return (
              <div key={e.nombre} className="relative group">
                {e.id != null && (
                  <button
                    onClick={() => onToggle(e.id!)}
                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    style={{ background: isHidden ? "#22c55e" : "#64748b", color: "#fff" }}
                    title={isHidden ? "Mostrar empresa" : "Ocultar empresa"}
                  >
                    <X size={10} />
                  </button>
                )}
                <div
                  className="text-center p-3 rounded-xl transition-opacity"
                  style={{
                    background: `${e.color}14`,
                    border: `1px solid ${e.color}22`,
                    opacity: isHidden ? 0.4 : 1,
                  }}
                >
                  <p className="text-2xl font-black leading-none" style={{ color: e.color }}>{e.total}</p>
                  <p className="text-[10px] font-bold mt-1 truncate"
                    style={{ color: isDarkMode ? `${e.color}99` : `${e.color}cc` }} title={e.nombre}>
                    {e.nombre}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex justify-between items-center pt-2.5 mt-auto"
        style={{ borderTop: `1px solid ${divider}` }}>
        <span className={`text-xs font-semibold ${labelCls}`}>Total Empleados</span>
        <span className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>{totalOperadores}</span>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const HIDDEN_KEY = "rh-hidden-empresas";

export default function RHDashboard() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaCat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [activeTab, setActiveTab] = useState<"alertas" | "vacaciones" | "prestamos">("alertas");
  const [checadasOpen, setChecadasOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_KEY);
      if (stored) setHiddenIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const handleToggleEmpresa = (id: number) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [dashRes, empRes] = await Promise.all([
        fetch(`${API_BASE}/rh/api/dashboard/`, { credentials: "include", headers }),
        fetch(`${API_BASE}/api/cat/empresas/`,  { credentials: "include", headers }),
      ]);
      if (!dashRes.ok) throw new Error();
      setData(await dashRes.json());
      if (empRes.ok) {
        const empJson = await empRes.json();
        setEmpresas(empJson.results ?? empJson);
      }
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const { isDarkMode } = useTheme();

  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorState onRetry={load} />;

  const d = data;
  const today      = d.today ? new Date(d.today).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const todayShort = d.today ? new Date(d.today).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
  const alertas    = d.alertas_rh ?? [];
  const vacProg    = Math.min(100, Math.round(d.vacaciones_progreso ?? 0));
  const prestProg  = Math.min(100, Math.round(d.prestamos_progreso ?? 0));

  // Build operadores list: prefer new API field, fall back to catalog empresas with legacy counts
  const operadoresList: { id?: number; nombre: string; total: number; color: string }[] = (() => {
    if (d.operadores_por_empresa?.length) {
      return d.operadores_por_empresa.map((e, i) => ({
        id:     e.empresa_id,
        nombre: e.empresa,
        total:  e.total,
        color:  EMP_COLORS[i % EMP_COLORS.length],
      }));
    }
    if (empresas.length) {
      return empresas.map((e, i) => {
        // Defensa: mi backend usa nombre_comercial, el original usaba nombre.
        const nombreEmpresa = (e as any).nombre || (e as any).nombre_comercial || "—";
        const n = nombreEmpresa.toUpperCase();
        const legacy = n.includes("MIGMAR") ? (d.operadores_migmar ?? 0)
          : n.includes("MARCO")             ? (d.operadores_marco  ?? 0)
          : 0;
        return { id: e.id, nombre: nombreEmpresa, total: legacy, color: EMP_COLORS[i % EMP_COLORS.length] };
      });
    }
    return [
      { nombre: "MIGMAR",   total: d.operadores_migmar ?? 0, color: EMP_COLORS[0] },
      { nombre: "MARCO M.", total: d.operadores_marco  ?? 0, color: EMP_COLORS[1] },
    ];
  })();
  const totalOperadores = operadoresList.reduce((s, e) => s + e.total, 0);

  const quickActions = [
    { icon: UserPlus,        label: "Nuevo\nEmpleado",          color: "#3b82f6", href: `/rh/empleados/nuevo` },
    { icon: BookOpen,        label: "Directorio\nGeneral",      color: "#64748b", href: "/rh/empleados" },
    { icon: Clock,           label: "Procesar\nChecadas",       color: "#f97316", onClick: () => setChecadasOpen(true) },
    { icon: UserX,           label: "Historial\nde Bajas",      color: "#ef4444", href: `${API_BASE}/rh/historial-bajas/`,          external: true },
    { icon: Sun,             label: "Gestión\nVacaciones",      color: "#14b8a6", href: "/rh/vacaciones" },
    { icon: Banknote,        label: "Gestión\nPréstamos",       color: "#a855f7", href: "/rh/prestamos" },
    { icon: Trash2,          label: "Papelera\nReciclaje",      color: "#f97316", href: `${API_BASE}/rh/papelera/`,                 external: true },
    { icon: AlertTriangle,   label: "Semáforo\nVencimientos",   color: "#eab308", href: `${API_BASE}/rh/semaforo-documentos/`,      external: true },
    { icon: FolderOpen,      label: "Faltantes\nOperador",      color: "#64748b", href: `${API_BASE}/rh/reporte-documentacion/`,    external: true },
    { icon: Package,         label: "Documentos\nMasivos",      color: "#3b82f6", href: `${API_BASE}/rh/descargar-documentos/`,     external: true },
    { icon: Gauge,           label: "Dashboard\nOperadores",    color: "#06b6d4", href: `${API_BASE}/rh/dashboard-operadores/`,     external: true },
    { icon: Briefcase,       label: "Gestión\nVacantes",        color: "#22c55e", href: `${API_BASE}/rh/vacantes/`,                 external: true },
    { icon: FileSpreadsheet, label: "Exportar\nExcel",          color: "#22c55e", href: `${API_BASE}/rh/empleados/exportar/excel/`, external: true },
    { icon: Briefcase,       label: "Puestos\ny Deptos.",        color: "#8b5cf6", href: `/rh/catalogos` },
  ];

  const tabs = [
    { key: "alertas"    as const, label: "Alertas",    icon: Bell,          count: alertas.length,                          color: "#ef4444" },
    { key: "vacaciones" as const, label: "Vacaciones", icon: Sun,           count: (d.proximas_vacaciones ?? []).length,    color: "#14b8a6" },
    { key: "prestamos"  as const, label: "Préstamos",  icon: Wallet,        count: (d.prestamos_pendientes ?? []).length,   color: "#a855f7" },
  ];
  const activeTabColor = tabs.find(t => t.key === activeTab)?.color ?? "#3b82f6";

  return (
    <>
      <ChecadasModal open={checadasOpen} onClose={() => setChecadasOpen(false)} />
      <div className="p-5 space-y-5 max-w-[1600px] mx-auto">

        {/* ── Hero Header ── */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1a4d6b 50%, #0f3d3d 100%)" }}
        >
          {/* glow blobs */}
          <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
          <div className="absolute -bottom-6 right-20 w-32 h-32 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }} />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300/80">Transportes Migmar · Portal Corporativo</p>
            <h1 className="text-2xl font-black text-white mt-0.5">Dashboard Recursos Humanos</h1>
            <p className="text-sm text-blue-200/60 mt-0.5">Estadísticas y gestión en tiempo real</p>
          </div>
          <div className="relative flex items-center gap-2.5 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/15">
            <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center">
              <Cake size={15} className="text-blue-300" />
            </div>
            <span className="text-sm font-semibold text-white capitalize">{today}</span>
          </div>
        </div>

        {/* ── Row 1 KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            color="#3b82f6" icon={Users} label="Plantilla Total" value={d.total_empleados ?? 0}
            badge={`${d.total_departamentos ?? 0} departamentos`}
            footer={
              <div className="grid grid-cols-2 text-center">
                <div className="border-r" style={{ borderColor: "#3b82f620" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Activos</p>
                  <p className="text-xl font-black text-green-500 mt-0.5">{d.empleados_activos ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Inactivos</p>
                  <p className="text-xl font-black text-slate-400 dark:text-slate-500 mt-0.5">{d.empleados_inactivos ?? 0}</p>
                </div>
              </div>
            }
          />
          <KpiCard
            color="#22c55e" icon={UserX} label="Personal Activo" value={d.empleados_activos ?? 0}
            badge={`${d.empleados_activos_porcentaje ?? 0}% operatividad`}
            footer={
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-green-500">{d.empleados_activos_porcentaje ?? 0}%</span>
                  <span className="text-slate-400 dark:text-slate-500">Operatividad</span>
                </div>
                <Bar pct={d.empleados_activos_porcentaje ?? 0} color="#22c55e" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Excluye empleados en papelera</p>
              </div>
            }
          />
          <KpiCard
            color="#64748b" icon={Users} label="Personal Inactivo" value={d.empleados_inactivos ?? 0}
            badge={`${d.empleados_inactivos_porcentaje ?? 0}% inactividad`}
            footer={
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">{d.empleados_inactivos_porcentaje ?? 0}%</span>
                  <span className="text-slate-400 dark:text-slate-500">Inactividad</span>
                </div>
                <Bar pct={d.empleados_inactivos_porcentaje ?? 0} color="#64748b" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Bajas y renuncias</p>
              </div>
            }
          />

          <EmpleadosEmpresaCard
            operadoresList={operadoresList}
            totalOperadores={totalOperadores}
            hiddenIds={hiddenIds}
            onToggle={handleToggleEmpresa}
          />
        </div>

        {/* ── Row 2 KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            color="#14b8a6" icon={Sun} label="Vacaciones" value={d.vacaciones_activas ?? 0}
            badge={`${d.vacaciones_pendientes ?? 0} pendientes`}
            footer={
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-teal-500">{vacProg}%</span>
                  <span className="text-slate-400 dark:text-slate-500">Progreso año</span>
                </div>
                <Bar pct={vacProg} color="#14b8a6" />
              </div>
            }
          />
          <KpiCard
            color="#a855f7" icon={Banknote} label="Préstamos Activos" value={d.prestamos_activos ?? 0}
            badge={`$${fmt(d.total_prestamos_activos ?? 0)} saldo`}
            footer={
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-purple-500">{prestProg}%</span>
                  <span className="text-slate-400 dark:text-slate-500">Pagado total</span>
                </div>
                <Bar pct={prestProg} color="#a855f7" />
              </div>
            }
          />
          <KpiCard
            color="#f97316" icon={Trash2} label="Papelera" value={d.total_eliminados ?? 0}
            badge="Empleados eliminados"
            footer={
              <a
                href={`${API_BASE}/rh/papelera/`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "#f9731618", color: "#f97316", border: "1px solid #f9731625" }}
              >
                Ver Papelera <ExternalLink size={11} />
              </a>
            }
          />
          {d.user_is_superuser ? (
            <div
              className="rounded-2xl p-5 overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 100%)" }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #34d399, transparent)", transform: "translate(30%,-30%)" }} />
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/70 mb-4">Administración BD</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: CloudDownload, label: "Exportar", href: `${API_BASE}/rh/exportar-completo/` },
                  { icon: CloudUpload,   label: "Importar", href: `${API_BASE}/rh/importar-completo/` },
                ].map((btn) => (
                  <a
                    key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer"
                    className="text-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                  >
                    <btn.icon size={20} className="mx-auto mb-1.5 text-emerald-200" />
                    <p className="text-xs font-bold text-emerald-100">{btn.label}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-5 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-xs text-slate-300 dark:text-slate-600 text-center font-medium">
                Panel de administración<br />disponible para superusuarios
              </p>
            </div>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── Left ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Centro de Comando */}
            <SectionCard title="Centro de Comando" badge="Acciones Rápidas" accentColor="#3b82f6">
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/30">
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5">
                  {quickActions.map((qa, i) => <QuickAction key={i} {...qa} />)}
                </div>
              </div>
            </SectionCard>

            {/* Distribución + Cumpleaños */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Donut */}
              <SectionCard
                title="Distribución de Personal"
                badge={`Total: ${d.total_empleados ?? 0}`}
                accentColor="#a855f7"
                badgeColor="#a855f7"
              >
                <div className="p-5">
                  {(d.departamento_distribucion ?? []).length > 0 ? (
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                      <div className="relative shrink-0 w-44 h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={d.departamento_distribucion} dataKey="count" nameKey="nombre" innerRadius="65%" outerRadius="88%" paddingAngle={3} strokeWidth={0}>
                              {d.departamento_distribucion.map((_, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Pie>
                            <RechartsTip
                              contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 12 }}
                              formatter={(v) => [`${v} empleados`] as [string]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{d.total_departamentos ?? 0}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Deptos</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-44">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                              <th className="text-left pb-2">Departamento</th>
                              <th className="text-right pb-2">Cant.</th>
                              <th className="text-right pb-2">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.departamento_distribucion.map((dept, i) => (
                              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60">
                                <td className="py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                    <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{dept.nombre}</span>
                                  </div>
                                </td>
                                <td className="text-right py-1.5 font-black text-slate-800 dark:text-white">{dept.count}</td>
                                <td className="text-right py-1.5 text-slate-400 dark:text-slate-500">
                                  {d.total_empleados ? Math.round((dept.count / d.total_empleados) * 100) : 0}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-600">
                      <Users size={30} className="mb-2" />
                      <p className="text-sm">Sin datos de distribución</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Cumpleaños */}
              <div
                className="rounded-2xl p-5 flex flex-col overflow-hidden relative"
                style={{ background: "linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)" }}
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }} />
                <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #6ee7b7, transparent)", transform: "translate(-30%, 30%)" }} />
                <div className="text-center mb-4 relative">
                  <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/20 backdrop-blur-sm">
                    <Cake size={26} className="text-white" />
                  </div>
                  <h3 className="font-black text-white text-base">Hoy, {todayShort}</h3>
                  <p className="text-blue-200/70 text-xs font-semibold mt-0.5">{(d.cumpleanos_hoy ?? []).length} cumpleaños</p>
                </div>
                <div className="flex-1 overflow-y-auto max-h-44 space-y-2 bg-white/8 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  {(d.cumpleanos_hoy ?? []).length > 0 ? (
                    d.cumpleanos_hoy.map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 pb-2 border-b border-white/10 last:border-0 last:pb-0">
                        <div className="w-9 h-9 shrink-0 bg-white rounded-full flex items-center justify-center font-black text-blue-600 text-sm shadow-sm">
                          {item.empleado.nombre?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm leading-tight truncate">
                            {item.empleado.nombre} {item.empleado.apellido}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">{item.edad_a_cumplir} Años</span>
                            {item.empleado.puesto?.nombre && (
                              <span className="text-[10px] text-blue-200/70 truncate">{item.empleado.puesto.nombre}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 opacity-60">
                      <Cake size={24} className="mb-1.5 text-white" />
                      <p className="text-xs font-semibold text-white text-center">Sin cumpleaños hoy</p>
                    </div>
                  )}
                </div>
                <a
                  href={`${API_BASE}/rh/cumpleanos/`} target="_blank" rel="noopener noreferrer"
                  className="mt-4 w-full text-center py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-all backdrop-blur-sm relative"
                >
                  Ver Calendario Completo →
                </a>
              </div>
            </div>
          </div>

          {/* ── Right — Tab Panel ── */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col bg-white dark:bg-slate-900 shadow-sm" style={{ minHeight: 600 }}>

            {/* Tab header */}
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }} className="rounded-t-2xl">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-bold transition-all relative"
                    style={{
                      color: activeTab === tab.key ? "#fff" : "rgba(148,163,184,0.7)",
                      borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                    }}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                        style={
                          activeTab === tab.key
                            ? { background: tab.color, color: "#fff" }
                            : { background: "rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.8)" }
                        }
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Alertas ── */}
              {activeTab === "alertas" && (
                alertas.length > 0 ? (
                  <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                    {alertas.map((alerta, i) => {
                      const cfg = alerta.tipo === "danger"
                        ? { bg: "#fef2f2", darkBg: "#450a0a30", icon: AlertTriangle, color: "#ef4444" }
                        : alerta.tipo === "warning"
                        ? { bg: "#fff7ed", darkBg: "#431407 30", icon: Clock, color: "#f97316" }
                        : { bg: "#eff6ff", darkBg: "#1e3a5f30", icon: Info, color: "#3b82f6" };
                      return (
                        <li key={i} className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex gap-3">
                            <div
                              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}25` }}
                            >
                              <cfg.icon size={15} style={{ color: cfg.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1 mb-1">
                                <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{alerta.titulo}</p>
                                {alerta.fecha && (
                                  <span className="text-[10px] text-slate-400 shrink-0 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {new Date(alerta.fecha).toLocaleDateString("es-MX")}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mb-2">
                                {alerta.empleado_id ? (
                                  <Link
                                    href={`/rh/empleados/${alerta.empleado_id}/editar`}
                                    className="font-semibold hover:underline transition-colors"
                                    style={{ color: cfg.color }}
                                  >
                                    {alerta.descripcion} <ExternalLink size={9} className="inline" />
                                  </Link>
                                ) : alerta.descripcion}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {alerta.empresa && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-semibold">
                                    <Factory size={8} /> {alerta.empresa}
                                  </span>
                                )}
                                {alerta.division && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md font-semibold">
                                    <MapPin size={8} /> {alerta.division}
                                  </span>
                                )}
                                {alerta.departamento && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-semibold">
                                    <Building2 size={8} /> {alerta.departamento}
                                  </span>
                                )}
                                {alerta.puesto && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-semibold">
                                    <Briefcase size={8} /> {alerta.puesto}
                                  </span>
                                )}
                                {alerta.categoria && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-bold">
                                    <Tag size={8} /> {alerta.categoria}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#22c55e18", border: "1px solid #22c55e25" }}>
                      <Check size={28} className="text-green-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white">¡Todo al día!</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">No hay contratos por vencer ni documentos caducados.</p>
                  </div>
                )
              )}

              {/* ── Vacaciones ── */}
              {activeTab === "vacaciones" && (
                (d.proximas_vacaciones ?? []).length > 0 ? (
                  <>
                    <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                      {d.proximas_vacaciones.map((vac, i) => (
                        <li key={i} className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "#14b8a618", border: "1px solid #14b8a625" }}>
                              <PlaneTakeoff size={18} className="text-teal-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{vac.empleado.nombre_completo}</p>
                                <span className="text-xs font-black bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-lg shrink-0 ml-1">{vac.dias}d</span>
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1.5">
                                {new Date(vac.fecha_inicio + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })} →{" "}
                                {new Date(vac.fecha_fin + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                  vac.estado === "aprobado"  ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" :
                                  vac.estado === "pendiente" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" :
                                  "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                                }`}>
                                  {vac.estado === "aprobado" ? "✓ Aprobado" : vac.estado === "pendiente" ? "⏳ Pendiente" : "✗ Rechazado"}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">{vac.dias_restantes}d restantes</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0">
                      <a href={`${API_BASE}/rh/solicitar-vacacion/`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: "#14b8a615", color: "#14b8a6", border: "1px solid #14b8a625" }}>
                        + Nueva Solicitud
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#14b8a618", border: "1px solid #14b8a625" }}>
                      <Sun size={28} className="text-teal-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Sin próximas vacaciones</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">No hay descansos programados.</p>
                    <a href={`${API_BASE}/rh/solicitar-vacacion/`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
                      style={{ background: "#14b8a615", color: "#14b8a6", border: "1px solid #14b8a625" }}>
                      + Crear Solicitud
                    </a>
                  </div>
                )
              )}

              {/* ── Préstamos ── */}
              {activeTab === "prestamos" && (
                (d.prestamos_pendientes ?? []).length > 0 ? (
                  <>
                    <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                      {d.prestamos_pendientes.map((prest, i) => (
                        <li key={i} className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "#a855f718", border: "1px solid #a855f725" }}>
                              <Wallet size={18} className="text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{prest.empleado.nombre_completo}</p>
                                <span className="text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ml-1" style={{ background: "#a855f715", color: "#a855f7" }}>
                                  ${fmt(prest.monto_total)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1.5">Plazo: {prest.plazo_meses} meses</p>
                              <Bar pct={Math.min(100, prest.progreso_pago ?? 0)} color="#a855f7" />
                              <div className="flex justify-between text-xs mt-1.5">
                                <span className="text-slate-400 dark:text-slate-500 font-semibold">Pagado: ${fmt(prest.monto_pagado)}</span>
                                <span className="font-bold" style={{ color: "#a855f7" }}>Resta: ${fmt(prest.saldo_pendiente)}</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0">
                      <a href={`${API_BASE}/rh/solicitar-prestamo/`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: "#a855f715", color: "#a855f7", border: "1px solid #a855f725" }}>
                        + Nuevo Préstamo
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#a855f718", border: "1px solid #a855f725" }}>
                      <Wallet size={28} className="text-purple-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white">No hay préstamos activos</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">La nómina está limpia de deducciones.</p>
                    <a href={`${API_BASE}/rh/solicitar-prestamo/`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
                      style={{ background: "#a855f715", color: "#a855f7", border: "1px solid #a855f725" }}>
                      + Otorgar Préstamo
                    </a>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center rounded-b-2xl">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                <RefreshCw size={9} className="inline mr-1" />
                Actualizado: {new Date().toLocaleDateString("es-MX")} · {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
