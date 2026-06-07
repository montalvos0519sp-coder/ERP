"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertOctagon, Award, BarChart3, BookOpen,
  ClipboardCheck, ClipboardList, FileSearch, GaugeCircle, GraduationCap,
  MessageSquareWarning, Network, RefreshCw, ScrollText, ShieldAlert, Star, Truck, Wrench,
  ArrowRight, CheckCircle2, AlertTriangle, Calendar, ArrowUpRight, ArrowDownRight, LineChart as LineChartIcon,
} from "lucide-react";

import {
  Inbox, Sparkles, Activity, CalendarClock, PackageX, Users, ShieldCheck, TrendingUp,
  Replace, FileStack, Archive, Megaphone, Lightbulb, CalendarRange, Rocket, Map,
} from "lucide-react";
import {
  Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ReferenceLine,
} from "recharts";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";
import { Avatar } from "@/components/sgc/Colaboracion";

interface Modulo {
  id: string; titulo: string; desc: string; icon: any; color: string; href?: string;
  estado: "activo" | "proximamente"; fase: "P" | "H" | "V" | "A"; clausula?: string;
}

// ── Ciclo PHVA (Deming) — columna vertebral del SGC ──────────────────────────
const FASES: Record<string, { id: string; letra: string; titulo: string; lema: string; clausulas: string; color: string; color2: string }> = {
  P: { id: "P", letra: "P", titulo: "Planear", lema: "Establecer objetivos y procesos", clausulas: "4 · 5 · 6", color: "#6366F1", color2: "#818CF8" },
  H: { id: "H", letra: "H", titulo: "Hacer", lema: "Implementar lo planificado", clausulas: "7 · 8", color: "#0EA5E9", color2: "#38BDF8" },
  V: { id: "V", letra: "V", titulo: "Verificar", lema: "Seguimiento y medición", clausulas: "9", color: "#14B8A6", color2: "#2DD4BF" },
  A: { id: "A", letra: "A", titulo: "Actuar", lema: "Mejorar continuamente", clausulas: "10", color: "#F59E0B", color2: "#FBBF24" },
};
const FASE_ORDEN: ("P" | "H" | "V" | "A")[] = ["P", "H", "V", "A"];

