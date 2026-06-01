"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, Clock, Link2, Link2Off,
  ShieldCheck, ShieldX, Send, Users as UsersIcon, X,
} from "lucide-react";

import { api } from "@/lib/api";

type Estado = "BORRADOR" | "EN_REVISION" | "APROBADO" | "RECHAZADO";

interface DiagramaState {
  id: number;
  estado: Estado;
  aprobador: number | null;
  aprobador_username: string;
  enviado_aprobacion_en: string | null;
  visto_por_aprobador_en: string | null;
  decidido_en: string | null;
  decidido_por: number | null;
  decidido_por_username: string;
  comentario_decision: string;
  modulo_vinculado: number | null;
  modulo_nombre: string;
  modulo_codigo: string;
  es_inmutable: boolean;
  creado_por: number | null;
  historial_aprobacion: Array<{
    id: number;
    accion: "ENVIO" | "VISTO" | "APROBAR" | "RECHAZAR" | "VINCULAR" | "DESVINCULAR";
    user_username: string;
    aprobador_destinado_username: string;
    modulo_nombre: string;
    comentario: string;
    fecha: string;
  }>;
}

const COLORES: Record<Estado, { bg: string; text: string; border: string; label: string }> = {
  BORRADOR:    { bg: "bg-slate-500/15",  text: "text-slate-300",  border: "border-slate-500/30",  label: "Borrador" },
  EN_REVISION: { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30",  label: "En revision" },
  APROBADO:    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30", label: "Aprobado" },
  RECHAZADO:   { bg: "bg-rose-500/15",   text: "text-rose-300",   border: "border-rose-500/30",   label: "Rechazado" },
};

interface Props {
  diagramaId: number | string;
  currentUserId?: number | null;
  onChange?: () => void;
}

export default function DiagramaApprovalPanel({ diagramaId, currentUserId, onChange }: Props) {
  const [d, setD] = useState<DiagramaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username: string; first_name: string; last_name: string }>>([]);
  const [modulos, setModulos] = useState<Array<{ id: number; codigo: string; nombre: string }>>([]);
  const [busy, setBusy] = useState(false);

  // Dialogos
  const [showEnviar, setShowEnviar] = useState(false);
  const [showAprobar, setShowAprobar] = useState(false);
  const [showRechazar, setShowRechazar] = useState(false);
  const [showVincular, setShowVincular] = useState(false);
  const [aprobadorId, setAprobadorId] = useState<number | null>(null);
  const [moduloId, setModuloId] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const cargar = useCallback(async () => {
    try {
      const r = await api.getDiagrama(diagramaId);
      setD(r as DiagramaState);
    } catch {} finally { setLoading(false); }
  }, [diagramaId]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    // Carga usuarios para el combo de aprobadores (la API ya existe).
    api.getUsuarios().then((r) => setUsers(r.results || [])).catch(() => {});
    api.getModulos().then((r) => setModulos((r.results || []).map((m: any) => ({
      id: m.id, codigo: m.codigo, nombre: m.nombre,
    })))).catch(() => {});
  }, []);

  const esCreador = d && currentUserId && d.creado_por === currentUserId;
  const esAprobador = d && currentUserId && d.aprobador === currentUserId;

  const handleEnviar = async () => {
    if (!aprobadorId) return alert("Selecciona un aprobador.");
    setBusy(true);
    try {
      await api.enviarDiagramaAprobacion(diagramaId, aprobadorId, comentario);
      setShowEnviar(false);
      setComentario("");
      setAprobadorId(null);
      await cargar();
      onChange?.();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleAprobar = async () => {
    setBusy(true);
    try {
      await api.aprobarDiagrama(diagramaId, comentario);
      setShowAprobar(false); setComentario("");
      await cargar(); onChange?.();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleRechazar = async () => {
    if (!comentario.trim()) return alert("Indica el motivo del rechazo.");
    setBusy(true);
    try {
      await api.rechazarDiagrama(diagramaId, comentario);
      setShowRechazar(false); setComentario("");
      await cargar(); onChange?.();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleVincular = async () => {
    setBusy(true);
    try {
      await api.vincularDiagramaModulo(diagramaId, moduloId);
      setShowVincular(false); setModuloId(null);
      await cargar(); onChange?.();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleDesvincular = async () => {
    if (!confirm("Desvincular el diagrama del modulo? Los usuarios del modulo dejaran de verlo.")) return;
    setBusy(true);
    try {
      await api.vincularDiagramaModulo(diagramaId, null);
      await cargar(); onChange?.();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loading || !d) return null;

  const c = COLORES[d.estado];

  return (
    <>
      {/* Panel flotante en esquina inferior derecha */}
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur shadow-2xl text-sm">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-800/40 rounded-t-2xl"
        >
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
              {c.label}
            </span>
            {d.modulo_vinculado && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                <Link2 className="w-3 h-3" /> {d.modulo_nombre}
              </span>
            )}
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700/60">
            {/* Info de estado */}
            {d.estado === "EN_REVISION" && d.aprobador_username && (
              <div className="space-y-1 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de <span className="font-semibold text-slate-200">{d.aprobador_username}</span>
                </div>
                {d.visto_por_aprobador_en ? (
                  <div className="text-[11px] text-sky-400 flex items-center gap-1.5 pl-5">
                    <CheckCircle2 className="w-3 h-3" />
                    Visto el {new Date(d.visto_por_aprobador_en).toLocaleString()}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic pl-5">Aun no lo abre el aprobador</div>
                )}
              </div>
            )}
            {d.estado === "APROBADO" && d.decidido_por_username && (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobado por <span className="font-semibold">{d.decidido_por_username}</span>
              </div>
            )}
            {d.estado === "RECHAZADO" && d.decidido_por_username && (
              <div className="space-y-1 pt-2">
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <ShieldX className="w-3.5 h-3.5" />
                  Rechazado por <span className="font-semibold">{d.decidido_por_username}</span>
                </div>
                {d.comentario_decision && (
                  <div className="text-xs text-slate-400 italic pl-5">"{d.comentario_decision}"</div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(d.estado === "BORRADOR" || d.estado === "RECHAZADO") && esCreador && (
                <button onClick={() => setShowEnviar(true)}
                  className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                  <Send className="w-3.5 h-3.5" /> Enviar a aprobacion
                </button>
              )}
              {d.estado === "EN_REVISION" && (esAprobador || esCreador) && (
                <>
                  <button onClick={() => setShowAprobar(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Aprobar
                  </button>
                  <button onClick={() => setShowRechazar(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
                    <ShieldX className="w-3.5 h-3.5" /> Rechazar
                  </button>
                </>
              )}
              {d.estado === "APROBADO" && esCreador && (
                d.modulo_vinculado ? (
                  <button onClick={handleDesvincular} disabled={busy}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold disabled:opacity-50">
                    <Link2Off className="w-3.5 h-3.5" /> Desvincular del modulo
                  </button>
                ) : (
                  <button onClick={() => setShowVincular(true)}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold">
                    <Link2 className="w-3.5 h-3.5" /> Vincular a un modulo
                  </button>
                )
              )}
            </div>

            {d.es_inmutable && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Aprobado y vinculado: no se puede eliminar ni editar mientras siga vinculado.
              </div>
            )}

            {/* Timeline */}
            {d.historial_aprobacion.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historial</div>
                <ul className="space-y-1.5 max-h-44 overflow-auto">
                  {d.historial_aprobacion.map((h) => (
                    <li key={h.id} className="text-[11px] text-slate-300 leading-snug">
                      <span className="text-slate-500">{new Date(h.fecha).toLocaleString()}</span>
                      <div>
                        <span className="font-semibold">{h.user_username}</span> {accionTexto(h.accion)}
                        {h.aprobador_destinado_username && ` a ${h.aprobador_destinado_username}`}
                        {h.modulo_nombre && ` (${h.modulo_nombre})`}
                      </div>
                      {h.comentario && <div className="text-slate-400 italic">"{h.comentario}"</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs simples */}
      {showEnviar && (
        <Modal title="Enviar a aprobacion" onClose={() => setShowEnviar(false)}>
          <label className="text-xs text-slate-400">Aprobador</label>
          <select value={aprobadorId ?? ""} onChange={(e) => setAprobadorId(e.target.value ? Number(e.target.value) : null)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm">
            <option value="">— Selecciona —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} {u.first_name ? `(${u.first_name} ${u.last_name || ""})` : ""}
                {currentUserId === u.id ? " — yo mismo (auto-aprobacion)" : ""}
              </option>
            ))}
          </select>
          <label className="text-xs text-slate-400 mt-3 block">Comentario (opcional)</label>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowEnviar(false)} className="px-3 py-1.5 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
            <button onClick={handleEnviar} disabled={busy} className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50">Enviar</button>
          </div>
        </Modal>
      )}

      {showAprobar && (
        <Modal title="Aprobar diagrama" onClose={() => setShowAprobar(false)}>
          <label className="text-xs text-slate-400">Comentario (opcional)</label>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAprobar(false)} className="px-3 py-1.5 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
            <button onClick={handleAprobar} disabled={busy} className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50">Aprobar</button>
          </div>
        </Modal>
      )}

      {showRechazar && (
        <Modal title="Rechazar diagrama" onClose={() => setShowRechazar(false)}>
          <label className="text-xs text-slate-400">Motivo del rechazo *</label>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} required
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowRechazar(false)} className="px-3 py-1.5 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
            <button onClick={handleRechazar} disabled={busy} className="px-3 py-1.5 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50">Rechazar</button>
          </div>
        </Modal>
      )}

      {showVincular && (
        <Modal title="Vincular a un modulo" onClose={() => setShowVincular(false)}>
          <p className="text-xs text-slate-400 mb-2">
            Al vincular, todos los usuarios con acceso al modulo veran este diagrama. No se podra
            eliminar mientras siga vinculado.
          </p>
          <label className="text-xs text-slate-400">Modulo</label>
          <select value={moduloId ?? ""} onChange={(e) => setModuloId(e.target.value ? Number(e.target.value) : null)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm">
            <option value="">— Selecciona —</option>
            {modulos.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>
            ))}
          </select>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowVincular(false)} className="px-3 py-1.5 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
            <button onClick={handleVincular} disabled={busy || !moduloId} className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold disabled:opacity-50">Vincular</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function accionTexto(a: string): string {
  return ({
    ENVIO: "envio a aprobacion",
    VISTO: "vio el diagrama",
    APROBAR: "aprobo",
    RECHAZAR: "rechazo",
    VINCULAR: "vinculo",
    DESVINCULAR: "desvinculo",
  } as Record<string, string>)[a] || a;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
