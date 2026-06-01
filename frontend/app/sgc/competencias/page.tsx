"use client";

// SGC · Competencias (ISO 9001 · 7.2) — gestión profesional tipo RH.
// Perfiles con competencias granulares (tipo + nivel requerido), evaluación por
// niveles con BRECHA automática, dashboard de brechas e integración con
// capacitación (plan de desarrollo).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Award, Briefcase, Plus, UserCheck, X, Search, AlertTriangle, CheckCircle2,
  Target, GraduationCap, Trash2, ListChecks, TrendingDown, RefreshCw,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario, useMiembros } from "@/components/sgc/Colaboracion";

const EST_COLOR: Record<string, string> = { CUMPLE: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", BRECHA: "bg-rose-500/15 text-rose-500 border-rose-500/30", EN_DESARROLLO: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
const EST_RING: Record<string, string> = { CUMPLE: "#10B981", EN_DESARROLLO: "#F59E0B", BRECHA: "#F43F5E" };
const ESTADOS = [["CUMPLE", "Cumple perfil"], ["EN_DESARROLLO", "En desarrollo"], ["BRECHA", "Con brecha"]];
const TIPOS = [["CONOCIMIENTO", "Conocimiento"], ["TECNICA", "H. técnica"], ["BLANDA", "H. blanda"], ["CERTIFICACION", "Certificación"], ["EXPERIENCIA", "Experiencia"]];
const TIPO_COLOR: Record<string, string> = { CONOCIMIENTO: "#0EA5E9", TECNICA: "#8B5CF6", BLANDA: "#10B981", CERTIFICACION: "#F59E0B", EXPERIENCIA: "#EC4899" };
const NIVELES = [[1, "Básico"], [2, "Intermedio"], [3, "Avanzado"], [4, "Experto"]];
const NIVEL_LABEL = ["No lo tiene", "Básico", "Intermedio", "Avanzado", "Experto"];

function Ring({ value, size = 48, stroke = 6, color, track }: any) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .4s" }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize={size * 0.26} fontWeight="800" fill={color}>{value}</text>
    </svg>
  );
}

