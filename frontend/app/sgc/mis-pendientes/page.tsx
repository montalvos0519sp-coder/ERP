"use client";

// Bandeja unificada "Mis pendientes de calidad": agrega todo lo asignado al
// usuario (NC, riesgos, objetivos, auditorías, capacitaciones, calibraciones)
// con sus vencimientos. Es el corazón de la colaboración multi-usuario: cada
// quien ve su parte del SGC.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Inbox, AlertTriangle, ClipboardCheck, ShieldAlert,
  Target, ClipboardList, GraduationCap, Gauge, ChevronRight, Sparkles, ListChecks,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const ICONO: Record<string, any> = {
  "No conformidad": ClipboardCheck, "Riesgo": ShieldAlert, "Objetivo": Target,
  "Auditoría": ClipboardList, "Capacitación": GraduationCap, "Calibración": Gauge,
  "Implementación": Sparkles,
};
const COLOR: Record<string, string> = {
  "No conformidad": "from-rose-500 to-red-600", "Riesgo": "from-amber-500 to-orange-600",
  "Objetivo": "from-violet-500 to-purple-600", "Auditoría": "from-sky-500 to-blue-600",
  "Capacitación": "from-emerald-500 to-green-600", "Calibración": "from-cyan-500 to-teal-600",
  "Implementación": "from-indigo-500 to-violet-600",
};

export default function MisPendientesPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId, user } = useUser();
  const [data, setData] = useState<{ total: number; vencidos: number; items: any[] }>({ total: 0, vencidos: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getMisPendientesSGC(empresaActivaId)
      .then((d) => setData(d && Array.isArray(d.items) ? d : { total: 0, vencidos: 0, items: [] }))
      .catch(() => setData({ total: 0, vencidos: 0, items: [] }))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const lista = data?.items ?? [];
  const tipos = Array.from(new Set(lista.map((i) => i.tipo)));
  const visibles = filtro === "TODOS" ? lista : lista.filter((i) => i.tipo === filtro);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-sky-500 to-emerald-500"><Inbox className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Mis pendientes de calidad</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Todo lo que el equipo te asignó en el SGC, en un solo lugar.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="text-3xl font-black tabular-nums text-sky-500">{data.total}</div>
          <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Pendientes asignados</div>
        </div>
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="text-3xl font-black tabular-nums text-rose-500 flex items-center gap-2">{data.vencidos}{data.vencidos > 0 && <AlertTriangle className="w-5 h-5" />}</div>
          <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Vencidos</div>
        </div>
        <div className={`rounded-2xl border p-4 ${card} hidden md:block`}>
          <div className={`text-sm font-bold ${theme.textPrimary}`}>{user?.first_name || user?.username}</div>
          <div className={`text-[11px] ${theme.textTertiary}`}>Tus tareas de calidad activas</div>
        </div>
      </div>

      {/* Filtro por tipo */}
      {tipos.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {["TODOS", ...tipos].map((t) => (
            <button key={t} onClick={() => setFiltro(t)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === t ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
              {t === "TODOS" ? "Todos" : t}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2.5">
        {loading ? (
          <div className={`rounded-2xl border p-10 text-center ${card} ${theme.textTertiary}`}>Cargando…</div>
        ) : visibles.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${card}`}>
            <Inbox className={`w-10 h-10 mx-auto mb-3 ${theme.textTertiary}`} />
            <p className={`font-bold ${theme.textPrimary}`}>¡Sin pendientes! </p>
            <p className={`text-sm ${theme.textSecondary}`}>No tienes registros del SGC asignados. Cuando alguien te asigne algo, aparecerá aquí.</p>
          </div>
        ) : visibles.map((it) => {
          const Ic = ICONO[it.tipo] || ClipboardCheck;
          return (
            <button key={`${it.tipo}-${it.id}`} onClick={() => router.push(it.url)}
              className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition hover:shadow-md ${card} ${it.vencido ? "ring-1 ring-rose-500/40" : ""}`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shadow bg-gradient-to-br ${COLOR[it.tipo] || "from-slate-500 to-slate-600"} shrink-0`}>
                <Ic className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textTertiary}`}>{it.tipo}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">{it.estado}</span>
                  {it.vencido && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vencido</span>}
                </div>
                <p className={`text-sm font-semibold truncate ${theme.textPrimary}`}>{it.titulo}</p>
                {(it.sub || it.progreso != null) && (
                  <div className="flex items-center gap-2 mt-1">
                    {it.sub && it.sub.total > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${it.sub.done === it.sub.total ? "bg-emerald-500/15 text-emerald-500" : "bg-violet-500/15 text-violet-400"}`}><ListChecks className="w-2.5 h-2.5" /> {it.sub.done}/{it.sub.total}</span>}
                    {it.progreso != null && (
                      <>
                        <div className={`flex-1 max-w-[180px] h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.08]" : "bg-slate-200"}`}>
                          <div className="h-full bg-gradient-to-r from-violet-500 to-sky-500" style={{ width: `${it.progreso}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums ${theme.textTertiary}`}>{it.progreso}%</span>
                      </>
                    )}
                  </div>
                )}
                {it.fecha_limite && <p className={`text-xs mt-0.5 ${it.vencido ? "text-rose-400 font-bold" : theme.textTertiary}`}>Fecha límite: {it.fecha_limite}</p>}
              </div>
              <ChevronRight className={`w-5 h-5 shrink-0 ${theme.textTertiary}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
