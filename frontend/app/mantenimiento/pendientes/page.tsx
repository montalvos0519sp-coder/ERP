"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardCheck, Inbox } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Etapa {
  id: number; ejecucion: number; proceso_nombre: string; etiqueta: string;
  orden: number; nombre: string; checklist: number; checklist_nombre: string;
}

export default function MisPendientesPage() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const [items, setItems] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setItems((await api.misEtapasProceso()).results || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/mantenimiento")} className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
          <Inbox className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>Mis pendientes</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Etapas de flujo que te toca llenar ahora.</p>
        </div>
      </div>

      {loading ? (
        <div className={`text-center py-16 ${theme.textTertiary}`}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDark ? "border-white/[0.06] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No tienes etapas pendientes. 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <button key={e.id} onClick={() => router.push(`/mantenimiento/llenar/${e.checklist}?etapa=${e.id}`)}
              className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-all hover:shadow-md ${
                isDark ? "bg-[#0F172A]/70 border-white/[0.05] hover:border-emerald-500/30" : "bg-white border-slate-200/70 hover:border-emerald-300"
              }`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
                {e.orden + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>
                  {e.proceso_nombre}{e.etiqueta ? ` · ${e.etiqueta}` : ""}
                </p>
                <h3 className={`text-base font-black truncate ${theme.textPrimary}`}>{e.nombre || e.checklist_nombre}</h3>
                <p className={`text-xs ${theme.textSecondary}`}>Checklist: {e.checklist_nombre}</p>
              </div>
              <ArrowRight className={`w-5 h-5 shrink-0 ${theme.textTertiary}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
