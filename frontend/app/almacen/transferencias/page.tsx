"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Calendar, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Transferencia {
  id: number;
  folio?: string;
  origen_nombre?: string;
  destino_nombre?: string;
  almacen_origen?: number;
  almacen_destino?: number;
  estado: string;
  fecha?: string;
  creado_en?: string;
}

export default function TransferenciasPage() {
  const { theme, isDarkMode } = useTheme();
  const [items, setItems] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTransferenciasAlmacen({ page_size: "100" });
      setItems((r as any).results || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EC4899)" }}>
          <ArrowRightLeft className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Transferencias entre almacenes</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Movimientos de stock entre origen y destino con estado.</p>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
            <tr className={theme.textSecondary}>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-bold tracking-wider">Folio</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-bold tracking-wider">Origen</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-bold tracking-wider">Destino</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-bold tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-bold tracking-wider">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className={`px-4 py-12 text-center ${theme.textTertiary}`}>
                <Loader2 className="w-5 h-5 animate-spin inline" /> Cargando…
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className={`px-4 py-12 text-center ${theme.textTertiary}`}>
                Sin transferencias. Crea una desde un movimiento de tipo TRANSFERENCIA en /almacen/movimientos.
              </td></tr>
            ) : items.map((t) => (
              <tr key={t.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                <td className={`px-4 py-3 font-mono text-xs ${theme.textPrimary}`}>{t.folio || `#${t.id}`}</td>
                <td className={`px-4 py-3 text-xs ${theme.textPrimary}`}>{t.origen_nombre || `#${t.almacen_origen}`}</td>
                <td className={`px-4 py-3 text-xs ${theme.textPrimary}`}>{t.destino_nombre || `#${t.almacen_destino}`}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.estado === "RECIBIDA" || t.estado === "COMPLETADA" ? "bg-emerald-500/20 text-emerald-300"
                    : t.estado === "EN_TRANSITO" || t.estado === "ENVIADA" ? "bg-blue-500/20 text-blue-300"
                    : t.estado === "BORRADOR" ? "bg-slate-500/20 text-slate-300"
                    : t.estado === "CANCELADA" ? "bg-rose-500/20 text-rose-300"
                    : "bg-amber-500/20 text-amber-300"
                  }`}>{t.estado}</span>
                </td>
                <td className={`px-4 py-3 text-xs ${theme.textSecondary}`}>
                  {t.fecha ? new Date(t.fecha).toLocaleDateString()
                    : t.creado_en ? new Date(t.creado_en).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