export default function CompetenciasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [tab, setTab] = useState<"brechas" | "evals" | "perfiles">("brechas");
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [brechas, setBrechas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editP, setEditP] = useState<any | null>(null);
  const [editE, setEditE] = useState<any | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const [p, e, b] = await Promise.all([
        api.getPerfilesPuesto({ empresa: String(empresaActivaId) }),
        api.getCompetencias({ empresa: String(empresaActivaId) }),
        api.getBrechasCompetencia(empresaActivaId),
      ]);
      setPerfiles(p?.results || []); setEvals(e?.results || []); setBrechas(b || null);
    } finally { setLoading(false); }
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    perfiles: perfiles.length, personas: evals.length,
    cumple: evals.filter((e) => e.estado === "CUMPLE").length,
    brecha: evals.filter((e) => e.estado === "BRECHA").length,
    pct: evals.length ? Math.round(evals.filter((e) => e.estado === "CUMPLE").length / evals.length * 100) : 0,
  }), [perfiles, evals]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const track = isDarkMode ? "#ffffff14" : "#0000000d";
  const visiblesE = evals.filter((e) => !q || `${e.persona} ${e.perfil_puesto}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-purple-500 to-fuchsia-600"><Award className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Gestión de Competencias</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 7.2 — perfiles, evaluación de brechas y plan de desarrollo.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => (tab === "perfiles" ? setEditP({}) : setEditE({}))} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-fuchsia-600"><Plus className="w-4 h-4" /> {tab === "perfiles" ? "Nuevo perfil" : "Evaluar persona"}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Briefcase} color="#A855F7" label="Perfiles definidos" value={stats.perfiles} c={card} theme={theme} />
        <KPI icon={UserCheck} color="#0EA5E9" label="Personas evaluadas" value={stats.personas} c={card} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Cumplen perfil" value={`${stats.pct}%`} c={card} theme={theme} />
        <KPI icon={TrendingDown} color="#F43F5E" label="Brechas detectadas" value={brechas?.total_brechas ?? 0} c={card} theme={theme} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["brechas", "Dashboard de brechas", AlertTriangle], ["evals", "Evaluaciones", UserCheck], ["perfiles", "Perfiles de puesto", Briefcase]].map(([k, l, Ic]: any) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${tab === k ? "bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}><Ic className="w-4 h-4" /> {l}</button>
        ))}
      </div>

      {/* TAB BRECHAS */}
      {tab === "brechas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`rounded-2xl border p-4 ${card}`}>
            <h3 className={`text-sm font-black mb-2 ${theme.textPrimary}`}>Competencias con más brechas</h3>
            {brechas?.por_competencia?.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={brechas.por_competencia.slice(0, 8)} margin={{ left: 10, right: 24 }}>
                    <XAxis type="number" hide /><YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11, fill: isDarkMode ? "#cbd5e1" : "#475569" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: isDarkMode ? "#ffffff08" : "#00000005" }} contentStyle={{ background: isDarkMode ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v} persona(s)`, "Brecha"]} />
                    <Bar dataKey="personas" radius={[0, 6, 6, 0]} fill="#F43F5E" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className={`text-sm py-8 text-center ${theme.textTertiary}`}>Sin brechas registradas. Evalúa al personal contra su perfil.</p>}
          </div>
          <div className={`rounded-2xl border p-4 ${card}`}>
            <h3 className={`text-sm font-black mb-2 ${theme.textPrimary}`}>Personas con más brechas</h3>
            {brechas?.por_persona?.length ? (
              <div className="space-y-1.5">
                {brechas.por_persona.slice(0, 10).map((p: any) => (
                  <div key={p.persona} className="flex items-center gap-2">
                    <span className={`text-sm flex-1 truncate ${theme.textPrimary}`}>{p.persona}</span>
                    <div className={`w-28 h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.08]" : "bg-slate-200"}`}><div className="h-full bg-rose-500" style={{ width: `${Math.min(100, p.brechas * 25)}%` }} /></div>
                    <span className="text-xs font-bold text-rose-500 w-6 text-right">{p.brechas}</span>
                  </div>
                ))}
              </div>
            ) : <p className={`text-sm py-8 text-center ${theme.textTertiary}`}>Sin brechas.</p>}
          </div>
        </div>
      )}

      {/* TAB EVALUACIONES */}
      {tab === "evals" && (
        <>
          <div className="relative max-w-xs"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none w-full ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
          {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
          : visiblesE.length === 0 ? <div className={`rounded-2xl border p-10 text-center ${card}`}><UserCheck className="w-9 h-9 mx-auto mb-2 text-purple-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin evaluaciones</p><p className={`text-sm ${theme.textSecondary}`}>Evalúa a cada persona contra su perfil para detectar brechas.</p></div>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visiblesE.map((e) => (
                <button key={e.id} onClick={() => setEditE(e)} className={`text-left rounded-2xl border p-4 flex gap-3 transition hover:shadow-lg ${card}`}>
                  <Ring value={Number(e.nivel) || 0} color={EST_RING[e.estado]} track={track} size={52} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2"><span className={`font-black truncate ${theme.textPrimary}`}>{e.persona}</span><span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${EST_COLOR[e.estado]}`}>{ESTADOS.find(([v]) => v === e.estado)?.[1]}</span></div>
                    <div className={`text-[11px] ${theme.textTertiary}`}>{e.perfil_puesto || "Sin perfil"} · {(e.detalles || []).length} competencias</div>
                    {e.brechas && <div className={`text-[11px] mt-1 line-clamp-2 text-rose-400`}>Brecha: {e.brechas}</div>}
                    {e.capacitacion_ref && <div className="text-[11px] mt-1 text-emerald-500 inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Plan de capacitación creado</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB PERFILES */}
      {tab === "perfiles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? <p className={`col-span-full text-sm ${theme.textTertiary}`}>Cargando…</p>
          : perfiles.length === 0 ? <div className={`col-span-full rounded-2xl border p-10 text-center ${card}`}><Briefcase className="w-9 h-9 mx-auto mb-2 text-purple-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin perfiles</p><p className={`text-sm ${theme.textSecondary}`}>Define el perfil de cada puesto con sus competencias requeridas.</p></div>
          : perfiles.map((p) => (
            <button key={p.id} onClick={() => setEditP(p)} className={`text-left rounded-2xl border p-4 ${card} hover:shadow-lg transition`}>
              <div className="flex items-center gap-2 mb-1"><span className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white"><Briefcase className="w-4 h-4" /></span><div className="flex-1"><span className={`font-black ${theme.textPrimary}`}>{p.puesto}</span>{p.area && <span className={`block text-[11px] ${theme.textTertiary}`}>{p.area}</span>}</div><span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">{p.competencias_total} comp.</span></div>
              {(p.competencias || []).length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.competencias.slice(0, 6).map((c: any) => <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: (TIPO_COLOR[c.tipo] || "#94a3b8") + "22", color: TIPO_COLOR[c.tipo] || "#94a3b8" }}>{c.nombre} · {c.nivel_display}</span>)}{p.competencias.length > 6 && <span className={`text-[10px] ${theme.textTertiary}`}>+{p.competencias.length - 6}</span>}</div>}
            </button>
          ))}
        </div>
      )}

      {editP && <PerfilModal p={editP} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEditP(null)} onSaved={() => { setEditP(null); load(); }} />}
      {editE && <EvalModal e={editE} perfiles={perfiles} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} track={track} onClose={() => setEditE(null)} onSaved={() => { setEditE(null); load(); }} />}
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, c, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${c}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

