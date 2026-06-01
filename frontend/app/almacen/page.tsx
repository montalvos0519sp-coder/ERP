"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Box, Boxes, CalendarClock,
  CheckCircle2, ClipboardList, DollarSign, FileBarChart, Layers, MoveHorizontal,
  Package, PackageCheck, Plus, QrCode, RefreshCw, Sparkles, Tag, TrendingDown,
  TrendingUp, Warehouse,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

/* ─────────────────────────────────────────────────────────────────────────
   Paleta profesional del modulo. Cada acento es un par de tonos coherentes
   (mismo nivel de saturacion) para dar VARIEDAD sin perder sobriedad. Se
   reutiliza en KPIs, barras y tarjetas de navegacion.
   ───────────────────────────────────────────────────────────────────────── */
type Accent = {
  grad: string;      // gradiente para fondos/iconos
  text: string;      // texto/icono solido
  soft: string;      // fondo translucido suave
  ring: string;      // borde al hover
  bar: string;       // relleno de barras
};

const ACCENTS: Record<string, Accent> = {
  indigo:  { grad: "from-indigo-500 to-violet-600",  text: "text-indigo-500",  soft: "bg-indigo-500/12 text-indigo-500",   ring: "hover:border-indigo-400/50",  bar: "bg-gradient-to-r from-indigo-500 to-violet-500" },
  emerald: { grad: "from-emerald-500 to-teal-600",   text: "text-emerald-500", soft: "bg-emerald-500/12 text-emerald-500", ring: "hover:border-emerald-400/50", bar: "bg-gradient-to-r from-emerald-500 to-teal-500" },
  sky:     { grad: "from-sky-500 to-cyan-600",       text: "text-sky-500",     soft: "bg-sky-500/12 text-sky-500",         ring: "hover:border-sky-400/50",     bar: "bg-gradient-to-r from-sky-500 to-cyan-500" },
  amber:   { grad: "from-amber-500 to-orange-600",   text: "text-amber-500",   soft: "bg-amber-500/12 text-amber-600",     ring: "hover:border-amber-400/50",   bar: "bg-gradient-to-r from-amber-500 to-orange-500" },
  rose:    { grad: "from-rose-500 to-pink-600",      text: "text-rose-500",    soft: "bg-rose-500/12 text-rose-500",       ring: "hover:border-rose-400/50",    bar: "bg-gradient-to-r from-rose-500 to-pink-500" },
  blue:    { grad: "from-blue-500 to-indigo-600",    text: "text-blue-500",    soft: "bg-blue-500/12 text-blue-500",       ring: "hover:border-blue-400/50",    bar: "bg-gradient-to-r from-blue-500 to-indigo-500" },
  violet:  { grad: "from-violet-500 to-purple-600",  text: "text-violet-500",  soft: "bg-violet-500/12 text-violet-500",   ring: "hover:border-violet-400/50",  bar: "bg-gradient-to-r from-violet-500 to-purple-500" },
  cyan:    { grad: "from-cyan-500 to-teal-600",       text: "text-cyan-500",    soft: "bg-cyan-500/12 text-cyan-600",       ring: "hover:border-cyan-400/50",    bar: "bg-gradient-to-r from-cyan-500 to-teal-500" },
  teal:    { grad: "from-teal-500 to-emerald-600",   text: "text-teal-500",    soft: "bg-teal-500/12 text-teal-600",       ring: "hover:border-teal-400/50",    bar: "bg-gradient-to-r from-teal-500 to-emerald-500" },
  fuchsia: { grad: "from-fuchsia-500 to-pink-600",   text: "text-fuchsia-500", soft: "bg-fuchsia-500/12 text-fuchsia-500", ring: "hover:border-fuchsia-400/50", bar: "bg-gradient-to-r from-fuchsia-500 to-pink-500" },
};

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
  APROBADO:    "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  CANCELADO:   "bg-rose-500/15 text-rose-500 border-rose-500/30",
  EN_TRANSITO: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

const MXN = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(v || 0));
const NUM = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX").format(Number(v || 0));

