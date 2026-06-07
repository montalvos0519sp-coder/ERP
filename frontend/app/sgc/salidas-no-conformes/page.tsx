"use client";

// SGC · Control de Salidas No Conformes (ISO 9001 · 8.7).
// Registro y disposición de producto/servicio que no cumple, distinto de una
// No Conformidad del sistema. Asignación a responsable, colaboración y escalado
// a NC cuando el problema es recurrente o grave.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, PackageX, Plus, RefreshCw, X, Search, AlertTriangle, CheckCircle2,
  Clock, FileWarning, Link2,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { SelectorUsuario, PanelColaboracion } from "@/components/sgc/Colaboracion";
import { CampanaNotificaciones } from "@/components/sgc/CampanaNotificaciones";

const ORIGENES = [
  ["RECEPCION", "Recepción / entrada"], ["PROCESO", "Durante el proceso"],
  ["FINAL", "Inspección final"], ["CLIENTE", "Detectado por el cliente"], ["AUDITORIA", "Auditoría"],
];
const DISPOSICIONES = [
  ["CORRECCION", "Corrección / reproceso"], ["SEGREGACION", "Segregación / contención"],
  ["DEVOLUCION", "Devolución al proveedor"], ["CONCESION", "Aceptación bajo concesión"],
  ["DESECHO", "Desecho / scrap"], ["RECLASIFICACION", "Reclasificación"],
];
const ESTADOS = [["ABIERTA", "Abierta"], ["EN_TRATAMIENTO", "En tratamiento"], ["CERRADA", "Cerrada"]];
const EST_COLOR: Record<string, string> = {
  ABIERTA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  EN_TRATAMIENTO: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  CERRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};
const lblDe = (arr: string[][], v: string) => arr.find(([x]) => x === v)?.[1] || v;

