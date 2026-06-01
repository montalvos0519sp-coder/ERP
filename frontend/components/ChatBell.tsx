"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useChat } from "@/lib/ChatContext";

export default function ChatBell({ headerButton }: { headerButton: string }) {
  const router = useRouter();
  const { unreadTotal, wsConnected } = useChat();
  const has = unreadTotal > 0;

  return (
    <button
      onClick={() => router.push("/chat")}
      className={`relative w-10 h-10 flex items-center justify-center border rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${headerButton}`}
      title={has ? `${unreadTotal} mensaje(s) sin leer` : "Mensajes"}
      aria-label="Mensajes"
    >
      <MessageCircle size={16} className={has ? "text-amber-200" : "text-white"} />
      {has && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/40 ring-2 ring-white/20">
          {unreadTotal > 99 ? "99+" : unreadTotal}
        </span>
      )}
      {/* Punto de estado de conexión WS (verde = vivo, gris = desconectado) */}
      <span
        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#0F172A] transition-colors ${
          wsConnected ? "bg-emerald-400" : "bg-slate-500"
        }`}
        title={wsConnected ? "Conectado en tiempo real" : "Sin conexión"}
      />
    </button>
  );
}
