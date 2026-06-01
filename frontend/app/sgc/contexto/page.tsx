"use client";

// SGC · Contexto de la organización (4.1 FODA / 4.2 partes interesadas).
// FODA con estrategias por factor + matriz cruzada (FO/DO/FA/DA) y partes
// interesadas en tarjetas con medidor de influencia.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Network, Plus, Trash2, X, Lightbulb, Target } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const FODA = [
  { t: "F", label: "Fortalezas", color: "#10b981", desc: "Internas · positivas" },
  { t: "D", label: "Debilidades", color: "#ef4444", desc: "Internas · negativas" },
  { t: "O", label: "Oportunidades", color: "#3b82f6", desc: "Externas · positivas" },
  { t: "A", label: "Amenazas", color: "#f59e0b", desc: "Externas · negativas" },
];
const CRUCES = [
  { k: "FO", label: "Ofensivas (FO)", q: "Usa tus Fortalezas para aprovechar Oportunidades", color: "#10b981" },
  { k: "DO", label: "Adaptativas (DO)", q: "Supera Debilidades aprovechando Oportunidades", color: "#3b82f6" },
  { k: "FA", label: "Defensivas (FA)", q: "Usa Fortalezas para enfrentar Amenazas", color: "#f59e0b" },
  { k: "DA", label: "Supervivencia (DA)", q: "Reduce Debilidades y evita Amenazas", color: "#ef4444" },
];
const PI_TIPOS = [["CLIENTE", "Cliente"], ["PROVEEDOR", "Proveedor"], ["EMPLEADO", "Empleado/personal"], ["ACCIONISTA", "Accionista/dueño"], ["AUTORIDAD", "Autoridad/regulador"], ["COMUNIDAD", "Comunidad"], ["OTRO", "Otro"]];
const PI_COLOR: Record<string, string> = { CLIENTE: "#0EA5E9", PROVEEDOR: "#8B5CF6", EMPLEADO: "#10B981", ACCIONISTA: "#F59E0B", AUTORIDAD: "#F43F5E", COMUNIDAD: "#14B8A6", OTRO: "#94A3B8" };

