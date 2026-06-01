"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, User, Briefcase, Clock, CheckCircle,
  FileText, Trash2, AlertTriangle, Tag, Building2, Calendar,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";

interface VacacionDetalle {
  id: number;
  empleado_id: string;
  empleado: string;
  departamento: string;
  puesto: string;
  tipo_vacacion: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  dias_reales: number | null;
  periodo_correspondiente: string;
  anio: number | null;
  estado: string;
  estado_display: string;
  observaciones: string;
  fecha_solicitud: string;
  fecha_aprobacion: string;
  fecha_creacion: string;
  aprobado_por: string;
  creado_por: string;
  documento_solicitud_url: string | null;
  documento_aprobacion_url: string | null;
}

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  aprobado:  "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  rechazado: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  gozado:    "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  cancelado: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export default function VacacionDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [v, setV] = useState<VacacionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getVacacionRH(id)
      .then((d: any) => { if (mounted) setV(d); })
      .catch((e: unknown) => { if (mounted) setError(e instanceof Error ? e.message : "No se pudo cargar"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const eliminar = async () => {
    setDeleting(true);
    try {
      await api.eliminarVacacionRH(id);
      router.push("/rh/vacaciones");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-6 text-center text-sm text-slate-400 animate-pulse">Cargando…</div>;
  }
  if (error || !v) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-6 text-center">
          <AlertTriangle size={28} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error || "No se encontró la vacación."}</p>
          <Link href="/rh/vacaciones" className="inline-block mt-4 text-sm text-red-600 dark:text-red-400 hover:underline">← Volver al listado</Link>
        </div>
      </div>
    );
  }

  const estadoCls = ESTADO_STYLES[v.estado] ?? "bg-slate-100 text-slate-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/rh/vacaciones"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            <ArrowLeft size={14} /> Volver al listado
          </Link>
          <button
            onClick={() => setConfirmDel(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
            <Trash2 size={12} /> Eliminar
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-6 shadow-xl shadow-indigo-200/50 dark:shadow-none">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">
                <CalendarDays size={12} /> Solicitud de Vacaciones
              </div>
              <h1 className="text-2xl font-black">{v.empleado}</h1>
              <p className="text-sm text-white/85 mt-0.5">{v.departamento || "Sin departamento"} {v.puesto && <span className="opacity-70">· {v.puesto}</span>}</p>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize ${estadoCls}`}>
              {v.estado_display || v.estado}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <KPI icon={Calendar} label="Inicio" value={fmtDate(v.fecha_inicio)} />
            <KPI icon={Calendar} label="Fin" value={fmtDate(v.fecha_fin)} />
            <KPI icon={Clock} label="Días solicitados" value={String(v.dias_solicitados)} />
            <KPI icon={Clock} label="Días reales" value={String(v.dias_reales ?? v.dias_solicitados)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card icon={Tag} title="Información de la solicitud">
            <Row label="Tipo de vacación" value={v.tipo || v.tipo_vacacion} />
            <Row label="Periodo" value={v.periodo_correspondiente || "—"} mono />
            <Row label="Año" value={v.anio ? String(v.anio) : "—"} />
            <Row label="Fecha de solicitud" value={fmtDate(v.fecha_solicitud)} />
            <Row label="Fecha de aprobación" value={fmtDate(v.fecha_aprobacion)} />
          </Card>

          <Card icon={User} title="Personas">
            <Row label="Empleado" value={v.empleado} />
            <Row label="Departamento" value={v.departamento || "—"} />
            <Row label="Puesto" value={v.puesto || "—"} />
            <Row label="Solicitado por" value={v.creado_por || "—"} />
            <Row label="Aprobado por" value={v.aprobado_por || "—"} />
          </Card>
        </div>

        {v.observaciones && (
          <Card icon={FileText} title="Observaciones">
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{v.observaciones}</p>
          </Card>
        )}

        {(v.documento_solicitud_url || v.documento_aprobacion_url) && (
          <Card icon={FileText} title="Documentos">
            <div className="flex flex-wrap gap-2">
              {v.documento_solicitud_url && (
                <a href={`${API_BASE}${v.documento_solicitud_url}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100">
                  <FileText size={12} /> Documento de solicitud
                </a>
              )}
              {v.documento_aprobacion_url && (
                <a href={`${API_BASE}${v.documento_aprobacion_url}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100">
                  <CheckCircle size={12} /> Documento de aprobación
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
                <h3 className="text-base font-black text-slate-800 dark:text-white">Eliminar solicitud</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">¿Confirmas que deseas eliminar la vacación de <span className="font-bold">{v.empleado}</span>? Esta acción no se puede deshacer.</p>
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

function KPI({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-bold text-white/80 uppercase tracking-widest mb-0.5">
        <Icon size={10} /> {label}
      </div>
      <div className="text-sm font-black truncate">{value}</div>
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
