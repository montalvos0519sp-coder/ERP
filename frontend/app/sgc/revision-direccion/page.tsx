"use client";

// SGC · Revisión por la Dirección (ISO 9001 · 9.3) — asistente guiado.
// Pensado para que la dirección (sin saber de ISO) complete su revisión paso a
// paso, con lenguaje sencillo, semáforos del estado del SGC, preguntas guiadas
// y acuerdos asignables. La jerga de la norma queda como apoyo, no como barrera.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ClipboardList, Plus, RefreshCw, X, CalendarClock, Users, CheckCircle2,
  Trash2, Printer, AlertTriangle, ChevronRight, ChevronLeft, Lightbulb, CalendarPlus,
  HeartPulse, MessageCircleQuestion, Handshake, PartyPopper,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const aLista = (t?: string): string[] => (t || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
const NIVEL = { green: "#10B981", amber: "#F59E0B", red: "#F43F5E", gray: "#94A3B8" };
const CARA = { green: "", amber: "", red: "", gray: "" };

// Evalúa cada métrica del SGC con un semáforo y un veredicto en lenguaje simple.
function semaforo(s: any) {
  const ratio = (a: number, b: number) => (b ? a / b : 1);
  const tri = (ok: boolean, mid: boolean) => (ok ? "green" : mid ? "amber" : "red");
  return [
    { label: "Cumplimiento de la norma", value: `${s.cumplimiento_iso ?? 0}%`, nivel: tri(s.cumplimiento_iso >= 80, s.cumplimiento_iso >= 50), ok: "El sistema cumple bien la norma.", mal: "Aún faltan requisitos por cubrir." },
    { label: "Problemas sin resolver", value: `${s.nc_abiertas ?? 0}`, nivel: tri(s.nc_abiertas === 0, s.nc_abiertas <= 5), ok: "Hay pocos problemas abiertos.", mal: "Hay varios problemas por atender." },
    { label: "Objetivos de calidad", value: `${s.objetivos_logrados ?? 0}/${s.objetivos_total ?? 0}`, nivel: s.objetivos_total ? tri(ratio(s.objetivos_logrados, s.objetivos_total) >= 0.8, ratio(s.objetivos_logrados, s.objetivos_total) >= 0.5) : "gray", ok: "Se están logrando los objetivos.", mal: "Faltan objetivos por lograr." },
    { label: "Clientes contentos", value: s.satisfaccion != null ? `${s.satisfaccion}/5` : "N/D", nivel: s.satisfaccion == null ? "gray" : tri(s.satisfaccion >= 4, s.satisfaccion >= 3), ok: "Los clientes están satisfechos.", mal: "La satisfacción puede mejorar." },
    { label: "Indicadores en meta", value: `${s.kpis_en_meta ?? 0}/${s.kpis_total ?? 0}`, nivel: s.kpis_total ? tri(ratio(s.kpis_en_meta, s.kpis_total) >= 0.8, ratio(s.kpis_en_meta, s.kpis_total) >= 0.5) : "gray", ok: "La mayoría de metas se cumplen.", mal: "Varias metas no se cumplen." },
    { label: "Riesgos importantes", value: `${s.riesgos_altos ?? 0}`, nivel: tri(s.riesgos_altos === 0, s.riesgos_altos <= 2), ok: "Los riesgos están controlados.", mal: "Hay riesgos altos por tratar." },
    { label: "Avance de implementación", value: `${s.implementacion_pct ?? 0}%`, nivel: tri(s.implementacion_pct >= 80, s.implementacion_pct >= 40), ok: "El sistema avanza bien.", mal: "El sistema apenas comienza." },
    { label: "Auditorías hechas", value: `${s.auditorias_cerradas ?? 0}`, nivel: tri(s.auditorias_cerradas >= 1, true), ok: "Ya se hicieron auditorías.", mal: "Faltan auditorías por hacer." },
  ];
}

const resumenTexto = (s: any) =>
  `ESTADO DEL SGC (${s.fecha}):\n` +
  `• Cumplimiento ISO 9001: ${s.cumplimiento_iso}%.\n` +
  `• No conformidades: ${s.nc_abiertas} abiertas, ${s.nc_cerradas} cerradas (${s.nc_total} total).\n` +
  `• Auditorías: ${s.auditorias_cerradas} realizadas, ${s.auditorias_programadas} programadas.\n` +
  `• KPIs en meta: ${s.kpis_en_meta}/${s.kpis_total}.\n` +
  `• Riesgos altos/críticos: ${s.riesgos_altos}/${s.riesgos_total}.\n` +
  `• Satisfacción del cliente: ${s.satisfaccion ?? "N/D"}/5. Quejas abiertas: ${s.quejas_abiertas}.\n` +
  `• Avance de implementación: ${s.implementacion_pct}%. Objetivos logrados: ${s.objetivos_logrados}/${s.objetivos_total}.`;

export default function RevisionDireccionPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getRevisiones({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const ultima = items[0];
  const proxima = items.map((r) => r.proxima_fecha).filter(Boolean).sort()[0];
  const proximaVencida = proxima && new Date(proxima) < new Date();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-emerald-500 to-green-600"><ClipboardList className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Revisión por la Dirección</h1><p className={`text-sm ${theme.textSecondary}`}>La reunión donde los líderes revisan cómo va la calidad y deciden mejoras.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600"><Plus className="w-4 h-4" /> Nueva revisión</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${card}`}><div className="text-2xl font-black text-emerald-500">{items.length}</div><div className={`text-[11px] uppercase font-bold ${theme.textTertiary}`}>Revisiones realizadas</div></div>
        <div className={`rounded-2xl border p-4 ${card}`}><div className={`text-sm font-black ${theme.textPrimary}`}>{ultima?.fecha || "—"}</div><div className={`text-[11px] uppercase font-bold ${theme.textTertiary}`}>Última revisión</div></div>
        <div className={`rounded-2xl border p-4 ${card}`}><div className={`text-sm font-black flex items-center gap-1.5 ${proximaVencida ? "text-rose-500" : theme.textPrimary}`}>{proxima || "Sin programar"}{proximaVencida && <AlertTriangle className="w-4 h-4" />}</div><div className={`text-[11px] uppercase font-bold ${theme.textTertiary}`}>Próxima revisión</div></div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <p className={`font-bold ${theme.textPrimary}`}>Sin revisiones aún</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Te guiamos paso a paso para hacer tu primera revisión. No necesitas saber de ISO.</p>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600"><Plus className="w-4 h-4" /> Empezar mi primera revisión</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const part = aLista(r.participantes); const m = r.metricas || {};
            return (
              <button key={r.id} onClick={() => setEdit(r)} className={`w-full text-left rounded-2xl border p-4 transition hover:shadow-lg ${card}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0"><CalendarClock className="w-5 h-5" /></div>
                    <div>
                      <div className={`font-black ${theme.textPrimary}`}>{r.fecha || "Sin fecha"} {r.periodo && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 ml-1">{r.periodo}</span>}</div>
                      <div className={`text-[11px] ${theme.textTertiary} flex items-center gap-1 mt-0.5`}><Users className="w-3 h-3" /> {part.length} participantes {r.proxima_fecha && <>· próxima {r.proxima_fecha}</>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof m.cumplimiento_iso === "number" && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">ISO {m.cumplimiento_iso}%</span>}
                    {r.acuerdos_total > 0 && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.acuerdos_cerrados === r.acuerdos_total ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>✓ {r.acuerdos_cerrados}/{r.acuerdos_total} acuerdos</span>}
                  </div>
                </div>
                {part.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{part.slice(0, 6).map((p, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/[0.05] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{p}</span>)}{part.length > 6 && <span className={`text-[10px] ${theme.textTertiary}`}>+{part.length - 6}</span>}</div>}
              </button>
            );
          })}
        </div>
      )}

      {edit && <Asistente rev={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const PREGUNTAS = [
  { k: "cambios", icon: "", q: "¿Hubo cambios importantes?", ayuda: "En el negocio, clientes, leyes, personal o tecnología.", ph: "Ej.: abrimos una nueva sucursal; cambió un cliente grande…" },
  { k: "pendientes", icon: "", q: "¿Quedaron pendientes de la reunión anterior?", ayuda: "Acuerdos o tareas que no se terminaron.", ph: "Ej.: faltó capacitar al área de almacén…" },
  { k: "recursos", icon: "", q: "¿Tienen los recursos necesarios?", ayuda: "Personal, equipo, presupuesto, herramientas.", ph: "Ej.: necesitamos contratar un inspector de calidad…" },
  { k: "comentario_clientes", icon: "", q: "¿Algo que decir sobre los clientes?", ayuda: "Felicitaciones, quejas o comentarios recibidos.", ph: "Ej.: subieron las quejas por tiempos de entrega…" },
  { k: "mejoras", icon: "", q: "¿Qué oportunidades de mejora ven?", ayuda: "Ideas para hacer las cosas mejor.", ph: "Ej.: digitalizar el control de inventario…" },
];

const SUGERENCIAS = [
  "Reforzar el cierre de no conformidades",
  "Mejorar la satisfacción del cliente",
  "Acelerar la implementación del SGC",
  "Asignar más recursos al área de calidad",
  "Capacitar al personal en calidad",
  "Reconocer el buen desempeño del equipo",
];

function Asistente({ rev, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState<any>({ fecha: new Date().toISOString().slice(0, 10), periodo: "", participantes: "", entradas: "", conclusiones: "", proxima_fecha: "", ...rev });
  const [guia, setGuia] = useState<any>({});
  const [snap, setSnap] = useState<any>(null);
  const [chip, setChip] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const idRev = rev.id || f.id;

  useEffect(() => { if (empresaId) api.getSnapshotRevision(empresaId).then(setSnap).catch(() => {}); }, [empresaId]);

  const parts = aLista(f.participantes);
  const addChip = () => { const v = chip.trim(); if (!v) return; set("participantes", [...parts, v].join(", ")); setChip(""); };
  const rmChip = (i: number) => set("participantes", parts.filter((_, k) => k !== i).join(", "));

  // Narrativa de entradas compuesta de snapshot + respuestas guiadas.
  const entradasCompuestas = useMemo(() => {
    let t = "";
    if (snap) t += resumenTexto(snap) + "\n\n";
    const mapa: Record<string, string> = { cambios: "Cambios relevantes", pendientes: "Pendientes anteriores", recursos: "Recursos", comentario_clientes: "Sobre los clientes", mejoras: "Oportunidades de mejora" };
    for (const k of Object.keys(mapa)) if (guia[k]?.trim()) t += `${mapa[k]}: ${guia[k].trim()}\n`;
    return t.trim();
  }, [snap, guia]);

  const evals = snap ? semaforo(snap) : [];
  const reds = evals.filter((e) => e.nivel === "red").length;
  const greens = evals.filter((e) => e.nivel === "green").length;
  const salud = !snap ? { cara: "", txt: "Cargando…", color: NIVEL.gray } : reds > 0 ? { cara: "", txt: "Requiere atención", color: NIVEL.red } : greens >= evals.length / 2 ? { cara: "", txt: "Saludable", color: NIVEL.green } : { cara: "", txt: "Aceptable", color: NIVEL.amber };

  const masUnAno = () => { const d = new Date(f.fecha || Date.now()); d.setFullYear(d.getFullYear() + 1); set("proxima_fecha", d.toISOString().slice(0, 10)); };
  const addSug = (s: string) => set("conclusiones", (f.conclusiones ? f.conclusiones + "\n" : "") + "• " + s);

  // Guarda (crea o actualiza) y devuelve el id; usado al avanzar y al finalizar.
  const guardarDraft = async () => {
    const id = rev.id || f.id;
    const payload = { empresa: empresaId, fecha: f.fecha || null, periodo: f.periodo || "", participantes: f.participantes || "", entradas: entradasCompuestas || f.entradas || "", conclusiones: f.conclusiones || "", proxima_fecha: f.proxima_fecha || null };
    if (id) { await api.actualizarRevision(id, payload); return id; }
    const saved = await api.crearRevision(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); return saved?.id;
  };

  const siguiente = async () => {
    setBusy(true);
    try { if (paso === 3) await guardarDraft(); setPaso((p) => p + 1); }   // asegura id antes de acuerdos
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const finalizar = async () => { setBusy(true); try { await guardarDraft(); onSaved(); } catch (e) { alert((e as Error).message); } finally { setBusy(false); } };

  const imprimir = () => {
    const w = window.open("", "_blank", "width=820,height=900"); if (!w) return;
    w.document.write(`<html><head><title>Acta de Revisión por la Dirección</title><style>body{font-family:Arial,sans-serif;color:#1e293b;padding:32px;line-height:1.5}h1{color:#059669;font-size:20px}h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:2px solid #10b981;padding-bottom:4px;margin-top:22px}.meta{display:flex;gap:24px;font-size:13px;color:#475569}pre{white-space:pre-wrap;font-family:inherit;font-size:13px}</style></head><body><h1>Acta de Revisión por la Dirección</h1><div class="meta"><div><b>Fecha:</b> ${f.fecha || "—"}</div><div><b>Periodo:</b> ${f.periodo || "—"}</div><div><b>Próxima:</b> ${f.proxima_fecha || "—"}</div></div><h2>Participantes</h2><p>${parts.join(", ") || "—"}</p><h2>Estado del SGC y entradas</h2><pre>${(entradasCompuestas || "—").replace(/</g, "&lt;")}</pre><h2>Decisiones / conclusiones</h2><pre>${(f.conclusiones || "—").replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const PASOS = [
    { n: 1, t: "Datos", icon: Users },
    { n: 2, t: "¿Cómo vamos?", icon: HeartPulse },
    { n: 3, t: "Preguntas", icon: MessageCircleQuestion },
    { n: 4, t: "Acuerdos", icon: Handshake },
    { n: 5, t: "Listo", icon: PartyPopper },
  ];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-3xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        {/* Encabezado + stepper */}
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-700 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white">Revisión por la Dirección — paso {paso} de 5</h2>
            <div className="flex items-center gap-2">
              {idRev && <button onClick={imprimir} className="inline-flex items-center gap-1 text-xs font-bold text-white/90 bg-white/15 rounded-lg px-2.5 py-1 hover:bg-white/25"><Printer className="w-3.5 h-3.5" /> Imprimir</button>}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2.5">
            {PASOS.map((p, i) => (
              <div key={p.n} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => p.n < paso && setPaso(p.n)} className={`flex items-center gap-1.5 ${p.n <= paso ? "" : "opacity-50"} ${p.n < paso ? "cursor-pointer" : ""}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${p.n < paso ? "bg-white text-emerald-600" : p.n === paso ? "bg-white text-emerald-600 ring-2 ring-white/50" : "bg-white/20 text-white"}`}>{p.n < paso ? "✓" : p.n}</span>
                  <span className="text-[11px] font-bold text-white hidden sm:block">{p.t}</span>
                </button>
                {i < PASOS.length - 1 && <div className={`flex-1 h-0.5 mx-1.5 rounded ${p.n < paso ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-auto flex-1">
          {/* PASO 1 · DATOS */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className={`rounded-xl p-3 text-sm flex gap-2 ${isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-800"}`}>
                <Lightbulb className="w-5 h-5 shrink-0 text-emerald-500" /><span>Una <b>revisión por la dirección</b> es una reunión donde los líderes ven cómo va la calidad y deciden mejoras. Te guiamos paso a paso, sin tecnicismos.</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>¿Qué día es la reunión?</label><input type="date" className={inp} value={f.fecha || ""} onChange={(e) => set("fecha", e.target.value)} /></div>
                <div><label className={lbl}>¿Qué periodo revisan?</label><input className={inp} value={f.periodo} onChange={(e) => set("periodo", e.target.value)} placeholder="1er semestre 2026" /></div>
                <div><label className={lbl}>Próxima reunión</label><div className="flex gap-1"><input type="date" className={inp} value={f.proxima_fecha || ""} onChange={(e) => set("proxima_fecha", e.target.value)} /><button type="button" onClick={masUnAno} title="+1 año" className={`px-2 rounded-lg border shrink-0 ${isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-500"}`}><CalendarPlus className="w-4 h-4" /></button></div></div>
              </div>
              <div>
                <label className={`${lbl} flex items-center gap-1`}><Users className="w-3.5 h-3.5" /> ¿Quiénes participan?</label>
                <div className={`rounded-xl border p-3 flex flex-wrap gap-1.5 items-center ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  {parts.map((p, i) => <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">{p}<button type="button" onClick={() => rmChip(i)}><X className="w-2.5 h-2.5" /></button></span>)}
                  <input value={chip} onChange={(e) => setChip(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(); } }} placeholder="Escribe un nombre y Enter…" className={`flex-1 min-w-[140px] bg-transparent outline-none text-sm ${theme.textPrimary}`} />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 · CÓMO VAMOS (semáforos) */}
          {paso === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-5xl">{salud.cara}</div>
                <div>
                  <div className={`text-[11px] uppercase font-bold ${theme.textTertiary}`}>El sistema de calidad está</div>
                  <div className="text-xl font-black" style={{ color: salud.color }}>{salud.txt}</div>
                  <div className={`text-xs ${theme.textSecondary}`}>Mira el semáforo de cada área abajo. Verde = bien · Amarillo = atención · Rojo = mejorar.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {evals.map((e) => (
                  <div key={e.label} className={`rounded-xl border p-3 flex items-center gap-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-white"}`}>
                    <span className="text-xl">{(CARA as any)[e.nivel]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2"><span className={`text-sm font-bold ${theme.textPrimary}`}>{e.label}</span><span className="text-base font-black tabular-nums" style={{ color: (NIVEL as any)[e.nivel] }}>{e.value}</span></div>
                      <div className={`text-[11px] ${theme.textTertiary}`}>{e.nivel === "green" ? e.ok : e.nivel === "gray" ? "Sin datos suficientes." : e.mal}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className={`text-[11px] ${theme.textTertiary}`}>Este estado se guarda automáticamente en el acta como evidencia (entrada 9.3.2 de la norma).</p>
            </div>
          )}

          {/* PASO 3 · PREGUNTAS GUIADAS */}
          {paso === 3 && (
            <div className="space-y-3">
              <p className={`text-sm ${theme.textSecondary}`}>Responde con tus palabras. Si algo no aplica, déjalo en blanco.</p>
              {PREGUNTAS.map((p) => (
                <div key={p.k} className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  <label className="flex items-center gap-2 mb-1"><span className="text-lg">{p.icon}</span><span className={`text-sm font-bold ${theme.textPrimary}`}>{p.q}</span></label>
                  <p className={`text-[11px] mb-1.5 ${theme.textTertiary}`}>{p.ayuda}</p>
                  <textarea rows={2} className={inp} value={guia[p.k] || ""} onChange={(e) => setGuia((g: any) => ({ ...g, [p.k]: e.target.value }))} placeholder={p.ph} />
                </div>
              ))}
            </div>
          )}

          {/* PASO 4 · DECISIONES + ACUERDOS */}
          {paso === 4 && (
            <div className="space-y-4">
              <div>
                <label className={`${lbl} flex items-center gap-1`}><Lightbulb className="w-3.5 h-3.5 text-amber-400" /> ¿Qué decidimos hacer para mejorar?</label>
                <textarea rows={3} className={inp} value={f.conclusiones} onChange={(e) => set("conclusiones", e.target.value)} placeholder="Escribe las decisiones de la dirección…" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGERENCIAS.map((s) => <button key={s} type="button" onClick={() => addSug(s)} className={`text-[11px] px-2.5 py-1 rounded-full border ${isDark ? "border-white/10 text-slate-300 hover:bg-emerald-500/15 hover:border-emerald-500/40" : "border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300"}`}>+ {s}</button>)}
                </div>
              </div>
              {idRev
                ? <AcuerdosPanel revisionId={idRev} isDark={isDark} theme={theme} />
                : <p className={`text-[11px] ${theme.textTertiary}`}>Continúa para registrar acuerdos.</p>}
            </div>
          )}

          {/* PASO 5 · LISTO */}
          {paso === 5 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl"></div>
              <div><h3 className={`text-lg font-black ${theme.textPrimary}`}>¡Tu revisión está lista!</h3><p className={`text-sm ${theme.textSecondary}`}>Guarda el acta. Los acuerdos llegarán a cada responsable en su bandeja “Mis pendientes”.</p></div>
              <div className={`rounded-xl border p-4 text-left ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className={theme.textTertiary}>Fecha:</span> <b className={theme.textPrimary}>{f.fecha || "—"}</b></div>
                  <div><span className={theme.textTertiary}>Participantes:</span> <b className={theme.textPrimary}>{parts.length}</b></div>
                  <div><span className={theme.textTertiary}>Estado del SGC:</span> <b style={{ color: salud.color }}>{salud.txt}</b></div>
                  <div><span className={theme.textTertiary}>Próxima:</span> <b className={theme.textPrimary}>{f.proxima_fecha || "Sin programar"}</b></div>
                </div>
                {idRev && <button onClick={imprimir} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400"><Printer className="w-3.5 h-3.5" /> Imprimir / exportar acta</button>}
              </div>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={() => paso > 1 ? setPaso(paso - 1) : onClose()} className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>{paso > 1 ? <><ChevronLeft className="w-4 h-4" /> Atrás</> : "Cancelar"}</button>
          {paso < 5
            ? <button onClick={siguiente} disabled={busy} className="inline-flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-green-600">{busy ? "Guardando…" : <>Siguiente <ChevronRight className="w-4 h-4" /></>}</button>
            : <button onClick={finalizar} disabled={busy} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-green-600"><CheckCircle2 className="w-4 h-4" /> {busy ? "Guardando…" : "Guardar acta"}</button>}
        </div>
      </div>
    </div>
  );
}

const AC_EST = [["PENDIENTE", "Pendiente"], ["EN_PROCESO", "En proceso"], ["CERRADO", "Cerrado"]];
const AC_COLOR: Record<string, string> = {
  PENDIENTE: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  EN_PROCESO: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  CERRADO: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

function AcuerdosPanel({ revisionId, isDark, theme }: any) {
  const [acuerdos, setAcuerdos] = useState<any[]>([]);
  const [nuevo, setNuevo] = useState<any | null>(null);
  const inp = `w-full px-2 py-1.5 rounded-md border text-xs outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;

  const load = useCallback(() => { if (revisionId) api.getAcuerdosRevision(revisionId).then((r) => setAcuerdos(r?.results || [])).catch(() => {}); }, [revisionId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!nuevo?.descripcion?.trim()) { alert("Escribe el acuerdo."); return; }
    try { await api.crearAcuerdoRevision({ revision: revisionId, descripcion: nuevo.descripcion, responsable_user: nuevo.responsable_user || null, fecha_compromiso: nuevo.fecha_compromiso || null, estado: "PENDIENTE" }); setNuevo(null); load(); }
    catch (e) { alert((e as Error).message); }
  };
  const upd = async (a: any, patch: any) => { try { await api.actualizarAcuerdoRevision(a.id, patch); load(); } catch (e) { alert((e as Error).message); } };
  const del = async (a: any) => { if (!confirm("¿Eliminar acuerdo?")) return; try { await api.eliminarAcuerdoRevision(a.id); load(); } catch { /* */ } };
  const cerrados = acuerdos.filter((a) => a.estado === "CERRADO").length;

  return (
    <div className={sec}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1"><Handshake className="w-3.5 h-3.5" /> Acuerdos: ¿quién hace qué? ({cerrados}/{acuerdos.length})</span>
        <button onClick={() => setNuevo({})} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400"><Plus className="w-3.5 h-3.5" /> Agregar</button>
      </div>
      <div className="space-y-2">
        {acuerdos.length === 0 && !nuevo && <p className={`text-xs ${theme.textTertiary}`}>Anota cada decisión con un responsable y una fecha. Le llegará a su bandeja automáticamente.</p>}
        {acuerdos.map((a) => (
          <div key={a.id} className={`rounded-lg border p-2.5 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start gap-2">
              <span className={`flex-1 text-sm ${a.estado === "CERRADO" ? `line-through ${theme.textTertiary}` : theme.textPrimary}`}>{a.descripcion}</span>
              <button onClick={() => del(a)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
              {a.responsable_nombre && <span className="inline-flex items-center gap-1"><Avatar nombre={a.responsable_nombre} id={a.responsable_user} size={16} /><span className={theme.textTertiary}>{a.responsable_nombre}</span></span>}
              {a.fecha_compromiso && <span className={theme.textTertiary}>{a.fecha_compromiso}</span>}
              <div className="ml-auto flex gap-1">{AC_EST.map(([v, l]) => <button key={v} onClick={() => upd(a, { estado: v })} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${a.estado === v ? AC_COLOR[v] : isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>{l}</button>)}</div>
            </div>
          </div>
        ))}
        {nuevo && (
          <div className={`rounded-lg border p-2.5 space-y-2 ${isDark ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-emerald-200 bg-emerald-50/40"}`}>
            <input className={inp} placeholder="¿Qué se acordó hacer?" value={nuevo.descripcion || ""} onChange={(e) => setNuevo((p: any) => ({ ...p, descripcion: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <SelectorUsuario label="¿Quién es responsable?" value={nuevo.responsable_user} onChange={(id) => setNuevo((p: any) => ({ ...p, responsable_user: id }))} />
              <div><label className={`text-xs font-bold mb-1 block ${theme.textSecondary}`}>¿Para cuándo?</label><input type="date" className={inp} value={nuevo.fecha_compromiso || ""} onChange={(e) => setNuevo((p: any) => ({ ...p, fecha_compromiso: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2"><button onClick={() => setNuevo(null)} className={`text-xs font-bold px-3 py-1.5 ${theme.textSecondary}`}>Cancelar</button><button onClick={add} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-emerald-500 to-green-600">Agregar</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