export default function SalidasNoConformesPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("TODOS");

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getSalidasNoConformes({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const escalar = async (e: any, snc: any) => {
    e.stopPropagation();
    if (!confirm("¿Escalar a una No Conformidad del sistema (CAPA)? Úsalo si el problema es recurrente o grave.")) return;
    try { await api.escalarSalidaNoConformeNC(snc.id); load(); alert("Escalada a No Conformidad. Revísala en CAPA."); }
    catch (err) { alert((err as Error).message); }
  };

  const stats = useMemo(() => ({
    total: items.length,
    abiertas: items.filter((x) => x.estado === "ABIERTA").length,
    tratamiento: items.filter((x) => x.estado === "EN_TRATAMIENTO").length,
    cerradas: items.filter((x) => x.estado === "CERRADA").length,
  }), [items]);

  const visibles = items.filter((x) => {
    if (q && !`${x.folio} ${x.descripcion} ${x.requisito_incumplido}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fEstado !== "TODOS" && x.estado !== fEstado) return false;
    return true;
  });

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-rose-600"><PackageX className="w-6 h-6 text-white" /></div>
          <div><h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Salidas No Conformes</h1><p className={`text-sm ${theme.textSecondary}`}>ISO 9001 · 8.7 — control y disposición de producto/servicio que no cumple.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaNotificaciones />
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-rose-600"><Plus className="w-4 h-4" /> Registrar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={PackageX} color="#F97316" label="Registros" value={stats.total} isDark={isDarkMode} theme={theme} />
        <KPI icon={AlertTriangle} color="#F43F5E" label="Abiertas" value={stats.abiertas} isDark={isDarkMode} theme={theme} />
        <KPI icon={Clock} color="#F59E0B" label="En tratamiento" value={stats.tratamiento} isDark={isDarkMode} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Cerradas" value={stats.cerradas} isDark={isDarkMode} theme={theme} />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todas"], ...ESTADOS].map(([v, l]) => <button key={v} onClick={() => setFEstado(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${fEstado === v ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>)}
        </div>
        <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
      </div>

      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><PackageX className="w-10 h-10 mx-auto mb-3 text-orange-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin salidas no conformes</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Registra cualquier producto o servicio que no cumple, su disposición y responsable (8.7).</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-rose-600"><Plus className="w-4 h-4" /> Registrar primera</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibles.map((snc) => (
            <button key={snc.id} onClick={() => setEdit(snc)} className={`text-left rounded-2xl border p-4 transition hover:shadow-lg ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-black ${theme.textPrimary}`}>{snc.folio}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${isDarkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{lblDe(ORIGENES, snc.origen)}</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${EST_COLOR[snc.estado]}`}>{lblDe(ESTADOS, snc.estado)}</span>
              </div>
              <p className={`text-sm mt-1.5 line-clamp-2 ${theme.textSecondary}`}>{snc.descripcion}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className={`text-[11px] font-bold ${theme.textTertiary}`}>Disposición: <span className={theme.textSecondary}>{lblDe(DISPOSICIONES, snc.disposicion)}</span></span>
                {snc.no_conformidad ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500"><Link2 className="w-3 h-3" /> {snc.nc_folio || "NC"}</span>
                  : <span onClick={(e) => escalar(e, snc)} className="text-[11px] font-bold text-rose-500 hover:text-rose-400 inline-flex items-center gap-0.5"><FileWarning className="w-3 h-3" /> Escalar a NC</span>}
              </div>
              {snc.responsable_nombre && <div className={`text-[11px] mt-1.5 ${theme.textTertiary}`}>Responsable: <span className={theme.textSecondary}>{snc.responsable_nombre}</span></div>}
            </button>
          ))}
        </div>
      )}
      {edit && <SNCModal snc={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
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

function SNCModal({ snc, empresaId, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    descripcion: "", origen: "PROCESO", disposicion: "CORRECCION", estado: "ABIERTA",
    cantidad: "", requisito_incumplido: "", autorizo_concesion: "", fecha_deteccion: "",
    responsable_user: null, ...snc,
  });
  const [busy, setBusy] = useState(false);
  const id = snc.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  const guardar = async () => {
    if (!f.descripcion?.trim()) { alert("Describe la salida no conforme."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, descripcion: f.descripcion, origen: f.origen, disposicion: f.disposicion,
      estado: f.estado, cantidad: f.cantidad || "", requisito_incumplido: f.requisito_incumplido || "",
      autorizo_concesion: f.autorizo_concesion || "", fecha_deteccion: f.fecha_deteccion || null,
      responsable_user: f.responsable_user || null,
    };
    try {
      if (id) { await api.actualizarSalidaNoConforme(id, payload); onSaved(); }
      else { const saved = await api.crearSalidaNoConforme(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-orange-600 to-rose-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><PackageX className="w-4 h-4" /> {id ? `Salida ${f.folio || ""}` : "Registrar salida no conforme"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div><label className={lbl}>Descripción (qué no cumple y por qué) *</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Producto/servicio afectado y motivo del incumplimiento." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Origen de detección</label><select className={inp} value={f.origen} onChange={(e) => set("origen", e.target.value)}>{ORIGENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className={lbl}>Cantidad</label><input className={inp} value={f.cantidad} onChange={(e) => set("cantidad", e.target.value)} placeholder="p.ej. 12 piezas" /></div>
          </div>
          <div><label className={lbl}>Requisito incumplido</label><input className={inp} value={f.requisito_incumplido} onChange={(e) => set("requisito_incumplido", e.target.value)} placeholder="Especificación, norma o requisito del cliente." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Disposición</label><select className={inp} value={f.disposicion} onChange={(e) => set("disposicion", e.target.value)}>{DISPOSICIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className={lbl}>Estado</label><select className={inp} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          {f.disposicion === "CONCESION" && (
            <div><label className={lbl}>¿Quién autorizó la concesión?</label><input className={inp} value={f.autorizo_concesion} onChange={(e) => set("autorizo_concesion", e.target.value)} placeholder="Nombre / puesto que autorizó usar bajo concesión." /></div>
          )}
          <div className="grid grid-cols-2 gap-3 items-end">
            <SelectorUsuario value={f.responsable_user} onChange={(uid) => set("responsable_user", uid)} label="Responsable del tratamiento" />
            <div><label className={lbl}>Fecha de detección</label><input type="date" className={inp} value={f.fecha_deteccion || ""} onChange={(e) => set("fecha_deteccion", e.target.value)} /></div>
          </div>
          {id && <div><div className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Colaboración</div><PanelColaboracion tipo="salida_no_conforme" objetoId={id} /></div>}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-orange-500 to-rose-600">{busy ? "Guardando…" : (id ? "Guardar" : "Guardar y continuar")}</button>
        </div>
      </div>
    </div>
  );
}
