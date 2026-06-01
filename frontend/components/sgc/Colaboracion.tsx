"use client";

// Componentes reutilizables de la capa de colaboración del SGC (Pilar 1):
//   · SelectorUsuario  — asignar un registro a un usuario real de la empresa.
//   · PanelColaboracion — hilo de comentarios (@menciones) + bitácora/actividad.
//   · Avatar           — iniciales con color estable por usuario.
// Se montan dentro de los modales de cualquier registro del SGC.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, History, Send, UserCircle2, AtSign, Trash2, Search, Check, ChevronsUpDown, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

export interface Miembro { id: number; username: string; nombre: string; email: string; rol: string }

const COLORES = ["bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500"];

function iniciales(nombre?: string) {
  if (!nombre) return "?";
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || nombre[0].toUpperCase();
}

export function Avatar({ nombre, id, size = 28 }: { nombre?: string; id?: number; size?: number }) {
  const color = COLORES[(id ?? nombre?.length ?? 0) % COLORES.length];
  return (
    <span
      className={`${color} inline-flex items-center justify-center rounded-full text-white font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Hook compartido: carga (y cachea por empresa) los miembros de la empresa activa. */
export function useMiembros(): Miembro[] {
  const { empresaActivaId } = useUser();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  useEffect(() => {
    let vivo = true;
    api.getMiembrosSGC(empresaActivaId || undefined)
      .then((m) => { if (vivo) setMiembros(Array.isArray(m) ? m : []); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [empresaActivaId]);
  return miembros;
}

export function SelectorUsuario({
  value, onChange, label = "Responsable", placeholder = "— Sin asignar —",
}: {
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  label?: string;
  placeholder?: string;
}) {
  const { theme, isDarkMode } = useTheme();
  const miembros = useMiembros();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const seleccionado = miembros.find((m) => m.id === value);

  const abrir = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); setQ(""); setOpen(true); };
  const elegir = (id: number | null) => { onChange(id); setOpen(false); };
  const filtrados = miembros.filter((m) => `${m.nombre} ${m.username} ${m.rol}`.toLowerCase().includes(q.toLowerCase()));

  const panel = isDarkMode ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-200";
  const fieldCls = `w-full rounded-lg px-3 py-2 text-sm outline-none border flex items-center gap-2 ${isDarkMode ? "bg-[#1E293B]/60 border-white/10 text-slate-100" : "bg-white border-slate-300 text-slate-800"}`;

  return (
    <label className="block">
      <span className={`text-xs font-semibold mb-1 flex items-center gap-1 ${theme.textSecondary}`}>
        <UserCircle2 size={13} /> {label}
      </span>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : abrir())} className={fieldCls}>
        {seleccionado ? <><Avatar nombre={seleccionado.nombre} id={seleccionado.id} size={22} /><span className="truncate">{seleccionado.nombre}</span><span className={`text-[10px] ${theme.textTertiary}`}>{seleccionado.rol}</span></> : <span className={theme.textTertiary}>{placeholder}</span>}
        <ChevronsUpDown size={14} className={`ml-auto shrink-0 ${theme.textTertiary}`} />
      </button>

      {open && rect && createPortal(
        <>
          <div className="fixed inset-0 z-[590]" onClick={() => setOpen(false)} />
          <div style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240), zIndex: 600 }} className={`rounded-xl border shadow-2xl overflow-hidden ${panel}`}>
            <div className={`flex items-center gap-2 px-2.5 py-2 border-b ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
              <Search size={14} className={theme.textTertiary} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario…" className={`flex-1 bg-transparent outline-none text-sm ${theme.textPrimary}`} />
              {q && <button type="button" onClick={() => setQ("")}><X size={13} className={theme.textTertiary} /></button>}
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              <button type="button" onClick={() => elegir(null)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-sky-500/10 ${theme.textTertiary}`}>
                {value == null && <Check size={14} className="text-sky-400" />}<span className={value == null ? "" : "pl-[22px]"}>{placeholder}</span>
              </button>
              {filtrados.map((m) => (
                <button key={m.id} type="button" onClick={() => elegir(m.id)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-sky-500/10`}>
                  {value === m.id ? <Check size={14} className="text-sky-400 shrink-0" /> : <span className="w-[14px] shrink-0" />}
                  <Avatar nombre={m.nombre} id={m.id} size={22} />
                  <span className={`truncate ${theme.textPrimary}`}>{m.nombre}</span>
                  <span className={`ml-auto text-[10px] ${theme.textTertiary}`}>{m.rol}</span>
                </button>
              ))}
              {filtrados.length === 0 && <p className={`text-xs text-center py-3 ${theme.textTertiary}`}>Sin resultados</p>}
            </div>
          </div>
        </>, document.body)}
    </label>
  );
}