interface AlertaRow {
  id: number; tipo?: string; tipo_display?: string; nivel?: string;
  producto_nombre?: string; producto_codigo?: string; almacen_nombre?: string;
  fecha?: string; creado?: string; dias_restantes?: number | null;
}
interface MovRow {
  id: number; folio?: string; tipo?: string; tipo_display?: string; estado?: string;
  almacen_origen_nombre?: string; almacen_destino_nombre?: string;
  fecha?: string; creado?: string; total_lineas?: number;
}
interface LoteRow {
  id: number; numero_lote?: string; producto_nombre?: string;
  fecha_caducidad?: string; cantidad_actual?: number | string;
}
interface PorAlmacen { almacen__nombre?: string; almacen__codigo?: string; total?: number | string; }

export default function AlmacenDashboardPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [resumen, setResumen] = useState<any>(null);
  const [alertas, setAlertas] = useState<AlertaRow[]>([]);
  const [movimientos, setMovimientos] = useState<MovRow[]>([]);
  const [porAlmacen, setPorAlmacen] = useState<PorAlmacen[]>([]);
  const [topValor, setTopValor] = useState<any[]>([]);
  const [lotes, setLotes] = useState<LoteRow[]>([]);

  const cargar = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [r, a, m, pa, val, lo] = await Promise.all([
        api.getDashboardAlmacen().catch(() => null),
        api.getAlertasAlmacen({ atendida: "false", page_size: "6", ordering: "-creado" }).catch(() => ({ results: [] })),
        api.getMovimientosAlmacen({ page_size: "6", ordering: "-creado" }).catch(() => ({ results: [] })),
        api.getExistenciasPorAlmacen().catch(() => []),
        api.getExistenciasValorizacion().catch(() => ({ filas: [] })),
        api.getLotesPorCaducar({ dias: "30" }).catch(() => ([] as any)),
      ]);
      setResumen(r);
      setAlertas((a?.results || []) as AlertaRow[]);
      setMovimientos((m?.results || []) as MovRow[]);
      setPorAlmacen((Array.isArray(pa) ? pa : []) as PorAlmacen[]);
      const filas = (val?.filas || []) as any[];
      setTopValor([...filas].sort((x, y) => (y.valor || 0) - (x.valor || 0)).slice(0, 5));
      setLotes((Array.isArray(lo) ? lo : lo?.results || []).slice(0, 6) as LoteRow[]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const generarAlertas = async () => {
    setGenerando(true);
    try { await api.generarAlertasAlmacen(); await cargar(true); }
    catch { /* silencioso */ }
    finally { setGenerando(false); }
  };

  const maxAlmacen = useMemo(
    () => Math.max(1, ...porAlmacen.map((p) => Number(p.total || 0))),
    [porAlmacen],
  );
  const maxValor = useMemo(
    () => Math.max(1, ...topValor.map((p) => Number(p.valor || 0))),
    [topValor],
  );

  const card = isDarkMode
    ? "bg-[#0F172A]/70 border-white/[0.05]"
    : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${ACCENTS.indigo.grad}`}>
            <Warehouse className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Almacén</h1>
            <p className={`text-sm ${theme.textSecondary}`}>
              Inventario, movimientos, lotes y alertas en tiempo real.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn primary accent="indigo" icon={Plus} label="Nuevo producto" onClick={() => router.push("/almacen/productos")} />
          <ActionBtn isDark={isDarkMode} icon={MoveHorizontal} label="Movimiento" onClick={() => router.push("/almacen/movimientos")} />
          <ActionBtn isDark={isDarkMode} icon={Sparkles} label={generando ? "Generando…" : "Generar alertas"} onClick={generarAlertas} disabled={generando} />
          <button onClick={() => cargar(true)} disabled={refreshing}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
              isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`} title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi isDark={isDarkMode} accent="indigo"  icon={Package}      label="Productos activos" value={loading ? "…" : NUM(resumen?.productos_activos ?? resumen?.productos)} sub={resumen ? `${NUM(resumen.productos)} totales` : ""} />
        <Kpi isDark={isDarkMode} accent="emerald" icon={DollarSign}   label="Valor inventario"  value={loading ? "…" : MXN(resumen?.valor_inventario)} sub="costo promedio" />
        <Kpi isDark={isDarkMode} accent="sky"     icon={Warehouse}    label="Almacenes"         value={loading ? "…" : NUM(resumen?.almacenes)} sub={resumen ? `${NUM(resumen.existencias)} existencias` : ""} />
        <Kpi isDark={isDarkMode} accent="violet"  icon={ClipboardList} label="Por aprobar"      value={loading ? "…" : NUM(resumen?.movimientos_borrador)} sub={resumen ? `${NUM(resumen.movimientos_aprobados_hoy)} hoy` : ""} />
        <Kpi isDark={isDarkMode} accent="amber"   icon={Bell}         label="Alertas"           value={loading ? "…" : NUM(resumen?.alertas_pendientes)} sub="pendientes" />
        <Kpi isDark={isDarkMode} accent="rose"    icon={AlertTriangle} label="Críticas"         value={loading ? "…" : NUM(resumen?.alertas_criticas)} sub="requieren acción" />
      </div>

      {/* ── Fila central: distribucion + top valor ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribucion por almacen */}
        <div className={`rounded-3xl border p-5 ${card}`}>
          <PanelHeader theme={theme} accent="sky" icon={Boxes} title="Existencias por almacén"
            onMore={() => router.push("/almacen/almacenes")} />
          {loading ? <EmptyText theme={theme} text="Cargando…" />
            : porAlmacen.length === 0 ? <EmptyText theme={theme} text="Sin existencias registradas." />
            : (
              <div className="space-y-3 mt-1">
                {porAlmacen.slice(0, 6).map((p, i) => {
                  const pct = Math.round((Number(p.total || 0) / maxAlmacen) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold truncate ${theme.textPrimary}`}>{p.almacen__nombre || p.almacen__codigo || "—"}</span>
                        <span className={`text-xs font-black tabular-nums ${theme.textSecondary}`}>{NUM(p.total)}</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                        <div className={`h-full rounded-full ${ACCENTS.sky.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Top productos por valor */}
        <div className={`rounded-3xl border p-5 ${card}`}>
          <PanelHeader theme={theme} accent="emerald" icon={TrendingUp} title="Top productos por valor"
            onMore={() => router.push("/almacen/reportes")} />
          {loading ? <EmptyText theme={theme} text="Cargando…" />
            : topValor.length === 0 ? <EmptyText theme={theme} text="Sin valorización disponible." />
            : (
              <div className="space-y-3 mt-1">
                {topValor.map((p, i) => {
                  const pct = Math.round((Number(p.valor || 0) / maxValor) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className={`text-xs font-bold truncate ${theme.textPrimary}`}>
                          {p.producto_sku ? `${p.producto_sku} · ` : ""}{p.producto_nombre || "—"}
                        </span>
                        <span className="text-xs font-black tabular-nums text-emerald-500 shrink-0">{MXN(p.valor)}</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                        <div className={`h-full rounded-full ${ACCENTS.emerald.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* ── Fila: alertas + lotes por caducar ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas */}
        <div className={`rounded-3xl border p-5 ${card}`}>
          <PanelHeader theme={theme} accent="amber" icon={AlertTriangle} title="Últimas alertas"
            onMore={() => router.push("/almacen/alertas")} />
          {loading ? <EmptyText theme={theme} text="Cargando…" />
            : alertas.length === 0 ? <EmptyOk theme={theme} text="Sin alertas activas. Todo en orden." />
            : (
              <ul className={`divide-y ${theme.divider}`}>
                {alertas.map((a) => {
                  const critica = (a.nivel || "").toUpperCase() === "CRITICA";
                  const ac = critica ? ACCENTS.rose : ACCENTS.amber;
                  return (
                    <li key={a.id} className="py-2.5 flex items-start gap-3">
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${ac.soft}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>
                          {a.producto_nombre || a.producto_codigo || `Alerta #${a.id}`}
                        </div>
                        <div className={`text-xs ${theme.textTertiary} truncate`}>
                          {a.tipo_display || a.tipo || "Alerta"}
                          {a.almacen_nombre ? ` · ${a.almacen_nombre}` : ""}
                          {a.dias_restantes != null ? ` · ${a.dias_restantes} días` : ""}
                        </div>
                      </div>
                      {critica && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                          Crítica
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
        </div>

        {/* Lotes por caducar */}
        <div className={`rounded-3xl border p-5 ${card}`}>
          <PanelHeader theme={theme} accent="cyan" icon={CalendarClock} title="Lotes por caducar (30 días)"
            onMore={() => router.push("/almacen/lotes")} />
          {loading ? <EmptyText theme={theme} text="Cargando…" />
            : lotes.length === 0 ? <EmptyOk theme={theme} text="Ningún lote próximo a caducar." />
            : (
              <ul className={`divide-y ${theme.divider}`}>
                {lotes.map((l) => {
                  const dias = l.fecha_caducidad
                    ? Math.ceil((new Date(l.fecha_caducidad).getTime() - Date.now()) / 86400000)
                    : null;
                  const urgente = dias != null && dias <= 7;
                  return (
                    <li key={l.id} className="py-2.5 flex items-start gap-3">
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${urgente ? ACCENTS.rose.soft : ACCENTS.cyan.soft}`}>
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>
                          {l.producto_nombre || "—"}
                        </div>
                        <div className={`text-xs ${theme.textTertiary} truncate`}>
                          Lote {l.numero_lote || "—"}{l.cantidad_actual != null ? ` · ${NUM(l.cantidad_actual)} u` : ""}
                        </div>
                      </div>
                      <span className={`text-[11px] font-black shrink-0 ${urgente ? "text-rose-500" : "text-cyan-600"}`}>
                        {dias != null ? `${dias} d` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      </div>

      {/* ── Ultimos movimientos ───────────────────────────────────────── */}
      <div className={`rounded-3xl border p-5 ${card}`}>
        <PanelHeader theme={theme} accent="violet" icon={ClipboardList} title="Últimos movimientos"
          onMore={() => router.push("/almacen/movimientos")} />
        {loading ? <EmptyText theme={theme} text="Cargando…" />
          : movimientos.length === 0 ? <EmptyText theme={theme} text="Sin movimientos recientes." />
          : (
            <ul className={`divide-y ${theme.divider}`}>
              {movimientos.map((m) => (
                <li key={m.id} className="py-2.5 flex items-center gap-3">
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${ACCENTS.violet.soft}`}>
                    <Box className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>
                      {m.folio || `MOV-${m.id}`} · {m.tipo_display || m.tipo}
                    </div>
                    <div className={`text-xs ${theme.textTertiary} truncate`}>
                      {m.almacen_origen_nombre && `${m.almacen_origen_nombre} `}
                      {m.almacen_destino_nombre && `→ ${m.almacen_destino_nombre}`}
                      {m.total_lineas ? ` · ${m.total_lineas} líneas` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {m.estado && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${ESTADO_COLOR[m.estado] || ESTADO_COLOR.BORRADOR}`}>
                        {m.estado}
                      </span>
                    )}
                    <span className={`text-[11px] ${theme.textTertiary} hidden sm:block`}>
                      {m.fecha || m.creado ? new Date(m.fecha || m.creado || "").toLocaleDateString("es-MX") : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* ── Navegacion completa del modulo ────────────────────────────── */}
      <div>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>Módulos de almacén</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <NavCard isDark={isDarkMode} accent="indigo"  icon={Package}      label="Productos"      desc="Catálogo y SKU"        onClick={() => router.push("/almacen/productos")} />
          <NavCard isDark={isDarkMode} accent="emerald" icon={PackageCheck} label="Existencias"    desc="Stock disponible"      onClick={() => router.push("/almacen/existencias")} />
          <NavCard isDark={isDarkMode} accent="sky"     icon={Warehouse}    label="Almacenes"      desc="Ubicaciones y zonas"   onClick={() => router.push("/almacen/almacenes")} />
          <NavCard isDark={isDarkMode} accent="violet"  icon={Layers}       label="Movimientos"    desc="Entradas y salidas"    onClick={() => router.push("/almacen/movimientos")} />
          <NavCard isDark={isDarkMode} accent="cyan"    icon={MoveHorizontal} label="Transferencias" desc="Entre almacenes"      onClick={() => router.push("/almacen/transferencias")} />
          <NavCard isDark={isDarkMode} accent="blue"    icon={BarChart3}    label="Kardex"         desc="Historial valuado"     onClick={() => router.push("/almacen/kardex")} />
          <NavCard isDark={isDarkMode} accent="teal"    icon={CalendarClock} label="Lotes"         desc="Caducidad y trazas"    onClick={() => router.push("/almacen/lotes")} />
          <NavCard isDark={isDarkMode} accent="fuchsia" icon={QrCode}       label="Etiquetas"      desc="Códigos de barras"     onClick={() => router.push("/almacen/etiquetas")} />
          <NavCard isDark={isDarkMode} accent="amber"   icon={Bell}         label="Alertas"        desc="Mínimos y caducidad"   onClick={() => router.push("/almacen/alertas")} />
          <NavCard isDark={isDarkMode} accent="rose"    icon={FileBarChart} label="Reportes"       desc="Valuación y rotación"  onClick={() => router.push("/almacen/reportes")} />
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponentes ──────────────────────────────────────────────────── */

function ActionBtn({ primary, accent = "indigo", isDark, icon: Icon, label, onClick, disabled }: {
  primary?: boolean; accent?: keyof typeof ACCENTS; isDark?: boolean;
  icon: any; label: string; onClick: () => void; disabled?: boolean;
}) {
  if (primary) {
    return (
      <button onClick={onClick} disabled={disabled}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100 bg-gradient-to-r ${ACCENTS[accent].grad}`}>
        <Icon className="w-4 h-4" /> {label}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
        isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function Kpi({ isDark, accent, icon: Icon, label, value, sub }: {
  isDark: boolean; accent: keyof typeof ACCENTS; icon: any; label: string; value: string; sub?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-lg ${
      isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"
    }`}>
      <div className={`absolute -right-7 -top-7 w-24 h-24 rounded-full bg-gradient-to-br ${a.grad} opacity-[0.18]`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-gradient-to-br ${a.grad} shadow-sm`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-black mt-0.5 tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}

function PanelHeader({ theme, accent, icon: Icon, title, onMore }: {
  theme: any; accent: keyof typeof ACCENTS; icon: any; title: string; onMore: () => void;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${a.soft}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textPrimary}`}>{title}</h2>
      </div>
      <button onClick={onMore} className={`text-xs font-bold inline-flex items-center gap-1 ${theme.textSecondary} ${a.text} hover:opacity-80 transition-opacity`}>
        Ver todo <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function EmptyText({ theme, text }: { theme: any; text: string }) {
  return <div className={`py-8 text-center text-sm ${theme.textTertiary}`}>{text}</div>;
}

function EmptyOk({ theme, text }: { theme: any; text: string }) {
  return (
    <div className="py-8 flex flex-col items-center gap-2">
      <CheckCircle2 className="w-7 h-7 text-emerald-500/70" />
      <span className={`text-sm ${theme.textTertiary}`}>{text}</span>
    </div>
  );
}

function NavCard({ isDark, accent, icon: Icon, label, desc, onClick }: {
  isDark: boolean; accent: keyof typeof ACCENTS; icon: any; label: string; desc: string; onClick: () => void;
}) {
  const a = ACCENTS[accent];
  return (
    <button onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
        isDark ? `bg-[#0F172A]/70 border-white/[0.05] ${a.ring}` : `bg-white border-slate-200/70 ${a.ring}`
      }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 bg-gradient-to-br ${a.grad} shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.1} />
      </div>
      <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{label}</div>
      <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{desc}</div>
    </button>
  );
}
