"use client";

// SGC · Capacitación (7.2) — visual e interactivo.
// Tarjetas con estado y vencimiento, KPIs, filtros, responsable real,
// participantes en chips y colaboración por curso.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, GraduationCap, Plus, RefreshCw, X, Search, Users,
  CheckCircle2, AlertTriangle, CalendarClock, Award,
} from "lucide-react";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const ESTADOS = [["PROGRAMADA", "Programada"], ["IMPARTIDA", "Impartida"], ["VENCIDA", "Vencida"]];
const EST_COLOR: Record<string, string> = { PROGRAMADA: "bg-sky-500/15 text-sky-500 border-sky-500/30", IMPARTIDA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", VENCIDA: "bg-rose-500/15 text-rose-500 border-rose-500/30" };
const aLista = (t?: string): string[] => (t || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

export default function CapacitacionPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("TODAS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getCapacitaciones({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const cal = items.filter((c) => c.calificacion != null).map((c) => Number(c.calificacion));
    return {
      total: items.length,
      programadas: items.filter((c) => c.estado === "PROGRAMADA").length,
      impartidas: items.filter((c) => c.estado === "IMPARTIDA").length,
      vencidas: items.filter((c) => c.estado === "VENCIDA").length,
      calif: cal.length ? Math.round(cal.reduce((a, b) => a + b, 0) / cal.length) : 0,
    };
  }, [items]);

  const visibles = items.filter((c) => {
    if (q && !`${c.curso} ${c.instructor} ${c.participantes}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filtro !== "TODAS" && c.estado !== filtro) return false;
    return true;
  });

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-blue-500 to-indigo-600"><GraduationCap className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Gestión de Capacitación</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 7.2 — cursos, evaluaciones y vencimientos.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => exportCSV("capacitaciones", ["Curso", "Instructor", "Participantes", "Fecha", "Vence", "Calif", "Estado"], items.map((c) => [c.curso, c.instructor, c.participantes, c.fecha, c.fecha_vencimiento, c.calificacion, c.estado]))}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600"><Plus className="w-4 h-4" /> Nuevo curso</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI icon={GraduationCap} color="#3B82F6" label="Cursos" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI icon={CalendarClock} color="#0EA5E9" label="Programados" value={stats.programadas} isDark={isDarkMode} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Impartidos" value={stats.impartidas} isDark={isDarkMode} theme={theme} />
        <KPI icon={AlertTriangle} color="#F43F5E" label="Vencidos" value={stats.vencidas} isDark={isDarkMode} theme={theme} />
        <KPI icon={Award} color="#8B5CF6" label="Calif. prom." value={stats.calif || "—"} isDark={isDarkMode} theme={theme} />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[["TODAS", "Todas"], ...ESTADOS].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-blue-400" />
          <p className={`font-bold ${theme.textPrimary}`}>{q || filtro !== "TODAS" ? "Sin resultados" : "Sin capacitaciones"}</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Programa cursos para desarrollar la competencia del personal.</p>
          {!q && filtro === "TODAS" && <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600"><Plus className="w-4 h-4" /> Programar primer curso</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibles.map((c) => {
            const part = aLista(c.participantes);
            const vencido = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date();
            return (
              <button key={c.id} onClick={() => setEdit(c)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card} ${vencido && c.estado !== "VENCIDA" ? "ring-1 ring-rose-500/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-black ${theme.textPrimary}`}>{c.curso}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[c.estado]}`}>{ESTADOS.find(([v]) => v === c.estado)?.[1]}</span>
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-2 flex-wrap ${theme.textTertiary}`}>
                  {c.instructor && <span>{c.instructor}</span>}
                  {c.fecha && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {c.fecha}</span>}
                  {c.calificacion != null && <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold"><Award className="w-3 h-3" /> {c.calificacion}</span>}
                </div>
                {part.length > 0 && <div className="flex items-center gap-1 mt-2 flex-wrap"><Users className={`w-3 h-3 ${theme.textTertiary}`} />{part.slice(0, 4).map((p, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/[0.05] text-slate-400" : "bg-slate-100 text-slate-500"}`}>{p}</span>)}{part.length > 4 && <span className={`text-[10px] ${theme.textTertiary}`}>+{part.length - 4}</span>}</div>}
                {c.fecha_vencimiento && <div className={`text-[11px] mt-2 ${vencido ? "text-rose-400 font-bold" : theme.textTertiary}`}>Vence: {c.fecha_vencimiento}{vencido ? " recapacitar" : ""}</div>}
              </button>
            );
          })}
        </div>
      )}
      {edit && <CapModal c={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

function CapModal({ c, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ curso: "", instructor: "", participantes: "", responsable_user: null, fecha: "", vigencia_meses: 12, estado: "PROGRAMADA", calificacion: "", ...c });
  const [chip, setChip] = useState("");
  const [busy, setBusy] = useState(false);
  const idCap = c.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const parts = aLista(f.participantes);
  const addChip = () => { const v = chip.trim(); if (!v) return; set("participantes", [...parts, v].join(", ")); setChip(""); };
  const rmChip = (i: number) => set("participantes", parts.filter((_, k) => k !== i).join(", "));
  const vence = (() => { if (!f.fecha) return ""; const d = new Date(f.fecha); d.setMonth(d.getMonth() + (Number(f.vigencia_meses) || 12)); return d.toISOString().slice(0, 10); })();
  const vencido = vence && new Date(vence) < new Date();
  const guardar = async () => {
    if (!f.curso?.trim()) { alert("Curso requerido."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, curso: f.curso, instructor: f.instructor || "", participantes: f.participantes || "", responsable_user: f.responsable_user || null, fecha: f.fecha || null, vigencia_meses: Number(f.vigencia_meses) || 12, fecha_vencimiento: vence || null, estado: vencido && f.estado === "IMPARTIDA" ? "VENCIDA" : f.estado, calificacion: f.calificacion ? Number(f.calificacion) : null };
    try {
      if (idCap) { await api.actualizarCapacitacion(idCap, payload); onSaved(); }
      else { const saved = await api.crearCapacitacion(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><GraduationCap className="w-5 h-5" /> {idCap ? f.curso || "Curso" : "Nuevo curso"}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div><label className={lbl}>Curso *</label><input className={inp} value={f.curso} onChange={(e) => set("curso", e.target.value)} placeholder="Inducción ISO 9001, Auditor interno…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Instructor</label><input className={inp} value={f.instructor} onChange={(e) => set("instructor", e.target.value)} /></div>
            <SelectorUsuario label="Responsable" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
          </div>
          <div>
            <label className={`${lbl} flex items-center gap-1`}><Users className="w-3.5 h-3.5" /> Participantes</label>
            <div className={`rounded-xl border p-2 flex flex-wrap gap-1.5 items-center ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
              {parts.map((p, i) => <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">{p}<button type="button" onClick={() => rmChip(i)}><X className="w-2.5 h-2.5" /></button></span>)}
              <input value={chip} onChange={(e) => setChip(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(); } }} placeholder="+ nombre o área (Enter)" className={`flex-1 min-w-[130px] bg-transparent outline-none text-sm ${theme.textPrimary}`} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className={lbl}>Fecha</label><input type="date" className={inp} value={f.fecha || ""} onChange={(e) => set("fecha", e.target.value)} /></div>
            <div><label className={lbl}>Vigencia (m)</label><input type="number" className={inp} value={f.vigencia_meses} onChange={(e) => set("vigencia_meses", e.target.value)} /></div>
            <div><label className={lbl}>Calif.</label><input type="number" className={inp} value={f.calificacion ?? ""} onChange={(e) => set("calificacion", e.target.value)} /></div>
            <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <p className={`text-[11px] ${vencido ? "text-rose-500 font-bold" : theme.textTertiary}`}>{vence ? <>Vence el <b>{vence}</b> (fecha + {f.vigencia_meses} meses).{vencido ? " requiere recapacitación." : ""}</> : "Define la fecha para calcular el vencimiento."}</p>
          {idCap && <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="capacitacion" objetoId={idCap} /></div>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-blue-500 to-indigo-600">{busy ? "Guardando…" : (idCap ? "Guardar" : "Guardar y continuar")}</button></div>
      </div>
    </div>
  );
}
