"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import {
  Activity, ArrowRight, BarChart3, Building2, CheckCircle, ChevronRight, Clock,
  CreditCard, FileText, Fuel, Link2, Package, Receipt, RotateCcw, Settings,
  Shield, ShoppingCart, Sparkles, Star, TrendingUp, Truck, Users, Zap,
  ClipboardCheck, FolderOpen, Network, Wrench, ShieldCheck, Wallet, Target, CalendarClock,
} from "lucide-react";

const d = (dk: boolean, a: string, b: string) => (dk ? a : b);

/* ── MODULE DATA ──────────────────────────────────────────────────────────── */
const MODULES = [
  {
    id: "sgc",
    icon: ClipboardCheck,
    label: "Calidad — ISO 9001",
    sub: "SGC",
    color: "#10B981",
    glow: "rgba(16,185,129,0.3)",
    desc: "Sistema de Gestion de Calidad completo: implementacion, operacion, mantenimiento y mejora continua del SGC.",
    features: [
      { icon: ShieldCheck, text: "Diagnostico ISO + tablero de implementacion (Kanban)" },
      { icon: FileText, text: "No conformidades (CAPA), auditorias y riesgos" },
      { icon: BarChart3, text: "KPIs con tendencias, objetivos SMART y procesos SIPOC" },
      { icon: Users, text: "Competencias, capacitacion, proveedores y encuestas" },
    ],
    stat: { label: "Norma", value: "ISO" },
    grupo: "calidad",
    href: "/sgc",
    nuevo: true,
  },
  {
    id: "documentos",
    icon: FolderOpen,
    label: "Gestion Documental",
    sub: "ISO 7.5",
    color: "#0EA5E9",
    glow: "rgba(14,165,233,0.3)",
    desc: "Documentos controlados con codigo unico, versiones, flujo de aprobacion y control de vigencia.",
    features: [
      { icon: FileText, text: "Codigo controlado, version y vigencia" },
      { icon: CheckCircle, text: "Flujo de aprobacion con firma de control" },
      { icon: RotateCcw, text: "Historial de versiones y obsolescencia" },
      { icon: Shield, text: "Control de distribucion (acceso por usuario)" },
    ],
    stat: { label: "Control", value: "7.5" },
    grupo: "calidad",
    href: "/documentos",
    nuevo: true,
  },
  {
    id: "procesos",
    icon: Network,
    label: "Procesos y Diagramas",
    sub: "Mapa",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.3)",
    desc: "Mapa de procesos SIPOC y diagramas de flujo, ligados a KPIs, riesgos y objetivos de calidad.",
    features: [
      { icon: Network, text: "Fichas SIPOC con dueno de proceso" },
      { icon: Target, text: "Tablero 360: KPIs + riesgos + objetivos" },
      { icon: BarChart3, text: "Diagramas de flujo y aprobaciones" },
      { icon: Link2, text: "Todo el SGC interconectado por proceso" },
    ],
    stat: { label: "Vista", value: "360" },
    grupo: "calidad",
    href: "/diagramas",
    nuevo: true,
  },
  {
    id: "mantenimiento",
    icon: Wrench,
    label: "Mantenimiento",
    sub: "Flota",
    color: "#F97316",
    glow: "rgba(249,115,22,0.3)",
    desc: "Ordenes de trabajo, checklists configurables, refacciones y mantenimiento preventivo de la flota.",
    features: [
      { icon: Wrench, text: "Ordenes preventivas y correctivas" },
      { icon: ClipboardCheck, text: "Checklists y flujos por etapas" },
      { icon: Package, text: "Refacciones usadas y costos" },
      { icon: Clock, text: "Tablero preventivo por km/horas" },
    ],
    stat: { label: "OT", value: "Live" },
    grupo: "ops",
    href: "/mantenimiento",
    nuevo: true,
  },
  {
    id: "nomina",
    icon: Wallet,
    label: "Nomina CFDI",
    sub: "Complemento N",
    color: "#06B6D4",
    glow: "rgba(6,182,212,0.3)",
    desc: "Periodos de nomina, recibos con percepciones y deducciones y complemento de nomina 1.2 del SAT.",
    features: [
      { icon: Users, text: "Periodos y recibos por empleado" },
      { icon: CreditCard, text: "Percepciones, deducciones e incidencias" },
      { icon: FileText, text: "Complemento Nomina 1.2 timbrable" },
      { icon: Link2, text: "Integrado con RH y liquidaciones" },
    ],
    stat: { label: "CFDI", value: "N 1.2" },
    grupo: "rrhh",
    href: "/nomina",
    nuevo: true,
  },
  {
    id: "facturacion",
    icon: Receipt,
    label: "Facturacion Electronica",
    sub: "CFDI 4.0",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.3)",
    desc: "Emision, cancelacion y gestion completa de CFDIs con validacion SAT en tiempo real.",
    features: [
      { icon: FileText, text: "CFDI 4.0 — Ingreso, Egreso, Traslado, Pago" },
      { icon: RotateCcw, text: "Cancelaciones con motivo SAT (01-04)" },
      { icon: CreditCard, text: "Complemento de Pagos 2.0 — saldo insoluto" },
      { icon: Truck, text: "Carta Porte 3.1 — logistica completa" },
    ],
    stat: { label: "Tipos CFDI", value: "4" },
    grupo: "fiscal",
    href: "/facturacion",
  },
  {
    id: "viajes",
    icon: Truck,
    label: "Viajes & Carta Porte",
    sub: "Logistica",
    color: "#3B82F6",
    glow: "rgba(59,130,246,0.3)",
    desc: "Bitacora completa de viajes con generacion automatica de Carta Porte 3.1 timbrada.",
    features: [
      { icon: Truck, text: "Programacion y bitacora de viajes" },
      { icon: FileText, text: "Carta Porte 3.1 desde el mismo viaje" },
      { icon: Link2, text: "Integracion con flota, operadores y rutas" },
      { icon: BarChart3, text: "Rentabilidad por unidad y ruta" },
    ],
    stat: { label: "Control", value: "360°" },
    grupo: "ops",
    href: "/viajes",
  },
  {
    id: "rh",
    icon: Building2,
    label: "Recursos Humanos",
    sub: "RH",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.3)",
    desc: "Expediente digital, vacaciones, prestamos, vencimientos de certificados e historial laboral.",
    features: [
      { icon: Users, text: "Expediente digital completo por empleado" },
      { icon: Clock, text: "Vacaciones, prestamos y descuentos" },
      { icon: Shield, text: "Alertas de vencimiento — licencias, cursos" },
      { icon: Activity, text: "Historial: faltas, aumentos, cambios" },
    ],
    stat: { label: "Alertas", value: "Auto" },
    grupo: "rrhh",
    href: "/rh/empleados",
  },
  {
    id: "flota",
    icon: Fuel,
    label: "Flota y Combustible",
    sub: "Consumo",
    color: "#14B8A6",
    glow: "rgba(20,184,166,0.3)",
    desc: "Control de unidades, cargas de combustible, rendimiento km/L y deteccion de anomalias.",
    features: [
      { icon: Fuel, text: "Registro por unidad, operador y litros" },
      { icon: BarChart3, text: "Km/L comparativos e historicos" },
      { icon: Shield, text: "Deteccion automatica de anomalias" },
      { icon: FileText, text: "Tickets y fotografias de validacion" },
    ],
    stat: { label: "Anomalias", value: "IA" },
    grupo: "ops",
    href: "/flota",
  },
  {
    id: "liquidaciones",
    icon: CreditCard,
    label: "Liquidaciones",
    sub: "Operadores",
    color: "#EC4899",
    glow: "rgba(236,72,153,0.3)",
    desc: "Liquidaciones a operadores: ingresos vs gastos por viaje, comisiones y bonos.",
    features: [
      { icon: Truck, text: "Ingresos vs gastos por viaje" },
      { icon: TrendingUp, text: "Rentabilidad por unidad en tiempo real" },
      { icon: Users, text: "Pagos por viaje, comision y bonos" },
      { icon: Link2, text: "Integracion directa con nomina" },
    ],
    stat: { label: "Rentabilidad", value: "Live" },
    grupo: "ops",
    href: "/liquidaciones",
  },
  {
    id: "compras",
    icon: ShoppingCart,
    label: "Compras y Almacen",
    sub: "Inventario",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.3)",
    desc: "Ordenes de compra, recepcion, control de inventario y movimientos por almacen.",
    features: [
      { icon: Package, text: "Ordenes de compra con flujo de aprobacion" },
      { icon: ShoppingCart, text: "Recepcion parcial y costo promedio" },
      { icon: BarChart3, text: "Inventario por almacen con movimientos" },
      { icon: TrendingUp, text: "Margen de utilidad por operacion" },
    ],
    stat: { label: "Trazabilidad", value: "100%" },
    grupo: "fiscal",
    href: "/ordenes-compra",
  },
  {
    id: "cxp",
    icon: CreditCard,
    label: "Cuentas por Pagar",
    sub: "CXP",
    color: "#10B981",
    glow: "rgba(16,185,129,0.3)",
    desc: "Facturas de proveedores, pagos parciales, conciliacion bancaria y antiguedad de saldos.",
    features: [
      { icon: FileText, text: "Registro de facturas con XML del proveedor" },
      { icon: CreditCard, text: "Pagos parciales y saldo insoluto" },
      { icon: BarChart3, text: "Reporte de antiguedad de saldos" },
      { icon: Activity, text: "Conciliacion con CFDI emitidos" },
    ],
    stat: { label: "Conciliacion", value: "Auto" },
    grupo: "fiscal",
    href: "/cxp",
  },
  {
    id: "integracion",
    icon: Link2,
    label: "Integracion Total",
    sub: "ERP",
    color: "#EF4444",
    glow: "rgba(239,68,68,0.3)",
    desc: "Todos los modulos conectados: facturacion -> CXC, viajes -> CP, RH -> liquidaciones.",
    features: [
      { icon: Link2, text: "Facturacion <-> Cuentas por cobrar" },
      { icon: Link2, text: "Viajes <-> Carta Porte <-> Facturacion" },
      { icon: Link2, text: "Flota <-> Operadores <-> Liquidaciones" },
      { icon: Link2, text: "Compras <-> Almacen <-> CXP" },
    ],
    stat: { label: "Modulos", value: "10+" },
    grupo: "fiscal",
    href: "/admin/configuracion",
  },
];