function tiempoRel(iso: string) {
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)} d`;
  return d.toLocaleDateString();
}

const VERBO_COLOR: Record<string, string> = {
  CREO: "text-emerald-400", ASIGNO: "text-sky-400", CAMBIO_ESTADO: "text-amber-400",
  CERRO: "text-emerald-400", REABRIO: "text-rose-400", COMENTO: "text-violet-400",
  APROBO: "text-emerald-400", RECHAZO: "text-rose-400", VERIFICO: "text-cyan-400",
  ADJUNTO: "text-indigo-400", ACTUALIZO: "text-slate-400",
};

/** Resalta @menciones dentro de un comentario. */
function ConMenciones({ texto }: { texto: string }) {
  const partes = texto.split(/(@[A-Za-z0-9_.\-]{2,40})/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("@")
          ? <span key={i} className="text-sky-400 font-semibold">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export function PanelColaboracion({ tipo, objetoId }: { tipo: string; objetoId: number }) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const miembros = useMiembros();
  const [tab, setTab] = useState<"comentarios" | "actividad">("comentarios");
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sugerencias, setSugerencias] = useState<Miembro[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const cargar = useCallback(() => {
    if (!objetoId) return;
    api.getComentariosSGC(tipo, objetoId).then((r) => setComentarios(r.results || [])).catch(() => {});
    api.getActividadSGC(tipo, objetoId).then((r) => setActividad(r.results || [])).catch(() => {});
  }, [tipo, objetoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onTexto = (v: string) => {
    setTexto(v);
    const m = v.slice(0, taRef.current?.selectionStart ?? v.length).match(/@([A-Za-z0-9_.\-]*)$/);
    if (m) {
      const q = m[1].toLowerCase();
      setSugerencias(miembros.filter((u) => u.username.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q)).slice(0, 5));
    } else setSugerencias([]);
  };

  const aplicarMencion = (u: Miembro) => {
    setTexto((t) => t.replace(/@([A-Za-z0-9_.\-]*)$/, `@${u.username} `));
    setSugerencias([]);
    taRef.current?.focus();
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    try {
      await api.crearComentarioSGC(tipo, objetoId, t);
      setTexto("");
      cargar();
    } catch { alert("No se pudo enviar el comentario."); }
    finally { setEnviando(false); }
  };

  const borrar = async (id: number) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    try { await api.eliminarComentarioSGC(id); cargar(); } catch { alert("No se pudo eliminar."); }
  };

  const inputBg = isDarkMode ? "bg-[#1E293B]/60 border-white/10 text-slate-100" : "bg-white border-slate-300 text-slate-800";

  return (
    <div className={`rounded-2xl border ${isDarkMode ? "border-white/10 bg-[#0B1220]/40" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex gap-1 p-1.5 border-b border-white/5">
        {[["comentarios", "Comentarios", MessageSquare, comentarios.length],
          ["actividad", "Actividad", History, actividad.length]].map(([k, lbl, Ic, n]: any) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              tab === k ? "bg-sky-500/15 text-sky-400" : `${theme.textSecondary} hover:bg-white/5`
            }`}
          >
            <Ic size={14} /> {lbl} <span className="opacity-60">({n})</span>
          </button>
        ))}
      </div>

      {tab === "comentarios" ? (
        <div className="p-3 space-y-3">
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {comentarios.length === 0 && (
              <p className={`text-xs text-center py-6 ${theme.textTertiary}`}>Sin comentarios aún. Inicia la conversación </p>
            )}
            {comentarios.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar nombre={c.autor_nombre} id={c.autor} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${theme.textPrimary}`}>{c.autor_nombre}</span>
                    <span className={`text-[11px] ${theme.textTertiary}`}>{tiempoRel(c.creado)}{c.editado ? " · editado" : ""}</span>
                    {user && c.autor === user.id && (
                      <button onClick={() => borrar(c.id)} className="ml-auto text-slate-500 hover:text-rose-400"><Trash2 size={13} /></button>
                    )}
                  </div>
                  <p className={`text-sm whitespace-pre-wrap break-words ${theme.textSecondary}`}><ConMenciones texto={c.texto} /></p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {sugerencias.length > 0 && (
              <div className={`absolute bottom-full mb-1 w-full rounded-xl border shadow-xl z-10 overflow-hidden ${isDarkMode ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-200"}`}>
                {sugerencias.map((u) => (
                  <button key={u.id} onClick={() => aplicarMencion(u)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sky-500/10">
                    <Avatar nombre={u.nombre} id={u.id} size={22} />
                    <span className={theme.textPrimary}>{u.nombre}</span>
                    <span className={`text-xs ${theme.textTertiary}`}>@{u.username}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={texto}
                onChange={(e) => onTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviar(); }}
                placeholder="Escribe un comentario…  usa @ para mencionar"
                rows={2}
                className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none border resize-none ${inputBg}`}
              />
              <button
                onClick={enviar}
                disabled={enviando || !texto.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white disabled:opacity-40 shrink-0"
                title="Enviar (Ctrl+Enter)"
              >
                <Send size={16} />
              </button>
            </div>
            <p className={`mt-1 text-[10px] flex items-center gap-1 ${theme.textTertiary}`}><AtSign size={10} /> Menciona con @usuario para notificar · Ctrl+Enter envía</p>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div className="max-h-80 overflow-y-auto">
            {actividad.length === 0 && <p className={`text-xs text-center py-6 ${theme.textTertiary}`}>Sin actividad registrada.</p>}
            <ol className="relative border-l border-white/10 ml-3 space-y-3">
              {actividad.map((a) => (
                <li key={a.id} className="ml-4">
                  <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${theme.textPrimary}`}>{a.actor_nombre || "Sistema"}</span>
                    <span className={`text-sm ${VERBO_COLOR[a.verbo] || theme.textSecondary}`}>{a.descripcion || a.verbo_display}</span>
                    <span className={`text-[11px] ${theme.textTertiary}`}>{tiempoRel(a.creado)}</span>
                  </div>
                  {a.datos?.estado && (
                    <span className={`text-[11px] ${theme.textTertiary}`}>{a.datos.estado[0]} → {a.datos.estado[1]}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
