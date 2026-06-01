"use client";

// Pilar 2 · Tablero de Implementación del SGC (Kanban ISO).
// El equipo implementa la norma cláusula por cláusula: cada tarjeta avanza por
// las columnas Por hacer → En proceso → Implementado → Verificado, con
// responsable, prioridad y avance. Arrastrar y soltar entre columnas.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Plus, Sparkles, X, GripVertical, Trash2, Flag, CheckCircle2, Circle, ListChecks,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const COLS = [
  { k: "POR_HACER", t: "Por hacer", c: "#64748B" },
  { k: "EN_PROCESO", t: "En proceso", c: "#F59E0B" },
  { k: "IMPLEMENTADO", t: "Implementado", c: "#0EA5E9" },
  { k: "VERIFICADO", t: "Verificado", c: "#10B981" },
];
const PRIO_COLOR: Record<string, string> = {
  ALTA: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  MEDIA: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  BAJA: "text-slate-400 bg-slate-500/15 border-slate-500/30",
};

export default function ImplementacionPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [board, setBoard] = useState<any>({ columnas: [], total: 0, verificadas: 0, progreso: 0 });
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getTableroImplementacion(empresaActivaId)
      .then((b) => setBoard(b && Array.isArray(b.columnas) ? b : { columnas: [], total: 0, verificadas: 0, progreso: 0 }))
      .catch(() => {}).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const generar = async () => {
    if (!empresaActivaId) return;
    setGenBusy(true);
    try { const r = await api.generarTableroImplementacion(empresaActivaId); alert(`Se generaron ${r.creadas} tarjetas desde las cláusulas ISO.`); load(); }
    catch (e) { alert((e as Error).message); } finally { setGenBusy(false); }
  };

  const soltar = async (col: string) => {
    if (drag == null) return;
    const id = drag; setDrag(null);
    // Optimista
    setBoard((b: any) => {
      const cols = b.columnas.map((c: any) => ({ ...c, tareas: c.tareas.filter((t: any) => t.id !== id) }));
      let card: any;
      b.columnas.forEach((c: any) => { const f = c.tareas.find((t: any) => t.id === id); if (f) card = f; });
      if (card) { card = { ...card, columna: col }; cols.find((c: any) => c.clave === col)?.tareas.push(card); }
      return { ...b, columnas: cols };
    });
    try { await api.moverTareaImpl(id, col); load(); } catch { load(); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const colTareas = (k: string) => board.columnas.find((c: any) => c.clave === k)?.tareas || [];

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-indigo-500 to-violet-600"><Sparkles className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Tablero de Implementación</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Implementen el SGC en equipo, cláusula por cláusula. Arrastra las tarjetas entre columnas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={generar} disabled={genBusy} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.06]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><Sparkles className="w-4 h-4 text-indigo-400" /> {genBusy ? "Generando…" : "Generar desde ISO"}</button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600"><Plus className="w-4 h-4" /> Nueva tarjeta</button>
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Barra de progreso global */}
      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${theme.textPrimary}`}>Avance de implementación</span>
          <span className="text-sm font-black bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">{board.progreso}% · {board.verificadas}/{board.total} verificadas</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
          <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all" style={{ width: `${board.progreso}%` }} />
        </div>
      </div>

      {/* Tablero */}
      {board.total === 0 && !loading ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <Sparkles className={`w-10 h-10 mx-auto mb-3 text-indigo-400`} />
          <p className={`font-bold ${theme.textPrimary}`}>Aún no hay tablero</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Genera una tarjeta por cada cláusula de ISO 9001 y repártelas entre tu equipo.</p>
          <button onClick={generar} disabled={genBusy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600"><Sparkles className="w-4 h-4" /> Generar tablero desde ISO 9001</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLS.map((col) => (
            <div key={col.k}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltar(col.k)}
              className={`rounded-2xl border ${card} flex flex-col min-h-[200px]`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.c }} />
                  <span className={`text-sm font-black ${theme.textPrimary}`}>{col.t}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{colTareas(col.k).length}</span>
              </div>
              <div className="p-2.5 space-y-2.5 flex-1">
                {colTareas(col.k).map((t: any) => (
                  <div key={t.id}
                    draggable
                    onDragStart={() => setDrag(t.id)}
                    onClick={() => setEdit(t)}
                    className={`group rounded-xl border p-3 cursor-pointer transition hover:shadow-md ${isDarkMode ? "bg-[#0B1220]/60 border-white/[0.06] hover:border-indigo-500/40" : "bg-white border-slate-200 hover:border-indigo-400/50"}`}>
                    <div className="flex items-start gap-1.5">
                      <GripVertical className={`w-4 h-4 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60 ${theme.textTertiary}`} />
                      <div className="flex-1 min-w-0">
                        {t.clausula && <span className="text-[10px] font-black text-indigo-400">{t.clausula}</span>}
                        <p className={`text-sm font-semibold leading-snug ${theme.textPrimary}`}>{t.requisito_titulo || t.titulo}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${PRIO_COLOR[t.prioridad]}`}><Flag className="w-2.5 h-2.5 inline" /> {t.prioridad}</span>
                          {t.subtareas?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 inline-flex items-center gap-0.5"><ListChecks className="w-2.5 h-2.5" /> {t.subtareas.filter((s: any) => s.avance >= 100).length}/{t.subtareas.length}</span>}
                          {t.fecha_limite && <span className={`text-[10px] ${theme.textTertiary}`}>{t.fecha_limite}</span>}
                          {t.responsable_nombre && <span className="ml-auto"><Avatar nombre={t.responsable_nombre} id={t.responsable_user} size={22} /></span>}
                        </div>
                        {t.avance > 0 && (
                          <div className={`h-1.5 rounded-full overflow-hidden mt-2 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                            <div className="h-full" style={{ width: `${t.avance}%`, background: col.c }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {colTareas(col.k).length === 0 && <p className={`text-[11px] text-center py-4 ${theme.textTertiary}`}>Suelta tarjetas aquí</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && <TareaModal tarea={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

// Subtareas de una tarjeta del tablero: cada una con peso y avance; su promedio
// ponderado alimenta el avance de la tarjeta y la mueve sola entre columnas.
function PanelSubtareasImpl({ tareaId, isDark, theme, onRecompute }: { tareaId: number; isDark: boolean; theme: any; onRecompute: (av: number, col: string | null, count: number) => void }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [nueva, setNueva] = useState("");
  const [peso, setPeso] = useState(1);
  const inp = `px-2 py-1 rounded-md border text-xs outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const localAvance = (t: any[]) => { if (!t.length) return 0; const tp = t.reduce((a, x) => a + (x.peso || 1), 0) || 1; return Math.round(t.reduce((a, x) => a + (x.peso || 1) * x.avance, 0) / tp); };
  const cargar = useCallback(() => {
    api.getSubtareasImpl(tareaId).then((r) => { const t = r?.results || []; setSubs(t); onRecompute(localAvance(t), null, t.length); }).catch(() => {});
  }, [tareaId]);
  useEffect(() => { cargar(); }, [cargar]);

  const tras = async (r: any) => { const res = await api.getSubtareasImpl(tareaId); const t = res?.results || []; setSubs(t); onRecompute(r?.tarea_avance ?? localAvance(t), r?.tarea_columna ?? null, t.length); };
  const agregar = async () => { const titulo = nueva.trim(); if (!titulo) return; try { const r = await api.crearSubtareaImpl({ tarea: tareaId, titulo, peso, avance: 0 }); setNueva(""); setPeso(1); await tras(r); } catch (e) { alert((e as Error).message); } };
  const toggle = async (s: any) => { const r = await api.actualizarSubtareaImpl(s.id, { avance: s.avance >= 100 ? 0 : 100 }); await tras(r); };
  const setAv = async (s: any, v: number) => { const r = await api.actualizarSubtareaImpl(s.id, { avance: v }); await tras(r); };
  const setPesoS = async (s: any, v: number) => { const r = await api.actualizarSubtareaImpl(s.id, { peso: Math.max(1, v) }); await tras(r); };
  const borrar = async (s: any) => { const r = await api.eliminarSubtareaImpl(s.id); await tras(r); };
  const totalPeso = subs.reduce((a, x) => a + (x.peso || 1), 0) || 1;

  return (
    <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${theme.textSecondary}`}><ListChecks className="w-3.5 h-3.5" /> Subtareas ({subs.length})</span>
        {subs.length > 0 && <span className={`text-[10px] ${theme.textTertiary}`}>el avance se calcula desde aquí</span>}
      </div>
      <div className="space-y-1.5">
        {subs.map((s) => { const done = s.avance >= 100; const aporta = Math.round(((s.peso || 1) / totalPeso) * 100); return (
          <div key={s.id} className={`rounded-lg border p-2 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggle(s)} className="shrink-0">{done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}</button>
              <span className={`flex-1 text-sm min-w-0 truncate ${done ? `line-through ${theme.textTertiary}` : theme.textPrimary}`}>{s.titulo}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{aporta}%</span>
              <button type="button" onClick={() => borrar(s)} className="text-slate-500 hover:text-rose-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-2 mt-1.5 pl-7">
              <input type="range" min={0} max={100} value={s.avance} onChange={(e) => setAv(s, Number(e.target.value))} className="flex-1 accent-indigo-600 h-1" />
              <span className={`text-[11px] font-bold tabular-nums w-9 text-right ${done ? "text-emerald-500" : theme.textSecondary}`}>{s.avance}%</span>
              <div className="flex items-center gap-1"><span className={`text-[10px] ${theme.textTertiary}`}>peso</span><input type="number" min={1} value={s.peso} onChange={(e) => setPesoS(s, Number(e.target.value))} className={`${inp} w-12`} /></div>
            </div>
          </div>
        ); })}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }} placeholder="Nueva subtarea…" className={`${inp} flex-1`} />
        <div className="flex items-center gap-1"><span className={`text-[10px] ${theme.textTertiary}`}>peso</span><input type="number" min={1} value={peso} onChange={(e) => setPeso(Number(e.target.value))} className={`${inp} w-12`} /></div>
        <button type="button" onClick={agregar} disabled={!nueva.trim()} className="px-2.5 py-1.5 rounded-md text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function TareaModal({ tarea, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !tarea.id;
  const [f, setF] = useState<any>({ titulo: "", descripcion: "", columna: "POR_HACER", prioridad: "MEDIA", avance: 0, responsable_user: null, fecha_limite: "", ...tarea });
  const [busy, setBusy] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.titulo?.trim()) { alert("Escribe un título."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, titulo: f.titulo, descripcion: f.descripcion || "", columna: f.columna, prioridad: f.prioridad, avance: Number(f.avance) || 0, responsable_user: f.responsable_user || null, fecha_limite: f.fecha_limite || null };
    try { nuevo ? await api.crearTareaImpl(payload) : await api.actualizarTareaImpl(tarea.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const borrar = async () => { if (!confirm("¿Eliminar tarjeta?")) return; try { await api.eliminarTareaImpl(tarea.id); onSaved(); } catch (e) { alert((e as Error).message); } };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white">{nuevo ? "Nueva tarjeta de implementación" : (f.clausula ? `${f.clausula} · ${f.titulo}` : f.titulo)}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div><label className={lbl}>Título *</label><input className={inp} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Qué hay que implementar" /></div>
          <div><label className={lbl}>Descripción</label><textarea rows={3} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Detalle, entregables, evidencia esperada…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <SelectorUsuario label="Responsable" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
            <div><label className={lbl}>Prioridad</label><select className={inp} value={f.prioridad} onChange={(e) => set("prioridad", e.target.value)}>{["ALTA", "MEDIA", "BAJA"].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Columna</label><select className={inp} value={f.columna} onChange={(e) => set("columna", e.target.value)}>{COLS.map((c) => <option key={c.k} value={c.k}>{c.t}</option>)}</select></div>
            <div><label className={lbl}>Avance (%) {f.avance >= 100 && <span className="text-emerald-500">✓</span>}</label><input type="number" min={0} max={100} className={inp} value={f.avance} disabled={subCount > 0} onChange={(e) => set("avance", e.target.value)} /></div>
            <div><label className={lbl}>Fecha límite</label><input type="date" className={inp} value={f.fecha_limite || ""} onChange={(e) => set("fecha_limite", e.target.value)} /></div>
          </div>

          {!nuevo
            ? <PanelSubtareasImpl tareaId={tarea.id} isDark={isDark} theme={theme} onRecompute={(av, col, count) => { set("avance", av); if (col) set("columna", col); setSubCount(count); }} />
            : <p className={`text-[11px] ${theme.textTertiary}`}>Guarda la tarjeta para desglosarla en subtareas que sumen su avance.</p>}

          {!nuevo && (
            <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="tarea_implementacion" objetoId={tarea.id} /></div>
          )}
        </div>
        <div className={`px-5 py-3 border-t flex justify-between gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          {!nuevo ? <button onClick={borrar} className="px-3 py-2 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" /> Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
            <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-indigo-500 to-violet-600">{busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