const BENEFITS = [
  "Sistema de Gestion de Calidad ISO 9001 completo",
  "Cumplimiento total con SAT (CFDI 4.0 y Nomina 1.2)",
  "Carta Porte 3.1 lista para timbrar",
  "No conformidades, auditorias y mejora continua",
  "Agenda de cumplimiento y notificaciones in-app",
  "Encuestas de cliente con link publico (CSAT/NPS)",
  "Timbrado SAT con PAC configurable (Factura.com)",
  "Trazabilidad y colaboracion multi-usuario",
  "100% configurable desde la UI",
];

// Conteos en vivo por módulo (Mando Central). Etiqueta del dato mostrado.
const STAT_LABEL: Record<string, string> = {
  sgc: "KPIs", documentos: "Documentos", procesos: "Diagramas",
  mantenimiento: "Órdenes", nomina: "Periodos", facturacion: "Facturas",
  viajes: "Viajes", rh: "Empleados", flota: "Unidades",
  liquidaciones: "Liquidaciones", compras: "Órdenes",
};

/* ── ANIMATED NUMBER ─────────────────────────────────────────────────────── */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target <= 0) { setVal(0); return; }
    let start = 0;
    const step = Math.max(1, target / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <>{val.toLocaleString("es-MX")}{suffix}</>;
}