// ── Perfil con competencias granulares ──────────────────────────────────────
function PerfilModal({ p, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ puesto: "", area: "", funciones: "", escolaridad: "", experiencia: "", ...p });
  const [comps, setComps] = useState<any[]>(p.competencias || []);
  const [nueva, setNueva] = useState<any>({ nombre: "", tipo: "CONOCIMIENTO", nivel_requerido: 2, obligatoria: true });
  const [busy, setBusy] = useState(false);
  const idP = p.id || f.id;
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const cargarComps = useCallback(() => { if (idP) api.getCompetenciasPerfil(idP).then((r) => setComps(r?.results || [])).catch(() => {}); }, [idP]);
  useEffect(() => { cargarComps(); }, [cargarComps]);

  const guardar = async () => {
    if (!f.puesto?.trim()) { alert("Puesto requerido."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, puesto: f.puesto, area: f.area || "", funciones: f.funciones || "", escolaridad: f.escolaridad || "", experiencia: f.experiencia || "", formacion: f.formacion || "", habilidades: f.habilidades || "" };
    try {
      if (idP) { await api.actualizarPerfilPuesto(idP, payload); onSaved(); }
      else { const saved = await api.crearPerfilPuesto(payload); if (saved?.id) setF((x: any) => ({ ...x, id: saved.id })); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const addComp = async () => {
    if (!nueva.nombre.trim() || !idP) return;
    try { await api.crearCompetenciaPerfil({ perfil: idP, ...nueva }); setNueva({ nombre: "", tipo: nueva.tipo, nivel_requerido: nueva.nivel_requerido, obligatoria: true }); cargarComps(); }
    catch (e) { alert((e as Error).message); }
  };
  const updComp = async (c: any, patch: any) => { try { await api.actualizarCompetenciaPerfil(c.id, patch); cargarComps(); } catch { /* */ } };
  const delComp = async (c: any) => { try { await api.eliminarCompetenciaPerfil(c.id); cargarComps(); } catch { /* */ } };

  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><Briefcase className="w-5 h-5" /> {idP ? f.puesto : "Nuevo perfil de puesto"}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Puesto *</label><input className={inp} value={f.puesto} onChange={(e) => set("puesto", e.target.value)} placeholder="Analista de ERP" /></div>
            <div><label className={lbl}>Área</label><input className={inp} value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="TI / Operaciones" /></div>
          </div>
          <div><label className={lbl}>Funciones del puesto</label><textarea rows={2} className={inp} value={f.funciones} onChange={(e) => set("funciones", e.target.value)} placeholder="Responsabilidades principales…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Escolaridad mínima</label><input className={inp} value={f.escolaridad} onChange={(e) => set("escolaridad", e.target.value)} placeholder="Licenciatura / técnico" /></div>
            <div><label className={lbl}>Experiencia mínima</label><input className={inp} value={f.experiencia} onChange={(e) => set("experiencia", e.target.value)} placeholder="1 año en…" /></div>
          </div>

          {/* Competencias granulares */}
          {idP ? (
            <div className={sec}>
              <div className="flex items-center gap-2 mb-2"><ListChecks className="w-4 h-4 text-purple-400" /><span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Competencias requeridas ({comps.length})</span></div>
              <div className="space-y-1.5 mb-2">
                {comps.length === 0 && <p className={`text-xs ${theme.textTertiary}`}>Define qué debe saber/poder hacer este puesto, con su nivel objetivo.</p>}
                {comps.map((c) => (
                  <div key={c.id} className={`flex items-center gap-2 rounded-lg border p-2 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (TIPO_COLOR[c.tipo] || "#94a3b8") + "22", color: TIPO_COLOR[c.tipo] || "#94a3b8" }}>{TIPOS.find(([v]) => v === c.tipo)?.[1]}</span>
                    <span className={`flex-1 text-sm truncate ${theme.textPrimary}`}>{c.nombre}</span>
                    <select value={c.nivel_requerido} onChange={(e) => updComp(c, { nivel_requerido: Number(e.target.value) })} className={`text-xs px-1.5 py-1 rounded border ${isDark ? "bg-[#1E293B]/60 border-white/10 text-slate-200" : "bg-white border-slate-200"}`}>{NIVELES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    <button onClick={() => updComp(c, { obligatoria: !c.obligatoria })} title={c.obligatoria ? "Obligatoria" : "Deseable"} className={`text-[10px] font-bold px-1.5 py-1 rounded ${c.obligatoria ? "text-rose-500" : "text-slate-400"}`}>{c.obligatoria ? "Oblig." : "Desea."}</button>
                    <button onClick={() => delComp(c)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                <input value={nueva.nombre} onChange={(e) => setNueva((p: any) => ({ ...p, nombre: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComp(); } }} placeholder="Competencia (ej. SQL)" className={`${inp} flex-1 min-w-[140px]`} />
                <select value={nueva.tipo} onChange={(e) => setNueva((p: any) => ({ ...p, tipo: e.target.value }))} className={`${inp} w-auto`}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <select value={nueva.nivel_requerido} onChange={(e) => setNueva((p: any) => ({ ...p, nivel_requerido: Number(e.target.value) }))} className={`${inp} w-auto`}>{NIVELES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <button onClick={addComp} className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-purple-500 to-fuchsia-600"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          ) : <p className={`text-[11px] ${theme.textTertiary}`}>Guarda el perfil para agregar sus competencias.</p>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-purple-500 to-fuchsia-600">{busy ? "Guardando…" : (idP ? "Guardar" : "Guardar y continuar")}</button></div>
      </div>
    </div>
  );
}

// ── Evaluación por niveles con brecha automática ────────────────────────────
function EvalModal({ e, perfiles, empresaId, isDark, theme, track, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ persona: "", persona_user: null, perfil: "", nivel: 0, estado: "BRECHA", detalles: [], ...e });
  const [busy, setBusy] = useState(false);
  const miembros = useMiembros();
  const idE = e.id || f.id;
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const refrescar = useCallback(() => { if (idE) api.getCompetencias({ empresa: String(empresaId) }).then((r) => { const me = (r?.results || []).find((x: any) => x.id === idE); if (me) setF((p: any) => ({ ...p, ...me })); }).catch(() => {}); }, [idE, empresaId]);

  const elegirPersona = (id: number | null) => { const m = miembros.find((x) => x.id === id); setF((p: any) => ({ ...p, persona_user: id, persona: m ? m.nombre : "" })); };

  const guardarBase = async () => {
    if (!f.persona?.trim()) { alert("Selecciona a la persona."); return; }
    if (!f.perfil) { alert("Selecciona el perfil a evaluar."); return; }
    setBusy(true);
    try {
      if (idE) { await api.actualizarCompetencia(idE, { persona: f.persona, persona_user: f.persona_user || null, perfil: f.perfil }); refrescar(); }
      else {
        const saved = await api.crearCompetencia({ empresa: empresaId, persona: f.persona, persona_user: f.persona_user || null, perfil: f.perfil });
        if (saved?.id) { const s = await api.sembrarDetallesEvaluacion(saved.id); setF((p: any) => ({ ...p, ...s, id: saved.id })); }
      }
    } catch (err) { alert((err as Error).message); } finally { setBusy(false); }
  };
  const setNivel = async (d: any, v: number) => { try { await api.actualizarEvaluacionDetalle(d.id, { nivel_actual: v }); refrescar(); } catch { /* */ } };
  const resembrar = async () => { try { const s = await api.sembrarDetallesEvaluacion(idE); setF((p: any) => ({ ...p, ...s })); } catch (err) { alert((err as Error).message); } };
  const generarPlan = async () => { try { const r = await api.crearCapacitacionDesdeBrecha(idE); setF((p: any) => ({ ...p, ...(r?.evaluacion || {}) })); alert("Plan de capacitación creado en Capacitación."); } catch (err) { alert((err as Error).message); } };

  const detalles = f.detalles || [];
  const tieneBrecha = detalles.some((d: any) => d.nivel_actual < d.nivel_requerido);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><UserCheck className="w-5 h-5" /> {idE ? f.persona : "Evaluar competencia"}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectorUsuario label="Persona a evaluar *" value={f.persona_user} onChange={elegirPersona} placeholder="— Selecciona usuario —" />
            <div><label className={lbl}>Perfil a evaluar *</label><select className={inp} value={f.perfil || ""} onChange={(e2) => set("perfil", e2.target.value ? Number(e2.target.value) : "")} disabled={!!idE}><option value="">— Selecciona —</option>{perfiles.map((p: any) => <option key={p.id} value={p.id}>{p.puesto} ({p.competencias_total} comp.)</option>)}</select></div>
          </div>

          {!idE ? (
            <p className={`text-[11px] ${theme.textTertiary}`}>Al guardar, se cargan las competencias del perfil para calificar el nivel real de la persona.</p>
          ) : (
            <>
              {/* Resumen */}
              <div className={`rounded-xl border p-3 flex items-center gap-4 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                <Ring value={Number(f.nivel) || 0} color={EST_RING[f.estado]} track={track} size={60} />
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-black" style={{ color: EST_RING[f.estado] }}>{ESTADOS.find(([v]) => v === f.estado)?.[1]}</span><span className={`text-[11px] ${theme.textTertiary}`}>cumplimiento del perfil</span></div>
                  {f.brechas && <p className="text-[11px] text-rose-400 mt-0.5 line-clamp-2">Brechas: {f.brechas}</p>}
                </div>
                {tieneBrecha && (f.capacitacion_ref ? <span className="text-xs font-bold text-emerald-500 inline-flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Plan creado</span>
                  : <button onClick={generarPlan} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Generar plan</button>)}
              </div>

              {/* Detalle por competencia */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Nivel real por competencia</span>
                <button onClick={resembrar} className="text-[11px] text-purple-400 hover:text-purple-300">Recargar del perfil</button>
              </div>
              {detalles.length === 0 ? <p className={`text-xs ${theme.textTertiary}`}>El perfil no tiene competencias. Agrégalas en su perfil.</p>
              : detalles.map((d: any) => {
                const brecha = d.nivel_actual < d.nivel_requerido;
                return (
                  <div key={d.id} className={`rounded-lg border p-2.5 ${brecha ? "border-rose-500/30 bg-rose-500/[0.04]" : isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (TIPO_COLOR[d.tipo] || "#94a3b8") + "22", color: TIPO_COLOR[d.tipo] || "#94a3b8" }}>{TIPOS.find(([v]) => v === d.tipo)?.[1]}</span>
                      <span className={`flex-1 text-sm font-semibold truncate ${theme.textPrimary}`}>{d.nombre}</span>
                      <span className={`text-[11px] ${theme.textTertiary}`}>Req: <b style={{ color: theme.textPrimary }}>{d.nivel_req_display}</b></span>
                      {brecha ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 inline-flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Brecha</span> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-[10px] ${theme.textTertiary} w-14`}>Nivel real:</span>
                      {[0, 1, 2, 3, 4].map((n) => (
                        <button key={n} onClick={() => setNivel(d, n)} title={NIVEL_LABEL[n]} className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${d.nivel_actual === n ? (n >= d.nivel_requerido ? "bg-emerald-500 text-white border-transparent" : "bg-amber-500 text-white border-transparent") : isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{n === 0 ? "—" : n}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>{idE ? "Cerrar" : "Cancelar"}</button>
          {!idE && <button onClick={guardarBase} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-purple-500 to-fuchsia-600">{busy ? "Cargando…" : "Cargar competencias"}</button>}
        </div>
      </div>
    </div>
  );
}
