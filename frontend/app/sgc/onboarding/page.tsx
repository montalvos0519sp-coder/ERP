"use client";

// SGC · Asistente de arranque (onboarding). Genera la base del SGC según el giro
// de la empresa: procesos SIPOC, objetivos, riesgos típicos y roadmap de
// certificación — para arrancar en minutos en vez de semanas.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Rocket, CheckCircle2, Network, Target, ShieldAlert, Map,
  Factory, Wrench, Store, Truck, Building2, Sparkles, ArrowRight,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const GIRO_ICON: Record<string, any> = {
  manufactura: Factory, servicios: Wrench, comercio: Store, transporte: Truck, general: Building2,
};

export default function OnboardingSGCPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [giros, setGiros] = useState<any[]>([]);
  const [estado, setEstado] = useState<any>(null);
  const [giroSel, setGiroSel] = useState<string>("general");
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const giroKey = empresaActivaId ? `sgc.onboarding.giro.${empresaActivaId}` : null;

  const cargarEstado = useCallback(() => {
    if (!empresaActivaId) return;
    api.getEstadoOnboarding(empresaActivaId).then(setEstado).catch(() => setEstado(null));
  }, [empresaActivaId]);

  useEffect(() => {
    api.getGirosOnboarding().then((g) => setGiros(g || [])).catch(() => setGiros([]));
    cargarEstado();
    // Recupera el giro previamente elegido para esta empresa.
    if (giroKey) {
      const guardado = typeof window !== "undefined" ? window.localStorage.getItem(giroKey) : null;
      if (guardado) setGiroSel(guardado);
    }
  }, [cargarEstado, giroKey]);

  // Guarda la selección de giro al cambiar (persiste entre recargas).
  const elegirGiro = (id: string) => {
    setGiroSel(id);
    if (giroKey && typeof window !== "undefined") window.localStorage.setItem(giroKey, id);
  };

  const generar = async () => {
    if (!empresaActivaId) return;
    setBusy(true);
    try {
      const r = await api.generarOnboarding(empresaActivaId, giroSel);
      if (giroKey && typeof window !== "undefined") window.localStorage.setItem(giroKey, giroSel);
      setResultado(r);
      cargarEstado();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #6366F1 0, transparent 40%), radial-gradient(circle at 90% 80%, #10B981 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500"><Rocket className="w-7 h-7 text-white" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Asistente de arranque</h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-indigo-500 to-emerald-500">Inicio rápido</span>
              </div>
              <p className={`text-sm mt-0.5 max-w-2xl ${theme.textSecondary}`}>Elige el giro de tu empresa y genera la base del SGC en segundos: procesos, objetivos, riesgos típicos y tu roadmap de certificación.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estado actual */}
      {estado && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <EstadoCard icon={Network} color="#0EA5E9" label="Procesos" value={estado.procesos} theme={theme} isDark={isDarkMode} />
          <EstadoCard icon={Target} color="#8B5CF6" label="Objetivos" value={estado.objetivos} theme={theme} isDark={isDarkMode} />
          <EstadoCard icon={ShieldAlert} color="#F59E0B" label="Riesgos" value={estado.riesgos} theme={theme} isDark={isDarkMode} />
          <EstadoCard icon={Map} color="#10B981" label="Roadmap" value={estado.roadmap} theme={theme} isDark={isDarkMode} />
          <EstadoCard icon={CheckCircle2} color="#14B8A6" label="Diagnóstico" value={estado.diagnostico} theme={theme} isDark={isDarkMode} />
        </div>
      )}

      {/* Selección de giro */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>1 · Selecciona el giro de tu empresa</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {giros.map((g) => {
            const Icon = GIRO_ICON[g.id] || Building2;
            const sel = giroSel === g.id;
            return (
              <button key={g.id} onClick={() => elegirGiro(g.id)}
                className={`text-left rounded-2xl border p-4 transition-all ${sel ? "ring-2 shadow-md" : "hover:shadow-sm"} ${card}`}
                style={sel ? { boxShadow: "0 0 0 2px #6366F155", borderColor: "#6366F1" } : {}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: sel ? "#6366F1" : (isDarkMode ? "#ffffff10" : "#0000000a"), color: sel ? "#fff" : (isDarkMode ? "#cbd5e1" : "#475569") }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`text-sm font-black ${theme.textPrimary}`}>{g.label}</div>
                {sel && <div className="text-[11px] font-bold mt-1 text-indigo-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Seleccionado</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generar */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>2 · Genera tu SGC base</h2>
        <p className={`text-sm mb-4 ${theme.textSecondary}`}>
          Crearemos automáticamente los <b>procesos SIPOC</b>, <b>objetivos de calidad</b>, <b>riesgos típicos</b> de tu giro y tu <b>roadmap de certificación</b>. No se duplica nada que ya exista.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={generar} disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition disabled:opacity-40 bg-gradient-to-r from-indigo-500 to-emerald-500">
            <Sparkles className="w-4 h-4" /> {busy ? "Generando…" : "Generar SGC base"}
          </button>
          <span className={`text-xs ${theme.textSecondary}`}>
            Giro seleccionado: <b className={theme.textPrimary}>{giros.find((g) => g.id === giroSel)?.label || giroSel}</b>
          </span>
        </div>

        {resultado && (
          <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <p className="text-sm font-bold text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ¡Base generada para {resultado.giro}!</p>
            <div className={`text-xs mt-1 ${theme.textSecondary}`}>
              Nuevos: {resultado.creados.procesos} procesos · {resultado.creados.objetivos} objetivos · {resultado.creados.riesgos} riesgos · {resultado.creados.roadmap} hitos de roadmap.
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => router.push("/sgc/roadmap")} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"><Map className="w-3.5 h-3.5" /> Ver mi roadmap <ArrowRight className="w-3 h-3" /></button>
              <button onClick={() => router.push("/sgc/procesos")} className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300"><Network className="w-3.5 h-3.5" /> Ver procesos <ArrowRight className="w-3 h-3" /></button>
              <button onClick={() => router.push("/sgc/diagnostico")} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> Hacer diagnóstico <ArrowRight className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Siguiente paso */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>3 · Continúa tu camino a la certificación</h2>
        <p className={`text-sm mb-3 ${theme.textSecondary}`}>Una vez generada la base, sigue tu roadmap paso a paso y usa las plantillas para documentar tu SGC.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push("/sgc/roadmap")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-500"><Map className="w-4 h-4" /> Abrir roadmap</button>
          <button onClick={() => router.push("/sgc/plantillas")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200" : "border-slate-200 text-slate-700"}`}><Sparkles className="w-4 h-4" /> Ver plantillas ISO</button>
        </div>
      </div>
    </div>
  );
}

function EstadoCard({ icon: Icon, color, label, value, theme, isDark }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span>
        <span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span>
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}
