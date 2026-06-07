"use client";

// SGC · Quejas y Satisfacción del cliente (9.1.2) — visual e interactivo.
// KPIs (CSAT, satisfacción prom.), distribución de satisfacción, filtros por
// tipo/estado, calificación con estrellas, escalado a NC y colaboración.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MessageSquareWarning, Plus, RefreshCw, Star, X, Search, Smile,
  ThumbsUp, AlertTriangle, FileWarning, Link2, ClipboardList,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { PanelColaboracion, SelectorUsuario } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const TIPOS = [["QUEJA", "Queja"], ["RECLAMO", "Reclamo"], ["SUGERENCIA", "Sugerencia"], ["FELICITACION", "Felicitación"]];
const TIPO_META: Record<string, { label: string; cls: string; emoji: string }> = {
  QUEJA: { label: "Queja", cls: "bg-rose-500/15 text-rose-500 border-rose-500/30", emoji: "" },
  RECLAMO: { label: "Reclamo", cls: "bg-orange-500/15 text-orange-500 border-orange-500/30", emoji: "" },
  SUGERENCIA: { label: "Sugerencia", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30", emoji: "" },
  FELICITACION: { label: "Felicitación", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", emoji: "" },
};
const ESTADOS = [["ABIERTA", "Abierta"], ["EN_PROCESO", "En proceso"], ["RESUELTA", "Resuelta"]];
const EST_COLOR: Record<string, string> = { ABIERTA: "bg-rose-500/15 text-rose-500 border-rose-500/30", EN_PROCESO: "bg-amber-500/15 text-amber-600 border-amber-500/30", RESUELTA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };

function Estrellas({ n, onChange, size = 16 }: { n: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const estrella = <Star className={i <= n ? "fill-amber-400 text-amber-400" : "text-slate-400"} style={{ width: size, height: size }} />;
        // Solo es <button> cuando es interactivo; en lectura usa <span> para no
        // anidar botones (la tarjeta contenedora ya es un <button>).
        return onChange
          ? <button key={i} type="button" onClick={() => onChange(i)} className="cursor-pointer">{estrella}</button>
          : <span key={i} className="cursor-default">{estrella}</span>;
      })}
    </span>
  );
}

