"use client";

// Pilar 4 · Mapa de procesos (SIPOC) — versión visual e interactiva.
// Lista: tarjetas con el flujo SIPOC (Proveedores → Entradas → Proceso →
// Salidas → Clientes) representado como cadena de eslabones.
// Formulario: lienzo SIPOC con entrada por "chips" (escribe + Enter) en vez de
// textos planos, dueño con avatar y tipo en pastillas de color.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Plus, X, Network, Trash2, BarChart3, ShieldAlert,
  ChevronRight, Truck, LogIn, Cog, LogOut, Users, Target, Search,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { Avatar, SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const TIPOS = [["ESTRATEGICO", "Estratégico"], ["CLAVE", "Clave / Operativo"], ["APOYO", "Apoyo"]];
const TIPO_COLOR: Record<string, string> = {
  ESTRATEGICO: "from-violet-500 to-purple-600",
  CLAVE: "from-sky-500 to-blue-600",
  APOYO: "from-emerald-500 to-green-600",
};
const TIPO_RING: Record<string, string> = {
  ESTRATEGICO: "ring-violet-500/40", CLAVE: "ring-sky-500/40", APOYO: "ring-emerald-500/40",
};

// Definición de los 5 eslabones SIPOC: campo, letra, título, color, icono.
const SIPOC = [
  { key: "proveedores", letra: "S", titulo: "Proveedores", hint: "¿Quién provee?", color: "#8B5CF6", icon: Truck },
  { key: "entradas", letra: "I", titulo: "Entradas", hint: "Insumos / info", color: "#0EA5E9", icon: LogIn },
  { key: "actividades", letra: "P", titulo: "Proceso", hint: "Actividades clave", color: "#6366F1", icon: Cog },
  { key: "salidas", letra: "O", titulo: "Salidas", hint: "Resultados", color: "#10B981", icon: LogOut },
  { key: "clientes", letra: "C", titulo: "Clientes", hint: "¿Quién recibe?", color: "#F59E0B", icon: Users },
];

// Convierte el texto del backend (multilínea o separado por comas) en lista de
// elementos para los chips, y de vuelta a texto multilínea al guardar.
const aLista = (txt?: string): string[] => (txt || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
const aTexto = (arr: string[]): string => arr.join("\n");

export default function ProcesosPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getProcesosSGC(empresaActivaId).then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((p) => `${p.nombre} ${p.codigo} ${p.objetivo}`.toLowerCase().includes(t)) : items;
  }, [items, q]);
  const conteo = (tk: string) => items.filter((p) => p.tipo === tk).length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-sky-500 to-indigo-600"><Network className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Mapa de Procesos (SIPOC)</h1>
            <p className={`text-sm ${theme.textSecondary}`}>El eje del SGC: cada proceso con su dueño, flujo SIPOC, KPIs y riesgos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 shadow-md hover:shadow-lg transition-shadow"><Plus className="w-4 h-4" /> Nuevo proceso</button>
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Resumen por tipo + buscador */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIPOS.map(([tk, tl]) => (
          <div key={tk} className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${TIPO_COLOR[tk]}`}><Network className="w-4 h-4 text-white" /></span>
              <span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{conteo(tk)}</span>
            </div>
            <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{tl}</div>
          </div>
        ))}
        <div className={`rounded-2xl border p-3 ${card} flex items-center`}>
          <div className="relative w-full">
            <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proceso…" className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
          </div>
        </div>
      </div>

      {/* Leyenda SIPOC */}
      <div className={`rounded-2xl border p-3 ${card} flex items-center justify-center gap-2 flex-wrap`}>
        {SIPOC.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-black" style={{ background: s.color }}>{s.letra}</span>
              <span className={`text-xs font-bold ${theme.textSecondary}`}>{s.titulo}</span>
            </div>
            {i < SIPOC.length - 1 && <ChevronRight className={`w-4 h-4 ${theme.textTertiary}`} />}
          </div>
        ))}
      </div>

      {/* Lista agrupada por tipo */}
      {TIPOS.map(([tk, tl]) => {
        const grupo = filtrados.filter((p) => p.tipo === tk);
        if (grupo.length === 0) return null;
        return (
          <div key={tk}>
            <h2 className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${theme.textSecondary}`}>
              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${TIPO_COLOR[tk]}`} /> {tl} <span className={theme.textTertiary}>({grupo.length})</span>
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {grupo.map((p) => <ProcesoCard key={p.id} p={p} isDark={isDarkMode} theme={theme} onClick={() => setEdit(p)} />)}
            </div>
          </div>
        );
      })}

      {!loading && filtrados.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <Network className={`w-10 h-10 mx-auto mb-3 text-sky-400`} />
          <p className={`font-bold ${theme.textPrimary}`}>{q ? "Sin resultados" : "Define tu mapa de procesos"}</p>
          <p className={`text-sm mb-4 ${theme.textSecondary}`}>{q ? "Prueba otra búsqueda." : "Crea tus procesos estratégicos, clave y de apoyo con su flujo SIPOC."}</p>
          {!q && <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600"><Plus className="w-4 h-4" /> Crear primer proceso</button>}
        </div>
      )}

      {edit && <ProcesoModal proceso={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

// ── Tarjeta de proceso con flujo SIPOC en eslabones ─────────────────────────
function ProcesoCard({ p, isDark, theme, onClick }: any) {
  const card = isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  return (
    <button onClick={onClick} className={`text-left rounded-2xl border p-4 w-full transition hover:shadow-lg hover:-translate-y-0.5 ${card} ${TIPO_RING[p.tipo]} hover:ring-2`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shadow bg-gradient-to-br ${TIPO_COLOR[p.tipo]} shrink-0`}><Network className="w-5 h-5 text-white" /></span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black truncate ${theme.textPrimary}`}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</h3>
          {p.objetivo && <p className={`text-xs line-clamp-1 ${theme.textSecondary}`}>{p.objetivo}</p>}
        </div>
        {p.dueno_nombre
          ? <span className="flex items-center gap-1.5 shrink-0" title={`Dueño: ${p.dueno_nombre}`}><Avatar nombre={p.dueno_nombre} id={p.dueno_user} size={28} /></span>
          : <span className={`text-[10px] px-2 py-1 rounded-full border ${isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"}`}>Sin dueño</span>}
      </div>

      {/* Flujo SIPOC en eslabones */}
      <div className="flex items-stretch gap-1">
        {SIPOC.map((s, i) => {
          const lista = aLista(p[s.key]);
          return (
            <div key={s.key} className="flex items-stretch flex-1 min-w-0">
              <div className="flex-1 rounded-lg px-1.5 py-2 text-center min-w-0" style={{ background: s.color + (isDark ? "1f" : "14") }}>
                <div className="flex items-center justify-center gap-1">
                  <span className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-black" style={{ background: s.color }}>{s.letra}</span>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: s.color }}>{lista.length}</span>
                </div>
                <div className={`text-[9px] mt-0.5 line-clamp-1 ${theme.textTertiary}`}>{lista[0] || "—"}</div>
              </div>
              {i < SIPOC.length - 1 && <ChevronRight className="w-3 h-3 self-center shrink-0 opacity-40" style={{ color: SIPOC[i + 1].color }} />}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 text-[11px]">
        <span className={`inline-flex items-center gap-1 ${theme.textTertiary}`}><BarChart3 className="w-3.5 h-3.5 text-teal-400" /> {p.kpis_count} KPIs</span>
        <span className={`inline-flex items-center gap-1 ${theme.textTertiary}`}><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> {p.riesgos_count} riesgos</span>
      </div>
    </button>
  );
}

// ── Tablero 360° del proceso: KPIs + riesgos + objetivos vinculados ─────────
const SEV_BADGE: Record<string, string> = {
  CRITICO: "bg-rose-600/20 text-rose-400 border-rose-600/40", ALTO: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  MEDIO: "bg-amber-500/15 text-amber-600 border-amber-500/30", BAJO: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
const OBJ_BADGE: Record<string, string> = {
  EN_CURSO: "bg-sky-500/15 text-sky-500 border-sky-500/30", LOGRADO: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", NO_LOGRADO: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

function Panorama360({ procesoId, isDark, theme }: { procesoId: number; isDark: boolean; theme: any }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.getPanoramaProceso(procesoId).then(setD).catch(() => setD({ kpis: [], riesgos: [], objetivos: [], resumen: {} })); }, [procesoId]);

  const box = `rounded-xl border ${isDark ? "border-white/[0.06] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`;
  const r = d?.resumen || {};
  const col = (title: string, Icon: any, color: string, count: number, children: any) => (
    <div className={`${box} flex flex-col`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className={`text-xs font-black ${theme.textPrimary}`}>{title}</span>
        <span className="ml-auto text-[11px] font-bold px-1.5 rounded-full" style={{ background: color + "22", color }}>{count}</span>
      </div>
      <div className="p-2 space-y-1.5 max-h-44 overflow-y-auto">{children}</div>
    </div>
  );

  return (
    <div>
      <div className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${theme.textSecondary}`}>
        <Search className="w-3.5 h-3.5" /> Tablero 360° del proceso
      </div>
      {!d ? <p className={`text-xs ${theme.textTertiary}`}>Cargando…</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className={`${box} p-2.5 text-center`}><div className="text-lg font-black text-teal-400">{r.kpis_en_meta ?? 0}/{r.kpis_total ?? 0}</div><div className={`text-[10px] uppercase font-bold ${theme.textTertiary}`}>KPIs en meta</div></div>
            <div className={`${box} p-2.5 text-center`}><div className="text-lg font-black text-amber-400">{r.riesgos_altos ?? 0}/{r.riesgos_total ?? 0}</div><div className={`text-[10px] uppercase font-bold ${theme.textTertiary}`}>Riesgos altos</div></div>
            <div className={`${box} p-2.5 text-center`}><div className="text-lg font-black text-violet-400">{r.objetivos_logrados ?? 0}/{r.objetivos_total ?? 0}</div><div className={`text-[10px] uppercase font-bold ${theme.textTertiary}`}>Objetivos logrados</div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {col("KPIs", BarChart3, "#14b8a6", d.kpis.length, d.kpis.length ? d.kpis.map((k: any) => (
              <div key={k.id} className="text-xs">
                <div className="flex items-center justify-between gap-1"><span className={`truncate ${theme.textPrimary}`}>{k.nombre}</span><span className={`text-[9px] font-black px-1.5 rounded-full shrink-0 ${k.cumple ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>{k.cumple ? "✓" : "✗"}</span></div>
                <div className={`text-[10px] ${theme.textTertiary}`}>{Number(k.valor_actual).toLocaleString("es-MX")} / {Number(k.meta).toLocaleString("es-MX")} {k.unidad}</div>
              </div>
            )) : <p className={`text-[11px] ${theme.textTertiary}`}>Sin KPIs vinculados.</p>)}

            {col("Riesgos", ShieldAlert, "#f59e0b", d.riesgos.length, d.riesgos.length ? d.riesgos.map((rg: any) => (
              <div key={rg.id} className="flex items-center justify-between gap-1 text-xs">
                <span className={`truncate ${theme.textPrimary}`}>{rg.descripcion}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${SEV_BADGE[rg.severidad]}`}>{rg.severidad}</span>
              </div>
            )) : <p className={`text-[11px] ${theme.textTertiary}`}>Sin riesgos vinculados.</p>)}

            {col("Objetivos", Target, "#8b5cf6", d.objetivos.length, d.objetivos.length ? d.objetivos.map((o: any) => (
              <div key={o.id} className="text-xs">
                <div className="flex items-center justify-between gap-1"><span className={`truncate ${theme.textPrimary}`}>{o.objetivo}</span><span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${OBJ_BADGE[o.estado]}`}>{o.avance}%</span></div>
                <div className={`h-1 rounded-full overflow-hidden mt-0.5 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}><div className="h-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${o.avance}%` }} /></div>
              </div>
            )) : <p className={`text-[11px] ${theme.textTertiary}`}>Sin objetivos vinculados.</p>)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Columna de chips SIPOC (escribe + Enter para agregar) ───────────────────
function ChipColumn({ def, items, onChange, isDark, theme }: any) {
  const [val, setVal] = useState("");
  const Icon = def.icon;
  const add = () => { const v = val.trim(); if (!v) return; onChange([...items, v]); setVal(""); };
  const remove = (i: number) => onChange(items.filter((_: any, k: number) => k !== i));
  const esProceso = def.letra === "P";

  return (
    <div className={`rounded-xl border flex flex-col ${esProceso ? "ring-2 ring-indigo-500/30" : ""} ${isDark ? "border-white/[0.08] bg-[#0B1220]/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl" style={{ background: def.color + (isDark ? "22" : "16") }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-black shrink-0" style={{ background: def.color }}>{def.letra}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: def.color }} />
        <span className="text-xs font-black" style={{ color: def.color }}>{def.titulo}</span>
      </div>
      <div className="p-2 flex-1 flex flex-col gap-1.5 min-h-[90px]">
        <div className="flex flex-wrap gap-1 content-start flex-1">
          {items.length === 0 && <span className={`text-[10px] ${theme.textTertiary}`}>{def.hint}…</span>}
          {items.map((it: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: def.color + "22", color: def.color }}>
              {it}
              <button type="button" onClick={() => remove(i)} className="hover:opacity-70"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="+ agregar"
            className={`flex-1 min-w-0 px-2 py-1 rounded-md border text-xs outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`}
          />
          <button type="button" onClick={add} className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: def.color }}><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: lienzo SIPOC interactivo ─────────────────────────────────────────
function ProcesoModal({ proceso, empresaId, isDark, theme, onClose, onSaved }: any) {
  const nuevo = !proceso.id;
  const [f, setF] = useState<any>({ nombre: "", codigo: "", tipo: "CLAVE", objetivo: "", dueno_user: null, activo: true, ...proceso });
  const [sipoc, setSipoc] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(SIPOC.map((s) => [s.key, aLista(proceso[s.key])])));
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const setChips = (key: string, arr: string[]) => setSipoc((p) => ({ ...p, [key]: arr }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.nombre?.trim()) { alert("Escribe el nombre del proceso."); return; }
    setBusy(true);
    const payload: any = { empresa: empresaId, nombre: f.nombre, codigo: f.codigo || "", tipo: f.tipo, objetivo: f.objetivo || "", dueno_user: f.dueno_user || null, activo: f.activo !== false };
    SIPOC.forEach((s) => { payload[s.key] = aTexto(sipoc[s.key] || []); });
    try { nuevo ? await api.crearProcesoSGC(payload) : await api.actualizarProcesoSGC(proceso.id, payload); onSaved(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  const borrar = async () => { if (!confirm("¿Eliminar proceso?")) return; try { await api.eliminarProcesoSGC(proceso.id); onSaved(); } catch (e) { alert((e as Error).message); } };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-4xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className={`px-5 py-3 bg-gradient-to-r ${TIPO_COLOR[f.tipo]} flex items-center justify-between shrink-0`}>
          <h2 className="text-base font-black text-white flex items-center gap-2"><Network className="w-5 h-5" /> {nuevo ? "Nuevo proceso" : (f.codigo ? `${f.codigo} · ${f.nombre}` : f.nombre)}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        <div className="p-5 overflow-auto space-y-4">
          {/* Datos generales */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6"><label className={lbl}>Nombre del proceso *</label><input className={inp} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="p.ej. Gestión de pedidos" /></div>
            <div className="md:col-span-2"><label className={lbl}>Código</label><input className={inp} value={f.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="P-01" /></div>
            <div className="md:col-span-4"><SelectorUsuario label="Dueño del proceso" value={f.dueno_user} onChange={(id) => set("dueno_user", id)} /></div>
          </div>

          {/* Tipo en pastillas visuales */}
          <div>
            <label className={lbl}>Tipo de proceso</label>
            <div className="flex gap-2 flex-wrap">
              {TIPOS.map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("tipo", v)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition ${f.tipo === v ? `text-white bg-gradient-to-r ${TIPO_COLOR[v]} border-transparent shadow` : isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div><label className={`${lbl} flex items-center gap-1`}><Target className="w-3.5 h-3.5" /> Objetivo del proceso</label><input className={inp} value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="¿Para qué existe este proceso?" /></div>

          {/* Lienzo SIPOC interactivo */}
          <div>
            <div className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${theme.textSecondary}`}>
              <Network className="w-3.5 h-3.5" /> Flujo SIPOC <span className={`font-medium normal-case ${theme.textTertiary}`}>— escribe y presiona Enter para agregar cada elemento</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
              {SIPOC.map((s) => (
                <ChipColumn key={s.key} def={s} items={sipoc[s.key]} onChange={(arr: string[]) => setChips(s.key, arr)} isDark={isDark} theme={theme} />
              ))}
            </div>
          </div>

          {!nuevo && <Panorama360 procesoId={proceso.id} isDark={isDark} theme={theme} />}

          {!nuevo && (
            <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="proceso" objetoId={proceso.id} /></div>
          )}
        </div>

        <div className={`px-5 py-3 border-t flex justify-between gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          {!nuevo ? <button onClick={borrar} className="px-3 py-2 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" /> Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
            <button onClick={guardar} disabled={busy} className={`px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r ${TIPO_COLOR[f.tipo]}`}>{busy ? "Guardando…" : "Guardar proceso"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
