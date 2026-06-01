"use client";

// SGC · Política (5.2) y Objetivos (6.2) — versión visual e interactiva.
// Política: vista tipo "documento" + checklist ISO que se valida solo según el
// texto + plantilla de un clic. Objetivos: anillos de progreso, estadísticas,
// filtros y un editor con vista previa en vivo del avance.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Save, ScrollText, Target, Trash2, X, Pencil, Sparkles,
  CheckCircle2, Circle, BadgeCheck, CalendarClock, TrendingUp, RefreshCw, Filter, Network,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario } from "@/components/sgc/Colaboracion";

const EST_COLOR: Record<string, string> = {
  EN_CURSO: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  LOGRADO: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  NO_LOGRADO: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};
const EST_RING: Record<string, string> = { EN_CURSO: "#0EA5E9", LOGRADO: "#10B981", NO_LOGRADO: "#F43F5E" };
const ESTADOS = [["EN_CURSO", "En curso"], ["LOGRADO", "Logrado"], ["NO_LOGRADO", "No logrado"]];

const PLANTILLA = "En [EMPRESA] estamos comprometidos a satisfacer los requisitos de nuestros clientes y los legales y reglamentarios aplicables, entregando productos y servicios que superen sus expectativas. Nos comprometemos con la mejora continua de la eficacia de nuestro Sistema de Gestión de Calidad. Esta política proporciona el marco de referencia para establecer y revisar nuestros objetivos de calidad.";

// Anillo de progreso circular.
function Ring({ value, size = 52, stroke = 6, color = "#8b5cf6", track }: { value: number; size?: number; stroke?: number; color?: string; track: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .4s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize={size * 0.28} fontWeight="800" fill={color}>{value}%</text>
    </svg>
  );
}

