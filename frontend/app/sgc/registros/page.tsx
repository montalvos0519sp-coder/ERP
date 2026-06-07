"use client";

// SGC · Lista Maestra de Registros (ISO 9001 · 7.5.3).
// Control de los registros de calidad: soporte, ubicación, retención y disposición.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Plus, RefreshCw, X, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario } from "@/components/sgc/Colaboracion";

const SOPORTES = [["DIGITAL", "Digital"], ["FISICO", "Físico"], ["AMBOS", "Ambos"]];
const DISPOSICIONES = [["ELIMINAR", "Eliminar"], ["ARCHIVAR", "Archivar"], ["CONSERVAR", "Conservar"]];
const lblDe = (arr: string[][], v: string) => arr.find(([x]) => x === v)?.[1] || v;

export default function RegistrosCalidadPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [fSoporte, setFSoporte] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getRegistrosCalidad({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const eliminar = async (e: any, r: any) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el registro "${r.nombre}"?`)) return;
    try { await api.eliminarRegistroCalidad(r.id); load(); } catch (err) { alert((err as Error).message); }
  };

  const stats = useMemo(() => ({
    total: items.length,
    digital: items.filter((x) => x.soporte === "DIGITAL").length,
    fisico: items.filter((x) => x.soporte === "FISICO").length,
    ambos: items.filter((x) => x.soporte === "AMBOS").length,
  }), [items]);

  const visibles = items.filter((x) => fSoporte === "TODOS" || x.soporte === fSoporte);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #06B6D4 0, transparent 40%), radial-gradient(circle at 90% 80%, #3B82F6 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600"><Archive className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Lista Maestra de Registros</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600">ISO 7.5.3</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Control de registros: soporte, ubicación, tiempo de retención y disposición.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nuevo registro</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI color="#06B6D4" label="Total" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI color="#3B82F6" label="Digital" value={stats.digital} isDark={isDarkMode} theme={theme} />
        <KPI color="#8B5CF6" label="Físico" value={stats.fisico} isDark={isDarkMode} theme={theme} />
        <KPI color="#10B981" label="Ambos" value={stats.ambos} isDark={isDarkMode} theme={theme} />
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {[["TODOS", "Todos"], ...SOPORTES].map(([v, l]) => <button key={v} onClick={() => setFSoporte(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${fSoporte === v ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>)}
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><Archive className="w-10 h-10 mx-auto mb-3 text-cyan-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin registros</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Documenta los registros que evidencian tu SGC (7.5.3).</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600"><Plus className="w-4 h-4" /> Crear primero</button></div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                  {["Código", "Nombre", "Proceso", "Soporte", "Ubicación", "Retención", "Disposición", "Responsable", ""].map((h) => <th key={h} className={`px-3 py-2.5 text-[11px] uppercase tracking-wider font-black ${theme.textTertiary}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.id} onClick={() => setEdit(r)} className={`cursor-pointer border-t ${isDarkMode ? "border-white/[0.05] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className={`px-3 py-2.5 font-mono text-xs font-bold ${theme.textPrimary}`}>{r.codigo}</td>
                    <td className={`px-3 py-2.5 font-semibold ${theme.textPrimary}`}>{r.nombre}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{r.proceso || "—"}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${isDarkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{r.soporte_display || lblDe(SOPORTES, r.soporte)}</span></td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{r.ubicacion || "—"}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{r.retencion_meses != null ? `${r.retencion_meses} meses` : "—"}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{r.disposicion_display || lblDe(DISPOSICIONES, r.disposicion)}</td>
                    <td className={`px-3 py-2.5 ${theme.textSecondary}`}>{r.responsable_nombre || "—"}</td>
                    <td className="px-3 py-2.5"><button onClick={(e) => eliminar(e, r)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {edit && <RegistroModal reg={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function KPI({ color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Archive className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

function RegistroModal({ reg, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    codigo: "", nombre: "", proceso: "", soporte: "DIGITAL", ubicacion: "",
    retencion_meses: 36, disposicion: "ARCHIVAR", responsable_user: null, ...reg,
  });
  const [busy, setBusy] = useState(false);
  const id = reg.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.nombre?.trim()) { alert("Indica el nombre del registro."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, codigo: f.codigo || "", nombre: f.nombre, proceso: f.proceso || "",
      soporte: f.soporte, ubicacion: f.ubicacion || "", retencion_meses: Number(f.retencion_meses) || 0,
      disposicion: f.disposicion, responsable_user: f.responsable_user || null,
    };
    try {
      if (id) { await api.actualizarRegistroCalidad(id, payload); onSaved(); }
      else { const saved = await api.crearRegistroCalidad(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); onSaved(); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Archive className="w-4 h-4" /> {id ? `Registro ${f.codigo || ""}` : "Nuevo registro de calidad"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Código</label><input className={inp} value={f.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="REG-01" /></div>
            <div className="col-span-2"><label className={lbl}>Nombre *</label><input className={inp} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre del registro" /></div>
          </div>
          <div><label className={lbl}>Proceso</label><input className={inp} value={f.proceso} onChange={(e) => set("proceso", e.target.value)} placeholder="Proceso al que pertenece" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Soporte</label><select className={inp} value={f.soporte} onChange={(e) => set("soporte", e.target.value)}>{SOPORTES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className={lbl}>Retención (meses)</label><input type="number" className={inp} value={f.retencion_meses} onChange={(e) => set("retencion_meses", e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Ubicación</label><input className={inp} value={f.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Carpeta, servidor o archivo físico" /></div>
          <div><label className={lbl}>Disposición</label><select className={inp} value={f.disposicion} onChange={(e) => set("disposicion", e.target.value)}>{DISPOSICIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <SelectorUsuario value={f.responsable_user} onChange={(uid: any) => set("responsable_user", uid)} label="Responsable" />
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-cyan-500 to-blue-600">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
