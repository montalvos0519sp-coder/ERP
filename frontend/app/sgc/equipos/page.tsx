"use client";

// SGC · Control de Equipos / Calibraciones (7.1.5) — visual e interactivo.
// Tarjetas con semáforo de vencimiento, KPIs, filtros, responsable, registro
// rápido de calibración y colaboración por equipo.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, GaugeCircle, Plus, RefreshCw, X, Search, CheckCircle2,
  AlertTriangle, Clock, Wrench,
} from "lucide-react";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

function estadoCal(e: any) {
  if (!e.requiere_calibracion) return { label: "No aplica", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", nivel: "na", color: "#94A3B8" };
  const fecha = e.fecha_proxima_calibracion;
  if (!fecha) return { label: "Sin programar", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", nivel: "none", color: "#94A3B8" };
  const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (dias < 0) return { label: `Vencida (${Math.abs(dias)}d)`, cls: "bg-rose-500/15 text-rose-500 border-rose-500/30", nivel: "venc", color: "#F43F5E", dias };
  if (dias <= 30) return { label: `En ${dias} días`, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", nivel: "warn", color: "#F59E0B", dias };
  return { label: "Vigente", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", nivel: "ok", color: "#10B981", dias };
}

export default function EquiposPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getEquiposSGC({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const s = { total: items.length, ok: 0, warn: 0, venc: 0 };
    items.forEach((e) => { const n = estadoCal(e).nivel; if (n === "ok") s.ok++; else if (n === "warn") s.warn++; else if (n === "venc") s.venc++; });
    return s;
  }, [items]);

  const visibles = items.filter((e) => {
    if (q && !`${e.codigo} ${e.nombre} ${e.ubicacion}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filtro !== "TODOS" && estadoCal(e).nivel !== filtro) return false;
    return true;
  });

  const calibrarHoy = async (e: any) => {
    const hoy = new Date().toISOString().slice(0, 10);
    const d = new Date(); d.setMonth(d.getMonth() + (Number(e.frecuencia_meses) || 12));
    try { await api.actualizarEquipoSGC(e.id, { fecha_ultima_calibracion: hoy, fecha_proxima_calibracion: d.toISOString().slice(0, 10) }); load(); }
    catch (err) { alert((err as Error).message); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-cyan-500 to-blue-600"><GaugeCircle className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Control de Equipos</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 7.1.5 — inventario, calibraciones y alertas de vencimiento.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => exportCSV("equipos", ["Código", "Equipo", "Ubicación", "Últ. calibración", "Próxima", "Frecuencia(m)", "Estado"], items.map((e) => [e.codigo, e.nombre, e.ubicacion, e.fecha_ultima_calibracion, e.fecha_proxima_calibracion, e.frecuencia_meses, estadoCal(e).label]))}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600"><Plus className="w-4 h-4" /> Nuevo equipo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Wrench} color="#06B6D4" label="Equipos" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Vigentes" value={stats.ok} isDark={isDarkMode} theme={theme} />
        <KPI icon={Clock} color="#F59E0B" label="Por vencer (≤30d)" value={stats.warn} isDark={isDarkMode} theme={theme} />
        <KPI icon={AlertTriangle} color="#F43F5E" label="Vencidas" value={stats.venc} isDark={isDarkMode} theme={theme} />
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[["TODOS", "Todos"], ["venc", "Vencidas"], ["warn", "Por vencer"], ["ok", "Vigentes"], ["na", "No aplica"]].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
        </div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <GaugeCircle className="w-10 h-10 mx-auto mb-3 text-cyan-400" />
          <p className={`font-bold ${theme.textPrimary}`}>{q || filtro !== "TODOS" ? "Sin resultados" : "Sin equipos"}</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Registra tus equipos de medición y sus calibraciones.</p>
          {!q && filtro === "TODOS" && <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600"><Plus className="w-4 h-4" /> Registrar primer equipo</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibles.map((e) => {
            const st = estadoCal(e);
            return (
              <div key={e.id} className={`rounded-2xl border p-4 transition hover:shadow-lg ${card} ${st.nivel === "venc" ? "ring-1 ring-rose-500/40" : ""}`}>
                <button onClick={() => setEdit(e)} className="text-left w-full">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.color + "20", color: st.color }}><GaugeCircle className="w-5 h-5" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="font-mono text-[11px] font-bold px-1.5 rounded bg-slate-500/15 text-slate-400">{e.codigo}</span></div>
                      <h3 className={`text-sm font-black truncate ${theme.textPrimary}`}>{e.nombre}</h3>
                      {e.ubicacion && <p className={`text-[11px] ${theme.textTertiary}`}>{e.ubicacion}</p>}
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2.5 text-[11px]">
                    <span className={theme.textTertiary}>Últ.: {e.fecha_ultima_calibracion || "—"} · Próx.: {e.fecha_proxima_calibracion || "—"}</span>
                    {e.responsable_nombre && <Avatar nombre={e.responsable_nombre} id={e.responsable_user} size={20} />}
                  </div>
                </button>
                {e.requiere_calibracion && (
                  <button onClick={() => calibrarHoy(e)} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"><CheckCircle2 className="w-3.5 h-3.5" /> Registrar calibración hoy</button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {edit && <EquipoModal e={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
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

function EquipoModal({ e, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ codigo: "", nombre: "", ubicacion: "", requiere_calibracion: true, responsable_user: null, fecha_ultima_calibracion: "", frecuencia_meses: 12, fecha_proxima_calibracion: "", ...e });
  const [busy, setBusy] = useState(false);
  const idEq = e.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const proxAuto = () => {
    if (!f.fecha_ultima_calibracion) return "";
    const d = new Date(f.fecha_ultima_calibracion); d.setMonth(d.getMonth() + (Number(f.frecuencia_meses) || 12));
    return d.toISOString().slice(0, 10);
  };
  const calibrarHoy = () => { const hoy = new Date().toISOString().slice(0, 10); set("fecha_ultima_calibracion", hoy); const d = new Date(); d.setMonth(d.getMonth() + (Number(f.frecuencia_meses) || 12)); set("fecha_proxima_calibracion", d.toISOString().slice(0, 10)); };
  const guardar = async () => {
    if (!f.codigo?.trim() || !f.nombre?.trim()) { alert("Código y nombre requeridos."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, codigo: f.codigo, nombre: f.nombre, ubicacion: f.ubicacion || "", requiere_calibracion: !!f.requiere_calibracion, responsable_user: f.responsable_user || null, fecha_ultima_calibracion: f.fecha_ultima_calibracion || null, frecuencia_meses: Number(f.frecuencia_meses) || 12, fecha_proxima_calibracion: f.fecha_proxima_calibracion || proxAuto() || null };
    try {
      if (idEq) { await api.actualizarEquipoSGC(idEq, payload); onSaved(); }
      else { const saved = await api.crearEquipoSGC(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); }
    } catch (err) { alert((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><GaugeCircle className="w-5 h-5" /> {idEq ? f.nombre || "Equipo" : "Nuevo equipo"}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Código *</label><input className={`${inp} font-mono`} value={f.codigo} onChange={(e2) => set("codigo", e2.target.value)} placeholder="EQ-001" /></div>
            <div><label className={lbl}>Nombre *</label><input className={inp} value={f.nombre} onChange={(e2) => set("nombre", e2.target.value)} placeholder="Vernier, báscula…" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Ubicación</label><input className={inp} value={f.ubicacion} onChange={(e2) => set("ubicacion", e2.target.value)} /></div>
            <SelectorUsuario label="Responsable" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Últ. calibración</label><input type="date" className={inp} value={f.fecha_ultima_calibracion || ""} onChange={(e2) => set("fecha_ultima_calibracion", e2.target.value)} /></div>
            <div><label className={lbl}>Frecuencia (meses)</label><input type="number" className={inp} value={f.frecuencia_meses} onChange={(e2) => set("frecuencia_meses", e2.target.value)} /></div>
            <div><label className={lbl}>Próxima</label><input type="date" className={inp} value={f.fecha_proxima_calibracion || ""} onChange={(e2) => set("fecha_proxima_calibracion", e2.target.value)} placeholder={proxAuto()} /></div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {proxAuto() && !f.fecha_proxima_calibracion ? <p className={`text-[11px] ${theme.textTertiary}`}>Sugerida: <b>{proxAuto()}</b> (se guarda sola).</p> : <span />}
            <button type="button" onClick={calibrarHoy} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Calibrar hoy</button>
          </div>
          <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={!!f.requiere_calibracion} onChange={(e2) => set("requiere_calibracion", e2.target.checked)} /> Requiere calibración (entra en alertas de vencimiento)</label>
          {idEq && <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="equipo" objetoId={idEq} /></div>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-cyan-500 to-blue-600">{busy ? "Guardando…" : (idEq ? "Guardar" : "Guardar y continuar")}</button></div>
      </div>
    </div>
  );
}
