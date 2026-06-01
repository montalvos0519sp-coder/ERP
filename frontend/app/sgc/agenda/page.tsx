"use client";

// SGC · Agenda de Cumplimiento — la herramienta para MANTENER el sistema vivo.
// Reúne todos los vencimientos del SGC (auditorías, calibraciones, capacitación,
// NC, objetivos, revisión por la dirección, acuerdos, implementación y CAPA) en
// una sola línea de tiempo con semáforo de urgencia.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, CalendarClock, AlertTriangle, Clock, CheckCircle2,
  ClipboardCheck, GaugeCircle, GraduationCap, ClipboardList, Target, Sparkles,
  Handshake, FileWarning, Filter,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const TIPO_META: Record<string, { icon: any; color: string }> = {
  "Auditoría": { icon: ClipboardCheck, color: "#10B981" },
  "Calibración": { icon: GaugeCircle, color: "#06B6D4" },
  "Capacitación": { icon: GraduationCap, color: "#3B82F6" },
  "No conformidad": { icon: FileWarning, color: "#F43F5E" },
  "Objetivo": { icon: Target, color: "#8B5CF6" },
  "Revisión dirección": { icon: ClipboardList, color: "#059669" },
  "Acuerdo dirección": { icon: Handshake, color: "#0EA5E9" },
  "Implementación": { icon: Sparkles, color: "#6366F1" },
  "Acción CAPA": { icon: CheckCircle2, color: "#EF4444" },
};

function etiquetaDias(d: number) {
  if (d < 0) return `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`;
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `En ${d} días`;
}

export default function AgendaPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<any>({ eventos: [], resumen: {} });
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getAgendaSGC(empresaActivaId).then((d) => setData(d && Array.isArray(d.eventos) ? d : { eventos: [], resumen: {} })).catch(() => {}).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const tipos = useMemo(() => Array.from(new Set((data.eventos || []).map((e: any) => e.tipo))), [data]);
  const eventos = (data.eventos || []).filter((e: any) => filtro === "TODOS" || e.tipo === filtro);

  // Agrupa por urgencia.
  const grupos = useMemo(() => {
    const g: Record<string, any[]> = { vencido: [], semana: [], mes: [], futuro: [] };
    for (const e of eventos) {
      if (e.dias < 0) g.vencido.push(e);
      else if (e.dias <= 7) g.semana.push(e);
      else if (e.dias <= 30) g.mes.push(e);
      else g.futuro.push(e);
    }
    return g;
  }, [eventos]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const r = data.resumen || {};

  const SECCIONES = [
    { k: "vencido", t: "Vencidos", color: "#F43F5E", icon: AlertTriangle },
    { k: "semana", t: "Próximos 7 días", color: "#F59E0B", icon: Clock },
    { k: "mes", t: "Este mes", color: "#0EA5E9", icon: CalendarClock },
    { k: "futuro", t: "Más adelante", color: "#10B981", icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-rose-500 to-orange-600"><CalendarClock className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Agenda de Cumplimiento</h1><p className={`text-sm ${theme.textSecondary}`}>Todo lo que vence en tu SGC, en un solo lugar. La herramienta para mantenerlo vivo.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={AlertTriangle} color="#F43F5E" label="Vencidos" value={r.vencidos ?? 0} isDark={isDarkMode} theme={theme} />
        <KPI icon={Clock} color="#F59E0B" label="Próximos 7 días" value={r.semana ?? 0} isDark={isDarkMode} theme={theme} />
        <KPI icon={CalendarClock} color="#0EA5E9" label="Este mes" value={r.mes ?? 0} isDark={isDarkMode} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Total programado" value={r.total ?? 0} isDark={isDarkMode} theme={theme} />
      </div>

      {/* Filtro por tipo */}
      {tipos.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter className={`w-3.5 h-3.5 ${theme.textTertiary}`} />
          <button onClick={() => setFiltro("TODOS")} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === "TODOS" ? "bg-gradient-to-r from-rose-500 to-orange-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>Todos</button>
          {tipos.map((t: any) => <button key={t} onClick={() => setFiltro(t)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === t ? "bg-gradient-to-r from-rose-500 to-orange-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{t}</button>)}
        </div>
      )}

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : eventos.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <p className={`font-bold ${theme.textPrimary}`}>¡Todo al día! </p>
          <p className={`text-sm ${theme.textSecondary}`}>No hay vencimientos pendientes en el SGC.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {SECCIONES.map((s) => {
            const lista = grupos[s.k];
            if (!lista.length) return null;
            return (
              <div key={s.k}>
                <h2 className="text-sm font-black uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: s.color }}>
                  <s.icon className="w-4 h-4" /> {s.t} <span className={theme.textTertiary}>({lista.length})</span>
                </h2>
                <div className="space-y-2">
                  {lista.map((e: any, i: number) => {
                    const tm = TIPO_META[e.tipo] || { icon: CalendarClock, color: "#94A3B8" };
                    return (
                      <button key={i} onClick={() => router.push(e.url)} className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition hover:shadow-md ${card} ${e.estado === "vencido" ? "ring-1 ring-rose-500/30" : ""}`}>
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: tm.color + "20", color: tm.color }}><tm.icon className="w-4.5 h-4.5" /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wide" style={{ color: tm.color }}>{e.tipo}</span></div>
                          <p className={`text-sm font-semibold truncate ${theme.textPrimary}`}>{e.titulo}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-black ${e.dias < 0 ? "text-rose-500" : e.dias <= 7 ? "text-amber-500" : theme.textSecondary}`}>{etiquetaDias(e.dias)}</div>
                          <div className={`text-[10px] ${theme.textTertiary}`}>{e.fecha}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}
