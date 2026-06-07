"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Prestamo {
  id: string;
  empleado: string;
  monto: number;
  saldo_pendiente: number;
  fecha_prestamo: string;
  estado: string;
  num_pagos: number;
  pagos_realizados: number;
}

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  liquidado: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  cancelado: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
};

export default function GestionPrestamos() {
  const [data, setData] = useState<{ results: Prestamo[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");
  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const p: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
      if (estadoFilter) p.estado = estadoFilter;
      const res = await api.getPrestamosRH(p);
      setData(res as unknown as { results: Prestamo[]; count: number });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, estadoFilter]);

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <CreditCard size={22} className="text-amber-500" /> Préstamos
          </h1>
          <p className="text-sm text-neutral-500">{data ? `${data.count} registros` : "Cargando..."}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <RefreshCw size={14} /> Actualizar
          </button>
          <Link href="/rh/prestamos/nuevo" className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <CreditCard size={14} /> Nuevo Préstamo
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={estadoFilter} onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="liquidado">Liquidado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-400 animate-pulse">Cargando...</div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
            <p className="text-sm text-neutral-500 mb-1">No se pudieron cargar los préstamos.</p>
            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">/rh/api/prestamos/</code>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  {["Empleado", "Monto", "Saldo pendiente", "Fecha", "Pagos", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data?.results.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-400">Sin resultados</td></tr>
                ) : data?.results.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{p.empleado}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 tabular-nums">
                      ${p.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-neutral-900 dark:text-white">
                      ${p.saldo_pendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 tabular-nums">{p.fecha_prestamo}</td>
                    <td className="px-4 py-3 text-neutral-500 tabular-nums">
                      {p.pagos_realizados}/{p.num_pagos}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[p.estado] ?? ""}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/rh/prestamos/${p.id}`} className="text-neutral-400 hover:text-amber-600 p-1.5 rounded inline-flex" title="Ver detalle">
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40">
              <ChevronLeft size={14} /> Anterior
            </button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40">
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