export default function QuejasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState("TODOS");
  const [fEstado, setFEstado] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getQuejas({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const escalar = async (e: any, qj: any) => {
    e.stopPropagation();
    if (!confirm("¿Escalar este caso a una no conformidad (CAPA)?")) return;
    try { await api.escalarQuejaNC(qj.id); load(); alert("Caso escalado a No Conformidad. Revísalo en CAPA."); }
    catch (err) { alert((err as Error).message); }
  };

  const stats = useMemo(() => {
    const conSat = items.filter((x) => x.satisfaccion);
    const prom = conSat.length ? conSat.reduce((s, x) => s + x.satisfaccion, 0) / conSat.length : 0;
    const csat = conSat.length ? Math.round(conSat.filter((x) => x.satisfaccion >= 4).length / conSat.length * 100) : 0;
    const dist = [1, 2, 3, 4, 5].map((n) => ({ estrella: `${n}`, n: conSat.filter((x) => x.satisfaccion === n).length, color: n >= 4 ? "#10b981" : n === 3 ? "#f59e0b" : "#f43f5e" }));
    return {
      total: items.length,
      abiertas: items.filter((x) => x.estado !== "RESUELTA").length,
      resueltas: items.filter((x) => x.estado === "RESUELTA").length,
      prom: prom ? prom.toFixed(1) : "—", csat, dist, conSat: conSat.length,
    };
  }, [items]);

  const visibles = items.filter((x) => {
    if (q && !`${x.cliente} ${x.descripcion}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fTipo !== "TODOS" && x.tipo !== fTipo) return false;
    if (fEstado !== "TODOS" && x.estado !== fEstado) return false;
    return true;
  });

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-pink-500 to-rose-600"><MessageSquareWarning className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Quejas y Satisfacción</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 9.1.2 — voz del cliente: reclamos, sugerencias y satisfacción.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={() => router.push("/sgc/encuestas")} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><ClipboardList className="w-4 h-4" /> Encuestas</button>
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600"><Plus className="w-4 h-4" /> Registrar</button>
        </div>
      </div>

      {/* KPIs + distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={MessageSquareWarning} color="#EC4899" label="Casos totales" value={stats.total} isDark={isDarkMode} theme={theme} />
          <KPI icon={AlertTriangle} color="#F43F5E" label="Sin resolver" value={stats.abiertas} isDark={isDarkMode} theme={theme} />
          <KPI icon={Smile} color="#10B981" label="CSAT (≥4)" value={`${stats.csat}%`} isDark={isDarkMode} theme={theme} />
          <KPI icon={ThumbsUp} color="#F59E0B" label="Satisf. prom." value={`${stats.prom}/5`} isDark={isDarkMode} theme={theme} />
        </div>
        <div className={`rounded-2xl border p-3 ${card}`}>
          <div className={`text-[11px] uppercase font-bold mb-1 ${theme.textTertiary}`}>Distribución de satisfacción ({stats.conSat})</div>
          <div style={{ width: "100%", height: 90 }}>
            <ResponsiveContainer>
              <BarChart data={stats.dist} margin={{ top: 4, right: 4, left: -28, bottom: -8 }}>
                <XAxis dataKey="estrella" tick={{ fontSize: 10, fill: isDarkMode ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: isDarkMode ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: isDarkMode ? "#ffffff08" : "#00000005" }} contentStyle={{ background: isDarkMode ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="n" radius={[4, 4, 0, 0]}>{stats.dist.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todos"], ...TIPOS].map(([v, l]) => <button key={v} onClick={() => setFTipo(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${fTipo === v ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>)}
          <span className={`mx-1 ${theme.textTertiary}`}>·</span>
          {[["TODOS", "Estado"], ...ESTADOS].map(([v, l]) => <button key={v} onClick={() => setFEstado(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${fEstado === v ? "bg-slate-500/20 text-slate-200 border-slate-500/40" : isDarkMode ? "border-white/[0.08] text-slate-400" : "border-slate-200 text-slate-500"}`}>{l}</button>)}
        </div>
        <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar caso…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
      </div>

      {/* Lista */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><MessageSquareWarning className="w-10 h-10 mx-auto mb-3 text-pink-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin casos</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Registra la voz del cliente: quejas, reclamos, sugerencias y felicitaciones.</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600"><Plus className="w-4 h-4" /> Registrar primer caso</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((qj) => { const tm = TIPO_META[qj.tipo]; return (
            <button key={qj.id} onClick={() => setEdit(qj)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2"><span className="text-lg">{tm.emoji}</span><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${tm.cls}`}>{tm.label}</span>{qj.cliente && <span className={`text-xs font-bold ${theme.textPrimary}`}>{qj.cliente}</span>}</div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[qj.estado]}`}>{ESTADOS.find(([v]) => v === qj.estado)?.[1]}</span>
              </div>
              <p className={`text-sm mt-1.5 line-clamp-2 ${theme.textSecondary}`}>{qj.descripcion}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                {qj.satisfaccion ? <Estrellas n={qj.satisfaccion} /> : <span className={`text-[11px] ${theme.textTertiary}`}>Sin calificar</span>}
                {qj.no_conformidad ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500"><Link2 className="w-3 h-3" /> NC</span>
                  : (qj.tipo === "QUEJA" || qj.tipo === "RECLAMO") && <span onClick={(e) => escalar(e, qj)} className="text-[11px] font-bold text-rose-500 hover:text-rose-400 inline-flex items-center gap-0.5"><FileWarning className="w-3 h-3" /> Escalar a NC</span>}
              </div>
            </button>
          ); })}
        </div>
      )}
      {edit && <QuejaModal q={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
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

function QuejaModal({ q, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ tipo: "QUEJA", cliente: "", descripcion: "", respuesta: "", satisfaccion: "", estado: "ABIERTA", responsable_user: null, fecha_compromiso: "", ...q });
  const [busy, setBusy] = useState(false);
  const idQ = q.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const guardar = async () => {
    if (!f.descripcion?.trim()) { alert("Describe el caso."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, tipo: f.tipo, cliente: f.cliente || "", descripcion: f.descripcion, respuesta: f.respuesta || "", satisfaccion: f.satisfaccion ? Number(f.satisfaccion) : null, estado: f.estado, responsable_user: f.responsable_user || null, fecha_compromiso: f.fecha_compromiso || null };
    try {
      if (idQ) { await api.actualizarQueja(idQ, payload); onSaved(); }
      else { const saved = await api.crearQueja(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-700 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2">{TIPO_META[f.tipo]?.emoji} {idQ ? "Caso" : "Registrar caso"}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Tipo</label><div className="grid grid-cols-2 gap-1">{TIPOS.map(([v, l]) => <button key={v} type="button" onClick={() => set("tipo", v)} className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${f.tipo === v ? TIPO_META[v].cls : isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{TIPO_META[v].emoji} {l}</button>)}</div></div>
            <div><label className={lbl}>Cliente</label><input className={inp} value={f.cliente} onChange={(e) => set("cliente", e.target.value)} /><label className={`${lbl} mt-2`}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <div><label className={lbl}>Descripción del caso *</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿Qué reportó el cliente? Producto/servicio, fecha y detalle." /></div>
          <div><label className={lbl}>Respuesta / acción tomada</label><textarea rows={2} className={inp} value={f.respuesta} onChange={(e) => set("respuesta", e.target.value)} placeholder="¿Cómo se atendió?" /></div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <SelectorUsuario value={f.responsable_user} onChange={(id) => set("responsable_user", id)} label="Responsable de atención" />
            <div><label className={lbl}>Fecha compromiso</label><input type="date" className={inp} value={f.fecha_compromiso || ""} onChange={(e) => set("fecha_compromiso", e.target.value)} /></div>
          </div>
          <div className={`rounded-xl border p-3 flex items-center justify-between ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
            <span className={`text-sm font-bold ${theme.textSecondary}`}>Satisfacción del cliente</span>
            <div className="flex items-center gap-2"><Estrellas n={Number(f.satisfaccion) || 0} onChange={(v) => set("satisfaccion", v)} size={22} />{f.satisfaccion && <button type="button" onClick={() => set("satisfaccion", "")} className="text-[10px] text-slate-400 hover:text-rose-400">limpiar</button>}</div>
          </div>
          {idQ && <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="queja" objetoId={idQ} /></div>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-pink-500 to-rose-600">{busy ? "Guardando…" : (idQ ? "Guardar" : "Guardar y continuar")}</button></div>
      </div>
    </div>
  );
}
