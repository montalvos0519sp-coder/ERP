"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Download, FileBarChart, Search,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface KardexRow {
  id: number;
  fecha?: string;
  tipo?: string;
  tipo_display?: string;
  folio?: string;
  documento?: string;
  entrada?: number | string;
  salida?: number | string;
  saldo?: number | string;
  costo_unitario?: number | string;
  costo_total?: number | string;
}

interface Opt { id: number; nombre: string; codigo?: string }

const PAGE_SIZE = 50;
const MXN = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

export default function KardexPage() {
  const { theme, isDarkMode } = useTheme();

  const [productos, setProductos] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<Opt[]>([]);
  const [producto, setProducto] = useState<number | "">("");
  const [almacen, setAlmacen] = useState<number | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [items, setItems] = useState<KardexRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busquedaProd, setBusquedaProd] = useState("");

  useEffect(() => {
    api.getProductos({ page_size: "500", activo: "true" }).then((r) => setProductos(r.results || [])).catch(() => {});
    api.getAlmacenes({ page_size: "200" }).then((r) => setAlmacenes(r.results || [])).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    if (!producto) { setItems([]); setCount(0); return; }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        producto: String(producto),
        page: String(page),
        page_size: String(PAGE_SIZE),
      };
      if (almacen) params.almacen = String(almacen);
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      const r = await api.getKardexPorProducto(params);
      setItems(r.results || []);
      setCount(r.count || (r.results || []).length);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [producto, almacen, desde, hasta, page]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  const productosFiltrados = useMemo(() => {
    if (!busquedaProd.trim()) return productos.slice(0, 200);
    const q = busquedaProd.toLowerCase();
    return productos.filter((p) =>
      (p.codigo || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.nombre || "").toLowerCase().includes(q),
    ).slice(0, 200);
  }, [productos, busquedaProd]);

  const exportar = () => {
    if (!producto) { alert("Selecciona un producto."); return; }
    const params: Record<string, string> = { producto: String(producto) };
    if (almacen) params.almacen = String(almacen);
    if (desde) params.fecha_desde = desde;
    if (hasta) params.fecha_hasta = hasta;
    window.open(api.getKardexExportarUrl(params), "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            <FileBarChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Kardex</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Movimientos detallados por producto y almacen.</p>
          </div>
        </div>
        <button onClick={exportar} disabled={!producto}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border disabled:opacity-40 ${
            isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-200 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}>
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {/* Selectores */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <div className="md:col-span-2">
          <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary} mb-1 block`}>Producto</label>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
            <input value={busquedaProd} onChange={(e) => setBusquedaProd(e.target.value)}
              placeholder="Buscar codigo, SKU o nombre…"
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${
                isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`} />
          </div>
          <select value={producto} onChange={(e) => { setPage(1); setProducto(e.target.value ? Number(e.target.value) : ""); }}
            className={`mt-2 w-full px-3 py-2 rounded-lg text-sm border ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
            <option value="">— Selecciona producto —</option>
            {productosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary} mb-1 block`}>Almacen</label>
          <select value={almacen} onChange={(e) => { setPage(1); setAlmacen(e.target.value ? Number(e.target.value) : ""); }}
            className={`w-full px-3 py-2 rounded-lg text-sm border ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
            <option value="">Todos</option>
            {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary} mb-1 block`}>Periodo</label>
          <div className="flex gap-1">
            <input type="date" value={desde} onChange={(e) => { setPage(1); setDesde(e.target.value); }}
              className={`flex-1 px-2 py-2 rounded-lg text-xs border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
            <input type="date" value={hasta} onChange={(e) => { setPage(1); setHasta(e.target.value); }}
              className={`flex-1 px-2 py-2 rounded-lg text-xs border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Fecha</Th><Th>Tipo</Th><Th>Documento</Th>
                <Th align="right">Entrada</Th><Th align="right">Salida</Th>
                <Th align="right">Saldo</Th><Th align="right">Costo unit.</Th><Th align="right">Costo total</Th>
              </tr>
            </thead>
            <tbody>
              {!producto ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Selecciona un producto para ver el kardex.</td></tr>
              ) : loading ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Sin movimientos en el rango.</td></tr>
              ) : items.map((k) => (
                <tr key={k.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className="text-xs">{k.fecha ? new Date(k.fecha).toLocaleString() : "—"}</span></Td>
                  <Td><span className="text-xs font-bold">{k.tipo_display || k.tipo || "—"}</span></Td>
                  <Td><span className="text-xs font-mono">{k.folio || k.documento || "—"}</span></Td>
                  <Td align="right" className="text-emerald-400">{Number(k.entrada || 0) ? Number(k.entrada).toFixed(2) : ""}</Td>
                  <Td align="right" className="text-rose-400">{Number(k.salida || 0) ? Number(k.salida).toFixed(2) : ""}</Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{Number(k.saldo || 0).toFixed(2)}</span></Td>
                  <Td align="right"><span className={theme.textSecondary}>{MXN(k.costo_unitario)}</span></Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{MXN(k.costo_total)}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {producto && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
            <div className={`text-xs ${theme.textTertiary}`}>Pagina {page} de {totalPages} · {count} movimientos</div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, align = "left", className = "" }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""} ${className}`}>{children}</td>;
}