const MODULOS: Modulo[] = [
  // PLANEAR — 4, 5, 6
  { id: "contexto", titulo: "Contexto y Partes Interesadas", desc: "FODA y necesidades de las partes interesadas.", icon: Network, color: "#0EA5E9", href: "/sgc/contexto", estado: "activo", fase: "P", clausula: "4.1" },
  { id: "politica", titulo: "Política y Objetivos", desc: "Política de calidad y objetivos medibles.", icon: ScrollText, color: "#6366F1", href: "/sgc/politica", estado: "activo", fase: "P", clausula: "5.2" },
  { id: "cambios", titulo: "Gestión de Cambios", desc: "Planificación de cambios del SGC con impacto y recursos.", icon: Replace, color: "#8B5CF6", href: "/sgc/cambios", estado: "activo", fase: "P", clausula: "6.3" },
  { id: "riesgos", titulo: "Gestión de Riesgos", desc: "Matriz probabilidad × impacto, controles y mitigación.", icon: ShieldAlert, color: "#F59E0B", href: "/sgc/riesgos", estado: "activo", fase: "P", clausula: "6.1" },
  { id: "diag", titulo: "Diagnóstico ISO (Gap)", desc: "Cuestionario por norma, % de avance y brechas.", icon: FileSearch, color: "#0EA5E9", href: "/sgc/diagnostico", estado: "activo", fase: "P", clausula: "6.1" },
  { id: "impl", titulo: "Tablero de Implementación", desc: "Kanban para implementar el SGC en equipo.", icon: Sparkles, color: "#6366F1", href: "/sgc/implementacion", estado: "activo", fase: "P", clausula: "6.2" },
  // HACER — 7, 8
  { id: "plantillas", titulo: "Biblioteca de Plantillas", desc: "Plantillas ISO listas para generar tu documentación.", icon: FileStack, color: "#6366F1", href: "/sgc/plantillas", estado: "activo", fase: "H", clausula: "7.5" },
  { id: "doc", titulo: "Gestión Documental", desc: "Manuales, procedimientos, versiones y aprobaciones.", icon: BookOpen, color: "#6366F1", href: "/documentos", estado: "activo", fase: "H", clausula: "7.5" },
  { id: "registros", titulo: "Lista Maestra de Registros", desc: "Registros con responsable, ubicación y retención.", icon: Archive, color: "#0EA5E9", href: "/sgc/registros", estado: "activo", fase: "H", clausula: "7.5.3" },
  { id: "comunicacion", titulo: "Matriz de Comunicación", desc: "Qué, cuándo, a quién y cómo se comunica.", icon: Megaphone, color: "#3B82F6", href: "/sgc/comunicacion", estado: "activo", fase: "H", clausula: "7.4" },
  { id: "conocimiento", titulo: "Base de Conocimiento", desc: "Lecciones aprendidas y mejores prácticas.", icon: Lightbulb, color: "#F59E0B", href: "/sgc/conocimiento", estado: "activo", fase: "H", clausula: "7.1.6" },
  { id: "capac", titulo: "Capacitación", desc: "Cursos, evaluaciones, certificados y vencimientos.", icon: GraduationCap, color: "#3B82F6", href: "/sgc/capacitacion", estado: "activo", fase: "H", clausula: "7.2" },
  { id: "comp", titulo: "Competencias", desc: "Perfiles de puesto y brechas de competencia.", icon: Award, color: "#A855F7", href: "/sgc/competencias", estado: "activo", fase: "H", clausula: "7.2" },
  { id: "equipos", titulo: "Control de Equipos", desc: "Inventario, calibraciones y alertas de vencimiento.", icon: GaugeCircle, color: "#06B6D4", href: "/sgc/equipos", estado: "activo", fase: "H", clausula: "7.1.5" },
  { id: "procesos", titulo: "Mapa de Procesos (SIPOC)", desc: "Procesos con dueño, entradas/salidas, KPIs y riesgos.", icon: Network, color: "#0EA5E9", href: "/sgc/procesos", estado: "activo", fase: "H", clausula: "8.1" },
  { id: "proc", titulo: "Diagramas de Flujo", desc: "Mapa de procesos y diagramas de flujo.", icon: Wrench, color: "#8B5CF6", href: "/diagramas", estado: "activo", fase: "H", clausula: "8.1" },
  { id: "prov", titulo: "Evaluación de Proveedores", desc: "Evaluación, homologación y seguimiento.", icon: Truck, color: "#0891B2", href: "/sgc/evaluacion-proveedores", estado: "activo", fase: "H", clausula: "8.4" },
  { id: "snc", titulo: "Salidas No Conformes", desc: "Producto/servicio que no cumple y su disposición.", icon: PackageX, color: "#F97316", href: "/sgc/salidas-no-conformes", estado: "activo", fase: "H", clausula: "8.7" },
  // VERIFICAR — 9
  { id: "kpi", titulo: "Indicadores KPI", desc: "Metas, cumplimiento y tendencias por proceso.", icon: BarChart3, color: "#14B8A6", href: "/sgc/kpis", estado: "activo", fase: "V", clausula: "9.1" },
  { id: "quejas", titulo: "Quejas y Satisfacción", desc: "Reclamos, encuestas y estadísticas (CSAT/NPS).", icon: MessageSquareWarning, color: "#EC4899", href: "/sgc/quejas", estado: "activo", fase: "V", clausula: "9.1.2" },
  { id: "encuestas", titulo: "Encuestas de Cliente", desc: "Formularios con link público; respuestas en Quejas.", icon: ClipboardList, color: "#F472B6", href: "/sgc/encuestas", estado: "activo", fase: "V", clausula: "9.1.2" },
  { id: "prog-audit", titulo: "Programa de Auditorías", desc: "Plan anual de auditorías internas por proceso.", icon: CalendarRange, color: "#0EA5E9", href: "/sgc/programa-auditorias", estado: "activo", fase: "V", clausula: "9.2" },
  { id: "audit", titulo: "Auditorías Internas", desc: "Ejecución, checklists y hallazgos.", icon: ClipboardCheck, color: "#10B981", href: "/sgc/auditorias", estado: "activo", fase: "V", clausula: "9.2" },
  { id: "revision", titulo: "Revisión por la Dirección", desc: "Acta de revisión del SGC con entradas y salidas.", icon: ClipboardList, color: "#10B981", href: "/sgc/revision-direccion", estado: "activo", fase: "V", clausula: "9.3" },
  // ACTUAR — 10
  { id: "capa", titulo: "No Conformidades (CAPA)", desc: "Acciones correctivas/preventivas, causa raíz y evidencias.", icon: AlertOctagon, color: "#EF4444", href: "/sgc/no-conformidades", estado: "activo", fase: "A", clausula: "10.2" },
  { id: "agenda", titulo: "Agenda de Cumplimiento", desc: "Todos los vencimientos del SGC para mantenerlo vivo.", icon: CalendarClock, color: "#F43F5E", href: "/sgc/agenda", estado: "activo", fase: "A", clausula: "10.3" },
];

