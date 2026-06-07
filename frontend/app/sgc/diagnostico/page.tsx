"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSearch, MinusCircle, RefreshCw, Wand2, XCircle } from "lucide-react";

import { exportCSV } from "@/lib/csv";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const NIVELES = [
  { v: "NO", label: "No cumple", color: "#EF4444", icon: XCircle },
  { v: "PARCIAL", label: "Parcial", color: "#F59E0B", icon: AlertTriangle },
  { v: "SI", label: "Cumple", color: "#10B981", icon: CheckCircle2 },
  { v: "NA", label: "N/A", color: "#94A3B8", icon: MinusCircle },
];
const PUNTOS: Record<string, number> = { NO: 0, PARCIAL: 50, SI: 100 };

export default function DiagnosticoPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [reqs, setReqs] = useState<any[]>([]);
  const [evalMap, setEvalMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);

  const generarCapa = async () => {
    if (!empresaActivaId) return;
    setGenerando(true);
    try {
      const r = await api.generarCapaDesdeDiagnostico(empresaActivaId);
      alert(`Se generaron ${r.creadas} no conformidades a partir de las brechas. Revísalas en No Conformidades (CAPA).`);
    } catch (e) { alert((e as Error).message); }
    finally { setGenerando(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e] = await Promise.all([
        api.getRequisitosISO(),
        api.getDiagnostico(empresaActivaId ? { empresa: String(empresaActivaId) } : undefined),
      ]);
      setReqs(r.results || []);
      const m: Record<number, any> = {};
      (e.results || []).forEach((ev: any) => { m[ev.requisito] = ev; });
      setEvalMap(m);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const setNivel = async (req: any, cumple: string) => {
    setSaving(req.id);
    const existente = evalMap[req.id];
    try {
      let saved;
      if (existente?.id) saved = await api.actualizarEvaluacionReq(existente.id, { cumple });
      else saved = await api.guardarEvaluacionReq({ empresa: empresaActivaId, requisito: req.id, cumple });
      setEvalMap((p) => ({ ...p, [req.id]: { ...(p[req.id] || {}), ...saved } }));
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(null); }
  };

  const setObs = (req: any, obs: string) =>
    setEvalMap((p) => ({ ...p, [req.id]: { ...(p[req.id] || { requisito: req.id }), observaciones: obs } }));
  const guardarObs = async (req: any) => {
    const ev = evalMap[req.id];
    if (!ev) return;
    try {
      if (ev.id) await api.actualizarEvaluacionReq(ev.id, { observaciones: ev.observaciones || "" });
      else { const s = await api.guardarEvaluacionReq({ empresa: empresaActivaId, requisito: req.id, cumple: "NO", observaciones: ev.observaciones || "" }); setEvalMap((p) => ({ ...p, [req.id]: s })); }
    } catch { /* */ }
  };

  // Métricas
  const { avance, evaluados, brechas } = useMemo(() => {
    // Requisitos que aplican = todos los de la norma menos los marcados "No aplica".
    const aplicables = reqs.filter((r) => evalMap[r.id]?.cumple !== "NA");
    // Evaluados = los que ya tienen un nivel (SI/PARCIAL/NO).
    const evs = aplicables.map((r) => evalMap[r.id]).filter((e) => e && e.cumple);
    const suma = evs.reduce((s, e) => s + (PUNTOS[e.cumple] ?? 0), 0);
    // El avance se mide sobre TODOS los requisitos aplicables: lo no evaluado
    // todavía no cumple, así que cuenta como 0 (refleja el avance real del SGC).
    const av = aplicables.length ? Math.round(suma / aplicables.length) : 0;
    const br = reqs.filter((r) => { const e = evalMap[r.id]; return e && (e.cumple === "NO" || e.cumple === "PARCIAL"); });
    return { avance: av, evaluados: evs.length, brechas: br };
  }, [reqs, evalMap]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #0EA5E9 0, transparent 40%), radial-gradient(circle at 90% 80%, #06B6D4 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-sky-500 via-cyan-500 to-cyan-600"><FileSearch className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Diagnóstico ISO 9001</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-sky-500 to-cyan-600">Gap Analysis</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Evalúa cada requisito de la norma; el sistema calcula el avance, detecta brechas y genera el plan de acción.</p>
              </div>
            </div>
            <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-5 ${card} sm:col-span-1`}>
          <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Avance de cumplimiento</div>
          <div className="text-4xl font-black mt-1 bg-gradient-to-r from-sky-500 to-cyan-600 bg-clip-text text-transparent">{avance}%</div>
          <div className={`h-2.5 rounded-full overflow-hidden mt-2 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
            <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-600" style={{ width: `${avance}%` }} />
          </div>
          <div className={`text-[11px] mt-1.5 ${theme.textTertiary}`}>Sobre el total de requisitos aplicables de la norma</div>
        </div>
        <div className={`rounded-2xl border p-5 ${card} flex flex-col justify-center`}>
          <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Requisitos evaluados</div>
          <div className={`text-2xl font-black ${theme.textPrimary}`}>{evaluados} / {reqs.length}</div>
        </div>
        <div className={`rounded-2xl border p-5 ${card} flex flex-col justify-center`}>
          <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Brechas detectadas</div>
          <div className="text-2xl font-black text-amber-500">{brechas.length}</div>
          <div className={`text-[11px] ${theme.textTertiary}`}>requisitos no/parcialmente cumplidos</div>
        </div>
      </div>

      {/* Cuestionario */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-2.5 text-sm font-black uppercase tracking-wider ${theme.textPrimary} border-b ${isDarkMode ? "border-white/[0.05]" : "border-slate-100"}`}>
          Cuestionario · ISO 9001:2015 ({reqs.length} requisitos)
        </div>
        {loading ? (
          <div className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {reqs.map((r) => {
              const ev = evalMap[r.id];
              return (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-black text-sky-500">{r.clausula}</span>
                      <span className={`ml-2 font-bold ${theme.textPrimary}`}>{r.titulo}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {NIVELES.map((n) => {
                        const sel = ev?.cumple === n.v;
                        return (
                          <button key={n.v} onClick={() => setNivel(r, n.v)} disabled={saving === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                            style={sel
                              ? { background: n.color, borderColor: n.color, color: "#fff" }
                              : { borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0", color: n.color }}>
                            <n.icon className="w-3.5 h-3.5" /> {n.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {ev && (ev.cumple === "NO" || ev.cumple === "PARCIAL") && (
                    <input
                      value={ev.observaciones || ""}
                      onChange={(e) => setObs(r, e.target.value)}
                      onBlur={() => guardarObs(r)}
                      placeholder="Brecha / acción para cerrar el gap…"
                      className={`mt-2 w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan de acción (brechas) */}
      {brechas.length > 0 && (
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${theme.textPrimary}`}>
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Plan de acción automático ({brechas.length} brechas)
            </h2>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(`gap_iso_${avance}pct`, ["Cláusula", "Requisito", "Nivel", "Observación"], brechas.map((r) => [r.clausula, r.titulo, evalMap[r.id]?.cumple, evalMap[r.id]?.observaciones]))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
              <button onClick={generarCapa} disabled={generando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 bg-gradient-to-r from-rose-500 to-red-600">
                <Wand2 className="w-3.5 h-3.5" /> {generando ? "Generando…" : "Generar plan de acción (CAPA)"}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5">
            {brechas.map((r) => {
              const ev = evalMap[r.id];
              return (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${ev?.cumple === "NO" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-600"}`}>{ev?.cumple}</span>
                  <span><b className="font-mono text-sky-500">{r.clausula}</b> {r.titulo}{ev?.observaciones ? <span className={theme.textTertiary}> — {ev.observaciones}</span> : ""}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
