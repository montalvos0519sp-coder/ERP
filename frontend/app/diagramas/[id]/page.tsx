"use client";

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, ArrowRight, Bold, ChevronDown,
  ChevronRight as ChevronRightIcon, Circle as CircleIcon, Copy, Eye, FileText, Globe, Hand,
  Image as ImageIcon, Italic, Link2, Lock, Minus, MousePointer2, Palette, Pencil,
  Plus, Rows3, Save, Search, Share2, Square as SquareIcon, Star, Trash2, Type,
  Underline, User as UserIcon, Users, Workflow, X, ZapOff,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
} from "lucide-react";
import {
  BaseEdge, Background, BackgroundVariant, ConnectionMode, Controls,
  EdgeLabelRenderer, Handle, MarkerType, MiniMap, NodeResizer, Position,
  ReactFlow, ReactFlowProvider, SelectionMode, addEdge, getSmoothStepPath,
  getNodesBounds, getViewportForBounds,
  useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type EdgeProps, type Node, type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

/* ────────────────────────────────────────────────────────────────────────────
 * REGISTRO DE FIGURAS
 * Cada figura tiene un id, label, categoría, defaults (label/color/size), y un
 * SVG mini para mostrar en la paleta. El render dentro del canvas se hace en
 * `renderShape` según `shape`.
 * ──────────────────────────────────────────────────────────────────────────── */
type ShapeKind =
  | "rect" | "rounded" | "diamond" | "oval" | "parallelogram" | "trapezoid"
  | "circle" | "hexagon" | "triangle" | "cylinder" | "document" | "card"
  | "predefined" | "manual" | "delay" | "display" | "note" | "text"
  | "swimlane-h" | "swimlane-v";

interface ShapeDef {
  kind: ShapeKind;
  label: string;
  categoria: string;
  defaults: { label: string; color: string; w: number; h: number };
  miniSvg: React.ReactNode;
}

const COLOR_FLUJO = "#3B82F6";
const COLOR_DECISION = "#F59E0B";
const COLOR_TERMINAL = "#10B981";
const COLOR_DATOS = "#8B5CF6";
const COLOR_CONECTOR = "#EC4899";
const COLOR_NOTA = "#FCD34D";

// Iconos SVG miniatura compactos
function svgMini(d: React.ReactNode, extra: Record<string, unknown> = {}) {
  return (
    <svg viewBox="0 0 36 24" fill="none" className="w-9 h-6" {...(extra as any)}>
      {d}
    </svg>
  );
}

const SHAPES: ShapeDef[] = [
  // ── Diagrama de Flujo ──
  { kind: "oval", label: "Inicio / Fin", categoria: "Diagrama de Flujo",
    defaults: { label: "Inicio", color: COLOR_TERMINAL, w: 160, h: 64 },
    miniSvg: svgMini(<rect x="2" y="4" width="32" height="16" rx="8" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "rect", label: "Proceso", categoria: "Diagrama de Flujo",
    defaults: { label: "Proceso", color: COLOR_FLUJO, w: 160, h: 64 },
    miniSvg: svgMini(<rect x="2" y="4" width="32" height="16" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "rounded", label: "Proceso redondeado", categoria: "Diagrama de Flujo",
    defaults: { label: "Proceso", color: COLOR_FLUJO, w: 160, h: 64 },
    miniSvg: svgMini(<rect x="2" y="4" width="32" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "diamond", label: "Decisión", categoria: "Diagrama de Flujo",
    defaults: { label: "¿Decisión?", color: COLOR_DECISION, w: 160, h: 100 },
    miniSvg: svgMini(<polygon points="18,3 33,12 18,21 3,12" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "parallelogram", label: "Datos (E/S)", categoria: "Diagrama de Flujo",
    defaults: { label: "Datos", color: COLOR_DATOS, w: 170, h: 64 },
    miniSvg: svgMini(<polygon points="7,4 34,4 29,20 2,20" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "document", label: "Documento", categoria: "Diagrama de Flujo",
    defaults: { label: "Documento", color: COLOR_DATOS, w: 170, h: 70 },
    miniSvg: svgMini(<path d="M2 4 H34 V18 Q26 22 18 18 Q10 14 2 18 Z" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "predefined", label: "Subproceso", categoria: "Diagrama de Flujo",
    defaults: { label: "Subproceso", color: COLOR_FLUJO, w: 170, h: 64 },
    miniSvg: svgMini(<><rect x="2" y="4" width="32" height="16" stroke="currentColor" strokeWidth="1.5" /><line x1="7" y1="4" x2="7" y2="20" stroke="currentColor" strokeWidth="1.5" /><line x1="29" y1="4" x2="29" y2="20" stroke="currentColor" strokeWidth="1.5" /></>) },
  { kind: "manual", label: "Operación manual", categoria: "Diagrama de Flujo",
    defaults: { label: "Manual", color: COLOR_DECISION, w: 170, h: 64 },
    miniSvg: svgMini(<polygon points="2,4 34,4 29,20 7,20" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "trapezoid", label: "Operación", categoria: "Diagrama de Flujo",
    defaults: { label: "Operación", color: COLOR_FLUJO, w: 170, h: 64 },
    miniSvg: svgMini(<polygon points="7,4 29,4 34,20 2,20" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "delay", label: "Demora", categoria: "Diagrama de Flujo",
    defaults: { label: "Demora", color: COLOR_DECISION, w: 150, h: 64 },
    miniSvg: svgMini(<path d="M2 4 H22 Q34 4 34 12 Q34 20 22 20 H2 Z" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "display", label: "Pantalla", categoria: "Diagrama de Flujo",
    defaults: { label: "Mostrar", color: COLOR_TERMINAL, w: 170, h: 64 },
    miniSvg: svgMini(<path d="M7 4 H29 Q36 12 29 20 H7 Q2 12 7 4 Z" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "cylinder", label: "Base de datos", categoria: "Diagrama de Flujo",
    defaults: { label: "BD", color: COLOR_DATOS, w: 130, h: 80 },
    miniSvg: svgMini(<><ellipse cx="18" cy="6" rx="14" ry="3" stroke="currentColor" strokeWidth="1.5" /><path d="M4 6 V18 Q4 21 18 21 Q32 21 32 18 V6" stroke="currentColor" strokeWidth="1.5" /></>) },
  { kind: "card", label: "Tarjeta", categoria: "Diagrama de Flujo",
    defaults: { label: "Tarjeta", color: COLOR_FLUJO, w: 160, h: 64 },
    miniSvg: svgMini(<polygon points="8,4 34,4 34,20 2,20 2,10" stroke="currentColor" strokeWidth="1.5" />) },

  // ── Formas básicas ──
  { kind: "circle", label: "Círculo", categoria: "Formas básicas",
    defaults: { label: "", color: COLOR_CONECTOR, w: 80, h: 80 },
    miniSvg: svgMini(<circle cx="18" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "hexagon", label: "Hexágono", categoria: "Formas básicas",
    defaults: { label: "", color: COLOR_FLUJO, w: 140, h: 80 },
    miniSvg: svgMini(<polygon points="9,4 27,4 34,12 27,20 9,20 2,12" stroke="currentColor" strokeWidth="1.5" />) },
  { kind: "triangle", label: "Triángulo", categoria: "Formas básicas",
    defaults: { label: "", color: COLOR_DECISION, w: 100, h: 90 },
    miniSvg: svgMini(<polygon points="18,3 34,21 2,21" stroke="currentColor" strokeWidth="1.5" />) },

  // ── Anotaciones ──
  { kind: "note", label: "Nota adhesiva", categoria: "Anotaciones",
    defaults: { label: "Escribe tu nota aquí…", color: COLOR_NOTA, w: 160, h: 120 },
    miniSvg: svgMini(<><rect x="4" y="4" width="28" height="16" stroke="currentColor" strokeWidth="1.5" /><path d="M28 4 L28 8 L32 8" stroke="currentColor" strokeWidth="1.5" /></>) },
  { kind: "text", label: "Texto", categoria: "Anotaciones",
    defaults: { label: "Texto", color: "#0F172A", w: 120, h: 40 },
    miniSvg: svgMini(<text x="18" y="17" textAnchor="middle" fontSize="14" fontWeight="900" fill="currentColor">T</text>) },

  // ── Contenedores (carriles / swimlanes) ──
  { kind: "swimlane-h", label: "Carril horizontal", categoria: "Contenedores",
    defaults: { label: "Carril", color: "#1A73E8", w: 600, h: 220 },
    miniSvg: svgMini(<><rect x="2" y="4" width="32" height="16" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="12" x2="34" y2="12" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" /></>) },
  { kind: "swimlane-v", label: "Carril vertical", categoria: "Contenedores",
    defaults: { label: "Fase", color: "#8B5CF6", w: 460, h: 320 },
    miniSvg: svgMini(<><rect x="2" y="4" width="32" height="16" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="9" x2="34" y2="9" stroke="currentColor" strokeWidth="1.5" /><line x1="18" y1="9" x2="18" y2="20" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" /></>) },
];

const SHAPE_BY_KIND = Object.fromEntries(SHAPES.map((s) => [s.kind, s]));

/* ────────────────────────────────────────────────────────────────────────────
 * PLANTILLAS ISO 9001
 * Diagramas pre-armados listos para insertar en el lienzo. Cada plantilla
 * devuelve nodos (con ids locales) + conexiones; al insertarse se les reasigna
 * un id único y se desplazan al centro de la vista.
 * ──────────────────────────────────────────────────────────────────────────── */
interface PlantillaISO {
  id: string;
  nombre: string;
  descripcion: string;
  build: () => { nodes: Node<ShapeData>[]; edges: Edge[] };
}

function tnode(
  id: string, shape: ShapeKind, x: number, y: number, label: string,
  color: string, w?: number, h?: number, extra?: Partial<ShapeData>,
): Node<ShapeData> {
  return {
    id, type: "shape", position: { x, y },
    data: {
      shape, label, color, fontSize: 14, align: "center",
      ...(w ? { width: w } : {}), ...(h ? { height: h } : {}), ...(extra || {}),
    },
  };
}
function tedge(source: string, target: string, sh?: string, th?: string, label?: string): Edge {
  return { id: `${source}__${target}`, source, target, sourceHandle: sh, targetHandle: th, label } as Edge;
}

const ISO_PLANTILLAS: PlantillaISO[] = [
  {
    id: "mapa-procesos",
    nombre: "Mapa de procesos",
    descripcion: "Estratégicos · operativos · apoyo, del requisito a la satisfacción del cliente (ISO 9001 4.4).",
    build: () => ({
      nodes: [
        tnode("cli1", "oval", 0, 200, "CLIENTE · Requisitos", COLOR_TERMINAL, 170, 90),
        tnode("cli2", "oval", 1010, 200, "CLIENTE · Satisfacción", COLOR_TERMINAL, 170, 90),
        tnode("tEstr", "text", 220, -42, "PROCESOS ESTRATÉGICOS / DIRECCIÓN", "#64748B", 480, 28, { bold: true, align: "left", fontSize: 13 }),
        tnode("e1", "rect", 220, 0, "Planeación estratégica", COLOR_DATOS, 230, 72),
        tnode("e2", "rect", 480, 0, "Revisión por la dirección", COLOR_DATOS, 230, 72),
        tnode("e3", "rect", 740, 0, "Gestión de la calidad y mejora", COLOR_DATOS, 230, 72),
        tnode("tOper", "text", 220, 152, "PROCESOS OPERATIVOS (CLAVE)", "#64748B", 480, 28, { bold: true, align: "left", fontSize: 13 }),
        tnode("o1", "rect", 220, 190, "Ventas / Comercial", COLOR_FLUJO, 230, 72),
        tnode("o2", "rect", 480, 190, "Diseño y desarrollo", COLOR_FLUJO, 230, 72),
        tnode("o3", "rect", 740, 190, "Producción / Prestación del servicio", COLOR_FLUJO, 230, 72),
        tnode("tApoyo", "text", 220, 342, "PROCESOS DE APOYO (SOPORTE)", "#64748B", 480, 28, { bold: true, align: "left", fontSize: 13 }),
        tnode("a1", "rect", 220, 380, "Recursos humanos", "#0EA5E9", 230, 72),
        tnode("a2", "rect", 480, 380, "Compras / Proveedores", "#0EA5E9", 230, 72),
        tnode("a3", "rect", 740, 380, "Mantenimiento / TI", "#0EA5E9", 230, 72),
      ],
      edges: [
        tedge("cli1", "o1", "s-right", "t-left", "Requisitos"),
        tedge("o1", "o2", "s-right", "t-left"),
        tedge("o2", "o3", "s-right", "t-left"),
        tedge("o3", "cli2", "s-right", "t-left", "Satisfacción"),
      ],
    }),
  },
  {
    id: "tortuga",
    nombre: "Diagrama de tortuga",
    descripcion: "Caracterización del proceso: entradas, salidas, recursos, personal, métodos e indicadores.",
    build: () => ({
      nodes: [
        tnode("c", "rect", 320, 200, "PROCESO (nombre)", COLOR_FLUJO, 220, 110),
        tnode("ent", "parallelogram", 30, 210, "ENTRADAS", COLOR_DATOS, 190, 80),
        tnode("sal", "parallelogram", 640, 210, "SALIDAS", COLOR_TERMINAL, 190, 80),
        tnode("tl", "rect", 60, 30, "¿Con qué? Recursos / Infraestructura", COLOR_DECISION, 220, 90),
        tnode("tr", "rect", 580, 30, "¿Con quién? Personal / Competencias", COLOR_DECISION, 220, 90),
        tnode("bl", "rect", 60, 380, "¿Cómo? Métodos / Procedimientos", "#0EA5E9", 220, 90),
        tnode("br", "rect", 580, 380, "Indicadores / KPI (¿con qué resultados?)", COLOR_CONECTOR, 220, 90),
      ],
      edges: [
        tedge("ent", "c", "s-right", "t-left"),
        tedge("c", "sal", "s-right", "t-left"),
        tedge("tl", "c", "s-bottom", "t-top"),
        tedge("tr", "c", "s-bottom", "t-top"),
        tedge("bl", "c", "s-top", "t-bottom"),
        tedge("br", "c", "s-top", "t-bottom"),
      ],
    }),
  },
  {
    id: "phva",
    nombre: "Ciclo PHVA (PDCA)",
    descripcion: "Planificar · Hacer · Verificar · Actuar — mejora continua (ISO 9001 0.3.2).",
    build: () => ({
      nodes: [
        tnode("p", "rounded", 0, 0, "PLANIFICAR", COLOR_TERMINAL, 230, 110),
        tnode("h", "rounded", 360, 0, "HACER", COLOR_FLUJO, 230, 110),
        tnode("v", "rounded", 360, 260, "VERIFICAR", COLOR_DECISION, 230, 110),
        tnode("a", "rounded", 0, 260, "ACTUAR", COLOR_DATOS, 230, 110),
      ],
      edges: [
        tedge("p", "h", "s-right", "t-left", "Objetivos y procesos"),
        tedge("h", "v", "s-bottom", "t-top", "Implementar"),
        tedge("v", "a", "s-left", "t-right", "Medir y evaluar"),
        tedge("a", "p", "s-top", "t-bottom", "Mejorar"),
      ],
    }),
  },
  {
    id: "sipoc",
    nombre: "SIPOC",
    descripcion: "Proveedores · Entradas · Proceso · Salidas · Clientes (visión de alto nivel del proceso).",
    build: () => ({
      nodes: [
        tnode("s", "rect", 0, 0, "PROVEEDORES (S)", "#0EA5E9", 180, 64),
        tnode("i", "rect", 200, 0, "ENTRADAS (I)", COLOR_DATOS, 180, 64),
        tnode("p", "rect", 400, 0, "PROCESO (P)", COLOR_FLUJO, 180, 64),
        tnode("o", "rect", 600, 0, "SALIDAS (O)", COLOR_TERMINAL, 180, 64),
        tnode("c", "rect", 800, 0, "CLIENTES (C)", COLOR_DECISION, 180, 64),
        tnode("s2", "rounded", 0, 100, "…", "#94A3B8", 180, 90),
        tnode("i2", "rounded", 200, 100, "…", "#94A3B8", 180, 90),
        tnode("p2", "rounded", 400, 100, "1. …  2. …  3. …", "#94A3B8", 180, 90),
        tnode("o2", "rounded", 600, 100, "…", "#94A3B8", 180, 90),
        tnode("c2", "rounded", 800, 100, "…", "#94A3B8", 180, 90),
      ],
      edges: [
        tedge("s", "i", "s-right", "t-left"),
        tedge("i", "p", "s-right", "t-left"),
        tedge("p", "o", "s-right", "t-left"),
        tedge("o", "c", "s-right", "t-left"),
      ],
    }),
  },
  {
    id: "procedimiento",
    nombre: "Procedimiento (flujo)",
    descripcion: "Flujo básico con inicio, actividad, decisión y fin para documentar un procedimiento.",
    build: () => ({
      nodes: [
        tnode("start", "oval", 80, 0, "Inicio", COLOR_TERMINAL, 160, 60),
        tnode("a1", "rect", 80, 110, "Actividad / Tarea", COLOR_FLUJO, 160, 64),
        tnode("dec", "diamond", 60, 224, "¿Cumple?", COLOR_DECISION, 200, 110),
        tnode("a3", "rect", 340, 247, "Siguiente actividad", COLOR_FLUJO, 180, 64),
        tnode("a2", "rect", 80, 390, "Acción correctiva", COLOR_FLUJO, 160, 64),
        tnode("end", "oval", 340, 390, "Fin", COLOR_TERMINAL, 160, 60),
      ],
      edges: [
        tedge("start", "a1", "s-bottom", "t-top"),
        tedge("a1", "dec", "s-bottom", "t-top"),
        tedge("dec", "a3", "s-right", "t-left", "Sí"),
        tedge("dec", "a2", "s-bottom", "t-top", "No"),
        tedge("a2", "a1", "s-left", "t-left"),
        tedge("a3", "end", "s-bottom", "t-top"),
      ],
    }),
  },
  {
    id: "no-conformidad",
    nombre: "No conformidad / Acción correctiva",
    descripcion: "Flujo de tratamiento de NC y acción correctiva con causa raíz y eficacia (ISO 9001 10.2).",
    build: () => ({
      nodes: [
        tnode("start", "oval", 100, 0, "No conformidad detectada", COLOR_TERMINAL, 220, 60),
        tnode("r1", "rect", 100, 110, "Registrar la NC", COLOR_FLUJO, 220, 64),
        tnode("r2", "rect", 100, 220, "Corrección inmediata (contención)", COLOR_FLUJO, 220, 64),
        tnode("dec", "diamond", 90, 330, "¿Requiere acción correctiva?", COLOR_DECISION, 240, 120),
        tnode("fin1", "oval", 420, 360, "Cierre (solo corrección)", COLOR_TERMINAL, 200, 60),
        tnode("r3", "rect", 100, 500, "Análisis de causa raíz", COLOR_FLUJO, 220, 64),
        tnode("r4", "rect", 100, 610, "Plan de acción correctiva", COLOR_FLUJO, 220, 64),
        tnode("r5", "rect", 100, 720, "Implementar acciones", COLOR_FLUJO, 220, 64),
        tnode("dec2", "diamond", 90, 830, "¿Acción eficaz?", COLOR_DECISION, 240, 120),
        tnode("reabrir", "rect", 420, 862, "Reabrir / nuevo análisis", COLOR_DECISION, 200, 64),
        tnode("fin2", "oval", 100, 1000, "Cierre de la NC", COLOR_TERMINAL, 220, 60),
      ],
      edges: [
        tedge("start", "r1", "s-bottom", "t-top"),
        tedge("r1", "r2", "s-bottom", "t-top"),
        tedge("r2", "dec", "s-bottom", "t-top"),
        tedge("dec", "fin1", "s-right", "t-left", "No"),
        tedge("dec", "r3", "s-bottom", "t-top", "Sí"),
        tedge("r3", "r4", "s-bottom", "t-top"),
        tedge("r4", "r5", "s-bottom", "t-top"),
        tedge("r5", "dec2", "s-bottom", "t-top"),
        tedge("dec2", "fin2", "s-bottom", "t-top", "Sí"),
        tedge("dec2", "reabrir", "s-right", "t-left", "No"),
        tedge("reabrir", "r3", "s-top", "t-right"),
      ],
    }),
  },
  {
    id: "organigrama",
    nombre: "Organigrama",
    descripcion: "Estructura organizacional y responsabilidades (apoya roles del SGC, ISO 9001 5.3).",
    build: () => ({
      nodes: [
        tnode("dg", "rect", 340, 0, "Dirección General", COLOR_DATOS, 220, 64),
        tnode("c1", "rect", 0, 150, "Gestión de Calidad (SGC)", COLOR_FLUJO, 200, 60),
        tnode("c2", "rect", 230, 150, "Operaciones / Producción", COLOR_FLUJO, 200, 60),
        tnode("c3", "rect", 460, 150, "Comercial / Ventas", COLOR_FLUJO, 200, 60),
        tnode("c4", "rect", 690, 150, "Administración y Finanzas", COLOR_FLUJO, 200, 60),
        tnode("c2a", "rect", 200, 280, "Producción", "#0EA5E9", 180, 56),
        tnode("c2b", "rect", 400, 280, "Mantenimiento", "#0EA5E9", 180, 56),
      ],
      edges: [
        tedge("dg", "c1", "s-bottom", "t-top"),
        tedge("dg", "c2", "s-bottom", "t-top"),
        tedge("dg", "c3", "s-bottom", "t-top"),
        tedge("dg", "c4", "s-bottom", "t-top"),
        tedge("c2", "c2a", "s-bottom", "t-top"),
        tedge("c2", "c2b", "s-bottom", "t-top"),
      ],
    }),
  },
  {
    id: "gestion-riesgos",
    nombre: "Gestión de riesgos",
    descripcion: "Identificar, analizar, evaluar y tratar riesgos y oportunidades (ISO 9001 6.1).",
    build: () => ({
      nodes: [
        tnode("start", "oval", 100, 0, "Identificar riesgo / oportunidad", COLOR_TERMINAL, 240, 60),
        tnode("a1", "rect", 100, 110, "Analizar: probabilidad × impacto", COLOR_FLUJO, 240, 64),
        tnode("a2", "rect", 100, 220, "Evaluar nivel de riesgo", COLOR_FLUJO, 240, 64),
        tnode("dec", "diamond", 110, 330, "¿Aceptable?", COLOR_DECISION, 220, 110),
        tnode("mon", "oval", 430, 357, "Monitorear y registrar", COLOR_TERMINAL, 200, 60),
        tnode("a3", "rect", 100, 480, "Plan de tratamiento (mitigar / evitar / transferir)", COLOR_FLUJO, 260, 72),
        tnode("a4", "rect", 100, 600, "Implementar acciones", COLOR_FLUJO, 240, 64),
        tnode("a5", "rect", 100, 710, "Verificar eficacia", COLOR_FLUJO, 240, 64),
      ],
      edges: [
        tedge("start", "a1", "s-bottom", "t-top"),
        tedge("a1", "a2", "s-bottom", "t-top"),
        tedge("a2", "dec", "s-bottom", "t-top"),
        tedge("dec", "mon", "s-right", "t-left", "Sí"),
        tedge("dec", "a3", "s-bottom", "t-top", "No"),
        tedge("a3", "a4", "s-bottom", "t-top"),
        tedge("a4", "a5", "s-bottom", "t-top"),
        tedge("a5", "mon", "s-right", "t-bottom"),
      ],
    }),
  },
  {
    id: "gestion-cambio",
    nombre: "Gestión del cambio",
    descripcion: "Cambios planificados al SGC de forma controlada (ISO 9001 6.3).",
    build: () => ({
      nodes: [
        tnode("start", "oval", 100, 0, "Solicitud de cambio", COLOR_TERMINAL, 220, 60),
        tnode("a1", "rect", 100, 110, "Evaluar propósito y consecuencias", COLOR_FLUJO, 240, 64),
        tnode("a2", "rect", 100, 220, "Evaluar integridad del SGC y recursos", COLOR_FLUJO, 260, 64),
        tnode("dec", "diamond", 110, 330, "¿Aprobado?", COLOR_DECISION, 220, 110),
        tnode("fin1", "oval", 430, 357, "Rechazar / archivar", COLOR_TERMINAL, 190, 60),
        tnode("a3", "rect", 100, 480, "Planificar recursos y responsables", COLOR_FLUJO, 260, 64),
        tnode("a4", "rect", 100, 590, "Implementar el cambio", COLOR_FLUJO, 240, 64),
        tnode("a5", "rect", 100, 700, "Verificar y comunicar", COLOR_FLUJO, 240, 64),
        tnode("fin2", "oval", 100, 810, "Cambio cerrado", COLOR_TERMINAL, 220, 60),
      ],
      edges: [
        tedge("start", "a1", "s-bottom", "t-top"),
        tedge("a1", "a2", "s-bottom", "t-top"),
        tedge("a2", "dec", "s-bottom", "t-top"),
        tedge("dec", "fin1", "s-right", "t-left", "No"),
        tedge("dec", "a3", "s-bottom", "t-top", "Sí"),
        tedge("a3", "a4", "s-bottom", "t-top"),
        tedge("a4", "a5", "s-bottom", "t-top"),
        tedge("a5", "fin2", "s-bottom", "t-top"),
      ],
    }),
  },
  {
    id: "foda",
    nombre: "Análisis FODA",
    descripcion: "Fortalezas, oportunidades, debilidades y amenazas — contexto de la organización (ISO 9001 4.1).",
    build: () => ({
      nodes: [
        tnode("tit", "text", 0, -44, "Análisis FODA · Contexto de la organización (4.1)", "#64748B", 600, 28, { bold: true, align: "left", fontSize: 14 }),
        tnode("f", "rect", 0, 0, "FORTALEZAS (internas +)", COLOR_TERMINAL, 300, 170, { align: "left", fontSize: 15, bold: true }),
        tnode("d", "rect", 320, 0, "DEBILIDADES (internas −)", "#EF4444", 300, 170, { align: "left", fontSize: 15, bold: true }),
        tnode("o", "rect", 0, 190, "OPORTUNIDADES (externas +)", COLOR_FLUJO, 300, 170, { align: "left", fontSize: 15, bold: true }),
        tnode("am", "rect", 320, 190, "AMENAZAS (externas −)", COLOR_DECISION, 300, 170, { align: "left", fontSize: 15, bold: true }),
      ],
      edges: [],
    }),
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * DATA shape de cada nodo
 * ──────────────────────────────────────────────────────────────────────────── */
interface ShapeData {
  label: string;
  color: string;
  shape: ShapeKind;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  stroke?: string;
  strokeWidth?: number;
  width?: number;   // permite override de tamaño (resize manual)
  height?: number;
  lanes?: string[]; // títulos de cada banda en swimlane
  editing?: boolean;  // true cuando este nodo está en modo edición inline
  editingLaneIndex?: number; // qué carril está en edición (solo swimlanes)
  procesoRef?: number | null;   // vínculo a un Proceso del SGC
  procesoNombre?: string;       // nombre cacheado para mostrar
  [key: string]: unknown;
}

/** Singleton bus minimal (NO React Context) para que los nodos puedan pedir
 *  cambios al editor sin pasar callbacks como props y sin disparar re-renders
 *  del árbol de ReactFlow. El editor sobreescribe estos handlers en su mount.
 */
const editorBus = {
  patch: (_nodeId: string, _patch: Partial<ShapeData>) => { /* set en mount */ },
  stopEdit: () => { /* set en mount */ },
};

/** Edicion inline en contentEditable.
 *
 * IMPORTANTE: este componente es UNCONTROLLED despues del mount. Solo lee el
 * `value` inicial UNA vez para pintarlo en el DOM; despues confia en el DOM
 * como fuente de verdad y reporta cambios via onChange. Si reescribieramos
 * children con el value actualizado en cada render, React haria
 * `textContent = nuevoValor` y la caret saltaria a la posicion 0 — eso causa
 * el bug clasico de "el texto se escribe al reves" (cada tecla nueva queda
 * antes de la anterior). */
function InlineEditable({
  value, onChange, onStop, style, multiline = true, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onStop: () => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialRef = useRef(value);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // Selecciona todo el texto al entrar en modo edición.
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none ${className}`}
      style={{ minWidth: 20, cursor: "text", whiteSpace: "pre-wrap", ...style }}
      onInput={(e) => onChange((e.target as HTMLDivElement).innerText)}
      onBlur={onStop}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); onStop(); }
        if (e.key === "Enter" && !e.shiftKey && !multiline) { e.preventDefault(); onStop(); }
        // Stop propagation para que React Flow no procese atajos (Delete, etc).
        e.stopPropagation();
      }}
      // Sin esto, hacer drag DESDE el texto arrastra el nodo en vez de seleccionar.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {initialRef.current}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Render del nodo dentro del canvas
 * ──────────────────────────────────────────────────────────────────────────── */
// Aclara/oscurece un color hex en `amt` (-1..1). Usado para degradados sutiles.
function shade(hex: string, amt: number): string {
  let h = (hex || "#3B82F6").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v : 255 - v) * amt)));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
// Degradado sutil para el relleno de una figura.
function fillGradient(color: string): string {
  return `linear-gradient(160deg, ${shade(color, 0.16)} 0%, ${color} 55%, ${shade(color, -0.12)} 100%)`;
}

function handleStyle(color: string, pos: "top" | "right" | "bottom" | "left"): React.CSSProperties {
  // Handles 18px, con offset negativo para que floten ligeramente fuera de la
  // figura. El area de impacto efectiva es aun mayor por `connectionRadius`.
  // El globals.css los hace pulsar al hover de la figura para que sean obvios.
  const o = -10;
  const base: React.CSSProperties = {
    width: 18, height: 18, background: "#fff",
    border: `3px solid ${color}`, borderRadius: "50%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.35)", zIndex: 10,
  };
  switch (pos) {
    case "top": return { ...base, top: o };
    case "bottom": return { ...base, bottom: o };
    case "left": return { ...base, left: o };
    case "right": return { ...base, right: o };
  }
}

function ShapeNode({ id, data, selected }: NodeProps<Node<ShapeData>>) {
  const { shape, label, color } = data;
  const fontSize = data.fontSize ?? 14;
  const fontWeight = data.bold ? 800 : 600;
  const fontStyle = data.italic ? "italic" : "normal";
  const textDecoration = data.underline ? "underline" : "none";
  const textAlign = (data.align ?? "center") as React.CSSProperties["textAlign"];
  const stroke = data.stroke || "transparent";
  const sw = data.strokeWidth ?? 0;
  const isEditing = !!data.editing;
  const def = SHAPE_BY_KIND[shape]?.defaults || { w: 160, h: 64, label: "", color };
  const w = data.width ?? def.w;
  const h = data.height ?? def.h;

  const ringClass = selected ? "ring-[3px] ring-fuchsia-400/70 shadow-xl" : "shadow-md";

  const textStyle: React.CSSProperties = {
    fontSize, fontWeight, fontStyle, textDecoration, textAlign,
    color: "#fff", lineHeight: 1.25, wordBreak: "break-word",
    textShadow: "0 1px 2px rgba(0,0,0,0.22)",
  };

  const startEdit = () => editorBus.patch(id, { editing: true });
  const stopEdit = () => editorBus.stopEdit();
  const patchLabel = (v: string) => editorBus.patch(id, { label: v });

  const renderText = (style: React.CSSProperties = {}) => (
    isEditing ? (
      <InlineEditable
        value={label}
        onChange={patchLabel}
        onStop={stopEdit}
        style={{ ...textStyle, ...style }}
      />
    ) : (
      <span style={{ ...textStyle, ...style }}>{label || <em className="opacity-50">doble-click para editar</em>}</span>
    )
  );

  // Wrapper común para formas con fondo color sólido.
  const wrap = (extra: React.CSSProperties = {}, textOverrides: React.CSSProperties = {}) => (
    <div
      onDoubleClick={startEdit}
      className={`relative flex items-center justify-center text-center px-3 py-2 select-none transition-all ${ringClass}`}
      style={{
        width: w, height: h, background: fillGradient(color),
        outline: sw ? `${sw}px solid ${stroke}` : undefined,
        boxShadow: selected
          ? `0 8px 24px ${shade(color, -0.2)}66`
          : `0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 ${shade(color, 0.25)}55`,
        ...extra,
      }}
    >
      {renderText(textOverrides)}
    </div>
  );

  let body: React.ReactNode = null;
  switch (shape) {
    case "rect": body = wrap(); break;
    case "rounded": body = wrap({ borderRadius: 12 }); break;
    case "oval": body = wrap({ borderRadius: 9999 }); break;
    case "circle": body = wrap({ borderRadius: "50%" }); break;
    case "diamond": body = wrap({ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }); break;
    case "parallelogram":
      body = (
        <div onDoubleClick={startEdit}
          className={`relative flex items-center justify-center text-center px-4 py-2 select-none transition-all ${ringClass}`}
          style={{ width: w, height: h, background: fillGradient(color), transform: "skewX(-18deg)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.14)" }}>
          <div style={{ transform: "skewX(18deg)" }}>{renderText()}</div>
        </div>
      );
      break;
    case "trapezoid": body = wrap({ clipPath: "polygon(15% 0, 85% 0, 100% 100%, 0 100%)" }); break;
    case "manual": body = wrap({ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }); break;
    case "hexagon": body = wrap({ clipPath: "polygon(20% 0, 80% 0, 100% 50%, 80% 100%, 20% 100%, 0 50%)" }); break;
    case "triangle": body = wrap({ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }); break;
    case "card": body = wrap({ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%, 0 30%)" }); break;
    case "document":
      body = wrap({ clipPath: "path('M0 0 H100% V70% Q75% 100%, 50% 80% Q25% 60%, 0 80% Z')" });
      break;
    case "delay": body = wrap({ borderRadius: "0 9999px 9999px 0" }); break;
    case "display": body = wrap({ clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)" }); break;
    case "cylinder": {
      body = (
        <div onDoubleClick={startEdit} className={`relative ${ringClass}`}
          style={{ width: w, height: h, background: "transparent" }}>
          <div className="absolute inset-x-0 top-2 bottom-2 flex items-center justify-center text-center px-3"
            style={{ background: color }}>
            {renderText()}
          </div>
          <div className="absolute inset-x-0 top-0 h-4 rounded-[50%]" style={{ background: color, filter: "brightness(1.15)" }} />
          <div className="absolute inset-x-0 bottom-0 h-4 rounded-[50%]" style={{ background: color, filter: "brightness(0.85)" }} />
        </div>
      );
      break;
    }
    case "predefined": {
      body = (
        <div onDoubleClick={startEdit}
          className={`relative flex items-center justify-center px-8 py-2 ${ringClass}`}
          style={{ width: w, height: h, background: fillGradient(color), boxShadow: "0 2px 6px rgba(0,0,0,0.14)" }}>
          <div className="absolute inset-y-0 left-2 w-px" style={{ background: "rgba(255,255,255,0.5)" }} />
          <div className="absolute inset-y-0 right-2 w-px" style={{ background: "rgba(255,255,255,0.5)" }} />
          {renderText()}
        </div>
      );
      break;
    }
    case "note": {
      body = (
        <div onDoubleClick={startEdit} className={`relative ${ringClass}`}
          style={{
            width: w, height: h, background: color,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transform: "rotate(-1deg)",
          }}>
          <div className="absolute top-0 right-0 w-5 h-5"
            style={{ background: "linear-gradient(225deg, rgba(0,0,0,0.18) 50%, transparent 50%)" }} />
          <div className="px-3 py-2 h-full overflow-hidden"
            style={{
              fontSize, fontWeight: data.bold ? 700 : 500,
              fontStyle, textDecoration, textAlign: data.align ?? "left",
              color: "#0F172A", whiteSpace: "pre-wrap",
            }}>
            {isEditing ? (
              <InlineEditable value={label} onChange={patchLabel} onStop={stopEdit}
                style={{ color: "#0F172A", textAlign: data.align ?? "left", fontSize, fontWeight: data.bold ? 700 : 500 }} />
            ) : (label || <em className="opacity-50">Escribe tu nota…</em>)}
          </div>
        </div>
      );
      break;
    }
    case "text": {
      body = (
        <div onDoubleClick={startEdit}
          className={`relative flex items-center px-2 ${selected ? "ring-2 ring-pink-400/60" : ""}`}
          style={{ width: w, height: h, background: "transparent" }}>
          {renderText({ color, fontSize, fontWeight, fontStyle, textDecoration, textAlign })}
        </div>
      );
      break;
    }
    case "swimlane-h": {
      const lanes = data.lanes && data.lanes.length ? data.lanes : ["Carril 1", "Carril 2"];
      const headerW = 44;
      const laneH = (h - 0) / lanes.length;
      body = (
        <div onDoubleClick={startEdit} className={`relative ${ringClass}`}
          style={{
            width: w, height: h,
            background: "#fff",
            border: `2px solid ${color}`,
            borderRadius: 8,
            overflow: "hidden",
          }}>
          {/* Header vertical (título de pool) */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center px-2 text-white"
            style={{ width: headerW, background: color }}>
            <div style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: Math.max(11, fontSize - 1),
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              {isEditing ? (
                <InlineEditable value={label} onChange={patchLabel} onStop={stopEdit} multiline={false}
                  style={{ color: "#fff" }} />
              ) : label}
            </div>
          </div>
          {/* Carriles */}
          {lanes.map((ln, i) => {
            const isLE = data.editingLaneIndex === i;
            const onLaneText = (v: string) => {
              const next = [...lanes];
              next[i] = v;
              editorBus.patch(id, { lanes: next });
            };
            return (
              <div key={i} className="absolute"
                style={{
                  left: headerW, right: 0,
                  top: i * laneH, height: laneH,
                  borderBottom: i < lanes.length - 1 ? `1.5px dashed ${color}55` : "none",
                }}>
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    editorBus.patch(id, { editingLaneIndex: i });
                  }}
                  className="px-2 py-1 cursor-text"
                  style={{
                    color, opacity: 0.85,
                    fontSize: Math.max(10, fontSize - 2),
                    fontWeight: data.bold ? 900 : 800,
                    fontStyle: data.italic ? "italic" : "normal",
                    textDecoration: data.underline ? "underline" : "none",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}>
                  {isLE ? (
                    <InlineEditable
                      value={ln}
                      onChange={onLaneText}
                      onStop={() => editorBus.patch(id, { editingLaneIndex: -1 })}
                      multiline={false}
                      style={{ color }}
                    />
                  ) : ln || <em className="opacity-40">Doble-click</em>}
                </div>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case "swimlane-v": {
      const lanes = data.lanes && data.lanes.length ? data.lanes : ["Fase 1", "Fase 2", "Fase 3"];
      const headerH = 36;
      const laneW = w / lanes.length;
      body = (
        <div onDoubleClick={startEdit} className={`relative ${ringClass}`}
          style={{
            width: w, height: h,
            background: "#fff",
            border: `2px solid ${color}`,
            borderRadius: 8,
            overflow: "hidden",
          }}>
          {/* Header (título) arriba */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-center text-white"
            style={{ height: headerH, background: color, fontSize, fontWeight: 800,
              letterSpacing: 1, textTransform: "uppercase" }}>
            {isEditing ? (
              <InlineEditable value={label} onChange={patchLabel} onStop={stopEdit} multiline={false}
                style={{ color: "#fff" }} />
            ) : label}
          </div>
          {/* Carriles verticales */}
          {lanes.map((ln, i) => {
            const isLE = data.editingLaneIndex === i;
            const onLaneText = (v: string) => {
              const next = [...lanes];
              next[i] = v;
              editorBus.patch(id, { lanes: next });
            };
            return (
              <div key={i} className="absolute"
                style={{
                  top: headerH, bottom: 0,
                  left: i * laneW, width: laneW,
                  borderRight: i < lanes.length - 1 ? `1.5px dashed ${color}55` : "none",
                }}>
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    editorBus.patch(id, { editingLaneIndex: i });
                  }}
                  className="text-center py-1.5 cursor-text"
                  style={{
                    color, opacity: 0.85,
                    fontSize: Math.max(10, fontSize - 2),
                    fontWeight: data.bold ? 900 : 800,
                    fontStyle: data.italic ? "italic" : "normal",
                    textDecoration: data.underline ? "underline" : "none",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}>
                  {isLE ? (
                    <InlineEditable
                      value={ln}
                      onChange={onLaneText}
                      onStop={() => editorBus.patch(id, { editingLaneIndex: -1 })}
                      multiline={false}
                      style={{ color }}
                    />
                  ) : ln || <em className="opacity-40">Doble-click</em>}
                </div>
              </div>
            );
          })}
        </div>
      );
      break;
    }
  }

  // Tamaños mínimos por tipo de figura — contenedores piden bastante espacio,
  // los demás solo lo necesario para ver el texto.
  const isSwimlaneH = shape === "swimlane-h";
  const isSwimlaneV = shape === "swimlane-v";
  const minW = isSwimlaneH ? 300 : isSwimlaneV ? 200 : shape === "text" ? 30 : 60;
  const minH = isSwimlaneH ? 100 : isSwimlaneV ? 200 : shape === "text" ? 20 : 30;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={minW}
        minHeight={minH}
        onResize={(_, p) => editorBus.patch(id, { width: p.width, height: p.height })}
        lineStyle={{ borderColor: color, borderWidth: 1.5 }}
        handleStyle={{ background: "#fff", border: `2px solid ${color}`, width: 10, height: 10, borderRadius: 3 }}
      />
      <Handle id="t-top" type="target" position={Position.Top} style={handleStyle(color, "top")} />
      <Handle id="s-top" type="source" position={Position.Top} style={handleStyle(color, "top")} />
      <Handle id="t-right" type="target" position={Position.Right} style={handleStyle(color, "right")} />
      <Handle id="s-right" type="source" position={Position.Right} style={handleStyle(color, "right")} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={handleStyle(color, "bottom")} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={handleStyle(color, "bottom")} />
      <Handle id="t-left" type="target" position={Position.Left} style={handleStyle(color, "left")} />
      <Handle id="s-left" type="source" position={Position.Left} style={handleStyle(color, "left")} />
      {body}
      {data.procesoRef != null && (
        <div
          title={`Vinculado a proceso: ${data.procesoNombre || ""}`}
          className="absolute -top-2 -right-2 z-20 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#6366F1)" }}>
          <Link2 className="w-3 h-3 text-white" />
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * BendableEdge — linea ortogonal con pivotes arrastrables estilo LucidChart.
 *
 * La forma de la ruta depende de la POSICION de los handles source/target,
 * para que la flecha SIEMPRE entre al target en la direccion correcta:
 *
 *  - source horizontal (Left/Right) → primer segmento horizontal
 *  - source vertical   (Top/Bottom) → primer segmento vertical
 *  - target horizontal             → ultimo segmento horizontal (flecha →/←)
 *  - target vertical               → ultimo segmento vertical   (flecha ↑/↓)
 *
 * Combinaciones:
 *  - h-h  →  HVH   (3 segs, 1 control: bendV)
 *  - v-v  →  VHV   (3 segs, 1 control: bendH)
 *  - h-v  →  HVHV  (4 segs, 2 controles: bendV + bendH)
 *  - v-h  →  VHVH  (4 segs, 2 controles)
 *
 * Cada segmento medio tiene un pivote rosa: arrastrarlo en perpendicular
 * ajusta el bend. Doble-click resetea ese eje al auto-midpoint.
 * ──────────────────────────────────────────────────────────────────────────── */
function BendableEdge({
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  data, style, markerEnd, label, labelStyle, labelBgStyle, labelBgPadding,
  labelBgBorderRadius, selected,
}: EdgeProps) {
  const rf = useReactFlow();
  const dataAny = (data || {}) as any;
  const bendVval: number = (dataAny.bendV as number | undefined) ?? (sourceX + targetX) / 2;
  const bendHval: number = (dataAny.bendH as number | undefined) ?? (sourceY + targetY) / 2;

  const srcAxis: "h" | "v" =
    (sourcePosition === Position.Left || sourcePosition === Position.Right) ? "h" : "v";
  const tgtAxis: "h" | "v" =
    (targetPosition === Position.Left || targetPosition === Position.Right) ? "h" : "v";

  // Path + ubicacion de pivotes segun el tipo de ruta
  let edgePath: string;
  let v1X: number | null = null, v1Y: number | null = null;  // pivote vertical (controla bendV)
  let h2X: number | null = null, h2Y: number | null = null;  // pivote horizontal (controla bendH)

  if (srcAxis === "h" && tgtAxis === "h") {
    // HVH: (sx,sy) → (bendV,sy) → (bendV,ty) → (tx,ty)
    edgePath =
      `M ${sourceX} ${sourceY} L ${bendVval} ${sourceY} ` +
      `L ${bendVval} ${targetY} L ${targetX} ${targetY}`;
    v1X = bendVval; v1Y = (sourceY + targetY) / 2;
  } else if (srcAxis === "v" && tgtAxis === "v") {
    // VHV: (sx,sy) → (sx,bendH) → (tx,bendH) → (tx,ty)
    edgePath =
      `M ${sourceX} ${sourceY} L ${sourceX} ${bendHval} ` +
      `L ${targetX} ${bendHval} L ${targetX} ${targetY}`;
    h2X = (sourceX + targetX) / 2; h2Y = bendHval;
  } else if (srcAxis === "h" && tgtAxis === "v") {
    // HVHV: (sx,sy) → (bendV,sy) → (bendV,bendH) → (tx,bendH) → (tx,ty)
    edgePath =
      `M ${sourceX} ${sourceY} L ${bendVval} ${sourceY} ` +
      `L ${bendVval} ${bendHval} L ${targetX} ${bendHval} ` +
      `L ${targetX} ${targetY}`;
    v1X = bendVval; v1Y = (sourceY + bendHval) / 2;
    h2X = (bendVval + targetX) / 2; h2Y = bendHval;
  } else {
    // VHVH: (sx,sy) → (sx,bendH) → (bendV,bendH) → (bendV,ty) → (tx,ty)
    edgePath =
      `M ${sourceX} ${sourceY} L ${sourceX} ${bendHval} ` +
      `L ${bendVval} ${bendHval} L ${bendVval} ${targetY} ` +
      `L ${targetX} ${targetY}`;
    h2X = (sourceX + bendVval) / 2; h2Y = bendHval;
    v1X = bendVval; v1Y = (bendHval + targetY) / 2;
  }

  const dragBend = (axis: "x" | "y") => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      rf.setEdges((eds) => eds.map((edge) => {
        if (edge.id !== id) return edge;
        const next = { ...(edge.data || {}) } as any;
        if (axis === "x") next.bendV = pos.x;
        else next.bendH = pos.y;
        return { ...edge, data: next };
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const resetAxis = (axis: "x" | "y") => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    rf.setEdges((eds) => eds.map((edge) => {
      if (edge.id !== id) return edge;
      const next = { ...(edge.data || {}) } as any;
      if (axis === "x") delete next.bendV;
      else delete next.bendH;
      delete next.waypoint;
      return { ...edge, data: next };
    }));
  };

  const labelBgFill = (labelBgStyle as any)?.fill || "#fff";
  const labelBgStroke = (labelBgStyle as any)?.stroke || "#CBD5E1";
  const labelPadV = Array.isArray(labelBgPadding) ? labelBgPadding[1] ?? 4 : 4;
  const labelPadH = Array.isArray(labelBgPadding) ? labelBgPadding[0] ?? 6 : 6;

  // El label va sobre el pivote del medio que exista (preferimos el H2 si lo
  // hay, si no el V1, si no fallback al midpoint absoluto).
  const labelX = h2X ?? v1X ?? (sourceX + targetX) / 2;
  const labelY = (h2Y ?? v1Y ?? (sourceY + targetY) / 2) - 14;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              fontSize: (labelStyle as any)?.fontSize ?? 12,
              fontWeight: (labelStyle as any)?.fontWeight ?? 800,
              background: labelBgFill,
              border: `1px solid ${labelBgStroke}`,
              borderRadius: labelBgBorderRadius ?? 8,
              padding: `${labelPadV}px ${labelPadH}px`,
              color: (labelStyle as any)?.color ?? "#0F172A",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Pivote V1 — arrastrable lateralmente para mover el segmento vertical */}
      {v1X !== null && v1Y !== null && (
        <EdgeLabelRenderer>
          <div
            className="bendable-pivot nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${v1X}px, ${v1Y}px)`,
              pointerEvents: "all",
              width: 16, height: 16,
              borderRadius: "50%",
              background: selected ? "#EC4899" : "#fff",
              border: "2.5px solid #EC4899",
              cursor: "ew-resize",
              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
            }}
            onMouseDown={dragBend("x")}
            onDoubleClick={resetAxis("x")}
            title="Arrastra horizontalmente para mover el vertical. Doble-click para auto."
          />
        </EdgeLabelRenderer>
      )}
      {/* Pivote H2 — arrastrable verticalmente para mover el segmento horizontal */}
      {h2X !== null && h2Y !== null && (
        <EdgeLabelRenderer>
          <div
            className="bendable-pivot nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${h2X}px, ${h2Y}px)`,
              pointerEvents: "all",
              width: 16, height: 16,
              borderRadius: "50%",
              background: selected ? "#EC4899" : "#fff",
              border: "2.5px solid #EC4899",
              cursor: "ns-resize",
              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
            }}
            onMouseDown={dragBend("y")}
            onDoubleClick={resetAxis("y")}
            title="Arrastra verticalmente para mover el horizontal. Doble-click para auto."
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// nodeTypes y edgeTypes deben ser referencias estables — declarados a nivel
// de módulo, NO dentro del componente. Esto silencia el warning #002 de RF.
const NODE_TYPES = { shape: ShapeNode } as const;
// Sobrescribimos el tipo "smoothstep" para que TODOS los edges (existentes y
// nuevos) usen nuestro BendableEdge — asi cualquier linea se puede curvar.
const EDGE_TYPES = { smoothstep: BendableEdge, bendable: BendableEdge } as const;

// Constantes estables de configuración de ReactFlow. Si las pasamos inline
// (object/array literal) en cada render, RF las ve como cambios y entra en
// loop de actualización porque su store interno se re-inicializa.
const SNAP_GRID: [number, number] = [8, 8];
const MULTI_SELECT_KEYS = ["Shift", "Meta", "Control"];
const PAN_DRAG_NORMAL = [1, 2];
const PAN_DRAG_PAN_MODE = [0, 1, 2];
const DELETE_KEYS = ["Backspace", "Delete"];
const CONNECTION_LINE_STYLE = { stroke: "#EC4899", strokeWidth: 3, strokeDasharray: "6 4" } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 } as const;

/* ────────────────────────────────────────────────────────────────────────────
 * EDITOR
 * ──────────────────────────────────────────────────────────────────────────── */
function EditorInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const { isDarkMode, theme } = useTheme();
  const { empresaActivaId } = useUser();

  // Catálogos del SGC para vincular figuras a procesos reales y ver sus KPIs/riesgos.
  const [procesos, setProcesos] = useState<any[]>([]);
  const [kpisSGC, setKpisSGC] = useState<any[]>([]);
  const [riesgosSGC, setRiesgosSGC] = useState<any[]>([]);
  useEffect(() => {
    if (!empresaActivaId) return;
    api.getProcesosSGC(empresaActivaId).then((r) => setProcesos(r?.results || [])).catch(() => {});
    api.getKPIs({ empresa: String(empresaActivaId) }).then((r) => setKpisSGC(r?.results || [])).catch(() => {});
    api.getRiesgos({ empresa: String(empresaActivaId) }).then((r) => setRiesgosSGC(r?.results || [])).catch(() => {});
  }, [empresaActivaId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ShapeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [diagrama, setDiagrama] = useState<any>(null);
  const [titulo, setTitulo] = useState("");
  const [publico, setPublico] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [spacePressed, setSpacePressed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  // Sidebar
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    "Diagrama de Flujo": true, "Contenedores": true, "Formas básicas": true, "Anotaciones": true,
  });

  const rfWrapper = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const initialLoad = useRef(true);
  // Mantener una ref siempre actualizada con los nodes y edges actuales —
  // asi los callbacks (onConnect, etc.) no caen en closures stale.
  const nodesRef = useRef<Node<ShapeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const clipboardRef = useRef<{ nodes: Node<ShapeData>[]; edges: Edge[] }>({ nodes: [], edges: [] });

  // Permisos derivados de lo que devuelve el backend (`mi_permiso`).
  const miPermiso: "propietario" | "editar" | "ver" | "ninguno" =
    diagrama?.mi_permiso || "ver";
  const esPropietario = miPermiso === "propietario";
  const readOnly = miPermiso === "ver" || miPermiso === "ninguno";

  // ── Historial undo/redo ───────────────────────────────────────────────────
  // Limpia banderas transitorias (modos de edicion) antes de guardar/restaurar
  // un snapshot, asi Ctrl+Z no re-abre un input de edicion.
  type Snap = { nodes: Node<ShapeData>[]; edges: Edge[] };
  const limpiarSnap = (ns: Node<ShapeData>[], es: Edge[]): Snap => ({
    nodes: ns.map((n) => ({
      ...n,
      data: { ...n.data, editing: false, editingLaneIndex: undefined },
    })),
    edges: es.map((e) => ({ ...e })),
  });
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const isRestoringRef = useRef(false);
  const lastSnapRef = useRef<Snap>({ nodes: [], edges: [] });

  // Sincroniza las refs con el estado en cada render — los callbacks pueden
  // leer nodesRef.current y siempre obtienen el array vigente.
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    // Cuando el cambio viene de un undo/redo, NO lo grabamos.
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      lastSnapRef.current = limpiarSnap(nodes, edges);
      return;
    }
    if (initialLoad.current) {
      lastSnapRef.current = limpiarSnap(nodes, edges);
      return;
    }
    // Debounce: si el usuario hace un burst (arrastra, escribe), solo guardamos
    // el estado ANTES del burst — al detenerse 250ms.
    const t = setTimeout(() => {
      const prev = lastSnapRef.current;
      lastSnapRef.current = limpiarSnap(nodes, edges);
      setPast((p) => [...p.slice(-49), prev]);
      setFuture([]); // cualquier accion nueva invalida el "redo"
    }, 250);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      const current = limpiarSnap(nodes, edges);
      isRestoringRef.current = true;
      setFuture((f) => [current, ...f.slice(0, 49)]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      return p.slice(0, -1);
    });
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      const current = limpiarSnap(nodes, edges);
      isRestoringRef.current = true;
      setPast((p) => [...p.slice(-49), current]);
      setNodes(next.nodes);
      setEdges(next.edges);
      return f.slice(1);
    });
  }, [nodes, edges, setNodes, setEdges]);

  // Pan temporal con Espacio
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.matches?.("input,textarea")) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpacePressed(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const d = await api.getDiagrama(id);
        setDiagrama(d);
        setTitulo(d.titulo);
        setPublico(d.publico);
        const data = d.data || {};
        // Normaliza: garantiza que todo nodo tenga `data` (objeto) y `position`
        // ({x,y}). Diagramas viejos/importados pueden traer nodos incompletos y
        // eso rompia el editor (lecturas de undefined sobre .editing / .x).
        const safeNodes = (data.nodes || [])
          .filter((n: any) => n && n.id != null)
          .map((n: any, i: number) => ({
            ...n,
            data: n.data ?? {},
            position: (n.position && typeof n.position.x === "number" && typeof n.position.y === "number")
              ? n.position
              : { x: 80 + (i % 5) * 200, y: 80 + Math.floor(i / 5) * 140 },
          }));
        setNodes(safeNodes);
        setEdges((data.edges || []).filter((e: any) => e && e.id != null && e.source != null && e.target != null));
      } catch (e) {
        alert("No se pudo cargar: " + (e as Error).message);
        router.push("/diagramas");
      } finally {
        setTimeout(() => { initialLoad.current = false; }, 100);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Marca dirty
  useEffect(() => {
    if (initialLoad.current) return;
    if (readOnly) return; // en solo-ver los cambios son visuales, no se persisten
    setDirty(true);
  }, [nodes, edges, titulo, publico, readOnly]);

  // Autosave 2s
  useEffect(() => {
    if (!dirty || saving || readOnly) return;
    const t = setTimeout(() => { guardar(); }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, readOnly]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => {
      // Auto-etiquetar Si/No SOLO cuando el usuario arrastra desde un
      // diamante (c.source). No invertimos la direccion: la flecha siempre
      // apunta al target en el que solto el usuario.
      const ns = nodesRef.current;
      let label: string | undefined;
      if (c.source) {
        const src = ns.find((n) => n.id === c.source);
        if (src?.data?.shape === "diamond") {
          const yaSalen = eds.filter((e) => e.source === c.source).length;
          if (yaSalen === 0) label = "Sí";
          else if (yaSalen === 1) label = "No";
        }
      }

      return addEdge({
        ...c,
        type: "smoothstep",
        label,
        labelStyle: { fontWeight: 800, fontSize: 12 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 8,
        labelBgStyle: {
          fill: isDarkMode ? "#0F172A" : "#FFFFFF",
          stroke: isDarkMode ? "#334155" : "#CBD5E1",
        },
        style: { stroke: isDarkMode ? "#94A3B8" : "#475569", strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isDarkMode ? "#94A3B8" : "#475569" },
        // Aumenta el area invisible alrededor de la linea para hacerla mas
        // facil de seleccionar con click; por default solo se selecciona si
        // das exactamente en el trazo.
        interactionWidth: 28,
      }, eds);
    });
  }, [setEdges, isDarkMode]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
  }, []);

  // Busca el swimlane (rect contenedor) que cubre un punto del espacio del lienzo.
  // Devuelve también la posición traducida a coords relativas al padre, que es
  // como ReactFlow espera que se guarde la posición de un hijo con parentId.
  const findSwimlaneAt = useCallback(
    (point: { x: number; y: number }, nodeList: Node<ShapeData>[], ignoreId?: string) => {
      for (const n of nodeList) {
        if (n.id === ignoreId) continue;
        if (n.data.shape !== "swimlane-h" && n.data.shape !== "swimlane-v") continue;
        const def = SHAPE_BY_KIND[n.data.shape].defaults;
        const w = n.data.width ?? def.w;
        const h = n.data.height ?? def.h;
        if (point.x >= n.position.x && point.x <= n.position.x + w &&
            point.y >= n.position.y && point.y <= n.position.y + h) {
          return { parent: n, rel: { x: point.x - n.position.x, y: point.y - n.position.y } };
        }
      }
      return null;
    },
    [],
  );

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const shape = e.dataTransfer.getData("application/diagram-shape") as ShapeKind;
    if (!shape || !rfInstanceRef.current) return;
    const def = SHAPE_BY_KIND[shape]?.defaults;
    if (!def) return;
    const pos = rfInstanceRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });

    // Si el shape que estoy soltando NO es un swimlane y el cursor cae sobre
    // uno, lo meto adentro (parentId + extent: "parent").
    const isSwimlane = shape === "swimlane-h" || shape === "swimlane-v";
    const hit = !isSwimlane ? findSwimlaneAt(pos, nodes) : null;

    const newNode: Node<ShapeData> = {
      id: `${shape}-${Date.now()}`,
      type: "shape",
      position: hit ? hit.rel : pos,
      data: { shape, label: def.label, color: def.color, fontSize: 14, align: "center" },
      ...(hit ? { parentId: hit.parent.id } : {}),
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, nodes, findSwimlaneAt]);

  // Cuando termino de arrastrar un nodo, decido si entró o salió de un swimlane.
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    const d = node.data as ShapeData;
    if (d.shape === "swimlane-h" || d.shape === "swimlane-v") return;

    // Posición absoluta del nodo después del drag. Si tiene parent, sumo offset.
    let absX = node.position.x;
    let absY = node.position.y;
    if (node.parentId) {
      const p = nodes.find((n) => n.id === node.parentId);
      if (p) { absX += p.position.x; absY += p.position.y; }
    }

    const hit = findSwimlaneAt({ x: absX, y: absY }, nodes, node.id);
    const newParentId = hit?.parent.id;

    if (newParentId === node.parentId) return;

    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id !== node.id) return n;
        if (newParentId && hit) {
          return {
            ...n,
            parentId: newParentId,
            position: { x: absX - hit.parent.position.x, y: absY - hit.parent.position.y },
          };
        }
        // Salió de cualquier swimlane → des-parento y vuelvo a coords absolutas.
        const { parentId: _p, ...rest } = n;
        return { ...rest, position: { x: absX, y: absY } };
      });
      // ReactFlow exige que los padres aparezcan antes que sus hijos en el array.
      const parents = updated.filter((n) =>
        n.data.shape === "swimlane-h" || n.data.shape === "swimlane-v");
      const children = updated.filter((n) =>
        n.data.shape !== "swimlane-h" && n.data.shape !== "swimlane-v");
      return [...parents, ...children];
    });
  }, [nodes, setNodes, findSwimlaneAt]);

  const guardar = useCallback(async () => {
    if (!diagrama || saving || readOnly) return;
    setSaving(true);
    try {
      const viewport = rfInstanceRef.current?.getViewport() || { x: 0, y: 0, zoom: 1 };
      await api.actualizarDiagrama(id, {
        titulo, publico, data: { nodes, edges, viewport },
      });
      setDirty(false);
      setLastSaved(new Date());
    } catch (e) {
      alert("Error al guardar: " + (e as Error).message);
    } finally { setSaving(false); }
  }, [id, diagrama, titulo, publico, nodes, edges, saving, readOnly]);

  // ── Clonar / copiar / pegar / mover (nudge) ──────────────────────────────
  const _clonar = useCallback((srcNodes: Node<ShapeData>[], srcEdges: Edge[], dx: number, dy: number) => {
    if (srcNodes.length === 0) return;
    const stamp = Date.now().toString(36);
    const idMap: Record<string, string> = {};
    const newNodes = srcNodes.map((n) => {
      const nid = `${n.id}-c${stamp}`;
      idMap[n.id] = nid;
      const { parentId: _p, ...rest } = n as any; // soltar parent para no dejar refs colgantes
      return { ...rest, id: nid, selected: true, position: { x: n.position.x + dx, y: n.position.y + dy } };
    });
    const ids = new Set(srcNodes.map((n) => n.id));
    const newEdges = srcEdges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e, i) => ({ ...e, id: `e-c${stamp}-${i}`, source: idMap[e.source], target: idMap[e.target] }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    setSelectedIds(newNodes.map((n) => n.id));
  }, [setNodes, setEdges]);

  const duplicarSelected = useCallback(() => {
    if (readOnly) return;
    const set = new Set(selectedIds);
    _clonar(nodesRef.current.filter((n) => set.has(n.id)), edgesRef.current, 28, 28);
  }, [readOnly, selectedIds, _clonar]);

  const copiarSelected = useCallback(() => {
    const set = new Set(selectedIds);
    clipboardRef.current = {
      nodes: nodesRef.current.filter((n) => set.has(n.id)).map((n) => ({ ...n })),
      edges: edgesRef.current.filter((e) => set.has(e.source) && set.has(e.target)).map((e) => ({ ...e })),
    };
  }, [selectedIds]);

  const pegar = useCallback(() => {
    if (readOnly) return;
    const { nodes: ns, edges: es } = clipboardRef.current;
    _clonar(ns, es, 36, 36);
  }, [readOnly, _clonar]);

  const nudge = useCallback((dx: number, dy: number) => {
    if (readOnly || selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    setNodes((nds) => nds.map((n) => set.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
  }, [readOnly, selectedIds, setNodes]);

  // Alinear / distribuir la selección (2+ nodos).
  const alinear = useCallback((modo: string) => {
    if (readOnly) return;
    const set = new Set(selectedIds);
    const sel = nodesRef.current.filter((n) => set.has(n.id));
    if (sel.length < 2) return;
    const boxes = sel.map((n) => {
      const def = SHAPE_BY_KIND[n.data.shape]?.defaults || { w: 160, h: 64 };
      return { id: n.id, x: n.position.x, y: n.position.y, w: n.data.width ?? def.w, h: n.data.height ?? def.h };
    });
    const minL = Math.min(...boxes.map((b) => b.x));
    const maxR = Math.max(...boxes.map((b) => b.x + b.w));
    const minT = Math.min(...boxes.map((b) => b.y));
    const maxB = Math.max(...boxes.map((b) => b.y + b.h));
    const cX = (minL + maxR) / 2, cY = (minT + maxB) / 2;
    const pos: Record<string, { x?: number; y?: number }> = {};
    if (modo === "left") boxes.forEach((b) => { pos[b.id] = { x: minL }; });
    if (modo === "centerH") boxes.forEach((b) => { pos[b.id] = { x: cX - b.w / 2 }; });
    if (modo === "right") boxes.forEach((b) => { pos[b.id] = { x: maxR - b.w }; });
    if (modo === "top") boxes.forEach((b) => { pos[b.id] = { y: minT }; });
    if (modo === "middleV") boxes.forEach((b) => { pos[b.id] = { y: cY - b.h / 2 }; });
    if (modo === "bottom") boxes.forEach((b) => { pos[b.id] = { y: maxB - b.h }; });
    if (modo === "distH" && boxes.length >= 3) {
      const s = [...boxes].sort((a, b) => a.x - b.x);
      const gap = ((maxR - minL) - s.reduce((acc, b) => acc + b.w, 0)) / (s.length - 1);
      let cur = minL;
      s.forEach((b) => { pos[b.id] = { x: cur }; cur += b.w + gap; });
    }
    if (modo === "distV" && boxes.length >= 3) {
      const s = [...boxes].sort((a, b) => a.y - b.y);
      const gap = ((maxB - minT) - s.reduce((acc, b) => acc + b.h, 0)) / (s.length - 1);
      let cur = minT;
      s.forEach((b) => { pos[b.id] = { y: cur }; cur += b.h + gap; });
    }
    setNodes((nds) => nds.map((n) => pos[n.id]
      ? { ...n, position: { x: pos[n.id].x ?? n.position.x, y: pos[n.id].y ?? n.position.y } }
      : n));
  }, [readOnly, selectedIds, setNodes]);

  // Atajos teclado
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const enInput = t?.matches?.("input,textarea") || t?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      // Duplicar / copiar / pegar
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); if (!enInput && !readOnly) duplicarSelected(); return; }
      if (mod && e.key.toLowerCase() === "c" && !enInput) { copiarSelected(); return; }
      if (mod && e.key.toLowerCase() === "v" && !enInput) { e.preventDefault(); if (!readOnly) pegar(); return; }
      // Mover selección con flechas (Shift = 10px)
      if (!enInput && !readOnly && selectedIds.length > 0 && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowUp") nudge(0, -d);
        else if (e.key === "ArrowDown") nudge(0, d);
        else if (e.key === "ArrowLeft") nudge(-d, 0);
        else if (e.key === "ArrowRight") nudge(d, 0);
        return;
      }
      // Undo / Redo. Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y = redo.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (enInput) return;
        e.preventDefault();
        if (e.shiftKey) { if (!readOnly) redo(); }
        else { if (!readOnly) undo(); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        if (enInput) return;
        e.preventDefault();
        if (!readOnly) redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); guardar(); return;
      }
      if (enInput) return;
      const k = e.key?.toLowerCase();
      if (k === "v") setTool("select");
      if (k === "h") setTool("pan");
      // F2 o Enter sobre nodo seleccionado → editar texto
      if ((e.key === "F2" || e.key === "Enter") && selectedIds.length === 1) {
        e.preventDefault();
        const sel = selectedIds[0];
        setNodes((nds) => nds.map((x) =>
          x.id === sel ? { ...x, data: { ...x.data, editing: true } } : x,
        ));
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [guardar, selectedIds, setNodes, undo, redo, readOnly, duplicarSelected, copiarSelected, pegar, nudge]);

  /* ── Export ── */
  const capturarCanvasPng = useCallback(async (): Promise<string | null> => {
    if (!rfWrapper.current) return null;
    const viewportEl = rfWrapper.current.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) return null;
    if (!nodes.length) { alert("El diagrama está vacío, no hay nada que exportar."); return null; }
    const { toPng } = await import("html-to-image");
    // Captura TODO el grafo (no solo la vista actual): calcula los limites de
    // los nodos y un viewport que los encuadre, asi el PDF/PNG sale completo
    // aunque el canvas no este ajustado en pantalla.
    const bounds = getNodesBounds(nodes);
    const padding = 0.12;
    const w = Math.min(Math.max(Math.round(bounds.width) + 160, 800), 4000);
    const h = Math.min(Math.max(Math.round(bounds.height) + 160, 600), 4000);
    const vp = getViewportForBounds(bounds, w, h, 0.2, 2, padding);
    return await toPng(viewportEl, {
      cacheBust: true,
      backgroundColor: isDarkMode ? "#0B1220" : "#FFFFFF",
      pixelRatio: 2,
      width: w,
      height: h,
      style: {
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      },
    });
  }, [isDarkMode, nodes]);

  const exportarPng = useCallback(async () => {
    setExportOpen(false);
    try {
      const dataUrl = await capturarCanvasPng();
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.download = `${titulo || "diagrama"}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      alert("Error exportando PNG: " + (e as Error).message);
    }
  }, [capturarCanvasPng, titulo]);

  // Construye el PDF (imagen del canvas centrada en A4) y devuelve la instancia.
  const construirPdf = useCallback(async () => {
    const dataUrl = await capturarCanvasPng();
    if (!dataUrl) return null;
    const { jsPDF } = await import("jspdf");
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res) => { img.onload = res; });
    const landscape = img.width >= img.height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "pt", format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    let w = maxW, h = (img.height / img.width) * w;
    if (h > maxH) { h = maxH; w = (img.width / img.height) * h; }
    const x = (pageW - w) / 2, y = (pageH - h) / 2;
    pdf.addImage(dataUrl, "PNG", x, y, w, h);
    return pdf;
  }, [capturarCanvasPng]);

  const exportarPdf = useCallback(async () => {
    setExportOpen(false);
    try {
      const pdf = await construirPdf();
      if (pdf) pdf.save(`${titulo || "diagrama"}.pdf`);
    } catch (e) {
      alert("Error exportando PDF: " + (e as Error).message);
    }
  }, [construirPdf, titulo]);

  // Exporta un .doc (HTML compatible con Word) con la imagen del diagrama.
  const exportarWord = useCallback(async () => {
    setExportOpen(false);
    try {
      const dataUrl = await capturarCanvasPng();
      if (!dataUrl) return;
      const t = titulo || "Diagrama";
      const desc = diagrama?.descripcion ? `<p style="font-family:Arial;font-size:11pt;color:#555">${diagrama.descripcion}</p>` : "";
      const html =
        `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
        `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
        `<head><meta charset="utf-8"><title>${t}</title></head>` +
        `<body><h1 style="font-family:Arial;font-size:16pt">${t}</h1>${desc}` +
        `<img src="${dataUrl}" style="max-width:680px;width:100%"/>` +
        `<p style="font-family:Arial;font-size:8pt;color:#999;margin-top:18px">Generado desde ERP Profesional · módulo Diagramas</p>` +
        `</body></html>`;
      const blob = new Blob(["﻿", html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${t}.doc`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      alert("Error exportando Word: " + (e as Error).message);
    }
  }, [capturarCanvasPng, titulo, diagrama]);

  // Visualiza el diagrama como PDF dentro de la app (overlay con iframe).
  const verPdf = useCallback(async () => {
    setExportOpen(false);
    try {
      const pdf = await construirPdf();
      if (!pdf) return;
      const url = pdf.output("bloburl") as unknown as string;
      setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return String(url); });
    } catch (e) {
      alert("Error mostrando PDF: " + (e as Error).message);
    }
  }, [construirPdf]);

  // Si se entra con ?pdf=1 (p.ej. desde el banner del modulo), abre la vista PDF
  // automaticamente una vez que el diagrama y el canvas ya estan renderizados.
  // Usamos una ref para `verPdf` y dependencias ESTABLES: si dependieramos de
  // `verPdf`, ReactFlow (que muta los nodos al montar -> cambia verPdf) re-correria
  // el efecto y su cleanup cancelaria el setTimeout antes de disparar.
  const pdfAutoShown = useRef(false);
  const verPdfRef = useRef(verPdf);
  useEffect(() => { verPdfRef.current = verPdf; }, [verPdf]);
  useEffect(() => {
    if (pdfAutoShown.current) return;
    if (searchParams?.get("pdf") !== "1") return;
    if (!diagrama) return;
    pdfAutoShown.current = true;
    const t = setTimeout(() => { verPdfRef.current(); }, 900); // deja que ReactFlow pinte
    return () => clearTimeout(t);
  }, [searchParams, diagrama]);

  const selectedNode = useMemo(
    () => (selectedIds.length === 1 ? nodes.find((n) => n.id === selectedIds[0]) : null) || null,
    [nodes, selectedIds],
  );

  const updateNodes = useCallback((predicate: (id: string) => boolean, patch: Partial<ShapeData>) => {
    setNodes((nds) => nds.map((n) => predicate(n.id) ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const updateSelected = (patch: Partial<ShapeData>) => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    updateNodes((id) => set.has(id), patch);
  };

  const vincularProceso = useCallback((procesoRef: number | null) => {
    const p = procesos.find((x) => x.id === procesoRef);
    updateNodes((nid) => selectedIds.includes(nid), { procesoRef, procesoNombre: p ? (p.nombre || "") : "" });
  }, [procesos, selectedIds, updateNodes]);

  // Conecta el bus singleton (NO Context) a estos handlers, así los ShapeNode
  // pueden disparar cambios sin necesidad de prop-drilling ni Provider —
  // evita la cascada de re-renders que rompía ReactFlow.
  useEffect(() => {
    editorBus.patch = (id: string, p: Partial<ShapeData>) =>
      updateNodes((nid) => nid === id, p);
    editorBus.stopEdit = () =>
      setNodes((nds) => nds.map((n) => {
        if (!n.data?.editing && n.data?.editingLaneIndex === undefined) return n;
        return { ...n, data: { ...n.data, editing: false, editingLaneIndex: undefined } };
      }));
  }, [updateNodes, setNodes]);

  const eliminarSelected = () => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    setNodes((nds) => nds.filter((n) => !set.has(n.id)));
    setEdges((eds) => eds.filter((e) => !set.has(e.source) && !set.has(e.target)));
    setSelectedIds([]);
  };

  // Inserta una plantilla ISO 9001 completa en el centro de la vista actual.
  const insertarPlantilla = useCallback((plantilla: PlantillaISO) => {
    if (readOnly) return;
    const { nodes: tn, edges: te } = plantilla.build();
    const stamp = Date.now().toString(36);
    const idMap: Record<string, string> = {};

    // Offset hacia el centro/arriba de la vista actual para que caiga visible.
    let ox = 80, oy = 80;
    const inst = rfInstanceRef.current;
    if (inst && rfWrapper.current) {
      const rect = rfWrapper.current.getBoundingClientRect();
      const c = inst.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 });
      ox = Math.round(c.x) - 300;
      oy = Math.round(c.y) - 120;
    }

    const newNodes = tn.map((n) => {
      const nid = `${plantilla.id}-${n.id}-${stamp}`;
      idMap[n.id] = nid;
      return { ...n, id: nid, selected: true, position: { x: n.position.x + ox, y: n.position.y + oy } };
    });

    const edgeStyle = { stroke: isDarkMode ? "#94A3B8" : "#475569", strokeWidth: 2.5 };
    const marker = { type: MarkerType.ArrowClosed, color: isDarkMode ? "#94A3B8" : "#475569" };
    const newEdges = te.map((e, i) => ({
      ...e,
      id: `e-${plantilla.id}-${stamp}-${i}`,
      source: idMap[e.source] || e.source,
      target: idMap[e.target] || e.target,
      type: "smoothstep",
      style: edgeStyle,
      markerEnd: marker,
      labelStyle: { fontWeight: 800, fontSize: 12 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 8,
      labelBgStyle: { fill: isDarkMode ? "#0F172A" : "#FFFFFF", stroke: isDarkMode ? "#334155" : "#CBD5E1" },
      interactionWidth: 28,
    }));

    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    // Encuadra todo tras insertar.
    setTimeout(() => { try { rfInstanceRef.current?.fitView({ padding: 0.2, duration: 400 }); } catch { /* */ } }, 60);
  }, [readOnly, isDarkMode, setNodes, setEdges]);

  // Si llega ?tpl=<id> (al crear desde la lista), inserta esa plantilla una vez.
  const tplInserted = useRef(false);
  useEffect(() => {
    if (tplInserted.current) return;
    const tpl = searchParams?.get("tpl");
    if (!tpl || !diagrama || readOnly) return;
    const plant = ISO_PLANTILLAS.find((p) => p.id === tpl);
    if (!plant) return;
    tplInserted.current = true;
    const t = setTimeout(() => insertarPlantilla(plant), 700);
    return () => clearTimeout(t);
  }, [searchParams, diagrama, readOnly, insertarPlantilla]);

  // Sidebar: filtrar por búsqueda + agrupar
  const shapesFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHAPES.filter((s) => !q || s.label.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q));
  }, [search]);
  const porCategoria = useMemo(() => {
    const m: Record<string, ShapeDef[]> = {};
    for (const s of shapesFiltrados) {
      (m[s.categoria] ??= []).push(s);
    }
    return m;
  }, [shapesFiltrados]);

  // ── Memoización de props de ReactFlow para evitar el loop ────────────────
  const initialViewport = useMemo(
    () => diagrama?.data?.viewport || DEFAULT_VIEWPORT,
    [diagrama?.id], // solo cambia cuando se carga otro diagrama
  );
  // Si alguno de los nodos está en edición, no quiero que Delete/Backspace
  // borre el nodo entero (sólo debe afectar al texto que se está editando).
  const anyEditing = useMemo(
    () => nodes.some(
      (n) => n.data?.editing
        || (typeof n.data?.editingLaneIndex === "number" && n.data.editingLaneIndex >= 0),
    ),
    [nodes],
  );
  const deleteKeys = useMemo(
    () => (anyEditing || editingEdgeId ? null : DELETE_KEYS),
    [anyEditing, editingEdgeId],
  );
  const panOnDragMode = useMemo(
    () => (tool === "pan" || spacePressed ? PAN_DRAG_PAN_MODE : PAN_DRAG_NORMAL),
    [tool, spacePressed],
  );
  const onInit = useCallback((inst: ReactFlowInstance<Node<ShapeData>, Edge>) => {
    rfInstanceRef.current = inst as unknown as ReactFlowInstance;
  }, []);
  const onSelectionChange = useCallback(
    ({ nodes: ns }: { nodes: Node[] }) => setSelectedIds(ns.map((n) => n.id)),
    [],
  );
  const onNodeDoubleClick = useCallback(
    (_: any, n: Node) => {
      // Marca solo este nodo como en edición; limpia los demás.
      setNodes((nds) => nds.map((x) =>
        x.id === n.id
          ? { ...x, data: { ...x.data, editing: true } }
          : (x.data.editing ? { ...x, data: { ...x.data, editing: false } } : x),
      ));
    },
    [setNodes],
  );
  const onEdgeDoubleClick = useCallback(
    (_: any, e: Edge) => setEditingEdgeId(e.id),
    [],
  );
  const onPaneClick = useCallback(() => {
    setEditingEdgeId(null);
    editorBus.stopEdit();
  }, []);

  if (!diagrama) {
    return <div className={`p-10 ${theme.textTertiary}`}>Cargando…</div>;
  }

  return (
    <div className={`h-full flex flex-col ${theme.bgBase}`}>
      {/* ──────── HEADER 1: título + acciones ──────── */}
      <header className={`flex items-center gap-3 px-4 py-2 border-b shrink-0 ${theme.divider} ${
        isDarkMode ? "bg-[#0F172A]/80" : "bg-white"
      }`}>
        <button onClick={() => router.push("/diagramas")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${theme.accentHover}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
          style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
          <Workflow className="w-4 h-4 text-white" />
        </div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
          disabled={readOnly}
          className={`min-w-0 flex-1 max-w-md bg-transparent outline-none text-base font-black tracking-tight ${theme.textPrimary} disabled:opacity-70`}
          placeholder="Título del diagrama" />
        {readOnly ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 inline-flex items-center gap-1">
            <Eye className="w-3 h-3" /> Solo ver
          </span>
        ) : (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            dirty
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          }`}>
            {saving ? "Guardando…" : dirty ? "Borrador" : "Guardado"}
          </span>
        )}
        {miPermiso === "editar" && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Compartido contigo
          </span>
        )}

        <div className="flex-1" />

        <button onClick={() => setPublico((p) => !p)}
          disabled={!esPropietario}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
            publico
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
          }`}>
          {publico ? <><Globe className="w-3.5 h-3.5" /> Público</> : <><Lock className="w-3.5 h-3.5" /> Privado</>}
        </button>

        {esPropietario && (
          <button onClick={() => setShareOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-200 hover:bg-white/[0.08]"
                         : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}>
            <Share2 className="w-3.5 h-3.5" /> Compartir
          </button>
        )}

        {/* Export menu (PNG/PDF) */}
        <div className="relative">
          <button onClick={() => setExportOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-300 hover:bg-white/[0.08]"
                         : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}>
            Exportar <ChevronDown className="w-3 h-3" />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-xl z-20 overflow-hidden ${
                isDarkMode ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"
              }`}>
                <button onClick={verPdf}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left font-semibold ${
                    isDarkMode ? "hover:bg-white/[0.04] text-fuchsia-300" : "hover:bg-fuchsia-50 text-fuchsia-600"
                  }`}>
                  <Eye className="w-4 h-4" /> Ver en PDF
                </button>
                <button onClick={exportarPng}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left ${
                    isDarkMode ? "hover:bg-white/[0.04] text-slate-200" : "hover:bg-slate-50 text-slate-700"
                  }`}>
                  <ImageIcon className="w-4 h-4" /> Descargar PNG
                </button>
                <button onClick={exportarPdf}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left ${
                    isDarkMode ? "hover:bg-white/[0.04] text-slate-200" : "hover:bg-slate-50 text-slate-700"
                  }`}>
                  <FileText className="w-4 h-4" /> Descargar PDF
                </button>
                <button onClick={exportarWord}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left ${
                    isDarkMode ? "hover:bg-white/[0.04] text-sky-300" : "hover:bg-sky-50 text-sky-600"
                  }`}>
                  <FileText className="w-4 h-4" /> Descargar Word
                </button>
              </div>
            </>
          )}
        </div>

        {!readOnly && (
          <button onClick={guardar} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white shadow-md disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
            <Save className="w-3.5 h-3.5" /> Guardar
          </button>
        )}
      </header>

      {/* ──────── HEADER 2: formato (tipo LucidChart) — solo si editas ──────── */}
      {!readOnly && (
        <FormatToolbar
          isDark={isDarkMode}
          theme={theme}
          selectedNode={selectedNode}
          onPatch={updateSelected}
          tool={tool}
          setTool={setTool}
          onDuplicate={duplicarSelected}
          onDelete={eliminarSelected}
          hasSelection={selectedIds.length > 0}
          onAlign={alinear}
          multiCount={selectedIds.length}
        />
      )}

      {/* ──────── CUERPO ──────── */}
      <div className="flex-1 flex min-h-0">
        {!readOnly && (
          <Sidebar
            isDark={isDarkMode}
            theme={theme}
            search={search}
            setSearch={setSearch}
            porCategoria={porCategoria}
            openCats={openCats}
            setOpenCats={setOpenCats}
            onInsertPlantilla={insertarPlantilla}
          />
        )}

        <div ref={rfWrapper} className="flex-1 min-w-0 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={readOnly ? undefined : onConnect}
              onInit={onInit}
              onDrop={readOnly ? undefined : onDrop}
              onDragOver={readOnly ? undefined : onDragOver}
              onSelectionChange={onSelectionChange}
              onNodeDoubleClick={readOnly ? undefined : onNodeDoubleClick}
              onNodeDragStop={readOnly ? undefined : onNodeDragStop}
              onEdgeDoubleClick={readOnly ? undefined : onEdgeDoubleClick}
              onPaneClick={onPaneClick}
              fitView={false}
              defaultViewport={initialViewport}
              proOptions={PRO_OPTIONS}
              colorMode={isDarkMode ? "dark" : "light"}
              deleteKeyCode={readOnly ? null : deleteKeys}
              connectionMode={ConnectionMode.Loose}
              connectionRadius={60}
              connectionLineStyle={CONNECTION_LINE_STYLE}
              selectionOnDrag={!readOnly && tool === "select" && !spacePressed}
              panOnDrag={panOnDragMode}
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode={MULTI_SELECT_KEYS}
              selectNodesOnDrag={false}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              edgesReconnectable={!readOnly}
              elementsSelectable
              panOnScroll
              zoomOnScroll
              zoomOnPinch
              elevateEdgesOnSelect
              elevateNodesOnSelect
              snapToGrid
              snapGrid={SNAP_GRID}
            >
              <Background variant={BackgroundVariant.Lines} gap={120} size={1}
                color={isDarkMode ? "#14203a" : "#EEF2F7"} />
              <Background id="dots" variant={BackgroundVariant.Dots} gap={24} size={1.4}
                color={isDarkMode ? "#243049" : "#D9E0EA"} />
              <Controls className="!shadow-lg !rounded-xl !overflow-hidden" />
              <MiniMap pannable zoomable
                nodeColor={(n: any) => n.data?.color || "#94A3B8"}
                nodeStrokeColor={isDarkMode ? "#0B1220" : "#fff"}
                nodeBorderRadius={4}
                maskColor={isDarkMode ? "rgba(7,12,24,0.78)" : "rgba(241,245,249,0.75)"}
                className="!rounded-xl !shadow-lg" />
            </ReactFlow>

            {/* Modal compartir — solo lo abre el propietario */}
            {shareOpen && esPropietario && (
              <ShareModal
                diagramaId={id}
                isDark={isDarkMode}
                onClose={() => setShareOpen(false)}
              />
            )}

            {/* Panel: vínculo de la figura con un proceso real del SGC */}
            {selectedNode && (
              <ProcesoVinculoPanel
                node={selectedNode}
                procesos={procesos}
                kpis={kpisSGC}
                riesgos={riesgosSGC}
                readOnly={readOnly}
                isDark={isDarkMode}
                theme={theme}
                onLink={vincularProceso}
                onOpenSGC={(path: string) => router.push(path)}
              />
            )}

            {/* Mini editor flotante para etiqueta de edge */}
            {editingEdgeId && (
              <EdgeLabelEditor
                edgeId={editingEdgeId}
                edges={edges}
                onPatch={(p) => setEdges((eds) => eds.map((e) => e.id === editingEdgeId ? { ...e, ...p } : e))}
                onClose={() => setEditingEdgeId(null)}
                isDark={isDarkMode}
              />
            )}

            {/* Visor PDF (overlay con iframe) */}
            {pdfUrl && (
              <div className="fixed inset-0 z-[500] flex flex-col bg-black/70 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#0F172A] border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    <span className="text-sm font-bold text-white truncate">{titulo || "Diagrama"} — Vista PDF</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={pdfUrl} download={`${titulo || "diagrama"}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700">
                      <FileText className="w-3.5 h-3.5" /> Descargar
                    </a>
                    <button onClick={() => setPdfUrl((u) => { if (u) URL.revokeObjectURL(u); return null; })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20">
                      <X className="w-3.5 h-3.5" /> Cerrar
                    </button>
                  </div>
                </div>
                <iframe src={pdfUrl} title="PDF del diagrama" className="flex-1 w-full bg-white" />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Format toolbar (segunda fila)
 * ──────────────────────────────────────────────────────────────────────────── */
function FormatToolbar({
  isDark, theme, selectedNode, onPatch, tool, setTool, onDuplicate, onDelete, hasSelection,
  onAlign, multiCount,
}: any) {
  const multi = (multiCount || 0) >= 2;
  const AlignBtn = ({ modo, title, children, disabled }: any) => (
    <button onClick={() => onAlign?.(modo)} title={title} disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed ${
        isDark ? "text-slate-300 hover:bg-white/[0.05]" : "text-slate-600 hover:bg-slate-100"
      }`}>{children}</button>
  );
  const data = selectedNode?.data as ShapeData | undefined;
  const fontSize = data?.fontSize ?? 14;
  const color = data?.color ?? "#3B82F6";

  const Btn = ({ active, onClick, title, children }: any) => (
    <button onClick={onClick} title={title}
      disabled={!selectedNode && !["tool"].includes(title || "")}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        active ? "text-white shadow" : (isDark ? "text-slate-300 hover:bg-white/[0.05]" : "text-slate-600 hover:bg-slate-100")
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      style={active ? { background: "linear-gradient(135deg,#EC4899,#8B5CF6)" } : {}}>
      {children}
    </button>
  );

  const Divider = () => <div className={`w-px h-6 mx-1 ${isDark ? "bg-white/[0.06]" : "bg-slate-200"}`} />;

  return (
    <div className={`flex items-center gap-1 px-3 py-1.5 border-b shrink-0 ${theme.divider} ${
      isDark ? "bg-[#0F172A]/60" : "bg-white"
    }`}>
      {/* Modo cursor */}
      <Btn active={tool === "select"} onClick={() => setTool("select")} title="Modo selección (V)">
        <MousePointer2 className="w-4 h-4" />
      </Btn>
      <Btn active={tool === "pan"} onClick={() => setTool("pan")} title="Modo pan (H, o Espacio)">
        <Hand className="w-4 h-4" />
      </Btn>
      <Divider />

      {/* Tamaño de fuente */}
      <select disabled={!selectedNode} value={fontSize}
        onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
        className={`h-8 rounded-lg px-2 text-xs font-bold border outline-none disabled:opacity-30 ${
          isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"
        }`}>
        {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40].map((s) => (
          <option key={s} value={s}>{s} pt</option>
        ))}
      </select>

      <Btn active={!!data?.bold} onClick={() => onPatch({ bold: !data?.bold })} title="Negrita (B)">
        <Bold className="w-4 h-4" />
      </Btn>
      <Btn active={!!data?.italic} onClick={() => onPatch({ italic: !data?.italic })} title="Cursiva (I)">
        <Italic className="w-4 h-4" />
      </Btn>
      <Btn active={!!data?.underline} onClick={() => onPatch({ underline: !data?.underline })} title="Subrayado (U)">
        <Underline className="w-4 h-4" />
      </Btn>

      <Divider />

      <Btn active={data?.align === "left"} onClick={() => onPatch({ align: "left" })} title="Alinear izquierda">
        <AlignLeft className="w-4 h-4" />
      </Btn>
      <Btn active={!data?.align || data?.align === "center"} onClick={() => onPatch({ align: "center" })} title="Centrar">
        <AlignCenter className="w-4 h-4" />
      </Btn>
      <Btn active={data?.align === "right"} onClick={() => onPatch({ align: "right" })} title="Alinear derecha">
        <AlignRight className="w-4 h-4" />
      </Btn>

      <Divider />

      {/* Color de relleno */}
      <div className="relative">
        <label className="cursor-pointer" title="Color de relleno">
          <input type="color" value={color}
            disabled={!selectedNode}
            onChange={(e) => onPatch({ color: e.target.value })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center ${
            !selectedNode ? "opacity-30" : (isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100")
          }`}>
            <Palette className={`w-4 h-4 ${isDark ? "text-slate-300" : "text-slate-600"}`} />
            <div className="w-5 h-1 rounded-full mt-0.5" style={{ background: color }} />
          </div>
        </label>
      </div>

      {/* Swatches rápidos */}
      <div className="flex items-center gap-0.5">
        {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9", "#475569"].map((c) => (
          <button key={c} onClick={() => onPatch({ color: c })}
            disabled={!selectedNode}
            title={c}
            className="w-5 h-5 rounded-md transition-transform hover:scale-125 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: c,
              boxShadow: color.toLowerCase() === c.toLowerCase()
                ? `0 0 0 2px ${isDark ? "#0F172A" : "#fff"}, 0 0 0 4px ${c}` : "none",
            }} />
        ))}
      </div>

      <Divider />

      {/* Grosor de línea (stroke) */}
      <select disabled={!selectedNode} value={data?.strokeWidth ?? 0}
        onChange={(e) => onPatch({ strokeWidth: Number(e.target.value), stroke: data?.stroke || "#0F172A" })}
        className={`h-8 rounded-lg px-2 text-xs font-bold border outline-none disabled:opacity-30 ${
          isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"
        }`}>
        <option value={0}>Sin borde</option>
        <option value={1}>1 px</option>
        <option value={2}>2 px</option>
        <option value={3}>3 px</option>
        <option value={4}>4 px</option>
      </select>

      <Divider />

      {/* Controles para swimlanes: agregar / quitar carriles */}
      {(data?.shape === "swimlane-h" || data?.shape === "swimlane-v") && (() => {
        const fallback = data.shape === "swimlane-h" ? ["Carril 1", "Carril 2"] : ["Fase 1", "Fase 2", "Fase 3"];
        const lanes = data.lanes && data.lanes.length ? data.lanes : fallback;
        const term = data.shape === "swimlane-h" ? "Carril" : "Fase";
        return (
          <>
            <Rows3 className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <Btn onClick={() => onPatch({ lanes: lanes.slice(0, -1) })}
              title={`Quitar último ${term.toLowerCase()}`}>
              <Minus className="w-4 h-4" />
            </Btn>
            <span className={`text-xs font-black px-1 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {lanes.length}
            </span>
            <Btn onClick={() => onPatch({ lanes: [...lanes, `${term} ${lanes.length + 1}`] })}
              title={`Agregar ${term.toLowerCase()}`}>
              <Plus className="w-4 h-4" />
            </Btn>
            <Divider />
          </>
        );
      })()}

      {/* Alinear y distribuir (2+ seleccionados) */}
      {multi && (
        <>
          <Divider />
          <AlignBtn modo="left" title="Alinear a la izquierda"><AlignStartVertical className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="centerH" title="Centrar horizontalmente"><AlignCenterVertical className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="right" title="Alinear a la derecha"><AlignEndVertical className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="top" title="Alinear arriba"><AlignStartHorizontal className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="middleV" title="Centrar verticalmente"><AlignCenterHorizontal className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="bottom" title="Alinear abajo"><AlignEndHorizontal className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="distH" title="Distribuir horizontal (3+)" disabled={(multiCount || 0) < 3}><AlignHorizontalDistributeCenter className="w-4 h-4" /></AlignBtn>
          <AlignBtn modo="distV" title="Distribuir vertical (3+)" disabled={(multiCount || 0) < 3}><AlignVerticalDistributeCenter className="w-4 h-4" /></AlignBtn>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => hasSelection && onDuplicate?.()} title="Duplicar (Ctrl+D)"
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            isDark ? "text-slate-300 hover:bg-white/[0.05]" : "text-slate-600 hover:bg-slate-100"
          }`}>
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => hasSelection && onDelete?.()} title="Eliminar (Supr)"
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            isDark ? "text-rose-300 hover:bg-rose-500/15" : "text-rose-500 hover:bg-rose-50"
          }`}>
          <Trash2 className="w-4 h-4" />
        </button>
        <span className={`text-[10px] font-bold ml-1 ${theme.textTertiary}`}>
          {selectedNode ? "1 elemento" : hasSelection ? "varios" : "Sin selección"}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sidebar — buscador + categorías colapsables (estilo LucidChart)
 * ──────────────────────────────────────────────────────────────────────────── */
function Sidebar({
  isDark, theme, search, setSearch, porCategoria, openCats, setOpenCats, onInsertPlantilla,
}: any) {
  const onDragStart = (e: React.DragEvent, k: ShapeKind) => {
    e.dataTransfer.setData("application/diagram-shape", k);
    e.dataTransfer.effectAllowed = "move";
  };

  const cats = Object.keys(porCategoria);
  const isoOpen = openCats.__iso ?? true;
  const q = (search || "").trim().toLowerCase();
  const plantillasFiltradas = q
    ? ISO_PLANTILLAS.filter((p) => p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q) || "iso 9001 plantilla".includes(q))
    : ISO_PLANTILLAS;

  return (
    <aside className={`w-64 shrink-0 border-r flex flex-col ${
      isDark ? "bg-[#0B1220] border-white/[0.04]" : "bg-white border-slate-200/70"
    }`}>
      {/* Buscador */}
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-base font-black ${theme.textPrimary}`}>Figuras</h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"
        }`}>
          <Search className={`w-4 h-4 ${theme.textTertiary}`} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar figura…"
            className={`flex-1 bg-transparent text-sm outline-none ${theme.textPrimary}`} />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {/* ── Plantillas ISO 9001 ── */}
        {plantillasFiltradas.length > 0 && (
          <div className="mb-1">
            <button
              onClick={() => setOpenCats((p: any) => ({ ...p, __iso: !isoOpen }))}
              className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left ${
                isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-100"
              }`}>
              {isoOpen ? <ChevronDown className={`w-3.5 h-3.5 ${theme.textTertiary}`} />
                       : <ChevronRightIcon className={`w-3.5 h-3.5 ${theme.textTertiary}`} />}
              <Workflow className="w-3.5 h-3.5 text-fuchsia-500" />
              <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Plantillas ISO 9001</span>
              <span className={`ml-auto text-[10px] ${theme.textTertiary}`}>{plantillasFiltradas.length}</span>
            </button>
            {isoOpen && (
              <div className="space-y-1 px-1 pb-2">
                {plantillasFiltradas.map((p) => (
                  <button key={p.id} onClick={() => onInsertPlantilla?.(p)} title={p.descripcion}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all hover:scale-[1.01] ${
                      isDark ? "bg-white/[0.02] border-white/[0.05] hover:border-fuchsia-500/50"
                             : "bg-white border-slate-200 hover:border-fuchsia-500/50"
                    }`}>
                    <div className={`text-xs font-bold ${theme.textPrimary}`}>{p.nombre}</div>
                    <div className={`text-[10px] leading-tight mt-0.5 ${theme.textTertiary}`}>{p.descripcion}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {cats.length === 0 && plantillasFiltradas.length === 0 && (
          <p className={`text-center text-xs py-8 ${theme.textTertiary}`}>Sin coincidencias</p>
        )}
        {cats.map((cat) => {
          const open = openCats[cat] ?? true;
          const list = porCategoria[cat] as ShapeDef[];
          return (
            <div key={cat}>
              <button
                onClick={() => setOpenCats((p: any) => ({ ...p, [cat]: !open }))}
                className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left ${
                  isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-100"
                }`}>
                {open ? <ChevronDown className={`w-3.5 h-3.5 ${theme.textTertiary}`} />
                      : <ChevronRightIcon className={`w-3.5 h-3.5 ${theme.textTertiary}`} />}
                <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>{cat}</span>
                <span className={`ml-auto text-[10px] ${theme.textTertiary}`}>{list.length}</span>
              </button>
              {open && (
                <div className="grid grid-cols-4 gap-1 px-1 pb-2">
                  {list.map((s) => (
                    <div key={s.kind}
                      draggable
                      onDragStart={(e) => onDragStart(e, s.kind)}
                      title={s.label}
                      className={`group aspect-square rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing border transition-all hover:scale-110 ${
                        isDark ? "bg-white/[0.02] border-white/[0.04] hover:border-pink-500/50 text-slate-300"
                               : "bg-white border-slate-200 hover:border-pink-500/50 text-slate-600"
                      }`}>
                      {s.miniSvg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`p-3 border-t ${theme.divider} text-[10px] ${theme.textTertiary}`}>
        💡 Arrastra una figura o una <b>plantilla ISO 9001</b> al lienzo. Conecta desde los puntos blancos.<br />
        <b>Ctrl+D</b> duplicar · <b>Ctrl+C/V</b> copiar/pegar · <b>flechas</b> mover (Shift = 10px) · <b>Ctrl+Z/Y</b> deshacer/rehacer · <b>V</b> selección · <b>H</b>/Espacio pan.
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Panel: vincular la figura a un proceso del SGC y ver sus KPIs y riesgos
 * ──────────────────────────────────────────────────────────────────────────── */
function ProcesoVinculoPanel({
  node, procesos, kpis, riesgos, readOnly, isDark, theme, onLink, onOpenSGC,
}: any) {
  const [abierto, setAbierto] = useState(true);
  const ref: number | null = (node?.data?.procesoRef ?? null) as number | null;
  const procFiltro = (x: any) => x.proceso_ref === ref || x.proceso === ref;
  const kpisProc = ref != null ? (kpis || []).filter(procFiltro) : [];
  const riesgosProc = ref != null ? (riesgos || []).filter(procFiltro) : [];
  const proc = (procesos || []).find((p: any) => p.id === ref);

  const card = isDark ? "bg-[#0F172A]/95 border-white/[0.08]" : "bg-white/95 border-slate-200";
  const sub = `text-[10px] font-black uppercase tracking-wider ${theme.textTertiary}`;

  const nivelRiesgo = (r: any) => r.nivel || r.nivel_riesgo || r.severidad || r.clasificacion || "";
  const nivelColor = (n: string) => {
    const s = String(n).toLowerCase();
    if (s.includes("alt") || s.includes("crit")) return "#EF4444";
    if (s.includes("med")) return "#F59E0B";
    if (s.includes("baj")) return "#10B981";
    return "#94A3B8";
  };

  return (
    <div className={`absolute top-3 right-3 z-30 w-72 rounded-2xl border shadow-xl backdrop-blur-md ${card}`}>
      <button onClick={() => setAbierto((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#6366F1)" }}>
          <Link2 className="w-3.5 h-3.5 text-white" />
        </span>
        <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Proceso del SGC</span>
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${theme.textTertiary} ${abierto ? "" : "-rotate-90"}`} />
      </button>

      {abierto && (
        <div className="px-3 pb-3 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Selector de vínculo */}
          {!readOnly ? (
            <div>
              <label className={sub}>Vincular figura a proceso</label>
              <select
                value={ref ?? ""}
                onChange={(e) => onLink?.(e.target.value ? Number(e.target.value) : null)}
                className={`mt-1 w-full px-2.5 py-2 rounded-lg border text-sm outline-none ${
                  isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"
                }`}>
                <option value="">— Sin vínculo —</option>
                {(procesos || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className={`text-xs ${theme.textSecondary}`}>{proc ? proc.nombre : "Figura sin proceso vinculado."}</div>
          )}

          {ref == null ? (
            <p className={`text-[11px] ${theme.textTertiary}`}>
              Vincula esta figura a un proceso para ver aquí sus <b>indicadores</b> y <b>riesgos</b> reales del SGC.
            </p>
          ) : (
            <>
              {/* KPIs */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={sub}>Indicadores (KPI)</span>
                  <span className={`text-[10px] ${theme.textTertiary}`}>{kpisProc.length}</span>
                </div>
                {kpisProc.length === 0 ? (
                  <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Sin KPIs para este proceso.</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {kpisProc.map((k: any) => (
                      <div key={k.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                        <span className={`text-xs font-semibold truncate ${theme.textPrimary}`}>{k.nombre}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[11px] font-mono ${theme.textSecondary}`}>{Number(k.valor_actual)}/{Number(k.meta)}{k.unidad}</span>
                          <span className="w-2 h-2 rounded-full" style={{ background: k.cumple ? "#10B981" : "#EF4444" }} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Riesgos */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={sub}>Riesgos</span>
                  <span className={`text-[10px] ${theme.textTertiary}`}>{riesgosProc.length}</span>
                </div>
                {riesgosProc.length === 0 ? (
                  <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Sin riesgos para este proceso.</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {riesgosProc.map((r: any) => {
                      const nv = nivelRiesgo(r);
                      return (
                        <div key={r.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${isDark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                          <span className={`text-xs font-semibold truncate ${theme.textPrimary}`}>{r.nombre || r.descripcion}</span>
                          {nv ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${nivelColor(nv)}22`, color: nivelColor(nv) }}>{nv}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                <button onClick={() => onOpenSGC?.("/sgc/kpis")}
                  className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border ${isDark ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.05]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Ver KPIs
                </button>
                <button onClick={() => onOpenSGC?.("/sgc/riesgos")}
                  className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border ${isDark ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.05]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Ver riesgos
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Editor flotante para etiqueta de edge
 * ──────────────────────────────────────────────────────────────────────────── */
function EdgeLabelEditor({
  edgeId, edges, onPatch, onClose, isDark,
}: {
  edgeId: string;
  edges: Edge[];
  onPatch: (p: Partial<Edge>) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const e = edges.find((x) => x.id === edgeId);
  const [val, setVal] = useState<string>(String(e?.label || ""));
  useEffect(() => { setVal(String(e?.label || "")); }, [edgeId]); // eslint-disable-line
  if (!e) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-xl border ${
        isDark ? "bg-[#0F172A] border-white/[0.08]" : "bg-white border-slate-200"
      }`}>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Etiqueta del conector
        </span>
        <input
          autoFocus value={val}
          onChange={(ev) => setVal(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") { onPatch({ label: val }); onClose(); }
            if (ev.key === "Escape") onClose();
          }}
          onBlur={() => { onPatch({ label: val }); onClose(); }}
          placeholder="Texto…"
          className={`w-48 px-2 py-1 rounded-lg outline-none text-sm ${
            isDark ? "bg-white/[0.04] text-slate-100" : "bg-slate-100 text-slate-800"
          }`}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Modal "Compartir diagrama" — propietario asigna usuario + permiso
 * ──────────────────────────────────────────────────────────────────────────── */
interface CompartidoRow {
  id: number;
  usuario: number;
  usuario_username: string;
  usuario_nombre: string;
  permiso: "ver" | "editar";
  compartido_por_username: string;
}

function ShareModal({
  diagramaId, isDark, onClose,
}: {
  diagramaId: string;
  isDark: boolean;
  onClose: () => void;
}) {
  const [comparts, setComparts] = useState<CompartidoRow[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: number; username: string; first_name?: string; last_name?: string }[]>([]);
  const [query, setQuery] = useState("");
  const [permiso, setPermiso] = useState<"ver" | "editar">("ver");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, us] = await Promise.all([
        api.listarCompartidos(diagramaId),
        api.getUsuarios(),
      ]);
      setComparts(Array.isArray(cs) ? cs : []);
      setUsuarios((us?.results || []) as any[]);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [diagramaId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtrar usuarios: por nombre/username, y excluir los que ya están compartidos.
  const sugerencias = useMemo(() => {
    const q = query.trim().toLowerCase();
    const yaCompartidos = new Set(comparts.map((c) => c.usuario));
    return usuarios
      .filter((u) => !yaCompartidos.has(u.id))
      .filter((u) => {
        if (!q) return true;
        const nombre = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        return u.username.toLowerCase().includes(q) || nombre.includes(q);
      })
      .slice(0, 6);
  }, [usuarios, comparts, query]);

  const compartirCon = async (userId: number) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.compartirDiagrama(diagramaId, { user_id: userId, permiso });
      setQuery("");
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSubmitting(false); }
  };

  const cambiarPermiso = async (compId: number, nuevo: "ver" | "editar") => {
    try {
      await api.cambiarPermisoCompartido(diagramaId, compId, nuevo);
      setComparts((p) => p.map((c) => c.id === compId ? { ...c, permiso: nuevo } : c));
    } catch (e) { setError((e as Error).message); }
  };

  const revocar = async (compId: number) => {
    if (!confirm("¿Quitar el acceso a este usuario?")) return;
    try {
      await api.revocarCompartido(diagramaId, compId);
      setComparts((p) => p.filter((c) => c.id !== compId));
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl ${
          isDark ? "bg-[#0F172A] border-white/[0.06] text-slate-100" : "bg-white border-slate-200 text-slate-800"
        }`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-black">Compartir diagrama</h2>
          </div>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100"
            }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Buscador + selector de permiso */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70">
              Agregar persona
            </label>
            <div className="flex gap-2">
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${
                isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"
              }`}>
                <Search className="w-4 h-4 opacity-60" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Usuario o nombre…"
                  className="flex-1 bg-transparent outline-none text-sm" />
              </div>
              <select value={permiso}
                onChange={(e) => setPermiso(e.target.value as "ver" | "editar")}
                className={`px-3 rounded-xl border text-sm font-bold outline-none ${
                  isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200"
                }`}>
                <option value="ver">Solo ver</option>
                <option value="editar">Puede editar</option>
              </select>
            </div>

            {/* Sugerencias */}
            {!loading && sugerencias.length > 0 && (
              <div className={`rounded-xl border overflow-hidden ${
                isDark ? "border-white/[0.06]" : "border-slate-200"
              }`}>
                {sugerencias.map((u) => {
                  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
                  return (
                    <button key={u.id}
                      disabled={submitting}
                      onClick={() => compartirCon(u.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                        isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                      }`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
                        {u.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{full}</div>
                        <div className="text-[11px] opacity-60 truncate">@{u.username}</div>
                      </div>
                      <Plus className="w-4 h-4 opacity-60" />
                    </button>
                  );
                })}
              </div>
            )}
            {!loading && query && sugerencias.length === 0 && (
              <p className="text-xs opacity-60 px-1">No se encontraron usuarios.</p>
            )}
            {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
          </div>

          {/* Lista de comparticiones actuales */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-70 inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Personas con acceso ({comparts.length})
            </label>
            {loading ? (
              <p className="text-sm opacity-60 py-4 text-center">Cargando…</p>
            ) : comparts.length === 0 ? (
              <p className="text-xs opacity-60 py-3 text-center">
                Aún no compartes con nadie. Búscalos arriba.
              </p>
            ) : (
              <div className={`rounded-xl border divide-y ${
                isDark ? "border-white/[0.06] divide-white/[0.04]" : "border-slate-200 divide-slate-100"
              }`}>
                {comparts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg,#1A73E8,#8B5CF6)" }}>
                      {c.usuario_username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{c.usuario_nombre}</div>
                      <div className="text-[11px] opacity-60 truncate">@{c.usuario_username}</div>
                    </div>
                    <select value={c.permiso}
                      onChange={(e) => cambiarPermiso(c.id, e.target.value as "ver" | "editar")}
                      className={`text-xs font-bold rounded-lg border px-2 py-1 outline-none ${
                        isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200"
                      }`}>
                      <option value="ver">Solo ver</option>
                      <option value="editar">Puede editar</option>
                    </select>
                    <button onClick={() => revocar(c.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"
                      }`}
                      title="Quitar acceso">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`px-5 py-3 border-t flex justify-end ${
          isDark ? "border-white/[0.06]" : "border-slate-200"
        }`}>
          <button onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-bold border ${
              isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200"
            }`}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Wrapper con ReactFlowProvider + panel de aprobacion (overlay flotante)
 * ──────────────────────────────────────────────────────────────────────────── */
import DiagramaApprovalPanel from "@/components/DiagramaApprovalPanel";
import { useUser } from "@/lib/UserContext";

export default function DiagramaEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useUser();
  return (
    <ReactFlowProvider>
      <EditorInner />
      {id && <DiagramaApprovalPanel diagramaId={id} currentUserId={user?.id ?? null} />}
    </ReactFlowProvider>
  );
}
