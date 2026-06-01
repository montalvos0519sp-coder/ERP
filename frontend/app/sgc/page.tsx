"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertOctagon, AlertTriangle, Award, BarChart3, BookOpen, CalendarCheck,
  ClipboardCheck, ClipboardList, FileSearch, GaugeCircle, GraduationCap,
  MessageSquareWarning, Network, RefreshCw, ScrollText, ShieldAlert, Star, Truck, Wrench,
} from "lucide-react";

import { Inbox, Sparkles, Activity, CalendarClock } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

interface Modulo {
  id: string; titulo: string; desc: string; icon: any; color: string; href?: string; estado: "activo" | "proximamente";
}

const MODULOS: Modulo[] = [
  { id: "agenda", titulo: "Agenda de Cumplimiento", desc: "Todos los vencimientos del SGC (auditorías, calibraciones, NC, objetivos…) para mantenerlo vivo.", icon: CalendarClock, color: "#F43F5E", href: "/sgc/agenda", estado: "activo" },
  { id: "impl", titulo: "Tablero de Implementación", desc: "Kanban para implementar el SGC en equipo, cláusula por cláusula.", icon: Sparkles, color: "#6366F1", href: "/sgc/implementacion", estado: "activo" },
  { id: "procesos", titulo: "Mapa de Procesos (SIPOC)", desc: "Procesos con dueño, entradas/salidas, KPIs y riesgos enlazados.", icon: Network, color: "#0EA5E9", href: "/sgc/procesos", estado: "activo" },
  { id: "diag", titulo: "Diagnóstico ISO (Gap)", desc: "Cuestionario por norma, % de avance, brechas y plan de acción.", icon: FileSearch, color: "#0EA5E9", href: "/sgc/diagnostico", estado: "activo" },
  { id: "politica", titulo: "Política y Objetivos", desc: "Política de calidad y objetivos medibles (5.2 / 6.2).", icon: ScrollText, color: "#6366F1", href: "/sgc/politica", estado: "activo" },
  { id: "contexto", titulo: "Contexto y Partes Interesadas", desc: "FODA y necesidades de las partes interesadas (4.1 / 4.2).", icon: Network, color: "#0EA5E9", href: "/sgc/contexto", estado: "activo" },
  { id: "revision", titulo: "Revisión por la Dirección", desc: "Acta de revisión del SGC con entradas y salidas (9.3).", icon: ClipboardList, color: "#10B981", href: "/sgc/revision-direccion", estado: "activo" },
  { id: "doc", titulo: "Gestión Documental", desc: "Manuales, procedimientos, versiones y aprobaciones.", icon: BookOpen, color: "#6366F1", href: "/documentos", estado: "activo" },
  { id: "proc", titulo: "Gestión de Procesos", desc: "Mapa de procesos y diagramas de flujo.", icon: Wrench, color: "#8B5CF6", href: "/diagramas", estado: "activo" },
  { id: "riesgos", titulo: "Gestión de Riesgos", desc: "Matriz probabilidad × impacto, controles y mitigación.", icon: ShieldAlert, color: "#F59E0B", href: "/sgc/riesgos", estado: "activo" },
  { id: "capa", titulo: "No Conformidades (CAPA)", desc: "Acciones correctivas/preventivas, causa raíz y evidencias.", icon: AlertOctagon, color: "#EF4444", href: "/sgc/no-conformidades", estado: "activo" },
  { id: "audit", titulo: "Auditorías Internas", desc: "Programa anual, checklists y hallazgos.", icon: ClipboardCheck, color: "#10B981", href: "/sgc/auditorias", estado: "activo" },
  { id: "kpi", titulo: "Indicadores KPI", desc: "Metas, cumplimiento y tendencias por proceso.", icon: BarChart3, color: "#14B8A6", href: "/sgc/kpis", estado: "activo" },
  { id: "capac", titulo: "Capacitación", desc: "Cursos, evaluaciones, certificados y vencimientos.", icon: GraduationCap, color: "#3B82F6", href: "/sgc/capacitacion", estado: "activo" },
  { id: "comp", titulo: "Competencias", desc: "Perfiles de puesto y brechas de competencia.", icon: Award, color: "#A855F7", href: "/sgc/competencias", estado: "activo" },
  { id: "equipos", titulo: "Control de Equipos", desc: "Inventario, calibraciones y alertas de vencimiento.", icon: GaugeCircle, color: "#06B6D4", href: "/sgc/equipos", estado: "activo" },
  { id: "prov", titulo: "Evaluación de Proveedores", desc: "Evaluación, homologación y seguimiento.", icon: Truck, color: "#0891B2", href: "/sgc/evaluacion-proveedores", estado: "activo" },
  { id: "quejas", titulo: "Quejas y Satisfacción", desc: "Reclamos, encuestas y estadísticas.", icon: MessageSquareWarning, color: "#EC4899", href: "/sgc/quejas", estado: "activo" },
  { id: "encuestas", titulo: "Encuestas de Cliente", desc: "Formularios con link público; las respuestas caen en Quejas (CSAT/NPS).", icon: ClipboardList, color: "#F472B6", href: "/sgc/encuestas", estado: "activo" },
];

