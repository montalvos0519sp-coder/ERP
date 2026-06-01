"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, ArrowLeft, CheckCircle2, Download, Plus, RefreshCw, X } from "lucide-react";

import { api } from "@/lib/api";
import { exportCSV } from "@/lib/csv";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { PanelColaboracion, SelectorUsuario, Avatar } from "@/components/sgc/Colaboracion";
import { PanelCAPA } from "@/components/sgc/PanelCAPA";

const TIPOS = [["CORRECTIVA", "Correctiva"], ["PREVENTIVA", "Preventiva"], ["MEJORA", "Mejora"]];
const TIPO_COLOR: Record<string, string> = {
  CORRECTIVA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  PREVENTIVA: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  MEJORA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
const ORIGEN_META: Record<string, { label: string; color: string }> = {
  AUDITORIA: { label: "Auditoría", color: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  QUEJA: { label: "Queja", color: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  PROCESO: { label: "Proceso", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  PROVEEDOR: { label: "Proveedor", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  OTRO: { label: "Otro", color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};
const ORIGENES = [["AUDITORIA", "Auditoría"], ["QUEJA", "Queja de cliente"], ["PROCESO", "Desviación de proceso"], ["PROVEEDOR", "Proveedor"], ["OTRO", "Otro"]];
const ESTADOS = [["ABIERTA", "Abierta"], ["EN_PROCESO", "En proceso"], ["CERRADA", "Cerrada"], ["VENCIDA", "Vencida"]];
const ESTADO_COLOR: Record<string, string> = {
  ABIERTA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  EN_PROCESO: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  CERRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  VENCIDA: "bg-rose-600/20 text-rose-400 border-rose-600/40",
};

export default function NoConformidadesPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [filtro, setFiltro] = useState("TODAS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getNoConformidades({ empresa: String(empresaActivaId) }).then((r) => setItems(r.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const cerrar = async (e: any, n: any) => {
    e.stopPropagation();
    if (!confirm(`¿Cerrar la NC "${n.folio || n.descripcion.slice(0, 30)}"?`)) return;
    try { await api.cerrarNoConformidad(n.id); load(); } catch (err) { alert((err as Error).message); }
  };

  const stats = {
    abiertas: items.filter((n) => n.estado === "ABIERTA").length,
    en_proceso: items.filter((n) => n.estado === "EN_PROCESO").length,
    cerradas: items.filter((n) => n.estado === "CERRADA").length,
    vencidas: items.filter((n) => ["ABIERTA", "EN_PROCESO"].includes(n.estado) && n.fecha_compromiso && new Date(n.fecha_compromiso) < new Date()).length,
  };
  const visibles = filtro === "TODAS" ? items : items.filter((n) => n.estado === filtro);
  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-rose-500 to-red-600"><AlertOctagon className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>No Conformidades (CAPA)</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Acciones correctivas y preventivas, causa raíz y seguimiento.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600"><Plus className="w-4 h-4" /> Nueva NC / acción</button>
        </div>
      </div>

      {/* Resumen + filtro + export */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([["ABIERTA", "Abiertas", stats.abiertas, "#EF4444"], ["EN_PROCESO", "En proceso", stats.en_proceso, "#F59E0B"], ["CERRADA", "Cerradas", stats.cerradas, "#10B981"], ["VENCIDA", "Vencidas", stats.vencidas, "#dc2626"]] as const).map(([k, l, v, c]) => (
          <button key={k} onClick={() => setFiltro(filtro === k ? "TODAS" : (k === "VENCIDA" ? "TODAS" : k))}
            className={`rounded-2xl border p-4 text-left transition-all ${card} ${filtro === k ? "ring-2" : "hover:shadow-md"}`} style={filtro === k ? { boxShadow: `0 0 0 2px ${c}55` } : {}}>
            <div className="text-2xl font-black tabular-nums" style={{ color: c }}>{v}</div>
            <div className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{l}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {["TODAS", "ABIERTA", "EN_PROCESO", "CERRADA"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1 rounded-lg text-xs font-bold border ${filtro === f ? "bg-gradient-to-r from-rose-500 to-red-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
              {f === "TODAS" ? "Todas" : ESTADOS.find(([v]) => v === f)?.[1]}
            </button>
          ))}
        </div>
        <button onClick={() => exportCSV("no_conformidades", ["Folio", "Tipo", "Descripción", "Origen", "Responsable", "Compromiso", "Estado"], visibles.map((n) => [n.folio, n.tipo_display, n.descripcion, n.origen, n.responsable, n.fecha_compromiso, n.estado_display]))}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          <Download className="w-3.5 h-3.5" /> Exportar
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left"><Th>Tipo</Th><Th>Descripción</Th><Th>Origen</Th><Th>Responsable</Th><Th>Compromiso</Th><Th align="center">Estado</Th><Th align="center">Acción</Th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              : visibles.length === 0 ? <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Sin no conformidades.</td></tr>
              : visibles.map((n) => {
                const vencida = ["ABIERTA", "EN_PROCESO"].includes(n.estado) && n.fecha_compromiso && new Date(n.fecha_compromiso) < new Date();
                return (
                <tr key={n.id} className={`border-t cursor-pointer ${isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`} onClick={() => setEdit(n)}>
                  <Td><span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${TIPO_COLOR[n.tipo] || TIPO_COLOR.CORRECTIVA}`}>{TIPOS.find(([v]) => v === n.tipo)?.[1] || n.tipo_display}</span></Td>
                  <Td><span className={`${theme.textPrimary} line-clamp-1`}>{n.descripcion}</span>{n.acciones_total > 0 && (() => { const full = n.acciones_hechas === n.acciones_total; return <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${full ? "bg-emerald-500/15 text-emerald-500" : "bg-violet-500/15 text-violet-400"}`}>✓ {n.acciones_hechas}/{n.acciones_total} acciones</span>; })()}</Td>
                  <Td><span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${(ORIGEN_META[n.origen] || ORIGEN_META.OTRO).color}`}>{(ORIGEN_META[n.origen] || ORIGEN_META.OTRO).label}</span></Td>
                  <Td>{n.responsable_nombre ? <span className="inline-flex items-center gap-1.5"><Avatar nombre={n.responsable_nombre} id={n.responsable_user} size={22} /><span className={`text-xs ${theme.textSecondary}`}>{n.responsable_nombre}</span></span> : <span className={`text-xs ${theme.textSecondary}`}>{n.responsable || "—"}</span>}</Td>
                  <Td><span className={`text-xs ${vencida ? "text-rose-500 font-bold" : theme.textTertiary}`}>{n.fecha_compromiso || "—"}{vencida ? " " : ""}</span></Td>
                  <Td align="center"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ESTADO_COLOR[n.estado] || ESTADO_COLOR.ABIERTA}`}>{n.estado_display}</span></Td>
                  <Td align="center">{n.estado !== "CERRADA" ? <button onClick={(e) => cerrar(e, n)} title="Cerrar NC" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Cerrar</button> : <span className={`text-xs ${theme.textTertiary}`}>✓</span>}</Td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>

      {edit && <NCModal nc={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function NCModal({ nc, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !nc.id;
  const [f, setF] = useState<any>({ tipo: "CORRECTIVA", origen: "OTRO", descripcion: "", causa_raiz: "", accion: "", responsable: "", responsable_user: null, fecha_compromiso: "", estado: "ABIERTA", ...nc });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.descripcion?.trim()) { alert("Describe la no conformidad."); return; }
    setBusy(true);
    const payload = { empresa: empresaId, tipo: f.tipo, origen: f.origen, descripcion: f.descripcion, causa_raiz: f.causa_raiz || "", accion: f.accion || "", responsable: f.responsable || "", responsable_user: f.responsable_user || null, fecha_compromiso: f.fecha_compromiso || null, estado: f.estado, fecha_cierre: f.fecha_cierre || null, eficacia_verificada: !!f.eficacia_verificada };
    try { nuevo ? await api.crearNoConformidad(payload) : await api.actualizarNoConformidad(nc.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;
  const help = `text-[11px] mt-1 ${theme.textTertiary}`;
  const tipoDesc: Record<string, string> = {
    CORRECTIVA: "Elimina la causa de una no conformidad ya ocurrida.",
    PREVENTIVA: "Elimina la causa de una posible no conformidad (antes de que ocurra).",
    MEJORA: "Oportunidad de mejora sin que exista una desviación.",
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-3xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white">{nuevo ? "Nueva no conformidad / acción (CAPA)" : `Editar ${f.folio || "no conformidad"}`}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        <div className="p-5 overflow-auto space-y-4">
          {/* 1. Clasificación */}
          <div className={sec}>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">1 · Clasificación</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Tipo de acción</label><select className={inp} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><p className={help}>{tipoDesc[f.tipo]}</p></div>
              <div><label className={lbl}>Origen / fuente</label><select className={inp} value={f.origen} onChange={(e) => set("origen", e.target.value)}>{ORIGENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><p className={help}>¿De dónde surgió? (auditoría, queja, proceso…)</p></div>
            </div>
          </div>

          {/* 2. Descripción */}
          <div className={sec}>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">2 · Descripción del hallazgo *</div>
            <textarea rows={3} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿Qué pasó? ¿Qué requisito o criterio se incumplió? Sé específico: qué, dónde, cuándo y la magnitud." />
            <p className={help}>Describe el problema con evidencia objetiva, no la causa ni la solución todavía.</p>
          </div>

          {/* 3. Causa raíz con asistente */}
          <div className={sec}>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">3 · Análisis de causa raíz</div>
            <RootCauseTool isDark={isDark} theme={theme} problema={f.descripcion}
              onInsert={(txt) => set("causa_raiz", (f.causa_raiz ? f.causa_raiz + "\n\n" : "") + txt)} />
            <textarea rows={4} className={`${inp} mt-2`} value={f.causa_raiz} onChange={(e) => set("causa_raiz", e.target.value)} placeholder="Usa el asistente (5 Porqués / Ishikawa) o escribe la causa raíz aquí." />
            <p className={help}>La causa raíz es el origen real del problema; al eliminarla, el problema no se repite.</p>
          </div>

          {/* 4. Acción */}
          <div className={sec}>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">4 · Acción {f.tipo === "PREVENTIVA" ? "preventiva" : "correctiva"}</div>
            <textarea rows={3} className={inp} value={f.accion} onChange={(e) => set("accion", e.target.value)} placeholder="¿Qué se hará para eliminar la causa raíz? Acciones concretas, medibles y verificables." />
          </div>

          {/* 5. Seguimiento */}
          <div className={sec}>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">5 · Seguimiento y responsable</div>
            <div className="grid grid-cols-3 gap-3">
              <SelectorUsuario label="Responsable (usuario)" value={f.responsable_user} onChange={(id) => set("responsable_user", id)} />
              <div><label className={lbl}>Fecha compromiso</label><input type="date" className={inp} value={f.fecha_compromiso || ""} onChange={(e) => set("fecha_compromiso", e.target.value)} /></div>
              <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <p className={help}>Al asignar un usuario, le llega una notificación y la NC aparece en su bandeja “Mis pendientes”.</p>
            {f.estado === "CERRADA" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className={lbl}>Fecha de cierre</label><input type="date" className={inp} value={f.fecha_cierre || ""} onChange={(e) => set("fecha_cierre", e.target.value)} /></div>
                <label className={`inline-flex items-center gap-2 text-sm mt-6 ${theme.textPrimary}`}><input type="checkbox" checked={!!f.eficacia_verificada} onChange={(e) => set("eficacia_verificada", e.target.checked)} /> Eficacia verificada</label>
              </div>
            )}
          </div>

          {/* 6. Plan de acción CAPA + evidencias + aprobación (NC existentes) */}
          {!nuevo && (
            <div className={sec}>
              <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">6 · Plan de acción, evidencias y aprobación</div>
              <PanelCAPA nc={f} isDark={isDark} theme={theme} onChanged={() => { setF((p: any) => ({ ...p })); }} />
            </div>
          )}

          {/* 7. Colaboración (solo en NC existentes) */}
          {!nuevo && (
            <div className={sec}>
              <div className="text-xs font-black uppercase tracking-wider text-rose-500 mb-2">7 · Colaboración del equipo</div>
              <PanelColaboracion tipo="no_conformidad" objetoId={nc.id} />
            </div>
          )}
        </div>

        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-rose-500 to-red-600">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Asistente de Causa Raíz: 5 Porqués + Ishikawa (6M) ──────────────────────
const ISHIKAWA_CATS = ["Mano de obra", "Método", "Máquina", "Material", "Medición", "Medio ambiente"];

function RootCauseTool({ isDark, theme, problema, onInsert }: {
  isDark: boolean; theme: any; problema: string; onInsert: (txt: string) => void;
}) {
  const [tab, setTab] = useState<"5w" | "ish">("5w");
  const [whys, setWhys] = useState<string[]>(["", "", "", "", ""]);
  const [ish, setIsh] = useState<Record<string, string>>({});
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#0F172A]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const insertar5w = () => {
    const filled = whys.map((w, i) => w.trim() ? `${i + 1}. ¿Por qué? ${w.trim()}` : "").filter(Boolean);
    if (!filled.length) { alert("Responde al menos un ‘por qué’."); return; }
    onInsert(`[5 Porqués]\nProblema: ${problema || "(describe arriba)"}\n${filled.join("\n")}\n➜ Causa raíz: ${whys.filter((w) => w.trim()).slice(-1)[0]}`);
    setWhys(["", "", "", "", ""]);
  };
  const insertarIsh = () => {
    const filled = ISHIKAWA_CATS.map((c) => ish[c]?.trim() ? `• ${c}: ${ish[c].trim()}` : "").filter(Boolean);
    if (!filled.length) { alert("Llena al menos una categoría."); return; }
    onInsert(`[Ishikawa · 6M]\nProblema: ${problema || "(describe arriba)"}\n${filled.join("\n")}`);
    setIsh({});
  };

  return (
    <div className={`rounded-lg border ${isDark ? "border-white/[0.08] bg-[#0F172A]/40" : "border-slate-200 bg-white"}`}>
      <div className="flex gap-1 p-1.5">
        {([["5w", "5 Porqués"], ["ish", "Ishikawa (6M)"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTab(v)}
            className={`px-3 py-1 rounded-md text-xs font-bold ${tab === v ? "bg-gradient-to-r from-rose-500 to-red-600 text-white" : theme.textSecondary}`}>{l}</button>
        ))}
      </div>
      {tab === "5w" ? (
        <div className="p-3 pt-0 space-y-1.5">
          <p className={`text-[11px] ${theme.textTertiary}`}>Pregunta “¿por qué?” 5 veces; cada respuesta lleva a la siguiente. La última suele ser la causa raíz.</p>
          {whys.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-500 w-6 shrink-0">{i + 1}.</span>
              <input className={inp} value={w} onChange={(e) => setWhys((p) => p.map((x, k) => k === i ? e.target.value : x))} placeholder={`¿Por qué ${i === 0 ? "ocurrió el problema" : "pasó lo anterior"}?`} />
            </div>
          ))}
          <button type="button" onClick={insertar5w} className="text-xs font-bold text-rose-500 hover:text-rose-400 mt-1">+ Insertar en causa raíz</button>
        </div>
      ) : (
        <div className="p-3 pt-0">
          <p className={`text-[11px] mb-2 ${theme.textTertiary}`}>Causas posibles por categoría (las 6 M). Llena las que apliquen.</p>
          <div className="grid grid-cols-2 gap-2">
            {ISHIKAWA_CATS.map((c) => (
              <div key={c}><label className={`text-[11px] font-bold ${theme.textSecondary}`}>{c}</label><input className={inp} value={ish[c] || ""} onChange={(e) => setIsh((p) => ({ ...p, [c]: e.target.value }))} /></div>
            ))}
          </div>
          <button type="button" onClick={insertarIsh} className="text-xs font-bold text-rose-500 hover:text-rose-400 mt-2">+ Insertar en causa raíz</button>
        </div>
      )}
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) { return <th className={`px-4 py-3 text-[10px] uppercase tracking-[0.15em] font-black ${align === "center" ? "text-center" : "text-left"}`}>{children}</th>; }
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) { return <td className={`px-4 py-3 ${align === "center" ? "text-center" : ""}`}>{children}</td>; }
