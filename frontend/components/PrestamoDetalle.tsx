"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Banknote, User, Calendar, FileText, Trash2,
  AlertTriangle, CheckCircle, Tag, Clock, Percent,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";

interface PrestamoDetalle {
  id: number;
  empleado_id: string;
  empleado: string;
  departamento: string;
  puesto: string;
  tipo_prestamo: string;
  tipo: string;
  monto_total: string;
  monto_pagado: string;
  saldo_pendiente: string;
  tasa_interes: string;
  plazo_semanas: number;
  fecha_primer_pago: string;
  fecha_solicitud: string;
  fecha_aprobacion: string;
  estado: string;
  estado_display: string;
  concepto: string;
  observaciones: string;
  pago_semanal: string;
  documento_solicitud_url: string | null;
  contrato_url: string | null;
}

const ESTADO_STYLES: Record<string, string> = {
  solicitado: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  aprobado:   "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  rechazado:  "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  en_curso:   "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  pagado:     "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  moroso:     "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
  cancelado:  "bg-slate-100 dark:bg-slate-800 text-slate-500",
};

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PrestamoDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [p, setP] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getPrestamoRH(id)
      .then((d: any) => { if (mounted) setP(d); })
      .catch((e: unknown) => { if (mounted) setError(e instanceof Error ? e.message : "No se pudo cargar"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const eliminar = async () => {
    setDeleting(true);
    try {
      await api.eliminarPrestamoRH(id);
      router.push("/rh/prestamos");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-6 text-center text-sm text-slate-400 animate-pulse">Cargando…</div>;
  }
  if (error || !p) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-6 text-center">
          <AlertTriangle size={28} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error || "No se encontró el préstamo."}</p>
          <Link href="/rh/prestamos" className="inline-block mt-4 text-sm text-red-600 dark:text-red-400 hover:underline">← Volver al listado</Link>
        </div>
      </div>
    );
  }

  const monto = parseFloat(p.monto_total) || 0;
  const pagado = parseFloat(p.monto_pagado) || 0;
  const saldo = parseFloat(p.saldo_pendiente) || (monto - pagado);
  const pct = monto > 0 ? Math.min(100, (pagado / monto) * 100) : 0;
  const estadoCls = ESTADO_STYLES[p.estado] ?? "bg-slate-100 text-slate-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/rh/prestamos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            <ArrowLeft size={14} /> Volver al listado
          </Link>
          <button onClick={() => setConfirmDel(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
            <Trash2 size={12} /> Eliminar
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white p-6 shadow-xl shadow-amber-200/50 dark:shadow-none">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">
                <Banknote size={12} /> Préstamo
              </div>
              <h1 className="text-2xl font-black">{p.empleado}</h1>
              <p className="text-sm text-white/85 mt-0.5">{p.departamento || "Sin departamento"} {p.puesto && <span className="opacity-70">· {p.puesto}</span>}</p>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ${estadoCls}`}>
              {p.estado_display || p.estado}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <KPI label="Monto total"      value={MXN(monto)} />
            <KPI label="Pago semanal"     value={MXN(parseFloat(p.pago_semanal) || 0)} />
            <KPI label="Plazo"            value={`${p.plazo_semanas} sem`} />
            <KPI label="Tasa anual"       value={`${parseFloat(p.tasa_interes) || 0} %`} />
          </div>

          {/* Progress bar de pago */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/80 mb-1.5">
              <span>Pagado: {MXN(pagado)}</span>
              <span>Saldo: {MXN(saldo)}</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card icon={Tag} title="Información del préstamo">
            <Row label="Tipo"            value={p.tipo || p.tipo_prestamo} />
            <Row label="Concepto"        value={p.concepto || "—"} />
            <Row label="Plazo (semanas)" value={String(p.plazo_semanas)} />
            <Row label="Tasa anual"      value={`${parseFloat(p.tasa_interes) || 0} %`} />
            <Row label="Pago semanal"    value={MXN(parseFloat(p.pago_semanal) || 0)} mono />
          </Card>

          <Card icon={Calendar} title="Fechas">
            <Row label="Fecha de solicitud"   value={fmtDate(p.fecha_solicitud)} />
            <Row label="Fecha de aprobación"  value={fmtDate(p.fecha_aprobacion)} />
            <Row label="Fecha primer pago"    value={fmtDate(p.fecha_primer_pago)} />
          </Card>
        </div>

        <Card icon={User} title="Empleado">
          <Row label="Nombre"        value={p.empleado} />
          <Row label="Departamento"  value={p.departamento || "—"} />
          <Row label="Puesto"        value={p.puesto || "—"} />
        </Card>

        {p.observaciones && (
          <Card icon={FileText} title="Observaciones">
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{p.observaciones}</p>
          </Card>
        )}

        {(p.documento_solicitud_url || p.contrato_url) && (
          <Card icon={FileText} title="Documentos">
            <div className="flex flex-wrap gap-2">
              {p.documento_solicitud_url && (
                <a href={`${API_BASE}${p.documento_solicitud_url}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 hover:bg-amber-100">
                  <FileText size={12} /> Documento de solicitud
                </a>
              )}
              {p.contrato_url && (
                <a href={`${API_BASE}${p.contrato_url}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100">
                  <CheckCircle size={12} /> Contrato firmado
                </a>
              )}
            </div>
          </Card>
        )}
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Eliminar préstamo</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">¿Confirmas que deseas eliminar el préstamo de <span className="font-bold">{p.empleado}</span>? Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDel(false)} disabled={deleting}
                className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={eliminar} disabled={deleting}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm px-3 py-2">
      <div className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-sm font-black truncate tabular-nums">{value}</div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
        <Icon size={13} /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{label}</span>
      <span className={`text-slate-800 dark:text-slate-100 text-right ${mono ? "font-mono text-[13px]" : ""}`}>{value}</span>
    </div>
  );
}
