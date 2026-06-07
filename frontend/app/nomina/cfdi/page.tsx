"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, CheckCircle, Clock, Download, FileText, RefreshCw,
  Search, Trash2, XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

const MOTIVOS = [
  { v: "01", l: "01 · Comprobante emitido con errores con relacion" },
  { v: "02", l: "02 · Comprobante emitido con errores sin relacion" },
  { v: "03", l: "03 · No se llevo a cabo la operacion" },
  { v: "04", l: "04 · Operacion nominativa relacionada en factura global" },
];

export default function CFDIsPage() {
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estatus, setEstatus] = useState("");
  const [cancelando, setCancelando] = useState<null | { id: number; uuid: string; motivo: string; sustituye: string }>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; txt: string } | null>(null);

  const load = async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { empresa: String(empresaActivaId), page_size: "200" };
      if (estatus) params.estatus = estatus;
      if (q.trim()) params.search = q.trim();
      const r = await api.getCFDINomina(params);
      setData(r.results || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId, estatus]);

  const cancelar = async () => {
    if (!cancelando) return;
    setBusy(cancelando.id);
    setMsg(null);
    try {
      await api.cancelarCFDI(cancelando.id, cancelando.motivo, cancelando.sustituye);
      setMsg({ kind: "ok", txt: `CFDI ${cancelando.uuid} cancelado.` });
      setCancelando(null);
      load();
    } catch (e) {
      setMsg({ kind: "err", txt: (e as Error).message });
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613]">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/nomina" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft size={13} /> Panel de nomina
        </Link>

        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl" style={{ background: "linear-gradient(120deg,#10B981 0%,#14B8A6 50%,#0EA5E9 100%)" }}>
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center shadow-lg shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">CFDI de Nomina</h1>
              <p className="text-sm text-white/80">UUIDs emitidos, descarga XML/PDF, cancelacion con motivos SAT.</p>
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

        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: "", l: "Todos", c: "#6366F1" },
            { v: "TIMBRADO", l: "Timbrados", c: "#10B981" },
            { v: "BORRADOR", l: "Borrador", c: "#94A3B8" },
            { v: "CANCELADO", l: "Cancelados", c: "#EF4444" },
            { v: "ERROR", l: "Errores", c: "#F97316" },
          ].map((e) => (
            <button key={e.v} onClick={() => setEstatus(e.v)}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all hover:-translate-y-0.5"
              style={{
                background: estatus === e.v ? e.c : e.c + "14",
                color: estatus === e.v ? "#fff" : e.c,
                border: estatus === e.v ? "none" : `1px solid ${e.c}33`,
                boxShadow: estatus === e.v ? "0 4px 12px -4px " + e.c + "99" : "none",
              }}>{e.l}</button>
          ))}
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }}
                placeholder="Buscar UUID, folio, empleado..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
            </div>
          </div>
          <button onClick={load} title="Refrescar"
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Cargando...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin CFDIs</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-3 py-3 text-left">Estatus</th>
                    <th className="px-3 py-3 text-left">UUID</th>
                    <th className="px-3 py-3 text-left">Serie-Folio</th>
                    <th className="px-3 py-3 text-left">Empleado</th>
                    <th className="px-3 py-3 text-left">Periodo</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-left">Timbrado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {data.map((c) => {
                    const col = estatusColor(c.estatus);
                    const StIcon = c.estatus === "TIMBRADO" ? CheckCircle : c.estatus === "CANCELADO" ? XCircle : c.estatus === "ERROR" ? AlertTriangle : Clock;
                    return (
                      <tr key={c.id} className="hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.06] transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: col + "1f", color: col }}>
                            <StIcon size={11} /> {c.estatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{(c.uuid || "").slice(0, 8)}...</td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{c.serie}-{c.folio}</td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                          <p className="font-bold">{c.empleado_nombre}</p>
                          <p className="text-[10px] text-slate-400">#{c.empleado_numero}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.periodo_nombre}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(+c.total || 0)}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{c.fecha_timbrado ? new Date(c.fecha_timbrado).toLocaleString("es-MX") : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            {c.xml && (
                              <a href={api.urlXmlCFDI(c.id)} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Descargar XML">
                                <Download size={13} />
                              </a>
                            )}
                            {c.pdf_url && (
                              <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Ver PDF">
                                <FileText size={13} />
                              </a>
                            )}
                            {c.estatus === "TIMBRADO" && (
                              <button onClick={() => setCancelando({ id: c.id, uuid: c.uuid, motivo: "02", sustituye: "" })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Cancelar">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal cancelar */}
      {cancelando && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCancelando(null)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center"><AlertTriangle size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Cancelar CFDI</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">UUID {cancelando.uuid}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Lbl>Motivo SAT</Lbl>
                  <select value={cancelando.motivo} onChange={(e) => setCancelando((p) => p && { ...p, motivo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-sm">
                    {MOTIVOS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </div>
                {cancelando.motivo === "01" && (
                  <div>
                    <Lbl>UUID que sustituye al cancelado</Lbl>
                    <input value={cancelando.sustituye} onChange={(e) => setCancelando((p) => p && { ...p, sustituye: e.target.value })}
                      placeholder="UUID del CFDI nuevo" className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setCancelando(null)} className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">Cancelar</button>
                <button onClick={cancelar} disabled={busy === cancelando.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
                  {busy === cancelando.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Cancelar CFDI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-400">{children}</label>;
}

function estatusColor(e: string) {
  return ({ TIMBRADO: "#10B981", BORRADOR: "#94A3B8", CANCELADO: "#EF4444", ERROR: "#F97316" } as any)[e] || "#6366F1";
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}
