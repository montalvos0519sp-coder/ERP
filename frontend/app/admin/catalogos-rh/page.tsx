"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote, Bell, CheckCircle, Edit2, FileText, Plus, RefreshCw, Save, ShieldCheck, Sun, Trash2, Users, X,
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
  { v: "PERMISO" as const, l: "Permisos", icon: FileText, color: "#6366F1" },
  { v: "VACACION" as const, l: "Vacaciones", icon: Sun, color: "#14B8A6" },
  { v: "PRESTAMO" as const, l: "Prestamos", icon: Banknote, color: "#F59E0B" },
];

interface FormData {
  id?: number;
  categoria: "PERMISO" | "VACACION" | "PRESTAMO";
  nombre: string;
  descripcion: string;
  color: string;
  requiere_documento: boolean;
  dias_maximos: string;
  con_goce_sueldo: boolean;
  requiere_aprobacion: boolean;
  activo: boolean;
}

const FORM_VACIO: FormData = {
  categoria: "PERMISO",
  nombre: "",
  descripcion: "",
  color: "#6366F1",
  requiere_documento: false,
  dias_maximos: "",
  con_goce_sueldo: true,
  requiere_aprobacion: true,
  activo: true,
};

export default function CatalogosRHPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [tipos, setTipos] = useState<TipoSolicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      const r = await api.getTiposSolicitud({ empresa: String(empresaActivaId) });
      setTipos(r.results || []);
    } catch {
      setTipos([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId]);

  const grouped = useMemo(() => {
    const out: Record<string, TipoSolicitud[]> = { PERMISO: [], VACACION: [], PRESTAMO: [] };
    tipos.forEach((t) => { (out[t.categoria] = out[t.categoria] || []).push(t); });
    return out;
  }, [tipos]);

  const startNew = (cat: "PERMISO" | "VACACION" | "PRESTAMO") => {
    setError(null);
    setEditing({ ...FORM_VACIO, categoria: cat, color: CATEGORIAS.find((c) => c.v === cat)!.color });
  };

  const startEdit = (t: TipoSolicitud) => {
    setError(null);
    setEditing({
      id: t.id,
      categoria: t.categoria,
      nombre: t.nombre,
      descripcion: t.descripcion,
      color: t.color,
      requiere_documento: t.requiere_documento,
      dias_maximos: t.dias_maximos != null ? String(t.dias_maximos) : "",
      con_goce_sueldo: t.con_goce_sueldo,
      requiere_aprobacion: t.requiere_aprobacion,
      activo: t.activo,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.nombre.trim()) { setError("Captura un nombre."); return; }
    if (!empresaActivaId) { setError("Sin empresa activa."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        empresa: empresaActivaId,
        categoria: editing.categoria,
        nombre: editing.nombre.trim(),
        descripcion: editing.descripcion.trim(),
        color: editing.color,
        requiere_documento: editing.requiere_documento,
        dias_maximos: editing.dias_maximos ? Number(editing.dias_maximos) : null,
        con_goce_sueldo: editing.con_goce_sueldo,
        requiere_aprobacion: editing.requiere_aprobacion,
        activo: editing.activo,
      };
      if (editing.id) {
        await api.actualizarTipoSolicitud(editing.id, payload);
      } else {
        await api.crearTipoSolicitud(payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: TipoSolicitud) => {
    if (!confirm(`¿Eliminar tipo "${t.nombre}"?`)) return;
    try {
      await api.eliminarTipoSolicitud(t.id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const cargarSugeridos = async () => {
    if (!empresaActivaId) return;
    if (!confirm("Esto creara los tipos comunes (permisos medico, personal, defuncion, paternidad, etc.; vacaciones; prestamos) para que el catalogo no este vacio. Los que ya existan no se duplican. ¿Continuar?")) return;
    try {
      const r = await api.cargarTiposSugeridos(empresaActivaId);
      alert(`Creados ${r.creados} tipo${r.creados === 1 ? "" : "s"} nuevo${r.creados === 1 ? "" : "s"} (de ${r.total_sugeridos} sugeridos).`);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const inputCls = isDark
    ? "w-full bg-slate-900/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-violet-400/50 focus:bg-slate-900/80 placeholder:text-slate-500"
    : "w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500/50";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613] relative">
      {/* Ambient glow para dark mode */}
      <div className="hidden dark:block pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[460px] h-[460px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-500/15 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 dark:from-violet-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 p-5 sm:p-6 shadow-sm dark:shadow-[0_8px_32px_-12px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_55%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-violet-200 dark:ring-violet-400/30">
                Administracion · Catalogos RH
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center ring-1 ring-violet-200 dark:ring-violet-400/30 dark:shadow-[0_0_24px_rgba(139,92,246,0.25)] shrink-0">
                  <FileText size={20} className="text-violet-600 dark:text-violet-300" />
                </span>
                Tipos de Solicitud
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                Configura los tipos de permisos, vacaciones y prestamos que los empleados pueden solicitar.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={cargarSugeridos}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm dark:shadow-[0_6px_20px_-4px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                <Plus size={13} /> Cargar tipos sugeridos
              </button>
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 dark:hover:bg-white/[0.08] dark:text-slate-300 transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* CTA vacio: si no hay ningun tipo */}
        {!loading && tipos.length === 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 dark:from-violet-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 border-2 border-dashed border-violet-300 dark:border-violet-500/30 rounded-2xl p-6 sm:p-8 text-center dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.10),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex w-16 h-16 rounded-2xl bg-violet-500/15 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 items-center justify-center mb-3 ring-1 ring-violet-200 dark:ring-violet-400/30 dark:shadow-[0_0_32px_rgba(139,92,246,0.3)]">
                <FileText size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mb-2">
                Aun no hay tipos configurados
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 max-w-xl mx-auto">
                Carga el set basico de tipos comunes (permisos medico/personal/defuncion/paternidad/maternidad, vacaciones pagadas y sin goce, prestamos personal/emergencia/anticipo) o crea los tuyos uno por uno.
              </p>
              <button onClick={cargarSugeridos}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white shadow-lg dark:shadow-[0_8px_28px_-6px_rgba(139,92,246,0.6)] hover:scale-[1.02] active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                <Plus size={16} /> Cargar tipos sugeridos
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-500/30 text-sm text-red-700 dark:text-rose-300 dark:shadow-[0_4px_16px_-4px_rgba(244,63,94,0.25)]">
            {error}
          </div>
        )}

        {/* Formulario modal embebido */}
        {editing && (
          <div className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]"
            style={{ borderColor: editing.color }}>
            <div className="hidden dark:block absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${editing.color}1f, transparent 55%)` }} />
            <div className="relative flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: editing.color }}>
                  {editing.id ? "Editando" : "Nuevo"} · {editing.categoria}
                </p>
                <h3 className="text-lg font-black mt-1 text-slate-800 dark:text-white">
                  {editing.id ? `Editar tipo "${editing.nombre}"` : "Nuevo tipo de solicitud"}
                </h3>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre *">
                <input className={inputCls} value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  placeholder="Ej: Permiso medico, Vacaciones pagadas..." />
              </Field>
              <Field label="Color identificador">
                <input type="color" className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                  value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              </Field>
              <Field label="Descripcion" className="sm:col-span-2">
                <textarea rows={2} className={inputCls + " resize-y"} value={editing.descripcion}
                  onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                  placeholder="Detalles que el empleado vera al elegir este tipo..." />
              </Field>
              <Field label="Dias maximos por solicitud (opcional)">
                <input type="number" min="0" className={inputCls} value={editing.dias_maximos}
                  onChange={(e) => setEditing({ ...editing, dias_maximos: e.target.value })}
                  placeholder="Ej: 3, 15, vacio = sin tope" />
              </Field>
              <div /> {/* spacer */}

              {/* Toggles */}
              <Toggle isDark={isDark}
                title="Requiere documento adjunto"
                desc="El empleado debe subir un archivo (incapacidad, comprobante, etc.)"
                checked={editing.requiere_documento}
                onChange={(v) => setEditing({ ...editing, requiere_documento: v })} />
              <Toggle isDark={isDark}
                title="Con goce de sueldo"
                desc="La empresa paga durante la ausencia"
                checked={editing.con_goce_sueldo}
                onChange={(v) => setEditing({ ...editing, con_goce_sueldo: v })} />
              <Toggle isDark={isDark}
                title="Requiere aprobacion"
                desc="Necesita que el staff/RH apruebe antes de aplicar"
                checked={editing.requiere_aprobacion}
                onChange={(v) => setEditing({ ...editing, requiere_aprobacion: v })} />
              <Toggle isDark={isDark}
                title="Activo"
                desc="Si esta inactivo, los empleados no lo veran al solicitar"
                checked={editing.activo}
                onChange={(v) => setEditing({ ...editing, activo: v })} />
            </div>

            <div className="relative flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 dark:hover:bg-white/[0.04] transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white shadow-lg disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg," + editing.color + "," + editing.color + "cc)",
                  boxShadow: `0 8px 28px -8px ${editing.color}80`,
                }}>
                <Save size={14} /> {saving ? "Guardando..." : "Guardar tipo"}
              </button>
            </div>
          </div>
        )}

        {/* 3 secciones */}
        {CATEGORIAS.map((cat) => {
          const Icon = cat.icon;
          const list = grouped[cat.v] || [];
          return (
            <div key={cat.v}
              className="relative rounded-2xl border bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-slate-200/70 dark:border-white/[0.06] overflow-hidden dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] transition-shadow"
              style={{ borderTopColor: isDark ? cat.color + "55" : undefined, borderTopWidth: isDark ? 2 : undefined }}>
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.04] relative"
                style={{ background: cat.color + (isDark ? "12" : "08") }}>
                <div className="hidden dark:block absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(90deg, ${cat.color}1c, transparent 60%)` }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center ring-1"
                    style={{
                      background: cat.color + (isDark ? "26" : "22"),
                      color: cat.color,
                      borderColor: cat.color + "30",
                      boxShadow: isDark ? `0 0 24px ${cat.color}33` : undefined,
                    } as React.CSSProperties}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">{cat.l}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{list.length} tipo{list.length !== 1 ? "s" : ""} configurado{list.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button onClick={() => startNew(cat.v)}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm hover:scale-[1.04] active:scale-95 transition-transform"
                  style={{
                    background: cat.color,
                    boxShadow: isDark ? `0 6px 20px -6px ${cat.color}80` : undefined,
                  }}>
                  <Plus size={12} /> Agregar
                </button>
              </div>

              {list.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  Sin tipos configurados. Haz click en "Agregar" para crear el primero.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {list.map((t) => (
                    <div key={t.id} className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: t.color + (isDark ? "26" : "22"),
                          color: t.color,
                          boxShadow: isDark ? `0 0 12px ${t.color}26` : undefined,
                        } as React.CSSProperties}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{t.nombre}</p>
                          {!t.activo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">INACTIVO</span>}
                          {t.requiere_documento && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 dark:ring-1 dark:ring-rose-500/25">DOC</span>}
                          {!t.con_goce_sueldo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:ring-1 dark:ring-amber-500/25">SIN GOCE</span>}
                          {t.dias_maximos != null && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">MAX {t.dias_maximos}d</span>}
                        </div>
                        {t.descripcion && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{t.descripcion}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(t)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => remove(t)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Panel: destinatarios de notificaciones RH */}
        <NotifConfigPanel empresaId={empresaActivaId} isDark={isDark} />

        {/* Hint */}
        <div className="relative overflow-hidden bg-blue-50 dark:bg-blue-500/[0.06] border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 dark:shadow-[0_4px_20px_-8px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.04)] dark:backdrop-blur-xl">
          <div className="hidden dark:block absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at left, rgba(59,130,246,0.10), transparent 60%)" }} />
          <div className="relative w-9 h-9 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 dark:ring-1 dark:ring-blue-400/30 dark:shadow-[0_0_16px_rgba(59,130,246,0.3)]">
            <CheckCircle size={18} />
          </div>
          <div className="relative">
            <p className="font-bold text-sm text-blue-900 dark:text-blue-200">Como funciona</p>
            <p className="text-xs text-blue-700 dark:text-blue-300/80 mt-1">
              Los tipos que configures aqui aparecen como opciones de checkbox en la pantalla
              <code className="px-1 py-0.5 mx-1 rounded bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200 font-mono text-[10px] dark:ring-1 dark:ring-blue-400/20">/mis-solicitudes/nueva</code>
              donde los empleados crean sus solicitudes. Los empleados solo ven los tipos marcados como activos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

interface UsuarioNotif {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  rol: string;
  notif_activo: boolean;
}

function NotifConfigPanel({ empresaId, isDark }: { empresaId: number | null; isDark: boolean }) {
  const [usuarios, setUsuarios] = useState<UsuarioNotif[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const r = await api.getConfigNotifUsuarios(empresaId);
      setUsuarios(r.results || []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId]);

  const toggle = async (u: UsuarioNotif) => {
    if (!empresaId) return;
    setSaving(u.user_id);
    const nuevo = !u.notif_activo;
    setUsuarios((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, notif_activo: nuevo } : x));
    try {
      await api.setConfigNotifUsuario(empresaId, u.user_id, nuevo);
    } catch (e) {
      setErr((e as Error).message);
      setUsuarios((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, notif_activo: !nuevo } : x));
    } finally {
      setSaving(null);
    }
  };

  const totalActivos = usuarios.filter((u) => u.notif_activo).length;
  const initialsOf = (u: UsuarioNotif) => {
    const a = u.first_name?.[0] || "";
    const b = u.last_name?.[0] || "";
    return (a + b || u.username.slice(0, 2)).toUpperCase();
  };
  const nameOf = (u: UsuarioNotif) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;

  return (
    <div className="relative rounded-2xl border bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border-amber-200/70 dark:border-amber-500/20 overflow-hidden dark:shadow-[0_8px_32px_-12px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="relative flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-amber-100 dark:border-amber-500/15"
        style={{ background: "linear-gradient(90deg,rgba(245,158,11,0.10),rgba(245,158,11,0.02))" }}>
        <div className="hidden dark:block absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at top left, rgba(245,158,11,0.12), transparent 60%)" }} />
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-amber-200 dark:ring-amber-400/30 dark:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            style={{ background: isDark ? "rgba(245,158,11,0.20)" : "rgba(245,158,11,0.18)", color: isDark ? "#FCD34D" : "#D97706" }}>
            <Bell size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">
              Destinatarios de notificaciones
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {totalActivos} usuario{totalActivos !== 1 ? "s" : ""} recibira{totalActivos === 1 ? "" : "n"} aviso cuando entre una solicitud RH (permiso, vacacion, prestamo)
            </p>
          </div>
        </div>
        <button onClick={load}
          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      {err && (
        <div className="mx-4 sm:mx-6 mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-rose-500/[0.08] border border-red-200 dark:border-rose-500/30 text-xs text-red-700 dark:text-rose-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">Cargando usuarios...</div>
      ) : usuarios.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
          <Users size={32} className="mx-auto mb-2 opacity-40" />
          Sin usuarios en esta empresa.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {usuarios.map((u) => (
            <div key={u.user_id} className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white dark:shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
                {initialsOf(u)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{nameOf(u)}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-300">@{u.username}</span>
                  {u.is_staff && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 dark:ring-1 dark:ring-violet-400/25">
                      <ShieldCheck size={9} /> STAFF
                    </span>
                  )}
                  {u.rol && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 dark:ring-1 dark:ring-blue-400/25">
                      {u.rol}
                    </span>
                  )}
                </div>
                {u.email && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{u.email}</p>}
              </div>
              <button
                type="button"
                disabled={saving === u.user_id}
                onClick={() => toggle(u)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shrink-0 disabled:opacity-50 ${
                  u.notif_activo
                    ? "bg-amber-500 dark:bg-amber-400 dark:shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                    : isDark ? "bg-slate-700" : "bg-slate-300"
                }`}
                title={u.notif_activo ? "Recibe notificaciones" : "Sin notificaciones"}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${u.notif_activo ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/60 dark:bg-white/[0.015]">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <strong className="text-slate-600 dark:text-slate-200">Tip:</strong> activa solo a los administradores o RH que deben enterarse de cada solicitud nueva. Si nadie esta activo, el sistema notifica por defecto a los staff/managers de la empresa.
        </p>
      </div>
    </div>
  );
}

function Toggle({ title, desc, checked, onChange, isDark }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; isDark: boolean }) {
  return (
    <label
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        checked
          ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/[0.06]"
          : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-white">{title}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shrink-0 ${
          checked
            ? "bg-emerald-500 dark:bg-emerald-400 dark:shadow-[0_0_14px_rgba(16,185,129,0.5)]"
            : isDark ? "bg-slate-700" : "bg-slate-300"
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
