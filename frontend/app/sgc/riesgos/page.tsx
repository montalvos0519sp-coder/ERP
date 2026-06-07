"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario } from "@/components/sgc/Colaboracion";

const PLANTILLAS_RIESGO = [
  { descripcion: "Rotación de personal clave", proceso: "Recursos Humanos", probabilidad: 3, impacto: 4, es_oportunidad: false },
  { descripcion: "Incumplimiento de proveedor crítico", proceso: "Compras", probabilidad: 3, impacto: 4, es_oportunidad: false },
  { descripcion: "Falla de equipo / paro no programado", proceso: "Mantenimiento", probabilidad: 3, impacto: 4, es_oportunidad: false },
  { descripcion: "Cambio en requisitos legales / normativos", proceso: "Calidad", probabilidad: 2, impacto: 4, es_oportunidad: false },
  { descripcion: "Pérdida de información / ciberseguridad", proceso: "Sistemas", probabilidad: 2, impacto: 5, es_oportunidad: false },
  { descripcion: "Nuevo segmento de mercado", proceso: "Comercial", probabilidad: 3, impacto: 4, es_oportunidad: true },
];

const ESTADOS = [["IDENTIFICADO", "Identificado"], ["EN_TRATAMIENTO", "En tratamiento"], ["CONTROLADO", "Controlado"], ["ACEPTADO", "Aceptado"]];
const SEV_COLOR: Record<string, string> = {
  CRITICO: "bg-rose-600/20 text-rose-400 border-rose-600/40",
  ALTO: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  MEDIO: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  BAJO: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
function sevDe(p: number, i: number) { const n = p * i; return n >= 15 ? "CRITICO" : n >= 8 ? "ALTO" : n >= 4 ? "MEDIO" : "BAJO"; }
function celColor(n: number) { return n >= 15 ? "#dc2626" : n >= 8 ? "#f43f5e" : n >= 4 ? "#f59e0b" : "#10b981"; }

export default function RiesgosPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getRiesgos({ empresa: String(empresaActivaId) }).then((r) => setItems(r.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  // matriz 5x5 conteo
  const matriz: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  items.forEach((r) => { const p = Math.min(5, Math.max(1, r.probabilidad)); const i = Math.min(5, Math.max(1, r.impacto)); matriz[5 - p][i - 1]++; });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #F59E0B 0, transparent 40%), radial-gradient(circle at 90% 80%, #EF4444 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600"><ShieldAlert className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Gestión de Riesgos</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-amber-500 to-orange-600">ISO 6.1</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Pensamiento basado en riesgos: matriz probabilidad × impacto, controles y planes de mitigación.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => exportCSV("riesgos", ["Proceso", "Riesgo", "Probabilidad", "Impacto", "Nivel", "Severidad", "Estado", "Responsable"], items.map((r) => [r.proceso, r.descripcion, r.probabilidad, r.impacto, r.nivel, r.severidad, r.estado, r.responsable]))}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><Download className="w-4 h-4" /> Export</button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nuevo riesgo</button>
            </div>
          </div>
          {/* Banda de severidad */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {([["CRITICO", "Críticos", "#DC2626"], ["ALTO", "Altos", "#F59E0B"], ["MEDIO", "Medios", "#0EA5E9"], ["BAJO", "Bajos", "#10B981"]] as const).map(([sev, lbl, c]) => {
                const n = items.filter((r) => r.severidad === sev).length;
                return (
                  <div key={sev} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                    <span className={`text-sm font-black tabular-nums ${theme.textPrimary}`}>{n}</span>
                    <span className={`text-[11px] font-bold ${theme.textTertiary}`}>{lbl}</span>
                  </div>
                );
              })}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                <span className={`text-sm font-black tabular-nums ${theme.textPrimary}`}>{items.length}</span>
                <span className={`text-[11px] font-bold ${theme.textTertiary}`}>total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Matriz */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Matriz de riesgos</div>
          <div className="flex">
            <div className="flex items-center"><span className={`text-[9px] font-bold -rotate-90 ${theme.textTertiary}`}>PROBABILIDAD</span></div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1">
                {matriz.map((fila, fi) => fila.map((c, ci) => {
                  const p = 5 - fi, i = ci + 1, n = p * i;
                  return <div key={`${fi}-${ci}`} className="aspect-square rounded flex items-center justify-center text-xs font-black text-white" style={{ background: celColor(n), opacity: c ? 1 : 0.25 }}>{c || ""}</div>;
                }))}
              </div>
              <div className={`text-center text-[9px] font-bold mt-1 ${theme.textTertiary}`}>IMPACTO →</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {["BAJO", "MEDIO", "ALTO", "CRITICO"].map((s) => <span key={s} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${SEV_COLOR[s]}`}>{s}</span>)}
          </div>
        </div>

        {/* Lista */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
                <tr className="text-left"><Th>Proceso / Riesgo</Th><Th align="center">P</Th><Th align="center">I</Th><Th align="center">Nivel</Th><Th align="center">Severidad</Th><Th>Estado</Th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
                : items.length === 0 ? <tr><td colSpan={6} className={`py-10 text-center ${theme.textTertiary}`}>Sin riesgos registrados.</td></tr>
                : items.map((r) => (
                  <tr key={r.id} className={`border-t cursor-pointer ${isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`} onClick={() => setEdit(r)}>
                    <Td><span className={`font-bold ${theme.textPrimary} line-clamp-1`}>{r.descripcion}</span>{r.proceso && <span className={`block text-[11px] ${theme.textTertiary}`}>{r.proceso}</span>}</Td>
                    <Td align="center">{r.probabilidad}</Td><Td align="center">{r.impacto}</Td>
                    <Td align="center"><span className="font-black tabular-nums">{r.nivel}</span></Td>
                    <Td align="center"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${SEV_COLOR[r.severidad]}`}>{r.severidad}</span></Td>
                    <Td><span className={`text-xs ${theme.textSecondary}`}>{ESTADOS.find(([v]) => v === r.estado)?.[1] || r.estado}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {edit && <RiesgoModal r={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function RiesgoModal({ r, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !r.id;
  const [f, setF] = useState<any>({ proceso: "", proceso_ref: null, descripcion: "", probabilidad: 3, impacto: 3, controles: "", plan_mitigacion: "", responsable: "", responsable_user: null, estado: "IDENTIFICADO", es_oportunidad: false, ...r });
  const [busy, setBusy] = useState(false);
  const [procesos, setProcesos] = useState<any[]>([]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const sev = sevDe(Number(f.probabilidad), Number(f.impacto));
  useEffect(() => { if (empresaId) api.getProcesosSGC(empresaId).then((r) => setProcesos(r?.results || [])).catch(() => {}); }, [empresaId]);
  const elegirProceso = (id: string) => {
    const pid = id ? Number(id) : null;
    const proc = procesos.find((x) => x.id === pid);
    setF((prev: any) => ({ ...prev, proceso_ref: pid, proceso: proc ? proc.nombre : prev.proceso }));
  };
  const aplicarPlantilla = (p: any) => setF((prev: any) => ({ ...prev, ...p }));

  const guardar = async () => {
    if (!f.descripcion?.trim()) { alert("Describe el riesgo."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, proceso: f.proceso || "", proceso_ref: f.proceso_ref || null, descripcion: f.descripcion, probabilidad: Number(f.probabilidad), impacto: Number(f.impacto), controles: f.controles || "", plan_mitigacion: f.plan_mitigacion || "", responsable: f.responsable || "", responsable_user: f.responsable_user || null, estado: f.estado, es_oportunidad: !!f.es_oportunidad };
    try { nuevo ? await api.crearRiesgo(payload) : await api.actualizarRiesgo(r.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border p-6 space-y-3 max-h-[92vh] overflow-auto ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between"><h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{nuevo ? "Nuevo riesgo" : "Editar riesgo"}</h2><button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} /></button></div>
        {nuevo && (
          <div>
            <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${theme.textTertiary}`}><ShieldAlert className="w-3 h-3" /> Riesgos típicos (clic para precargar)</div>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS_RIESGO.map((p) => (
                <button key={p.descripcion} type="button" onClick={() => aplicarPlantilla(p)} className={`text-[11px] px-2.5 py-1 rounded-full border transition ${p.es_oportunidad ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : isDark ? "border-white/10 text-slate-300 hover:bg-amber-500/15 hover:border-amber-500/40" : "border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300"}`}>{p.descripcion}</button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Proceso / área</label>
            <select className={inp} value={f.proceso_ref || ""} onChange={(e) => elegirProceso(e.target.value)}>
              <option value="">{f.proceso ? `(texto) ${f.proceso}` : "— Sin proceso —"}</option>
              {procesos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Tipo</label><select className={inp} value={f.es_oportunidad ? "1" : "0"} onChange={(e) => set("es_oportunidad", e.target.value === "1")}><option value="0">Riesgo (amenaza)</option><option value="1">Oportunidad</option></select></div>
        </div>
        <div><label className={lbl}>Descripción del {f.es_oportunidad ? "oportunidad" : "riesgo"} *</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿Qué podría pasar y qué efecto tendría?" /></div>

        {/* Selección explícita */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Probabilidad *</label>
            <select className={inp} value={f.probabilidad} onChange={(e) => set("probabilidad", Number(e.target.value))}>
              <option value={1}>1 · Raro</option><option value={2}>2 · Improbable</option><option value={3}>3 · Posible</option><option value={4}>4 · Probable</option><option value={5}>5 · Casi seguro</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Impacto *</label>
            <select className={inp} value={f.impacto} onChange={(e) => set("impacto", Number(e.target.value))}>
              <option value={1}>1 · Insignificante</option><option value={2}>2 · Menor</option><option value={3}>3 · Moderado</option><option value={4}>4 · Mayor</option><option value={5}>5 · Grave</option>
            </select>
          </div>
        </div>

        {/* Selector visual de matriz (sincronizado) */}
        <div>
          <label className={lbl}>…o elige en la matriz (clic en la celda)</label>
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <div className="flex"><span className={`text-[9px] font-bold -rotate-90 mt-8 -mr-1 ${theme.textTertiary}`}>PROB.</span>
                <div className="grid grid-cols-5 gap-1">
                  {[5, 4, 3, 2, 1].map((p) => [1, 2, 3, 4, 5].map((i) => {
                    const n = p * i, sel = Number(f.probabilidad) === p && Number(f.impacto) === i;
                    return <button key={`${p}-${i}`} type="button" onClick={() => { set("probabilidad", p); set("impacto", i); }}
                      className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-black text-white transition-all"
                      style={{ background: celColor(n), opacity: sel ? 1 : 0.45, outline: sel ? "2px solid white" : "none", transform: sel ? "scale(1.12)" : "none" }}>{n}</button>;
                  }))}
                </div>
              </div>
              <div className={`text-center text-[9px] font-bold mt-1 ${theme.textTertiary}`}>IMPACTO →</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className={`text-center py-2 rounded-lg text-sm font-black uppercase border ${SEV_COLOR[sev]}`}>{Number(f.probabilidad) * Number(f.impacto)} · {sev}</div>
              <p className={`text-[11px] ${theme.textTertiary}`}><b>Prob.:</b> 1 raro · 3 posible · 5 casi seguro.</p>
              <p className={`text-[11px] ${theme.textTertiary}`}><b>Impacto:</b> 1 leve · 3 moderado · 5 grave.</p>
            </div>
          </div>
        </div>
        <div><label className={lbl}>Controles actuales</label><textarea rows={2} className={inp} value={f.controles} onChange={(e) => set("controles", e.target.value)} /></div>
        <div><label className={lbl}>Plan de mitigación</label><textarea rows={2} className={inp} value={f.plan_mitigacion} onChange={(e) => set("plan_mitigacion", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <SelectorUsuario label="Responsable del tratamiento" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
          <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button><button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-amber-500 to-orange-600">{busy ? "Guardando…" : "Guardar"}</button></div>
      </div>
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) { return <th className={`px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-black ${align === "center" ? "text-center" : "text-left"}`}>{children}</th>; }
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) { return <td className={`px-3 py-2.5 ${align === "center" ? "text-center" : ""}`}>{children}</td>; }
