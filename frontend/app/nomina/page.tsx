"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calculator, CheckCircle, Clock, FileText, Plus, RefreshCw, Settings,
  Wallet, AlertTriangle, Banknote, Building2,
} from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

interface KPIs {
  periodos: number;
  abiertos: number;
  cfdi_timbrados: number;
  cfdi_borrador: number;
  cfdi_cancelados: number;
}

export default function NominaDashboardPage() {
  const { empresaActivaId } = useUser();
  const [kpis, setKpis] = useState<KPIs>({ periodos: 0, abiertos: 0, cfdi_timbrados: 0, cfdi_borrador: 0, cfdi_cancelados: 0 });
  const [ultimosPeriodos, setUltimosPeriodos] = useState<any[]>([]);
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const [p, c, cfg] = await Promise.all([
        api.getPeriodosNomina({ empresa: String(empresaActivaId), page_size: "10" }),
        api.getCFDINomina({ empresa: String(empresaActivaId), page_size: "1" }),
        api.getConfigNomina(empresaActivaId),
      ]);
      const periodos = p.results || [];
      setUltimosPeriodos(periodos);
      // KPI rápido por estatus
      const abiertos = periodos.filter((x: any) => x.estatus === "ABIERTO" || x.estatus === "CALCULADO").length;
      // CFDI por estatus (cuentas)
      const [tim, bor, can] = await Promise.all([
        api.getCFDINomina({ empresa: String(empresaActivaId), estatus: "TIMBRADO", page_size: "1" }),
        api.getCFDINomina({ empresa: String(empresaActivaId), estatus: "BORRADOR", page_size: "1" }),
        api.getCFDINomina({ empresa: String(empresaActivaId), estatus: "CANCELADO", page_size: "1" }),
      ]);
      setKpis({
        periodos: p.count || periodos.length,
        abiertos,
        cfdi_timbrados: tim.count || 0,
        cfdi_borrador: bor.count || 0,
        cfdi_cancelados: can.count || 0,
      });
      setConfig((cfg.results || [])[0] || null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613] relative">
      <div className="hidden dark:block pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-20 w-[460px] h-[460px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -left-32 w-[460px] h-[460px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #14B8A6 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 p-5 sm:p-6 shadow-sm dark:shadow-[0_8px_32px_-12px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] dark:backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_55%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-emerald-200 dark:ring-emerald-400/30">
                Nomina · CFDI 4.0 · Complemento Nomina 1.2
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-200 dark:ring-emerald-400/30 dark:shadow-[0_0_24px_rgba(16,185,129,0.25)] shrink-0">
                  <Wallet size={20} className="text-emerald-600 dark:text-emerald-300" />
                </span>
                Nomina
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                Calcula, timbra y descarga recibos de nomina. Integracion con Factura.com (PAC).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/nomina/config"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] transition-colors">
                <Settings size={13} /> Configuracion PAC
              </Link>
              <Link href="/nomina/periodos/nuevo"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm dark:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
                <Plus size={13} /> Nuevo periodo
              </Link>
            </div>
          </div>
        </div>

        {/* Banner si no hay config */}
        {!loading && (!config || !config.tiene_credenciales) && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.08] p-4 flex items-start gap-3 dark:backdrop-blur-xl">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 dark:ring-1 dark:ring-amber-400/30">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">Falta configurar el PAC</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                Antes de timbrar debes capturar las credenciales de Factura.com (API Key, Secret Key) + datos patronales (Registro Patronal, RFC Patron Origen).
              </p>
            </div>
            <Link href="/nomina/config"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600">
              Configurar
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {[
            { l: "Periodos",        v: kpis.periodos,         c: "#10B981", i: Calculator },
            { l: "Abiertos",        v: kpis.abiertos,         c: "#F59E0B", i: Clock },
            { l: "CFDI timbrados",  v: kpis.cfdi_timbrados,   c: "#3B82F6", i: CheckCircle },
            { l: "CFDI borrador",   v: kpis.cfdi_borrador,    c: "#94A3B8", i: FileText },
            { l: "Cancelados",      v: kpis.cfdi_cancelados,  c: "#EF4444", i: AlertTriangle },
          ].map((k) => {
            const Icon = k.i;
            return (
              <div key={k.l} className="rounded-2xl border p-3 sm:p-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{k.l}</span>
                  <Icon size={14} style={{ color: k.c }} />
                </div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: k.c }}>{k.v}</p>
              </div>
            );
          })}
        </div>

        {/* Ultimos periodos */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.04]">
            <h2 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Banknote size={16} className="text-emerald-500" /> Ultimos periodos
            </h2>
            <Link href="/nomina/periodos" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Ver todos →</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Cargando...
            </div>
          ) : ultimosPeriodos.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin periodos creados</p>
              <p className="text-xs text-slate-400 mt-1">Crea tu primer periodo para empezar a calcular nomina.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {ultimosPeriodos.map((p) => (
                <Link key={p.id} href={`/nomina/periodos/${p.id}`}
                  className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: estatusBg(p.estatus), color: estatusColor(p.estatus) }}>
                    <Calculator size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{p.nombre}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: estatusBg(p.estatus), color: estatusColor(p.estatus) }}>
                        {p.estatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {p.fecha_inicio} → {p.fecha_fin} · {p.num_recibos} recibo{p.num_recibos !== 1 ? "s" : ""} · {p.timbrados} timbrados
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                    {fmtMoney(p.total_periodo)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tarjetas de accion */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/nomina/periodos" className="rounded-2xl border p-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2 ring-1 ring-emerald-200/50 dark:ring-emerald-400/25">
              <Calculator size={18} />
            </div>
            <p className="font-black text-sm text-slate-800 dark:text-white">Periodos</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Crea quincenas, semanas o periodos mensuales.</p>
          </Link>
          <Link href="/nomina/cfdi" className="rounded-2xl border p-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2 ring-1 ring-blue-200/50 dark:ring-blue-400/25">
              <FileText size={18} />
            </div>
            <p className="font-black text-sm text-slate-800 dark:text-white">CFDI emitidos</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Consulta UUIDs, descarga XML / PDF, cancela.</p>
          </Link>
          <Link href="/nomina/config" className="rounded-2xl border p-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center mb-2 ring-1 ring-violet-200/50 dark:ring-violet-400/25">
              <Building2 size={18} />
            </div>
            <p className="font-black text-sm text-slate-800 dark:text-white">Configuracion PAC</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Credenciales Factura.com + datos patronales.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function estatusColor(e: string) {
  return ({ ABIERTO: "#F59E0B", CALCULADO: "#3B82F6", TIMBRADO: "#10B981", CANCELADO: "#94A3B8" } as any)[e] || "#6366F1";
}
function estatusBg(e: string) {
  const c = estatusColor(e);
  return c + "22";
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}
