"use client";

// Pilar 3 · CAPA avanzado: plan de acción con varias acciones (cada una con
// responsable, fecha y verificación de eficacia), evidencias adjuntas y flujo
// de aprobación (aprobar plan / verificar eficacia). Se monta dentro del modal
// de una No Conformidad existente.

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Paperclip, Upload, CheckCircle2, ShieldCheck, FileText, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { Avatar, SelectorUsuario } from "@/components/sgc/Colaboracion";

const EST_ACCION = [["PENDIENTE", "Pendiente"], ["EN_PROCESO", "En proceso"], ["HECHA", "Realizada"], ["VERIFICADA", "Verificada"]];
const EST_COLOR: Record<string, string> = {
  PENDIENTE: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  EN_PROCESO: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  HECHA: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  VERIFICADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
const EFI_COLOR: Record<string, string> = {
  EFICAZ: "text-emerald-500", NO_EFICAZ: "text-rose-500", PENDIENTE: "text-slate-400",
};

export function PanelCAPA({ nc, isDark, theme, onChanged }: { nc: any; isDark: boolean; theme: any; onChanged?: () => void }) {
  const [acciones, setAcciones] = useState<any[]>([]);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [nuevaAccion, setNuevaAccion] = useState<any | null>(null);
  const [data, setData] = useState<any>(nc);
  const [busy, setBusy] = useState(false);

  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const load = useCallback(() => {
    if (!nc?.id) return;
    api.getAccionesCAPA(nc.id).then((r) => setAcciones(r.results || [])).catch(() => {});
    api.getEvidenciasSGC("no_conformidad", nc.id).then((r) => setEvidencias(r.results || [])).catch(() => {});
  }, [nc?.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setData(nc); }, [nc]);

  const addAccion = async () => {
    if (!nuevaAccion?.descripcion?.trim()) { alert("Describe la acción."); return; }
    setBusy(true);
    try {
      await api.crearAccionCAPA({ no_conformidad: nc.id, descripcion: nuevaAccion.descripcion, tipo: nuevaAccion.tipo || "CORRECTIVA", responsable_user: nuevaAccion.responsable_user || null, fecha_compromiso: nuevaAccion.fecha_compromiso || null, estado: "PENDIENTE" });
      setNuevaAccion(null); load(); onChanged?.();
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const updAccion = async (a: any, patch: any) => {
    try { await api.actualizarAccionCAPA(a.id, patch); load(); onChanged?.(); } catch (e) { alert((e as Error).message); }
  };
  const delAccion = async (a: any) => { if (!confirm("¿Eliminar acción?")) return; try { await api.eliminarAccionCAPA(a.id); load(); } catch (e) { alert((e as Error).message); } };

  const subir = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { await api.subirEvidenciaSGC("no_conformidad", nc.id, file); load(); } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const delEvidencia = async (id: number) => { if (!confirm("¿Eliminar evidencia?")) return; try { await api.eliminarEvidenciaSGC(id); load(); } catch { /* */ } };

  const aprobar = async () => { try { const r = await api.aprobarNC(nc.id); setData(r); onChanged?.(); } catch (e) { alert((e as Error).message); } };
  const verificar = async (eficaz: boolean) => { try { const r = await api.verificarEficaciaNC(nc.id, eficaz); setData(r); onChanged?.(); } catch (e) { alert((e as Error).message); } };

  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;

  return (
    <div className="space-y-3">
      {/* Flujo de aprobación */}
      <div className={`${sec} flex flex-wrap items-center gap-2`}>
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span className={theme.textSecondary}>Plan: </span>
          {data.aprobada_por_nombre
            ? <span className="font-bold text-emerald-500">Aprobado por {data.aprobada_por_nombre}{data.fecha_aprobacion ? ` (${data.fecha_aprobacion})` : ""}</span>
            : <span className={theme.textTertiary}>Sin aprobar</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={theme.textSecondary}>· Eficacia: </span>
          {data.verificada_por_nombre
            ? <span className={`font-bold ${data.eficacia_verificada ? "text-emerald-500" : "text-rose-500"}`}>{data.eficacia_verificada ? "Eficaz" : "No eficaz"} · {data.verificada_por_nombre}</span>
            : <span className={theme.textTertiary}>Sin verificar</span>}
        </div>
        <div className="ml-auto flex gap-2">
          {!data.aprobada_por && <button onClick={aprobar} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobar plan</button>}
          {data.aprobada_por && !data.verificada_por && (
            <>
              <button onClick={() => verificar(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600">Eficaz ✓</button>
              <button onClick={() => verificar(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600">No eficaz</button>
            </>
          )}
        </div>
      </div>

      {/* Acciones del plan */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Plan de acción ({acciones.length})</span>
          <button onClick={() => setNuevaAccion({ tipo: "CORRECTIVA" })} className="text-xs font-bold text-rose-500 hover:text-rose-400 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Acción</button>
        </div>
        <div className="space-y-2">
          {acciones.length === 0 && !nuevaAccion && <p className={`text-xs ${theme.textTertiary}`}>Sin acciones. Divide la solución en acciones concretas con responsable y fecha.</p>}
          {acciones.map((a) => (
            <div key={a.id} className={`rounded-lg border p-2.5 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${theme.textPrimary}`}>{a.descripcion}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold border ${EST_COLOR[a.estado]}`}>{a.estado_display}</span>
                    <span className={theme.textTertiary}>{a.tipo_display}</span>
                    {a.responsable_nombre && <span className="inline-flex items-center gap-1"><Avatar nombre={a.responsable_nombre} id={a.responsable_user} size={16} /><span className={theme.textTertiary}>{a.responsable_nombre}</span></span>}
                    {a.fecha_compromiso && <span className={theme.textTertiary}>{a.fecha_compromiso}</span>}
                    <span className={`font-bold ${EFI_COLOR[a.eficacia]}`}>Eficacia: {a.eficacia === "PENDIENTE" ? "—" : a.eficacia}</span>
                  </div>
                </div>
                <button onClick={() => delAccion(a)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex gap-2 mt-2">
                <select value={a.estado} onChange={(e) => updAccion(a, { estado: e.target.value, ...(e.target.value === "HECHA" && !a.fecha_real ? { fecha_real: new Date().toISOString().slice(0, 10) } : {}) })} className={`text-xs px-2 py-1 rounded border ${isDark ? "bg-[#1E293B]/60 border-white/10 text-slate-200" : "bg-white border-slate-200"}`}>
                  {EST_ACCION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={a.eficacia} onChange={(e) => updAccion(a, { eficacia: e.target.value })} className={`text-xs px-2 py-1 rounded border ${isDark ? "bg-[#1E293B]/60 border-white/10 text-slate-200" : "bg-white border-slate-200"}`}>
                  <option value="PENDIENTE">Eficacia: por evaluar</option>
                  <option value="EFICAZ">Eficaz</option>
                  <option value="NO_EFICAZ">No eficaz</option>
                </select>
              </div>
            </div>
          ))}
          {nuevaAccion && (
            <div className={`rounded-lg border p-2.5 space-y-2 ${isDark ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-rose-200 bg-rose-50/40"}`}>
              <textarea rows={2} className={inp} placeholder="Descripción de la acción" value={nuevaAccion.descripcion || ""} onChange={(e) => setNuevaAccion((p: any) => ({ ...p, descripcion: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <div><label className={lbl}>Tipo</label><select className={inp} value={nuevaAccion.tipo} onChange={(e) => setNuevaAccion((p: any) => ({ ...p, tipo: e.target.value }))}><option value="INMEDIATA">Inmediata</option><option value="CORRECTIVA">Correctiva</option><option value="PREVENTIVA">Preventiva</option></select></div>
                <SelectorUsuario label="Responsable" value={nuevaAccion.responsable_user} onChange={(id) => setNuevaAccion((p: any) => ({ ...p, responsable_user: id }))} />
                <div><label className={lbl}>Compromiso</label><input type="date" className={inp} value={nuevaAccion.fecha_compromiso || ""} onChange={(e) => setNuevaAccion((p: any) => ({ ...p, fecha_compromiso: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setNuevaAccion(null)} className={`text-xs font-bold px-3 py-1.5 ${theme.textSecondary}`}>Cancelar</button>
                <button onClick={addAccion} disabled={busy} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-rose-500 to-red-600">Agregar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidencias */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}><Paperclip className="w-3.5 h-3.5 inline" /> Evidencias ({evidencias.length})</span>
          <label className="text-xs font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Subir archivo
            <input type="file" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
          </label>
        </div>
        <div className="space-y-1.5">
          {evidencias.length === 0 && <p className={`text-xs ${theme.textTertiary}`}>Sin evidencias adjuntas.</p>}
          {evidencias.map((ev) => (
            <div key={ev.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <a href={ev.archivo_url} target="_blank" rel="noreferrer" className={`text-sm truncate hover:underline ${theme.textPrimary}`}>{ev.nombre}</a>
              <span className={`text-[10px] ml-auto ${theme.textTertiary}`}>{ev.subido_por_nombre}</span>
              <button onClick={() => delEvidencia(ev.id)} className="text-slate-500 hover:text-rose-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
