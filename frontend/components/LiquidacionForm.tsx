"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Wallet, Save, AlertTriangle, User, Calendar, Truck, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import Combobox, { type ComboOption } from "@/components/Combobox";

interface OperadorLite { id: string; nombre: string; }
interface ViajePend { id: number; id_viaje: string; folio_carga: string; fecha_viaje: string; origen: string; destino: string; sueldo_operador: string; estado: string; }

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoWeekAgo() { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }

export default function LiquidacionForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const operadorIdParam = sp.get("operador_id") || "";

  const [operadores, setOperadores] = useState<OperadorLite[]>([]);
  const [operadorId, setOperadorId] = useState(operadorIdParam);
  const [fechaInicio, setFechaInicio] = useState(isoWeekAgo());
  const [fechaFin, setFechaFin] = useState(isoToday());
  const [observaciones, setObservaciones] = useState("");

  const [pendientes, setPendientes] = useState<ViajePend[]>([]);
  const [loadingPend, setLoadingPend] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar operadores
  useEffect(() => {
    api.getOperadores().then((r: any) => setOperadores(r.results ?? [])).catch(() => {});
  }, []);

  // Cargar viajes pendientes cuando cambia operador o rango
  useEffect(() => {
    if (!operadorId) { setPendientes([]); return; }
    setLoadingPend(true);
    api.getViajesPendientesLiquidar({
      operador_id: operadorId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
      .then((r: any) => setPendientes(r.results ?? []))
      .catch(() => setPendientes([]))
      .finally(() => setLoadingPend(false));
  }, [operadorId, fechaInicio, fechaFin]);

  const operadorOpts = useMemo<ComboOption[]>(() =>
    operadores.map(o => ({ id: o.id, label: o.nombre })), [operadores]);

  const totalPreview = useMemo(() =>
    pendientes.reduce((s, v) => s + parseFloat(v.sueldo_operador || "0"), 0), [pendientes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!operadorId)   return setError("Selecciona un operador.");
    if (!fechaInicio)  return setError("Indica fecha de inicio del periodo.");
    if (!fechaFin)     return setError("Indica fecha de fin del periodo.");
    if (fechaFin < fechaInicio) return setError("La fecha fin no puede ser anterior a la de inicio.");

    setSaving(true);
    try {
      const r = await api.crearLiquidacion({
        operador_id: operadorId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        observaciones: observaciones.trim() || null,
      }) as any;
      router.push(`/liquidaciones/${r.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la liquidación.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/liquidaciones" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400">
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" /> Nueva Liquidación
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 space-y-5">

          {/* Operador */}
          <div>
            <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              <User size={11} className="inline mr-1" /> Operador <span className="text-red-400">*</span>
            </label>
            <Combobox options={operadorOpts} value={operadorId} onChange={setOperadorId}
              placeholder="Selecciona un operador…"
              emptyHint="Sin operadores activos" />
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                <Calendar size={11} className="inline mr-1" /> Periodo desde <span className="text-red-400">*</span>
              </label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                <Calendar size={11} className="inline mr-1" /> Periodo hasta <span className="text-red-400">*</span>
              </label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
          </div>

          {/* Vista previa de viajes que se van a liquidar */}
          {operadorId && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-1.5">
                <Truck size={11} /> Viajes a incluir (vista previa)
              </p>
              {loadingPend ? (
                <p className="text-[12px] text-slate-500 inline-flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Buscando viajes…</p>
              ) : pendientes.length === 0 ? (
                <p className="text-[12px] text-slate-500 italic">No hay viajes del operador en ese rango. Podés crear igual la liquidación y agregar conceptos extra manualmente.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900">
                    <table className="w-full text-[11.5px]">
                      <thead className="bg-emerald-100/60 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-bold">Folio</th>
                          <th className="px-2 py-1.5 text-left font-bold">Fecha</th>
                          <th className="px-2 py-1.5 text-left font-bold">Ruta</th>
                          <th className="px-2 py-1.5 text-right font-bold">Sueldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
                        {pendientes.map(v => (
                          <tr key={v.id}>
                            <td className="px-2 py-1.5 font-mono font-bold text-slate-700 dark:text-slate-200">{v.folio_carga || v.id_viaje}</td>
                            <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">{v.fecha_viaje}</td>
                            <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">{v.origen} → {v.destino}</td>
                            <td className="px-2 py-1.5 font-mono text-right font-bold text-emerald-700 dark:text-emerald-300">
                              {MXN(parseFloat(v.sueldo_operador || "0"))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-100 dark:bg-emerald-950/60 border-t-2 border-emerald-300 dark:border-emerald-900/50">
                        <tr>
                          <td colSpan={3} className="px-2 py-1.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Total preliminar:</td>
                          <td className="px-2 py-1.5 text-right font-mono font-black text-emerald-800 dark:text-emerald-100">{MXN(totalPreview)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2">
                    Al crear la liquidación se incluirán automáticamente estos {pendientes.length} viaje{pendientes.length !== 1 ? "s" : ""}. Después podés agregar <b>Extras</b> (bonos, peajes) y <b>Descuentos</b>.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              Observaciones
            </label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-y" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link href="/liquidaciones"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-sm">
              <Save size={13} /> {saving ? "Generando…" : "Generar liquidación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
