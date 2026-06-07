"use client";

// SGC · Capacitación (7.2) — visual e interactivo.
// Tarjetas con estado y vencimiento, KPIs, filtros, responsable real,
// participantes en chips y colaboración por curso.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, GraduationCap, Plus, RefreshCw, X, Search, Users,
  CheckCircle2, AlertTriangle, CalendarClock, Award, Check,
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
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [verPend, setVerPend] = useState(false);

  const cargarPendientes = useCallback(() => {
    if (!empresaActivaId) return;
    api.getPendientesRecapacitacion(empresaActivaId).then((r) => setPendientes(r?.resultados || [])).catch(() => setPendientes([]));
  }, [empresaActivaId]);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getCapacitaciones({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
    cargarPendientes();
  }, [empresaActivaId, cargarPendientes]);
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
          {pendientes.length > 0 && (
            <button onClick={() => setVerPend(true)} className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-md">
              <AlertTriangle className="w-4 h-4" /> Recapacitación
              <span className="ml-0.5 px-1.5 rounded-full bg-white/25 text-[11px]">{pendientes.length}</span>
            </button>
          )}
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => exportCSV("capacitaciones", ["Curso", "Instructor", "Fecha", "Vence", "Estado"], items.map((c) => [c.curso, c.instructor, c.fecha, c.fecha_vencimiento, c.estado]))}
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
            const r = c.resumen || { total: 0, aprobados: 0, asistieron: 0, con_evidencia: 0, promedio: null };
            const vencido = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date();
            const pct = r.total ? Math.round(((c.requiere_calificacion ? r.aprobados : r.asistieron) / r.total) * 100) : 0;
            return (
              <button key={c.id} onClick={() => setEdit(c)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card} ${vencido && c.estado !== "VENCIDA" ? "ring-1 ring-rose-500/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-black ${theme.textPrimary}`}>{c.curso}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[c.estado]}`}>{ESTADOS.find(([v]) => v === c.estado)?.[1]}</span>
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-2 flex-wrap ${theme.textTertiary}`}>
                  {c.instructor && <span>{c.instructor}</span>}
                  {c.fecha && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {c.fecha}</span>}
                  {!c.requiere_calificacion && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400">Solo asistencia</span>}
                  {c.requiere_calificacion && r.promedio != null && <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold"><Award className="w-3 h-3" /> {r.promedio} prom.</span>}
                </div>
                {/* Participantes + progreso */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-bold inline-flex items-center gap-1 ${theme.textSecondary}`}><Users className="w-3 h-3" /> {r.total} participante{r.total !== 1 ? "s" : ""}</span>
                    <span className={`text-[11px] font-bold ${theme.textTertiary}`}>{c.requiere_calificacion ? `${r.aprobados} aprob.` : `${r.asistieron} asist.`}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  {r.con_evidencia > 0 && <div className={`text-[10px] mt-1 inline-flex items-center gap-1 ${theme.textTertiary}`}><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {r.con_evidencia}/{r.total} con evidencia</div>}
                </div>
                {c.fecha_vencimiento && <div className={`text-[11px] mt-2 ${vencido ? "text-rose-400 font-bold" : theme.textTertiary}`}>Vence: {c.fecha_vencimiento}{vencido ? " recapacitar" : ""}</div>}
              </button>
            );
          })}
        </div>
      )}
      {edit && <CapModal c={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {verPend && <PendientesModal pendientes={pendientes} isDark={isDarkMode} theme={theme} onClose={() => setVerPend(false)} onReinscrito={() => { cargarPendientes(); load(); }} onAbrirCurso={(capId: number) => { const c = items.find((x) => x.id === capId); if (c) { setVerPend(false); setEdit(c); } }} />}
    </div>
  );
}

