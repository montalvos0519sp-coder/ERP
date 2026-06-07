"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calculator, CheckCircle, Clock, Download, FileText, Loader2, Plus,
  RefreshCw, Send, Trash2, Users, XCircle, AlertTriangle,
} from "lucide-react";

import { api } from "@/lib/api";

interface Concepto {
  id: number;
  tipo: "P" | "D" | "O";
  clave_sat: string;
  concepto: string;
  importe_gravado: string;
  importe_exento: string;
  importe: string;
}
interface Recibo {
  id: number;
  empleado: number;
  empleado_nombre: string;
  empleado_numero: string;
  empleado_rfc: string;
  empleado_curp: string;
  empleado_puesto: string;
  dias_pagados: string;
  salario_diario: string;
  total_percepciones: string;
  total_deducciones: string;
  total_otros_pagos: string;
  total_neto: string;
  estatus_cfdi: string;
  cfdi_uuid: string;
  conceptos: Concepto[];
}

export default function PeriodoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [periodo, setPeriodo] = useState<any>(null);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; txt: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, rs] = await Promise.all([
        api.getPeriodoNomina(id),
        api.getRecibosPeriodo(id),
      ]);
      setPeriodo(p);
      setRecibos(rs.results || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const toggle = (rid: number) => setExpanded((p) => {
    const n = new Set(p);
    n.has(rid) ? n.delete(rid) : n.add(rid);
    return n;
  });

  const cargarEmpleados = async () => {
    setBusy("cargar");
    setMsg(null);
    try {
      const r = await api.cargarEmpleadosPeriodo(id);
      setMsg({ kind: "ok", txt: `Cargados ${r.creados} recibos nuevos (${r.total} empleados activos).` });
      await load();
    } catch (e) { setMsg({ kind: "err", txt: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const calcular = async () => {
    setBusy("calcular");
    setMsg(null);
    try {
      const r = await api.calcularPeriodo(id);
      setMsg({ kind: "ok", txt: `Calculados ${r.actualizados} recibos (ISR + IMSS + subsidio).` });
      await load();
    } catch (e) { setMsg({ kind: "err", txt: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const timbrar = async (recibo: Recibo) => {
    // Crear CFDI borrador con xml-preview (que genera el objeto), luego buscar y timbrar
    setBusy(`tim-${recibo.id}`);
    setMsg(null);
    try {
      // Genera/asegura CFDI borrador
      await fetch(api.xmlPreviewRecibo(recibo.id), { credentials: "include", headers: tokenHeader() });
      // Obtener el CFDI asociado
      const cfdis = await api.getCFDINomina({ "nomina_empleado__periodo": String(id), page_size: "500" });
      const cfdi = (cfdis.results || []).find((c: any) => c.nomina_empleado === recibo.id);
      if (!cfdi) throw new Error("No se pudo crear el CFDI borrador.");
      const t = await api.timbrarCFDI(cfdi.id);
      if (t.uuid) {
        setMsg({ kind: "ok", txt: `Timbrado OK · UUID ${t.uuid}` });
      } else {
        setMsg({ kind: "err", txt: t.detail || "Error desconocido al timbrar." });
      }
      await load();
    } catch (e) { setMsg({ kind: "err", txt: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const timbrarPeriodo = async () => {
    const pendientes = recibos.filter((r) => (r.estatus_cfdi || "BORRADOR") !== "TIMBRADO");
    if (pendientes.length === 0) {
      setMsg({ kind: "err", txt: "No hay recibos pendientes de timbrar." });
      return;
    }
    if (!confirm(`Se timbrarán ${pendientes.length} recibo(s) ante el SAT. ¿Continuar?`)) return;
    setBusy("timbrar-periodo");
    setMsg(null);
    let ok = 0;
    const errores: string[] = [];
    try {
      // Asegura/crea los CFDI borrador de todos los pendientes (genera el objeto)
      await Promise.all(
        pendientes.map((r) =>
          fetch(api.xmlPreviewRecibo(r.id), { credentials: "include", headers: tokenHeader() }).catch(() => null),
        ),
      );
      const cfdis = await api.getCFDINomina({ "nomina_empleado__periodo": String(id), page_size: "500" });
      const lista = cfdis.results || [];
      for (const r of pendientes) {
        const cfdi = lista.find((c: any) => c.nomina_empleado === r.id);
        if (!cfdi) { errores.push(`${r.empleado_nombre}: sin CFDI borrador`); continue; }
        if (cfdi.estatus === "TIMBRADO") { ok++; continue; }
        try {
          const t = await api.timbrarCFDI(cfdi.id);
          if (t.uuid) ok++;
          else errores.push(`${r.empleado_nombre}: ${t.detail || "error desconocido"}`);
        } catch (e) {
          errores.push(`${r.empleado_nombre}: ${(e as Error).message}`);
        }
      }
      const resumen = `Timbrados ${ok}/${pendientes.length} recibo(s).` + (errores.length ? ` Errores: ${errores.slice(0, 3).join(" · ")}${errores.length > 3 ? "…" : ""}` : "");
      setMsg({ kind: errores.length ? "err" : "ok", txt: resumen });
      await load();
    } catch (e) {
      setMsg({ kind: "err", txt: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (loading || !periodo) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Loader2 className="animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  const totalPeriodo = recibos.reduce((s, r) => s + parseFloat(r.total_neto || "0"), 0);
  const timbrados = recibos.filter((r) => r.estatus_cfdi === "TIMBRADO").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613]">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/nomina/periodos" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft size={13} /> Periodos
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl" style={{ background: "linear-gradient(120deg,#10B981 0%,#14B8A6 50%,#0EA5E9 100%)" }}>
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center shadow-lg shrink-0">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{periodo.nombre}</h1>
                <p className="text-sm text-white/80 mt-1">
                  {periodo.fecha_inicio} → {periodo.fecha_fin} · pago {periodo.fecha_pago} · {periodo.num_dias_pagados} dias
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <HeroBadge>{periodo.estatus}</HeroBadge>
                  <HeroBadge>{periodo.tipo_nomina === "O" ? "Ordinaria" : "Extraordinaria"}</HeroBadge>
                  <HeroBadge>Periodicidad {periodo.periodicidad_pago}</HeroBadge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">Total neto</p>
              <p className="text-3xl md:text-4xl font-black text-white tabular-nums leading-none mt-1">{fmtMoney(totalPeriodo)}</p>
              <p className="text-xs text-white/80 mt-1.5">{timbrados} / {recibos.length} timbrados</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
            msg.kind === "ok"
              ? "bg-emerald-50 dark:bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
              : "bg-rose-50 dark:bg-rose-500/[0.08] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
          }`}>
            {msg.kind === "ok" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            <span className="flex-1">{msg.txt}</span>
            <button onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100"><XCircle size={14} /></button>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={cargarEmpleados} disabled={busy === "cargar"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {busy === "cargar" ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
            Cargar empleados activos
          </button>
          <button onClick={calcular} disabled={busy === "calcular" || recibos.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
            {busy === "calcular" ? <RefreshCw size={13} className="animate-spin" /> : <Calculator size={13} />}
            Calcular (ISR + IMSS + Subsidio)
          </button>
          <button onClick={timbrarPeriodo} disabled={busy === "timbrar-periodo" || recibos.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
            {busy === "timbrar-periodo" ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            Timbrar periodo ({recibos.filter((r) => (r.estatus_cfdi || "BORRADOR") !== "TIMBRADO").length})
          </button>
          <button onClick={load} title="Refrescar"
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Lista de recibos */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
              <Users size={15} className="text-emerald-500" /> Recibos ({recibos.length})
            </h2>
          </div>
          {recibos.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin recibos cargados</p>
              <p className="text-xs text-slate-400 mt-1">Usa "Cargar empleados activos" arriba para empezar.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {recibos.map((r) => {
                const open = expanded.has(r.id);
                const estado = r.estatus_cfdi || "BORRADOR";
                return (
                  <div key={r.id}>
                    <button onClick={() => toggle(r.id)}
                      className="w-full text-left px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.06] transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0 text-[12px] shadow-sm"
                        style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
                        {(r.empleado_nombre?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{r.empleado_nombre}</p>
                          <span className="text-[10px] font-mono text-slate-400">#{r.empleado_numero}</span>
                          {r.empleado_rfc && <span className="text-[10px] font-mono text-slate-400">{r.empleado_rfc}</span>}
                          <CfdiPill estado={estado} />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {r.dias_pagados} dias · SD {fmtMoney(+r.salario_diario)} · neto <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(+r.total_neto)}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Percepciones</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtMoney(+r.total_percepciones)}</p>
                      </div>
                    </button>

                    {open && (
                      <div className="px-4 sm:px-6 pb-4 -mt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <Stat label="Total percepciones" v={+r.total_percepciones} c="#10B981" />
                          <Stat label="Total deducciones" v={+r.total_deducciones} c="#EF4444" />
                          <Stat label="Otros pagos" v={+r.total_otros_pagos} c="#3B82F6" />
                        </div>

                        {/* Conceptos */}
                        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-hidden">
                          {(r.conceptos || []).length === 0 ? (
                            <p className="p-4 text-center text-xs text-slate-400">Sin conceptos · usa "Calcular" arriba.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                  <th className="px-3 py-2.5 text-left">Tipo</th>
                                  <th className="px-3 py-2.5 text-left">Clave SAT</th>
                                  <th className="px-3 py-2.5 text-left">Concepto</th>
                                  <th className="px-3 py-2.5 text-right">Gravado</th>
                                  <th className="px-3 py-2.5 text-right">Exento</th>
                                  <th className="px-3 py-2.5 text-right">Importe</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                {r.conceptos.map((c) => (
                                  <tr key={c.id} className="hover:bg-emerald-500/[0.03] dark:hover:bg-emerald-500/[0.05] transition-colors">
                                    <td className="px-3 py-2">
                                      <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                                        background: tipoColor(c.tipo) + "1f",
                                        color: tipoColor(c.tipo),
                                      }}>
                                        {c.tipo === "P" ? "PER" : c.tipo === "D" ? "DED" : "OTR"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{c.clave_sat}</td>
                                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{c.concepto}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmtMoney(+c.importe_gravado)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmtMoney(+c.importe_exento)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-white">{fmtMoney(+c.importe)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Acciones por recibo */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {estado !== "TIMBRADO" && (
                            <button onClick={() => timbrar(r)} disabled={busy === `tim-${r.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
                              {busy === `tim-${r.id}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                              Timbrar CFDI
                            </button>
                          )}
                          <a href={api.xmlPreviewRecibo(r.id)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <FileText size={12} /> Ver XML preview
                          </a>
                          {r.cfdi_uuid && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                              UUID: {r.cfdi_uuid.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function tokenHeader(): HeadersInit {
  const t = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
      {children}
    </span>
  );
}

function CfdiPill({ estado }: { estado: string }) {
  const c = estatusCFDIColor(estado);
  const Icon = estado === "TIMBRADO" ? CheckCircle
    : estado === "CANCELADO" ? XCircle
    : estado === "ERROR" ? AlertTriangle : Clock;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c + "1f", color: c }}>
      <Icon size={11} /> {estado}
    </span>
  );
}

function Stat({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border p-3 bg-white dark:bg-white/[0.02] border-slate-200/70 dark:border-white/[0.06] shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: c }} />
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-base font-black tabular-nums mt-0.5" style={{ color: c }}>{fmtMoney(v)}</p>
    </div>
  );
}

function estatusColor(e: string) {
  return ({ ABIERTO: "#F59E0B", CALCULADO: "#3B82F6", TIMBRADO: "#10B981", CANCELADO: "#94A3B8" } as any)[e] || "#6366F1";
}
function estatusCFDIColor(e: string) {
  return ({ TIMBRADO: "#10B981", BORRADOR: "#94A3B8", CANCELADO: "#EF4444", ERROR: "#F97316" } as any)[e] || "#6366F1";
}
function tipoColor(t: string) {
  return ({ P: "#10B981", D: "#EF4444", O: "#3B82F6" } as any)[t] || "#6366F1";
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}
