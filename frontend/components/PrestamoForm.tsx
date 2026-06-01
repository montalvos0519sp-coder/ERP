"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Banknote, Save, AlertTriangle, CheckCircle, Info,
  Calendar, Percent, Calculator,
} from "lucide-react";
import { api } from "@/lib/api";

interface EmpleadoLite { id: string; nombre: string; }

const TIPOS = [
  { v: "PERSONAL",   l: "Préstamo Personal" },
  { v: "ADELANTO",   l: "Adelanto de Sueldo" },
  { v: "EMERGENCIA", l: "Préstamo de Emergencia" },
  { v: "ESPECIAL",   l: "Préstamo Especial" },
];

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

function pagoSemanal(monto: number, tasaAnual: number, semanas: number): number {
  if (!monto || !semanas) return 0;
  if (!tasaAnual) return monto / semanas;
  const r = (tasaAnual / 100) / 52; // tasa semanal
  const factor = Math.pow(1 + r, semanas);
  return (monto * (r * factor)) / (factor - 1);
}

export default function PrestamoForm() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoQ, setEmpleadoQ] = useState("");
  const [tipo, setTipo] = useState("PERSONAL");
  const [monto, setMonto] = useState("");
  const [tasa, setTasa] = useState("0");
  const [plazo, setPlazo] = useState("12");
  const [fechaPrimerPago, setFechaPrimerPago] = useState("");
  const [concepto, setConcepto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [docSolicitud, setDocSolicitud] = useState<File | null>(null);
  const [contrato, setContrato] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api.getRHSupervisores()
      .then((r: any) => setEmpleados(Array.isArray(r) ? r : r.results ?? []))
      .catch(() => {});
  }, []);

  const empleadosFiltrados = useMemo(() => {
    const q = empleadoQ.trim().toLowerCase();
    return q ? empleados.filter(e => (e.nombre ?? "").toLowerCase().includes(q)) : empleados;
  }, [empleados, empleadoQ]);

  const m = parseFloat(monto || "0") || 0;
  const t = parseFloat(tasa || "0") || 0;
  const sem = Math.max(0, Math.min(52, parseInt(plazo || "0") || 0));
  const pago = pagoSemanal(m, t, sem);
  const totalAPagar = pago * sem;
  const interesTotal = totalAPagar - m;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!empleadoId)            { setError("Selecciona un empleado."); return; }
    if (m <= 0)                 { setError("El monto debe ser mayor a cero."); return; }
    if (sem < 1 || sem > 52)    { setError("El plazo debe estar entre 1 y 52 semanas."); return; }
    if (!fechaPrimerPago)       { setError("Indica la fecha del primer pago."); return; }
    if (!concepto.trim())       { setError("El concepto es obligatorio."); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("empleado_id", empleadoId);
      fd.append("tipo_prestamo", tipo);
      fd.append("monto_total", String(m));
      fd.append("tasa_interes", String(t));
      fd.append("plazo_semanas", String(sem));
      fd.append("fecha_primer_pago", fechaPrimerPago);
      fd.append("concepto", concepto.trim());
      if (observaciones.trim()) fd.append("observaciones", observaciones.trim());
      if (docSolicitud) fd.append("documento_solicitud", docSolicitud);
      if (contrato) fd.append("contrato", contrato);
      await api.crearPrestamoRH(fd);
      setOk(true);
      setTimeout(() => router.push("/rh/prestamos"), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el préstamo.");
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5";
  const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/rh/prestamos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Banknote size={16} className="text-amber-500" /> Nuevo Préstamo
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {ok && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle size={16} /> Préstamo creado correctamente.
          </div>
        )}

        {/* Info card */}
        <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Info size={15} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-300 mb-1">
                Política de préstamos
              </h3>
              <ul className="text-[12px] text-slate-600 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                <li>Plazos permitidos entre <span className="font-bold">1 y 52 semanas</span> (máx. 1 año).</li>
                <li>Si la tasa anual es <span className="font-bold">0 %</span>, el pago semanal se reparte en partes iguales.</li>
                <li>Cálculo con interés compuesto semanal: <code className="font-mono text-[11px]">r = tasa_anual / 52</code>.</li>
                <li>Las solicitudes creadas aquí quedan <span className="font-bold">aprobadas automáticamente</span>.</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 space-y-5">

          <div>
            <label className={labelCls}>Empleado <span className="text-red-400">*</span></label>
            <input type="text" value={empleadoQ} onChange={e => setEmpleadoQ(e.target.value)}
              placeholder="Buscar por nombre…"
              className={inputCls + " mb-2"} />
            <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)} className={inputCls}>
              <option value="">— Selecciona un empleado —</option>
              {empleadosFiltrados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de préstamo <span className="text-red-400">*</span></label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}><Calendar size={11} className="inline mr-1" /> Fecha primer pago <span className="text-red-400">*</span></label>
              <input type="date" value={fechaPrimerPago} onChange={e => setFechaPrimerPago(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Monto total <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input type="number" min={0} step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0.00" className={inputCls + " pl-7 font-mono"} />
              </div>
            </div>
            <div>
              <label className={labelCls}><Percent size={11} className="inline mr-1" /> Tasa anual</label>
              <input type="number" min={0} step="0.01" value={tasa} onChange={e => setTasa(e.target.value)}
                placeholder="0" className={inputCls + " font-mono"} />
            </div>
            <div>
              <label className={labelCls}>Plazo (semanas) <span className="text-red-400">*</span></label>
              <input type="number" min={1} max={52} value={plazo} onChange={e => setPlazo(e.target.value)}
                placeholder="12" className={inputCls + " font-mono"} />
            </div>
          </div>

          {/* Cálculos automáticos */}
          {m > 0 && sem > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-4">
              <p className="text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calculator size={12} /> Cálculos automáticos
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Pago semanal" value={MXN(pago)} tone="amber" highlight />
                <Stat label="Total a pagar" value={MXN(totalAPagar)} tone="slate" />
                <Stat label="Interés total" value={MXN(Math.max(0, interesTotal))} tone={interesTotal > 0 ? "violet" : "slate"} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Concepto <span className="text-red-400">*</span></label>
            <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)}
              placeholder="Ej: Compra de electrodoméstico" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              className={inputCls + " resize-y"} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Documento de solicitud (opcional)</label>
              <input type="file" onChange={e => setDocSolicitud(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-950/50 dark:file:text-amber-300" />
            </div>
            <div>
              <label className={labelCls}>Contrato firmado (opcional)</label>
              <input type="file" onChange={e => setContrato(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/50 dark:file:text-emerald-300" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link href="/rh/prestamos"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-amber-200 dark:shadow-none transition-colors">
              <Save size={13} /> {saving ? "Guardando…" : "Guardar préstamo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, highlight = false }: {
  label: string; value: string; tone: "slate" | "amber" | "violet"; highlight?: boolean;
}) {
  const toneMap = {
    slate:  "text-slate-700 dark:text-slate-200",
    amber:  "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
  };
  return (
    <div className={`rounded-lg px-2.5 py-2 ${highlight ? "bg-amber-600 text-white" : "bg-white/70 dark:bg-slate-900/50 border border-amber-100 dark:border-amber-900/30"}`}>
      <div className={`text-[9.5px] font-extrabold uppercase tracking-widest ${highlight ? "text-amber-100" : "text-slate-400 dark:text-slate-500"}`}>{label}</div>
      <div className={`text-base font-black mt-0.5 tabular-nums ${highlight ? "" : toneMap[tone]}`}>{value}</div>
    </div>
  );
}
