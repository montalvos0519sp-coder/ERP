"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle, Clock, FileText, MessageSquare, Plus, RefreshCw,
  Search, ThumbsDown, ThumbsUp, X, XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Solicitud {
  id: number;
  tipo: number;
  tipo_nombre: string;
  tipo_categoria: string;
  tipo_color: string;
  empleado: number;
  empleado_nombre: string;
  empleado_numero: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  motivo: string;
  documento: string | null;
  estado: "PEND" | "APROB" | "RECH" | "CANC";
  fecha_solicitud: string;
  solicitado_por_username: string;
  aprobado_por_username: string;
  comentarios_aprobacion: string;
}

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PEND:  { label: "Pendiente", color: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-200/70", icon: Clock },
  APROB: { label: "Aprobado",  color: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200/70", icon: CheckCircle },
  RECH:  { label: "Rechazado", color: "#EF4444", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-200/70", icon: XCircle },
  CANC:  { label: "Cancelado", color: "#94A3B8", bg: "bg-slate-100 dark:bg-slate-800 text-slate-500 ring-slate-200", icon: X },
};

const FILTROS = [
  { v: "PEND",  l: "Pendientes",   color: "#F59E0B" },
  { v: "APROB", l: "Aprobados",    color: "#10B981" },
  { v: "RECH",  l: "Rechazados",   color: "#EF4444" },
  { v: "CANC",  l: "Cancelados",   color: "#94A3B8" },
  { v: "",      l: "Todos",        color: "#6366F1" },
];

function fmt(d: string | null) {
  if (!d) return "—";
  const t = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (isNaN(+t)) return d;
  return t.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PermisosPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("PEND");
  const [q, setQ] = useState("");

  const load = async () => {
    if (!empresaActivaId) return;
    setLoading(true);
    try {
      // Filtramos por categoria PERMISO via tipo__categoria.
      const params: Record<string, string> = {
        empresa: String(empresaActivaId),
        page_size: "200",
      };
      const r = await api.getSolicitudesRH(params);
      const all = (r.results || []) as Solicitud[];
      // Filtrar solo categoria PERMISO en el cliente.
      setData(all.filter((s) => s.tipo_categoria === "PERMISO"));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaActivaId]);

  const filtered = useMemo(() => {
    let res = estado ? data.filter((s) => s.estado === estado) : data;
    if (q.trim()) {
      const t = q.toLowerCase();
      res = res.filter((s) =>
        (s.empleado_nombre || "").toLowerCase().includes(t) ||
        (s.empleado_numero || "").toLowerCase().includes(t) ||
        (s.tipo_nombre || "").toLowerCase().includes(t) ||
        (s.motivo || "").toLowerCase().includes(t),
      );
    }
    return res;
  }, [data, estado, q]);

  const counts = useMemo(() => ({
    total: data.length,
    pend: data.filter((s) => s.estado === "PEND").length,
    aprob: data.filter((s) => s.estado === "APROB").length,
    rech: data.filter((s) => s.estado === "RECH").length,
  }), [data]);

  // Modal de aprobacion/rechazo
  const [modal, setModal] = useState<null | {
    kind: "APROBAR" | "RECHAZAR";
    solicitud: Solicitud;
  }>(null);
  const [modalComentario, setModalComentario] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const aprobar = (s: Solicitud) => {
    setModalComentario("");
    setModalError(null);
    setModal({ kind: "APROBAR", solicitud: s });
  };
  const rechazar = (s: Solicitud) => {
    setModalComentario("");
    setModalError(null);
    setModal({ kind: "RECHAZAR", solicitud: s });
  };

  const cerrarModal = () => {
    if (modalSaving) return;
    setModal(null);
    setModalError(null);
  };

  const confirmarModal = async () => {
    if (!modal) return;
    const { kind, solicitud } = modal;
    if (kind === "RECHAZAR" && !modalComentario.trim()) {
      setModalError("Debes capturar un motivo de rechazo.");
      return;
    }
    setModalSaving(true);
    setModalError(null);
    try {
      if (kind === "APROBAR") {
        await api.aprobarSolicitudRH(solicitud.id, modalComentario);
      } else {
        await api.rechazarSolicitudRH(solicitud.id, modalComentario);
      }
      setModal(null);
      load();
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 dark:border-transparent bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900 p-5 sm:p-6 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_60%)]" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-[0.18em] mb-2 ring-1 ring-indigo-200 dark:ring-indigo-500/25">
                Recursos Humanos · Permisos
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-white/10 flex items-center justify-center ring-1 ring-indigo-200 dark:ring-white/10 shrink-0">
                  <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                </span>
                Solicitudes de Permisos
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                {counts.total} permiso{counts.total !== 1 ? "s" : ""} ·
                <span className="text-amber-600 dark:text-amber-400 font-bold"> {counts.pend} pendiente{counts.pend !== 1 ? "s" : ""}</span> ·
                <span className="text-emerald-600 dark:text-emerald-400 font-bold"> {counts.aprob} aprobado{counts.aprob !== 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
              </button>
              <Link href="/mis-solicitudes/nueva?cat=PERMISO"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm"
                style={{ background: "linear-gradient(135deg,#6366F1,#3B82F6)" }}>
                <Plus size={13} /> Nuevo permiso
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { l: "Total",        v: counts.total, c: "#6366F1", i: FileText },
            { l: "Pendientes",   v: counts.pend,  c: "#F59E0B", i: Clock },
            { l: "Aprobados",    v: counts.aprob, c: "#10B981", i: CheckCircle },
            { l: "Rechazados",   v: counts.rech,  c: "#EF4444", i: XCircle },
          ].map((k) => {
            const Icon = k.i;
            return (
              <div key={k.l} className="rounded-2xl border p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{k.l}</span>
                  <Icon size={14} style={{ color: k.c }} />
                </div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: k.c }}>{k.v}</p>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {FILTROS.map((f) => {
              const sel = estado === f.v;
              return (
                <button key={f.v} onClick={() => setEstado(f.v)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                  style={{
                    background: sel ? f.color : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,1)"),
                    color: sel ? "#fff" : (isDark ? "#94a3b8" : "#475569"),
                    border: sel ? "none" : (isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)"),
                  }}>
                  {f.l}
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Empleado, tipo, motivo..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
          </div>
        </div>

        {/* Modal aprobar / rechazar */}
        <AccionModal
          modal={modal}
          comentario={modalComentario}
          setComentario={setModalComentario}
          error={modalError}
          saving={modalSaving}
          onClose={cerrarModal}
          onConfirm={confirmarModal}
          isDark={isDark}
        />

        {/* Lista */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <FileText size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                {estado ? `Sin permisos ${ESTADO_INFO[estado]?.label?.toLowerCase()}` : "Sin permisos solicitados"}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Los empleados pueden solicitar permisos desde <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">/mis-solicitudes/nueva</code>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => {
                const ei = ESTADO_INFO[s.estado] || ESTADO_INFO.PEND;
                const EI = ei.icon;
                return (
                  <div key={s.id} className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                      {/* Avatar circular */}
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white shrink-0"
                        style={{ background: s.tipo_color || "#6366F1" }}>
                        {(s.empleado_nombre?.[0] || "?").toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-black text-sm sm:text-base text-slate-800 dark:text-white">{s.empleado_nombre}</p>
                          <span className="text-[10px] font-mono text-slate-400">#{s.empleado_numero}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${ei.bg}`}>
                            <EI className="w-3 h-3" /> {ei.label}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold mt-1" style={{ color: s.tipo_color || "#6366F1" }}>
                          {s.tipo_nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {fmt(s.fecha_inicio)}{s.fecha_fin && ` → ${fmt(s.fecha_fin)}`}
                          {s.dias > 0 && ` · ${s.dias} dia${s.dias !== 1 ? "s" : ""}`}
                          {" · Solicitado el "}{fmt(s.fecha_solicitud)}
                        </p>
                        {s.motivo && (
                          <p className="text-[12px] mt-2 text-slate-600 dark:text-slate-300 line-clamp-2">
                            <span className="font-bold">Motivo:</span> {s.motivo}
                          </p>
                        )}
                        {s.comentarios_aprobacion && s.estado !== "PEND" && (
                          <p className="text-[11px] mt-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                            <span className="font-bold">{s.aprobado_por_username || "Staff"}:</span> {s.comentarios_aprobacion}
                          </p>
                        )}
                        {s.documento && (
                          <a href={s.documento} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            <FileText size={11} /> Ver documento adjunto
                          </a>
                        )}
                      </div>

                      {/* Acciones */}
                      {s.estado === "PEND" && (
                        <div className="flex gap-2 shrink-0 mt-2 sm:mt-0">
                          <button onClick={() => aprobar(s)}
                            title="Aprobar"
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm">
                            <ThumbsUp size={13} /> Aprobar
                          </button>
                          <button onClick={() => rechazar(s)}
                            title="Rechazar"
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-rose-500 text-white hover:bg-rose-600 shadow-sm">
                            <ThumbsDown size={13} /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal in-system para aprobar/rechazar (reemplaza window.prompt)
interface AccionModalProps {
  modal: null | { kind: "APROBAR" | "RECHAZAR"; solicitud: Solicitud };
  comentario: string;
  setComentario: (v: string) => void;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDark: boolean;
}

function AccionModal({
  modal, comentario, setComentario, error, saving, onClose, onConfirm, isDark,
}: AccionModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autoenfoque + ESC para cerrar + Ctrl+Enter para confirmar
  useEffect(() => {
    if (!modal) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [modal, onClose, onConfirm]);

  if (!modal) return null;

  const isAprobar = modal.kind === "APROBAR";
  const s = modal.solicitud;
  const color = isAprobar ? "#10B981" : "#EF4444";
  const colorSoft = isAprobar
    ? "from-emerald-500 to-teal-500"
    : "from-rose-500 to-red-500";
  const Icon = isAprobar ? ThumbsUp : ThumbsDown;
  const HeaderIcon = isAprobar ? CheckCircle : AlertTriangle;
  const title = isAprobar ? "Aprobar solicitud" : "Rechazar solicitud";
  const subtitle = isAprobar
    ? "Confirma la aprobacion y deja un comentario opcional."
    : "Captura el motivo. El empleado vera tu comentario.";
  const placeholder = isAprobar
    ? "Comentario opcional (visible para el empleado)"
    : "Ejemplo: La fecha solicitada coincide con cierre de mes...";
  const cta = isAprobar ? "Aprobar" : "Rechazar";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accion-modal-title"
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_.18s_ease-out]"
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
          isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
        } animate-[modalIn_.22s_cubic-bezier(0.16,1,0.3,1)]`}
      >
        {/* Banda de color superior */}
        <div className={`h-1.5 bg-gradient-to-r ${colorSoft}`} />

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: color + (isDark ? "26" : "18"), color }}
          >
            <HeaderIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="accion-modal-title" className={`text-base sm:text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
              {title}
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className={`p-2 -mr-2 -mt-1 rounded-lg transition-colors disabled:opacity-50 ${
              isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen solicitud */}
        <div className={`mx-5 sm:mx-6 mb-3 p-3 rounded-xl border flex items-center gap-3 ${
          isDark ? "bg-slate-800/50 border-white/[0.06]" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white shrink-0 text-[12px]"
            style={{ background: s.tipo_color || "#6366F1" }}>
            {(s.empleado_nombre?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-800"}`}>
              {s.empleado_nombre} <span className="text-[10px] font-mono text-slate-400">#{s.empleado_numero}</span>
            </p>
            <p className="text-[11px] font-bold truncate" style={{ color: s.tipo_color || "#6366F1" }}>
              {s.tipo_nombre}
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div className="px-5 sm:px-6 pb-2">
          <label className={`flex items-center justify-between text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span className="flex items-center gap-1.5">
              <MessageSquare size={11} />
              {isAprobar ? "Comentario" : "Motivo del rechazo"}
            </span>
            <span className={isAprobar
              ? (isDark ? "text-slate-500" : "text-slate-400")
              : "text-rose-500"}>
              {isAprobar ? "Opcional" : "Obligatorio"}
            </span>
          </label>
          <textarea
            ref={textareaRef}
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={saving}
            placeholder={placeholder}
            maxLength={500}
            className={`w-full resize-y rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${
              isDark
                ? "bg-slate-800/60 border border-white/[0.08] text-white placeholder:text-slate-500 focus:border-white/30"
                : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
            } focus:ring-2`}
            style={{ boxShadow: "none", outlineColor: color }}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Ctrl+Enter para confirmar · Esc para cancelar
            </span>
            <span className={`text-[10px] tabular-nums ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {comentario.length}/500
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-5 sm:mx-6 mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className={`px-5 sm:px-6 py-3.5 flex items-center justify-end gap-2 border-t ${
          isDark ? "bg-slate-900/60 border-white/[0.06]" : "bg-slate-50/60 border-slate-100"
        }`}>
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 ${
              isDark
                ? "text-slate-300 hover:text-white hover:bg-white/5 border border-white/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || (!isAprobar && !comentario.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.02] active:scale-95"
            style={{ background: `linear-gradient(135deg,${color},${color}dd)`, boxShadow: `0 6px 18px ${color}40` }}
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Icon size={13} /> {cta}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Keyframes inline (solo este componente las necesita) */}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  );
}
