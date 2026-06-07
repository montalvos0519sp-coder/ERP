"use client";

// SGC · Auditorías Internas (9.2) — versión visual e interactiva.
// Tarjetas con resumen de hallazgos por tipo, KPIs, filtros, auditor líder como
// usuario real, gestión de hallazgos enlazados a cláusulas y a No Conformidades,
// y colaboración por auditoría.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ClipboardCheck, Plus, RefreshCw, Trash2, X, Search, CalendarClock,
  AlertTriangle, FileWarning, CheckCircle2, Lightbulb, Link2, PlayCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const TIPOS = [["INTERNA", "Interna"], ["EXTERNA", "Externa"], ["PROVEEDOR", "A proveedor"]];
const ESTADOS = [["PROGRAMADA", "Programada"], ["EN_CURSO", "En curso"], ["CERRADA", "Cerrada"], ["CANCELADA", "Cancelada"]];
const EST_COLOR: Record<string, string> = {
  PROGRAMADA: "bg-sky-500/15 text-sky-500 border-sky-500/30", EN_CURSO: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  CERRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", CANCELADA: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};
const H_META: Record<string, { label: string; color: string; cls: string }> = {
  NC_MAYOR: { label: "NC mayor", color: "#F43F5E", cls: "bg-rose-600/20 text-rose-400 border-rose-600/40" },
  NC_MENOR: { label: "NC menor", color: "#F59E0B", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  OBSERVACION: { label: "Observación", color: "#0EA5E9", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  OPORTUNIDAD: { label: "Oportunidad", color: "#8B5CF6", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  CONFORME: { label: "Conforme", color: "#10B981", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
};
const H_ORDEN = ["NC_MAYOR", "NC_MENOR", "OBSERVACION", "OPORTUNIDAD", "CONFORME"];

export default function AuditoriasPage() {
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
    api.getAuditorias({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const halls = items.flatMap((a) => a.hallazgos || []);
    return {
      programadas: items.filter((a) => a.estado === "PROGRAMADA").length,
      en_curso: items.filter((a) => a.estado === "EN_CURSO").length,
      cerradas: items.filter((a) => a.estado === "CERRADA").length,
      hallazgos: halls.length,
      nc: halls.filter((h) => h.no_conformidad).length,
    };
  }, [items]);

  const visibles = items.filter((a) => {
    if (q && !`${a.titulo} ${a.auditor_lider_nombre || a.auditor_lider}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filtro !== "TODAS" && a.estado !== filtro) return false;
    return true;
  });

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #10B981 0, transparent 40%), radial-gradient(circle at 90% 80%, #14B8A6 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600"><ClipboardCheck className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Auditorías Internas</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-emerald-500 to-teal-600">ISO 9.2</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Programa anual de auditoría, hallazgos por cláusula y conversión a no conformidades.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CampanaNotificaciones />
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nueva auditoría</button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI color="#0EA5E9" label="Programadas" value={stats.programadas} isDark={isDarkMode} theme={theme} />
        <KPI color="#F59E0B" label="En curso" value={stats.en_curso} isDark={isDarkMode} theme={theme} />
        <KPI color="#10B981" label="Cerradas" value={stats.cerradas} isDark={isDarkMode} theme={theme} />
        <KPI color="#8B5CF6" label="Hallazgos" value={stats.hallazgos} isDark={isDarkMode} theme={theme} />
        <KPI color="#F43F5E" label="NC generadas" value={stats.nc} isDark={isDarkMode} theme={theme} />
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[["TODAS", "Todas"], ...ESTADOS].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar auditoría…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
        </div>
      </div>

      {/* Tarjetas */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <p className={`font-bold ${theme.textPrimary}`}>{q || filtro !== "TODAS" ? "Sin resultados" : "Sin auditorías"}</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Programa tus auditorías internas para verificar el cumplimiento del SGC.</p>
          {!q && filtro === "TODAS" && <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600"><Plus className="w-4 h-4" /> Programar primera auditoría</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((a) => {
            const halls = a.hallazgos || [];
            const conteo: Record<string, number> = {};
            halls.forEach((h: any) => { conteo[h.tipo] = (conteo[h.tipo] || 0) + 1; });
            const vencida = a.estado === "PROGRAMADA" && a.fecha_programada && new Date(a.fecha_programada) < new Date();
            return (
              <div key={a.id} onClick={() => setEdit(a)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg cursor-pointer ${card} ${vencida ? "ring-1 ring-rose-500/40" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-black ${theme.textPrimary}`}>{a.titulo}</h3>
                    <div className={`text-[11px] flex items-center gap-2 mt-0.5 flex-wrap ${theme.textTertiary}`}>
                      <span className="px-1.5 py-0.5 rounded bg-slate-500/15">{TIPOS.find(([v]) => v === a.tipo)?.[1]}</span>
                      <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {a.fecha_programada || "sin fecha"}{vencida ? " " : ""}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[a.estado]}`}>{a.estado_display}</span>
                </div>
                {(a.auditor_lider_nombre || a.auditor_lider) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {a.auditor_lider_nombre ? <Avatar nombre={a.auditor_lider_nombre} id={a.auditor_lider_user} size={20} /> : null}
                    <span className={`text-[11px] ${theme.textSecondary}`}>Auditor: {a.auditor_lider_nombre || a.auditor_lider}</span>
                  </div>
                )}
                {/* Resumen de hallazgos por tipo */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {halls.length === 0 ? <span className={`text-[11px] ${theme.textTertiary}`}>Sin hallazgos registrados</span>
                    : H_ORDEN.filter((t) => conteo[t]).map((t) => (
                      <span key={t} className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${H_META[t].cls}`}>{conteo[t]} {H_META[t].label}</span>
                    ))}
                  {halls.some((h: any) => h.no_conformidad) && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-500"><Link2 className="w-3 h-3" /> {halls.filter((h: any) => h.no_conformidad).length} NC</span>}
                </div>
                {/* Ejecutar checklist en vivo */}
                <div className="mt-3 pt-3 border-t flex justify-end" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.25)" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/sgc/auditorias/${a.id}`); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm hover:shadow-md transition"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Ejecutar checklist en vivo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && <AuditoriaModal a={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function KPI({ color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="text-2xl font-black tabular-nums" style={{ color }}>{value}</div>
      <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

function AuditoriaModal({ a, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ titulo: "", tipo: "INTERNA", alcance: "", auditor_lider_user: null, fecha_programada: "", fecha_realizada: "", estado: "PROGRAMADA", ...a });
  const [hallazgos, setHallazgos] = useState<any[]>(a.hallazgos || []);
  const [nuevoH, setNuevoH] = useState<any>({ tipo: "OBSERVACION", descripcion: "", evidencia: "", requisito: "" });
  const [reqs, setReqs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const idAud = a.id || f.id;
  useEffect(() => { api.getRequisitosISO().then((r) => setReqs(r?.results || [])).catch(() => {}); }, []);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.titulo?.trim()) { alert("Título requerido."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, titulo: f.titulo, tipo: f.tipo, alcance: f.alcance || "", auditor_lider_user: f.auditor_lider_user || null, fecha_programada: f.fecha_programada || null, fecha_realizada: f.fecha_realizada || null, estado: f.estado };
    try {
      if (idAud) { await api.actualizarAuditoria(idAud, payload); onSaved(); }
      else { const aud = await api.crearAuditoria(payload); if (aud?.id) setF((p: any) => ({ ...p, id: aud.id })); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const addHallazgo = async () => {
    if (!idAud) { alert("Guarda la auditoría primero."); return; }
    if (!nuevoH.descripcion.trim()) return;
    try { const h = await api.crearHallazgo({ auditoria: idAud, tipo: nuevoH.tipo, descripcion: nuevoH.descripcion, evidencia: nuevoH.evidencia || "", requisito: nuevoH.requisito || null }); setHallazgos((p) => [...p, h]); setNuevoH({ tipo: "OBSERVACION", descripcion: "", evidencia: "", requisito: "" }); }
    catch (e) { alert((e as Error).message); }
  };
  const delHallazgo = async (id: number) => { try { await api.eliminarHallazgo(id); setHallazgos((p) => p.filter((x) => x.id !== id)); } catch { /* */ } };
  const convertirNC = async (h: any) => {
    try { const r = await api.convertirHallazgoNC(h.id); setHallazgos((p) => p.map((x) => x.id === h.id ? { ...x, no_conformidad: r.no_conformidad } : x)); alert("No conformidad creada desde el hallazgo. Revísala en No Conformidades (CAPA)."); }
    catch (e) { alert((e as Error).message); }
  };

  const conteo: Record<string, number> = {};
  hallazgos.forEach((h) => { conteo[h.tipo] = (conteo[h.tipo] || 0) + 1; });
  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> {idAud ? f.titulo || "Auditoría" : "Nueva auditoría"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          <div><label className={lbl}>Título *</label><input className={inp} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Auditoría interna anual 2026" /></div>
          {/* Tipo + estado en pastillas */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Tipo</label><div className="flex gap-1.5 flex-wrap">{TIPOS.map(([v, l]) => <button key={v} type="button" onClick={() => set("tipo", v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${f.tipo === v ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{l}</button>)}</div></div>
            <div><label className={lbl}>Estado</label><div className="flex gap-1.5 flex-wrap">{ESTADOS.map(([v, l]) => <button key={v} type="button" onClick={() => set("estado", v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${f.estado === v ? EST_COLOR[v] : isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{l}</button>)}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SelectorUsuario label="Auditor líder" value={f.auditor_lider_user} onChange={(id) => set("auditor_lider_user", id)} />
            <div><label className={lbl}>Fecha programada</label><input type="date" className={inp} value={f.fecha_programada || ""} onChange={(e) => set("fecha_programada", e.target.value)} /></div>
            <div><label className={lbl}>Fecha realizada</label><input type="date" className={inp} value={f.fecha_realizada || ""} onChange={(e) => set("fecha_realizada", e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Alcance</label><textarea rows={2} className={inp} value={f.alcance} onChange={(e) => set("alcance", e.target.value)} placeholder="Procesos, áreas y cláusulas a auditar…" /></div>

          {/* Hallazgos */}
          {idAud ? (
            <div className={sec}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Hallazgos ({hallazgos.length})</span>
                <div className="flex gap-1">{H_ORDEN.filter((t) => conteo[t]).map((t) => <span key={t} className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${H_META[t].cls}`}>{conteo[t]}</span>)}</div>
              </div>
              <div className="space-y-1.5 mb-2">
                {hallazgos.length === 0 && <p className={`text-xs ${theme.textTertiary}`}>Registra los hallazgos y liga cada uno a la cláusula ISO correspondiente.</p>}
                {hallazgos.map((h) => (
                  <div key={h.id} className={`rounded-lg border p-2.5 ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${H_META[h.tipo]?.cls}`}>{H_META[h.tipo]?.label || h.tipo}</span>
                      <span className={`flex-1 text-sm ${theme.textPrimary}`}>{h.descripcion}</span>
                      <button onClick={() => delHallazgo(h.id)} className="text-slate-500 hover:text-rose-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap">
                      {h.evidencia && <span className={theme.textTertiary}>{h.evidencia}</span>}
                      <div className="ml-auto">{h.no_conformidad
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500"><Link2 className="w-3 h-3" /> NC creada</span>
                        : (h.tipo === "NC_MAYOR" || h.tipo === "NC_MENOR") && <button onClick={() => convertirNC(h)} className="text-[11px] font-bold text-rose-500 hover:text-rose-400 inline-flex items-center gap-0.5"><FileWarning className="w-3 h-3" /> Convertir en No Conformidad</button>}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Alta de hallazgo */}
              <div className={`rounded-lg border p-2 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                  {H_ORDEN.map((t) => <button key={t} type="button" onClick={() => setNuevoH((p: any) => ({ ...p, tipo: t }))} className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${nuevoH.tipo === t ? H_META[t].cls : isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>{H_META[t].label}</button>)}
                </div>
                <div className="flex gap-1.5">
                  <select className={`${inp} w-28`} value={nuevoH.requisito} onChange={(e) => setNuevoH((p: any) => ({ ...p, requisito: e.target.value ? Number(e.target.value) : "" }))}><option value="">Cláusula…</option>{reqs.map((r) => <option key={r.id} value={r.id}>{r.clausula}</option>)}</select>
                  <input className={inp} placeholder="Descripción del hallazgo" value={nuevoH.descripcion} onChange={(e) => setNuevoH((p: any) => ({ ...p, descripcion: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHallazgo(); } }} />
                  <button onClick={addHallazgo} className="px-3 rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 shrink-0"><Plus className="w-4 h-4" /></button>
                </div>
                <input className={`${inp} mt-1.5`} placeholder="Evidencia objetiva (opcional)" value={nuevoH.evidencia} onChange={(e) => setNuevoH((p: any) => ({ ...p, evidencia: e.target.value }))} />
              </div>
            </div>
          ) : (
            <p className={`text-[11px] ${theme.textTertiary} flex items-center gap-1`}><Lightbulb className="w-3.5 h-3.5" /> Guarda la auditoría para registrar hallazgos.</p>
          )}

          {idAud && <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="auditoria" objetoId={idAud} /></div>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-teal-600">{busy ? "Guardando…" : (idAud ? "Guardar" : "Guardar y continuar")}</button>
        </div>
      </div>
    </div>
  );
}
