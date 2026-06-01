"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CheckCircle, Clock, Plus, RefreshCw, Search, XCircle } from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

const ESTADOS = [
  { v: "", l: "Todos", c: "#6366F1" },
  { v: "ABIERTO", l: "Abiertos", c: "#F59E0B" },
  { v: "CALCULADO", l: "Calculados", c: "#3B82F6" },
  { v: "TIMBRADO", l: "Timbrados", c: "#10B981" },
  { v: "CANCELADO", l: "Cancelados", c: "#94A3B8" },
];

export default function PeriodosNominaPage() {
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { empresa: String(empresaActivaId), page_size: "200" };
      if (estado) params.estatus = estado;
      const r = await api.getPeriodosNomina(params);
      setData(r.results || []);
    } catch { setData([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId, estado]);

  const filtered = data.filter((p) =>
    !q.trim() || p.nombre.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613]">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/nomina" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft size={13} /> Panel de nomina
        </Link>

        <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 p-5 sm:p-6 dark:backdrop-blur-xl">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Calculator className="text-emerald-500" /> Periodos de nomina
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{data.length} periodos</p>
            </div>
            <Link href="/nomina/periodos/nuevo"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg text-white shadow-sm dark:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.5)]"
              style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
              <Plus size={13} /> Nuevo periodo
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map((e) => (
              <button key={e.v} onClick={() => setEstado(e.v)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{
                  background: estado === e.v ? e.c : "rgba(255,255,255,0)",
                  color: estado === e.v ? "#fff" : "#94a3b8",
                  border: estado === e.v ? "none" : "1px solid rgba(148,163,184,0.3)",
                }}>{e.l}</button>
            ))}
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar periodo..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
          </div>
          <button onClick={load} className="px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 dark:text-slate-300">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin periodos</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filtered.map((p) => {
                const c = estatusColor(p.estatus);
                const Icon = p.estatus === "TIMBRADO" ? CheckCircle : p.estatus === "CANCELADO" ? XCircle : Clock;
                return (
                  <Link key={p.id} href={`/nomina/periodos/${p.id}`}
                    className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.025]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: c + "22", color: c }}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-slate-800 dark:text-white">{p.nombre}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c + "22", color: c }}>{p.estatus}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">{p.tipo_nomina === "O" ? "Ordinaria" : "Extraordinaria"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.fecha_inicio} → {p.fecha_fin} · pago {p.fecha_pago} · {p.num_recibos} recibo{p.num_recibos !== 1 ? "s" : ""} · {p.timbrados} timbrados
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      {fmtMoney(p.total_periodo)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function estatusColor(e: string) {
  return ({ ABIERTO: "#F59E0B", CALCULADO: "#3B82F6", TIMBRADO: "#10B981", CANCELADO: "#94A3B8" } as any)[e] || "#6366F1";
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}
