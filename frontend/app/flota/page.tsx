"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle, ExternalLink, FileText, Plus, RefreshCw, Search, Truck,
} from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

interface Unidad {
  id: number;
  numero: string;
  placas: string;
  marca: string;
  modelo: string;
  anio: number | null;
  tipo: string;
  km_actual: string;
  activo: boolean;
  cp_ready?: boolean;
  cp_campos_faltantes?: string[];
  empresa_nombre?: string;
}

export default function FlotaListPage() {
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<{ results: Unidad[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page_size: "100" };
    if (empresaActivaId) params.empresa = String(empresaActivaId);
    if (q.trim()) params.search = q.trim();
    api.getUnidades(params)
      .then((r) => setData(r as any))
      .catch(() => setData({ results: [], count: 0 }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId]);

  const cpReadyCount = data?.results.filter((u) => u.cp_ready).length || 0;
  const totalUnidades = data?.results.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-transparent bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900 p-5 sm:p-6 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_60%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-amber-200 dark:ring-amber-500/25">
                Flota · Catalogo de unidades
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-white/10 flex items-center justify-center ring-1 ring-amber-200 dark:ring-white/10 shrink-0">
                  <Truck size={20} className="text-amber-600 dark:text-amber-400" />
                </span>
                <span className="truncate">Flota de Unidades</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                {loading
                  ? "Cargando..."
                  : `${totalUnidades} unidad${totalUnidades !== 1 ? "es" : ""}, ${cpReadyCount} lista${cpReadyCount !== 1 ? "s" : ""} para timbrar CP`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <Link href="/flota/nuevo"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition-colors"
                style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                <Plus size={13} /> Nueva unidad
              </Link>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Numero, placas, marca, modelo..."
              className="w-full pl-8 pr-20 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60" />
            <button onClick={load}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold rounded-md bg-amber-600 text-white hover:bg-amber-500">
              <Search size={10} /> Buscar
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Cargando...
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <Truck size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Sin unidades registradas</p>
              <p className="text-xs text-slate-400 mb-4">Agrega tu primera unidad con todos los campos SAT.</p>
              <Link href="/flota/nuevo"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white"
                style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                <Plus size={13} /> Nueva unidad
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {data.results.map((u) => (
                  <Link key={u.id} href={`/flota/${u.id}`}
                    className="block p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-amber-600 dark:text-amber-400 text-base">{u.numero}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{u.placas || "—"}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                          {u.marca} {u.modelo} {u.anio ? `· ${u.anio}` : ""}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {Number(u.km_actual || 0).toLocaleString()} km
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <CpBadge cpReady={u.cp_ready} faltantes={u.cp_campos_faltantes} />
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          u.activo
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      {["#", "Placas", "Marca / Modelo", "Anio", "Tipo", "KM", "CP Ready", "Estado", ""].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {data.results.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-3 py-3">
                          <Link href={`/flota/${u.id}`} className="font-black text-base text-amber-600 dark:text-amber-400 hover:underline tabular-nums">
                            {u.numero}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono font-bold text-slate-800 dark:text-white">{u.placas || "—"}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-slate-700 dark:text-slate-300">
                          {u.marca} {u.modelo}
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">{u.anio || "—"}</td>
                        <td className="px-3 py-3 text-[12px] text-slate-600 dark:text-slate-400">{u.tipo || "—"}</td>
                        <td className="px-3 py-3 font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200">
                          {Number(u.km_actual || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3"><CpBadge cpReady={u.cp_ready} faltantes={u.cp_campos_faltantes} /></td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                            u.activo
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/70"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 ring-1 ring-slate-200"
                          }`}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/flota/${u.id}`} title="Ver detalle"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900">
                            <ExternalLink size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Hint inferior */}
        {data && data.results.length > 0 && cpReadyCount < totalUnidades && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                {totalUnidades - cpReadyCount} unidad(es) sin campos SAT completos
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                Las unidades sin "CP Ready" no pueden emitir Carta Porte. Captura los campos faltantes (config vehicular, permiso SCT, seguros) desde el detalle de cada unidad.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CpBadge({ cpReady, faltantes }: { cpReady?: boolean; faltantes?: string[] }) {
  if (cpReady) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/70">
        <CheckCircle size={10} /> CP Ready
      </span>
    );
  }
  const n = faltantes?.length ?? 0;
  return (
    <span
      title={faltantes?.join(", ") || "Faltan campos SAT"}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/70">
      <FileText size={10} /> {n} {n === 1 ? "campo falta" : "campos faltan"}
    </span>
  );
}