/* ── MODULE CARD ─────────────────────────────────────────────────────────── */
function ModuleCard({ mod, isDark, index, live }: { mod: any; index: number; isDark: boolean; live?: { value: number; label: string } }) {
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const Icon = mod.icon;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <a
      href={mod.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="rounded-3xl border flex flex-col overflow-hidden transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ${index * 0.06}s, transform 0.5s ${index * 0.06}s, box-shadow 0.3s`,
        background: isDark
          ? hover ? `linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))` : `rgba(255,255,255,0.025)`
          : hover ? `rgba(255,255,255,0.95)` : `rgba(255,255,255,0.8)`,
        borderColor: hover ? mod.color + "55" : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
        boxShadow: hover ? `0 8px 40px ${mod.glow}, 0 2px 8px rgba(0,0,0,0.15)` : isDark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div className="h-1 w-full transition-all duration-300" style={{ background: hover ? mod.color : "transparent" }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300"
              style={{ background: mod.color + "20", transform: hover ? "scale(1.1) rotate(-6deg)" : "scale(1)" }}>
              <Icon className="w-5 h-5" style={{ color: mod.color }} strokeWidth={1.8} />
            </div>
            <div>
              <p className={`font-black text-sm leading-tight ${d(isDark, "text-white", "text-slate-800")}`}>{mod.label}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: mod.color }}>{mod.sub}</p>
            </div>
          </div>
          <div className="shrink-0 text-right flex flex-col items-end gap-1">
            {mod.nuevo && (
              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white" style={{ background: mod.color }}>Nuevo</span>
            )}
            <p className="text-xl font-black leading-none" style={{ color: mod.color }}>
              {live ? live.value.toLocaleString("es-MX") : mod.stat.value}
            </p>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${d(isDark, "text-slate-500", "text-slate-400")}`}>
              {live ? live.label : mod.stat.label}
            </p>
          </div>
        </div>

        <p className={`text-xs leading-relaxed ${d(isDark, "text-slate-400", "text-slate-500")}`}>{mod.desc}</p>

        <div className="flex flex-col gap-1.5 flex-1">
          {mod.features.map((f: any, i: number) => {
            const FIcon = f.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <FIcon className="w-3 h-3 shrink-0" style={{ color: mod.color }} strokeWidth={2} />
                <span className={`text-[11px] font-medium ${d(isDark, "text-slate-400", "text-slate-500")}`}>{f.text}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <Zap className="w-3 h-3" style={{ color: mod.color }} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${d(isDark, "text-slate-500", "text-slate-400")}`}>Entrar al modulo</span>
          <ArrowRight className="w-3 h-3 ml-auto transition-transform duration-200" style={{ color: mod.color, transform: hover ? "translateX(3px)" : "none" }} />
        </div>
      </div>
    </a>
  );
}