// Lista global de reprobados que deben recapacitar. Se reprograman a una nueva
// edición del mismo curso (sesión de recuperación).
function PendientesModal({ pendientes, isDark, theme, onClose, onReinscrito, onAbrirCurso }: any) {
  const [fechas, setFechas] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  // Agrupar por capacitación de origen (para reprogramar cada edición).
  const porCap: Record<number, { curso: string; lista: any[] }> = {};
  pendientes.forEach((p: any) => {
    if (!porCap[p.capacitacion_id]) porCap[p.capacitacion_id] = { curso: p.curso, lista: [] };
    porCap[p.capacitacion_id].lista.push(p);
  });

  const reprogramar = async (capId: number, curso: string, n: number) => {
    const fecha = fechas[capId] || null;
    if (!confirm(`¿Crear una nueva edición de "${curso}" y mover ahí a ${n} reprobado(s) para que la presenten de nuevo?`)) return;
    setBusy(capId);
    try {
      const r = await api.reprogramarRecuperacion(capId, { fecha, participantes: porCap[capId].lista.map((p) => p.id) });
      onReinscrito();
      alert(`Nueva edición creada: "${curso}" con ${r.movidos} participante(s) inscrito(s).`);
    } catch (e) { alert((e as Error).message); } finally { setBusy(null); }
  };

  const inp = `px-2 py-1 rounded-lg border text-xs outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[90vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Pendientes de recapacitación <span className="px-1.5 rounded-full bg-white/25 text-xs">{pendientes.length}</span></h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          <p className={`text-sm ${theme.textSecondary}`}>Estas personas <b>no aprobaron</b>. Al <b>reprogramar la recuperación</b>, se crea una nueva edición del curso y se mueven ahí los reprobados (con un intento adicional) para que lo presenten de nuevo, hasta aprobar.</p>
          {pendientes.length === 0 ? (
            <div className={`text-center py-8 ${theme.textTertiary}`}><CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" /><p className="text-sm font-bold">¡Nadie pendiente! Todos aprobaron.</p></div>
          ) : Object.entries(porCap).map(([capId, { curso, lista }]) => (
            <div key={capId} className={`rounded-2xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className={`text-sm font-black inline-flex items-center gap-1.5 ${theme.textPrimary}`}><GraduationCap className="w-4 h-4 text-rose-500" /> {curso} <span className={`text-[11px] font-bold ${theme.textTertiary}`}>· {lista.length} reprobado(s)</span></h3>
                <button onClick={() => onAbrirCurso(Number(capId))} className="text-[11px] font-bold text-blue-500 hover:text-blue-400">Ver edición origen →</button>
              </div>
              <div className="space-y-1.5">
                {lista.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${isDark ? "border-white/[0.06] bg-[#0F172A]/40" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar nombre={p.nombre} id={p.empleado || p.id} size={26} />
                      <div className="min-w-0">
                        <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>{p.nombre}</div>
                        <div className={`text-[10px] ${theme.textTertiary}`}>
                          {p.empleado ? `Empleado · ${p.empleado_numero || ""}` : "Externo"}
                          {p.calificacion != null ? ` · calif. ${p.calificacion} (mín. ${p.calificacion_minima})` : " · ausente"}
                          {(p.intentos || 1) > 1 ? ` · ${p.intentos} intentos` : ""}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${p.estado === "AUSENTE" ? "bg-amber-500/15 text-amber-600" : "bg-rose-500/15 text-rose-500"}`}>{p.estado_display}</span>
                  </div>
                ))}
              </div>
              {/* Acción de reprogramación por curso */}
              <div className="flex items-center justify-end gap-2 mt-2.5 flex-wrap">
                <label className={`text-[11px] font-bold ${theme.textSecondary}`}>Fecha del nuevo curso:</label>
                <input type="date" value={fechas[Number(capId)] || ""} onChange={(e) => setFechas((f) => ({ ...f, [Number(capId)]: e.target.value }))} className={inp} />
                <button onClick={() => reprogramar(Number(capId), curso, lista.length)} disabled={busy === Number(capId)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-40 bg-gradient-to-r from-rose-600 to-red-600 hover:shadow-md">
                  <RefreshCw className={`w-3.5 h-3.5 ${busy === Number(capId) ? "animate-spin" : ""}`} /> {busy === Number(capId) ? "Creando…" : "Reprogramar recuperación"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
        </div>
      </div>
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
  const [f, setF] = useState<any>({ curso: "", descripcion: "", instructor: "", responsable_user: null, fecha: "", vigencia_meses: 12, estado: "PROGRAMADA", requiere_calificacion: true, calificacion_minima: 70, ...c });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"datos" | "participantes">("datos");
  const idCap = c.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const vence = (() => { if (!f.fecha) return ""; const d = new Date(f.fecha); d.setMonth(d.getMonth() + (Number(f.vigencia_meses) || 12)); return d.toISOString().slice(0, 10); })();
  const vencido = vence && new Date(vence) < new Date();

  const guardar = async (continuar?: boolean) => {
    if (!f.curso?.trim()) { alert("Curso requerido."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, curso: f.curso, descripcion: f.descripcion || "", instructor: f.instructor || "",
      responsable_user: f.responsable_user || null, fecha: f.fecha || null,
      vigencia_meses: Number(f.vigencia_meses) || 12, fecha_vencimiento: vence || null,
      estado: vencido && f.estado === "IMPARTIDA" ? "VENCIDA" : f.estado,
      requiere_calificacion: !!f.requiere_calificacion,
      calificacion_minima: Number(f.calificacion_minima) || 0,
    };
    try {
      if (idCap) { await api.actualizarCapacitacion(idCap, payload); if (!continuar) { onSaved(); return; } }
      else { const saved = await api.crearCapacitacion(payload); if (saved?.id) { setF((p: any) => ({ ...p, id: saved.id })); setTab("participantes"); } }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><GraduationCap className="w-5 h-5" /> {idCap ? f.curso || "Curso" : "Nuevo curso"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-4 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <button onClick={() => setTab("datos")} className={`px-3 py-2.5 text-sm font-bold border-b-2 -mb-px ${tab === "datos" ? "border-blue-500 text-blue-500" : `border-transparent ${theme.textTertiary}`}`}>Datos del curso</button>
          <button onClick={() => idCap && setTab("participantes")} disabled={!idCap} className={`px-3 py-2.5 text-sm font-bold border-b-2 -mb-px inline-flex items-center gap-1.5 ${tab === "participantes" ? "border-blue-500 text-blue-500" : `border-transparent ${theme.textTertiary}`} ${!idCap ? "opacity-40 cursor-not-allowed" : ""}`}>
            <Users className="w-4 h-4" /> Participantes {!idCap && <span className="text-[10px]">(guarda primero)</span>}
          </button>
        </div>

        <div className="p-5 overflow-auto flex-1">
          {tab === "datos" ? (
            <div className="space-y-3">
              <div><label className={lbl}>Curso *</label><input className={inp} value={f.curso} onChange={(e) => set("curso", e.target.value)} placeholder="Inducción ISO 9001, Auditor interno…" /></div>
              <div><label className={lbl}>Descripción / objetivo</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿De qué trata y a qué proceso aplica?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Instructor</label><input className={inp} value={f.instructor} onChange={(e) => set("instructor", e.target.value)} /></div>
                <SelectorUsuario label="Responsable" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Fecha</label><input type="date" className={inp} value={f.fecha || ""} onChange={(e) => set("fecha", e.target.value)} /></div>
                <div><label className={lbl}>Vigencia (meses)</label><input type="number" className={inp} value={f.vigencia_meses} onChange={(e) => set("vigencia_meses", e.target.value)} /></div>
                <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              </div>
              {/* Toggle: ¿requiere calificación? */}
              <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                <button type="button" onClick={() => set("requiere_calificacion", !f.requiere_calificacion)} className="w-full flex items-center justify-between gap-3 text-left">
                  <div>
                    <div className={`text-sm font-bold ${theme.textPrimary}`}>{f.requiere_calificacion ? "Requiere calificación" : "Solo asistencia (sin calificación)"}</div>
                    <div className={`text-[11px] ${theme.textTertiary}`}>{f.requiere_calificacion ? "Cada participante recibe una nota; el sistema marca aprobado/no aprobado." : "Solo se registra el nombre, la asistencia y la evidencia. Sin nota."}</div>
                  </div>
                  <span className={`w-10 h-6 rounded-full p-0.5 shrink-0 transition ${f.requiere_calificacion ? "bg-blue-500" : "bg-slate-400"}`}><span className={`block w-5 h-5 rounded-full bg-white transition ${f.requiere_calificacion ? "translate-x-4" : ""}`} /></span>
                </button>
                {f.requiere_calificacion && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className={`text-xs font-bold ${theme.textSecondary}`}>Calificación mínima para aprobar:</label>
                    <input type="number" className={`${inp} w-20 py-1`} value={f.calificacion_minima} onChange={(e) => set("calificacion_minima", e.target.value)} />
                  </div>
                )}
              </div>
              <p className={`text-[11px] ${vencido ? "text-rose-500 font-bold" : theme.textTertiary}`}>{vence ? <>Vence el <b>{vence}</b> (fecha + {f.vigencia_meses} meses).{vencido ? " requiere recapacitación." : ""}</> : "Define la fecha para calcular el vencimiento."}</p>
              {idCap && <div className="pt-1"><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="capacitacion" objetoId={idCap} /></div>}
            </div>
          ) : (
            <PanelParticipantes capId={idCap} empresaId={empresaId} requiereCalif={!!f.requiere_calificacion} califMinima={Number(f.calificacion_minima) || 0} isDark={isDark} theme={theme} />
          )}
        </div>

        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={() => guardar(false)} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-blue-500 to-indigo-600">{busy ? "Guardando…" : (idCap ? "Guardar" : "Guardar y agregar participantes")}</button>
        </div>
      </div>
    </div>
  );
}

// Panel de gestión individual de participantes (empleado RH o nombre libre).
function PanelParticipantes({ capId, empresaId, requiereCalif, califMinima, isDark, theme }: any) {
  const [lista, setLista] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [nombreLibre, setNombreLibre] = useState("");

  const cargar = useCallback(() => {
    setCargando(true);
    api.getParticipantesCap(capId).then((r) => setLista(r?.results || [])).catch(() => setLista([])).finally(() => setCargando(false));
  }, [capId]);
  useEffect(() => {
    cargar();
    api.getEmpleados({ empresa: String(empresaId), activo: "true", page_size: "300" }).then((r) => setEmpleados(r.results || [])).catch(() => setEmpleados([]));
  }, [cargar, empresaId]);

  const yaInscritos = new Set(lista.filter((p) => p.empleado).map((p) => p.empleado));
  const empDisponibles = empleados.filter((e) => !yaInscritos.has(e.id) &&
    (!buscar || `${e.nombre} ${e.apellido} ${e.numero_empleado}`.toLowerCase().includes(buscar.toLowerCase())));

  const agregarEmpleado = async (emp: any) => {
    try { await api.crearParticipanteCap({ capacitacion: capId, empleado: emp.id, estado: "INSCRITO" }); cargar(); }
    catch (e) { alert((e as Error).message); }
  };
  const agregarLibre = async () => {
    if (!nombreLibre.trim()) return;
    try { await api.crearParticipanteCap({ capacitacion: capId, nombre: nombreLibre.trim(), estado: "INSCRITO" }); setNombreLibre(""); cargar(); }
    catch (e) { alert((e as Error).message); }
  };

  const inp = `px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const aprobados = lista.filter((p) => p.estado === "APROBADO").length;
  const conEvidencia = lista.filter((p) => p.evidencia_url).length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Participantes" value={lista.length} color="#3B82F6" isDark={isDark} theme={theme} />
        {requiereCalif
          ? <MiniStat label="Aprobados" value={`${aprobados}/${lista.length}`} color="#10B981" isDark={isDark} theme={theme} />
          : <MiniStat label="Asistieron" value={lista.filter((p) => p.estado === "ASISTIO").length} color="#10B981" isDark={isDark} theme={theme} />}
        <MiniStat label="Con evidencia" value={`${conEvidencia}/${lista.length}`} color="#F59E0B" isDark={isDark} theme={theme} />
      </div>

      {/* Agregar */}
      <div className={`rounded-xl border p-3 space-y-2 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
        <div className={`text-[11px] font-black uppercase tracking-wider ${theme.textTertiary}`}>Agregar participante</div>
        {/* Empleado de RH */}
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar empleado de RH…" className={`${inp} pl-8 py-1.5 text-xs w-full`} />
        </div>
        {buscar && (
          <div className={`rounded-lg border max-h-32 overflow-auto divide-y ${isDark ? "border-white/[0.06] divide-white/[0.04]" : "border-slate-200 divide-slate-100"}`}>
            {empDisponibles.length === 0 ? <p className={`text-xs text-center py-2 ${theme.textTertiary}`}>Sin empleados disponibles.</p>
              : empDisponibles.slice(0, 8).map((e) => (
                <button key={e.id} type="button" onClick={() => agregarEmpleado(e)} className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"}`}>
                  <span className={`truncate ${theme.textPrimary}`}>{e.nombre} {e.apellido}</span>
                  <span className={`text-[10px] font-mono ${theme.textTertiary}`}>{e.numero_empleado}</span>
                </button>
              ))}
          </div>
        )}
        {/* Nombre libre (externo) */}
        <div className="flex gap-2">
          <input value={nombreLibre} onChange={(e) => setNombreLibre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarLibre(); } }} placeholder="…o escribe un nombre (externo / sin usuario)" className={`${inp} flex-1 py-1.5 text-xs`} />
          <button onClick={agregarLibre} disabled={!nombreLibre.trim()} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40 bg-blue-600"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Lista */}
      {cargando ? <p className={`text-sm text-center py-4 ${theme.textTertiary}`}>Cargando…</p>
        : lista.length === 0 ? <p className={`text-sm text-center py-6 ${theme.textTertiary}`}>Aún no hay participantes. Agrega empleados o nombres arriba.</p>
        : (
          <div className="space-y-2">
            {lista.map((p) => (
              <ParticipanteRow key={p.id} p={p} requiereCalif={requiereCalif} califMinima={califMinima} isDark={isDark} theme={theme} onChange={cargar} />
            ))}
          </div>
        )}
    </div>
  );
}

