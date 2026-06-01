"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote, CheckCircle, ChevronRight, CreditCard, FileSpreadsheet,
  Plus, RefreshCw, Search, Truck,
} from "lucide-react";

import Tabs from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const TABS = [
  { id: "todas", label: "Todas" },
  { id: "PENDIENTE", label: "Pendientes" },
  { id: "PARCIAL", label: "Pago parcial" },
  { id: "PAGADA", label: "Pagadas" },
];

export default function CXPPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");

  const load = () => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getFacturasProveedor({ empresa: String(empresaActivaId) })
      .then((r) => setFacturas(r.results || []))
      .catch(() => setFacturas([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empresaActivaId]);

  const filtered = useMemo(() => {
    let res = facturas;
    if (filter !== "todas") res = res.filter((f) => f.estado === filter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((f) => (f.folio || "").toLowerCase().includes(q) || (f.proveedor_nombre || "").toLowerCase().includes(q));
    }
    return res;
  }, [facturas, filter, search]);

  const totales = useMemo(() => ({
    total: facturas.reduce((s, f) => s + Number(f.total || 0), 0),
    saldo: facturas.reduce((s, f) => s + Number(f.saldo || 0), 0),
    pagado: facturas.reduce((s, f) => s + Number(f.total || 0) - Number(f.saldo || 0), 0),
    vencidas: facturas.filter((f) => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date() && Number(f.saldo || 0) > 0).length,
  }), [facturas]);

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl border overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(20,184,166,0.08))"
            : "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(20,184,166,0.05))",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
              <Banknote className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Cuentas por Pagar</h1>
              <p className={`text-sm ${theme.textSecondary}`}>Facturas de proveedores, pagos parciales y antiguedad de saldos.</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KPI label="Total facturas" value={facturas.length.toString()} color="#10B981" />
            <KPI label="Por pagar $" value={`$${totales.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} color="#F59E0B" />
            <KPI label="Pagado $" value={`$${totales.pagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} color="#3B82F6" />
            <KPI label="Vencidas" value={totales.vencidas.toString()} color="#EF4444" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.divider} ${theme.surfaceElevated}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio o proveedor..."
            className="bg-transparent outline-none text-sm w-64" />
        </div>
        <div className="flex-1" />
        <button onClick={load} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${theme.surfaceElevated} hover:scale-105 transition-all`}>
          <RefreshCw className="w-4 h-4" /> Refrescar
        </button>
        <Link href="/cxp/proveedores"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${theme.surfaceElevated} hover:scale-105 transition-all`}>
          <Truck className="w-4 h-4" /> Proveedores
        </Link>
        <button onClick={() => alert("Captura de factura proveedor en construccion")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
          style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      <Tabs tabs={TABS} activeTab={filter} onChange={setFilter} theme={theme} />

      <div className={`rounded-3xl border ${theme.divider}`}
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
        {loading ? (
          <div className={`p-16 text-center ${theme.textTertiary}`}>Cargando facturas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Banknote className={`w-12 h-12 mx-auto mb-3 ${theme.textTertiary}`} />
            <p className={`text-sm font-bold ${theme.textPrimary}`}>Sin facturas de proveedor</p>
            <p className={`text-xs mt-1 ${theme.textTertiary}`}>Captura tu primera factura recibida.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`text-left text-[10px] uppercase tracking-[0.2em] font-black ${theme.textTertiary} border-b ${theme.divider}`}>
                <tr>
                  <th className="px-6 py-3">Folio</th>
                  <th className="px-6 py-3">Proveedor</th>
                  <th className="px-6 py-3">Emision</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Saldo</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className={`border-b ${theme.divider}`}>
                    <td className={`px-6 py-3 font-mono ${theme.textPrimary}`}>{f.folio}</td>
                    <td className={`px-6 py-3 ${theme.textPrimary}`}>{f.proveedor_nombre || "-"}</td>
                    <td className={`px-6 py-3 ${theme.textSecondary} text-xs`}>{new Date(f.fecha_emision).toLocaleDateString("es-MX")}</td>
                    <td className={`px-6 py-3 ${theme.textSecondary} text-xs`}>{f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString("es-MX") : "-"}</td>
                    <td className={`px-6 py-3 text-right font-mono ${theme.textPrimary}`}>${Number(f.total).toFixed(2)}</td>
                    <td className={`px-6 py-3 text-right font-mono font-bold`} style={{ color: Number(f.saldo) > 0 ? "#F59E0B" : "#10B981" }}>
                      ${Number(f.saldo).toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          color: f.estado === "PAGADA" ? "#10B981" : "#F59E0B",
                          background: f.estado === "PAGADA" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                          borderColor: f.estado === "PAGADA" ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)",
                        }}>
                        {f.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, color }: any) {
  const { theme, isDarkMode: isDark } = useTheme();
  return (
    <div className="w-36 h-20 rounded-2xl border flex flex-col items-center justify-center px-2"
      style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", borderColor: color + "30" }}>
      <p className="text-lg font-black truncate w-full text-center" style={{ color }}>{value}</p>
      <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>{label}</p>
    </div>
  );
}
