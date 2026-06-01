"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, Loader2, Search } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Existencia {
  id: number;
  producto: number;
  producto_nombre?: string;
  producto_codigo?: string;
  almacen: number;
  almacen_nombre?: string;
  ubicacion?: number | null;
  lote?: number | null;
  cantidad: string | number;
  disponible: string | number;
  comprometido: string | number;
  en_transito?: string | number;
  costo_promedio?: string | number;
}

export default function ExistenciasPage() {
  const { theme, isDarkMode } = useTheme();
  const [items, setItems] = useState<Existencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "200" };
      if (search.trim()) params.search = search.trim();
      const r = await api.getExistenciasAlmacen(params);
      setItems(r.results || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
          <Boxes className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Existencias en tiempo real</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Stock por producto y almacen — disponible, reservado, en transito.</p>
        </div>
      </div>

      <div className={`p-3 rounded-2xl border ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o codigo…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`} />
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
            <tr className={theme.textSecondary}>
              <Th>Producto</Th>
              <Th>Almacen</Th>
              <Th align="right">Cantidad</Th>
              <Th align="right">Disponible</Th>
              <Th align="right">Reservado</Th>
              <Th align="right">En transito</Th>
              <Th align="right">Costo prom.</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={`px-4 py-12 text-center ${theme.textTertiary}`}>
                <Loader2 className="w-5 h-5 animate-spin inline" /> Cargando…
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className={`px-4 py-12 text-center ${theme.textTertiary}`}>
                Sin existencias registradas. Aparecen aqui al aprobar movimientos de entrada en /almacen/movimientos.
              </td></tr>
            ) : items.map((e) => (
              <tr key={e.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                <Td>
                  <div className={`text-xs ${theme.textPrimary}`}>{e.producto_nombre || `#${e.producto}`}</div>
                  {e.producto_codigo && <div className={`text-[10px] font-mono ${theme.textTertiary}`}>{e.producto_codigo}</div>}
                </Td>
                <Td><span className={`text-xs ${theme.textPrimary}`}>{e.almacen_nombre || `#${e.almacen}`}</span></Td>
                <Td align="right"><span className="font-mono text-xs font-bold">{Number(e.cantidad).toLocaleString("es-MX")}</span></Td>
                <Td align="right"><span className="font-mono text-xs text-emerald-400">{Number(e.disponible).toLocaleString("es-MX")}</span></Td>
                <Td align="right"><span className="font-mono text-xs text-amber-400">{Number(e.comprometido).toLocaleString("es-MX")}</span></Td>
                <Td align="right"><span className="font-mono text-xs text-blue-400">{Number(e.en_transito || 0).toLocaleString("es-MX")}</span></Td>
                <Td align="right"><span className="font-mono text-xs">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(e.costo_promedio || 0))}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