function MiniStat({ label, value, color, isDark, theme }: any) {
  return (
    <div className={`rounded-xl border p-2.5 text-center ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
      <div className="text-lg font-black tabular-nums" style={{ color }}>{value}</div>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

const PART_ESTADOS = [["INSCRITO", "Inscrito"], ["ASISTIO", "Asistió"], ["APROBADO", "Aprobado"], ["NO_APROBADO", "No aprobado"], ["AUSENTE", "Ausente"]];
const PART_EST_COLOR: Record<string, string> = {
  INSCRITO: "bg-slate-500/15 text-slate-400", ASISTIO: "bg-sky-500/15 text-sky-500",
  APROBADO: "bg-emerald-500/15 text-emerald-500", NO_APROBADO: "bg-rose-500/15 text-rose-500", AUSENTE: "bg-amber-500/15 text-amber-600",
};

function ParticipanteRow({ p, requiereCalif, califMinima, isDark, theme, onChange }: any) {
  const [calif, setCalif] = useState(p.calificacion ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const inp = `px-2 py-1 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const guardarCalif = async (v: string) => {
    try { await api.actualizarParticipanteCap(p.id, { calificacion: v === "" ? null : Number(v) }); onChange(); }
    catch (e) { alert((e as Error).message); }
  };
  const cambiarEstado = async (estado: string) => {
    try { await api.actualizarParticipanteCap(p.id, { estado }); onChange(); }
    catch (e) { alert((e as Error).message); }
  };
  const eliminar = async () => { if (!confirm("¿Quitar este participante?")) return; try { await api.eliminarParticipanteCap(p.id); onChange(); } catch (e) { alert((e as Error).message); } };
  const subir = async (file: File) => {
    setSubiendo(true);
    try { await api.subirEvidenciaParticipante(p.id, file); onChange(); }
    catch (e) { alert((e as Error).message); } finally { setSubiendo(false); }
  };
  const reprobado = p.estado === "NO_APROBADO" || p.estado === "AUSENTE";

  return (
    <div className={`rounded-xl border p-3 ${reprobado ? "border-rose-500/40 bg-rose-500/[0.04]" : isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar nombre={p.nombre_display} id={p.empleado || p.id} size={26} />
          <div className="min-w-0">
            <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>{p.nombre_display}</div>
            <div className={`text-[10px] ${theme.textTertiary}`}>{p.empleado ? `Empleado · ${p.empleado_numero || ""}` : "Externo"}{(p.intentos || 1) > 1 ? ` · intento ${p.intentos}` : ""}</div>
          </div>
        </div>
        <button onClick={eliminar} className="p-1 rounded text-rose-500 hover:bg-rose-500/10"><X className="w-3.5 h-3.5" /></button>
      </div>
      {reprobado && !p.reprogramado && (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-rose-500/10">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="text-[11px] font-bold text-rose-500">Debe recapacitar — usa “Recapacitación” (arriba) para reprogramarlo a una nueva edición.</span>
        </div>
      )}
      {p.reprogramado && (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-slate-500/10">
          <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`text-[11px] font-bold ${theme.textTertiary}`}>Reprogramado a una nueva edición del curso.</span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {/* Estado */}
        <select value={p.estado} onChange={(e) => cambiarEstado(e.target.value)} className={`${inp} text-xs`}>
          {PART_ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${PART_EST_COLOR[p.estado] || PART_EST_COLOR.INSCRITO}`}>{PART_ESTADOS.find(([v]) => v === p.estado)?.[1]}</span>
        {/* Calificación (si aplica) */}
        {requiereCalif && (
          <span className="inline-flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <input type="number" value={calif} onChange={(e) => setCalif(e.target.value)} onBlur={(e) => guardarCalif(e.target.value)} placeholder="—" className={`${inp} w-16 text-xs`} title={`Mínima para aprobar: ${califMinima}`} />
          </span>
        )}
        {/* Evidencia */}
        {p.evidencia_url
          ? <a href={p.evidencia_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Evidencia</a>
          : <label className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer ${theme.textTertiary} hover:text-blue-500`}>
              <Download className="w-3.5 h-3.5 rotate-180" /> {subiendo ? "Subiendo…" : "Subir evidencia"}
              <input type="file" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) subir(fl); }} />
            </label>}
        {/* Constancia PDF (si aprobó o curso solo-asistencia) */}
        {(p.estado === "APROBADO" || (!requiereCalif && p.estado === "ASISTIO")) && (
          <button onClick={() => api.abrirConstanciaParticipante(p.id).catch((e) => alert((e as Error).message))}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-400">
            <Award className="w-3.5 h-3.5" /> Constancia
          </button>
        )}
      </div>
    </div>
  );
}
