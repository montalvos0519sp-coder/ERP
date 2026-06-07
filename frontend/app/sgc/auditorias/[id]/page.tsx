"use client";

// SGC · Auditoría en vivo (9.2) — checklist ejecutable.
// El auditor recorre cada requisito de la norma y lo marca como Conforme /
// No conforme / Observación / N.A. con notas. Autosave por punto, barra de
// progreso y contadores en vivo. Al cerrar genera los hallazgos automáticamente.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, Eye, MinusCircle, FileCheck,
  ClipboardCheck, RefreshCw, Loader2, Check, AlertTriangle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

// Definición de los 4 resultados posibles del segmento.
const OPCIONES: { v: string; label: string; Icon: any; activeCls: string; ring: string }[] = [
  { v: "CONFORME",    label: "Conforme",    Icon: CheckCircle2, activeCls: "bg-emerald-500 text-white border-emerald-500", ring: "ring-emerald-500/40" },
  { v: "NO_CONFORME", label: "No conforme", Icon: XCircle,      activeCls: "bg-rose-500 text-white border-rose-500",       ring: "ring-rose-500/40" },
  { v: "OBSERVACION", label: "Observación", Icon: Eye,          activeCls: "bg-amber-500 text-white border-amber-500",     ring: "ring-amber-500/40" },
  { v: "NA",          label: "N.A.",        Icon: MinusCircle,  activeCls: "bg-slate-500 text-white border-slate-500",     ring: "ring-slate-500/40" },
];

