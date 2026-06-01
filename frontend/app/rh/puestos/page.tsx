"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Puesto { id: number; nombre: string; descripcion?: string; salario_base?: number; }

export default function PuestosPage() {
  const { isDarkMode } = useTheme();
  const [items, setItems] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.getRHPuestos();
      setItems(Array.isArray(res) ? res : res.results ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error al cargar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el puesto "${nombre}"?`)) return;
    setDeleting(id);
    try {
      await api.eliminarPuesto(id);
      setItems(prev => prev.filter(p => p.id !== id));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
    finally { setDeleting(null); }
  };

  const G = "linear-gradient(135deg,#4f46e5,#7c3aed)";
  const card = `bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/50 rounded-2xl shadow-sm`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: G }}>
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white">Puestos</h1>
              <p className="text-xs text-slate-400">{items.length} registrados</p>
            </div>
          </div>
          <Link href="/rh/puestos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white shadow-lg"
            style={{ background: G }}>
            <Plus size={15} /> Nuevo Puesto
          </Link>
        </div>

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
              <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">No hay puestos. <Link href="/rh/puestos/nuevo" className="text-violet-500 font-bold">Crear uno</Link></p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {["Nombre","Descripción","Salario Base","Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-50 dark:border-slate-800/60 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/20"}`}>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{p.descripcion || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {p.salario_base != null ? `$${Number(p.salario_base).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/rh/puestos/${p.id}/editar`}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 hover:bg-amber-100 transition-colors">
                          <Edit size={13} />
                        </Link>
                        <button onClick={() => handleDelete(p.id, p.nombre)} disabled={deleting === p.id}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                          {deleting === p.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
