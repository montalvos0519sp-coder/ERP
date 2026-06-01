"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, Download, Plus, RefreshCw, X, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

export default function KPIsPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getKPIs({ empresa: String(empresaActivaId) }).then((r) => setItems(r.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const pct = (k: any) => {
    const meta = Number(k.meta) || 0, val = Number(k.valor_actual) || 0;
    if (!meta) return 0;
    return k.sentido === "MENOR" ? Math.min(100, Math.round((meta / Math.max(val, 0.0001)) * 100)) : Math.min(100, Math.round((val / meta) * 100));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-teal-500 to-emerald-600"><BarChart3 className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Indicadores KPI</h1><p className={`text-sm ${theme.textSecondary}`}>Metas, cumplimiento y tendencias por proceso.</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => exportCSV("kpis", ["Indicador", "Proceso", "Meta", "Actual", "Unidad", "En meta"], items.map((k) => [k.nombre, k.proceso, k.meta, k.valor_actual, k.unidad, k.cumple ? "Sí" : "No"]))}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600"><Plus className="w-4 h-4" /> Nuevo KPI</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? <div className={`col-span-full py-10 text-center ${theme.textTertiary}`}>Cargando…</div>
        : items.length === 0 ? <div className={`col-span-full py-10 text-center ${theme.textTertiary}`}>Sin indicadores. Crea el primero.</div>
        : items.map((k) => {
          const p = pct(k);
          return (
            <button key={k.id} onClick={() => setEdit(k)} className={`text-left rounded-2xl border p-4 ${card} hover:shadow-lg transition-all`}>
              <div className="flex items-center justify-between">
                <span className={`font-black ${theme.textPrimary}`}>{k.nombre}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${k.cumple ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"}`}>{k.cumple ? "En meta" : "Fuera"}</span>
              </div>
              <div className={`text-[11px] ${theme.textTertiary}`}>{k.proceso} · {k.frecuencia}</div>
              <div className="flex items-end gap-1 mt-2">
                <span className={`text-2xl font-black ${theme.textPrimary}`}>{Number(k.valor_actual).toLocaleString("es-MX")}</span>
                <span className={`text-xs mb-1 ${theme.textTertiary}`}>{k.unidad} · meta {Number(k.meta).toLocaleString("es-MX")}</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden mt-1.5 ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                <div className={`h-full ${k.cumple ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-rose-500 to-amber-500"}`} style={{ width: `${p}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {edit && <KPIModal k={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const PLANTILLAS_KPI = [
  { nombre: "Satisfacción del cliente", unidad: "%", meta: "90", sentido: "MAYOR", frecuencia: "Mensual" },
  { nombre: "Entregas a tiempo (OTD)", unidad: "%", meta: "95", sentido: "MAYOR", frecuencia: "Mensual" },
  { nombre: "No conformidades abiertas", unidad: "NC", meta: "5", sentido: "MENOR", frecuencia: "Mensual" },
  { nombre: "Plan de capacitación cumplido", unidad: "%", meta: "100", sentido: "MAYOR", frecuencia: "Trimestral" },
  { nombre: "Tiempo de respuesta a quejas", unidad: "h", meta: "48", sentido: "MENOR", frecuencia: "Mensual" },
  { nombre: "Disponibilidad de equipos", unidad: "%", meta: "98", sentido: "MAYOR", frecuencia: "Mensual" },
];

function KPIModal({ k, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !k.id;
  const [f, setF] = useState<any>({ nombre: "", proceso: "", proceso_ref: null, unidad: "%", meta: "100", valor_actual: "0", sentido: "MAYOR", frecuencia: "Mensual", responsable: "", ...k });
  const [busy, setBusy] = useState(false);
  const [procesos, setProcesos] = useState<any[]>([]);
  const set = (key: string, v: any) => setF((p: any) => ({ ...p, [key]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  useEffect(() => { if (empresaId) api.getProcesosSGC(empresaId).then((r) => setProcesos(r?.results || [])).catch(() => {}); }, [empresaId]);
  const aplicarPlantilla = (p: any) => setF((prev: any) => ({ ...prev, ...p }));
  const elegirProceso = (id: string) => {
    const pid = id ? Number(id) : null;
    const proc = procesos.find((x) => x.id === pid);
    setF((prev: any) => ({ ...prev, proceso_ref: pid, proceso: proc ? proc.nombre : prev.proceso }));
  };
  // Vista previa en vivo del cumplimiento.
  const meta = Number(f.meta) || 0, val = Number(f.valor_actual) || 0;
  const cumpleLive = f.sentido === "MENOR" ? val <= meta : val >= meta;
  const pctLive = !meta ? 0 : Math.min(100, Math.round((f.sentido === "MENOR" ? meta / Math.max(val, 0.0001) : val / meta) * 100));
  const guardar = async () => {
    if (!f.nombre?.trim()) { alert("Nombre requerido."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, nombre: f.nombre, proceso: f.proceso || "", proceso_ref: f.proceso_ref || null, unidad: f.unidad || "", meta: String(f.meta || 0), valor_actual: String(f.valor_actual || 0), sentido: f.sentido, frecuencia: f.frecuencia || "", responsable: f.responsable || "" };
    try { nuevo ? await api.crearKPI(payload) : await api.actualizarKPI(k.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border p-6 space-y-3 max-h-[94vh] overflow-auto ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between"><h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{nuevo ? "Nuevo KPI" : "Editar KPI"}</h2><button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} /></button></div>
        {nuevo && (
          <div>
            <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${theme.textTertiary}`}><TrendingUp className="w-3 h-3" /> Plantillas de KPI</div>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS_KPI.map((p) => (
                <button key={p.nombre} type="button" onClick={() => aplicarPlantilla(p)} className={`text-[11px] px-2.5 py-1 rounded-full border transition ${isDark ? "border-white/10 text-slate-300 hover:bg-teal-500/15 hover:border-teal-500/40" : "border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-300"}`}>{p.nombre}</button>
              ))}
            </div>
          </div>
        )}
        <div><label className={lbl}>Nombre *</label><input className={inp} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Proceso</label>
            <select className={inp} value={f.proceso_ref || ""} onChange={(e) => elegirProceso(e.target.value)}>
              <option value="">{f.proceso ? `(texto) ${f.proceso}` : "— Sin proceso —"}</option>
              {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Unidad</label><input className={inp} value={f.unidad} onChange={(e) => set("unidad", e.target.value)} /></div>
          <div><label className={lbl}>Meta</label><input type="number" className={inp} value={f.meta} onChange={(e) => set("meta", e.target.value)} /></div>
          <div><label className={lbl}>Valor actual</label><input type="number" className={inp} value={f.valor_actual} onChange={(e) => set("valor_actual", e.target.value)} /></div>
          <div><label className={lbl}>Sentido</label><select className={inp} value={f.sentido} onChange={(e) => set("sentido", e.target.value)}><option value="MAYOR">Mayor es mejor</option><option value="MENOR">Menor es mejor</option></select></div>
          <div><label className={lbl}>Frecuencia</label><input className={inp} value={f.frecuencia} onChange={(e) => set("frecuencia", e.target.value)} placeholder="Mensual, trimestral…" /></div>
        </div>
        <p className={`text-[11px] ${theme.textTertiary} -mt-1`}><b>Sentido:</b> “Mayor es mejor” (ej. % satisfacción) cumple si valor ≥ meta. “Menor es mejor” (ej. NC, días) cumple si valor ≤ meta.</p>
        {/* Vista previa en vivo */}
        <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${theme.textSecondary}`}>Vista previa</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${cumpleLive ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"}`}>{cumpleLive ? "En meta" : "Fuera de meta"}</span>
          </div>
          <div className="flex items-end gap-1"><span className={`text-2xl font-black ${theme.textPrimary}`}>{val.toLocaleString("es-MX")}</span><span className={`text-xs mb-1 ${theme.textTertiary}`}>{f.unidad} · meta {meta.toLocaleString("es-MX")}</span></div>
          <div className={`h-2 rounded-full overflow-hidden mt-1 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}><div className={`h-full ${cumpleLive ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-rose-500 to-amber-500"}`} style={{ width: `${pctLive}%` }} /></div>
        </div>
        {/* Tendencia histórica + registro de mediciones */}
        {!nuevo && <TendenciaKPI kpi={k} meta={meta} isDark={isDark} theme={theme} onValor={(v) => set("valor_actual", String(v))} />}
        <div className="flex justify-end gap-2 pt-2"><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-teal-500 to-emerald-600">{busy ? "Guardando…" : "Guardar"}</button></div>
      </div>
    </div>
  );
}

function TendenciaKPI({ kpi, meta, isDark, theme, onValor }: { kpi: any; meta: number; isDark: boolean; theme: any; onValor: (v: number) => void }) {
  const [med, setMed] = useState<any[]>([]);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const inp = `px-2 py-1.5 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const load = useCallback(() => { api.getMedicionesKPI(kpi.id).then((r) => setMed(r.results || [])).catch(() => {}); }, [kpi.id]);
  useEffect(() => { load(); }, [load]);

  const agregar = async () => {
    if (valor === "") { alert("Captura el valor."); return; }
    setBusy(true);
    try { await api.crearMedicionKPI({ kpi: kpi.id, fecha, valor: String(valor) }); onValor(Number(valor)); setValor(""); load(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  const data = med.map((m) => ({ fecha: m.fecha?.slice(5), valor: Number(m.valor), meta }));

  return (
    <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
      <div className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${theme.textSecondary}`}><TrendingUp className="w-3.5 h-3.5 text-teal-400" /> Tendencia ({med.length} mediciones)</div>
      {data.length > 0 ? (
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff12" : "#0000000a"} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <Tooltip contentStyle={{ background: isDark ? "#0F172A" : "#fff", border: "1px solid #94a3b833", borderRadius: 12, fontSize: 12 }} />
              {meta > 0 && <ReferenceLine y={meta} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "meta", fontSize: 10, fill: "#f59e0b" }} />}
              <Line type="monotone" dataKey="valor" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3, fill: "#14b8a6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={`text-xs py-3 text-center ${theme.textTertiary}`}>Aún no hay mediciones. Registra valores periódicos para ver la tendencia.</p>
      )}
      <div className="flex items-end gap-2 mt-2">
        <div><label className={`text-[10px] font-bold ${theme.textTertiary}`}>Fecha</label><input type="date" className={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="flex-1"><label className={`text-[10px] font-bold ${theme.textTertiary}`}>Valor ({kpi.unidad})</label><input type="number" className={`${inp} w-full`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Medición del periodo" /></div>
        <button onClick={agregar} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 disabled:opacity-40"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
