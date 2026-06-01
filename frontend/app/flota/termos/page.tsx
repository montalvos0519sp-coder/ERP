"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Snowflake, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Termo {
  id: number; numero: string; marca: string; modelo: string; serie: string;
  horas_actual: string | number; activo: boolean; notas: string;
}

const vacio = { numero: "", marca: "", modelo: "", serie: "", horas_actual: "0", activo: true, notas: "" };

export default function TermosPage() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<Termo[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null); // null = cerrado

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setItems((await api.getTermos()).results || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!edit.numero?.trim()) { alert("El número económico es obligatorio."); return; }
    const payload = { ...edit, empresa: edit.empresa ?? empresaActivaId, horas_actual: Number(edit.horas_actual || 0) };
    try {
      if (edit.id) await api.actualizarTermo(edit.id, payload);
      else await api.crearTermo(payload);
      setEdit(null); cargar();
    } catch (e) { alert((e as Error).message); }
  };
  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este termo?")) return;
    try { await api.eliminarTermo(id); setItems((p) => p.filter((x) => x.id !== id)); }
    catch (e) { alert((e as Error).message); }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm outline-none ${
    isDark ? "bg-[#1E293B]/50 border-white/[0.06] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
  }`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/flota")} className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#0EA5E9,#06B6D4)" }}>
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>Termos</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Equipos de refrigeración (fijos o separados).</p>
          </div>
        </div>
        <button onClick={() => setEdit({ ...vacio })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#06B6D4)" }}>
          <Plus className="w-4 h-4" /> Nuevo termo
        </button>
      </div>

      {loading ? (
        <div className={`text-center py-16 ${theme.textTertiary}`}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDark ? "border-white/[0.06] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <Snowflake className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sin termos. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((t) => (
            <div key={t.id} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={`text-base font-black ${theme.textPrimary}`}>{t.numero} {!t.activo && <span className="text-[10px] text-slate-400">(inactivo)</span>}</h3>
                  <p className={`text-xs ${theme.textSecondary}`}>{[t.marca, t.modelo, t.serie].filter(Boolean).join(" · ") || "—"}</p>
                  <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Horómetro: {Number(t.horas_actual || 0)} h</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEdit({ ...t, horas_actual: String(t.horas_actual) })} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06] text-sky-300" : "hover:bg-slate-100 text-sky-600"}`}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => eliminar(t.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEdit(null)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border p-6 space-y-3 ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`}>
            <h2 className={`text-lg font-black ${theme.textPrimary}`}>{edit.id ? "Editar termo" : "Nuevo termo"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Número económico *</label>
                <input value={edit.numero} onChange={(e) => setEdit({ ...edit, numero: e.target.value })} className={inputCls} />
              </div>
              <div><label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Marca</label><input value={edit.marca} onChange={(e) => setEdit({ ...edit, marca: e.target.value })} className={inputCls} /></div>
              <div><label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Modelo</label><input value={edit.modelo} onChange={(e) => setEdit({ ...edit, modelo: e.target.value })} className={inputCls} /></div>
              <div><label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Serie</label><input value={edit.serie} onChange={(e) => setEdit({ ...edit, serie: e.target.value })} className={inputCls} /></div>
              <div><label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Horómetro (h)</label><input type="number" value={edit.horas_actual} onChange={(e) => setEdit({ ...edit, horas_actual: e.target.value })} className={inputCls} /></div>
              <label className="col-span-2 inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={edit.activo} onChange={(e) => setEdit({ ...edit, activo: e.target.checked })} className="accent-sky-600 w-4 h-4" />
                <span className={`text-sm ${theme.textSecondary}`}>Activo</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEdit(null)} className={`px-4 py-2 rounded-xl text-sm font-bold border ${isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#0EA5E9,#06B6D4)" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