export default function SGCHub() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [d, setD] = useState<any>(null);
  const [pan, setPan] = useState<any>(null);
  const [tend, setTend] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [faseSel, setFaseSel] = useState<"P" | "H" | "V" | "A">("P");

  const load = useCallback(() => {
    setLoading(true);
    const emp = empresaActivaId || undefined;
    Promise.all([
      api.getSGCDashboard(emp ? { empresa: String(emp) } : undefined).catch(() => null),
      api.getPanoramaSGC(emp).catch(() => null),
      api.getTendenciasSGC(emp).catch(() => null),
    ]).then(([dash, panorama, tendencias]) => { setD(dash); setPan(panorama); setTend(tendencias); })
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  // Cumplimiento por fase PHVA (mapeando capítulos ISO → fase).
  const capPct: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    (pan?.capitulos || []).forEach((c: any) => { m[c.capitulo] = c.cumplimiento; });
    return m;
  }, [pan]);
  const faseCap: Record<string, string[]> = { P: ["4", "5", "6"], H: ["7", "8"], V: ["9"], A: ["10"] };
  const fasePct = (f: string) => {
    const caps = faseCap[f].filter((c) => capPct[c] !== undefined);
    if (!caps.length) return 0;
    return Math.round(caps.reduce((a, c) => a + capPct[c], 0) / caps.length);
  };

  const madurez = Math.round(pan?.madurez ?? 0);
  const nivel = pan?.nivel ?? "—";
  const colorMad = madurez >= 85 ? "#10B981" : madurez >= 65 ? "#14B8A6" : madurez >= 40 ? "#0EA5E9" : "#F59E0B";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* ════ HERO EJECUTIVO ════ */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ background: "radial-gradient(circle at 12% 18%, #6366F1 0, transparent 38%), radial-gradient(circle at 88% 82%, #14B8A6 0, transparent 38%)" }} />
        <div className="relative p-6 lg:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-sky-500 via-indigo-500 to-indigo-600">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Sistema de Gestión de Calidad</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-sky-500 to-indigo-600">ISO 9001:2015</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-2xl ${theme.textSecondary}`}>
                  Ecosistema completo de calidad bajo el ciclo de mejora continua <b>PHVA</b>: planear, hacer, verificar y actuar — con trazabilidad, colaboración y preparación para certificación.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button onClick={() => router.push("/sgc/onboarding")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-md hover:shadow-lg transition">
                <Rocket className="w-4 h-4" /> Asistente de arranque
              </button>
              <button onClick={() => router.push("/sgc/roadmap")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"} transition`}>
                <Map className="w-4 h-4" /> Roadmap
              </button>
              <button onClick={() => router.push("/sgc/auditor")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"} transition`}>
                <ClipboardCheck className="w-4 h-4" /> Modo auditor
              </button>
              <button onClick={() => router.push("/sgc/mis-pendientes")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-500 shadow-md hover:shadow-lg transition">
                <Inbox className="w-4 h-4" /> Mis pendientes
              </button>
              <CampanaNotificaciones />
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Banda de score: rueda PHVA + KPIs clave */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 mt-6 items-center">
            {/* Rueda PHVA animada (sello distintivo) */}
            <div className="flex items-center gap-4">
              <RuedaPHVA fasePct={fasePct} faseSel={faseSel} setFaseSel={setFaseSel} madurez={madurez} isDark={isDarkMode} loading={loading} />
              <div>
                <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Nivel de madurez</div>
                <div className="text-2xl font-black" style={{ color: colorMad }}>{nivel}</div>
                <div className={`text-xs mt-1 ${theme.textSecondary}`}>Cumplimiento ISO <b style={{ color: colorMad }}>{loading ? "…" : `${d?.cumplimiento_iso ?? pan?.cumplimiento_iso ?? 0}%`}</b></div>
                <div className={`text-[11px] ${theme.textTertiary}`}>{pan ? `${pan.requisitos_evaluados}/${pan.requisitos_total} requisitos evaluados` : ""}</div>
                <div className={`text-[11px] mt-1.5 ${theme.textTertiary} hidden sm:block`}>Gira sobre el ciclo de mejora · clic en un cuadrante</div>
              </div>
            </div>
            {/* KPIs clave */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
              <Mini isDark={isDarkMode} icon={AlertOctagon} color="#EF4444" label="NC abiertas" value={loading ? "…" : d?.no_conformidades?.abiertas ?? 0} sub={d ? `${d.no_conformidades.vencidas} vencidas` : ""} />
              <Mini isDark={isDarkMode} icon={ShieldAlert} color="#F59E0B" label="Riesgos críticos" value={loading ? "…" : d?.riesgos?.criticos ?? 0} sub={d ? `${d.riesgos.altos} altos` : ""} />
              <Mini isDark={isDarkMode} icon={ClipboardCheck} color="#10B981" label="Auditorías" value={loading ? "…" : (d?.auditorias?.programadas ?? 0)} sub="programadas" />
              <Mini isDark={isDarkMode} icon={BarChart3} color="#14B8A6" label="KPIs en meta" value={loading ? "…" : `${d?.kpis?.cumplen ?? 0}/${d?.kpis?.total ?? 0}`} />
              <Mini isDark={isDarkMode} icon={GaugeCircle} color="#06B6D4" label="Calibración vencida" value={loading ? "…" : d?.equipos_calibracion_vencida ?? 0} />
              <Mini isDark={isDarkMode} icon={MessageSquareWarning} color="#EC4899" label="Quejas abiertas" value={loading ? "…" : d?.quejas_abiertas ?? 0} />
            </div>
          </div>
        </div>
      </div>

      {/* ════ CICLO PHVA — columna vertebral ════ */}
      <CicloPHVA fasePct={fasePct} faseSel={faseSel} setFaseSel={setFaseSel} card={card} isDark={isDarkMode} theme={theme} loading={loading} />

      {/* ════ MÓDULOS DE LA FASE SELECCIONADA ════ */}
      <div>
        <ModulosFase fase={faseSel} card={card} isDark={isDarkMode} theme={theme} router={router} fasePct={fasePct(faseSel)} />
      </div>

      {/* ════ EVOLUCIÓN Y ALERTAS ════ */}
      <EvolucionAlertas tend={tend} loading={loading} card={card} isDark={isDarkMode} theme={theme} />

      {/* ════ ANALÍTICA: madurez radar + cumplimiento por capítulo ════ */}
      <MadurezISO pan={pan} loading={loading} card={card} isDark={isDarkMode} theme={theme} colorMad={colorMad} madurez={madurez} nivel={nivel} />

      {/* ════ AVANCE GLOBAL ════ */}
      <SaludSGC d={d} loading={loading} card={card} isDark={isDarkMode} theme={theme} />

      {/* ════ CARGA DEL EQUIPO ════ */}
      <CargaEquipo pan={pan} card={card} isDark={isDarkMode} theme={theme} onVer={() => router.push("/sgc/mis-pendientes")} />

      {/* ════ IA (roadmap) ════ */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${theme.textPrimary}`}>
          <Star className="w-4 h-4 text-amber-400" /> Funciones con IA (próxima fase)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {[
            ["Asistente ISO", "Responde dudas de requisitos, documentos y auditorías."],
            ["Generador automático", "Crea procedimientos, políticas y matrices de riesgo."],
            ["Auditor IA", "Detecta requisitos faltantes y evidencias insuficientes."],
            ["Alertas inteligentes", "Correo/WhatsApp para vencimientos y acciones."],
          ].map(([t, dsc]) => (
            <div key={t} className={`rounded-xl p-3 ${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
              <div className={`font-bold ${theme.textPrimary}`}>{t}</div>
              <div className={theme.textTertiary}>{dsc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Rueda PHVA animada (sello distintivo del hero) ───────────────────────────
function RuedaPHVA({ fasePct, faseSel, setFaseSel, madurez, isDark, loading }: any) {
  const size = 168, cx = size / 2, cy = size / 2, R = 78, r = 46;
  // Arco de 4 cuadrantes (cada uno 90°, con pequeño gap visual).
  const arco = (startDeg: number, endDeg: number, outer: number, inner: number) => {
    const p = (deg: number, rad: number) => {
      const a = (deg - 90) * Math.PI / 180;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    };
    const [x1, y1] = p(startDeg, outer), [x2, y2] = p(endDeg, outer);
    const [x3, y3] = p(endDeg, inner), [x4, y4] = p(startDeg, inner);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
  };
  const segs = FASE_ORDEN.map((fk, i) => {
    const start = i * 90 + 3, end = (i + 1) * 90 - 3;
    const mid = (start + end) / 2;
    const ma = (mid - 90) * Math.PI / 180;
    const lr = (R + r) / 2;
    return { fk, f: FASES[fk], d: arco(start, end, R, r), lx: cx + lr * Math.cos(ma), ly: cy + lr * Math.sin(ma) };
  });
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* capa que gira lentamente */}
      <svg width={size} height={size} className="absolute inset-0 sgc-spin" style={{ animationDuration: "26s" }}>
        <defs>
          {FASE_ORDEN.map((fk) => (
            <linearGradient key={fk} id={`g-${fk}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={FASES[fk].color} />
              <stop offset="100%" stopColor={FASES[fk].color2} />
            </linearGradient>
          ))}
        </defs>
        {segs.map(({ fk, f, d, lx, ly }) => {
          const sel = faseSel === fk;
          return (
            <g key={fk} onClick={() => setFaseSel(fk)} style={{ cursor: "pointer" }}>
              <path d={d} fill={`url(#g-${fk})`} opacity={sel ? 1 : 0.78}
                stroke={isDark ? "#0F172A" : "#fff"} strokeWidth={2}
                style={{ transition: "opacity .3s" }} />
              {/* la letra contra-rota para mantenerse derecha */}
              <g className="sgc-spin-rev" style={{ animationDuration: "26s", transformOrigin: `${lx}px ${ly}px` }}>
                <text x={lx} y={ly} textAnchor="middle" dy=".35em" fontSize={19} fontWeight="900" fill="#fff">{f.letra}</text>
              </g>
            </g>
          );
        })}
      </svg>
      {/* núcleo fijo con la madurez */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center justify-center rounded-full shadow-inner"
          style={{ width: r * 1.7, height: r * 1.7, background: isDark ? "#0B1220" : "#fff", border: `1px solid ${isDark ? "#ffffff14" : "#0000000d"}` }}>
          <span className="text-2xl font-black tabular-nums" style={{ color: isDark ? "#fff" : "#0f172a" }}>{loading ? "…" : `${madurez}%`}</span>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>madurez</span>
        </div>
      </div>
      <style>{`
        @keyframes sgcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sgcSpinRev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .sgc-spin { transform-origin: ${cx}px ${cy}px; animation: sgcSpin linear infinite; }
        .sgc-spin-rev { animation: sgcSpinRev linear infinite; }
        @media (prefers-reduced-motion: reduce) { .sgc-spin, .sgc-spin-rev { animation: none !important; } }
      `}</style>
    </div>
  );
}

// ── Ciclo PHVA interactivo ───────────────────────────────────────────────────
function CicloPHVA({ fasePct, faseSel, setFaseSel, card, isDark, theme, loading }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${theme.textSecondary}`}>
          <Activity className="w-4 h-4" /> Ciclo de mejora continua · PHVA
        </h2>
        <span className={`text-[11px] ${theme.textTertiary}`}>Selecciona una fase para ver sus módulos</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {FASE_ORDEN.map((fk, i) => {
          const f = FASES[fk];
          const pct = loading ? 0 : fasePct(fk);
          const sel = faseSel === fk;
          return (
            <button key={fk} onClick={() => setFaseSel(fk)}
              className={`group relative text-left rounded-2xl border p-5 transition-all overflow-hidden ${card} ${sel ? "ring-2 shadow-lg scale-[1.01]" : "hover:shadow-md hover:scale-[1.005]"}`}
              style={{ ...(sel ? { ["--tw-ring-color" as any]: f.color, borderColor: f.color } : {}) }}>
              {/* halo */}
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-30" style={{ background: f.color }} />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md shrink-0"
                  style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color2})` }}>{f.letra}</div>
                <div className="min-w-0">
                  <div className={`text-base font-black leading-tight ${theme.textPrimary}`}>{f.titulo}</div>
                  <div className={`text-[11px] ${theme.textTertiary}`}>Cláusula {f.clausulas}</div>
                </div>
                {/* flecha que sugiere el ciclo */}
                {i < 3 && <ArrowRight className={`w-4 h-4 ml-auto ${theme.textTertiary} hidden xl:block`} />}
              </div>
              <p className={`relative text-xs mt-2.5 ${theme.textSecondary}`}>{f.lema}</p>
              {/* progreso de la fase */}
              <div className="relative mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${theme.textTertiary}`}>Cumplimiento</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: f.color }}>{pct}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color2})` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Módulos de la fase seleccionada ──────────────────────────────────────────
function ModulosFase({ fase, card, isDark, theme, router, fasePct }: any) {
  const f = FASES[fase];
  const mods = MODULOS.filter((m) => m.fase === fase);
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color2})` }}>{f.letra}</div>
        <div>
          <h2 className={`text-base font-black ${theme.textPrimary}`}>{f.titulo} · <span className="font-bold" style={{ color: f.color }}>{f.lema}</span></h2>
          <div className={`text-[11px] ${theme.textTertiary}`}>{mods.length} módulos · Cláusula ISO {f.clausulas} · {fasePct}% cumplimiento</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {mods.map((m) => {
          const activo = m.estado === "activo" && m.href;
          return (
            <button key={m.id} disabled={!activo} onClick={() => activo && router.push(m.href!)}
              className={`group relative text-left rounded-2xl border p-4 transition-all ${card} ${activo ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer" : "opacity-60 cursor-default"}`}>
              <div className="absolute top-3 right-3 flex items-center gap-1">
                {m.clausula && <span className={`text-[9px] font-black ${theme.textTertiary}`}>{m.clausula}</span>}
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm mb-2.5 transition-transform group-hover:scale-110" style={{ background: m.color }}>
                <m.icon className="w-5.5 h-5.5 text-white" />
              </div>
              <h3 className={`text-sm font-black ${theme.textPrimary}`}>{m.titulo}</h3>
              <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{m.desc}</p>
              {activo && <ArrowRight className={`w-4 h-4 mt-2 ${theme.textTertiary} opacity-0 group-hover:opacity-100 transition-opacity`} style={{ color: m.color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Evolución de madurez + proyección + alertas inteligentes ─────────────────
const MESES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFechaCorta(iso: string): string {
  if (!iso) return "";
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  return `${m[3]}/${m[2]}`;
}
function fmtFechaLarga(iso: string): string {
  if (!iso) return "";
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const mes = MESES_ABR[parseInt(m[2], 10) - 1] || m[2];
  return `${parseInt(m[3], 10)} ${mes} ${m[1]}`;
}

function EvolucionAlertas({ tend, loading, card, isDark, theme }: any) {
  const router = useRouter();
  const serie: any[] = Array.isArray(tend?.serie) ? tend.serie : [];
  const alertas: any[] = Array.isArray(tend?.alertas) ? tend.alertas : [];
  const proyeccion = tend?.proyeccion ?? null;
  const comparativa = tend?.comparativa ?? null;

  const data = serie.map((s: any) => ({ ...s, label: fmtFechaCorta(s.fecha), madurez: Math.round(s.madurez ?? 0) }));

  // El backend envía `nivel` = severidad (critica/alta/media) y `tipo` = categoría (NC, RIESGO…).
  const nivelStyle: Record<string, { bg: string; border: string; icon: string; text: string; label: string }> = isDark
    ? {
        critica: { bg: "bg-rose-500/10", border: "border-rose-500/30", icon: "text-rose-400", text: "text-rose-200", label: "Crítica" },
        alta: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "text-amber-400", text: "text-amber-200", label: "Alta" },
        media: { bg: "bg-sky-500/10", border: "border-sky-500/30", icon: "text-sky-400", text: "text-sky-200", label: "Media" },
      }
    : {
        critica: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-500", text: "text-rose-700", label: "Crítica" },
        alta: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-800", label: "Alta" },
        media: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", text: "text-sky-800", label: "Media" },
      };
  const catIcon: Record<string, any> = { NC: AlertOctagon, RIESGO: ShieldAlert, CALIBRACION: GaugeCircle, KPI: BarChart3 };

  const ritmo = proyeccion ? Number(proyeccion.ritmo_mensual ?? 0) : 0;
  const meta = proyeccion?.meta ?? 85;

  return (
    <div>
      <h2 className={`text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2 ${theme.textSecondary}`}>
        <TrendingUp className="w-4 h-4" /> Evolución y alertas
        {alertas.length > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500">{alertas.length}</span>}
      </h2>

      {/* Banner de alertas inteligentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {alertas.length > 0 ? (
          alertas.map((a: any, i: number) => {
            const st = nivelStyle[a?.nivel] || nivelStyle.media;
            const Icon = catIcon[a?.tipo] || AlertTriangle;
            return (
              <button
                key={i}
                onClick={() => a?.ruta && router.push(a.ruta)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition hover:shadow-md ${st.bg} ${st.border} ${a?.ruta ? "cursor-pointer" : "cursor-default"}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${st.icon}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${st.bg} ${st.text}`}>{st.label}</span>
                    {a?.tipo && <span className={`text-[9px] font-bold uppercase ${theme.textTertiary}`}>{a.tipo}</span>}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${st.text}`}>{a?.mensaje || a?.titulo || "Alerta"}</div>
                </div>
                {a?.ruta && <ArrowRight className={`w-4 h-4 shrink-0 self-center ${st.icon}`} />}
              </button>
            );
          })
        ) : (
          <div className={`sm:col-span-2 flex items-center gap-3 rounded-xl border p-3 ${isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"}`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
            <div className={`text-sm font-bold ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>Sin alertas críticas — todo en orden</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* Gráfica de evolución de madurez */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Evolución de madurez ISO</div>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${theme.textTertiary}`}>
              <LineChartIcon className="w-3.5 h-3.5" /> Meta {meta}%
            </span>
          </div>
          {data.length >= 1 ? (
            <div style={{ width: "100%", height: 240 }}>
              {data.length < 2 && (
                <div className={`text-[11px] mb-1 ${theme.textTertiary}`}>Posición actual. La curva se irá dibujando con cada medición diaria.</div>
              )}
              <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMadurez" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDark ? "#cbd5e1" : "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Madurez"]} />
                  <ReferenceLine y={85} stroke="#10B981" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: "Meta certificación", position: "insideTopRight", fontSize: 10, fill: "#10B981", fontWeight: 700 }} />
                  <Area type="monotone" dataKey="madurez" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradMadurez)" dot={{ r: 3, fill: "#6366F1" }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`flex items-center justify-center text-center text-xs px-6 ${theme.textTertiary}`} style={{ height: 240 }}>
              {loading ? "Cargando evolución…" : "Se necesitan al menos 2 mediciones para graficar la evolución (se registra una automáticamente cada vez que abres el dashboard)."}
            </div>
          )}
        </div>

        {/* Proyección + comparativa */}
        <div className="space-y-3">
          {proyeccion ? (
            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: ritmo > 0 ? "linear-gradient(135deg,#6366F1,#14B8A6)" : "linear-gradient(135deg,#F59E0B,#F43F5E)" }}>
                  {ritmo > 0 ? <TrendingUp className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
                </div>
                <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Proyección a certificación</div>
              </div>
              {ritmo > 0 ? (
                <>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    A este ritmo (<b style={{ color: "#14B8A6" }}>+{ritmo}%/mes</b>) alcanzarás <b>{meta}%</b> el
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className={`w-4 h-4 ${theme.textTertiary}`} />
                    <span className={`text-lg font-black ${theme.textPrimary}`}>{fmtFechaLarga(proyeccion.fecha_estimada)}</span>
                  </div>
                  {proyeccion.dias_estimados != null && (
                    <div className={`text-[11px] mt-0.5 ${theme.textTertiary}`}>≈ {proyeccion.dias_estimados} días desde hoy</div>
                  )}
                </>
              ) : (
                <div className={`text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  El ritmo actual no proyecta avance — refuerza acciones.
                </div>
              )}
            </div>
          ) : null}

          {comparativa ? (
            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className={`text-[11px] uppercase tracking-wider font-bold mb-2.5 ${theme.textTertiary}`}>Vs. periodo anterior</div>
              <div className="flex flex-wrap gap-2">
                <DeltaBadge label="Madurez" value={comparativa.madurez_delta} suffix="%" isDark={isDark} lessIsBetter={false} theme={theme} />
                <DeltaBadge label="Cumpl. ISO" value={comparativa.cumplimiento_iso_delta} suffix="%" isDark={isDark} lessIsBetter={false} theme={theme} />
                <DeltaBadge label="NC abiertas" value={comparativa.nc_delta} suffix="" isDark={isDark} lessIsBetter theme={theme} />
                <DeltaBadge label="Riesgos altos" value={comparativa.riesgos_altos_delta} suffix="" isDark={isDark} lessIsBetter theme={theme} />
                <DeltaBadge label="KPIs en meta" value={comparativa.kpis_en_meta_delta} suffix="" isDark={isDark} lessIsBetter={false} theme={theme} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DeltaBadge({ label, value, suffix, isDark, lessIsBetter, theme }: any) {
  if (value == null || isNaN(Number(value))) return null;
  const v = Number(value);
  const up = v > 0;
  const neutral = v === 0;
  // "bueno" = mejora. Para métricas donde menos es mejor, un delta negativo es bueno.
  const bueno = neutral ? null : lessIsBetter ? v < 0 : v > 0;
  const color = bueno == null ? (isDark ? "#94a3b8" : "#64748b") : bueno ? "#10B981" : "#F43F5E";
  const Arrow = neutral ? null : up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200/70"}`}>
      <div>
        <div className={`text-[9px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</div>
        <div className="flex items-center gap-0.5 text-sm font-black tabular-nums" style={{ color }}>
          {Arrow ? <Arrow className="w-3.5 h-3.5" /> : null}
          {v > 0 ? "+" : ""}{v}{suffix}
        </div>
      </div>
    </div>
  );
}

function MadurezISO({ pan, loading, card, isDark, theme, colorMad, madurez, nivel }: any) {
  const radar = (pan?.dimensiones || []).map((x: any) => ({ dim: x.dim, valor: x.valor }));
  const caps = (pan?.capitulos || []).map((c: any) => ({
    name: `${c.capitulo}. ${c.nombre}`, value: Math.round(c.cumplimiento),
    fill: c.cumplimiento >= 80 ? "#10B981" : c.cumplimiento >= 50 ? "#F59E0B" : "#F43F5E",
  }));
  return (
    <div>
      <h2 className={`text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2 ${theme.textSecondary}`}>
        <ShieldCheck className="w-4 h-4" /> Madurez del sistema · cumplimiento por capítulo ISO
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-1">
            <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Índice de madurez del SGC</div>
            <span className="text-xs font-black px-2 py-0.5 rounded-md text-white" style={{ background: colorMad }}>
              {loading ? "…" : `${madurez}% · ${nivel}`}
            </span>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke={isDark ? "#ffffff18" : "#0000000f"} />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: isDark ? "#cbd5e1" : "#475569", fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="valor" stroke={colorMad} fill={colorMad} fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Avance"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className={`text-[11px] uppercase tracking-wider font-bold mb-1 ${theme.textTertiary}`}>Cumplimiento por capítulo (cláusulas 4–10)</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={caps} margin={{ top: 4, right: 40, left: 8, bottom: 0 }} barCategoryGap={6}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: isDark ? "#cbd5e1" : "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: isDark ? "#ffffff08" : "#00000005" }} contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Cumplimiento"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: isDark ? "#ffffff0a" : "#0000000a", radius: 6 } as any}>
                  {caps.map((c: any, i: number) => <Cell key={i} fill={c.fill} />)}
                  <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}%`} style={{ fill: isDark ? "#e2e8f0" : "#334155", fontSize: 11, fontWeight: 800 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function CargaEquipo({ pan, card, isDark, theme, onVer }: any) {
  const equipo = (pan?.carga_equipo || []) as any[];
  if (!equipo.length) return null;
  const max = Math.max(1, ...equipo.map((m) => m.asignados_abiertos || 0));
  const totalAsig = equipo.reduce((a, m) => a + (m.asignados_abiertos || 0), 0);
  return (
    <div>
      <h2 className={`text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2 ${theme.textSecondary}`}>
        <Users className="w-4 h-4" /> Carga del equipo de calidad
        <span className={`text-[10px] font-bold normal-case ${theme.textTertiary}`}>· {totalAsig} pendientes repartidos entre {equipo.length}</span>
      </h2>
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="space-y-2.5">
          {equipo.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar nombre={m.nombre} id={m.id} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold truncate ${theme.textPrimary}`}>{m.nombre} <span className={`text-[10px] font-bold ${theme.textTertiary}`}>· {m.rol}</span></span>
                  <span className={`text-sm font-black tabular-nums ${theme.textPrimary}`}>{m.asignados_abiertos}</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden mt-1 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" style={{ width: `${(m.asignados_abiertos / max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onVer} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-sky-500 hover:text-sky-400">
          <TrendingUp className="w-3.5 h-3.5" /> Ver mis pendientes
        </button>
      </div>
    </div>
  );
}

function Anillo({ value, size = 84, stroke = 9, color, track }: { value: number; size?: number; stroke?: number; color: string; track: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize={size * 0.24} fontWeight="900" fill={color}>{value}%</text>
    </svg>
  );
}

function SaludSGC({ d, loading, card, isDark, theme }: any) {
  const track = isDark ? "#ffffff14" : "#0000000d";
  const dims = [
    { name: "Cumplimiento ISO", value: Math.round(d?.cumplimiento_iso ?? 0), fill: "#6366F1" },
    { name: "Implementación", value: Math.round(d?.implementacion?.progreso ?? 0), fill: "#0EA5E9" },
    { name: "Objetivos logrados", value: Math.round(d?.objetivos?.progreso ?? 0), fill: "#8B5CF6" },
    { name: "KPIs en meta", value: Math.round(d?.kpis_meta_pct ?? 0), fill: "#14B8A6" },
    { name: "NC resueltas", value: Math.round(d?.nc_resueltas_pct ?? 0), fill: "#10B981" },
  ];
  const madurez = Math.round(dims.reduce((a, x) => a + x.value, 0) / dims.length);
  const nivel = madurez >= 80 ? "Consolidado" : madurez >= 60 ? "Maduro" : madurez >= 40 ? "En desarrollo" : madurez >= 20 ? "Inicial" : "Incipiente";
  const colorMad = madurez >= 80 ? "#10B981" : madurez >= 60 ? "#14B8A6" : madurez >= 40 ? "#0EA5E9" : madurez >= 20 ? "#F59E0B" : "#F43F5E";

  return (
    <div>
      <h2 className={`text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2 ${theme.textSecondary}`}><Activity className="w-4 h-4" /> Avance global del SGC</h2>
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5 items-center">
          <div className="flex lg:flex-col items-center gap-3 text-center">
            <Anillo value={loading ? 0 : madurez} color={colorMad} track={track} size={108} />
            <div>
              <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Índice de madurez</div>
              <div className="text-lg font-black" style={{ color: colorMad }}>{nivel}</div>
            </div>
          </div>
          <div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={dims} margin={{ top: 0, right: 36, left: 8, bottom: 0 }} barCategoryGap={10}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: isDark ? "#cbd5e1" : "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: isDark ? "#ffffff08" : "#00000005" }} contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Avance"]} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} background={{ fill: isDark ? "#ffffff0a" : "#0000000a", radius: 8 } as any}>
                    {dims.map((dd, i) => <Cell key={i} fill={dd.fill} />)}
                    <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}%`} style={{ fill: isDark ? "#e2e8f0" : "#334155", fontSize: 11, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 pt-3 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
          {[
            ["Tareas implementadas", d ? `${d.implementacion?.verificadas ?? 0}/${d.implementacion?.total ?? 0}` : "…", "#0EA5E9"],
            ["Objetivos logrados", d ? `${d.objetivos?.logrados ?? 0}/${d.objetivos?.total ?? 0}` : "…", "#8B5CF6"],
            ["NC cerradas", d ? `${d.nc_cerradas ?? 0}/${d.no_conformidades?.total ?? 0}` : "…", "#10B981"],
            ["Avance prom. objetivos", d ? `${d.objetivos?.avance_promedio ?? 0}%` : "…", "#14B8A6"],
          ].map(([l, v, c]: any) => (
            <div key={l} className="text-center">
              <div className="text-xl font-black tabular-nums" style={{ color: c }}>{v}</div>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ isDark, icon: Icon, color, label, value, sub }: {
  isDark: boolean; icon: any; color: string; label: string; value: any; sub?: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${isDark ? "bg-[#0F172A]/60 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ background: color + "20", color }}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-lg font-black tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}
