"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, Award, BarChart3, Boxes, Brain, Building2,
  CheckCircle2, ClipboardCheck, Cpu, Factory, FileCheck2, FileText,
  Gauge, Globe, Headphones, Layers, LineChart, Menu, Moon, Phone, Mail,
  RefreshCw, Rocket, Settings2, Shield, ShieldCheck, ShoppingCart,
  Sparkles, Star, Sun, Target, TrendingUp, Truck, Users, Workflow, X, Zap,
} from "lucide-react";
import SynergyLogo from "@/components/SynergyLogo";
import { useTheme } from "@/lib/ThemeContext";

/* ════════════════════════════════════════════════════════════════════════
   SYNERGY CG · ERP A LA MEDIDA — Landing comercial (modo claro / oscuro)
   ════════════════════════════════════════════════════════════════════════ */

const NAVY = "#0A1A3F";
const BLUE = "#1A73E8";
const ORANGE = "#F7941E";

/* Paleta semántica según el tema */
function palette(isDark: boolean) {
  return {
    bg: isDark ? "#050a18" : "#eef3fb",
    text: isDark ? "#cbd5e1" : "#475569",
    heading: isDark ? "#ffffff" : NAVY,
    muted: isDark ? "#94a3b8" : "#64748b",
    surface: isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
    surfaceSolid: isDark ? "#0b1222" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(10,26,63,0.10)",
    nav: isDark ? "rgba(5,10,24,0.82)" : "rgba(255,255,255,0.85)",
    chip: isDark ? "rgba(255,255,255,0.04)" : "rgba(10,26,63,0.04)",
    cardShadow: isDark ? "0 2px 14px rgba(0,0,0,0.3)" : "0 10px 30px rgba(10,26,63,0.08)",
    gridLine: isDark ? "rgba(255,255,255,.5)" : "rgba(10,26,63,.4)",
    input: isDark ? "rgba(5,10,24,0.7)" : "#f8fafc",
  };
}
type Pal = ReturnType<typeof palette>;

/* ── Scroll reveal ──────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`syn-reveal ${seen ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ── Animated counter ───────────────────────────────────────────────────── */
function CountUp({ target, suffix = "", duration = 1600 }: { target: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return;
      done.current = true;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - t0) / duration, 1);
        setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString("es-MX")}{suffix}</span>;
}

/* ── Data ───────────────────────────────────────────────────────────────── */
const MODULES = [
  { icon: Target, label: "Ventas y CRM", color: "#1A73E8", desc: "Gestiona todo el ciclo comercial, del primer contacto al cierre.",
    features: ["Embudo y seguimiento de oportunidades", "Cotizaciones y pedidos en línea", "Historial 360° de cada cliente", "Metas y comisiones por vendedor"] },
  { icon: ShoppingCart, label: "Compras y Proveedores", color: "#F7941E", desc: "Compra mejor, con control y trazabilidad total.",
    features: ["Órdenes de compra con aprobación", "Evaluación y catálogo de proveedores", "Recepción y comparativa de precios", "Requisiciones desde cualquier área"] },
  { icon: Boxes, label: "Inventarios y Almacenes", color: "#34A853", desc: "Tu stock siempre exacto, en tiempo real.",
    features: ["Multi-almacén y multi-ubicación", "Entradas, salidas y traspasos", "Costeo y kardex automático", "Alertas de mínimos y caducidades"] },
  { icon: Factory, label: "Producción / MRP", color: "#8B5CF6", desc: "Planea y controla tu manufactura de punta a punta.",
    features: ["Órdenes de producción y recetas", "Explosión de materiales (MRP)", "Control de capacidad y mermas", "Costo real por orden"] },
  { icon: LineChart, label: "Finanzas y Contabilidad", color: "#0EA5E9", desc: "El corazón financiero, conectado a toda la operación.",
    features: ["Contabilidad y pólizas automáticas", "Cuentas por pagar y por cobrar", "Tesorería y conciliación bancaria", "Estados financieros al instante"] },
  { icon: Users, label: "Recursos Humanos", color: "#EC4899", desc: "Tu personal, ordenado y bajo control.",
    features: ["Expediente digital por empleado", "Nómina, vacaciones y préstamos", "Asistencia e incidencias", "Alertas de vencimientos y cursos"] },
  { icon: Workflow, label: "Proyectos y Servicios", color: "#14B8A6", desc: "Entrega proyectos a tiempo y rentables.",
    features: ["Tareas, etapas y tiempos", "Asignación de recursos", "Rentabilidad por proyecto", "Órdenes de servicio y soporte"] },
  { icon: BarChart3, label: "Reportes e Indicadores (BI)", color: "#F59E0B", desc: "Decide con datos, no con corazonadas.",
    features: ["Tableros (dashboards) en vivo", "KPIs configurables por área", "Reportes exportables a Excel/PDF", "Análisis por periodo y comparativas"] },
  { icon: FileText, label: "Documentos Digitales", color: "#6366F1", desc: "Adiós al papel y a buscar archivos.",
    features: ["Repositorio central seguro", "Control de versiones", "Firmas y aprobaciones", "Búsqueda y resguardo por proceso"] },
  { icon: Building2, label: "Clientes y Facturación", color: "#EF4444", desc: "Factura y cobra sin complicaciones.",
    features: ["Facturación electrónica (CFDI)", "Control de cartera y cobranza", "Estados de cuenta del cliente", "Portal de autoservicio"] },
];