export default function PoliticaPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [pol, setPol] = useState<any>(null);
  const [objs, setObjs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPol, setBusyPol] = useState(false);
  const [editPol, setEditPol] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [filtro, setFiltro] = useState("TODOS");

  const load = useCallback(async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        api.getPolitica({ empresa: String(empresaActivaId) }),
        api.getObjetivos({ empresa: String(empresaActivaId) }),
      ]);
      const politica = (p?.results || [])[0] || { texto: "", version: "1.0", aprobada_por: "" };
      setPol(politica);
      setEditPol(!politica.texto);
      setObjs(o?.results || []);
    } finally { setLoading(false); }
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const guardarPol = async () => {
    setBusyPol(true);
    const payload = { empresa: empresaActivaId, texto: pol.texto || "", version: pol.version || "1.0", aprobada_por: pol.aprobada_por || "", fecha_revision: pol.fecha_revision || null, vigente: true };
    try {
      const saved = pol.id ? await api.actualizarPolitica(pol.id, payload) : await api.crearPolitica(payload);
      setPol(saved); setEditPol(false);
    } catch (e) { alert((e as Error).message); } finally { setBusyPol(false); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const track = isDarkMode ? "#ffffff14" : "#0000000d";

  // Checklist ISO 5.2 — se valida solo según el texto.
  const txt = (pol?.texto || "").toLowerCase();
  const checks = [
    { label: "Apropiada al propósito y contexto", ok: /propósit|proposit|misión|mision|contexto|organiz/i.test(txt) },
    { label: "Compromiso de cumplir los requisitos", ok: /requisit|legal|aplicable|cliente/i.test(txt) },
    { label: "Compromiso de mejora continua", ok: /mejora continua|mejorar continuamente|mejora del/i.test(txt) },
    { label: "Marco para los objetivos de calidad", ok: /objetiv/i.test(txt) },
  ];
  const cumplidos = checks.filter((c) => c.ok).length;

  // Estadísticas de objetivos.
  const stats = useMemo(() => {
    const enCurso = objs.filter((o) => o.estado === "EN_CURSO").length;
    const logrados = objs.filter((o) => o.estado === "LOGRADO").length;
    const prom = objs.length ? Math.round(objs.reduce((a, o) => a + (Number(o.avance) || 0), 0) / objs.length) : 0;
    return { total: objs.length, enCurso, logrados, prom };
  }, [objs]);
  const visibles = filtro === "TODOS" ? objs : objs.filter((o) => o.estado === filtro);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-indigo-500 to-violet-600"><ScrollText className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Política y Objetivos de Calidad</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 5.2 (política) y 6.2 (objetivos).</p></div>
        </div>
        <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      {/* ── Política de calidad ── */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="px-5 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-b border-white/5">
          <div className="flex items-center gap-2"><ScrollText className="w-4 h-4 text-indigo-500" /><h2 className={`text-sm font-black uppercase tracking-wider ${theme.textPrimary}`}>Política de calidad</h2></div>
          {!editPol && pol?.texto && (
            <button onClick={() => setEditPol(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"><Pencil className="w-3.5 h-3.5" /> Editar</button>
          )}
        </div>

        <div className="p-5">
          {!editPol && pol?.texto ? (
            // Vista "documento"
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <blockquote className={`relative pl-4 border-l-4 border-indigo-500 text-base leading-relaxed italic ${theme.textPrimary}`}>
                  “{pol.texto}”
                </blockquote>
                <div className="flex items-center gap-3 mt-4 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 font-bold"><BadgeCheck className="w-3.5 h-3.5" /> v{pol.version}</span>
                  {pol.aprobada_por && <span className={theme.textSecondary}>Aprobada por <b className={theme.textPrimary}>{pol.aprobada_por}</b></span>}
                  {pol.fecha_revision && <span className={`inline-flex items-center gap-1 ${theme.textTertiary}`}><CalendarClock className="w-3.5 h-3.5" /> {pol.fecha_revision}</span>}
                </div>
              </div>
              {/* Checklist ISO */}
              <div className={`rounded-xl border p-3 ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${theme.textSecondary}`}>Requisitos 5.2</span>
                  <span className={`text-xs font-black ${cumplidos === 4 ? "text-emerald-500" : "text-amber-500"}`}>{cumplidos}/4</span>
                </div>
                <ul className="space-y-1.5">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2 text-xs">
                      {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                      <span className={c.ok ? theme.textPrimary : theme.textTertiary}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            // Modo edición
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={lbl}>Redacta tu política</label>
                <button onClick={() => setPol({ ...pol, texto: PLANTILLA })} className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300"><Sparkles className="w-3.5 h-3.5" /> Usar plantilla</button>
              </div>
              <textarea rows={5} className={inp} value={pol?.texto || ""} onChange={(e) => setPol({ ...pol, texto: e.target.value })}
                placeholder="En [empresa] nos comprometemos a satisfacer los requisitos de nuestros clientes…" />
              {/* Checklist en vivo */}
              <div className="flex flex-wrap gap-2">
                {checks.map((c) => (
                  <span key={c.label} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${c.ok ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : isDarkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-400"}`}>
                    {c.ok ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} {c.label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Versión</label><input className={inp} value={pol?.version || ""} onChange={(e) => setPol({ ...pol, version: e.target.value })} /></div>
                <div><label className={lbl}>Aprobada por</label><input className={inp} value={pol?.aprobada_por || ""} onChange={(e) => setPol({ ...pol, aprobada_por: e.target.value })} placeholder="Dirección General" /></div>
                <div><label className={lbl}>Fecha de revisión</label><input type="date" className={inp} value={pol?.fecha_revision || ""} onChange={(e) => setPol({ ...pol, fecha_revision: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2">
                {pol?.texto && <button onClick={() => { setEditPol(false); load(); }} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>}
                <button onClick={guardarPol} disabled={busyPol} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-indigo-500 to-violet-600"><Save className="w-4 h-4" /> {busyPol ? "Guardando…" : "Guardar política"}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Estadísticas de objetivos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`rounded-2xl border p-4 ${card} flex items-center gap-3`}>
          <Ring value={stats.prom} color="#8b5cf6" track={track} />
          <div><div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Avance promedio</div><div className={`text-sm font-bold ${theme.textPrimary}`}>{stats.total} objetivos</div></div>
        </div>
        <StatBox icon={Target} color="#0EA5E9" label="En curso" value={stats.enCurso} isDark={isDarkMode} theme={theme} />
        <StatBox icon={BadgeCheck} color="#10B981" label="Logrados" value={stats.logrados} isDark={isDarkMode} theme={theme} />
        <StatBox icon={TrendingUp} color="#F59E0B" label="Por lograr" value={Math.max(0, stats.total - stats.logrados)} isDark={isDarkMode} theme={theme} />
      </div>

      {/* ── Objetivos ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className={`w-3.5 h-3.5 ${theme.textTertiary}`} />
          {[["TODOS", "Todos"], ...ESTADOS].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => setEdit({})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600"><Plus className="w-3.5 h-3.5" /> Nuevo objetivo</button>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${card}`}>
          <Target className={`w-10 h-10 mx-auto mb-3 text-violet-400`} />
          <p className={`font-bold ${theme.textPrimary}`}>Sin objetivos {filtro !== "TODOS" ? "en este estado" : ""}</p>
          <p className={`text-sm ${theme.textSecondary}`}>Los objetivos deben ser medibles, coherentes con la política, con responsable y plazo (SMART).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((o) => {
            const vencido = o.fecha_limite && o.estado === "EN_CURSO" && new Date(o.fecha_limite) < new Date();
            return (
              <button key={o.id} onClick={() => setEdit(o)} className={`text-left rounded-2xl border p-4 flex gap-4 transition hover:shadow-lg ${card} ${vencido ? "ring-1 ring-rose-500/40" : ""}`}>
                <Ring value={Number(o.avance) || 0} color={EST_RING[o.estado]} track={track} size={58} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-bold leading-snug ${theme.textPrimary}`}>{o.objetivo}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[o.estado]}`}>{ESTADOS.find(([v]) => v === o.estado)?.[1]}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px]">
                    {o.proceso_nombre && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-400 font-medium">{o.proceso_nombre}</span>}
                    {o.tareas?.length > 0 && (() => { const hechas = o.tareas.filter((t: any) => t.avance >= 100).length; const full = hechas === o.tareas.length; return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold ${full ? "bg-emerald-500/15 text-emerald-500" : "bg-violet-500/15 text-violet-400"}`}><CheckCircle2 className="w-3 h-3" /> {hechas}/{o.tareas.length} tareas</span>; })()}
                    {o.meta && <span className={theme.textSecondary}>Meta: <b className={theme.textPrimary}>{o.meta}</b></span>}
                    {o.indicador && <span className={theme.textTertiary}>{o.indicador}</span>}
                    {o.responsable_nombre ? <span className="inline-flex items-center gap-1"><Avatar nombre={o.responsable_nombre} id={o.responsable_user} size={16} /><span className={theme.textTertiary}>{o.responsable_nombre}</span></span> : o.responsable && <span className={theme.textTertiary}>{o.responsable}</span>}
                    {o.fecha_limite && <span className={`inline-flex items-center gap-1 ${vencido ? "text-rose-400 font-bold" : theme.textTertiary}`}><CalendarClock className="w-3 h-3" /> {o.fecha_limite}{vencido ? " " : ""}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {edit && <ObjModal o={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} track={track} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

// Tareas configurables de un objetivo: cada una con peso y avance; su promedio
// ponderado alimenta el % del objetivo y lo autocompleta al 100 %.
function PanelTareasObjetivo({ objetivoId, isDark, theme, onRecompute }: { objetivoId: number; isDark: boolean; theme: any; onRecompute: (av: number, est: string | null, count: number) => void }) {
  const [tareas, setTareas] = useState<any[]>([]);
  const [nueva, setNueva] = useState("");
  const [peso, setPeso] = useState(1);
  const [busy, setBusy] = useState(false);
  const inp = `px-2 py-1 rounded-md border text-xs outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const cargar = useCallback(() => {
    api.getTareasObjetivo(objetivoId).then((r) => {
      const t = r?.results || [];
      setTareas(t);
      onRecompute(localAvance(t), null, t.length);
    }).catch(() => {});
  }, [objetivoId]);
  useEffect(() => { cargar(); }, [cargar]);

  const localAvance = (t: any[]) => {
    if (!t.length) return 0;
    const tp = t.reduce((a, x) => a + (x.peso || 1), 0) || 1;
    return Math.round(t.reduce((a, x) => a + (x.peso || 1) * x.avance, 0) / tp);
  };

  const aplicar = (resp: any, fallback: any[]) => {
    const av = resp?.objetivo_avance ?? localAvance(fallback);
    onRecompute(av, resp?.objetivo_estado ?? null, fallback.length);
  };

  const agregar = async () => {
    const titulo = nueva.trim(); if (!titulo) return;
    setBusy(true);
    try { const r = await api.crearTareaObjetivo({ objetivo: objetivoId, titulo, peso, avance: 0 }); setNueva(""); setPeso(1); await cargarConResp(r); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const cargarConResp = async (r: any) => {
    const res = await api.getTareasObjetivo(objetivoId); const t = res?.results || []; setTareas(t);
    onRecompute(r?.objetivo_avance ?? localAvance(t), r?.objetivo_estado ?? null, t.length);
  };
  const toggle = async (t: any) => { const r = await api.actualizarTareaObjetivo(t.id, { avance: t.avance >= 100 ? 0 : 100 }); await cargarConResp(r); };
  const setAvance = async (t: any, v: number) => { const r = await api.actualizarTareaObjetivo(t.id, { avance: v }); await cargarConResp(r); };
  const setPesoT = async (t: any, v: number) => { const r = await api.actualizarTareaObjetivo(t.id, { peso: Math.max(1, v) }); await cargarConResp(r); };
  const borrar = async (t: any) => { const r = await api.eliminarTareaObjetivo(t.id); await cargarConResp(r); };

  const totalPeso = tareas.reduce((a, x) => a + (x.peso || 1), 0) || 1;

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-black uppercase tracking-wider ${theme.textSecondary}`}>Tareas / resultados clave ({tareas.length})</span>
        {tareas.length > 0 && <span className={`text-[10px] ${theme.textTertiary}`}>cada tarea aporta según su peso</span>}
      </div>
      <div className="space-y-1.5">
        {tareas.map((t) => {
          const aporta = Math.round(((t.peso || 1) / totalPeso) * 100);
          const done = t.avance >= 100;
          return (
            <div key={t.id} className={`rounded-lg border p-2 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => toggle(t)} className="shrink-0">
                  {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                </button>
                <span className={`flex-1 text-sm min-w-0 truncate ${done ? `line-through ${theme.textTertiary}` : theme.textPrimary}`}>{t.titulo}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{aporta}% del total</span>
                <button type="button" onClick={() => borrar(t)} className="text-slate-500 hover:text-rose-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-2 mt-1.5 pl-7">
                <input type="range" min={0} max={100} value={t.avance} onChange={(e) => setAvance(t, Number(e.target.value))} className="flex-1 accent-violet-600 h-1" />
                <span className={`text-[11px] font-bold tabular-nums w-9 text-right ${done ? "text-emerald-500" : theme.textSecondary}`}>{t.avance}%</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] ${theme.textTertiary}`}>peso</span>
                  <input type="number" min={1} value={t.peso} onChange={(e) => setPesoT(t, Number(e.target.value))} className={`${inp} w-12`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }} placeholder="Nueva tarea…" className={`${inp} flex-1`} />
        <div className="flex items-center gap-1"><span className={`text-[10px] ${theme.textTertiary}`}>peso</span><input type="number" min={1} value={peso} onChange={(e) => setPeso(Number(e.target.value))} className={`${inp} w-12`} /></div>
        <button type="button" onClick={agregar} disabled={busy || !nueva.trim()} className="px-2.5 py-1.5 rounded-md text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, color, label, value, isDark, theme }: any) {
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

const PLANTILLAS_OBJ = [
  { objetivo: "Aumentar la satisfacción del cliente", meta: "≥ 90%", indicador: "% de clientes satisfechos (encuesta)" },
  { objetivo: "Reducir las no conformidades", meta: "≤ 5 / trimestre", indicador: "N.º de NC abiertas" },
  { objetivo: "Mejorar las entregas a tiempo", meta: "≥ 95%", indicador: "% de entregas puntuales" },
  { objetivo: "Cumplir el plan de capacitación", meta: "100%", indicador: "% de cursos impartidos" },
  { objetivo: "Reducir el tiempo de respuesta a quejas", meta: "≤ 48 h", indicador: "Horas promedio de respuesta" },
];

function ObjModal({ o, empresaId, isDark, theme, track, onClose, onSaved }: any) {
  const nuevo = !o.id;
  const [f, setF] = useState<any>({ objetivo: "", meta: "", indicador: "", responsable: "", responsable_user: null, proceso_ref: null, kpi_ref: null, fecha_limite: "", avance: 0, estado: "EN_CURSO", ...o });
  const [busy, setBusy] = useState(false);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [tareasCount, setTareasCount] = useState(0);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const avance = Number(f.avance) || 0;
  const estadoSugerido = avance >= 100 ? "LOGRADO" : "EN_CURSO";

  useEffect(() => {
    if (!empresaId) return;
    api.getProcesosSGC(empresaId).then((r) => setProcesos(r?.results || [])).catch(() => {});
    api.getKPIs({ empresa: String(empresaId) }).then((r) => setKpis(r?.results || [])).catch(() => {});
  }, [empresaId]);

  // Al elegir un KPI, autollenar indicador y meta desde su definición.
  const elegirKpi = (id: string) => {
    const kid = id ? Number(id) : null;
    set("kpi_ref", kid);
    const k = kpis.find((x) => x.id === kid);
    if (k) {
      set("indicador", k.nombre);
      set("meta", `${k.sentido === "MENOR" ? "≤" : "≥"} ${Number(k.meta).toLocaleString("es-MX")}${k.unidad ? " " + k.unidad : ""}`);
    }
  };

  // Atajos de fecha.
  const hoy = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const finTrimestre = () => { const q = Math.floor(hoy.getMonth() / 3); set("fecha_limite", fmt(new Date(hoy.getFullYear(), q * 3 + 3, 0))); };
  const finAno = () => set("fecha_limite", `${hoy.getFullYear()}-12-31`);
  const masDias = (d: number) => set("fecha_limite", fmt(new Date(Date.now() + d * 864e5)));

  // SMART en vivo.
  const smart = [
    { l: "Específico", ok: (f.objetivo || "").trim().length >= 12 },
    { l: "Medible", ok: !!(f.meta || "").trim() || !!f.kpi_ref },
    { l: "Asignado", ok: !!f.responsable_user },
    { l: "Relevante", ok: !!f.proceso_ref },
    { l: "Con plazo", ok: !!f.fecha_limite },
  ];
  const smartScore = smart.filter((s) => s.ok).length;

  const aplicarPlantilla = (p: any) => setF((prev: any) => ({ ...prev, objetivo: p.objetivo, meta: p.meta, indicador: p.indicador }));

  const guardar = async () => {
    if (!f.objetivo?.trim()) { alert("Describe el objetivo."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, objetivo: f.objetivo, meta: f.meta || "", indicador: f.indicador || "", responsable: f.responsable || "", responsable_user: f.responsable_user || null, proceso_ref: f.proceso_ref || null, kpi_ref: f.kpi_ref || null, fecha_limite: f.fecha_limite || null, avance, estado: f.estado };
    try { nuevo ? await api.crearObjetivo(payload) : await api.actualizarObjetivo(o.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const del = async () => { if (o.id && confirm("¿Eliminar objetivo?")) { await api.eliminarObjetivo(o.id); onSaved(); } };

  const kpiSel = kpis.find((k) => k.id === f.kpi_ref);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Target className="w-5 h-5" /> {nuevo ? "Nuevo objetivo de calidad" : "Editar objetivo"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-white/90 bg-white/15 rounded-full px-2.5 py-1">SMART {smartScore}/5</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
          </div>
        </div>

        <div className="p-5 overflow-auto space-y-3">
          {/* Plantillas rápidas (solo al crear) */}
          {nuevo && (
            <div>
              <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${theme.textTertiary}`}><Sparkles className="w-3 h-3" /> Empezar con una plantilla</div>
              <div className="flex flex-wrap gap-1.5">
                {PLANTILLAS_OBJ.map((p) => (
                  <button key={p.objetivo} type="button" onClick={() => aplicarPlantilla(p)} className={`text-[11px] px-2.5 py-1 rounded-full border transition ${isDark ? "border-white/10 text-slate-300 hover:bg-violet-500/15 hover:border-violet-500/40" : "border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300"}`}>{p.objetivo}</button>
                ))}
              </div>
            </div>
          )}

          <div><label className={lbl}>Objetivo *</label><input className={inp} value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Aumentar la satisfacción del cliente" /></div>

          {/* Vínculos: proceso + KPI */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={`${lbl} flex items-center gap-1`}><Network className="w-3 h-3" /> Proceso (de dónde deriva)</label>
              <select className={inp} value={f.proceso_ref || ""} onChange={(e) => set("proceso_ref", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— Sin proceso —</option>
                {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
              </select>
            </div>
            <div><label className={`${lbl} flex items-center gap-1`}><TrendingUp className="w-3 h-3" /> KPI que lo mide</label>
              <select className={inp} value={f.kpi_ref || ""} onChange={(e) => elegirKpi(e.target.value)}>
                <option value="">— Indicador manual —</option>
                {kpis.map((k) => <option key={k.id} value={k.id}>{k.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* KPI vinculado: muestra su estado en vivo */}
          {kpiSel && (
            <div className={`rounded-xl border p-2.5 flex items-center gap-3 text-xs ${kpiSel.cumple ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-amber-500/30 bg-amber-500/[0.06]"}`}>
              <TrendingUp className={`w-4 h-4 ${kpiSel.cumple ? "text-emerald-500" : "text-amber-500"}`} />
              <span className={theme.textSecondary}>Actual: <b className={theme.textPrimary}>{Number(kpiSel.valor_actual).toLocaleString("es-MX")} {kpiSel.unidad}</b> / meta {Number(kpiSel.meta).toLocaleString("es-MX")}</span>
              <span className={`ml-auto font-black ${kpiSel.cumple ? "text-emerald-500" : "text-amber-500"}`}>{kpiSel.cumple ? "En meta" : "Fuera de meta"}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Meta</label><input className={inp} value={f.meta} onChange={(e) => set("meta", e.target.value)} placeholder="≥ 95%" /></div>
            <div><label className={lbl}>Indicador (cómo se mide)</label><input className={inp} value={f.indicador} onChange={(e) => set("indicador", e.target.value)} placeholder="% encuestas satisfechas" disabled={!!f.kpi_ref} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectorUsuario label="Responsable" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
            <div>
              <label className={lbl}>Fecha límite</label>
              <input type="date" className={inp} value={f.fecha_limite || ""} onChange={(e) => set("fecha_limite", e.target.value)} />
              <div className="flex gap-1 mt-1 flex-wrap">
                {[["Fin trimestre", finTrimestre], ["Fin de año", finAno], ["+90 d", () => masDias(90)], ["+6 m", () => masDias(180)]].map(([l, fn]: any) => (
                  <button key={l} type="button" onClick={fn} className={`text-[10px] px-1.5 py-0.5 rounded border ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Avance + estado */}
          <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
            <div className="flex items-center gap-4">
              <Ring value={avance} color={EST_RING[f.estado]} track={track} size={64} />
              <div className="flex-1">
                <label className={`${lbl} flex justify-between items-center`}>
                  <span className="flex items-center gap-1.5">Avance {avance >= 100 && <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-500"><CheckCircle2 className="w-3 h-3" /> COMPLETADO</span>}</span>
                  <span className="text-violet-400 font-black">{avance}%</span>
                </label>
                <input type="range" min={0} max={100} value={avance} disabled={tareasCount > 0} onChange={(e) => set("avance", e.target.value)} className="w-full accent-violet-600 disabled:opacity-50" />
                {tareasCount > 0 && <p className={`text-[10px] ${theme.textTertiary}`}>El avance se calcula automáticamente desde las tareas ▾</p>}
                <div className="flex gap-1.5 mt-2">
                  {ESTADOS.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set("estado", v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${f.estado === v ? `${EST_COLOR[v]}` : isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-400"}`}>{l}</button>
                  ))}
                </div>
                {tareasCount === 0 && f.estado !== estadoSugerido && (
                  <button type="button" onClick={() => set("estado", estadoSugerido)} className="text-[11px] text-violet-400 hover:text-violet-300 mt-1.5">Sugerencia: marcar como “{ESTADOS.find(([v]) => v === estadoSugerido)?.[1]}”</button>
                )}
              </div>
            </div>
            {/* Tareas configurables que suman el avance */}
            {!nuevo
              ? <PanelTareasObjetivo objetivoId={o.id} isDark={isDark} theme={theme} onRecompute={(av, est, count) => { set("avance", av); if (est) set("estado", est); setTareasCount(count); }} />
              : <p className={`text-[11px] mt-2 ${theme.textTertiary}`}>Guarda el objetivo para desglosarlo en tareas que sumen el avance.</p>}
          </div>

          {/* Validación SMART en vivo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-bold ${theme.textTertiary}`}>SMART:</span>
            {smart.map((s) => (
              <span key={s.l} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${s.ok ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                {s.ok ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} {s.l}
              </span>
            ))}
          </div>
        </div>

        <div className={`px-5 py-3 border-t flex justify-between shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          {!nuevo ? <button onClick={del} className="inline-flex items-center gap-1 text-sm font-bold text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-xl"><Trash2 className="w-4 h-4" /> Eliminar</button> : <span />}
          <div className="flex gap-2"><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-violet-500 to-purple-600">{busy ? "Guardando…" : "Guardar objetivo"}</button></div>
        </div>
      </div>
    </div>
  );
}
