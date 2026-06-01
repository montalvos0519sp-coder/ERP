"use client";

// SGC · Evaluación de Proveedores (8.4) — scorecards profesionales.
// Vista por proveedor con clasificación A/B/C/D, radar de criterios, tendencia
// histórica, KPIs, filtros y generación de planes de mejora (NC) para los
// proveedores críticos.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, Download, Plus, RefreshCw, Truck, X, Search, TrendingUp,
  AlertTriangle, Award, ShieldCheck, FileWarning, History, GitCompareArrows,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
  Line, LineChart, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const PALETA = ["#06B6D4", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#EC4899", "#84CC16"];

const CRITERIOS = [
  { k: "calidad", l: "Calidad", h: "Cumple especificaciones y cero defectos" },
  { k: "tiempo_entrega", l: "Entrega", h: "Entrega completa y a tiempo" },
  { k: "servicio", l: "Servicio", h: "Respuesta, atención y soporte" },
  { k: "documentacion", l: "Documentación", h: "Facturas, XML y certificados en regla" },
];

function clasif(p: number) {
  if (p >= 90) return { letra: "A", label: "Excelente", color: "#10B981", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  if (p >= 80) return { letra: "B", label: "Confiable", color: "#0EA5E9", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" };
  if (p >= 70) return { letra: "C", label: "Condicionado", color: "#F59E0B", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { letra: "D", label: "Crítico", color: "#F43F5E", cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" };
}

export default function EvalProveedoresPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [evalProv, setEvalProv] = useState<any | null>(null); // {} o {preset}
  const [comparar, setComparar] = useState(false);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getEvaluacionesProveedor({ empresa: String(empresaActivaId) }).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  // Agrupa evaluaciones por proveedor → última + historial.
  const grupos = useMemo(() => {
    const m = new Map<number, any[]>();
    for (const e of items) { const a = m.get(e.proveedor) || []; a.push(e); m.set(e.proveedor, a); }
    const res: any[] = [];
    m.forEach((evs, id) => {
      const ord = [...evs].sort((a, b) => (String(a.periodo) > String(b.periodo) ? 1 : a.periodo < b.periodo ? -1 : a.id - b.id));
      res.push({ id, nombre: ord[ord.length - 1].proveedor_nombre, last: ord[ord.length - 1], history: ord });
    });
    return res.sort((a, b) => b.last.puntaje - a.last.puntaje);
  }, [items]);

  const stats = {
    total: grupos.length,
    homologados: grupos.filter((g) => g.last.homologado).length,
    promedio: grupos.length ? Math.round(grupos.reduce((a, g) => a + Number(g.last.puntaje), 0) / grupos.length) : 0,
    criticos: grupos.filter((g) => Number(g.last.puntaje) < 70).length,
  };

  const visibles = grupos.filter((g) => {
    if (q && !g.nombre.toLowerCase().includes(q.toLowerCase())) return false;
    if (filtro !== "TODOS" && clasif(Number(g.last.puntaje)).letra !== filtro) return false;
    return true;
  });

  const generarNC = async (g: any) => {
    if (!confirm(`¿Crear un plan de mejora (No Conformidad) para "${g.nombre}"?`)) return;
    try {
      await api.crearNoConformidad({ empresa: empresaActivaId, tipo: "CORRECTIVA", origen: "PROVEEDOR", descripcion: `Desempeño insuficiente del proveedor ${g.nombre} (puntaje ${g.last.puntaje} en ${g.last.periodo}). Requiere plan de mejora.`, estado: "ABIERTA" });
      alert("Plan de mejora creado en No Conformidades.");
    } catch (e) { alert((e as Error).message); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-cyan-600 to-teal-600"><Truck className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Evaluación de Proveedores</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 8.4 — desempeño, clasificación y homologación (≥ 80).</p></div>
        </div>
        <div className="flex gap-2 items-center">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setComparar(true)} disabled={grupos.length < 2} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border disabled:opacity-40 ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><GitCompareArrows className="w-4 h-4" /> Comparar</button>
          <button onClick={() => exportCSV("evaluaciones_proveedor", ["Proveedor", "Periodo", "Calidad", "Entrega", "Servicio", "Doc", "Puntaje", "Clasif", "Homologado"], items.map((e) => [e.proveedor_nombre, e.periodo, e.calidad, e.tiempo_entrega, e.servicio, e.documentacion, e.puntaje, clasif(Number(e.puntaje)).letra, e.homologado ? "Sí" : "No"]))}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setEvalProv({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600"><Plus className="w-4 h-4" /> Evaluar proveedor</button>
        </div>
      </div>

      {/* Alerta de proveedores críticos */}
      {stats.criticos > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-rose-500" /><span className="font-black text-rose-500">{stats.criticos} proveedor{stats.criticos > 1 ? "es" : ""} en clasificación D (crítico)</span></div>
          <div className="flex flex-wrap gap-2">
            {grupos.filter((g) => Number(g.last.puntaje) < 70).map((g) => (
              <div key={g.id} className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-2.5 py-1">
                <span className="text-sm font-bold text-rose-400">{g.nombre}</span>
                <span className="text-[11px] font-black text-rose-500">{g.last.puntaje}</span>
                <button onClick={() => generarNC(g)} className="text-[11px] font-bold text-amber-500 hover:text-amber-400 inline-flex items-center gap-0.5"><FileWarning className="w-3 h-3" /> plan de mejora</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Truck} color="#06B6D4" label="Proveedores evaluados" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI icon={ShieldCheck} color="#10B981" label="Homologados" value={`${stats.homologados}/${stats.total}`} isDark={isDarkMode} theme={theme} />
        <KPI icon={Award} color="#0EA5E9" label="Puntaje promedio" value={stats.promedio} isDark={isDarkMode} theme={theme} />
        <KPI icon={AlertTriangle} color="#F43F5E" label="En riesgo (críticos)" value={stats.criticos} isDark={isDarkMode} theme={theme} />
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todos"], ["A", "A · Excelente"], ["B", "B · Confiable"], ["C", "C · Condicionado"], ["D", "D · Crítico"]].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proveedor…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
        </div>
      </div>

      {/* Scorecards */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <Truck className="w-10 h-10 mx-auto mb-3 text-cyan-400" />
          <p className={`font-bold ${theme.textPrimary}`}>{q || filtro !== "TODOS" ? "Sin resultados" : "Sin evaluaciones"}</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>Evalúa a tus proveedores en calidad, entrega, servicio y documentación.</p>
          {!q && filtro === "TODOS" && <button onClick={() => setEvalProv({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600"><Plus className="w-4 h-4" /> Evaluar primer proveedor</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibles.map((g) => <Scorecard key={g.id} g={g} isDark={isDarkMode} theme={theme} card={card} onOpen={() => setDetalle(g)} />)}
        </div>
      )}

      {detalle && <DetalleModal g={detalle} isDark={isDarkMode} theme={theme} onClose={() => setDetalle(null)} onNueva={() => { setEvalProv({ proveedor: detalle.id, nombre: detalle.nombre }); setDetalle(null); }} onNC={() => generarNC(detalle)} />}
      {evalProv && <EvalModal empresaId={empresaActivaId} preset={evalProv} isDark={isDarkMode} theme={theme} onClose={() => setEvalProv(null)} onSaved={() => { setEvalProv(null); load(); }} />}
      {comparar && <ComparativoModal grupos={grupos} isDark={isDarkMode} theme={theme} onClose={() => setComparar(false)} />}
    </div>
  );
}

function ComparativoModal({ grupos, isDark, theme, onClose }: any) {
  const [sel, setSel] = useState<number[]>(grupos.slice(0, 3).map((g: any) => g.id));
  const toggle = (id: number) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 6 ? [...s, id] : s);
  const elegidos = grupos.filter((g: any) => sel.includes(g.id));
  // Datos del radar: una fila por criterio con el valor de cada proveedor.
  const data = CRITERIOS.map((cr) => { const row: any = { crit: cr.l }; elegidos.forEach((g: any) => { row[g.nombre] = Number(g.last[cr.k]) || 0; }); return row; });

  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-3xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white flex items-center gap-2"><GitCompareArrows className="w-5 h-5" /> Comparar proveedores</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-4">
          {/* Selección */}
          <div>
            <div className={`text-[11px] font-bold mb-1.5 ${theme.textTertiary}`}>Elige hasta 6 proveedores para superponer su perfil:</div>
            <div className="flex flex-wrap gap-1.5">
              {grupos.map((g: any) => { const on = sel.includes(g.id); const idx = elegidos.findIndex((x: any) => x.id === g.id); const col = on ? PALETA[idx % PALETA.length] : undefined; return (
                <button key={g.id} onClick={() => toggle(g.id)} className={`text-xs font-bold px-2.5 py-1 rounded-full border transition ${on ? "text-white border-transparent" : isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`} style={on ? { background: col } : {}}>{g.nombre} · {g.last.puntaje}</button>
              ); })}
            </div>
          </div>

          {elegidos.length === 0 ? <p className={`text-sm text-center py-8 ${theme.textTertiary}`}>Selecciona al menos un proveedor.</p> : (
            <>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <RadarChart data={data} outerRadius={120}>
                    <PolarGrid stroke={isDark ? "#ffffff18" : "#0000000f"} />
                    <PolarAngleAxis dataKey="crit" tick={{ fontSize: 12, fill: isDark ? "#cbd5e1" : "#475569", fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: isDark ? "#64748b" : "#94a3b8" }} />
                    {elegidos.map((g: any, i: number) => <Radar key={g.id} name={g.nombre} dataKey={g.nombre} stroke={PALETA[i % PALETA.length]} fill={PALETA[i % PALETA.length]} fillOpacity={0.12} strokeWidth={2} />)}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla comparativa */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={theme.textTertiary}><tr className="text-left"><th className="py-1.5 pr-2 text-[10px] uppercase font-black">Proveedor</th>{CRITERIOS.map((cr) => <th key={cr.k} className="py-1.5 px-2 text-[10px] uppercase font-black text-center">{cr.l}</th>)}<th className="py-1.5 px-2 text-[10px] uppercase font-black text-center">Puntaje</th></tr></thead>
                  <tbody>
                    {elegidos.map((g: any, i: number) => { const c = clasif(Number(g.last.puntaje)); return (
                      <tr key={g.id} className={`border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                        <td className="py-2 pr-2"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETA[i % PALETA.length] }} /><span className={`font-bold ${theme.textPrimary}`}>{g.nombre}</span></span></td>
                        {CRITERIOS.map((cr) => { const v = Number(g.last[cr.k]); const best = Math.max(...elegidos.map((x: any) => Number(x.last[cr.k]))); return <td key={cr.k} className={`py-2 px-2 text-center tabular-nums ${v === best ? "font-black text-emerald-500" : theme.textSecondary}`}>{v}</td>; })}
                        <td className="py-2 px-2 text-center"><span className="font-black tabular-nums" style={{ color: c.color }}>{g.last.puntaje}</span></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
                <p className={`text-[10px] mt-1 ${theme.textTertiary}`}>En verde, el mejor proveedor en cada criterio.</p>
              </div>
            </>
          )}
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

function Scorecard({ g, isDark, theme, card, onOpen }: any) {
  const e = g.last; const p = Number(e.puntaje); const c = clasif(p);
  const trend = g.history.map((x: any) => ({ p: Number(x.puntaje) }));
  return (
    <button onClick={onOpen} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg hover:-translate-y-0.5 ${card}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: c.color }}>{c.letra}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black truncate ${theme.textPrimary}`}>{g.nombre}</h3>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border ${c.cls}`}>{c.label}</span>
            {e.homologado ? <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500"><BadgeCheck className="w-3 h-3" /> Homologado</span> : <span className="text-[10px] font-bold text-rose-500">No homologado</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black tabular-nums" style={{ color: c.color }}>{p}</div>
          <div className={`text-[10px] ${theme.textTertiary}`}>{e.periodo}</div>
        </div>
      </div>
      {/* Mini barras de criterios */}
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {CRITERIOS.map((cr) => { const v = Number(e[cr.k]) || 0; const col = v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444"; return (
          <div key={cr.k}>
            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.08]" : "bg-slate-200"}`}><div className="h-full" style={{ width: `${v}%`, background: col }} /></div>
            <div className={`text-[9px] mt-0.5 ${theme.textTertiary}`}>{cr.l} {v}</div>
          </div>
        ); })}
      </div>
      {trend.length > 1 && (
        <div className="flex items-center gap-1 mt-2" style={{ height: 28 }}>
          <History className={`w-3 h-3 ${theme.textTertiary}`} />
          <div style={{ width: "100%", height: 28 }}>
            <ResponsiveContainer><LineChart data={trend}><Line type="monotone" dataKey="p" stroke={c.color} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </div>
        </div>
      )}
    </button>
  );
}

function DetalleModal({ g, isDark, theme, onClose, onNueva, onNC }: any) {
  const e = g.last; const p = Number(e.puntaje); const c = clasif(p);
  const radar = CRITERIOS.map((cr) => ({ crit: cr.l, v: Number(e[cr.k]) || 0 }));
  const hist = g.history.map((x: any) => ({ periodo: x.periodo, puntaje: Number(x.puntaje) }));
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ background: `linear-gradient(90deg, ${c.color}, ${c.color}bb)` }}>
          <h2 className="text-base font-black text-white flex items-center gap-2"><Truck className="w-5 h-5" /> {g.nombre}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl" style={{ background: c.color }}>{c.letra}</div>
            <div>
              <div className="text-3xl font-black" style={{ color: c.color }}>{p}<span className="text-base text-slate-400">/100</span></div>
              <div className={`text-sm font-bold`} style={{ color: c.color }}>{c.label} · {e.homologado ? "Homologado ✓" : "No homologado"}</div>
              <div className={`text-xs ${theme.textTertiary}`}>Última evaluación: {e.periodo}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Radar de criterios */}
            <div className={`rounded-xl border p-2 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
              <div className={`text-[11px] font-black uppercase tracking-wider mb-1 px-2 pt-1 ${theme.textSecondary}`}>Perfil de criterios</div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <RadarChart data={radar} outerRadius={68}>
                    <PolarGrid stroke={isDark ? "#ffffff18" : "#0000000f"} />
                    <PolarAngleAxis dataKey="crit" tick={{ fontSize: 11, fill: isDark ? "#cbd5e1" : "#475569" }} />
                    <Radar dataKey="v" stroke={c.color} fill={c.color} fillOpacity={0.35} />
                    <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Tendencia */}
            <div className={`rounded-xl border p-2 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
              <div className={`text-[11px] font-black uppercase tracking-wider mb-1 px-2 pt-1 ${theme.textSecondary}`}>Tendencia del puntaje</div>
              {hist.length > 1 ? (
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer>
                    <LineChart data={hist} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                      <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
                      <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="puntaje" stroke={c.color} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className={`text-xs p-4 text-center ${theme.textTertiary}`}>Solo hay una evaluación. Registra más periodos para ver la tendencia.</p>}
            </div>
          </div>

          {e.comentarios && <div className={`rounded-xl border p-3 text-sm ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}><span className={theme.textTertiary}>Comentarios: </span><span className={theme.textPrimary}>{e.comentarios}</span></div>}

          {/* Historial */}
          <div>
            <div className={`text-[11px] font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Historial de evaluaciones</div>
            <div className="space-y-1.5">
              {g.history.slice().reverse().map((h: any) => { const hc = clasif(Number(h.puntaje)); return (
                <div key={h.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                  <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black" style={{ background: hc.color }}>{hc.letra}</span>
                  <span className={`font-bold ${theme.textPrimary}`}>{h.periodo}</span>
                  <span className={theme.textTertiary}>C{h.calidad} · E{h.tiempo_entrega} · S{h.servicio} · D{h.documentacion}</span>
                  <span className="ml-auto font-black tabular-nums" style={{ color: hc.color }}>{h.puntaje}</span>
                </div>
              ); })}
            </div>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-between gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          {p < 80 ? <button onClick={onNC} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-500/10 border border-amber-500/30"><FileWarning className="w-4 h-4" /> Generar plan de mejora</button> : <span />}
          <button onClick={onNueva} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600"><Plus className="w-4 h-4" /> Nueva evaluación</button>
        </div>
      </div>
    </div>
  );
}

function EvalModal({ empresaId, preset, isDark, theme, onClose, onSaved }: any) {
  const [provs, setProvs] = useState<any[]>([]);
  const [f, setF] = useState<any>({ proveedor: preset?.proveedor || "", periodo: `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`, calidad: 80, tiempo_entrega: 80, servicio: 80, documentacion: 80, comentarios: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getProveedores({ empresa: String(empresaId || "") }).then((r) => setProvs(r?.results || [])).catch(() => {}); }, [empresaId]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const puntaje = (CRITERIOS.reduce((a, cr) => a + Number(f[cr.k]), 0) / 4);
  const c = clasif(puntaje);
  const radar = CRITERIOS.map((cr) => ({ crit: cr.l, v: Number(f[cr.k]) || 0 }));

  const guardar = async () => {
    if (!f.proveedor) { alert("Selecciona proveedor."); return; }
    setBusy(true);
    try { await api.crearEvaluacionProveedor({ empresa: empresaId, proveedor: f.proveedor, periodo: f.periodo, calidad: Number(f.calidad), tiempo_entrega: Number(f.tiempo_entrega), servicio: Number(f.servicio), documentacion: Number(f.documentacion), comentarios: f.comentarios || "" }); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 flex items-center justify-between shrink-0"><h2 className="text-base font-black text-white">Evaluar proveedor</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button></div>
        <div className="p-5 overflow-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Proveedor *</label><select className={inp} value={f.proveedor} onChange={(e) => set("proveedor", e.target.value ? Number(e.target.value) : "")} disabled={!!preset?.proveedor}><option value="">— Selecciona —</option>{provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}{preset?.proveedor && !provs.find((p) => p.id === preset.proveedor) && <option value={preset.proveedor}>{preset.nombre}</option>}</select></div>
            <div><label className={lbl}>Periodo</label><input className={inp} value={f.periodo} onChange={(e) => set("periodo", e.target.value)} placeholder="2026-Q1" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3 items-center">
            <div className="space-y-2">
              {CRITERIOS.map((cr) => { const v = Number(f[cr.k]) || 0; const col = v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444"; return (
                <div key={cr.k}>
                  <div className="flex items-center justify-between"><span className={`text-xs font-bold ${theme.textSecondary}`}>{cr.l}</span><span className="text-sm font-black tabular-nums" style={{ color: col }}>{v}</span></div>
                  <input type="range" min={0} max={100} value={v} onChange={(e) => set(cr.k, e.target.value)} className="w-full accent-cyan-600" />
                  <p className={`text-[10px] ${theme.textTertiary}`}>{cr.h}</p>
                </div>
              ); })}
            </div>
            {/* Radar en vivo */}
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius={56}>
                  <PolarGrid stroke={isDark ? "#ffffff18" : "#0000000f"} />
                  <PolarAngleAxis dataKey="crit" tick={{ fontSize: 9, fill: isDark ? "#cbd5e1" : "#475569" }} />
                  <Radar dataKey="v" stroke={c.color} fill={c.color} fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`rounded-xl border p-3 flex items-center justify-between ${puntaje >= 80 ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
            <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black" style={{ background: c.color }}>{c.letra}</span><div><div className="text-sm font-bold" style={{ color: c.color }}>{c.label}</div><div className={`text-[11px] ${theme.textTertiary}`}>{puntaje >= 80 ? "Homologado" : "No homologado (mín. 80)"}</div></div></div>
            <span className="text-3xl font-black" style={{ color: c.color }}>{puntaje.toFixed(1)}</span>
          </div>
          <div><label className={lbl}>Comentarios</label><textarea rows={2} className={inp} value={f.comentarios} onChange={(e) => set("comentarios", e.target.value)} placeholder="Observaciones, hallazgos, compromisos…" /></div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-cyan-600 to-teal-600">{busy ? "Guardando…" : "Guardar evaluación"}</button></div>
      </div>
    </div>
  );
}
