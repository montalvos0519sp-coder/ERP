"use client";

// SGC · Encuestas — constructor de formularios con link público compartible.
// Crea encuestas con preguntas dinámicas, comparte el link, y las respuestas
// caen en Quejas/Satisfacción con CSAT y NPS.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Plus, X, ClipboardList, Link2, Copy, Check, Trash2,
  BarChart3, GripVertical, ExternalLink, Sparkles,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const Q_TIPOS = [
  ["rating", "Estrellas (1-5)"], ["nps", "NPS (0-10)"], ["si_no", "Sí / No"],
  ["opcion", "Opción única"], ["checkbox", "Opción múltiple"], ["texto", "Texto corto"], ["parrafo", "Texto largo"],
];
const PLANTILLA = [
  { id: "p1", tipo: "rating", titulo: "¿Qué tan satisfecho estás con nuestro servicio?", requerido: true, opciones: [] },
  { id: "p2", tipo: "nps", titulo: "¿Qué tan probable es que nos recomiendes?", requerido: false, opciones: [] },
  { id: "p3", tipo: "opcion", titulo: "¿Cómo calificarías el tiempo de entrega?", requerido: false, opciones: ["Excelente", "Bueno", "Regular", "Malo"] },
  { id: "p4", tipo: "parrafo", titulo: "¿Qué podemos mejorar?", requerido: false, opciones: [] },
];

