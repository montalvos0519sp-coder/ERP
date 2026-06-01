"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Banknote, Calendar, CheckCircle, FileText, Save,
  Sun, Upload,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface TipoSolicitud {
  id: number;
  empresa: number;
  categoria: "PERMISO" | "VACACION" | "PRESTAMO";
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  requiere_documento: boolean;
  dias_maximos: number | null;
  con_goce_sueldo: boolean;
  requiere_aprobacion: boolean;
  activo: boolean;
}

const CATEGORIAS = [
  { v: "PERMISO" as const, l: "Permiso", icon: FileText, color: "#6366F1",
    desc: "Justificacion de horas o dias por causas personales / medicas" },
  { v: "VACACION" as const, l: "Vacaciones", icon: Sun, color: "#14B8A6",
    desc: "Periodos vacacionales con o sin goce de sueldo" },
  { v: "PRESTAMO" as const, l: "Prestamo", icon: Banknote, color: "#F59E0B",
    desc: "Solicitud de prestamo con descuento via nomina" },
];

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId, user } = useUser();

  const [tipos, setTipos] = useState<TipoSolicitud[]>([]);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [categoria, setCategoria] = useState<"PERMISO" | "VACACION" | "PRESTAMO">("PERMISO");
  const [tipoId, setTipoId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState<string>("");
  const [cuotas, setCuotas] = useState<string>("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaActivaId) return;
    api.getTiposSolicitud({ empresa: String(empresaActivaId), activo: "true" })
      .then((r) => setTipos(r.results || []))
      .catch(() => setTipos([]));
    // Cargar empleados (para staff que solicita por otro empleado)
    api.getEmpleados({ empresa: String(empresaActivaId), activo: "true", page_size: "200" })
      .then((r) => setEmpleados(r.results || []))
      .catch(() => setEmpleados([]));
  }, [empresaActivaId]);

  // Auto-detectar empleado del usuario actual (busca un Empleado.user_sistema = user)
  useEffect(() => {
    if (empleadoId || !user || !empleados.length) return;
    const mine = empleados.find((e) => e.user_sistema === user.id);
    if (mine) setEmpleadoId(mine.id);
  }, [empleados, user, empleadoId]);

  // Filtrar tipos por categoria
  const tiposFiltrados = useMemo(
    () => tipos.filter((t) => t.categoria === categoria),
    [tipos, categoria]
  );

  // Tipo seleccionado
  const tipoSeleccionado = useMemo(
    () => tipos.find((t) => t.id === tipoId),
    [tipos, tipoId]
  );

  // Calcular dias automaticamente
  const dias = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const d1 = new Date(fechaInicio);
    const d2 = new Date(fechaFin);
    if (isNaN(+d1) || isNaN(+d2) || d2 < d1) return 0;
    return Math.floor((+d2 - +d1) / (1000 * 60 * 60 * 24)) + 1;
  }, [fechaInicio, fechaFin]);

  // Cambiar categoria → resetear tipo
  useEffect(() => { setTipoId(null); }, [categoria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!empresaActivaId) return setError("Sin empresa activa.");
    if (!empleadoId) return setError("Selecciona el empleado al que aplica la solicitud.");
    if (!tipoId) return setError("Selecciona un tipo de solicitud.");
    if (!fechaInicio) return setError("Captura la fecha de inicio.");
    if (categoria === "PRESTAMO" && !monto) return setError("Captura el monto del prestamo.");
    if (tipoSeleccionado?.requiere_documento && !documento) {
      return setError(`El tipo '${tipoSeleccionado.nombre}' requiere documento adjunto.`);
    }

    setSaving(true);
    try {
      const usaArchivo = !!documento;
      let payload: any;
      if (usaArchivo) {
        const fd = new FormData();
        fd.append("empresa", String(empresaActivaId));
        fd.append("empleado", String(empleadoId));
        fd.append("tipo", String(tipoId));
        fd.append("fecha_inicio", fechaInicio);
        if (fechaFin) fd.append("fecha_fin", fechaFin);
        fd.append("dias", String(dias));
        fd.append("motivo", motivo);
        if (monto) fd.append("monto", monto);
        if (cuotas) fd.append("cuotas", cuotas);
        if (documento) fd.append("documento", documento);
        payload = fd;
      } else {
        payload = {
          empresa: empresaActivaId,
          empleado: empleadoId,
          tipo: tipoId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || null,
          dias,
          motivo,
          monto: monto ? Number(monto) : null,
          cuotas: cuotas ? Number(cuotas) : null,
        };
      }
      await api.crearSolicitudRH(payload);
      router.push("/mis-solicitudes");
    } catch (err) {
      setError((err as Error).message || "Error al guardar.");
      setSaving(false);
    }
  };

  const inputCls = isDark
    ? "w-full bg-[#1E293B]/40 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400/50 transition-all"
    : "w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500/50 transition-all";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/mis-solicitudes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Nueva solicitud</h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* PASO 1: Categoria con cards */}
          <Card title="1. Categoria de la solicitud" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CATEGORIAS.map((c) => {
                const sel = categoria === c.v;
                const Icon = c.icon;
                return (
                  <button type="button" key={c.v} onClick={() => setCategoria(c.v)}
                    className="text-left p-4 rounded-2xl border-2 transition-all"
                    style={{
                      borderColor: sel ? c.color : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                      background: sel ? c.color + "15" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)"),
                      boxShadow: sel ? `0 8px 24px ${c.color}30` : "none",
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: c.color + "22", color: c.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: sel ? c.color : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"),
                                 background: sel ? c.color : "transparent" }}>
                        {sel && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${theme.textPrimary}`}>{c.l}</p>
                    <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>{c.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* PASO 2: Tipo especifico con cuadros */}
          <Card title="2. Selecciona el tipo especifico" isDark={isDark}
            subtitle={tiposFiltrados.length === 0
              ? "No hay tipos configurados aun. Pide al admin que los agregue en /admin/catalogos-rh."
              : "Marca el tipo que mejor describe tu solicitud."}>
            {tiposFiltrados.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Sin tipos de {categoria.toLowerCase()} disponibles.</p>
                <Link href="/admin/catalogos-rh" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                  Configurar tipos (solo admin)
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tiposFiltrados.map((t) => {
                  const sel = tipoId === t.id;
                  return (
                    <label key={t.id}
                      className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                      style={{
                        borderColor: sel ? t.color : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                        background: sel ? t.color + "12" : "transparent",
                      }}>
                      <input type="checkbox" checked={sel} onChange={() => setTipoId(t.id)}
                        className="mt-1 accent-blue-500 w-4 h-4 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`font-bold text-sm ${theme.textPrimary}`}>{t.nombre}</p>
                          {!t.con_goce_sueldo && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              SIN GOCE
                            </span>
                          )}
                        </div>
                        {t.descripcion && (
                          <p className={`text-[11px] ${theme.textTertiary}`}>{t.descripcion}</p>
                        )}
                        <div className="flex gap-2 mt-1.5">
                          {t.requiere_documento && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                              REQUIERE DOC
                            </span>
                          )}
                          {t.dias_maximos != null && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              MAX {t.dias_maximos} DIAS
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          {/* PASO 3: Datos */}
          <Card title="3. Datos de la solicitud" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Empleado */}
              <Field label="Empleado *" className="sm:col-span-2">
                <select className={inputCls} value={empleadoId ?? ""}
                  onChange={(e) => setEmpleadoId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Selecciona —</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.numero_empleado} · {e.nombre}{e.puesto_nombre ? ` · ${e.puesto_nombre}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={categoria === "PRESTAMO" ? "Fecha solicitud *" : "Fecha inicio *"}>
                <input type="date" className={inputCls} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </Field>

              {categoria !== "PRESTAMO" && (
                <Field label="Fecha fin">
                  <input type="date" className={inputCls} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </Field>
              )}

              {categoria !== "PRESTAMO" && dias > 0 && (
                <Field label="Dias calculados" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <input type="number" readOnly className={`${inputCls} bg-slate-50 dark:bg-slate-800/50 font-bold`} value={dias} />
                    {tipoSeleccionado?.dias_maximos != null && dias > tipoSeleccionado.dias_maximos && (
                      <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Excede {tipoSeleccionado.dias_maximos} dias permitidos
                      </span>
                    )}
                  </div>
                </Field>
              )}

              {categoria === "PRESTAMO" && (
                <>
                  <Field label="Monto solicitado *">
                    <input type="number" step="0.01" min="0" className={inputCls} value={monto}
                      onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Cuotas (meses)">
                    <input type="number" min="1" className={inputCls} value={cuotas}
                      onChange={(e) => setCuotas(e.target.value)} placeholder="12" />
                  </Field>
                </>
              )}

              <Field label="Motivo / detalles" className="sm:col-span-2">
                <textarea rows={3} className={inputCls + " resize-y"} value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describe brevemente el motivo de la solicitud..." />
              </Field>

              {tipoSeleccionado?.requiere_documento && (
                <Field label="Documento adjunto (obligatorio para este tipo)" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all"
                      style={{ borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }}>
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 truncate">
                        {documento ? documento.name : "Click para subir archivo (PDF, JPG, PNG)"}
                      </span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden
                        onChange={(e) => setDocumento(e.target.files?.[0] || null)} />
                    </label>
                    {documento && (
                      <button type="button" onClick={() => setDocumento(null)}
                        className="text-xs font-bold text-rose-500 hover:underline">
                        Quitar
                      </button>
                    )}
                  </div>
                </Field>
              )}
            </div>
          </Card>

          {/* Footer */}
          <div className="sticky bottom-0 backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              background: isDark ? "rgba(8,12,24,0.92)" : "rgba(255,255,255,0.92)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}>
            <Link href="/mis-solicitudes" className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <div className="flex-1" />
            <button type="submit" disabled={saving || !tipoId || !empleadoId}
              className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white shadow-lg disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366F1,#3B82F6)" }}>
              <Save size={14} /> {saving ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, isDark }: any) {
  return (
    <div className="rounded-2xl border p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-500">{label}</span>
      {children}
    </label>
  );
}
