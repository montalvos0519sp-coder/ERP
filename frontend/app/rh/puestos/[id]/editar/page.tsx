"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Briefcase, ArrowLeft, Save, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

export default function EditarPuestoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const G = "linear-gradient(135deg,#4f46e5,#7c3aed)";
  const GLOW = "rgba(124,58,237,.25)";
  const card = `bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/50 rounded-2xl shadow-sm`;
  const inp = `w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-colors`;

  useEffect(() => {
    api.getPuesto(Number(id))
      .then((p: { nombre: string; descripcion?: string; salario_base?: number }) => {
        setNombre(p.nombre);
        setDescripcion(p.descripcion ?? "");
        setSalarioBase(p.salario_base != null ? String(p.salario_base) : "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true); setError("");
    try {
      await api.actualizarPuesto(Number(id), { nombre: nombre.trim(), descripcion: descripcion.trim(), salario_base: salarioBase || null });
      router.push("/rh/puestos");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/rh/puestos"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: G }}>
              <Briefcase size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 dark:text-white">Editar Puesto</h1>
              <p className="text-xs text-slate-400">Modifica los datos del puesto</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={card + " p-10 text-center text-sm text-slate-400 animate-pulse"}>Cargando…</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={card + " p-6 space-y-5"}>
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Descripción</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  rows={3} className={inp + " resize-none"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Salario Base</label>
                <input type="number" min="0" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} className={inp} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Link href="/rh/puestos"
                  className="flex-1 text-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancelar
                </Link>
                <button type="submit" disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: G, boxShadow: `0 4px 14px ${GLOW}` }}>
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Guardando…" : "Actualizar"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
