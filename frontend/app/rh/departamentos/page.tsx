"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Edit, Trash2, RefreshCw, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Departamento { id: number; nombre: string; descripcion?: string; total_empleados?: number; }

export default function DepartamentosPage() {
  const { isDarkMode } = useTheme();
  const [items, setItems] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.getRHDepartamentos();
      setItems(Array.isArray(res) ? res : res.results ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error al cargar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el departamento "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    try {
      await api.eliminarDepartamento(id);
      setItems(prev => prev.filter(d => d.id !== id));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
    finally { setDeleting(null); }
  };

  const G = "linear-gradient(135deg,#4f46e5,#7c3aed)";
  const card = `bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/50 rounded-2xl shadow-sm`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: G }}>
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white">Departamentos</h1>
              <p className="text-xs text-slate-400">{items.length} registrados</p>
            </div>
          </div>
          <Link href="/rh/departamentos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white shadow-lg"
            style={{ background: G }}>
            <Plus size={15} /> Nuevo Departamento
          </Link>
        </div>

        {/* Content */}
        <div className={card}>
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400 animate-pulse">Cargando…</div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl">
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">No hay departamentos. <Link href="/rh/departamentos/nuevo" className="text-violet-500 font-bold">Crear uno</Link></p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {["Nombre","Descripción","Empleados","Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr key={d.id} className={`border-b border-slate-50 dark:border-slate-800/60 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/20"}`}>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{d.nombre}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{d.descripcion || "—"}</td>
                    <td className="px-4 py-3">
                      {d.total_empleados != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                          <Users size={12} /> {d.total_empleados}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/rh/departamentos/${d.id}/editar`}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 hover:bg-amber-100 transition-colors">
                          <Edit size={13} />
                        </Link>
                        <button onClick={() => handleDelete(d.id, d.nombre)} disabled={deleting === d.id}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                          {deleting === d.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
