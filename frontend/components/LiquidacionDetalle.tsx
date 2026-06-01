"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Wallet, User, Calendar, AlertTriangle, Trash2, RefreshCw,
  Plus, Save, Edit3, X, FileText, Truck, BadgeCheck, Ban, Hash, Receipt, Download,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";

interface Concepto {
  id: number;
  tipo: string;
  descripcion: string;
  monto: string;
  viaje_id?: number;
  viaje_folio?: string;
}

interface Liquidacion {
  id: number;
  folio: string;
  operador_id: string;
  operador: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  estado_display: string;
  fecha_pago: string;
  observaciones: string;
  creado_en: string;
  total_viajes: string;
  total_extras: string;
  total_descuentos: string;
  total_pagar: string;
  conceptos: Concepto[];
  operador_data?: { rfc?: string; numero_licencia?: string };
}

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

const TIPO_LABEL: Record<string, string> = {
  VIAJE:     "Viaje",
  EXTRA:     "Bono",
  DESCUENTO: "Deducción",
};

const TIPO_COLOR: Record<string, { bg: string; text: string; ring: string; icon: any }> = {
  VIAJE:     { bg: "bg-blue-50 dark:bg-blue-950/40",       text: "text-blue-700 dark:text-blue-300",       ring: "ring-blue-200 dark:ring-blue-900/40",       icon: Truck },
  EXTRA:     { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-900/40", icon: TrendingUp },
  DESCUENTO: { bg: "bg-rose-50 dark:bg-rose-950/40",       text: "text-rose-700 dark:text-rose-300",       ring: "ring-rose-200 dark:ring-rose-900/40",       icon: TrendingDown },
};

const ESTADO_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  BORRADOR:  { bg: "bg-slate-200 dark:bg-slate-500/20 ring-slate-300", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
  APROBADA:  { bg: "bg-blue-100 dark:bg-blue-500/20 ring-blue-300",    text: "text-blue-700 dark:text-blue-200",    dot: "bg-blue-500" },
  PAGADA:    { bg: "bg-emerald-100 dark:bg-emerald-500/20 ring-emerald-300", text: "text-emerald-700 dark:text-emerald-200", dot: "bg-emerald-500" },
  CANCELADA: { bg: "bg-rose-100 dark:bg-rose-500/20 ring-rose-300",    text: "text-rose-700 dark:text-rose-200",    dot: "bg-rose-500" },
};

export default function LiquidacionDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [l, setL] = useState<Liquidacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal nuevo concepto / editar
  const [openConc, setOpenConc] = useState(false);
  const [cId, setCId] = useState<number | null>(null);
  const [cTipo, setCTipo] = useState("EXTRA");
  const [cDesc, setCDesc] = useState("");
  const [cMonto, setCMonto] = useState("0");
  const [busyConc, setBusyConc] = useState(false);

  // Cambio de estado
  const [busyEstado, setBusyEstado] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busyDel, setBusyDel] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.getLiquidacion(id);
      setL(d as any);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la liquidación");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const abrirNuevoConcepto = () => {
    setCId(null); setCTipo("EXTRA"); setCDesc(""); setCMonto("0"); setOpenConc(true);
  };

  const abrirEditarConcepto = (c: Concepto) => {
    // Si es VIAJE, solo permitir editar monto/descripción (el tipo no se cambia)
    setCId(c.id); setCTipo(c.tipo); setCDesc(c.descripcion); setCMonto(String(c.monto || "0")); setOpenConc(true);
  };

  const guardarConcepto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l || !cDesc.trim()) return;
    setBusyConc(true);
    try {
      const payload = { tipo: cTipo, descripcion: cDesc.trim(), monto: cMonto || "0" };
      if (cId) await api.actualizarConceptoLiquidacion(cId, payload);
      else await api.agregarConceptoLiquidacion(l.id, payload);
      setOpenConc(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al guardar concepto");
    } finally { setBusyConc(false); }
  };

  const eliminarConcepto = async (cid: number) => {
    if (!confirm("¿Eliminar este concepto?")) return;
    await api.eliminarConceptoLiquidacion(cid);
    await load();
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!l) return;
    setBusyEstado(true);
    try {
      const payload: any = { estado: nuevoEstado };
      if (nuevoEstado === "PAGADA") {
        payload.fecha_pago = new Date().toISOString().slice(0, 10);
      }
      await api.actualizarLiquidacion(l.id, payload);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al cambiar estado");
    } finally { setBusyEstado(false); }
  };

  const eliminar = async () => {
    if (!l) return;
    setBusyDel(true);
    try {
      await api.eliminarLiquidacion(l.id);
      router.push("/liquidaciones");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
      setBusyDel(false);
    }
  };

  if (loading) return <div className="min-h-screen p-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando…</div>;
  if (error || !l) return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
        <AlertTriangle size={28} className="mx-auto text-red-500 mb-2" />
        <p className="text-sm font-bold text-red-700">{error || "Liquidación no encontrada"}</p>
        <Link href="/liquidaciones" className="inline-block mt-3 text-sm text-red-600 hover:underline">← Volver al listado</Link>
      </div>
    </div>
  );

  const estadoStyle = ESTADO_STYLES[l.estado] || ESTADO_STYLES.BORRADOR;
  const isLocked = l.estado === "PAGADA" || l.estado === "CANCELADA";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/liquidaciones" className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400">
              <ArrowLeft size={14} /> Liquidaciones
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{l.folio}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Descargar PDF — siempre disponible */}
            <a href={api.getLiquidacionPdfUrl(l.id)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-md transition-all">
              <Download size={13} /> Descargar PDF
            </a>
            {/* Acciones de workflow */}
            {l.estado === "BORRADOR" && (
              <button onClick={() => cambiarEstado("APROBADA")} disabled={busyEstado}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60">
                <BadgeCheck size={12} /> Aprobar
              </button>
            )}
            {l.estado === "APROBADA" && (
              <button onClick={() => cambiarEstado("PAGADA")} disabled={busyEstado}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60">
                <Receipt size={12} /> Marcar Pagada
              </button>
            )}
            {!isLocked && (
              <button onClick={() => cambiarEstado("CANCELADA")} disabled={busyEstado}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white">
                <Ban size={12} /> Cancelar
              </button>
            )}
            <button onClick={() => setConfirmDel(true)} disabled={busyDel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white">
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-transparent bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.18em] mb-3 ring-1 ring-emerald-200 dark:ring-emerald-500/25">
                <Wallet size={10} /> Liquidación de Operador
              </div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight leading-none text-emerald-700 dark:text-emerald-300">
                  {l.folio}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ring-1 ${estadoStyle.bg} ${estadoStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot}`} /> {l.estado_display}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <User size={12} className="inline mr-1" /> <b>{l.operador}</b>
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                <Calendar size={11} className="inline mr-1" /> Periodo: {fmtDate(l.fecha_inicio)} – {fmtDate(l.fecha_fin)}
              </p>
            </div>

            {/* Total */}
            <div className="rounded-xl bg-emerald-600 text-white p-4 flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 mb-1">Total a pagar</div>
              <div className="text-3xl font-black tabular-nums">{MXN(parseFloat(l.total_pagar || "0"))}</div>
              <div className="text-[10.5px] text-emerald-100 mt-2 grid grid-cols-3 gap-1">
                <div>Viajes: <b className="font-mono">{MXN(parseFloat(l.total_viajes || "0"))}</b></div>
                <div>Bonos: <b className="font-mono">{MXN(parseFloat(l.total_extras || "0"))}</b></div>
                <div>Deducciones: <b className="font-mono">-{MXN(parseFloat(l.total_descuentos || "0"))}</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de conceptos */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={15} className="text-emerald-500" /> Conceptos
              </h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">{l.conceptos.length} conceptos · viajes + extras − descuentos = total</p>
            </div>
            {!isLocked && (
              <button onClick={abrirNuevoConcepto}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm">
                <Plus size={11} /> Agregar concepto
              </button>
            )}
          </div>

          {l.conceptos.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin conceptos todavía</p>
              <p className="text-[11.5px] text-slate-400 mt-0.5">Agrega viajes, bonos o descuentos para construir la liquidación.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    {["Tipo", "Descripción", "Viaje vinculado", "Monto", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {l.conceptos.map(c => {
                    const tc = TIPO_COLOR[c.tipo] || TIPO_COLOR.EXTRA;
                    const sign = c.tipo === "DESCUENTO" ? "-" : "";
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ring-1 ${tc.bg} ${tc.text} ${tc.ring}`}>
                            <tc.icon size={10} /> {TIPO_LABEL[c.tipo] || c.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[12.5px] text-slate-700 dark:text-slate-200">{c.descripcion}</td>
                        <td className="px-3 py-3 text-[11.5px] text-slate-500">
                          {c.viaje_id ? (
                            <Link href={`/viajes/${c.viaje_id}`} className="font-mono font-bold text-blue-600 hover:underline">{c.viaje_folio || `#${c.viaje_id}`}</Link>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm font-black text-slate-800 dark:text-white tabular-nums">
                          {sign}{MXN(parseFloat(c.monto || "0"))}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {!isLocked && (
                            <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => abrirEditarConcepto(c)} title="Editar"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-blue-600 transition-all">
                                <Edit3 size={11} />
                              </button>
                              <button onClick={() => eliminarConcepto(c.id)} title="Eliminar"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-emerald-50 dark:bg-emerald-950/30 border-t-2 border-emerald-200 dark:border-emerald-900/40">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">TOTAL A PAGAR</td>
                    <td className="px-3 py-2.5 font-mono text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{MXN(parseFloat(l.total_pagar || "0"))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {l.observaciones && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Observaciones</h3>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{l.observaciones}</p>
          </div>
        )}
      </div>

      {/* Modal concepto */}
      {openConc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busyConc && setOpenConc(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-800 dark:text-white">{cId ? "Editar concepto" : "Nuevo concepto"}</h3>
              <button onClick={() => setOpenConc(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={guardarConcepto} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                {cTipo === "VIAJE" ? (
                  // Editando un concepto VIAJE existente — el tipo está fijo
                  <div className="px-3 py-2 text-xs font-bold rounded-lg border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5">
                    <Truck size={11} /> Viaje (vinculado a bitácora)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCTipo("EXTRA")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${cTipo === "EXTRA"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <TrendingUp size={11} /> Bono
                    </button>
                    <button type="button" onClick={() => setCTipo("DESCUENTO")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${cTipo === "DESCUENTO"
                        ? "bg-rose-100 border-rose-300 text-rose-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <TrendingDown size={11} /> Deducción
                    </button>
                  </div>
                )}
                {!cId && (
                  <p className="text-[10.5px] text-slate-400 mt-1.5">
                    Los <b>viajes</b> se agregan automáticamente desde la bitácora. Aquí solo capturas bonos y deducciones.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                <input value={cDesc} onChange={e => setCDesc(e.target.value)} required
                  placeholder={cTipo === "DESCUENTO" ? "Ej: Daño a unidad, multa, anticipo entregado…" : "Ej: Bono puntualidad, peaje, viáticos, comisión…"}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Monto (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" min="0" step="0.01" value={cMonto} onChange={e => setCMonto(e.target.value)} required
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpenConc(false)} disabled={busyConc}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={busyConc}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                  <Save size={11} /> {busyConc ? "Guardando…" : (cId ? "Guardar cambios" : "Agregar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busyDel && setConfirmDel(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Eliminar liquidación</h3>
                <p className="text-sm text-slate-500 mt-1">Eliminar <b>{l.folio}</b> de <b>{l.operador}</b>. Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDel(false)} disabled={busyDel}
                className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={eliminar} disabled={busyDel}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                {busyDel ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
