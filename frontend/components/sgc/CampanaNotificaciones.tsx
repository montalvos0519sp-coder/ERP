"use client";

// Campana de notificaciones del SGC. Sondea el conteo cada 30 s y despliega
// el listado; al hacer clic en una notificación la marca leída y navega al
// registro. Reutilizable en cualquier header del módulo de calidad.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, AtSign, UserPlus, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

const ICONO: Record<string, any> = {
  ASIGNACION: UserPlus, MENCION: AtSign, COMENTARIO: MessageSquare,
  VENCIMIENTO: AlertTriangle, CAMBIO_ESTADO: RefreshCw, APROBACION: CheckCheck, INFO: Bell,
};

function tiempoRel(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function CampanaNotificaciones() {
  const { isDarkMode, theme } = useTheme();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [conteo, setConteo] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const cargarConteo = useCallback(() => {
    api.getConteoNotificacionesSGC().then((r) => setConteo(r.no_leidas || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    cargarConteo();
    const t = setInterval(cargarConteo, 30000);
    return () => clearInterval(t);
  }, [cargarConteo]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const abrir = async () => {
    const next = !abierto;
    setAbierto(next);
    if (next) {
      try { const r = await api.getNotificacionesSGC(); setItems(r.results || []); } catch { /* */ }
    }
  };

  const clickNotif = async (n: any) => {
    if (!n.leida) { try { await api.leerNotificacionSGC(n.id); } catch { /* */ } cargarConteo(); }
    setAbierto(false);
    if (n.url) router.push(n.url.startsWith("/") ? n.url : `/sgc`);
  };

  const marcarTodas = async () => {
    try { await api.marcarTodasNotificacionesSGC(); } catch { /* */ }
    setItems((xs) => xs.map((x) => ({ ...x, leida: true })));
    setConteo(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={abrir}
        className={`relative p-2 rounded-xl border transition ${isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"}`}
        title="Notificaciones de calidad"
      >
        <Bell size={18} className={theme.textSecondary} />
        {conteo > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {conteo > 99 ? "99+" : conteo}
          </span>
        )}
      </button>

      {abierto && (
        <div className={`absolute right-0 mt-2 w-80 max-h-[26rem] overflow-hidden rounded-2xl border shadow-2xl z-[500] ${isDarkMode ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className={`text-sm font-bold ${theme.textPrimary}`}>Notificaciones</span>
            <button onClick={marcarTodas} className="text-xs text-sky-400 hover:underline flex items-center gap-1">
              <CheckCheck size={13} /> Marcar todas
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className={`text-xs text-center py-8 ${theme.textTertiary}`}>Sin notificaciones</p>}
            {items.map((n) => {
              const Ic = ICONO[n.tipo] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => clickNotif(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 border-b border-white/5 transition hover:bg-sky-500/5 ${!n.leida ? (isDarkMode ? "bg-sky-500/[0.07]" : "bg-sky-50") : ""}`}
                >
                  <span className={`mt-0.5 ${!n.leida ? "text-sky-400" : theme.textTertiary}`}><Ic size={16} /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold ${theme.textPrimary}`}>{n.titulo}</span>
                    {n.mensaje && <span className={`block text-xs truncate ${theme.textSecondary}`}>{n.mensaje}</span>}
                    <span className={`block text-[10px] mt-0.5 ${theme.textTertiary}`}>{n.actor_nombre ? `${n.actor_nombre} · ` : ""}{tiempoRel(n.creada)}</span>
                  </span>
                  {!n.leida && <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
