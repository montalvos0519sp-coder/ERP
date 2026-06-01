"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Plus, Save, Trash2, Users } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Etapa {
  nombre: string;
  checklist: number | null;
  tecnicos_ids: number[];
}
interface UsuarioMini { id: number; username: string; first_name: string }
interface ChecklistMini { id: number; nombre: string }

const etapaVacia = (): Etapa => ({ nombre: "", checklist: null, tecnicos_ids: [] });

export default function ProcesoBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const esNuevo = id === "nuevo";
  const { isDarkMode: isDark, theme } = useTheme();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklists, setChecklists] = useState<ChecklistMini[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioMini[]>([]);
  const [loading, setLoading] = useState(!esNuevo);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (esNuevo) { setEtapas([etapaVacia()]); return; }
    setLoading(true);
    try {
      const p = await api.getProceso(id);
      setNombre(p.nombre); setDescripcion(p.descripcion || ""); setActivo(p.activo);
      setEtapas((p.etapas || []).map((e: any) => ({
        nombre: e.nombre || "", checklist: e.checklist,
        tecnicos_ids: (e.tecnicos_detalle || []).map((t: any) => t.id),
      })));
    } finally { setLoading(false); }
  }, [esNuevo, id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    api.getFlujosMantto().then((r) => setChecklists((r.results || []).map((f: any) => ({ id: f.id, nombre: f.nombre })))).catch(() => {});
    api.getUsuarios().then((r) => setUsuarios(r.results || [])).catch(() => {});
  }, []);

  const setEtapa = (i: number, patch: Partial<Etapa>) => setEtapas((es) => es.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const addEtapa = () => setEtapas((es) => [...es, etapaVacia()]);
  const delEtapa = (i: number) => setEtapas((es) => es.filter((_, idx) => idx !== i));
  const mover = (i: number, dir: -1 | 1) => setEtapas((es) => {
    const j = i + dir; if (j < 0 || j >= es.length) return es;
    const n = [...es]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const toggleTec = (i: number, uid: number) => setEtapa(i, {
    tecnicos_ids: etapas[i].tecnicos_ids.includes(uid)
      ? etapas[i].tecnicos_ids.filter((x) => x !== uid)
      : [...etapas[i].tecnicos_ids, uid],
  });

  const guardar = async () => {
    if (!nombre.trim()) { alert("Ponle un nombre al flujo."); return; }
    if (etapas.length === 0 || etapas.some((e) => !e.checklist)) { alert("Cada etapa debe tener un checklist."); return; }
    setSaving(true);
    const payload = {
      nombre: nombre.trim(), descripcion: descripcion.trim(), activo,
      etapas: etapas.map((e, i) => ({ orden: i, nombre: e.nombre.trim(), checklist: e.checklist, tecnicos_ids: e.tecnicos_ids })),
    };
    try {
      if (esNuevo) await api.crearProceso(payload);
      else await api.actualizarProceso(id, payload);
      router.push("/mantenimiento/procesos");
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? "bg-[#1E293B]/50 border-white/[0.06] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`;

  if (loading) return <div className={`p-10 text-center ${theme.textTertiary}`}>Cargando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push("/mantenimiento/procesos")} className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <h1 className={`text-xl font-black tracking-tight truncate ${theme.textPrimary}`}>{esNuevo ? "Nuevo flujo" : "Editar flujo"}</h1>
        </div>
        <button onClick={guardar} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-50" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
          <Save className="w-4 h-4" /> {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
        <div>
          <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Nombre del flujo *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej. Recepción → Revisión → Aprobación" />
        </div>
        <div>
          <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
          <span className={`text-sm ${theme.textSecondary}`}>Activo</span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Etapas (en orden)</h2>
          <button onClick={addEtapa} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${isDark ? "bg-white/[0.04] border-white/[0.06] text-indigo-300" : "bg-white border-slate-200 text-indigo-600"}`}>
            <Plus className="w-4 h-4" /> Agregar etapa
          </button>
        </div>

        {etapas.map((e, i) => (
          <div key={i} className={`rounded-2xl border p-4 space-y-3 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white font-black text-sm" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>{i + 1}</span>
              <span className={`text-xs font-bold ${theme.textTertiary}`}>Etapa {i + 1}</span>
              <div className="flex-1" />
              <button onClick={() => mover(i, -1)} disabled={i === 0} className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 ${isDark ? "hover:bg-white/[0.06] text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => mover(i, 1)} disabled={i === etapas.length - 1} className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 ${isDark ? "hover:bg-white/[0.06] text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => delEtapa(i)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"}`}><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Checklist a llenar *</label>
                <select value={e.checklist ?? ""} onChange={(ev) => setEtapa(i, { checklist: ev.target.value ? Number(ev.target.value) : null })} className={inputCls}>
                  <option value="">— Selecciona checklist —</option>
                  {checklists.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Nombre de la etapa (opcional)</label>
                <input value={e.nombre} onChange={(ev) => setEtapa(i, { nombre: ev.target.value })} className={inputCls} placeholder="Ej. Recepción" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>Quién llena esta etapa</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">{e.tecnicos_ids.length}</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {usuarios.map((u) => {
                  const sel = e.tecnicos_ids.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleTec(i, u.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${sel ? "bg-emerald-600 border-transparent text-white" : isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
                      {sel && <Check className="w-3 h-3" />}{u.username}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
