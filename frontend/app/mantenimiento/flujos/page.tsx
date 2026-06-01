"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardCheck, ClipboardList, FileStack, Pencil, Plus, Trash2, Users, Workflow,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Flujo {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creado_por: number | null;
  creado_por_username: string;
  num_campos: number;
  num_respuestas: number;
  tecnicos_detalle: { id: number; username: string; nombre: string }[];
  actualizado: string;
}

export default function FlujosListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode: isDark, theme } = useTheme();
  const { user } = useUser();
  const [tab, setTab] = useState<"constructor" | "llenar">(
    searchParams?.get("tab") === "llenar" ? "llenar" : "constructor",
  );
  const [flujos, setFlujos] = useState<Flujo[]>([]);
  const [mis, setMis] = useState<Flujo[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.getFlujosMantto(), api.misFlujosMantto()]);
      setFlujos(a.results || []);
      setMis(b.results || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este flujo y sus respuestas? No se puede deshacer.")) return;
    try {
      await api.eliminarFlujoMantto(id);
      setFlujos((p) => p.filter((x) => x.id !== id));
    } catch (e) { alert((e as Error).message); }
  };

  const puedeGestionar = (f: Flujo) => user?.is_superuser || f.creado_por === user?.id;
  const lista = tab === "constructor" ? flujos : mis;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>Flujos / Checklists</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Crea checklists configurables y asígnalos a técnicos.</p>
          </div>
        </div>
        {tab === "constructor" && (
          <button onClick={() => router.push("/mantenimiento/flujos/nuevo")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
            <Plus className="w-4 h-4" /> Nuevo flujo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "constructor", label: "Constructor", icon: ClipboardList, count: flujos.length },
          { id: "llenar", label: "Para llenar", icon: ClipboardCheck, count: mis.length },
        ] as const).map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                active ? "text-white shadow-md bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] border-transparent"
                       : isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-300" : "bg-white border-slate-200 text-slate-600"
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? "bg-white/25" : isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className={`text-center py-16 ${theme.textTertiary}`}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div className={`text-center py-16 px-6 rounded-3xl border-2 border-dashed ${
          isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/40"
        }`}>
          <Workflow className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-indigo-500/40" : "text-indigo-400"}`} />
          <p className={`text-sm ${theme.textSecondary}`}>
            {tab === "constructor"
              ? 'Aún no hay flujos. Crea el primero con "Nuevo flujo".'
              : "No tienes flujos asignados para llenar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lista.map((f) => (
            <div key={f.id}
              className={`rounded-3xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={`text-base font-black truncate ${theme.textPrimary}`}>{f.nombre}</h3>
                  {f.descripcion && <p className={`text-xs mt-0.5 line-clamp-2 ${theme.textSecondary}`}>{f.descripcion}</p>}
                </div>
                {!f.activo && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">Inactivo</span>
                )}
              </div>

              <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold ${theme.textTertiary}`}>
                <span className="inline-flex items-center gap-1"><FileStack className="w-3 h-3" /> {f.num_campos} campos</span>
                <span className="inline-flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> {f.num_respuestas} respuestas</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {f.tecnicos_detalle.length} técnicos</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {tab === "llenar" ? (
                  <button onClick={() => router.push(`/mantenimiento/llenar/${f.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700">
                    <ClipboardCheck className="w-4 h-4" /> Llenar
                  </button>
                ) : (
                  <>
                    <button onClick={() => router.push(`/mantenimiento/llenar/${f.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700">
                      <ClipboardCheck className="w-4 h-4" /> Llenar
                    </button>
                    <button onClick={() => router.push(`/mantenimiento/flujos/${f.id}/respuestas`)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
                        isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"
                      }`}>
                      <FileStack className="w-4 h-4" /> Respuestas
                    </button>
                    {puedeGestionar(f) && (
                      <>
                        <button onClick={() => router.push(`/mantenimiento/flujos/${f.id}`)}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
                            isDark ? "bg-white/[0.04] border-white/[0.06] text-indigo-300" : "bg-white border-slate-200 text-indigo-600"
                          }`} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminar(f.id)}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
                            isDark ? "bg-white/[0.04] border-white/[0.06] text-rose-400" : "bg-white border-slate-200 text-rose-500"
                          }`} title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
