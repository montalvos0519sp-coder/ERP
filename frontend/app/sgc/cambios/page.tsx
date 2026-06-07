"use client";

// SGC · Gestión de Cambios (ISO 9001 · 6.3).
// Planificación de cambios al SGC: propósito, consecuencias, recursos e
// integridad — con asistente guiado, matriz de riesgo, plan de acción,
// flujo de aprobación visual, tablero por estado y métricas.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Replace, Plus, RefreshCw, X, Search, Download, LayoutGrid, List,
  CheckCircle2, Clock, ThumbsUp, ThumbsDown, Rocket, FileText, ChevronRight, ChevronLeft,
  AlertTriangle, Coins, ShieldCheck, Calendar, User, Info, ListChecks, Flag, Layers,
  Gauge, Target, Trash2, Check, CircleHelp, ChevronDown, ChevronUp,
} from "lucide-react";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario, Avatar } from "@/components/sgc/Colaboracion";

// Flujo del ciclo de vida de un cambio (orden de avance).
const FLUJO = ["PROPUESTO", "APROBADO", "EN_PROCESO", "IMPLEMENTADO"];
const ESTADOS: [string, string][] = [
  ["PROPUESTO", "Propuesto"], ["APROBADO", "Aprobado"], ["EN_PROCESO", "En proceso"],
  ["IMPLEMENTADO", "Implementado"], ["RECHAZADO", "Rechazado"],
];
const EST_META: Record<string, { label: string; color: string; icon: any; chip: string }> = {
  PROPUESTO: { label: "Propuesto", color: "#94A3B8", icon: Clock, chip: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  APROBADO: { label: "Aprobado", color: "#0EA5E9", icon: ThumbsUp, chip: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  EN_PROCESO: { label: "En proceso", color: "#F59E0B", icon: Rocket, chip: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  IMPLEMENTADO: { label: "Implementado", color: "#10B981", icon: CheckCircle2, chip: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  RECHAZADO: { label: "Rechazado", color: "#F43F5E", icon: ThumbsDown, chip: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
};

// Categoría del cambio (6.3 — para análisis y trazabilidad).
const TIPOS: [string, string][] = [
  ["PROCESO", "Proceso"], ["DOCUMENTO", "Documento"], ["INFRAESTRUCTURA", "Infraestructura"],
  ["PROVEEDOR", "Proveedor"], ["ORGANIZACIONAL", "Organizacional"], ["TECNOLOGICO", "Tecnológico"],
  ["PRODUCTO", "Producto/Servicio"], ["OTRO", "Otro"],
];
const TIPO_META: Record<string, { color: string; icon: any }> = {
  PROCESO: { color: "#0EA5E9", icon: Replace }, DOCUMENTO: { color: "#6366F1", icon: FileText },
  INFRAESTRUCTURA: { color: "#8B5CF6", icon: Layers }, PROVEEDOR: { color: "#0891B2", icon: User },
  ORGANIZACIONAL: { color: "#A855F7", icon: User }, TECNOLOGICO: { color: "#14B8A6", icon: Gauge },
  PRODUCTO: { color: "#F97316", icon: Target }, OTRO: { color: "#94A3B8", icon: Layers },
};

const PRIORIDADES: [string, string][] = [["BAJA", "Baja"], ["MEDIA", "Media"], ["ALTA", "Alta"], ["CRITICA", "Crítica"]];
const PRIO_META: Record<string, { color: string; chip: string }> = {
  BAJA: { color: "#94A3B8", chip: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  MEDIA: { color: "#0EA5E9", chip: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  ALTA: { color: "#F59E0B", chip: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  CRITICA: { color: "#EF4444", chip: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
};

const RIESGO_META: Record<string, { label: string; color: string }> = {
  SIN_EVALUAR: { label: "Sin evaluar", color: "#94A3B8" },
  BAJO: { label: "Bajo", color: "#10B981" },
  MEDIO: { label: "Medio", color: "#F59E0B" },
  ALTO: { label: "Alto", color: "#F97316" },
  EXTREMO: { label: "Extremo", color: "#EF4444" },
};
function nivelRiesgo(p: number, i: number): string {
  const s = (p || 0) * (i || 0);
  if (s <= 0) return "SIN_EVALUAR";
  if (s <= 4) return "BAJO";
  if (s <= 9) return "MEDIO";
  if (s <= 14) return "ALTO";
  return "EXTREMO";
}
function cellColor(p: number, i: number): string {
  const s = p * i;
  if (s <= 4) return "#10B981";
  if (s <= 9) return "#F59E0B";
  if (s <= 14) return "#F97316";
  return "#EF4444";
}
const lblDe = (arr: [string, string][], v: string) => arr.find(([x]) => x === v)?.[1] || v;

export default function CambiosPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [fEstado, setFEstado] = useState("TODOS");
  const [q, setQ] = useState("");
  const [vista, setVista] = useState<"tablero" | "lista">("tablero");
  const [guia, setGuia] = useState(true);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getCambios({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const cambiarEstado = async (c: any, estado: string) => {
    try {
      const extra: any = { estado };
      if (estado === "IMPLEMENTADO" && !c.fecha_implementacion) extra.fecha_implementacion = new Date().toISOString().slice(0, 10);
      const upd = await api.actualizarCambio(c.id, extra);
      load();
      if (detalle?.id === c.id) setDetalle({ ...detalle, ...extra, ...(upd || {}) });
    } catch (e) { alert((e as Error).message); }
  };

  // Guarda el plan de acción (checklist) desde el detalle sin abrir el form.
  const guardarPlan = async (c: any, plan: any[]) => {
    try {
      await api.actualizarCambio(c.id, { plan_accion: plan });
      setDetalle((d: any) => (d && d.id === c.id ? { ...d, plan_accion: plan } : d));
      setItems((arr) => arr.map((x) => (x.id === c.id ? { ...x, plan_accion: plan } : x)));
    } catch (e) { alert((e as Error).message); }
  };

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    ESTADOS.forEach(([v]) => { by[v] = items.filter((x) => x.estado === v).length; });
    const activos = (by.PROPUESTO || 0) + (by.APROBADO || 0) + (by.EN_PROCESO || 0);
    const tasa = items.length ? Math.round(((by.IMPLEMENTADO || 0) / items.length) * 100) : 0;
    const altoRiesgo = items.filter((x) => ["ALTO", "EXTREMO"].includes(nivelRiesgo(x.riesgo_probabilidad, x.riesgo_impacto))).length;
    const byTipo: Record<string, number> = {};
    TIPOS.forEach(([v]) => { byTipo[v] = items.filter((x) => x.tipo === v).length; });
    return { by, activos, tasa, total: items.length, altoRiesgo, byTipo };
  }, [items]);

  const visibles = useMemo(() => items.filter((x) => {
    if (fEstado !== "TODOS" && x.estado !== fEstado) return false;
    if (q) {
      const t = `${x.folio} ${x.titulo} ${x.descripcion} ${x.responsable_nombre || ""}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [items, fEstado, q]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #8B5CF6 0, transparent 40%), radial-gradient(circle at 90% 80%, #A855F7 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600"><Replace className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Gestión de Cambios</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-violet-500 to-purple-600">ISO 6.3</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Planifica los cambios del SGC de forma controlada: propósito, consecuencias, riesgo, recursos e integridad.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => exportCSV("cambios_sgc", ["Folio", "Título", "Tipo", "Prioridad", "Riesgo", "Estado", "Responsable", "Autorizado por", "Objetivo", "Implementación"], items.map((c) => [c.folio, c.titulo, lblDe(TIPOS, c.tipo), lblDe(PRIORIDADES, c.prioridad), RIESGO_META[nivelRiesgo(c.riesgo_probabilidad, c.riesgo_impacto)].label, c.estado_display || c.estado, c.responsable_nombre, c.autorizado_por, c.fecha_objetivo, c.fecha_implementacion]))}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nuevo cambio</button>
            </div>
          </div>
        </div>
      </div>

      {/* Guía: por qué y cómo */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button onClick={() => setGuia(!guia)} className="w-full flex items-center justify-between gap-2 px-4 py-3">
          <span className={`text-sm font-black flex items-center gap-2 ${theme.textPrimary}`}><Info className="w-4 h-4 text-violet-400" /> ¿Para qué sirve este módulo? · ¿Por qué importa?</span>
          {guia ? <ChevronUp className={`w-4 h-4 ${theme.textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${theme.textTertiary}`} />}
        </button>
        {guia && (
          <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-white/[0.06]" : "border-slate-100"}`}>
            <p className={`text-xs mt-3 mb-3 ${theme.textSecondary}`}>
              Cuando cambias un proceso, proveedor, documento o equipo "sobre la marcha", es fácil romper algo: afectar a un cliente, perder trazabilidad o dejar al equipo sin recursos. Por eso ISO 9001 <b>6.3</b> exige que los cambios del SGC se planifiquen <b>de forma controlada</b>. Este módulo te obliga a pensar antes de actuar y deja evidencia para auditoría. El método ISO 6.3:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { ic: CircleHelp, t: "a) Propósito y consecuencias", d: "¿Por qué el cambio y qué podría afectar? Anticipa impactos antes de ejecutarlo." },
                { ic: ShieldCheck, t: "b) Integridad del SGC", d: "Que el cambio no rompa la coherencia entre procesos, documentos y controles." },
                { ic: Coins, t: "c) Recursos", d: "Asegura que haya personas, presupuesto y tiempo para llevarlo a cabo." },
                { ic: User, t: "d) Responsabilidades", d: "Define quién ejecuta y quién autoriza el cambio." },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl border p-3 ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2 mb-1"><span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center"><s.ic className="w-4 h-4" /></span><span className={`text-xs font-black ${theme.textPrimary}`}>{s.t}</span></div>
                  <p className={`text-[11px] leading-snug ${theme.textTertiary}`}>{s.d}</p>
                </div>
              ))}
            </div>
            <p className={`text-[11px] mt-3 ${theme.textTertiary}`}>
              Flujo del cambio: <b className="text-slate-400">Propuesto</b> → <b className="text-sky-500">Aprobado</b> → <b className="text-amber-500">En proceso</b> → <b className="text-emerald-500">Implementado</b> (o Rechazado). Usa el asistente de "Nuevo cambio" para capturar cada punto y la matriz de riesgo para decidir cuánto control necesita.
            </p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI icon={Replace} color="#8B5CF6" label="Total de cambios" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI icon={Rocket} color="#F59E0B" label="En curso" value={stats.activos} isDark={isDarkMode} theme={theme} sub="propuestos + aprobados + en proceso" />
        <KPI icon={CheckCircle2} color="#10B981" label="Implementados" value={stats.by.IMPLEMENTADO || 0} isDark={isDarkMode} theme={theme} />
        <KPI icon={ThumbsUp} color="#0EA5E9" label="Tasa de implementación" value={`${stats.tasa}%`} isDark={isDarkMode} theme={theme} />
        <KPI icon={AlertTriangle} color="#EF4444" label="Alto riesgo" value={stats.altoRiesgo} isDark={isDarkMode} theme={theme} sub="cambios alto/extremo" />
      </div>

      {/* Distribución por tipo */}
      {stats.total > 0 && (
        <div className={`rounded-2xl border p-3 ${card}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider mr-1 ${theme.textTertiary}`}>Por tipo</span>
            {TIPOS.filter(([v]) => stats.byTipo[v] > 0).map(([v, l]) => {
              const tm = TIPO_META[v];
              return (
                <span key={v} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ borderColor: tm.color + "40", background: tm.color + "12", color: tm.color }}>
                  <tm.icon className="w-3.5 h-3.5" /> {l} <span className="tabular-nums opacity-80">{stats.byTipo[v]}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar: filtros + buscador + vista */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todos"], ...ESTADOS].map(([v, l]) => {
            const n = v === "TODOS" ? items.length : (stats.by[v] || 0);
            return (
              <button key={v} onClick={() => setFEstado(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${fEstado === v ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
                {l} <span className={`px-1 rounded ${fEstado === v ? "bg-white/20" : isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cambio…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
          <div className={`flex rounded-lg border overflow-hidden ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
            <button onClick={() => setVista("tablero")} className={`p-2 ${vista === "tablero" ? "bg-violet-500 text-white" : theme.textTertiary}`} title="Tablero"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setVista("lista")} className={`p-2 ${vista === "lista" ? "bg-violet-500 text-white" : theme.textTertiary}`} title="Lista"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><Replace className="w-10 h-10 mx-auto mb-3 text-violet-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin cambios registrados</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Planifica los cambios al SGC de forma controlada (6.3): propósito, consecuencias, recursos e integridad.</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600"><Plus className="w-4 h-4" /> Crear el primero</button></div>
      ) : vista === "tablero" ? (
        // ── TABLERO KANBAN por estado ──
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {ESTADOS.map(([est, label]) => {
            const cols = visibles.filter((c) => c.estado === est);
            const m = EST_META[est];
            return (
              <div key={est} className={`rounded-2xl border ${card}`}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: isDarkMode ? "#ffffff10" : "#0000000a" }}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: m.color }}><m.icon className="w-3.5 h-3.5" /> {label}</span>
                  <span className={`text-xs font-black tabular-nums ${theme.textTertiary}`}>{cols.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[60px]">
                  {cols.map((c) => <TarjetaCambio key={c.id} c={c} onClick={() => setDetalle(c)} isDark={isDarkMode} theme={theme} />)}
                  {cols.length === 0 && <p className={`text-[11px] text-center py-3 ${theme.textTertiary}`}>—</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ── LISTA ──
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold">Folio</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold">Cambio</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold">Tipo</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-center">Riesgo</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold">Responsable</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold">Objetivo</th>
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const m = EST_META[c.estado] || EST_META.PROPUESTO;
                  const tm = TIPO_META[c.tipo] || TIPO_META.OTRO;
                  const rn = nivelRiesgo(c.riesgo_probabilidad, c.riesgo_impacto);
                  const rm = RIESGO_META[rn];
                  return (
                    <tr key={c.id} onClick={() => setDetalle(c)} className={`border-t cursor-pointer ${isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`}>
                      <td className={`px-4 py-2.5 font-mono text-xs font-black ${theme.textTertiary}`}>{c.folio}</td>
                      <td className="px-4 py-2.5"><span className={`font-bold ${theme.textPrimary}`}>{c.titulo}</span>{c.descripcion && <p className={`text-xs line-clamp-1 ${theme.textTertiary}`}>{c.descripcion}</p>}</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: tm.color }}><tm.icon className="w-3.5 h-3.5" /> {lblDe(TIPOS, c.tipo)}</span></td>
                      <td className="px-4 py-2.5 text-center">{rn === "SIN_EVALUAR" ? <span className={`text-[11px] ${theme.textTertiary}`}>—</span> : <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: rm.color + "20", color: rm.color }}>{rm.label}</span>}</td>
                      <td className={`px-4 py-2.5 ${theme.textSecondary}`}>{c.responsable_nombre ? <span className="inline-flex items-center gap-1.5"><Avatar nombre={c.responsable_nombre} id={c.responsable_user} size={20} /> <span className="text-xs">{c.responsable_nombre}</span></span> : <span className="text-xs">—</span>}</td>
                      <td className={`px-4 py-2.5 text-xs ${theme.textTertiary}`}>{c.fecha_objetivo || "—"}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${m.chip}`}>{m.label}</span></td>
                    </tr>
                  );
                })}
                {visibles.length === 0 && <tr><td colSpan={7} className={`py-8 text-center ${theme.textTertiary}`}>Sin resultados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && <CambioModal cambio={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {detalle && <DetalleCambio c={detalle} isDark={isDarkMode} theme={theme} onClose={() => setDetalle(null)} onEditar={() => { setEdit(detalle); setDetalle(null); }} onEstado={(e: string) => cambiarEstado(detalle, e)} onPlan={(plan: any[]) => guardarPlan(detalle, plan)} />}
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, sub, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
      {sub && <div className={`text-[10px] ${theme.textTertiary}`}>{sub}</div>}
    </div>
  );
}

// Tarjeta de cambio en el kanban (con tipo, prioridad, riesgo y progreso del plan).
function TarjetaCambio({ c, onClick, isDark, theme }: any) {
  const tm = TIPO_META[c.tipo] || TIPO_META.OTRO;
  const pm = PRIO_META[c.prioridad] || PRIO_META.MEDIA;
  const rn = nivelRiesgo(c.riesgo_probabilidad, c.riesgo_impacto);
  const rm = RIESGO_META[rn];
  const plan = Array.isArray(c.plan_accion) ? c.plan_accion : [];
  const planDone = plan.filter((t: any) => t?.hecho).length;
  const planPct = plan.length ? Math.round(planDone / plan.length * 100) : 0;
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-3 transition hover:shadow-md ${isDark ? "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        {c.folio ? <span className={`font-mono text-[10px] font-black ${theme.textTertiary}`}>{c.folio}</span> : <span />}
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase" style={{ color: tm.color }}><tm.icon className="w-3 h-3" /> {lblDe(TIPOS, c.tipo)}</span>
      </div>
      <div className={`text-sm font-bold leading-tight ${theme.textPrimary}`}>{c.titulo}</div>
      {c.descripcion && <p className={`text-xs mt-1 line-clamp-2 ${theme.textSecondary}`}>{c.descripcion}</p>}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border" style={{ borderColor: pm.color + "40", background: pm.color + "14", color: pm.color }}><Flag className="w-2.5 h-2.5" /> {lblDe(PRIORIDADES, c.prioridad)}</span>
        {rn !== "SIN_EVALUAR" && <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ background: rm.color + "20", color: rm.color }}><AlertTriangle className="w-2.5 h-2.5" /> {rm.label}</span>}
      </div>
      {plan.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5"><span className={`text-[9px] font-bold inline-flex items-center gap-1 ${theme.textTertiary}`}><ListChecks className="w-3 h-3" /> Plan</span><span className={`text-[9px] font-black tabular-nums ${theme.textTertiary}`}>{planDone}/{plan.length}</span></div>
          <div className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-100"}`}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: `${planPct}%` }} /></div>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        {c.responsable_nombre ? <span className="inline-flex items-center gap-1"><Avatar nombre={c.responsable_nombre} id={c.responsable_user} size={18} /></span> : <span />}
        {c.fecha_objetivo && <span className={`text-[10px] inline-flex items-center gap-0.5 ${theme.textTertiary}`}><Calendar className="w-3 h-3" /> {c.fecha_objetivo}</span>}
      </div>
    </button>
  );
}

// Flujo visual de estados + acciones rápidas para avanzar/aprobar/rechazar.
function FlujoEstados({ actual, theme, isDark }: any) {
  const idx = FLUJO.indexOf(actual);
  const rechazado = actual === "RECHAZADO";
  return (
    <div>
      <div className="flex items-center gap-1">
        {FLUJO.map((e, i) => {
          const m = EST_META[e];
          const done = !rechazado && idx >= i;
          return (
            <div key={e} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: done ? m.color : (isDark ? "#ffffff10" : "#0000000a"), color: done ? "#fff" : (isDark ? "#64748b" : "#94a3b8") }}>
                  <m.icon className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-bold mt-1 text-center ${done ? theme.textPrimary : theme.textTertiary}`}>{m.label}</span>
              </div>
              {i < FLUJO.length - 1 && <div className="h-0.5 flex-1 mb-4" style={{ background: (!rechazado && idx > i) ? EST_META[FLUJO[i + 1]].color : (isDark ? "#ffffff14" : "#0000000d") }} />}
            </div>
          );
        })}
      </div>
      {rechazado && <div className="mt-2 text-center text-xs font-bold text-rose-500 inline-flex items-center gap-1 w-full justify-center"><ThumbsDown className="w-3.5 h-3.5" /> Cambio rechazado</div>}
    </div>
  );
}

// Matriz de riesgo 5×5 (probabilidad × impacto). Solo lectura o editable.
function MatrizRiesgo({ prob, impacto, onChange, isDark, theme, readOnly }: any) {
  return (
    <div className="flex gap-2">
      <div className="flex items-center justify-center">
        <span className={`text-[9px] font-black uppercase tracking-wider [writing-mode:vertical-rl] rotate-180 ${theme.textTertiary}`}>Impacto →</span>
      </div>
      <div className="flex-1">
        {[5, 4, 3, 2, 1].map((imp) => (
          <div key={imp} className="flex gap-1 mb-1 items-center">
            <span className={`text-[9px] font-black w-3 text-center ${theme.textTertiary}`}>{imp}</span>
            {[1, 2, 3, 4, 5].map((pr) => {
              const sel = prob === pr && impacto === imp;
              const c = cellColor(pr, imp);
              return (
                <button key={pr} type="button" disabled={readOnly} onClick={() => !readOnly && onChange?.(pr, imp)}
                  className={`flex-1 h-8 rounded-md border-2 text-[10px] font-black transition ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-[1.04]"}`}
                  style={{ background: sel ? c : c + "26", borderColor: sel ? (isDark ? "#fff" : "#0f172a") : "transparent", color: sel ? "#fff" : c }}>
                  {sel ? pr * imp : ""}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex gap-1 items-center">
          <span className="w-3" />
          {[1, 2, 3, 4, 5].map((pr) => <span key={pr} className={`flex-1 text-center text-[9px] font-black ${theme.textTertiary}`}>{pr}</span>)}
        </div>
        <div className={`text-center text-[9px] font-black uppercase tracking-wider mt-0.5 ${theme.textTertiary}`}>Probabilidad →</div>
      </div>
    </div>
  );
}

// Plan de acción tipo checklist (editable inline).
function PlanAccion({ items, onChange, isDark, theme, compact }: any) {
  const [nuevo, setNuevo] = useState("");
  const lista: any[] = Array.isArray(items) ? items : [];
  const done = lista.filter((t) => t?.hecho).length;
  const pct = lista.length ? Math.round(done / lista.length * 100) : 0;
  const toggle = (i: number) => onChange(lista.map((t, idx) => (idx === i ? { ...t, hecho: !t.hecho } : t)));
  const add = () => { const t = nuevo.trim(); if (!t) return; onChange([...lista, { texto: t, hecho: false }]); setNuevo(""); };
  const del = (i: number) => onChange(lista.filter((_, idx) => idx !== i));
  const inp = `flex-1 px-2.5 py-1.5 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  return (
    <div>
      {lista.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-100"}`}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all" style={{ width: `${pct}%` }} /></div>
          <span className={`text-xs font-black tabular-nums ${theme.textSecondary}`}>{done}/{lista.length} · {pct}%</span>
        </div>
      )}
      <div className="space-y-1.5">
        {lista.map((t, i) => (
          <div key={i} className={`flex items-center gap-2 rounded-lg border p-2 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
            <button type="button" onClick={() => toggle(i)} className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition" style={{ background: t?.hecho ? "#8B5CF6" : "transparent", borderColor: t?.hecho ? "#8B5CF6" : (isDark ? "#475569" : "#cbd5e1") }}>
              {t?.hecho && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${t?.hecho ? `line-through ${theme.textTertiary}` : theme.textPrimary}`}>{t?.texto}</span>
            <button type="button" onClick={() => del(i)} className={`p-1 rounded hover:bg-rose-500/10 ${theme.textTertiary} hover:text-rose-500`}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {lista.length === 0 && !compact && <p className={`text-xs py-1 ${theme.textTertiary}`}>Sin tareas. Agrega los pasos para implementar el cambio.</p>}
      </div>
      <div className="flex gap-2 mt-2">
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Nueva tarea del plan…" className={inp} />
        <button type="button" onClick={add} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 inline-flex items-center gap-1"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function DetalleCambio({ c, isDark, theme, onClose, onEditar, onEstado, onPlan }: any) {
  const m = EST_META[c.estado] || EST_META.PROPUESTO;
  const tm = TIPO_META[c.tipo] || TIPO_META.OTRO;
  const pm = PRIO_META[c.prioridad] || PRIO_META.MEDIA;
  const rn = nivelRiesgo(c.riesgo_probabilidad, c.riesgo_impacto);
  const rm = RIESGO_META[rn];
  // Acciones de avance según el estado actual.
  const acciones: [string, string, any][] = [];
  if (c.estado === "PROPUESTO") { acciones.push(["APROBADO", "Aprobar", ThumbsUp]); acciones.push(["RECHAZADO", "Rechazar", ThumbsDown]); }
  else if (c.estado === "APROBADO") { acciones.push(["EN_PROCESO", "Iniciar implementación", Rocket]); }
  else if (c.estado === "EN_PROCESO") { acciones.push(["IMPLEMENTADO", "Marcar implementado", CheckCircle2]); }

  const Campo = ({ icon: Icon, label, valor, color }: any) => (
    <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textTertiary}`}>{label}</span>
      </div>
      <p className={`text-sm ${valor ? theme.textPrimary : theme.textTertiary}`}>{valor || "No especificado"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-700 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white flex items-center gap-2 truncate"><Replace className="w-4 h-4 shrink-0" /> {c.titulo}</h2>
            <span className="font-mono text-[10px] font-bold text-white/70">{c.folio}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          {/* Badges: tipo, prioridad, riesgo */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: tm.color + "40", background: tm.color + "12", color: tm.color }}><tm.icon className="w-3.5 h-3.5" /> {lblDe(TIPOS, c.tipo)}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: pm.color + "40", background: pm.color + "12", color: pm.color }}><Flag className="w-3.5 h-3.5" /> Prioridad {lblDe(PRIORIDADES, c.prioridad)}</span>
            {rn !== "SIN_EVALUAR" && <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: rm.color + "20", color: rm.color }}><AlertTriangle className="w-3.5 h-3.5" /> Riesgo {rm.label} ({(c.riesgo_probabilidad || 0) * (c.riesgo_impacto || 0)})</span>}
          </div>

          {/* Flujo de estados */}
          <div className={`rounded-2xl border p-4 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
            <FlujoEstados actual={c.estado} theme={theme} isDark={isDark} />
            {acciones.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {acciones.map(([est, label, Icon]) => {
                  const mm = EST_META[est];
                  return (
                    <button key={est} onClick={() => onEstado(est)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm" style={{ background: mm.color }}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalle del cambio (los campos 6.3) */}
          {c.descripcion && <div><div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${theme.textTertiary}`}>Descripción</div><p className={`text-sm ${theme.textPrimary}`}>{c.descripcion}</p></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo icon={FileText} label="Propósito / justificación" valor={c.justificacion} color="#8B5CF6" />
            <Campo icon={AlertTriangle} label="Consecuencias potenciales" valor={c.consecuencias} color="#F59E0B" />
            <Campo icon={Coins} label="Recursos necesarios" valor={c.recursos} color="#0EA5E9" />
            <Campo icon={ShieldCheck} label="Integridad del SGC" valor={c.impacto_integridad} color="#10B981" />
          </div>

          {/* Matriz de riesgo (si fue evaluado) */}
          {rn !== "SIN_EVALUAR" && (
            <div className={`rounded-2xl border p-4 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
              <div className={`text-[10px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${theme.textTertiary}`}><Gauge className="w-3.5 h-3.5" style={{ color: rm.color }} /> Evaluación de riesgo del cambio</div>
              <div className="max-w-xs mx-auto"><MatrizRiesgo prob={c.riesgo_probabilidad} impacto={c.riesgo_impacto} readOnly isDark={isDark} theme={theme} /></div>
            </div>
          )}

          {/* Plan de acción (checklist editable) */}
          <div className={`rounded-2xl border p-4 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
            <div className={`text-[10px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${theme.textTertiary}`}><ListChecks className="w-3.5 h-3.5 text-violet-400" /> Plan de implementación</div>
            <PlanAccion items={c.plan_accion || []} onChange={onPlan} isDark={isDark} theme={theme} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo icon={User} label="Responsable" valor={c.responsable_nombre} color="#6366F1" />
            <Campo icon={ThumbsUp} label="Autorizado por" valor={c.autorizado_por} color="#0EA5E9" />
            <Campo icon={Calendar} label="Fecha objetivo" valor={c.fecha_objetivo} color="#F43F5E" />
            <Campo icon={CheckCircle2} label="Implementado el" valor={c.fecha_implementacion} color="#10B981" />
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-between items-center gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${m.chip}`}>{m.label}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
            <button onClick={onEditar} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600">Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Caja de ayuda contextual: explica el "porqué" del requisito ISO 6.3.
function Ayuda({ children, isDark }: any) {
  return (
    <div className={`flex gap-2 rounded-lg border p-2 mt-1.5 ${isDark ? "border-violet-400/20 bg-violet-500/[0.07]" : "border-violet-200 bg-violet-50"}`}>
      <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? "text-violet-300" : "text-violet-500"}`} />
      <p className={`text-[11px] leading-snug ${isDark ? "text-violet-100/80" : "text-violet-900/80"}`}>{children}</p>
    </div>
  );
}

const PASOS = [
  { n: 1, label: "Identificación", icon: FileText },
  { n: 2, label: "Análisis 6.3", icon: CircleHelp },
  { n: 3, label: "Riesgo y recursos", icon: Gauge },
  { n: 4, label: "Plan y responsables", icon: ListChecks },
];

function CambioModal({ cambio, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    titulo: "", descripcion: "", tipo: "PROCESO", prioridad: "MEDIA",
    justificacion: "", consecuencias: "", recursos: "", impacto_integridad: "",
    riesgo_probabilidad: 0, riesgo_impacto: 0, plan_accion: [],
    autorizado_por: "", fecha_objetivo: "", fecha_implementacion: "", estado: "PROPUESTO",
    responsable_user: null, ...cambio,
  });
  const [paso, setPaso] = useState(1);
  const [busy, setBusy] = useState(false);
  const id = cambio.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const rn = nivelRiesgo(f.riesgo_probabilidad, f.riesgo_impacto);
  const rm = RIESGO_META[rn];

  const guardar = async () => {
    if (!f.titulo?.trim()) { alert("Indica el título del cambio."); setPaso(1); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, titulo: f.titulo, descripcion: f.descripcion || "",
      tipo: f.tipo || "PROCESO", prioridad: f.prioridad || "MEDIA",
      justificacion: f.justificacion || "", consecuencias: f.consecuencias || "",
      recursos: f.recursos || "", impacto_integridad: f.impacto_integridad || "",
      riesgo_probabilidad: f.riesgo_probabilidad || 0, riesgo_impacto: f.riesgo_impacto || 0,
      plan_accion: Array.isArray(f.plan_accion) ? f.plan_accion : [],
      autorizado_por: f.autorizado_por || "", fecha_objetivo: f.fecha_objetivo || null,
      fecha_implementacion: f.fecha_implementacion || null,
      estado: f.estado, responsable_user: f.responsable_user || null,
    };
    try {
      if (id) { await api.actualizarCambio(id, payload); onSaved(); }
      else { await api.crearCambio(payload); onSaved(); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Replace className="w-4 h-4" /> {id ? `Cambio ${f.folio || ""}` : "Nuevo cambio"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        {/* Stepper */}
        <div className={`px-5 py-3 border-b shrink-0 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-center">
            {PASOS.map((p, i) => {
              const activo = paso === p.n;
              const hecho = paso > p.n;
              return (
                <div key={p.n} className="flex items-center flex-1 last:flex-none">
                  <button type="button" onClick={() => setPaso(p.n)} className="flex items-center gap-2 group">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition" style={{ background: activo || hecho ? "linear-gradient(135deg,#8B5CF6,#9333EA)" : (isDark ? "#ffffff10" : "#0000000a"), color: activo || hecho ? "#fff" : (isDark ? "#64748b" : "#94a3b8") }}>
                      {hecho ? <Check className="w-3.5 h-3.5" /> : p.n}
                    </span>
                    <span className={`text-[11px] font-bold hidden sm:block ${activo ? theme.textPrimary : theme.textTertiary}`}>{p.label}</span>
                  </button>
                  {i < PASOS.length - 1 && <div className="h-0.5 flex-1 mx-2 rounded" style={{ background: paso > p.n ? "#8B5CF6" : (isDark ? "#ffffff14" : "#0000000d") }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 overflow-auto space-y-3 flex-1">
          {/* PASO 1 · Identificación */}
          {paso === 1 && (
            <>
              <div><label className={lbl}>Título del cambio *</label><input className={inp} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ej. Cambio de proveedor de materia prima" autoFocus /></div>
              <div><label className={lbl}>Descripción</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="En qué consiste el cambio." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tipo de cambio</label>
                  <select className={inp} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div>
                  <label className={lbl}>Prioridad</label>
                  <div className="flex gap-1">
                    {PRIORIDADES.map(([v, l]) => {
                      const sel = f.prioridad === v; const c = PRIO_META[v].color;
                      return <button key={v} type="button" onClick={() => set("prioridad", v)} className="flex-1 px-1 py-2 rounded-lg text-[11px] font-black border-2 transition" style={{ background: sel ? c : c + "14", borderColor: sel ? c : "transparent", color: sel ? "#fff" : c }}>{l}</button>;
                    })}
                  </div>
                </div>
              </div>
              <Ayuda isDark={isDark}>Clasificar y priorizar el cambio (ISO 6.3) permite enfocar el control según su importancia: los cambios de mayor prioridad o impacto requieren más análisis y autorización antes de ejecutarse.</Ayuda>
            </>
          )}

          {/* PASO 2 · Análisis ISO 6.3 */}
          {paso === 2 && (
            <>
              <div>
                <label className={lbl}>Propósito del cambio</label>
                <textarea rows={3} className={inp} value={f.justificacion} onChange={(e) => set("justificacion", e.target.value)} placeholder="¿Por qué es necesario este cambio? ¿Qué problema u oportunidad resuelve?" />
                <Ayuda isDark={isDark}>La norma 6.3 (a) exige considerar <b>el propósito del cambio y sus consecuencias potenciales</b>. Documentar el porqué evita cambios improvisados y deja trazabilidad para auditorías.</Ayuda>
              </div>
              <div>
                <label className={lbl}>Consecuencias potenciales</label>
                <textarea rows={3} className={inp} value={f.consecuencias} onChange={(e) => set("consecuencias", e.target.value)} placeholder="¿Qué procesos, productos, clientes o requisitos podrían verse afectados?" />
                <Ayuda isDark={isDark}>Anticipar consecuencias (positivas y negativas) permite planear controles y evitar que el cambio degrade otros procesos del sistema.</Ayuda>
              </div>
            </>
          )}

          {/* PASO 3 · Riesgo y recursos */}
          {paso === 3 && (
            <>
              <div>
                <label className={lbl}>Evaluación de riesgo del cambio</label>
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06]" : "border-slate-200 bg-slate-50/40"}`}>
                  <MatrizRiesgo prob={f.riesgo_probabilidad} impacto={f.riesgo_impacto} onChange={(p: number, i: number) => setF((s: any) => ({ ...s, riesgo_probabilidad: p, riesgo_impacto: i }))} isDark={isDark} theme={theme} />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: isDark ? "#ffffff10" : "#0000000a" }}>
                    <span className={`text-[11px] ${theme.textTertiary}`}>Toca una celda: probabilidad × impacto</span>
                    {rn !== "SIN_EVALUAR" ? <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: rm.color + "20", color: rm.color }}>Riesgo {rm.label} · {(f.riesgo_probabilidad || 0) * (f.riesgo_impacto || 0)}</span> : <span className={`text-[11px] font-bold ${theme.textTertiary}`}>Sin evaluar</span>}
                  </div>
                </div>
                <Ayuda isDark={isDark}>Aunque 6.3 no exige una matriz formal, evaluar probabilidad × impacto ayuda a decidir cuánto control y autorización necesita el cambio antes de implementarlo (pensamiento basado en riesgos, cláusula 6.1).</Ayuda>
              </div>
              <div><label className={lbl}>Recursos necesarios</label><textarea rows={2} className={inp} value={f.recursos} onChange={(e) => set("recursos", e.target.value)} placeholder="Personas, presupuesto, equipo, tiempo, formación…" /><Ayuda isDark={isDark}>6.3 (c) pide considerar <b>la disponibilidad de recursos</b>. Definirlos asegura que el cambio sea viable y no se detenga a medio camino.</Ayuda></div>
              <div><label className={lbl}>Integridad del SGC</label><input className={inp} value={f.impacto_integridad} onChange={(e) => set("impacto_integridad", e.target.value)} placeholder="¿Cómo se mantiene la coherencia del sistema durante el cambio?" /><Ayuda isDark={isDark}>6.3 (b) exige preservar <b>la integridad del sistema de gestión</b>: que el cambio no rompa la coherencia entre procesos, documentos y controles.</Ayuda></div>
            </>
          )}

          {/* PASO 4 · Plan y responsables */}
          {paso === 4 && (
            <>
              <div>
                <label className={lbl}>Plan de implementación</label>
                <PlanAccion items={f.plan_accion} onChange={(v: any[]) => set("plan_accion", v)} isDark={isDark} theme={theme} />
                <Ayuda isDark={isDark}>Descomponer el cambio en tareas concretas con seguimiento de avance hace controlada la implementación y facilita verificar que se completó.</Ayuda>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <SelectorUsuario value={f.responsable_user} onChange={(uid: any) => set("responsable_user", uid)} label="Responsable" />
                <div><label className={lbl}>Autorizado por</label><input className={inp} value={f.autorizado_por} onChange={(e) => set("autorizado_por", e.target.value)} placeholder="Nombre / puesto" /></div>
              </div>
              <Ayuda isDark={isDark}>6.3 (d) requiere definir <b>la asignación o reasignación de responsabilidades y autoridades</b>: quién ejecuta y quién autoriza el cambio.</Ayuda>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Fecha objetivo</label><input type="date" className={inp} value={f.fecha_objetivo || ""} onChange={(e) => set("fecha_objetivo", e.target.value)} /></div>
                <div><label className={lbl}>Implementado el</label><input type="date" className={inp} value={f.fecha_implementacion || ""} onChange={(e) => set("fecha_implementacion", e.target.value)} /></div>
                <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              </div>
            </>
          )}
        </div>

        {/* Footer wizard */}
        <div className={`px-5 py-3 border-t flex justify-between items-center gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button type="button" onClick={() => (paso > 1 ? setPaso(paso - 1) : onClose())} className={`px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1 ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>
            {paso > 1 ? <><ChevronLeft className="w-4 h-4" /> Atrás</> : "Cancelar"}
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold ${theme.textTertiary}`}>Paso {paso} de {PASOS.length}</span>
            {paso < PASOS.length ? (
              <button type="button" onClick={() => setPaso(paso + 1)} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 inline-flex items-center gap-1">Siguiente <ChevronRight className="w-4 h-4" /></button>
            ) : (
              <button type="button" onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-green-600 inline-flex items-center gap-1"><Check className="w-4 h-4" /> {busy ? "Guardando…" : "Guardar cambio"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
