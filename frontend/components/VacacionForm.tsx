"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Save, AlertTriangle, CheckCircle, Settings2, RefreshCw, Info, History } from "lucide-react";
import { api } from "@/lib/api";

interface Balance {
  empleado_id: string; empleado: string; anio: number;
  dias_correspondientes: number; dias_extra: number;
  dias_tomados: number; dias_pendientes_solicitud: number; restantes: number;
}

interface EmpleadoLite { id: string; nombre: string; }

const TIPOS = [
  { v: "ORDINARIAS",  l: "Vacaciones Ordinarias" },
  { v: "ANTICIPADAS", l: "Vacaciones Anticipadas" },
  { v: "PRORROGA",    l: "Prórroga" },
  { v: "EXTRA",       l: "Vacaciones Extra" },
  { v: "HISTORICO",   l: "Registro Histórico" },
];

function diasEntre(ini: string, fin: string): number {
  if (!ini || !fin) return 0;
  const a = new Date(ini + "T00:00:00");
  const b = new Date(fin + "T00:00:00");
  if (isNaN(+a) || isNaN(+b) || b < a) return 0;
  return Math.floor((+b - +a) / 86400000) + 1;
}

export default function VacacionForm() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoQ, setEmpleadoQ] = useState("");
  const [tipo, setTipo] = useState("ORDINARIAS");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [observaciones, setObservaciones] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgCorr, setCfgCorr] = useState(0);
  const [cfgExtra, setCfgExtra] = useState(0);
  const [cfgSaving, setCfgSaving] = useState(false);

  useEffect(() => {
    api.getRHSupervisores()
      .then((r: any) => setEmpleados(Array.isArray(r) ? r : r.results ?? []))
      .catch(() => {});
  }, []);

  const loadBalance = async (id: string) => {
    if (!id) { setBalance(null); return; }
    setLoadingBalance(true);
    try {
      const b = await api.getBalanceVacaciones(id) as Balance;
      setBalance(b);
      setCfgCorr(b.dias_correspondientes);
      setCfgExtra(b.dias_extra);
    } catch {
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => { loadBalance(empleadoId); }, [empleadoId]);

  const guardarConfig = async () => {
    if (!empleadoId) return;
    setCfgSaving(true);
    try {
      await api.setBalanceVacaciones(empleadoId, { dias_correspondientes: cfgCorr, dias_extra: cfgExtra });
      await loadBalance(empleadoId);
      setCfgOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      setCfgSaving(false);
    }
  };

  const empleadosFiltrados = useMemo(() => {
    const q = empleadoQ.trim().toLowerCase();
    return q
      ? empleados.filter(e => (e.nombre ?? "").toLowerCase().includes(q))
      : empleados;
  }, [empleados, empleadoQ]);

  const dias = diasEntre(fechaInicio, fechaFin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!empleadoId) { setError("Selecciona un empleado."); return; }
    if (!fechaInicio || !fechaFin) { setError("Indica fechas de inicio y fin."); return; }
    if (dias <= 0) { setError("La fecha fin debe ser igual o posterior a la de inicio."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("empleado_id", empleadoId);
      fd.append("tipo_vacacion", tipo);
      fd.append("fecha_inicio", fechaInicio);
      fd.append("fecha_fin", fechaFin);
      fd.append("dias_solicitados", String(dias));
      fd.append("periodo_correspondiente", periodo);
      if (observaciones.trim()) fd.append("observaciones", observaciones.trim());
      if (documento) fd.append("documento_solicitud", documento);
      await api.crearVacacionRH(fd);
      setOk(true);
      setTimeout(() => router.push("/rh/vacaciones"), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la solicitud.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/rh/vacaciones"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-500" /> Nueva Solicitud de Vacaciones
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
            <CheckCircle size={16} /> Solicitud creada correctamente.
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Info size={15} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 mb-2">
                ¿Cómo calcula el sistema los días de vacaciones?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                <div><span className="font-bold">1 año:</span> 12 días</div>
                <div><span className="font-bold">2 años:</span> 14 días</div>
                <div><span className="font-bold">3 años:</span> 16 días</div>
                <div><span className="font-bold">4 años:</span> 18 días</div>
                <div><span className="font-bold">5 años:</span> 20 días</div>
                <div><span className="font-bold">+5 años:</span> 20 + 2 por cada 5 años adicionales</div>
              </div>
              <div className="mt-3 text-[11.5px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <History size={12} className="mt-0.5 shrink-0 text-violet-500" />
                <span><span className="font-bold">Registro histórico:</span> para registrar vacaciones de años anteriores, selecciona el tipo <em>“Registro Histórico”</em>.</span>
              </div>
              <div className="mt-2 text-[11.5px] text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
                <CheckCircle size={12} className="mt-0.5 shrink-0" />
                <span>Las solicitudes creadas aquí quedan <span className="font-bold">aprobadas automáticamente</span>.</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 space-y-5">

          <div>
            <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Empleado <span className="text-red-400">*</span>
            </label>
            <input type="text" value={empleadoQ} onChange={e => setEmpleadoQ(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mb-2" />
            <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option value="">— Selecciona un empleado —</option>
              {empleadosFiltrados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {empleadoId && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
              {loadingBalance ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" /> Calculando balance…
                </div>
              ) : balance ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-300 uppercase tracking-widest">
                      Balance de Vacaciones · {balance.anio}
                    </div>
                    <button type="button" onClick={() => setCfgOpen(o => !o)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                      <Settings2 size={11} /> {cfgOpen ? "Cerrar" : "Configurar días"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <Stat label="Asignados" value={balance.dias_correspondientes + balance.dias_extra} tone="slate" />
                    <Stat label="Tomados" value={balance.dias_tomados} tone="emerald" />
                    <Stat label="En trámite" value={balance.dias_pendientes_solicitud} tone="amber" />
                    <Stat label="Restantes" value={balance.restantes} tone="blue" highlight />
                  </div>
                  {dias > 0 && dias > balance.restantes && (
                    <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={11} /> Estás solicitando más días ({dias}) que los disponibles ({balance.restantes}).
                    </p>
                  )}

                  {cfgOpen && (
                    <div className="mt-4 p-3 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-blue-200 dark:border-blue-900/40 space-y-3">
                      <div className="text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Centro de configuración — {balance.empleado}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Días correspondientes (LFT)</span>
                          <input type="number" min={0} value={cfgCorr}
                            onChange={e => setCfgCorr(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                        </label>
                        <label className="block">
                          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Días extra (bonificación)</span>
                          <input type="number" min={0} value={cfgExtra}
                            onChange={e => setCfgExtra(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={guardarConfig} disabled={cfgSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                          <Save size={11} /> {cfgSaving ? "Guardando…" : "Guardar configuración"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">Sin balance disponible.</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Tipo de vacación <span className="text-red-400">*</span>
              </label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Periodo (AÑO-MES) <span className="text-red-400">*</span>
              </label>
              <input type="text" value={periodo} onChange={e => setPeriodo(e.target.value)}
                placeholder="2026-04" pattern="\d{4}-\d{2}"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Fecha inicio <span className="text-red-400">*</span>
              </label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Fecha fin <span className="text-red-400">*</span>
              </label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Días
              </label>
              <div className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-bold">
                {dias || "—"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Observaciones
            </label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-y" />
          </div>

          <div>
            <label className="block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Documento de solicitud (opcional)
            </label>
            <input type="file" onChange={e => setDocumento(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/50 dark:file:text-blue-300" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link href="/rh/vacaciones"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none transition-colors">
              <Save size={13} /> {saving ? "Guardando…" : "Guardar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, highlight = false }: {
  label: string; value: number; tone: "slate" | "emerald" | "amber" | "blue"; highlight?: boolean;
}) {
  const toneMap = {
    slate:   "text-slate-600 dark:text-slate-300",
    emerald: "text-emerald-600 dark:text-emerald-300",
    amber:   "text-amber-600 dark:text-amber-300",
    blue:    "text-blue-600 dark:text-blue-300",
  };
  return (
    <div className={`rounded-lg px-2 py-2 ${highlight ? "bg-blue-600 text-white" : "bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900/30"}`}>
      <div className={`text-[9.5px] font-extrabold uppercase tracking-widest ${highlight ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-black mt-0.5 ${highlight ? "" : toneMap[tone]}`}>{value}</div>
    </div>
  );
}
