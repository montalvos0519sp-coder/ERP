"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, BellDot, Calendar, Check, CheckCheck, CircleAlert, FileText, X,
} from "lucide-react";

import api from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Notif {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string;
  leida: boolean;
  creado: string;
}

const POLL_MS = 30_000;

function iconoDeTipo(tipo: string) {
  switch (tipo) {
    case "SOL_NUEVA": return FileText;
    case "SOL_APROB": return Check;
    case "SOL_RECH": return X;
    case "SOL_CANC": return CircleAlert;
    default: return Calendar;
  }
}

function colorDeTipo(tipo: string) {
  switch (tipo) {
    case "SOL_NUEVA": return "#6366F1";
    case "SOL_APROB": return "#10B981";
    case "SOL_RECH": return "#EF4444";
    case "SOL_CANC": return "#F59E0B";
    default: return "#3B82F6";
  }
}

function tiempoRelativo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function NotificacionesBell({ headerButton }: { headerButton: string }) {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchNoLeidas = useCallback(async () => {
    try {
      const data = await api.getNotificacionesNoLeidas();
      setCount(data.count || 0);
      setItems(data.results || []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetchNoLeidas();
    const id = setInterval(fetchNoLeidas, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNoLeidas]);

  // Cierra al click fuera
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = useCallback(async () => {
    setOpen((p) => !p);
    if (!open) {
      setLoading(true);
      try {
        const data = await api.getNotificaciones({ page_size: "20" });
        setItems(data.results || []);
      } catch { /* sin acceso o red caída: dejamos lista vacía */ }
      finally { setLoading(false); }
    }
  }, [open]);

  const abrirItem = useCallback(async (n: Notif) => {
    setOpen(false);
    if (!n.leida) {
      try { await api.marcarNotifLeida(n.id); } catch { /* */ }
      fetchNoLeidas();
    }
    if (n.enlace) router.push(n.enlace);
  }, [router, fetchNoLeidas]);

  const marcarTodas = useCallback(async () => {
    try {
      await api.marcarTodasNotifLeidas();
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
      setCount(0);
    } catch { /* */ }
  }, []);

  const HasUnread = count > 0;
  const BellIcon = HasUnread ? BellDot : Bell;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className={`relative w-10 h-10 flex items-center justify-center border rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${headerButton}`}
        title={HasUnread ? `${count} notificacion(es) sin leer` : "Notificaciones"}
        aria-label="Notificaciones"
      >
        <BellIcon size={16} className={HasUnread ? "text-amber-200" : "text-white"} />
        {HasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/40 ring-2 ring-white/20">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full right-0 mt-3 w-[360px] max-w-[95vw] rounded-2xl shadow-2xl border overflow-hidden origin-top-right z-[300] animate-[var(--animate-slide-down)] ${theme.surfaceElevated}`}
        >
          {/* Header del dropdown */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${theme.divider}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isDarkMode ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.10)" }}>
                <Bell size={13} style={{ color: "#6366F1" }} />
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-wider ${theme.textPrimary}`}>Notificaciones</p>
                <p className={`text-[10px] ${theme.textTertiary}`}>{count} sin leer</p>
              </div>
            </div>
            {count > 0 && (
              <button
                onClick={marcarTodas}
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 px-2 py-1 rounded-md ${theme.accentHover} ${theme.textSecondary} hover:${theme.textPrimary}`}
              >
                <CheckCheck size={11} /> Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className={`p-8 text-center text-xs ${theme.textTertiary}`}>Cargando...</div>
            ) : items.length === 0 ? (
              <div className={`p-10 text-center`}>
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: isDarkMode ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.06)" }}>
                  <Bell size={22} style={{ color: "#6366F1" }} />
                </div>
                <p className={`text-xs font-bold ${theme.textSecondary}`}>Sin notificaciones</p>
                <p className={`text-[10px] mt-1 ${theme.textTertiary}`}>Aqui llegaran las solicitudes y avisos.</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const Ico = iconoDeTipo(n.tipo);
                  const color = colorDeTipo(n.tipo);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => abrirItem(n)}
                        className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${theme.accentHover} ${
                          !n.leida ? (isDarkMode ? "bg-indigo-500/[0.07]" : "bg-indigo-50/40") : ""
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: color + (isDarkMode ? "26" : "18") }}>
                          <Ico size={15} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                            <p className={`text-[12px] font-bold truncate ${theme.textPrimary}`}>{n.titulo}</p>
                          </div>
                          {n.mensaje && (
                            <p className={`text-[11px] mt-0.5 line-clamp-2 ${theme.textSecondary}`}>{n.mensaje}</p>
                          )}
                          <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${theme.textTertiary}`}>
                            {tiempoRelativo(n.creado)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