const ISO_ITEMS = [
  { icon: Settings2, t: "Gestión de procesos" },
  { icon: Shield, t: "Gestión de riesgos" },
  { icon: FileCheck2, t: "Control de documentos" },
  { icon: ClipboardCheck, t: "Auditorías internas" },
  { icon: RefreshCw, t: "Acciones correctivas" },
  { icon: TrendingUp, t: "Mejora continua" },
];

const ISO_ROUTE = [
  { n: "01", t: "Diagnóstico inicial", d: "Evaluamos tu empresa frente a la norma ISO 9001:2015 y detectamos las brechas." },
  { n: "02", t: "Documentación", d: "El sistema genera políticas, procedimientos y manuales — sin partir de cero." },
  { n: "03", t: "Implementación", d: "Activamos controles, indicadores y registros de evidencia en cada proceso." },
  { n: "04", t: "Auditoría interna", d: "Simulamos la auditoría y cerramos no conformidades antes del organismo certificador." },
  { n: "05", t: "Certificación", d: "Llegas a la auditoría externa con todo en orden, listo para aprobar." },
];

const ISO_GUARANTEES = [
  { icon: FileCheck2, t: "Evidencia automática", d: "El ERP genera y resguarda toda la evidencia que el auditor te va a pedir." },
  { icon: FileText, t: "Control de versiones", d: "Siempre el documento vigente. Cero papeleo perdido, cero versiones obsoletas." },
  { icon: RefreshCw, t: "No conformidades cerradas", d: "Cada hallazgo se registra y se le da seguimiento hasta resolverlo." },
  { icon: Headphones, t: "Acompañamiento experto", d: "Un consultor te guía en cada etapa, hasta que el organismo te aprueba." },
];

const BENEFITS = [
  { icon: Gauge, t: "Procesos eficientes", d: "Automatiza tareas repetitivas y elimina cuellos de botella." },
  { icon: TrendingUp, t: "Reducción de costos", d: "Menos errores, menos papel, menos tiempo perdido." },
  { icon: Activity, t: "Información en tiempo real", d: "Datos confiables para decidir al instante." },
  { icon: Users, t: "Mejor experiencia", d: "Interfaz intuitiva para todos los usuarios." },
  { icon: ShieldCheck, t: "Cumplimiento normativo", d: "ISO 9001 y obligaciones fiscales cubiertas." },
  { icon: Rocket, t: "Crecimiento sostenible", d: "Un sistema que escala al ritmo de tu empresa." },
];

const STEPS = [
  { icon: Brain, t: "Consultoría", d: "Analizamos tus procesos y detectamos oportunidades." },
  { icon: Cpu, t: "Desarrollo a la medida", d: "Construimos el ERP según tus necesidades reales." },
  { icon: Layers, t: "Implementación", d: "Migración de datos y puesta en marcha sin fricción." },
  { icon: Users, t: "Capacitación", d: "Tu equipo domina el sistema desde el día uno." },
  { icon: Headphones, t: "Soporte continuo", d: "Te acompañamos en todo el ciclo de vida." },
];

const SECTORES = [
  { icon: Factory, t: "Manufactura" },
  { icon: Truck, t: "Logística" },
  { icon: ShoppingCart, t: "Comercio" },
  { icon: Boxes, t: "Distribución" },
  { icon: Workflow, t: "Servicios" },
  { icon: Building2, t: "Corporativo" },
];

const GARANTIAS = [
  { icon: CheckCircle2, t: "Sin costos ocultos" },
  { icon: Layers, t: "Implementación guiada" },
  { icon: Headphones, t: "Soporte en español" },
  { icon: RefreshCw, t: "Actualizaciones continuas" },
];

/* Lo que hace al ERP "de nueva generación" — adaptable a cualquier empresa */
const ADAPTA = [
  { icon: Workflow, t: "Flujos de trabajo configurables", d: "Diseña aprobaciones, etapas y reglas como tu empresa los vive — sin programar." },
  { icon: Settings2, t: "Campos y formularios a la medida", d: "Agrega los datos que tu operación necesita en cada módulo y pantalla." },
  { icon: Zap, t: "Automatizaciones inteligentes", d: "Reglas de negocio que disparan alertas, tareas y movimientos por sí solas." },
  { icon: Shield, t: "Roles y permisos por usuario", d: "Cada persona ve y hace exactamente lo que le corresponde. Total control." },
  { icon: Building2, t: "Multi-empresa y multi-sucursal", d: "Opera varias razones sociales y ubicaciones desde un mismo sistema." },
  { icon: Globe, t: "Integraciones y API abierta", d: "Conéctalo con bancos, SAT, e-commerce y las herramientas que ya usas." },
];

