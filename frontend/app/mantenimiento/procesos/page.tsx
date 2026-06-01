"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GitBranch, Layers, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Proceso {
  id: number; nombre: string; descripcion: string; activo: boolean;
  creado_por: number | null; num_etapas: number; num_ejecuciones: number;
  etapas: { id: number; orden: number; nombre: string; checklist_nombre: string; tecnicos_detalle: any[] }[];
}

const ESTADO_COLOR: Record<string, string> = {
  EN_CURSO: "#F59E0B", COMPLETADO: "#10B981", CANCELADO: "#94A3B8",
};

export default function ProcesosPage() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const { user } = useUser();
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [ejecuciones, setEjecuciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([api.getProcesos(), api.getEjecuciones()]);
      setProcesos(p.results || []);
      setEjecuciones(e.results || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const iniciar = async (p: Proceso) => {
    const etiqueta = prompt(`Iniciar "${p.nombre}".\nReferencia de la corrida (opcional, ej. unidad o folio):`, "") ?? "";
    try { await api.iniciarProceso(p.id, etiqueta); await cargar(); alert("Flujo iniciado. La primera etapa ya está activa para sus responsables."); }
    catch (e) { alert((e as Error).message); }
  };
  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este flujo y sus ejecuciones?")) return;
    try { await api.eliminarProceso(id); setProcesos((p) => p.filter((x) => x.id !== id)); }
    catch (e) { alert((e as Error).message); }
  };
  const puedeGestionar = (p: Proceso) => user?.is_superuser || p.creado_por === user?.id;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/mantenimiento")} className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>Flujos (procesos)</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Secuencias de checklists que se habilitan por etapas.</p>
          </div>
        </div>
        <button onClick={() => router.push("/mantenimiento/procesos/nuevo")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
          style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
          <Plus className="w-4 h-4" /> Nuevo flujo
        </button>
      </div>

      {loading ? (
        <div className={`text-center py-16 ${theme.textTertiary}`}>Cargando…</div>
      ) : (
        <>
          {/* Procesos */}
          <div className="space-y-3">
            {procesos.length === 0 && (
              <div className={`text-center py-12 rounded-3xl border-2 border-dashed ${isDark ? "border-white/[0.06] text-slate-400" : "border-slate-200 text-slate-500"}`}>
                <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aún no hay flujos. Crea el primero.</p>
              </div>
            )}
            {procesos.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className={`text-base font-black ${theme.textPrimary}`}>{p.nombre}</h3>
                    {p.descripcion && <p className={`text-xs ${theme.textSecondary}`}>{p.descripcion}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => iniciar(p)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"><Play className="w-3.5 h-3.5" /> Iniciar</button>
                    {puedeGestionar(p) && <>
                      <button onClick={() => router.push(`/mantenimiento/procesos/${p.id}`)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06] text-indigo-300" : "hover:bg-slate-100 text-indigo-600"}`}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => eliminar(p.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"}`}><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                </div>
                {/* Etapas */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.etapas.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${isDark ? "bg-white/[0.05] text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {i + 1}. {e.nombre || e.checklist_nombre}
                        <span className={`ml-1 ${theme.textTertiary}`}>({e.tecnicos_detalle.length}👤)</span>
                      </span>
                      {i < p.etapas.length - 1 && <span className={theme.textTertiary}>→</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ejecuciones */}
          {ejecuciones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Ejecuciones</h2>
              </div>
              {ejecuciones.map((ej) => (
                <div key={ej.id} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className={`text-sm font-black ${theme.textPrimary}`}>{ej.proceso_nombre}{ej.etiqueta ? ` · ${ej.etiqueta}` : ""}</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white" style={{ background: ESTADO_COLOR[ej.estado] || "#94A3B8" }}>{ej.estado}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ej.etapas.map((e: any, i: number) => {
                      const c = e.estado === "COMPLETADA" ? "#10B981" : e.estado === "ACTIVA" ? "#F59E0B" : "#94A3B8";
                      return (
                        <div key={e.id} className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg text-white" style={{ background: c }}>
                            {e.nombre} · {e.estado === "COMPLETADA" ? "✓" : e.estado === "ACTIVA" ? "⏳" : "•"}
                          </span>
                          {i < ej.etapas.length - 1 && <span className={theme.textTertiary}>→</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