export default function EncuestasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [resultados, setResultados] = useState<any | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getEncuestas(empresaActivaId).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const linkDe = (e: any) => `${typeof window !== "undefined" ? window.location.origin : ""}/encuesta/${e.token}`;
  const copiar = (e: any) => { navigator.clipboard?.writeText(linkDe(e)); setCopiado(e.id); setTimeout(() => setCopiado(null), 1800); };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-pink-500 to-rose-600"><ClipboardList className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Encuestas de Cliente</h1><p className={`text-sm ${theme.textSecondary}`}>Crea formularios, comparte el link y recibe respuestas directo en el SGC.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setEdit({ preguntas: [] })} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600"><Plus className="w-4 h-4" /> Nueva encuesta</button>
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-pink-400" />
          <p className={`font-bold ${theme.textPrimary}`}>Sin encuestas</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Crea tu primera encuesta de satisfacción y compártela con un link.</p>
          <button onClick={() => setEdit({ preguntas: PLANTILLA })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600"><Sparkles className="w-4 h-4" /> Empezar con plantilla</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((e) => (
            <div key={e.id} className={`rounded-2xl border p-4 ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setEdit(e)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} /><h3 className={`font-black truncate ${theme.textPrimary}`}>{e.titulo}</h3></div>
                  <p className={`text-[11px] ${theme.textTertiary}`}>{(e.preguntas || []).length} preguntas · {e.respuestas_count} respuestas {e.activa ? "" : "· cerrada"}</p>
                </button>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${e.activa ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>{e.activa ? "Activa" : "Cerrada"}</span>
              </div>
              {/* Link público */}
              <div className={`mt-3 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${isDarkMode ? "border-white/[0.08] bg-[#0B1220]/40" : "border-slate-200 bg-slate-50"}`}>
                <Link2 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className={`text-[11px] truncate flex-1 ${theme.textSecondary}`}>/encuesta/{e.token}</span>
                <button onClick={() => copiar(e)} title="Copiar link" className="p-1 rounded hover:bg-pink-500/15 text-pink-400">{copiado === e.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}</button>
                <a href={linkDe(e)} target="_blank" rel="noreferrer" title="Abrir" className="p-1 rounded hover:bg-pink-500/15 text-pink-400"><ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setResultados(e)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border border-pink-500/30 text-pink-400 hover:bg-pink-500/10"><BarChart3 className="w-3.5 h-3.5" /> Resultados ({e.respuestas_count})</button>
                <button onClick={() => setEdit(e)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && <EncuestaModal e={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {resultados && <ResultadosModal enc={resultados} isDark={isDarkMode} theme={theme} onClose={() => setResultados(null)} />}
    </div>
  );
}

function EncuestaModal({ e, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ titulo: "", descripcion: "", color: "#EC4899", mensaje_gracias: "¡Gracias por tu respuesta!", crear_queja: true, activa: true, preguntas: [], ...e });
  const [busy, setBusy] = useState(false);
  const idE = e.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const addQ = () => set("preguntas", [...(f.preguntas || []), { id: `q${Date.now()}`, tipo: "rating", titulo: "", requerido: false, opciones: [] }]);
  const updQ = (i: number, patch: any) => set("preguntas", f.preguntas.map((q: any, k: number) => k === i ? { ...q, ...patch } : q));
  const delQ = (i: number) => set("preguntas", f.preguntas.filter((_: any, k: number) => k !== i));
  const moveQ = (i: number, d: number) => { const a = [...f.preguntas]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set("preguntas", a); };

  const guardar = async () => {
    if (!f.titulo?.trim()) { alert("Título requerido."); return; }
    if (!f.preguntas?.length) { alert("Agrega al menos una pregunta."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, titulo: f.titulo, descripcion: f.descripcion || "", color: f.color, mensaje_gracias: f.mensaje_gracias || "", crear_queja: !!f.crear_queja, activa: !!f.activa, preguntas: f.preguntas };
    try {
      if (idE) { await api.actualizarEncuesta(idE, payload); onSaved(); }
      else { const saved = await api.crearEncuesta(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id, token: saved.token })); }
    } catch (err) { alert((err as Error).message); } finally { setBusy(false); }
  };
  const borrar = async () => { if (!confirm("¿Eliminar encuesta y sus respuestas?")) return; try { await api.eliminarEncuesta(idE); onSaved(); } catch (err) { alert((err as Error).message); } };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ background: `linear-gradient(90deg, ${f.color}, ${f.color}cc)` }}>
          <h2 className="text-base font-black text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" /> {idE ? "Editar encuesta" : "Nueva encuesta"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div><label className={lbl}>Título de la encuesta *</label><input className={inp} value={f.titulo} onChange={(ev) => set("titulo", ev.target.value)} placeholder="Encuesta de satisfacción 2026" /></div>
            <div><label className={lbl}>Color</label><input type="color" value={f.color} onChange={(ev) => set("color", ev.target.value)} className="w-12 h-9 rounded-lg border border-slate-300 bg-transparent cursor-pointer" /></div>
          </div>
          <div><label className={lbl}>Descripción / bienvenida</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(ev) => set("descripcion", ev.target.value)} placeholder="Tu opinión nos ayuda a mejorar…" /></div>

          {/* Preguntas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Preguntas ({f.preguntas?.length || 0})</span>
              <div className="flex gap-2">
                {!f.preguntas?.length && <button onClick={() => set("preguntas", PLANTILLA)} className="text-xs font-bold text-pink-400 hover:text-pink-300 inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Plantilla</button>}
                <button onClick={addQ} className="text-xs font-bold text-pink-400 hover:text-pink-300 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Pregunta</button>
              </div>
            </div>
            <div className="space-y-2">
              {(f.preguntas || []).map((qp: any, i: number) => (
                <div key={qp.id} className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col"><button onClick={() => moveQ(i, -1)} className={`text-[10px] ${theme.textTertiary} hover:text-pink-400`}>▲</button><button onClick={() => moveQ(i, 1)} className={`text-[10px] ${theme.textTertiary} hover:text-pink-400`}>▼</button></div>
                    <span className="text-xs font-black text-pink-400 w-5">{i + 1}</span>
                    <input className={`${inp} flex-1`} value={qp.titulo} onChange={(ev) => updQ(i, { titulo: ev.target.value })} placeholder="Texto de la pregunta" />
                    <button onClick={() => delQ(i)} className="text-slate-500 hover:text-rose-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-9 flex-wrap">
                    <select className={`${inp} w-auto text-xs py-1`} value={qp.tipo} onChange={(ev) => updQ(i, { tipo: ev.target.value })}>{Q_TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    <label className={`inline-flex items-center gap-1 text-xs ${theme.textSecondary}`}><input type="checkbox" checked={!!qp.requerido} onChange={(ev) => updQ(i, { requerido: ev.target.checked })} /> Requerida</label>
                    {(qp.tipo === "opcion" || qp.tipo === "checkbox") && (
                      <input className={`${inp} flex-1 text-xs py-1`} value={(qp.opciones || []).join(", ")} onChange={(ev) => updQ(i, { opciones: ev.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="Opciones separadas por coma" />
                    )}
                  </div>
                </div>
              ))}
              {!f.preguntas?.length && <p className={`text-xs ${theme.textTertiary}`}>Agrega preguntas o usa una plantilla.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Mensaje de agradecimiento</label><input className={inp} value={f.mensaje_gracias} onChange={(ev) => set("mensaje_gracias", ev.target.value)} /></div>
            <div className="flex flex-col gap-1.5 justify-end pb-1">
              <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={!!f.crear_queja} onChange={(ev) => set("crear_queja", ev.target.checked)} /> Crear caso en Quejas con cada respuesta</label>
              <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={!!f.activa} onChange={(ev) => set("activa", ev.target.checked)} /> Encuesta activa (recibe respuestas)</label>
            </div>
          </div>

          {idE && f.token && (
            <div className={`rounded-xl border p-3 flex items-center gap-2 ${isDark ? "border-pink-500/20 bg-pink-500/[0.06]" : "border-pink-200 bg-pink-50"}`}>
              <Link2 className="w-4 h-4 text-pink-500 shrink-0" />
              <span className={`text-xs truncate flex-1 ${theme.textSecondary}`}>{typeof window !== "undefined" ? window.location.origin : ""}/encuesta/{f.token}</span>
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/encuesta/${f.token}`); alert("Link copiado"); }} className="text-xs font-bold text-pink-500 inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copiar</button>
            </div>
          )}
        </div>
        <div className={`px-5 py-3 border-t flex justify-between gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          {idE ? <button onClick={borrar} className="px-3 py-2 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" /> Eliminar</button> : <span />}
          <div className="flex gap-2"><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: f.color }}>{busy ? "Guardando…" : (idE ? "Guardar" : "Crear y obtener link")}</button></div>
        </div>
      </div>
    </div>
  );
}

function ResultadosModal({ enc, isDark, theme, onClose }: any) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.getResultadosEncuesta(enc.id).then(setD).catch(() => setD({ total: 0, respuestas: [] })); }, [enc.id]);
  const dist = (d?.distribucion || []).map((x: any) => ({ e: `${x.estrella}`, n: x.n, c: x.estrella >= 4 ? "#10b981" : x.estrella === 3 ? "#f59e0b" : "#f43f5e" }));
  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Resultados · {enc.titulo}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-4">
          {!d ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p> : d.total === 0 ? <p className={`text-sm text-center py-8 ${theme.textTertiary}`}>Aún no hay respuestas. Comparte el link para empezar a recibirlas.</p> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[["Respuestas", d.total, "#EC4899"], ["Satisf. prom.", d.satisfaccion_prom != null ? `${d.satisfaccion_prom}/5` : "—", "#F59E0B"], ["CSAT", d.csat != null ? `${d.csat}%` : "—", "#10B981"], ["NPS", d.nps != null ? d.nps : "—", "#0EA5E9"]].map(([l, v, c]: any) => (
                  <div key={l} className={`rounded-xl border p-3 text-center ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}><div className="text-2xl font-black tabular-nums" style={{ color: c }}>{v}</div><div className={`text-[10px] uppercase font-bold ${theme.textTertiary}`}>{l}</div></div>
                ))}
              </div>
              {dist.some((x: any) => x.n > 0) && (
                <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                  <div className={`text-[11px] uppercase font-bold mb-1 ${theme.textTertiary}`}>Distribución de satisfacción</div>
                  <div style={{ width: "100%", height: 120 }}><ResponsiveContainer><BarChart data={dist} margin={{ top: 4, right: 4, left: -28, bottom: -8 }}><XAxis dataKey="e" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="n" radius={[4, 4, 0, 0]}>{dist.map((x: any, i: number) => <Cell key={i} fill={x.c} />)}</Bar></BarChart></ResponsiveContainer></div>
                </div>
              )}
              <div>
                <div className={`text-[11px] uppercase font-bold mb-2 ${theme.textTertiary}`}>Respuestas recibidas</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {d.respuestas.map((r: any) => (
                    <div key={r.id} className={`rounded-lg border p-2.5 text-xs ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between"><span className={`font-bold ${theme.textPrimary}`}>{r.cliente_nombre || "Anónimo"}</span><span className={theme.textTertiary}>{r.creado?.slice(0, 10)}{r.satisfaccion ? ` · ${r.satisfaccion}` : ""}</span></div>
                      <div className={`mt-1 space-y-0.5 ${theme.textSecondary}`}>{Object.entries(r.respuestas || {}).map(([k, v]: any) => { const p = (enc.preguntas || []).find((x: any) => String(x.id) === String(k)); return <div key={k}><b>{p?.titulo || k}:</b> {Array.isArray(v) ? v.join(", ") : String(v)}</div>; })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