export default function AuditoriaEnVivoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();

  const [data, setData] = useState<any>(null);     // shape completo del checklist
  const [puntos, setPuntos] = useState<any[]>([]); // puntos editables localmente
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [cerrando, setCerrando] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  // estado de autosave por punto: "saving" | "saved"
  const [saveState, setSaveState] = useState<Record<string | number, "saving" | "saved">>({});

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.getChecklistAud(Number(id));
      setData(r || {});
      setPuntos(Array.isArray(r?.puntos) ? r.puntos : []);
      if ((r?.auditoria?.estado || "").toUpperCase() === "CERRADA") setCerrada(true);
    } catch (e) {
      setError((e as Error).message || "No se pudo cargar la auditoría.");
      setData(null);
      setPuntos([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Contadores: usamos los del backend si vienen, si no los calculamos local.
  const conteo = useMemo(() => {
    const base = {
      total: puntos.length,
      conforme: puntos.filter((p) => p.resultado === "CONFORME").length,
      no_conforme: puntos.filter((p) => p.resultado === "NO_CONFORME").length,
      observacion: puntos.filter((p) => p.resultado === "OBSERVACION").length,
      na: puntos.filter((p) => p.resultado === "NA").length,
      pendiente: puntos.filter((p) => !p.resultado || p.resultado === "PENDIENTE").length,
    };
    const total = base.total || 0;
    const progreso = total > 0 ? Math.round(((total - base.pendiente) / total) * 100) : 0;
    return { ...base, progreso };
  }, [puntos]);

  // Mergea los contadores que devuelve el autosave dentro de `data` (no recarga lista).
  const mergeContadores = (resp: any) => {
    if (!resp || typeof resp !== "object") return;
    setData((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      ["progreso", "total", "conforme", "no_conforme", "observacion", "pendiente"].forEach((k) => {
        if (resp[k] !== undefined && resp[k] !== null) next[k] = resp[k];
      });
      return next;
    });
  };

  // Cambio de resultado: update local inmediato + autosave en background.
  const setResultado = async (punto: any, resultado: string) => {
    if (cerrada) return;
    const nuevo = punto.resultado === resultado ? "PENDIENTE" : resultado;
    setPuntos((prev) => prev.map((p) => (p.id === punto.id ? { ...p, resultado: nuevo } : p)));
    await guardar(punto.id, { resultado: nuevo, nota: punto.nota ?? "" });
  };

  // Cambio de nota local (sin guardar todavía).
  const setNota = (punto: any, nota: string) => {
    setPuntos((prev) => prev.map((p) => (p.id === punto.id ? { ...p, nota } : p)));
  };

  // Autosave de la nota al perder el foco.
  const guardarNota = async (punto: any) => {
    if (cerrada) return;
    await guardar(punto.id, { resultado: punto.resultado, nota: punto.nota ?? "" });
  };

  const guardar = async (puntoId: any, payload: { resultado?: string; nota?: string }) => {
    setSaveState((s) => ({ ...s, [puntoId]: "saving" }));
    try {
      const resp = await api.guardarPuntoChecklist(Number(id), { id: puntoId, ...payload });
      mergeContadores(resp);
      setSaveState((s) => ({ ...s, [puntoId]: "saved" }));
      setTimeout(() => setSaveState((s) => { const n = { ...s }; delete n[puntoId]; return n; }), 1500);
    } catch (e) {
      setSaveState((s) => { const n = { ...s }; delete n[puntoId]; return n; });
      // No rompemos la UI; informamos discretamente.
      console.error("autosave checklist", e);
    }
  };

  const cerrar = async () => {
    const pendientes = (data?.pendiente ?? conteo.pendiente) || 0;
    if (pendientes > 0) {
      if (!confirm(`Quedan ${pendientes} requisito(s) sin evaluar. ¿Cerrar la auditoría de todas formas y generar los hallazgos?`)) return;
    } else if (!confirm("¿Cerrar la auditoría y generar los hallazgos a partir del checklist?")) {
      return;
    }
    setCerrando(true);
    try {
      const resp = await api.cerrarChecklistAud(Number(id));
      const nh = resp?.hallazgos ?? resp?.hallazgos_generados ?? resp?.generados ?? resp?.total_hallazgos;
      setCerrada(true);
      alert(
        nh !== undefined && nh !== null
          ? `Auditoría cerrada. Se generaron ${nh} hallazgo(s).`
          : "Auditoría cerrada y hallazgos generados."
      );
      router.push("/sgc/auditorias");
    } catch (e) {
      alert((e as Error).message || "No se pudo cerrar la auditoría.");
    } finally {
      setCerrando(false);
    }
  };

  // ---- valores derivados de display (preferimos backend, fallback local) ----
  const aud = data?.auditoria || {};
  const titulo = aud.titulo || aud.nombre || "Auditoría";
  const progreso = data?.progreso ?? conteo.progreso;
  const total = data?.total ?? conteo.total;
  const cConforme = data?.conforme ?? conteo.conforme;
  const cNoConf = data?.no_conforme ?? conteo.no_conforme;
  const cObs = data?.observacion ?? conteo.observacion;
  const cPend = data?.pendiente ?? conteo.pendiente;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* ===================== HERO ===================== */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #10B981 0, transparent 40%), radial-gradient(circle at 90% 80%, #14B8A6 0, transparent 42%)" }} />
        <div className="relative p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.push("/sgc/auditorias")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}>
                <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 shrink-0">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary} truncate`}>{titulo}</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-emerald-500 to-teal-600">EN VIVO · 9.2</span>
                  {cerrada && <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-500 border-emerald-500/30">CERRADA</span>}
                </div>
                <p className={`text-sm mt-0.5 ${theme.textSecondary}`}>Marca cada requisito y al cerrar se generan los hallazgos automáticamente.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={loading} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={cerrar}
                disabled={cerrando || cerrada || loading || total === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:shadow-lg transition"
              >
                {cerrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                {cerrada ? "Cerrada" : cerrando ? "Cerrando…" : "Cerrar y generar hallazgos"}
              </button>
            </div>
          </div>

          {/* ----- Barra de progreso ----- */}
          {!loading && total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary}`}>Progreso de la auditoría</span>
                <span className="text-sm font-black tabular-nums" style={{ color: "#10B981" }}>{progreso}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-200/70"}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" style={{ width: `${progreso}%` }} />
              </div>
              {/* Contadores */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Contador color="#10B981" label="Conforme" value={cConforme} isDark={isDarkMode} />
                <Contador color="#F43F5E" label="No conforme" value={cNoConf} isDark={isDarkMode} />
                <Contador color="#F59E0B" label="Observación" value={cObs} isDark={isDarkMode} />
                <Contador color="#94A3B8" label="Pendiente" value={cPend} isDark={isDarkMode} />
                <span className={`text-[11px] ml-auto ${theme.textTertiary}`}>{total} requisitos</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== CONTENIDO ===================== */}
      {loading ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-400" />
          <p className={`text-sm ${theme.textSecondary}`}>Cargando checklist…</p>
        </div>
      ) : error ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-400" />
          <p className={`font-bold ${theme.textPrimary}`}>No se pudo cargar la auditoría</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>{error}</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      ) : puntos.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <p className={`font-bold ${theme.textPrimary}`}>Esta auditoría no tiene requisitos asociados a una norma</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Asocia una norma con sus requisitos a la auditoría para poder ejecutar el checklist en vivo.</p>
          <button onClick={() => router.push("/sgc/auditorias")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
            <ArrowLeft className="w-4 h-4" /> Volver a auditorías
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {puntos.map((p, idx) => {
            const ss = saveState[p.id];
            return (
              <div key={p.id ?? idx} className={`rounded-2xl border p-4 ${card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {p.clausula && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 tabular-nums">
                        {p.clausula}
                      </span>
                    )}
                    <p className={`text-sm font-semibold ${theme.textPrimary}`}>{p.pregunta || p.requisito || p.texto || "Requisito"}</p>
                  </div>
                  {/* Estado de autosave */}
                  <div className="shrink-0 h-5 flex items-center">
                    {ss === "saving" && <span className={`inline-flex items-center gap-1 text-[11px] ${theme.textTertiary}`}><Loader2 className="w-3 h-3 animate-spin" /> guardando…</span>}
                    {ss === "saved" && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500"><Check className="w-3 h-3" /> guardado</span>}
                  </div>
                </div>

                {/* Segmento de resultado */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
                  {OPCIONES.map(({ v, label, Icon, activeCls, ring }) => {
                    const active = p.resultado === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={cerrada}
                        onClick={() => setResultado(p, v)}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition disabled:cursor-not-allowed ${
                          active
                            ? `${activeCls} shadow-sm ring-2 ${ring}`
                            : isDarkMode
                              ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    );
                  })}
                </div>

                {/* Nota / evidencia */}
                <textarea
                  rows={2}
                  disabled={cerrada}
                  value={p.nota || ""}
                  onChange={(e) => setNota(p, e.target.value)}
                  onBlur={() => guardarNota(p)}
                  placeholder="Evidencia / observación…"
                  className={`w-full mt-2.5 px-3 py-2 rounded-lg border text-sm outline-none resize-y disabled:opacity-60 ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"}`}
                />
              </div>
            );
          })}

          {/* Cierre al final también */}
          {!cerrada && (
            <div className="flex justify-end pt-1">
              <button
                onClick={cerrar}
                disabled={cerrando || total === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:shadow-lg transition"
              >
                {cerrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                {cerrando ? "Cerrando…" : "Cerrar auditoría y generar hallazgos"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Contador({ color, label, value, isDark }: any) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold"
      style={{
        color,
        borderColor: `${color}55`,
        background: isDark ? `${color}1f` : `${color}14`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}: <span className="tabular-nums">{value ?? 0}</span>
    </span>
  );
}
