"use client";

// SGC · Programa Anual de Auditorías (ISO 9001 · 9.2).
// Planificación del programa de auditorías internas por año.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarRange, Plus, RefreshCw, X, CheckCircle2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario } from "@/components/sgc/Colaboracion";

export default function ProgramaAuditoriasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getProgramasAuditoria({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #10B981 0, transparent 40%), radial-gradient(circle at 90% 80%, #14B8A6 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600"><CalendarRange className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Programa de Auditorías</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-emerald-500 to-teal-600">ISO 9.2</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Planifica el programa anual de auditorías internas: objetivo, alcance y criterios.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nuevo programa</button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><CalendarRange className="w-10 h-10 mx-auto mb-3 text-emerald-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin programas de auditoría</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Crea el programa anual de auditorías internas (9.2).</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600"><Plus className="w-4 h-4" /> Crear primero</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((p) => (
            <button key={p.id} onClick={() => setEdit(p)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black ${theme.textPrimary}`}>{p.anio}</span>
                  <span className={`text-sm font-bold ${theme.textSecondary}`}>{p.nombre}</span>
                </div>
                {p.aprobado
                  ? <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shrink-0">Aprobado</span>
                  : <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">Borrador</span>}
              </div>
              {p.objetivo && <p className={`text-sm mt-1.5 line-clamp-2 ${theme.textSecondary}`}>{p.objetivo}</p>}
              <div className={`text-[11px] mt-2 ${theme.textTertiary}`}>Alcance: <span className={theme.textSecondary}>{p.alcance || "—"}</span></div>
              <div className={`text-[11px] mt-0.5 ${theme.textTertiary}`}>Criterios: <span className={theme.textSecondary}>{p.criterios || "—"}</span></div>
              {p.responsable_nombre && <div className={`text-[11px] mt-0.5 ${theme.textTertiary}`}>Responsable: <span className={theme.textSecondary}>{p.responsable_nombre}</span></div>}
            </button>
          ))}
        </div>
      )}
      {edit && <ProgramaModal prog={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function ProgramaModal({ prog, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    anio: new Date().getFullYear(), nombre: "", objetivo: "", alcance: "",
    criterios: "ISO 9001:2015", aprobado: false, responsable_user: null, ...prog,
  });
  const [busy, setBusy] = useState(false);
  const id = prog.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.nombre?.trim()) { alert("Indica el nombre del programa."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, anio: Number(f.anio) || new Date().getFullYear(), nombre: f.nombre,
      objetivo: f.objetivo || "", alcance: f.alcance || "", criterios: f.criterios || "",
      aprobado: !!f.aprobado, responsable_user: f.responsable_user || null,
    };
    try {
      if (id) { await api.actualizarProgramaAuditoria(id, payload); onSaved(); }
      else { const saved = await api.crearProgramaAuditoria(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); onSaved(); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><CalendarRange className="w-4 h-4" /> {id ? `Programa ${f.anio}` : "Nuevo programa de auditorías"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Año</label><input type="number" className={inp} value={f.anio} onChange={(e) => set("anio", e.target.value)} /></div>
            <div className="col-span-2"><label className={lbl}>Nombre *</label><input className={inp} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Programa anual de auditorías" /></div>
          </div>
          <div><label className={lbl}>Objetivo</label><textarea rows={2} className={inp} value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Propósito del programa de auditorías." /></div>
          <div><label className={lbl}>Alcance</label><textarea rows={2} className={inp} value={f.alcance} onChange={(e) => set("alcance", e.target.value)} placeholder="Procesos, áreas o sedes a auditar." /></div>
          <div><label className={lbl}>Criterios</label><input className={inp} value={f.criterios} onChange={(e) => set("criterios", e.target.value)} /></div>
          <SelectorUsuario value={f.responsable_user} onChange={(uid: any) => set("responsable_user", uid)} label="Responsable" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!f.aprobado} onChange={(e) => set("aprobado", e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            <span className={`text-sm font-bold ${theme.textSecondary}`}>Programa aprobado</span>
          </label>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-teal-600">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
