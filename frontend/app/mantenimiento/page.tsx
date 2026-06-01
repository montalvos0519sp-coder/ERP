"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ClipboardCheck, GaugeCircle, GitBranch, Inbox, Wrench } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

export default function MantenimientoHub() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    api.misEtapasProceso().then((r) => setPendientes(r.count || 0)).catch(() => {});
  }, []);

  const cards = [
    {
      id: "preventivo",
      title: "Tablero Preventivo",
      desc: "Próximos servicios por km (motor) y por horas (Thermo King). Configura el intervalo por unidad.",
      icon: GaugeCircle,
      color: "#06B6D4",
      href: "/mantenimiento/preventivo",
    },
    {
      id: "pendientes",
      title: "Mis pendientes",
      desc: "Etapas de flujo que te toca llenar ahora.",
      icon: Inbox,
      color: "#10B981",
      badge: pendientes,
      href: "/mantenimiento/pendientes",
    },
    {
      id: "procesos",
      title: "Flujos (procesos)",
      desc: "Secuencias de checklists que se habilitan por etapas a distintos usuarios.",
      icon: GitBranch,
      color: "#8B5CF6",
      href: "/mantenimiento/procesos",
    },
    {
      id: "flujos",
      title: "Checklists",
      desc: "Crea formularios con campos, fotos, reglas y captura de km/termo.",
      icon: ClipboardList,
      color: "#6366F1",
      href: "/mantenimiento/flujos",
    },
    {
      id: "ordenes",
      title: "Órdenes de Mantenimiento",
      desc: "Órdenes preventivas y correctivas de la flota.",
      icon: Wrench,
      color: "#F59E0B",
      href: "/mantenimiento/ordenes",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
          <Wrench className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Mantenimiento</h1>
          <p className={`text-sm ${theme.textSecondary}`}>
            Checklists configurables, llenado en campo y resguardo de evidencias.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => router.push(c.href)}
              className={`relative text-left rounded-3xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl ${
                isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"
              }`}>
              {!!c.badge && c.badge > 0 && (
                <span className="absolute top-4 right-4 text-[11px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ background: c.color }}>{c.badge}</span>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md mb-3"
                style={{ background: c.color }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-base font-black ${theme.textPrimary}`}>{c.title}</h3>
              <p className={`text-xs mt-1 ${theme.textSecondary}`}>{c.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