export default function ContextoPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [tab, setTab] = useState<"foda" | "partes">("foda");
  const [foda, setFoda] = useState<any[]>([]);
  const [partes, setPartes] = useState<any[]>([]);
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [editPI, setEditPI] = useState<any | null>(null);
  const [editF, setEditF] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!empresaActivaId) return;
    const [f, p] = await Promise.all([api.getContexto({ empresa: String(empresaActivaId) }), api.getPartesInteresadas({ empresa: String(empresaActivaId) })]);
    setFoda(f?.results || []); setPartes(p?.results || []);
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const addFoda = async (t: string) => {
    const txt = (nuevo[t] || "").trim();
    if (!txt) return;
    try { await api.crearContexto({ empresa: empresaActivaId, tipo: t, descripcion: txt }); setNuevo((p) => ({ ...p, [t]: "" })); load(); }
    catch (e) { alert((e as Error).message); }
  };
  const delFoda = async (id: number) => { await api.eliminarContexto(id); load(); };

  const cuenta = (t: string) => foda.filter((e) => e.tipo === t).length;
  const conEstrategia = foda.filter((e) => e.estrategia).length;
  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const inp = `w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-sky-500 to-blue-600"><Network className="w-6 h-6 text-white" /></div>
        <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Contexto de la Organización</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 4.1 (FODA) y 4.2 (partes interesadas).</p></div>
      </div>

      {/* KPIs FODA */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FODA.map((q) => (
          <div key={q.t} className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ background: q.color }}>{q.t}</span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{cuenta(q.t)}</span></div>
            <div className={`text-[11px] uppercase font-bold mt-1 ${theme.textTertiary}`}>{q.label}</div>
          </div>
        ))}
        <div className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-sky-500" /><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{partes.length}</span></div><div className={`text-[11px] uppercase font-bold mt-1 ${theme.textTertiary}`}>Partes interesadas</div></div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("foda")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${tab === "foda" ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}><Network className="w-4 h-4" /> Análisis FODA</button>
        <button onClick={() => setTab("partes")} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${tab === "partes" ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}><Building2 className="w-4 h-4" /> Partes interesadas</button>
      </div>

      {tab === "foda" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FODA.map((q) => (
              <div key={q.t} className={`rounded-2xl border overflow-hidden ${card}`}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: q.color + (isDarkMode ? "1f" : "14") }}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs" style={{ background: q.color }}>{q.t}</span>
                  <h3 className="font-black" style={{ color: q.color }}>{q.label}</h3>
                  <span className={`text-[10px] ${theme.textTertiary}`}>{q.desc}</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {foda.filter((e) => e.tipo === q.t).map((e) => (
                    <button key={e.id} onClick={() => setEditF(e)} className={`w-full text-left flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm transition ${isDarkMode ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-slate-50 hover:bg-slate-100"}`}>
                      <span className="min-w-0"><span className={theme.textSecondary}>{e.descripcion}</span>{e.estrategia && <span className="block text-[11px] mt-0.5" style={{ color: q.color }}>↳ {e.estrategia}</span>}</span>
                      <Trash2 onClick={(ev) => { ev.stopPropagation(); delFoda(e.id); }} className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400 shrink-0 mt-0.5" />
                    </button>
                  ))}
                  {cuenta(q.t) === 0 && <p className={`text-xs ${theme.textTertiary}`}>Agrega factores… (clic para definir su estrategia)</p>}
                  <div className="flex gap-2 pt-1">
                    <input className={inp} value={nuevo[q.t] || ""} onChange={(e) => setNuevo((p) => ({ ...p, [q.t]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addFoda(q.t)} placeholder={`Nueva ${q.label.toLowerCase().slice(0, -1)}…`} />
                    <button onClick={() => addFoda(q.t)} className="px-2.5 rounded-lg text-white font-bold" style={{ background: q.color }}><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Matriz de estrategias cruzadas */}
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-amber-400" /><h3 className={`text-sm font-black uppercase tracking-wider ${theme.textPrimary}`}>Estrategias cruzadas (matriz FODA)</h3><span className={`text-[11px] ${theme.textTertiary}`}>{conEstrategia} factores con estrategia definida</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {CRUCES.map((c) => (
                <div key={c.k} className={`rounded-xl border p-3 ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`} style={{ borderTop: `3px solid ${c.color}` }}>
                  <div className="text-sm font-black" style={{ color: c.color }}>{c.label}</div>
                  <div className={`text-[11px] mt-0.5 ${theme.textSecondary}`}>{c.q}</div>
                </div>
              ))}
            </div>
            <p className={`text-[11px] mt-2 ${theme.textTertiary}`}>Tip: abre cada factor (clic) y escribe su estrategia. Las estrategias aparecen bajo cada factor con ↳.</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center"><p className={`text-sm ${theme.textSecondary}`}>Identifica clientes, proveedores, personal, autoridades… y sus expectativas.</p><button onClick={() => setEditPI({})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600"><Plus className="w-3.5 h-3.5" /> Nueva parte interesada</button></div>
          {partes.length === 0 ? <div className={`rounded-2xl border p-10 text-center ${card}`}><Building2 className="w-9 h-9 mx-auto mb-2 text-sky-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin partes interesadas</p></div>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...partes].sort((a, b) => b.influencia - a.influencia).map((p) => (
                <button key={p.id} onClick={() => setEditPI(p)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PI_COLOR[p.tipo] }} /><span className={`font-black ${theme.textPrimary}`}>{p.nombre}</span></div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: PI_COLOR[p.tipo] + "22", color: PI_COLOR[p.tipo] }}>{p.tipo_display}</span>
                  </div>
                  {p.necesidades && <p className={`text-xs mt-1.5 line-clamp-2 ${theme.textSecondary}`}>{p.necesidades}</p>}
                  {p.seguimiento && <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>{p.seguimiento}</p>}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[10px] uppercase font-bold ${theme.textTertiary}`}>Influencia</span>
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <span key={i} className="w-4 h-1.5 rounded-full" style={{ background: i <= p.influencia ? PI_COLOR[p.tipo] : (isDarkMode ? "#ffffff15" : "#0000000d") }} />)}</div>
                    <span className={`text-[11px] font-bold ${theme.textSecondary}`}>{p.influencia}/5</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {editF && <FodaModal e={editF} foda={FODA} isDark={isDarkMode} theme={theme} onClose={() => setEditF(null)} onSaved={() => { setEditF(null); load(); }} />}
      {editPI && <PIModal pi={editPI} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEditPI(null)} onSaved={() => { setEditPI(null); load(); }} />}
    </div>
  );
}

function FodaModal({ e, foda, isDark, theme, onClose, onSaved }: any) {
  const meta = foda.find((x: any) => x.t === e.tipo);
  const [f, setF] = useState<any>({ descripcion: e.descripcion || "", estrategia: e.estrategia || "" });
  const [busy, setBusy] = useState(false);
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const guardar = async () => {
    if (!f.descripcion?.trim()) { alert("Describe el factor."); return; }
    setBusy(true);
    try { await api.actualizarContexto(e.id, { descripcion: f.descripcion, estrategia: f.estrategia || "" }); onSaved(); }
    catch (err) { alert((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: `linear-gradient(90deg, ${meta?.color}, ${meta?.color}bb)` }}><h2 className="text-base font-black text-white flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-white/25 flex items-center justify-center">{e.tipo}</span> {meta?.label}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Factor</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(ev) => setF((p: any) => ({ ...p, descripcion: ev.target.value }))} /></div>
          <div><label className={`${lbl} flex items-center gap-1`}><Target className="w-3.5 h-3.5" /> Estrategia (¿cómo se aprovecha o aborda?)</label><textarea rows={2} className={inp} value={f.estrategia} onChange={(ev) => setF((p: any) => ({ ...p, estrategia: ev.target.value }))} placeholder="Acción concreta para capitalizar o mitigar este factor…" /></div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: meta?.color }}>{busy ? "Guardando…" : "Guardar"}</button></div>
      </div>
    </div>
  );
}

function PIModal({ pi, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !pi.id;
  const [f, setF] = useState<any>({ nombre: "", tipo: "CLIENTE", necesidades: "", influencia: 3, seguimiento: "", ...pi });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const guardar = async () => {
    if (!f.nombre?.trim()) { alert("Nombre requerido."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, nombre: f.nombre, tipo: f.tipo, necesidades: f.necesidades || "", influencia: Number(f.influencia) || 1, seguimiento: f.seguimiento || "" };
    try { nuevo ? await api.crearParteInteresada(payload) : await api.actualizarParteInteresada(pi.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const del = async () => { if (pi.id && confirm("¿Eliminar?")) { await api.eliminarParteInteresada(pi.id); onSaved(); } };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border p-6 space-y-3 ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between"><h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{nuevo ? "Nueva parte interesada" : "Editar"}</h2><button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Nombre / grupo *</label><input className={inp} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
          <div><label className={lbl}>Tipo</label><select className={inp} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{PI_TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div><label className={lbl}>Necesidades y expectativas</label><textarea rows={2} className={inp} value={f.necesidades} onChange={(e) => set("necesidades", e.target.value)} placeholder="¿Qué esperan de la organización?" /></div>
        <div><label className={lbl}>Seguimiento</label><input className={inp} value={f.seguimiento} onChange={(e) => set("seguimiento", e.target.value)} placeholder="Cómo se monitorea (encuestas, reuniones…)" /></div>
        <div><label className={lbl}>Influencia: {f.influencia}/5</label><input type="range" min={1} max={5} value={f.influencia} onChange={(e) => set("influencia", e.target.value)} className="w-full accent-sky-600" /></div>
        <div className="flex justify-between pt-2">
          {!nuevo ? <button onClick={del} className="inline-flex items-center gap-1 text-sm font-bold text-rose-400"><Trash2 className="w-4 h-4" /> Eliminar</button> : <span />}
          <div className="flex gap-2"><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-sky-500 to-blue-600">{busy ? "Guardando…" : "Guardar"}</button></div>
        </div>
      </div>
    </div>
  );
}