export default function SGCHub() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.getSGCDashboard(empresaActivaId ? { empresa: String(empresaActivaId) } : undefined)
      .then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-sky-500 to-indigo-600">
            <ClipboardCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Sistema de Gestión de Calidad</h1>
            <p className={`text-sm ${theme.textSecondary}`}>ISO 9001:2015 — diagnóstico, riesgos, no conformidades, auditorías y KPIs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/sgc/mis-pendientes")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-500 shadow-md">
            <Inbox className="w-4 h-4" /> Mis pendientes
          </button>
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dashboard ejecutivo */}
      <div>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>Dashboard ejecutivo</h2>
        {/* Cumplimiento ISO destacado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className={`rounded-2xl border p-5 ${card} lg:col-span-1`}>
            <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Cumplimiento ISO 9001</div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-black bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">{loading ? "…" : `${d?.cumplimiento_iso ?? 0}%`}</span>
            </div>
            <div className={`h-2.5 rounded-full overflow-hidden mt-2 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
              <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600" style={{ width: `${d?.cumplimiento_iso ?? 0}%` }} />
            </div>
            <div className={`text-[11px] mt-1.5 ${theme.textTertiary}`}>{d ? `${d.requisitos_evaluados}/${d.requisitos_total} requisitos evaluados` : ""}</div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Mini isDark={isDarkMode} icon={AlertOctagon} color="#EF4444" label="NC abiertas" value={loading ? "…" : d?.no_conformidades?.abiertas ?? 0} sub={d ? `${d.no_conformidades.vencidas} vencidas` : ""} />
            <Mini isDark={isDarkMode} icon={ShieldAlert} color="#F59E0B" label="Riesgos críticos" value={loading ? "…" : d?.riesgos?.criticos ?? 0} sub={d ? `${d.riesgos.altos} altos` : ""} />
            <Mini isDark={isDarkMode} icon={ClipboardCheck} color="#10B981" label="Auditorías" value={loading ? "…" : (d?.auditorias?.programadas ?? 0)} sub="programadas" />
            <Mini isDark={isDarkMode} icon={BarChart3} color="#14B8A6" label="KPIs en meta" value={loading ? "…" : `${d?.kpis?.cumplen ?? 0}/${d?.kpis?.total ?? 0}`} />
            <Mini isDark={isDarkMode} icon={GaugeCircle} color="#06B6D4" label="Calibración vencida" value={loading ? "…" : d?.equipos_calibracion_vencida ?? 0} />
            <Mini isDark={isDarkMode} icon={MessageSquareWarning} color="#EC4899" label="Quejas abiertas" value={loading ? "…" : d?.quejas_abiertas ?? 0} />
          </div>
        </div>
      </div>

      {/* Avance global del SGC */}
      <SaludSGC d={d} loading={loading} card={card} isDark={isDarkMode} theme={theme} />

      {/* Módulos */}
      <div>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULOS.map((m) => {
            const activo = m.estado === "activo" && m.href;
            return (
              <button key={m.id} disabled={!activo} onClick={() => activo && router.push(m.href!)}
                className={`relative text-left rounded-2xl border p-4 transition-all ${card} ${activo ? "hover:scale-[1.02] hover:shadow-lg cursor-pointer" : "opacity-60 cursor-default"}`}>
                {m.estado === "proximamente" && (
                  <span className={`absolute top-3 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isDarkMode ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>Próximamente</span>
                )}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm mb-2.5" style={{ background: m.color }}>
                  <m.icon className="w-5.5 h-5.5 text-white" />
                </div>
                <h3 className={`text-sm font-black ${theme.textPrimary}`}>{m.titulo}</h3>
                <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Funciones con IA (roadmap) */}
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

function Anillo({ value, size = 84, stroke = 9, color, track }: { value: number; size?: number; stroke?: number; color: string; track: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize={size * 0.26} fontWeight="900" fill={color}>{value}%</text>
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
          {/* Índice de madurez */}
          <div className="flex lg:flex-col items-center gap-3 text-center">
            <Anillo value={loading ? 0 : madurez} color={colorMad} track={track} size={108} />
            <div>
              <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Índice de madurez</div>
              <div className="text-lg font-black" style={{ color: colorMad }}>{nivel}</div>
            </div>
          </div>
          {/* Barras por dimensión */}
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
        {/* Resumen numérico */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 pt-3 border-t border-white/5">
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
    <div className={`rounded-2xl border p-3.5 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5" style={{ background: color + "20", color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-black tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}
