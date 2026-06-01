"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

type Listener = (event: any) => void;

interface Ctx {
  /** Mensajes sin leer totales (badge del header). */
  unreadTotal: number;
  /** Desglose por conversación id → cuántos sin leer. */
  unreadByConv: Record<string, number>;
  /** Refresca contadores de no-leídos (POST‐login, tras marcar leído, etc.). */
  refreshUnread: () => Promise<void>;
  /** Estado de la conexión WS. */
  wsConnected: boolean;
  /** Subscribe a eventos del socket (message.new, conversation.read, typing). */
  subscribe: (fn: Listener) => () => void;
}

const ChatCtx = createContext<Ctx | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
  const unreadTotal = useMemo(
    () => Object.values(unreadByConv).reduce((s, n) => s + (n || 0), 0),
    [unreadByConv],
  );
  const [wsConnected, setWsConnected] = useState(false);

  const listenersRef = useRef<Set<Listener>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  const dispatch = useCallback((ev: any) => {
    listenersRef.current.forEach((fn) => {
      try { fn(ev); } catch { /* swallow consumer errors */ }
    });
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await api.chatNoLeidos();
      setUnreadByConv(data.por_conversacion || {});
    } catch { /* sin sesión: ignorar */ }
  }, []);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const url = api.chatWebSocketUrl();
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch { scheduleReconnect(); return; }
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttempt.current = 0;
      };
      ws.onclose = (e) => {
        setWsConnected(false);
        // 4401 = auth fallida → no reconectes hasta que cambie el user.
        if (e.code !== 4401) scheduleReconnect();
      };
      ws.onerror = () => { /* cerrará y reconectará por onclose */ };
      ws.onmessage = (msg) => {
        let data: any;
        try { data = JSON.parse(msg.data); } catch { return; }
        // Eventos que el provider mismo procesa para el badge:
        if (data?.type === "message.new") {
          const convId = String(data.conversation_id);
          const senderId = data.message?.sender?.id;
          if (senderId !== user.id) {
            setUnreadByConv((prev) => ({
              ...prev, [convId]: (prev[convId] || 0) + 1,
            }));
          }
        } else if (data?.type === "conversation.read" && data.user_id === user.id) {
          // El propio usuario leyó desde otra pestaña/dispositivo.
          const convId = String(data.conversation_id);
          setUnreadByConv((prev) => {
            const { [convId]: _was, ...rest } = prev;
            return rest;
          });
        }
        dispatch(data);
      };
    };

    const scheduleReconnect = () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const delay = Math.min(15_000, 1_000 * 2 ** Math.min(5, reconnectAttempt.current));
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    refreshUnread();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try { wsRef.current?.close(); } catch { /* */ }
      wsRef.current = null;
    };
  }, [user?.id, dispatch, refreshUnread]);

  const value = useMemo<Ctx>(() => ({
    unreadTotal, unreadByConv, refreshUnread, wsConnected, subscribe,
  }), [unreadTotal, unreadByConv, refreshUnread, wsConnected, subscribe]);

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat(): Ctx {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChat debe usarse dentro de ChatProvider");
  return ctx;
}

/** Helper: enviar typing por el socket activo (best effort, sin reintentos). */
export function sendTyping(_convId: number) {
  // expuesto via useChat después si lo necesitamos; mantenemos API mínima.
}