/* ── MAIN PAGE ───────────────────────────────────────────────────────────── */
export default function Page() {
  const { isDarkMode: isDark } = useTheme();
  const { user, empresaActivaId } = useUser();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [tick, setTick] = useState(0);
  const [liveStats, setLiveStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  // Conteos reales por módulo (DRF devuelve `count`; si no, longitud de results).
  useEffect(() => {
    if (!empresaActivaId) return;
    const emp = String(empresaActivaId);
    const set = (id: string, r: any) => {
      const v = typeof r?.count === "number" ? r.count : (Array.isArray(r?.results) ? r.results.length : null);
      if (v != null) setLiveStats((s) => ({ ...s, [id]: v }));
    };
    const tasks: Array<[string, Promise<any>]> = [
      ["facturacion", api.getFacturas({ empresa: emp, page_size: "1" })],
      ["nomina", api.getPeriodosNomina({ empresa: emp, page_size: "1" })],
      ["viajes", api.getViajes({ page_size: "1" })],
      ["rh", api.getEmpleados({ page_size: "1" })],
      ["flota", api.getUnidades({ page_size: "1" })],
      ["compras", api.getOrdenesCompra({ page_size: "1" })],
      ["liquidaciones", api.getLiquidaciones({ page_size: "1" })],
      ["documentos", api.getDocumentos({ empresa: emp, page_size: "1" })],
      ["procesos", api.getDiagramas()],
      ["sgc", api.getKPIs({ empresa: emp })],
      ["mantenimiento", api.getOrdenesMantenimiento()],
    ];
    tasks.forEach(([id, p]) => p.then((r) => set(id, r)).catch(() => {}));
  }, [empresaActivaId]);

  const empresaActiva = user?.empresas.find((e) => e.id === empresaActivaId) || user?.empresas[0];

  const FILTERS = [
    { id: "all", label: "Todo el sistema" },
    { id: "calidad", label: "Calidad / ISO 9001" },
    { id: "fiscal", label: "Fiscal / SAT" },
    { id: "ops", label: "Operativo" },
    { id: "rrhh", label: "RH / Nomina" },
  ];

  const visible = activeFilter === "all"
    ? new Set(MODULES.map((m) => m.id))
    : new Set(MODULES.filter((m) => m.grupo === activeFilter).map((m) => m.id));
  const shown = MODULES.filter((m) => visible.has(m.id));

  const rotating = ["Calidad ISO 9001", "CFDI 4.0", "Carta Porte 3.1", "Gestion Documental", "Nomina CFDI", "PAC configurable", "ERP + SGC Integrado"];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto px-4 sm:px-6 py-6 ${d(isDark, "text-slate-100", "text-slate-800")}`}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-[2rem] overflow-hidden mb-8 border"
        style={{
          background: isDark
            ? "linear-gradient(145deg,rgba(99,102,241,0.15) 0%,rgba(20,184,166,0.1) 50%,rgba(16,185,129,0.08) 100%)"
            : "linear-gradient(145deg,rgba(99,102,241,0.08) 0%,rgba(20,184,166,0.06) 100%)",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: 120 + i * 40, height: 120 + i * 40,
                left: `${10 + i * 15}%`, top: `${-20 + (i % 2) * 40}%`,
                background: ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6"][i],
                animationDelay: `${i * 0.4}s`,
                filter: "blur(40px)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          {/* Logo grande de la empresa */}
          {empresaActiva?.logo_url && (
            <div className="shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl border-2"
                style={{
                  borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
                  boxShadow: "0 20px 60px -10px rgba(99,102,241,0.4)",
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={empresaActiva.logo_url} alt={empresaActiva.nombre} className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5"
              style={{ borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)", background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)" }}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Sistema Integral Empresarial</span>
            </div>

            <h1 className={`text-3xl sm:text-4xl font-black tracking-tighter leading-tight mb-3 ${d(isDark, "text-white", "text-slate-900")}`}>
              ERP <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#6366F1,#14B8A6)" }}>
                {empresaActiva?.nombre || "Profesional"}
              </span>
            </h1>

            <div className="flex items-center gap-2 mb-5 justify-center lg:justify-start">
              <span className={`text-sm ${d(isDark, "text-slate-400", "text-slate-500")}`}>Sistema integral configurable →</span>
              <span className="text-sm font-bold text-indigo-400 min-w-[180px] transition-all duration-500">
                {rotating[tick % rotating.length]}
              </span>
            </div>

            <p className={`text-sm max-w-lg leading-relaxed mb-6 ${d(isDark, "text-slate-400", "text-slate-500")}`}>
              Plataforma empresarial integrada: Sistema de Gestion de Calidad ISO 9001, facturacion CFDI 4.0, Carta Porte 3.1, viajes, flota, RH, nomina y compras — todo conectado en un solo sistema configurable.
            </p>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {["ISO 9001 ✓", "CFDI 4.0 ✓", "Carta Porte 3.1 ✓", "Nómina 1.2 ✓"].map((b) => (
                <span key={b} className="px-3 py-1.5 rounded-xl text-xs font-bold border"
                  style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: isDark ? "#94a3b8" : "#64748b" }}>
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-2 gap-3">
            {[
              { label: "Modulos", value: MODULES.length, suffix: "", color: "#6366F1" },
              { label: "Indicadores KPI", value: liveStats.sgc ?? 0, suffix: "", color: "#10B981" },
              { label: "Facturas", value: liveStats.facturacion ?? 0, suffix: "", color: "#F59E0B" },
              { label: "Viajes", value: liveStats.viajes ?? 0, suffix: "", color: "#14B8A6" },
            ].map((s) => (
              <div key={s.label} className="w-28 h-24 rounded-2xl border flex flex-col items-center justify-center gap-1"
                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", borderColor: s.color + "30" }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>
                  <CountUp target={s.value} suffix={s.suffix} />
                </p>
                <p className={`text-[10px] font-bold text-center uppercase tracking-wide ${d(isDark, "text-slate-500", "text-slate-400")}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTER TABS ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200"
            style={{
              background: activeFilter === f.id
                ? "linear-gradient(135deg,#6366F1,#4338ca)"
                : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              borderColor: activeFilter === f.id ? "transparent" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              color: activeFilter === f.id ? "#fff" : isDark ? "#94a3b8" : "#64748b",
              boxShadow: activeFilter === f.id ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
            }}>
            {f.label}
          </button>
        ))}
        <a href="/admin/configuracion"
          className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all hover:scale-105 ${d(isDark, "border-white/10 text-slate-300 hover:bg-white/[0.04]", "border-slate-200 text-slate-600 hover:bg-slate-50")}`}>
          <Settings className="w-3.5 h-3.5" />
          Configurar sistema
        </a>
      </div>

      {/* ── MODULE GRID ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
        {shown.map((mod, i) => (
          <ModuleCard key={mod.id} mod={mod} isDark={isDark} index={i}
            live={liveStats[mod.id] != null ? { value: liveStats[mod.id], label: STAT_LABEL[mod.id] || mod.stat.label } : undefined} />
        ))}
      </div>

      {/* ── INTEGRATION FLOW ──────────────────────────────────────────── */}
      <div className="rounded-3xl border p-6 mb-8"
        style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Link2 className="w-4 h-4 text-red-400" />
          <h2 className={`font-black text-sm uppercase tracking-widest ${d(isDark, "text-white", "text-slate-800")}`}>Flujo de Integracion Total</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Facturacion", color: "#6366F1" },
            { label: "CXC", color: "#6366F1" },
            { label: "RH", color: "#F59E0B" },
            { label: "Empleados", color: "#F59E0B" },
            { label: "Flota", color: "#14B8A6" },
            { label: "Operadores", color: "#3B82F6" },
            { label: "Viajes", color: "#3B82F6" },
            { label: "Carta Porte", color: "#3B82F6" },
            { label: "Liquidaciones", color: "#EC4899" },
            { label: "CXP", color: "#10B981" },
            { label: "Almacen", color: "#8B5CF6" },
            { label: "Calidad (SGC)", color: "#10B981" },
            { label: "Procesos", color: "#8B5CF6" },
            { label: "Documentos", color: "#0EA5E9" },
            { label: "Competencias", color: "#A855F7" },
            { label: "Capacitacion", color: "#3B82F6" },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold border"
                style={{ background: node.color + "15", borderColor: node.color + "40", color: node.color }}>
                {node.label}
              </span>
              {i < arr.length - 1 && (
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${d(isDark, "text-slate-600", "text-slate-300")}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── BENEFITS ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border p-6"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          background: isDark
            ? "linear-gradient(145deg,rgba(16,185,129,0.08),rgba(20,184,166,0.05))"
            : "linear-gradient(145deg,rgba(16,185,129,0.05),rgba(20,184,166,0.03))",
        }}>
        <div className="flex items-center gap-2 mb-5">
          <Star className="w-4 h-4 text-emerald-400" />
          <h2 className={`font-black text-sm uppercase tracking-widest ${d(isDark, "text-white", "text-slate-800")}`}>Beneficios Clave</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border"
              style={{
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)",
                animationDelay: `${i * 0.1}s`,
              }}>
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span className={`text-xs font-bold ${d(isDark, "text-slate-300", "text-slate-600")}`}>{b}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
