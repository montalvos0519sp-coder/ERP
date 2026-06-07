"use client";

// SGC · Roadmap de Certificación ISO 9001.
// Guía por fases e hitos con progreso global y siguiente acción recomendada.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Map, RefreshCw, CheckCircle2, Circle, ChevronRight } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const FASE_COLOR = (estado: string) => {
  if (estado === "completada") return "#10B981";
  if (estado === "en_progreso") return "#F59E0B";
  return "#94A3B8";
};

export default function RoadmapPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getRoadmapProgreso(empresaActivaId)
      .then((r) => setData(r || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const generar = async () => {
    if (!empresaActivaId) return;
    setBusy(true);
    try { await api.generarRoadmap(empresaActivaId); load(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  const toggleHito = async (h: any) => {
    try {
      await api.actualizarHito(h.id, {
        completado: !h.completado,
        fecha_completado: !h.completado ? new Date().toISOString().slice(0, 10) : null,
      });
      load();
    } catch (e) { alert((e as Error).message); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const fases: any[] = data?.fases || [];
  const tieneRoadmap = data && (data.total ?? 0) > 0;
  const progreso = data?.progreso ?? 0;
  const sig = data?.siguiente_accion;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #0EA5E9 0, transparent 40%), radial-gradient(circle at 90% 80%, #10B981 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-600"><Map className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Roadmap de Certificación</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-sky-500 to-emerald-600">Certificación</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Tu plan por fases e hitos hacia la certificación ISO 9001:2015.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
            </div>
          </div>
          {tieneRoadmap && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Progreso global hacia la certificación</span>
                <span className="text-sm font-black text-emerald-500">{progreso}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progreso}%`, background: "linear-gradient(90deg, #0EA5E9, #10B981)" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : !tieneRoadmap ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <Map className="w-10 h-10 mx-auto mb-3 text-sky-400" />
          <p className={`font-bold ${theme.textPrimary}`}>Aún no tienes un roadmap</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Genera tu plan de certificación con fases e hitos guiados.</p>
          <button onClick={generar} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 bg-gradient-to-r from-sky-500 to-emerald-600">
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />} {busy ? "Generando…" : "Generar mi roadmap de certificación"}
          </button>
        </div>
      ) : (
        <>
          {sig && (
            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className={`text-[11px] uppercase tracking-wider font-black ${theme.textTertiary}`}>Siguiente acción recomendada</div>
                  <h3 className={`text-lg font-black mt-0.5 ${theme.textPrimary}`}>{sig.titulo}</h3>
                  {sig.fase && <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">{sig.fase}</span>}
                </div>
                {sig.ruta && <button onClick={() => router.push(sig.ruta)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-emerald-600">Ir <ChevronRight className="w-4 h-4" /></button>}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {fases.map((fase) => {
              const color = FASE_COLOR(fase.estado);
              return (
                <div key={fase.id ?? fase.nombre} className={`rounded-2xl border p-4 ${card}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <h3 className={`text-sm font-black ${theme.textPrimary}`}>{fase.nombre}</h3>
                    </div>
                    <span className={`text-xs font-bold ${theme.textTertiary}`}>{fase.completados ?? 0}/{fase.total ?? 0}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fase.progreso ?? 0}%`, background: color }} />
                  </div>
                  <div className="space-y-1.5">
                    {(fase.hitos || []).map((h: any) => (
                      <div key={h.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${isDarkMode ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"}`}>
                        <button onClick={() => toggleHito(h)} className="shrink-0">
                          {h.completado ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className={`w-4 h-4 ${theme.textTertiary}`} />}
                        </button>
                        <span className={`text-sm flex-1 ${h.completado ? `line-through ${theme.textTertiary}` : theme.textSecondary}`}>{h.titulo}</span>
                        {h.clausula && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 shrink-0">{h.clausula}</span>}
                        {h.ruta && <button onClick={() => router.push(h.ruta)} className="text-[11px] font-bold text-sky-500 hover:text-sky-400 shrink-0">Ir →</button>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