/* ── Orbit (hero visual) ────────────────────────────────────────────────── */
function Orbit({ isDark }: { isDark: boolean }) {
  const ring = MODULES.slice(0, 8);
  return (
    <div className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] mx-auto">
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(10,26,63,0.1)" }} />
      <div className="absolute inset-8 rounded-full border" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10,26,63,0.06)" }} />
      <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: `radial-gradient(circle, ${BLUE}55, transparent 70%)` }} />
      <div className="absolute inset-0 syn-orbit">
        {ring.map((m, i) => {
          const angle = (i / ring.length) * Math.PI * 2;
          const x = 50 + Math.cos(angle) * 48;
          const y = 50 + Math.sin(angle) * 48;
          const Icon = m.icon;
          return (
            <div key={m.label}
              className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border syn-orbit-rev"
              style={{
                left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(10,26,63,0.08)",
                boxShadow: `0 8px 24px ${m.color}40`,
              }}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: m.color }} strokeWidth={1.9} />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center text-center shadow-2xl border border-white/10"
          style={{ background: `radial-gradient(circle at 30% 25%, ${BLUE}, ${NAVY})` }}>
          <span className="absolute w-full h-full rounded-full" style={{ animation: "syn-pulse-ring 3s ease-out infinite", boxShadow: `0 0 0 2px ${BLUE}66` }} />
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">ERP</p>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mt-1">A tu medida</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isDarkMode: isDark, toggleTheme } = useTheme();
  const c = palette(isDark);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 24);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pedirConsultor = () => {
    setMensaje("Hola, me interesa la opción de CONSULTOR DEDICADO para certificar mi empresa en ISO 9001 con su ERP. ¿Pueden contactarme para una asesoría?");
    go("contacto");
  };

  const NAV = [
    { id: "adaptable", label: "Plataforma" },
    { id: "modulos", label: "Módulos" },
    { id: "iso", label: "ISO 9001" },
    { id: "ia", label: "IA" },
    { id: "beneficios", label: "Beneficios" },
    { id: "proceso", label: "Cómo trabajamos" },
  ];

  const ThemeToggle = ({ className = "" }: { className?: string }) => (
    <button
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${className}`}
      style={{ borderColor: c.border, background: c.chip, color: c.heading }}
    >
      {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
    </button>
  );

  return (
    <div ref={scrollRef} className="syn-scroll h-screen overflow-y-auto antialiased transition-colors duration-300"
      style={{ background: c.bg, color: c.text }}>

      {/* ══ RIBBON DE ANUNCIO ═══════════════════════════════════════════ */}
      <div className="relative text-white text-center text-xs sm:text-sm font-bold py-2 px-4"
        style={{ background: `linear-gradient(90deg, ${NAVY}, ${BLUE}, ${NAVY})`, backgroundSize: "200% auto" }}>
        <span className="syn-shimmer bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#fff,#ffd9a8,#fff)" }}>
          🚀 Nueva División: Consultoría &amp; Sistemas de Gestión
        </span>
        <span className="hidden sm:inline text-white/90"> — ERP a la medida + certificación ISO 9001</span>
      </div>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? c.nav : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: `1px solid ${scrolled ? c.border : "transparent"}`,
        }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <button onClick={() => go("top")} className="cursor-pointer">
            <SynergyLogo size="md" variant={isDark ? "onDark" : "onLight"} />
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors hover:opacity-100"
                style={{ color: c.muted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = c.heading)}
                onMouseLeave={(e) => (e.currentTarget.style.color = c.muted)}>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <ThemeToggle />
            <button onClick={() => go("contacto")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)`, boxShadow: `0 8px 24px ${ORANGE}55` }}>
              Solicitar demo
            </button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button className="p-2" style={{ color: c.heading }} onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-5 pb-4 flex flex-col gap-1 border-t" style={{ borderColor: c.border, background: c.bg }}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className="text-left px-3 py-3 text-sm font-semibold rounded-lg" style={{ color: c.text }}>
                {n.label}
              </button>
            ))}
            <div className="mt-2">
              <button onClick={() => go("contacto")} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)` }}>Solicitar demo</button>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="syn-aurora absolute -top-40 -left-32 w-[640px] h-[640px] rounded-full blur-3xl" style={{ background: `${BLUE}33` }} />
          <div className="syn-aurora absolute top-20 -right-40 w-[560px] h-[560px] rounded-full blur-3xl" style={{ background: `${ORANGE}22`, animationDelay: "4s" }} />
          <div className="syn-aurora absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full blur-3xl" style={{ background: "#34A85322", animationDelay: "8s" }} />
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: `linear-gradient(${c.gridLine} 1px,transparent 1px),linear-gradient(90deg,${c.gridLine} 1px,transparent 1px)`, backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-20 sm:pt-20 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6" style={{ borderColor: c.border, background: c.chip }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ORANGE }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: c.muted }}>División Consultoría de Negocios</span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight" style={{ color: c.heading }}>
                ERP Inteligente,{" "}
                <span className="text-transparent bg-clip-text syn-shimmer" style={{ backgroundImage: `linear-gradient(90deg, ${BLUE}, ${ORANGE}, ${BLUE})` }}>
                  hecho a tu medida
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-5 text-lg max-w-xl leading-relaxed" style={{ color: c.text }}>
                Un solo sistema. Todos tus procesos.{" "}
                <span className="font-bold" style={{ color: c.heading }}>Conectados</span>,{" "}
                <span className="font-bold" style={{ color: ORANGE }}>automatizados</span> e{" "}
                <span className="font-bold" style={{ color: BLUE }}>inteligentes</span>. Transformamos procesos, impulsamos resultados.
              </p>
            </Reveal>

            {/* chips de propuesta */}
            <Reveal delay={220}>
              <div className="mt-6 flex flex-wrap gap-2">
                {["A la medida", "100% conectado", "IA integrada", "ISO 9001 certificable"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border" style={{ borderColor: c.border, background: c.chip, color: c.heading }}>
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#34A853" }} /> {t}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => go("contacto")}
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white shadow-xl transition-transform hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)`, boxShadow: `0 12px 36px ${ORANGE}55` }}>
                  Solicitar demo gratis
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => go("modulos")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold border transition-colors"
                  style={{ borderColor: c.border, background: c.chip, color: c.heading }}>
                  Ver módulos
                </button>
              </div>
            </Reveal>

            {/* prueba social */}
            <Reveal delay={340}>
              <div className="mt-7 flex items-center gap-4">
                <div className="flex -space-x-2.5">
                  {[BLUE, ORANGE, "#34A853", "#8B5CF6"].map((col, i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-white text-xs font-black"
                      style={{ background: col, borderColor: c.bg }}>
                      {["A", "M", "R", "S"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: ORANGE }} />)}
                  </div>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: c.muted }}>Empresas que confían en Synergy CG</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-9 grid grid-cols-3 gap-4 max-w-md">
                {[
                  { v: 10, s: "+", l: "Módulos" },
                  { v: 100, s: "%", l: "A la medida" },
                  { v: 9001, s: "", l: "ISO certificable" },
                ].map((x) => (
                  <div key={x.l}>
                    <p className="text-3xl font-black" style={{ color: c.heading }}><CountUp target={x.v} suffix={x.s} /></p>
                    <p className="text-xs font-semibold mt-1" style={{ color: c.muted }}>{x.l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="flex justify-center">
            <div className="relative syn-float-slow">
              <Orbit isDark={isDark} />
              {/* tarjeta KPI flotante */}
              <div className="absolute -left-2 sm:-left-6 top-6 rounded-2xl border p-3.5 backdrop-blur-md shadow-xl syn-float"
                style={{ background: isDark ? "rgba(11,18,34,0.85)" : "rgba(255,255,255,0.92)", borderColor: c.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#34A85322" }}>
                    <TrendingUp className="w-4.5 h-4.5" style={{ color: "#34A853" }} />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-none" style={{ color: c.heading }}>+38%</p>
                    <p className="text-[10px] font-semibold" style={{ color: c.muted }}>Productividad</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-2 sm:-right-4 bottom-8 rounded-2xl border p-3.5 backdrop-blur-md shadow-xl syn-float" style={{ background: isDark ? "rgba(11,18,34,0.85)" : "rgba(255,255,255,0.92)", borderColor: c.border, animationDelay: "1.5s" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}22` }}>
                    <ShieldCheck className="w-4.5 h-4.5" style={{ color: ORANGE }} />
                  </div>
                  <div>
                    <p className="text-sm font-black leading-tight" style={{ color: c.heading }}>ISO 9001</p>
                    <p className="text-[10px] font-semibold" style={{ color: c.muted }}>Listo para auditoría</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* trust marquee */}
        <div className="relative border-y py-4 overflow-hidden" style={{ borderColor: c.border, background: c.chip }}>
          <div className="flex w-max syn-marquee gap-10 px-5">
            {[...Array(2)].map((_, dup) => (
              <React.Fragment key={dup}>
                {[
                  { i: Target, t: "A la medida de tu negocio" },
                  { i: Zap, t: "100% conectado en tiempo real" },
                  { i: TrendingUp, t: "Escalable y flexible" },
                  { i: Brain, t: "Inteligencia artificial integrada" },
                  { i: ShieldCheck, t: "ISO 9001 — Norma actualizada" },
                  { i: Globe, t: "Soluciones que transforman" },
                ].map((x, i) => {
                  const Ic = x.i;
                  return (
                    <span key={`${dup}-${i}`} className="inline-flex items-center gap-2.5 text-sm font-bold whitespace-nowrap" style={{ color: c.muted }}>
                      <Ic className="w-4 h-4" style={{ color: ORANGE }} /> {x.t}
                      <span className="w-1.5 h-1.5 rounded-full ml-4" style={{ background: c.border }} />
                    </span>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* garantías rápidas + sectores */}
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16">
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {GARANTIAS.map((g) => {
                const Ic = g.icon;
                return (
                  <div key={g.t} className="flex items-center gap-3 p-4 rounded-2xl border" style={{ borderColor: c.border, background: c.surface, boxShadow: c.cardShadow }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${BLUE}1a` }}>
                      <Ic className="w-5 h-5" style={{ color: BLUE }} strokeWidth={2} />
                    </div>
                    <span className="text-sm font-black leading-tight" style={{ color: c.heading }}>{g.t}</span>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mt-12 mb-6" style={{ color: c.muted }}>
              Diseñado para empresas de todos los sectores
            </p>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {SECTORES.map((s) => {
                const Ic = s.icon;
                return (
                  <div key={s.t} className="group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:-translate-y-1" style={{ borderColor: c.border, background: c.surface }}>
                    <Ic className="w-6 h-6 transition-transform group-hover:scale-110" style={{ color: ORANGE }} strokeWidth={1.7} />
                    <span className="text-xs font-bold text-center" style={{ color: c.text }}>{s.t}</span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ ERP DE NUEVA GENERACIÓN (adaptable) ═════════════════════════ */}
      <section id="adaptable" className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="syn-aurora absolute top-10 -right-24 w-[480px] h-[480px] rounded-full blur-3xl" style={{ background: `${BLUE}1a` }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5" style={{ borderColor: `${BLUE}55`, background: `${BLUE}14` }}>
              <Sparkles className="w-4 h-4" style={{ color: BLUE }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>ERP de nueva generación</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: c.heading }}>
              Un ERP que se adapta a tu empresa, <span style={{ color: ORANGE }}>no al revés</span>
            </h2>
            <p className="mt-4 text-lg" style={{ color: c.muted }}>
              Olvídate de los sistemas rígidos que te obligan a cambiar tu forma de trabajar. Este ERP se construye con <span className="font-bold" style={{ color: c.heading }}>flujos y herramientas configurables</span> que se moldean a tus procesos — sin importar tu giro o tamaño.
            </p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADAPTA.map((a, i) => {
              const Icon = a.icon;
              return (
                <Reveal key={a.t} delay={(i % 3) * 80}>
                  <div className="group h-full rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1.5" style={{ borderColor: c.border, background: c.surface, boxShadow: c.cardShadow }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
                      <Icon className="w-6 h-6 text-white" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-black text-lg" style={{ color: c.heading }}>{a.t}</h3>
                    <p className="mt-2 leading-relaxed" style={{ color: c.muted }}>{a.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <div className="mt-10 rounded-[2rem] overflow-hidden border border-white/10 p-7 sm:p-9 flex flex-col sm:flex-row items-center gap-5 justify-between" style={{ background: `linear-gradient(135deg, ${NAVY}, #06122e)` }}>
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl hidden sm:flex items-center justify-center shrink-0" style={{ background: `${ORANGE}22` }}>
                  <Sparkles className="w-6 h-6" style={{ color: ORANGE }} />
                </div>
                <p className="text-lg sm:text-xl font-black text-white leading-snug">
                  ¿Tu empresa hace algo distinto? <span style={{ color: ORANGE }}>Perfecto.</span> El sistema se moldea a tu forma de trabajar.
                </p>
              </div>
              <button onClick={() => go("contacto")} className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)`, boxShadow: `0 8px 24px ${ORANGE}55` }}>
                Quiero verlo en acción <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ MÓDULOS ═════════════════════════════════════════════════════ */}
      <section id="modulos" className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Un ERP completo</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight" style={{ color: c.heading }}>Todos tus procesos en un solo lugar</h2>
          <p className="mt-4 text-lg" style={{ color: c.muted }}>Cada módulo se conecta con los demás y se configura a tu medida. La información fluye sola: sin islas, sin doble captura, sin sorpresas.</p>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.label} delay={(i % 4) * 60}>
                <div className="group relative h-full rounded-3xl border p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
                  style={{ borderColor: c.border, background: c.surface, boxShadow: c.cardShadow }}>
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" style={{ background: m.color }} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: m.color + "22" }}>
                        <Icon className="w-6 h-6" style={{ color: m.color }} strokeWidth={1.9} />
                      </div>
                      <h3 className="font-black text-[15px] leading-snug" style={{ color: c.heading }}>{m.label}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: c.muted }}>{m.desc}</p>
                    <ul className="mt-4 space-y-2 pt-4 border-t" style={{ borderColor: c.border }}>
                      {m.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: m.color }} strokeWidth={2.4} />
                          <span className="text-[13px] font-medium leading-snug" style={{ color: c.text }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ background: m.color }} />
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 rounded-3xl border p-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-3" style={{ borderColor: c.border, background: c.surface }}>
            <span className="text-xs font-bold uppercase tracking-widest mr-2" style={{ color: c.muted }}>Flujo conectado</span>
            {["Ventas", "Inventario", "Producción", "Compras", "Finanzas", "BI"].map((n, i, a) => (
              <React.Fragment key={n}>
                <span className="px-3 py-1.5 rounded-xl text-sm font-bold border" style={{ background: i % 2 ? `${ORANGE}1a` : `${BLUE}1a`, borderColor: c.border, color: c.heading }}>{n}</span>
                {i < a.length - 1 && <ArrowRight className="w-4 h-4" style={{ color: c.muted }} />}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══ ISO 9001 ════════════════════════════════════════════════════ */}
      <section id="iso" className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="syn-aurora absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: `${ORANGE}1f` }} />
          <div className="syn-aurora absolute bottom-10 -left-20 w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: `${BLUE}14`, animationDelay: "5s" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5" style={{ borderColor: `${ORANGE}55`, background: `${ORANGE}14` }}>
                <Award className="w-4 h-4" style={{ color: ORANGE }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ORANGE }}>Módulo especial · Tu ventaja competitiva</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: c.heading }}>
                Te llevamos a la <span style={{ color: ORANGE }}>certificación ISO 9001</span> — con la seguridad de lograrla
              </h2>
              <p className="mt-5 text-lg leading-relaxed" style={{ color: c.text }}>
                Con Synergy CG no improvisas tu certificación: la <span className="font-bold" style={{ color: c.heading }}>planeamos, documentamos y te acompañamos</span> hasta que el organismo certificador te apruebe. El ERP guarda toda la evidencia que el auditor exige, así llegas a la auditoría con la <span className="font-bold" style={{ color: ORANGE }}>tranquilidad de pasar</span>.
              </p>

              {/* Opción de consultor dedicado */}
              <div className="mt-6 flex items-start gap-4 rounded-2xl border p-4 sm:p-5" style={{ borderColor: `${ORANGE}55`, background: isDark ? `${ORANGE}10` : `${ORANGE}0d` }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)` }}>
                  <Headphones className="w-5 h-5 text-white" strokeWidth={1.9} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black" style={{ color: c.heading }}>Opción de consultor dedicado</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide text-white" style={{ background: ORANGE }}>Recomendado</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: c.muted }}>
                    Un experto en sistemas de gestión de calidad te asesora paso a paso — diagnóstico, documentación, auditoría interna y auditoría de certificación — hasta obtener tu sello ISO 9001.
                  </p>
                  <button onClick={pedirConsultor} className="mt-3 inline-flex items-center gap-1.5 text-sm font-black transition-transform hover:translate-x-0.5" style={{ color: ORANGE }}>
                    Solicitar un consultor <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                {ISO_ITEMS.map((x) => {
                  const Ic = x.icon;
                  return (
                    <div key={x.t} className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ borderColor: c.border, background: c.surface }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ORANGE}1f` }}>
                        <Ic className="w-4.5 h-4.5" style={{ color: ORANGE }} strokeWidth={2} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: c.heading }}>{x.t}</span>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={150} className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-[2.5rem] blur-2xl opacity-40" style={{ background: `radial-gradient(circle, ${ORANGE}66, transparent 70%)` }} />
                <div className="relative w-72 sm:w-80 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center p-8 syn-float"
                  style={{ background: `linear-gradient(155deg, ${NAVY}, #06122e)` }}>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5 shadow-2xl" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)` }}>
                    <ShieldCheck className="w-12 h-12 text-white" strokeWidth={1.6} />
                  </div>
                  <p className="text-2xl font-black text-white">ISO 9001:2015</p>
                  <p className="text-sm text-slate-300 mt-1">Calidad certificada.<br />Confianza garantizada.</p>
                  <div className="mt-4 flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" style={{ color: ORANGE }} />)}</div>
                  <div className="mt-5 pt-5 border-t border-white/10 w-full grid grid-cols-2 gap-4">
                    <div><p className="text-2xl font-black" style={{ color: ORANGE }}><CountUp target={100} suffix="%" /></p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">Evidencia trazable</p></div>
                    <div><p className="text-2xl font-black text-white">A–Z</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">Acompañamiento total</p></div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal className="mt-20">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Paso a paso, sin sorpresas</p>
              <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight" style={{ color: c.heading }}>Tu ruta a la certificación</h3>
              <p className="mt-3" style={{ color: c.muted }}>Un proceso claro y guiado. Sabes en todo momento dónde estás y qué sigue.</p>
            </div>
          </Reveal>

          <div className="mt-12 relative">
            <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-0.5" style={{ background: `linear-gradient(90deg, ${BLUE}, ${ORANGE})` }} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {ISO_ROUTE.map((s, i) => (
                <Reveal key={s.n} delay={i * 90}>
                  <div className="relative text-center">
                    <div className="relative z-10 w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-xl" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, boxShadow: `0 8px 24px ${BLUE}40` }}>{s.n}</div>
                    <h4 className="mt-4 font-black" style={{ color: c.heading }}>{s.t}</h4>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: c.muted }}>{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="mt-20">
            <div className="rounded-[2rem] border p-7 sm:p-10" style={{ borderColor: c.border, background: isDark ? `linear-gradient(135deg, ${ORANGE}0f, rgba(255,255,255,0.02))` : `linear-gradient(135deg, ${ORANGE}10, #ffffff)`, boxShadow: c.cardShadow }}>
              <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)` }}><ShieldCheck className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black" style={{ color: c.heading }}>¿Por qué te certificas con nosotros con seguridad?</h3>
                  <p className="mt-1" style={{ color: c.muted }}>Porque la certificación deja de depender de la memoria y el papel: el sistema lo respalda todo.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ISO_GUARANTEES.map((g, i) => {
                  const Ic = g.icon;
                  return (
                    <Reveal key={g.t} delay={i * 70}>
                      <div className="h-full rounded-2xl border p-5" style={{ borderColor: c.border, background: isDark ? "rgba(5,10,24,0.6)" : "#ffffff" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${ORANGE}1f` }}><Ic className="w-5 h-5" style={{ color: ORANGE }} strokeWidth={1.9} /></div>
                        <h4 className="font-black text-[15px]" style={{ color: c.heading }}>{g.t}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: c.muted }}>{g.d}</p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border p-5" style={{ borderColor: c.border, background: c.surface }}>
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <Award className="w-8 h-8 shrink-0" style={{ color: ORANGE }} />
                  <p className="font-bold" style={{ color: c.text }}>Compromiso Synergy CG: <span style={{ color: c.heading }}>te acompañamos hasta aprobar la auditoría de certificación.</span></p>
                </div>
                <button onClick={pedirConsultor} className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)`, boxShadow: `0 8px 24px ${ORANGE}55` }}>
                  Quiero certificarme <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ IA ══════════════════════════════════════════════════════════ */}
      <section id="ia" className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="rounded-[2.5rem] border border-white/[0.08] overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${NAVY}, #04102b)` }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 80% 20%, ${BLUE}, transparent 45%)` }} />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center p-8 sm:p-12 lg:p-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.05] mb-5">
                <Brain className="w-4 h-4" style={{ color: BLUE }} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Inteligencia artificial integrada</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Decisiones más rápidas.<br />Procesos más inteligentes.</h2>
              <p className="mt-5 text-lg text-slate-300 leading-relaxed">Tu ERP no solo guarda información: la interpreta. Detecta anomalías, anticipa tendencias y sugiere acciones para que tu empresa sea más competitiva.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {["Detección de anomalías", "Pronósticos", "Sugerencias automáticas", "Reportes inteligentes"].map((t) => (
                  <span key={t} className="px-3.5 py-2 rounded-xl text-sm font-bold text-slate-200 border border-white/10 bg-white/[0.04]">{t}</span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={150} className="flex justify-center">
              <div className="relative w-56 h-56 syn-float">
                <div className="absolute inset-0 rounded-full border border-dashed border-white/15 syn-orbit" />
                <div className="absolute inset-6 rounded-full border border-white/10 syn-orbit-rev" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${BLUE}, #5b21b6)` }}><Cpu className="w-14 h-14 text-white" strokeWidth={1.4} /></div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ BENEFICIOS ══════════════════════════════════════════════════ */}
      <section id="beneficios" className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Beneficios clave</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight" style={{ color: c.heading }}>Lo que tu empresa gana</h2>
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.t} delay={(i % 3) * 80}>
                <div className="group h-full rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1" style={{ borderColor: c.border, background: c.surface, boxShadow: c.cardShadow }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${BLUE}33, ${ORANGE}22)` }}><Icon className="w-6 h-6" style={{ color: c.heading }} strokeWidth={1.9} /></div>
                  <h3 className="font-black text-lg" style={{ color: c.heading }}>{b.t}</h3>
                  <p className="mt-2 leading-relaxed" style={{ color: c.muted }}>{b.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ══ PROCESO ═════════════════════════════════════════════════════ */}
      <section id="proceso" className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="syn-aurora absolute -bottom-20 left-1/4 w-[520px] h-[520px] rounded-full blur-3xl" style={{ background: `${BLUE}1a` }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Acompañamiento integral</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight" style={{ color: c.heading }}>Cómo trabajamos contigo</h2>
            <p className="mt-4 text-lg" style={{ color: c.muted }}>No te entregamos un software y desaparecemos. Te acompañamos en todo el ciclo.</p>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.t} delay={i * 80}>
                  <div className="relative h-full rounded-3xl border p-6 text-center" style={{ borderColor: c.border, background: c.surface, boxShadow: c.cardShadow }}>
                    <span className="absolute top-4 right-5 text-4xl font-black" style={{ color: isDark ? "rgba(255,255,255,0.06)" : "rgba(10,26,63,0.06)" }}>{i + 1}</span>
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}><Icon className="w-7 h-7 text-white" strokeWidth={1.7} /></div>
                    <h3 className="font-black" style={{ color: c.heading }}>{s.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: c.muted }}>{s.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ CTA + CONTACTO ══════════════════════════════════════════════ */}
      <section id="contacto" className="relative max-w-7xl mx-auto px-5 sm:px-8 pb-24">
        <Reveal>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 p-8 sm:p-14" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #06122e 60%, #0a0f2a 100%)` }}>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: ORANGE }} />
            <div className="absolute -bottom-24 -left-10 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: BLUE }} />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">Transforma tu empresa.<br /><span style={{ color: ORANGE }}>Impulsa tu futuro.</span></h2>
                <p className="mt-5 text-lg text-slate-300 max-w-md">Agenda una demo gratuita y descubre cómo un ERP a tu medida puede ordenar, automatizar y hacer crecer tu negocio.</p>
                <div className="mt-7 flex flex-col gap-3 text-slate-300">
                  <a href="tel:+520000000000" className="inline-flex items-center gap-3 hover:text-white transition-colors">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}22` }}><Phone className="w-4 h-4" style={{ color: ORANGE }} /></span><span className="font-bold">Llámanos para una asesoría</span>
                  </a>
                  <a href="mailto:contacto@synergycg.com" className="inline-flex items-center gap-3 hover:text-white transition-colors">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}22` }}><Mail className="w-4 h-4" style={{ color: BLUE }} /></span><span className="font-bold">contacto@synergycg.com</span>
                  </a>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); alert("¡Gracias! Un asesor de Synergy CG te contactará pronto."); }}
                className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-7 flex flex-col gap-3">
                <p className="font-black text-white text-lg">Solicita tu demo</p>
                {[{ n: "Nombre", t: "text", p: "Tu nombre" }, { n: "Empresa", t: "text", p: "Nombre de tu empresa" }, { n: "Correo", t: "email", p: "correo@empresa.com" }].map((f) => (
                  <input key={f.n} type={f.t} required placeholder={f.p}
                    className="w-full bg-[#050a18]/70 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1A73E8]/60 transition-colors" />
                ))}
                <textarea rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Cuéntanos sobre tu empresa o tu reto..." className="w-full bg-[#050a18]/70 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1A73E8]/60 transition-colors resize-none" />
                <button type="submit" className="mt-1 w-full py-3.5 rounded-xl font-black text-white shadow-xl transition-transform hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${ORANGE}, #ff6a00)`, boxShadow: `0 10px 30px ${ORANGE}55` }}>Quiero mi demo gratis</button>
                <p className="text-[11px] text-slate-500 text-center">Respondemos en menos de 24 horas hábiles.</p>
              </form>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer style={{ background: isDark ? "#040814" : NAVY }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <SynergyLogo size="lg" variant="onDark" tagline />
            <p className="mt-4 text-slate-400 max-w-sm leading-relaxed">Soluciones integrales para tu cadena de suministro. Desarrollamos ERP a la medida de tus necesidades, expectativas y resultados.</p>
            <p className="mt-4 text-sm font-bold" style={{ color: ORANGE }}>Tu visión. Nuestra experiencia. Soluciones que transforman.</p>
          </div>
          <div>
            <p className="font-black text-white mb-3">Producto</p>
            <ul className="space-y-2 text-sm text-slate-400">{NAV.map((n) => <li key={n.id}><button onClick={() => go(n.id)} className="hover:text-white transition-colors">{n.label}</button></li>)}</ul>
          </div>
          <div>
            <p className="font-black text-white mb-3">Empresa</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><button onClick={() => go("contacto")} className="hover:text-white transition-colors">Solicitar demo</button></li>
              <li><button onClick={() => go("iso")} className="hover:text-white transition-colors">Certificación ISO 9001</button></li>
              <li><a href="mailto:contacto@synergycg.com" className="hover:text-white transition-colors">contacto@synergycg.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Synergy CG · División Consultoría de Negocios. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#34A853" }} /> ERP a la medida · ISO 9001 certificable</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
