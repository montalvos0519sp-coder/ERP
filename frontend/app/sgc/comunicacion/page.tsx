"use client";

// SGC · Matriz de Comunicación (ISO 9001 · 7.4).
// Qué se comunica, en qué dirección, cuándo, a quién, cómo y quién es responsable.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, Plus, RefreshCw, X, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario } from "@/components/sgc/Colaboracion";

const DIRECCIONES = [["INTERNA", "Interna"], ["EXTERNA", "Externa"], ["AMBAS", "Ambas"]];
const lblDe = (arr: string[][], v: string) => arr.find(([x]) => x === v)?.[1] || v;

export default function ComunicacionPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getComunicaciones({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const eliminar = async (e: any, c: any) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar esta comunicación?`)) return;
    try { await api.eliminarComunicacion(c.id); load(); } catch (err) { alert((err as Error).message); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #3B82F6 0, transparent 40%), radial-gradient(circle at 90% 80%, #6366F1 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600"><Megaphone className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Matriz de Comunicación</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-blue-500 to-indigo-600">ISO 7.4</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Define qué se comunica, en qué dirección, cuándo, a quién y cómo.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nueva comunicación</button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><Megaphone className="w-10 h-10 mx-auto mb-3 text-blue-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin comunicaciones</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Define la matriz de comunicación interna y externa (7.4).</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600"><Plus className="w-4 h-4" /> Crear primera</button></div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                  {["Qué", "Dirección", "Cuándo", "A quién", "Cómo", "Responsable", ""].map((h) => <th key={h} className={`px-3 py-2.5 text-[11px] uppercase tracking-wider font-black ${theme.textTertiary}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} onClick={() => setEdit(c)} className={`cursor-pointer border-t ${isDarkMode ? "border-white/[0.05] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className={`px-3 py-2.5 font-semibold ${theme.textPrimary}`}>{c.que}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${isDarkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{c.direccion_display || lblDe(DIRECCIONES, c.direccion)}</span></td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{c.cuando || "—"}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{c.a_quien || "—"}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{c.como || "—"}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{c.responsable_nombre || "—"}</td>
                    <td className="px-3 py-2.5"><button onClick={(e) => eliminar(e, c)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {edit && <ComunicacionModal com={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function ComunicacionModal({ com, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    que: "", direccion: "INTERNA", cuando: "", a_quien: "", como: "", responsable_user: null, ...com,
  });
  const [busy, setBusy] = useState(false);
  const id = com.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.que?.trim()) { alert("Indica qué se comunica."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, que: f.que, direccion: f.direccion, cuando: f.cuando || "",
      a_quien: f.a_quien || "", como: f.como || "", responsable_user: f.responsable_user || null,
    };
    try {
      if (id) { await api.actualizarComunicacion(id, payload); onSaved(); }
      else { const saved = await api.crearComunicacion(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); onSaved(); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Megaphone className="w-4 h-4" /> {id ? "Editar comunicación" : "Nueva comunicación"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div><label className={lbl}>¿Qué se comunica? *</label><input className={inp} value={f.que} onChange={(e) => set("que", e.target.value)} placeholder="Tema o información a comunicar." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Dirección</label><select className={inp} value={f.direccion} onChange={(e) => set("direccion", e.target.value)}>{DIRECCIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className={lbl}>¿Cuándo?</label><input className={inp} value={f.cuando} onChange={(e) => set("cuando", e.target.value)} placeholder="Frecuencia / momento" /></div>
          </div>
          <div><label className={lbl}>¿A quién?</label><input className={inp} value={f.a_quien} onChange={(e) => set("a_quien", e.target.value)} placeholder="Audiencia / destinatarios" /></div>
          <div><label className={lbl}>¿Cómo?</label><input className={inp} value={f.como} onChange={(e) => set("como", e.target.value)} placeholder="Medio / canal" /></div>
          <SelectorUsuario value={f.responsable_user} onChange={(uid: any) => set("responsable_user", uid)} label="Responsable" />
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-blue-500 to-indigo-600">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
