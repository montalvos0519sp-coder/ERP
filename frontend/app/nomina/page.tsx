"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calculator, CheckCircle, Clock, FileText, Plus, RefreshCw, Settings,
  Wallet, AlertTriangle, Banknote, Building2, XCircle,
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

  const heroGrad = "linear-gradient(120deg,#10B981 0%,#14B8A6 50%,#0EA5E9 100%)";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613] relative">
      <div className="hidden dark:block pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-20 w-[460px] h-[460px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -left-32 w-[460px] h-[460px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #14B8A6 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl" style={{ background: heroGrad }}>
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center shadow-lg shrink-0">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 ring-1 ring-white/30 text-[10px] font-bold text-white uppercase tracking-[0.18em] mb-2 backdrop-blur-sm">
                  CFDI 4.0 · Complemento Nomina 1.2
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Nomina</h1>
                <p className="text-sm text-white/80">Calcula, timbra y descarga recibos de nomina. Integracion con Factura.com (PAC).</p>
              </div>
            </div>
            <Link href="/nomina/periodos/nuevo">
              <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Plus className="w-4 h-4" /> Nuevo periodo
              </button>
            </Link>
          </div>
          {/* Sub-nav */}
          <div className="relative mt-5 flex flex-wrap gap-2">
            <HeroLink onClick={load} icon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />} label="Refrescar" />
            <HeroLink href="/nomina/config" icon={<Settings className="w-4 h-4" />} label="Configuracion PAC" />
            <HeroLink href="/nomina/periodos" icon={<Calculator className="w-4 h-4" />} label="Periodos" />
            <HeroLink href="/nomina/cfdi" icon={<FileText className="w-4 h-4" />} label="CFDI" />
          </div>
        </div>

        {/* Banner si no hay config */}
        {!loading && (!config || !config.tiene_credenciales) && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.08] p-4 flex items-start gap-3 dark:backdrop-blur-xl shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "#F59E0B" }} />
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: "#F59E0B" }} />
            <div className="relative w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 dark:ring-1 dark:ring-amber-400/30">
              <AlertTriangle size={18} />
            </div>
            <div className="relative flex-1">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">Falta configurar el PAC</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                Antes de timbrar debes capturar las credenciales de Factura.com (API Key, Secret Key) + datos patronales (Registro Patronal, RFC Patron Origen).
              </p>
            </div>
            <Link href="/nomina/config"
              className="relative px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:-translate-y-0.5 transition-all">
              Configurar
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { l: "Periodos",        v: kpis.periodos,         c: "#10B981", i: Calculator },
            { l: "Abiertos",        v: kpis.abiertos,         c: "#F59E0B", i: Clock },
            { l: "CFDI timbrados",  v: kpis.cfdi_timbrados,   c: "#3B82F6", i: CheckCircle },
            { l: "CFDI borrador",   v: kpis.cfdi_borrador,    c: "#94A3B8", i: FileText },
            { l: "Cancelados",      v: kpis.cfdi_cancelados,  c: "#EF4444", i: AlertTriangle },
          ].map((k) => {
            const Icon = k.i;
            return (
              <div key={k.l} className="group relative overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] shadow-sm hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: k.c }} />
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-30" style={{ background: k.c }} />
                <div className="relative flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{k.l}</span>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: k.c + "1f", color: k.c }}>
                    <Icon size={18} />
                  </span>
                </div>
                <p className="relative text-2xl md:text-[1.7rem] font-black mt-2 leading-none tabular-nums text-slate-800 dark:text-white">{k.v}</p>
              </div>
            );
          })}
        </div>

        {/* Ultimos periodos */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/60 dark:bg-white/[0.02]">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
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
                  className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.06] transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: estatusBg(p.estatus), color: estatusColor(p.estatus) }}>
                    <Calculator size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{p.nombre}</p>
                      <EstatusPill estatus={p.estatus} />
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
          <AccionCard href="/nomina/periodos" color="#10B981" icon={<Calculator size={20} />}
            title="Periodos" desc="Crea quincenas, semanas o periodos mensuales." />
          <AccionCard href="/nomina/cfdi" color="#3B82F6" icon={<FileText size={20} />}
            title="CFDI emitidos" desc="Consulta UUIDs, descarga XML / PDF, cancela." />
          <AccionCard href="/nomina/config" color="#8B5CF6" icon={<Building2 size={20} />}
            title="Configuracion PAC" desc="Credenciales Factura.com + datos patronales." />
        </div>
      </div>
    </div>
  );
}

function HeroLink({ href, onClick, icon, label }: any) {
  const cls = "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/20 text-white text-sm font-semibold backdrop-blur-sm transition-all";
  if (href) return <Link href={href} className={cls}>{icon} {label}</Link>;
  return <button onClick={onClick} className={cls}>{icon} {label}</button>;
}

function EstatusPill({ estatus }: { estatus: string }) {
  const c = estatusColor(estatus);
  const Icon = estatus === "TIMBRADO" ? CheckCircle
    : estatus === "CANCELADO" ? XCircle
    : estatus === "CALCULADO" ? Calculator : Clock;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: c + "1f", color: c }}>
      <Icon size={12} /> {estatus}
    </span>
  );
}

function AccionCard({ href, color, icon, title, desc }: any) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-2xl border p-4 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-25" style={{ background: color }} />
      <div className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 shadow-sm" style={{ background: color + "1f", color }}>
        {icon}
      </div>
      <p className="relative font-black text-sm text-slate-800 dark:text-white">{title}</p>
      <p className="relative text-[11px] text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
    </Link>
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
