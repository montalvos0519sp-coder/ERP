"use client";

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ArrowLeft, Check, CheckCheck, FileText, Image as ImageIcon, MessageCircle,
  Paperclip, Plus, Search, Send, Users, X,
} from "lucide-react";

import { api, API_BASE } from "@/lib/api";
import { useChat } from "@/lib/ChatContext";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface UserMini { id: number; username: string; nombre: string; email: string }
interface Attachment {
  id: number; nombre_original: string; mime: string; tamano: number;
  es_imagen: boolean; ancho?: number; alto?: number; url: string; creado: string;
}
interface Message {
  id: number; conversation: number;
  sender: UserMini | null;
  body: string; creado: string; editado_en: string | null;
  deleted_at: string | null; es_sistema: boolean;
  adjuntos: Attachment[];
}
interface Conversation {
  id: number; kind: "DIRECT" | "GROUP"; titulo: string; titulo_calculado: string;
  creado: string; actualizado: string; ultimo_mensaje_en: string;
  participantes: any[]; ultimo_mensaje: Message | null; no_leidos: number;
  otro: UserMini | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tiempoCorto(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return d.toLocaleDateString();
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function iniciales(s: string): string {
  return s.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function asAbsoluteUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${API_BASE}${u}`;
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function ChatPage() {
  const { isDarkMode, theme } = useTheme();
  const { user } = useUser();
  const { refreshUnread, unreadByConv, subscribe } = useChat();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Cargar lista
  const cargarConvs = useCallback(async () => {
    try {
      const r = await api.chatConversaciones();
      setConvs(r.results || []);
    } catch { /* */ }
  }, []);

  useEffect(() => { cargarConvs(); }, [cargarConvs]);

  // Refrescar lista cuando llega un mensaje nuevo (mover conv al top, etc.)
  useEffect(() => {
    return subscribe((ev) => {
      if (ev?.type === "message.new") {
        setConvs((prev) => {
          const idx = prev.findIndex((c) => c.id === ev.conversation_id);
          if (idx < 0) { cargarConvs(); return prev; }
          const c = { ...prev[idx], ultimo_mensaje: ev.message, ultimo_mensaje_en: ev.message.creado };
          const next = [c, ...prev.filter((x) => x.id !== c.id)];
          return next;
        });
      }
    });
  }, [subscribe, cargarConvs]);

  const activeConv = useMemo(
    () => convs.find((c) => c.id === activeId) || null,
    [convs, activeId],
  );

  return (
    <div className={`h-full flex ${theme.bgBase}`}>
      {/* ── Lista lateral ─────────────────────────────────────────────── */}
      <aside className={`w-full sm:w-[340px] shrink-0 border-r flex flex-col ${
        isDarkMode ? "bg-[#0B1220] border-white/[0.04]" : "bg-white border-slate-200/70"
      } ${activeId !== null ? "hidden sm:flex" : "flex"}`}>
        <div className={`p-4 border-b ${theme.divider} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow"
            style={{ background: "linear-gradient(135deg,#6366F1,#14B8A6)" }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className={`text-lg font-black tracking-tight ${theme.textPrimary}`}>Mensajes</h1>
            <p className={`text-[11px] ${theme.textTertiary}`}>
              {convs.length} conversación{convs.length === 1 ? "" : "es"}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}
            title="Nueva conversación"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {convs.length === 0 ? (
            <div className={`p-8 text-center ${theme.textTertiary}`}>
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold">Sin conversaciones aún</p>
              <p className="text-xs mt-1">Toca + para empezar una.</p>
            </div>
          ) : (
            <ul>
              {convs.map((c) => {
                const fromCtx = unreadByConv[String(c.id)];
                // Si el contexto tiene la conv => manda (WS empujó nuevos
                // mensajes). Si no => usa el c.no_leidos local, que se
                // actualiza optimisticamente al abrir la conv.
                const noLeidos = fromCtx !== undefined
                  ? Number(fromCtx)
                  : Number(c.no_leidos || 0);
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setActiveId(c.id);
                        // Optimista: deja el contador en 0 inmediatamente,
                        // el refreshUnread del Thread confirmará.
                        setConvs((prev) => prev.map((x) =>
                          x.id === c.id ? { ...x, no_leidos: 0 } : x,
                        ));
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        active
                          ? (isDarkMode ? "bg-white/[0.04]" : "bg-indigo-50/60")
                          : (isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")
                      }`}
                    >
                      <Avatar conv={c} isDark={isDarkMode} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm font-bold ${theme.textPrimary}`}>
                            {c.titulo_calculado}
                          </p>
                          {c.ultimo_mensaje && (
                            <span className={`text-[10px] shrink-0 ${theme.textTertiary}`}>
                              {tiempoCorto(c.ultimo_mensaje.creado)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-xs ${theme.textSecondary}`}>
                            {c.ultimo_mensaje?.es_sistema && "· "}
                            {c.ultimo_mensaje?.body ||
                              (c.ultimo_mensaje?.adjuntos.length ? `📎 ${c.ultimo_mensaje.adjuntos.length} adjunto(s)` : "Sin mensajes")}
                          </p>
                          {noLeidos > 0 && (
                            <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow">
                              {noLeidos > 99 ? "99+" : noLeidos}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Panel de conversación ─────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeId === null ? "hidden sm:flex" : "flex"}`}>
        {activeConv ? (
          <Thread
            key={activeConv.id}
            conversation={activeConv}
            onBack={() => setActiveId(null)}
            onAfterRead={refreshUnread}
          />
        ) : (
          <Placeholder isDark={isDarkMode} theme={theme} />
        )}
      </main>

      {showNewModal && (
        <NuevoChatModal
          isDark={isDarkMode}
          theme={theme}
          onClose={() => setShowNewModal(false)}
          onCreado={(conv) => {
            setShowNewModal(false);
            setConvs((prev) => prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]);
            setActiveId(conv.id);
          }}
        />
      )}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ conv, isDark }: { conv: Conversation; isDark: boolean }) {
  const name = conv.titulo_calculado;
  const grad = conv.kind === "GROUP"
    ? "linear-gradient(135deg,#F59E0B,#EF4444)"
    : "linear-gradient(135deg,#1A73E8,#14B8A6)";
  return (
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow"
      style={{ background: grad }}
    >
      {conv.kind === "GROUP" ? <Users className="w-5 h-5" /> : iniciales(name)}
    </div>
  );
}

function Placeholder({ isDark, theme }: any) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-2xl"
        style={{ background: "linear-gradient(135deg,#6366F1,#14B8A6)" }}>
        <MessageCircle className="w-9 h-9 text-white" />
      </div>
      <h2 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>
        Selecciona una conversación
      </h2>
      <p className={`mt-1 text-sm ${theme.textSecondary}`}>
        O crea una nueva con el botón +
      </p>
    </div>
  );
}

// ─── Thread (mensajes + composer) ────────────────────────────────────────────
function Thread({
  conversation, onBack, onAfterRead,
}: {
  conversation: Conversation;
  onBack: () => void;
  onAfterRead: () => void;
}) {
  const { isDarkMode, theme } = useTheme();
  const { user } = useUser();
  const { subscribe } = useChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [typingFrom, setTypingFrom] = useState<{ user_id: number; until: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Carga inicial.
  useEffect(() => {
    let cancel = false;
    (async () => {
      const r = await api.chatMensajes(conversation.id, { page_size: "30" });
      if (cancel) return;
      // El API devuelve más recientes primero (ordering -creado). Lo invertimos.
      setMessages([...(r.results || [])].reverse());
      setNext(r.next);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
      try { await api.chatMarcarLeido(conversation.id); onAfterRead(); } catch { /* */ }
    })();
    return () => { cancel = true; };
  }, [conversation.id, onAfterRead]);

  // Suscripción a eventos socket: nuevos mensajes + typing.
  useEffect(() => {
    return subscribe((ev) => {
      if (ev?.type === "message.new" && ev.conversation_id === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === ev.message.id)) return prev;
          return [...prev, ev.message];
        });
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
        // Marca como leído ya que está visible
        if (ev.message.sender?.id !== user?.id) {
          api.chatMarcarLeido(conversation.id).then(onAfterRead).catch(() => { /* */ });
        }
      } else if (ev?.type === "typing" && ev.conversation_id === conversation.id) {
        if (ev.user_id !== user?.id) {
          setTypingFrom({ user_id: ev.user_id, until: Date.now() + 3500 });
        }
      }
    });
  }, [subscribe, conversation.id, user?.id, onAfterRead]);

  // Limpia "está escribiendo..." pasados 3.5s
  useEffect(() => {
    if (!typingFrom) return;
    const t = setTimeout(() => {
      if (typingFrom && typingFrom.until <= Date.now()) setTypingFrom(null);
    }, 3600);
    return () => clearTimeout(t);
  }, [typingFrom]);

  const enviar = async () => {
    const txt = body.trim();
    if (!txt && files.length === 0) return;
    setSending(true);
    try {
      await api.chatEnviarMensaje(conversation.id, txt, files);
      setBody("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      alert((e as Error).message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  };

  const cargarMas = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = new URL(next);
      const page = url.searchParams.get("page") || "2";
      const r = await api.chatMensajes(conversation.id, { page, page_size: "30" });
      const previousScroll = scrollRef.current?.scrollHeight || 0;
      setMessages((prev) => [...[...(r.results || [])].reverse(), ...prev]);
      setNext(r.next);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = (scrollRef.current.scrollHeight - previousScroll);
        }
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Agrupa por día para mostrar separadores
  const grupos = useMemo(() => {
    const out: { fecha: string; items: Message[] }[] = [];
    for (const m of messages) {
      const f = new Date(m.creado).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
      const last = out[out.length - 1];
      if (last && last.fecha === f) last.items.push(m);
      else out.push({ fecha: f, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <>
      {/* Header conversación */}
      <header className={`flex items-center gap-3 px-4 py-3 border-b ${theme.divider} shrink-0 ${
        isDarkMode ? "bg-[#0F172A]/70" : "bg-white"
      }`}>
        <button onClick={onBack} className={`sm:hidden p-2 rounded-lg ${theme.accentHover}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <Avatar conv={conversation} isDark={isDarkMode} />
        <div className="min-w-0">
          <p className={`text-sm font-black ${theme.textPrimary} truncate`}>{conversation.titulo_calculado}</p>
          <p className={`text-[11px] ${theme.textTertiary} truncate`}>
            {conversation.kind === "GROUP"
              ? `${conversation.participantes.length} participantes`
              : conversation.otro?.email || ""}
          </p>
        </div>
      </header>

      {/* Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-4 space-y-4">
        {next && (
          <div className="text-center">
            <button onClick={cargarMas} disabled={loadingMore}
              className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                isDarkMode ? "border-white/[0.06] text-slate-400 hover:bg-white/[0.04]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              {loadingMore ? "Cargando…" : "Cargar mensajes anteriores"}
            </button>
          </div>
        )}

        {grupos.map((g, gi) => (
          <div key={gi}>
            <div className="flex items-center justify-center my-3">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                isDarkMode ? "bg-white/[0.04] text-slate-400" : "bg-slate-100 text-slate-500"
              }`}>{g.fecha}</span>
            </div>
            <ul className="space-y-2">
              {g.items.map((m) => (
                <Bubble key={m.id} message={m} yo={user?.id} isGrupo={conversation.kind === "GROUP"} isDark={isDarkMode} />
              ))}
            </ul>
          </div>
        ))}

        {typingFrom && (
          <div className={`text-xs ${theme.textTertiary} italic`}>
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse mr-1.5 align-middle" />
            está escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className={`p-3 border-t ${theme.divider} ${isDarkMode ? "bg-[#0F172A]/70" : "bg-white"}`}>
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {files.map((f, i) => (
              <div key={i} className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border ${
                isDarkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"
              }`}>
                {f.type.startsWith("image/") ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                <span className={`text-xs truncate max-w-[160px] ${theme.textPrimary}`}>{f.name}</span>
                <span className={`text-[10px] ${theme.textTertiary}`}>{formatBytes(f.size)}</span>
                <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                  className={`w-5 h-5 rounded flex items-center justify-center ${theme.accentHover}`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const list = e.target.files;
              if (!list) return;
              const arr = Array.from(list);
              setFiles((prev) => [...prev, ...arr]);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Adjuntar archivos"
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-300 hover:bg-white/[0.08]"
                         : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Escribe un mensaje…  (Enter para enviar, Shift+Enter salto de línea)"
            rows={1}
            className={`flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none border max-h-32 ${
              isDarkMode
                ? "bg-[#1E293B]/40 border-white/[0.05] text-white focus:border-[#14B8A6]/50"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A73E8]/50 focus:bg-white"
            }`}
          />
          <button
            onClick={enviar}
            disabled={sending || (!body.trim() && files.length === 0)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Burbuja de mensaje ──────────────────────────────────────────────────────
function Bubble({ message, yo, isGrupo, isDark }: { message: Message; yo: number | undefined; isGrupo: boolean; isDark: boolean }) {
  const mine = message.sender?.id === yo;
  if (message.es_sistema) {
    return (
      <li className="flex justify-center">
        <span className={`text-[11px] italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          <strong>{message.sender?.nombre || "Sistema"}</strong> {message.body}
        </span>
      </li>
    );
  }
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {isGrupo && !mine && message.sender && (
          <span className={`text-[10px] font-bold pl-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {message.sender.nombre}
          </span>
        )}
        <div className={`rounded-2xl px-4 py-2 shadow-sm ${
          mine
            ? "text-white"
            : isDark
              ? "bg-white/[0.06] text-slate-100"
              : "bg-slate-100 text-slate-800"
        }`}
          style={mine ? { background: "linear-gradient(135deg,#1A73E8,#14B8A6)" } : {}}
        >
          {message.body && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}
          {message.adjuntos.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.adjuntos.map((a) => (
                <AttachmentView key={a.id} a={a} mine={mine} isDark={isDark} />
              ))}
            </div>
          )}
        </div>
        <span className={`text-[10px] px-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          {new Date(message.creado).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </li>
  );
}

function AttachmentView({ a, mine, isDark }: { a: Attachment; mine: boolean; isDark: boolean }) {
  const url = asAbsoluteUrl(a.url);
  if (a.es_imagen) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={a.nombre_original}
          className="max-h-72 rounded-xl object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
        mine
          ? "bg-white/15 border-white/20 hover:bg-white/25"
          : isDark
            ? "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]"
            : "bg-white border-slate-200 hover:bg-slate-50"
      }`}>
      <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{a.nombre_original}</p>
        <p className="text-[10px] opacity-70">{formatBytes(a.tamano)} · {a.mime || "archivo"}</p>
      </div>
    </a>
  );
}

// ─── Modal: nueva conversación ───────────────────────────────────────────────
function NuevoChatModal({
  isDark, theme, onClose, onCreado,
}: { isDark: boolean; theme: any; onClose: () => void; onCreado: (c: Conversation) => void }) {
  const [tab, setTab] = useState<"directo" | "grupo">("directo");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserMini[]>([]);
  const [seleccionados, setSeleccionados] = useState<UserMini[]>([]);
  const [titulo, setTitulo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await api.chatBuscarUsuarios(q);
        setUsers(r.results || []);
      } catch { /* */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const crear = async () => {
    setLoading(true);
    try {
      if (tab === "directo") {
        if (seleccionados.length !== 1) return;
        const c = await api.chatCrearDirect(seleccionados[0].id);
        onCreado(c);
      } else {
        if (!titulo.trim() || seleccionados.length === 0) return;
        const c = await api.chatCrearGrupo(titulo.trim(), seleccionados.map((u) => u.id));
        onCreado(c);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (u: UserMini) => {
    setSeleccionados((prev) => {
      if (prev.some((x) => x.id === u.id)) return prev.filter((x) => x.id !== u.id);
      if (tab === "directo") return [u];
      return [...prev, u];
    });
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border overflow-hidden ${
          isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"
        }`}
      >
        <div className={`p-5 border-b ${theme.divider} flex items-center justify-between`}>
          <h2 className={`text-lg font-black ${theme.textPrimary}`}>Nueva conversación</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${theme.accentHover}`}>
            <X className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
        </div>

        <div className={`flex p-1 m-4 rounded-2xl ${isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}>
          {(["directo", "grupo"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSeleccionados([]); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                tab === t
                  ? "text-white shadow"
                  : (isDark ? "text-slate-400" : "text-slate-500")
              }`}
              style={tab === t ? { background: "linear-gradient(135deg,#1A73E8,#14B8A6)" } : {}}
            >
              {t === "directo" ? "1 a 1" : "Grupo"}
            </button>
          ))}
        </div>

        {tab === "grupo" && (
          <div className="px-4 mb-3">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre del grupo"
              className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${
                isDark
                  ? "bg-[#1E293B]/40 border-white/[0.05] text-white focus:border-[#14B8A6]/50"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#1A73E8]/50"
              }`}
            />
          </div>
        )}

        <div className="px-4 mb-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
            isDark ? "bg-[#1E293B]/40 border-white/[0.05]" : "bg-slate-50 border-slate-200"
          }`}>
            <Search className={`w-4 h-4 ${theme.textTertiary}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usuarios…"
              className={`flex-1 bg-transparent text-sm outline-none ${theme.textPrimary}`}
            />
          </div>
        </div>

        {seleccionados.length > 0 && (
          <div className="px-4 mb-2 flex gap-1.5 flex-wrap">
            {seleccionados.map((u) => (
              <span key={u.id} className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full border text-xs ${
                isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-indigo-50 border-indigo-200 text-indigo-700"
              }`}>
                {u.nombre}
                <button onClick={() => toggleUser(u)} className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  isDark ? "hover:bg-white/[0.08]" : "hover:bg-indigo-100"
                }`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <ul className="max-h-72 overflow-y-auto custom-scrollbar mb-3">
          {users.length === 0 && (
            <li className={`p-6 text-center text-sm ${theme.textTertiary}`}>Sin coincidencias</li>
          )}
          {users.map((u) => {
            const checked = seleccionados.some((x) => x.id === u.id);
            return (
              <li key={u.id}>
                <button onClick={() => toggleUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                    isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                  }`}>
                  <div className="w-9 h-9 rounded-xl text-white text-xs font-black flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}>
                    {iniciales(u.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${theme.textPrimary}`}>{u.nombre}</p>
                    <p className={`text-[11px] ${theme.textTertiary} truncate`}>@{u.username}</p>
                  </div>
                  {checked && (
                    <span className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}>
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-4 pb-5">
          <button
            onClick={crear}
            disabled={loading || (tab === "directo" && seleccionados.length !== 1)
              || (tab === "grupo" && (!titulo.trim() || seleccionados.length === 0))}
            className="w-full py-2.5 rounded-xl text-sm font-black text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}
          >
            {tab === "directo" ? "Abrir conversación" : "Crear grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}
