"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, BarChart3, Ban, Download,
  FileText, Receipt, RefreshCw, Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const MXN = (v: any) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

type Tab = "I" | "E" | "P";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "I", label: "Facturas (ingresos)", icon: FileText },
  { id: "E", label: "Notas de crédito", icon: Receipt },
  { id: "P", label: "Complementos de pago", icon: Wallet },
];

const ESTADO_COLOR: Record<string, string> = {
  TIMBRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  BORRADOR: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  CANCELADA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  ERROR: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

function hoyISO() { return new Date().toISOString().slice(0, 10); }
function inicioMesISO() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

export default function ReportesFacturacionPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();

  const [desde, setDesde] = useState(inicioMesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [con, setCon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("I");
  const [detalle, setDetalle] = useState<any[]>([]);
  const [loadingDet, setLoadingDet] = useState(false);

  const baseParams = useCallback(() => {
    const p: Record<string, string> = { desde, hasta };
    if (empresaActivaId) p.empresa = String(empresaActivaId);
    return p;
  }, [desde, hasta, empresaActivaId]);

  const cargarConcentrado = useCallback(async () => {
    setLoading(true);
    try { setCon(await api.getConcentradoFacturacion(baseParams())); }
    catch { setCon(null); }
    finally { setLoading(false); }
  }, [baseParams]);

  const cargarDetalle = useCallback(async () => {
    setLoadingDet(true);
    try { setDetalle(await api.getDetalleFacturacion({ ...baseParams(), tipo: tab }) || []); }
    catch { setDetalle([]); }
    finally { setLoadingDet(false); }
  }, [baseParams, tab]);

  useEffect(() => { cargarConcentrado(); }, [cargarConcentrado]);
  useEffect(() => { cargarDetalle(); }, [cargarDetalle]);

  const maxMes = useMemo(
    () => Math.max(1, ...(con?.por_mes || []).map((m: any) => Math.max(m.ingresos, m.egresos))),
    [con],
  );

  const exportCSV = () => {
    const esP = tab === "P";
    const headers = esP
      ? ["Folio", "Fecha", "Forma pago", "Monto", "Docs", "Estado", "UUID"]
      : ["Folio", "Fecha", "Cliente", "RFC", "Subtotal", "Total", "Estado", "UUID"];
    const lines = detalle.map((r) => esP
      ? [r.folio, new Date(r.fecha).toLocaleDateString("es-MX"), r.forma_pago, r.monto, r.docs, r.estado, r.folio_fiscal]
      : [r.folio, new Date(r.fecha).toLocaleDateString("es-MX"), r.cliente, r.rfc, r.subtotal, r.total, r.estado, r.folio_fiscal]);
    const csv = [headers, ...lines].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reporte_${tab}_${desde}_${hasta}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/facturacion")}
            className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Reportes y Concentrado</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Ingresos, notas de crédito y complementos de pago (CFDI 4.0).</p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <DateInput label="Desde" value={desde} onChange={setDesde} isDark={isDarkMode} theme={theme} />
          <DateInput label="Hasta" value={hasta} onChange={setHasta} isDark={isDarkMode} theme={theme} />
          <button onClick={cargarConcentrado} disabled={loading}
            className={`inline-flex items-center justify-center w-10 h-[38px] rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Concentrado KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi isDark={isDarkMode} accent="from-emerald-500 to-teal-600" icon={ArrowUpCircle}
          label="Ingresos facturados" value={loading ? "…" : MXN(con?.facturas?.total)} sub={con ? `${con.facturas.count} CFDI` : ""} />
        <Kpi isDark={isDarkMode} accent="from-rose-500 to-pink-600" icon={ArrowDownCircle}
          label="Notas de crédito" value={loading ? "…" : MXN(con?.notas_credito?.total)} sub={con ? `${con.notas_credito.count} egresos` : ""} />
        <Kpi isDark={isDarkMode} accent="from-sky-500 to-blue-600" icon={Wallet}
          label="Complementos de pago" value={loading ? "…" : MXN(con?.pagos?.monto)} sub={con ? `${con.pagos.count} REP` : ""} />
        <Kpi isDark={isDarkMode} accent="from-violet-500 to-indigo-600" icon={BarChart3}
          label="Neto (ingresos − NC)" value={loading ? "…" : MXN(con?.neto)} sub={con ? `IVA: ${MXN(con.facturas.iva_trasladado)}` : ""} />
      </div>

      {/* Por estado + por mes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textPrimary}`}>CFDI por estado</h2>
          {!con || Object.keys(con.por_estado || {}).length === 0 ? (
            <p className={`text-sm ${theme.textTertiary}`}>Sin comprobantes en el rango.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(con.por_estado).map(([est, n]: any) => (
                <span key={est} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${ESTADO_COLOR[est] || ESTADO_COLOR.BORRADOR}`}>
                  {est === "CANCELADA" && <Ban className="w-3.5 h-3.5" />}
                  <span className="tabular-nums">{n}</span> {est}
                </span>
              ))}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${ESTADO_COLOR.CANCELADA}`}>
                <Ban className="w-3.5 h-3.5" /> {con.cancelados} canceladas
              </span>
            </div>
          )}
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${theme.textPrimary}`}>Ingresos vs notas de crédito por mes</h2>
          {!con || (con.por_mes || []).length === 0 ? (
            <p className={`text-sm ${theme.textTertiary}`}>Sin datos en el rango.</p>
          ) : (
            <div className="space-y-2.5">
              {con.por_mes.map((m: any) => (
                <div key={m.mes}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className={`font-bold ${theme.textSecondary}`}>{m.mes}</span>
                    <span className="text-emerald-500 font-bold">{MXN(m.ingresos)}{m.egresos ? ` · NC ${MXN(m.egresos)}` : ""}</span>
                  </div>
                  <div className={`h-2.5 rounded-full overflow-hidden flex ${isDarkMode ? "bg-white/[0.05]" : "bg-slate-100"}`}>
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.round((m.ingresos / maxMes) * 100)}%` }} />
                    <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500" style={{ width: `${Math.round((m.egresos / maxMes) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reporte por tipo */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-white/[0.05]">
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  tab === t.id ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border-transparent"
                  : isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} disabled={detalle.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40 ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Folio</Th><Th>Fecha</Th>
                {tab === "P" ? <><Th>Forma pago</Th><Th align="center">Docs</Th></> : <><Th>Cliente</Th><Th>RFC</Th></>}
                <Th align="right">{tab === "P" ? "Monto" : "Total"}</Th>
                <Th align="center">Estado</Th><Th>UUID</Th>
              </tr>
            </thead>
            <tbody>
              {loadingDet ? (
                <tr><td colSpan={7} className={`py-8 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : detalle.length === 0 ? (
                <tr><td colSpan={7} className={`py-8 text-center ${theme.textTertiary}`}>Sin comprobantes en el rango seleccionado.</td></tr>
              ) : detalle.map((r) => (
                <tr key={r.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-mono font-bold ${theme.textPrimary}`}>{r.folio}</span></Td>
                  <Td><span className={`text-xs ${theme.textSecondary}`}>{new Date(r.fecha).toLocaleDateString("es-MX")}</span></Td>
                  {tab === "P" ? (
                    <><Td><span className="text-xs font-mono">{r.forma_pago}</span></Td><Td align="center">{r.docs}</Td></>
                  ) : (
                    <><Td><span className={theme.textPrimary}>{r.cliente}</span></Td><Td><span className={`text-xs font-mono ${theme.textTertiary}`}>{r.rfc}</span></Td></>
                  )}
                  <Td align="right"><span className={`font-mono font-bold ${theme.textPrimary}`}>{MXN(tab === "P" ? r.monto : r.total)}</span></Td>
                  <Td align="center">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${ESTADO_COLOR[r.estado] || ESTADO_COLOR.BORRADOR}`}>{r.estado}</span>
                  </Td>
                  <Td><span className={`text-[10px] font-mono ${theme.textTertiary}`}>{r.folio_fiscal ? r.folio_fiscal.slice(0, 8) + "…" : "—"}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange, isDark, theme }: {
  label: string; value: string; onChange: (v: string) => void; isDark: boolean; theme: any;
}) {
  return (
    <div>
      <label className={`text-[10px] uppercase tracking-wider font-bold ${theme.textTertiary} block mb-0.5`}>{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className={`px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? "bg-[#0F172A]/70 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-800"}`} />
    </div>
  );
}
function Kpi({ isDark, accent, icon: Icon, label, value, sub }: {
  isDark: boolean; accent: string; icon: any; label: string; value: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className={`absolute -right-7 -top-7 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.16]`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-gradient-to-br ${accent} shadow-sm`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-lg font-black mt-0.5 tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${a}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return <td className={`px-3 py-2.5 ${a}`}>{children}</td>;
}
