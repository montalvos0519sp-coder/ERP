"use client";

// Portal de autoservicio del empleado: muestra al usuario logueado sus datos
// laborales, préstamos, vacaciones, permisos/solicitudes y capacitaciones.
// Se alimenta de /api/rh/empleados/mi-portal/.

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase, Wallet, Palmtree, FileText, GraduationCap, CalendarDays,
  CheckCircle2, Clock, XCircle, AlertTriangle, Award, Hash, Building2, BadgeCheck,
  Plus, X, Send,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

const money = (v: any) => `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

const EST_SOL: Record<string, { label: string; cls: string; icon: any }> = {
  PEND: { label: "Pendiente", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  APROB: { label: "Aprobada", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  RECH: { label: "Rechazada", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: XCircle },
  CANC: { label: "Cancelada", cls: "bg-slate-500/15 text-slate-500 border-slate-500/30", icon: XCircle },
  TOMADA: { label: "Tomada", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30", icon: CheckCircle2 },
};

export default function PortalEmpleado() {
  const { theme, isDarkMode } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"prestamos" | "vacaciones" | "solicitudes" | "capacitaciones">("vacaciones");
  const [solicitar, setSolicitar] = useState(false);

  const cargar = () => api.getMiPortalEmpleado().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  useEffect(() => { cargar(); }, []);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  // No mostramos nada si el usuario no es un empleado vinculado.
  if (loading) return null;
  if (!data || !data.vinculado) return null;

  const emp = data.empleado;
  const vac = data.vacaciones_resumen || {};
  const r = data.resumen || {};

  const TABS: [typeof tab, string, any, number][] = [
    ["vacaciones", "Vacaciones", Palmtree, (data.vacaciones || []).length],
    ["prestamos", "Préstamos", Wallet, (data.prestamos || []).length],
    ["solicitudes", "Permisos / Solicitudes", FileText, (data.solicitudes || []).length],
    ["capacitaciones", "Capacitaciones", GraduationCap, (data.capacitaciones || []).length],
  ];

  return (
    <div className={`rounded-3xl border overflow-hidden ${card}`}>
      {/* Encabezado del portal */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.10] pointer-events-none"
          style={{ background: "radial-gradient(circle at 12% 20%, #14B8A6 0, transparent 42%), radial-gradient(circle at 88% 80%, #6366F1 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-teal-500 to-indigo-600">
              <BadgeCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>Mi portal del empleado</h2>
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm mt-0.5 ${theme.textSecondary}`}>
                <span className="inline-flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {emp.numero_empleado}</span>
                {emp.puesto_nombre && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {emp.puesto_nombre}</span>}
                {data.antiguedad_anios > 0 && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {data.antiguedad_anios} año(s) de antigüedad</span>}
              </div>
            </div>
            <button onClick={() => setSolicitar(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition bg-gradient-to-r from-teal-500 to-indigo-600">
              <Plus className="w-4 h-4" /> Solicitar
            </button>
          </div>

          {/* KPIs resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Kpi icon={Palmtree} color="#10B981" label="Días de vacaciones" value={vac.dias_disponibles ?? 0} sub={`de ${vac.dias_derecho ?? 0} por ley`} isDark={isDarkMode} theme={theme} />
            <Kpi icon={Wallet} color="#F59E0B" label="Saldo de préstamos" value={money(data.saldo_prestamos)} sub={`${r.prestamos_activos || 0} activo(s)`} isDark={isDarkMode} theme={theme} />
            <Kpi icon={FileText} color="#6366F1" label="Solicitudes pendientes" value={r.solicitudes_pendientes ?? 0} sub="por aprobar" isDark={isDarkMode} theme={theme} />
            <Kpi icon={GraduationCap} color="#0EA5E9" label="Capacitaciones" value={r.capacitaciones_total ?? 0} sub={r.capacitaciones_vencidas ? `${r.capacitaciones_vencidas} vencida(s)` : "al día"} isDark={isDarkMode} theme={theme} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 px-4 border-t border-b overflow-x-auto ${isDarkMode ? "border-white/[0.06]" : "border-slate-200"}`}>
        {TABS.map(([id, label, Icon, n]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 -mb-px whitespace-nowrap transition ${tab === id ? "border-teal-500 text-teal-500" : `border-transparent ${theme.textTertiary}`}`}>
            <Icon className="w-4 h-4" /> {label} <span className={`text-[10px] px-1 rounded ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>{n}</span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="p-5">
        {tab === "vacaciones" && <Vacaciones data={data} theme={theme} isDark={isDarkMode} />}
        {tab === "prestamos" && <Prestamos data={data} theme={theme} isDark={isDarkMode} />}
        {tab === "solicitudes" && <Solicitudes data={data} theme={theme} isDark={isDarkMode} />}
        {tab === "capacitaciones" && <Capacitaciones data={data} theme={theme} isDark={isDarkMode} />}
      </div>

      {solicitar && (
        <SolicitudModal data={data} theme={theme} isDark={isDarkMode}
          onClose={() => setSolicitar(false)}
          onSaved={() => { setSolicitar(false); setLoading(true); cargar(); setTab("solicitudes"); }} />
      )}
    </div>
  );
}

function SolicitudModal({ data, theme, isDark, onClose, onSaved }: any) {
  const tipos: any[] = data.tipos_solicitud || [];
  const [tipoId, setTipoId] = useState<number | "">(tipos[0]?.id ?? "");
  const [f, setF] = useState({ fecha_inicio: "", fecha_fin: "", dias: "", monto: "", cuotas: "", motivo: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const tipo = tipos.find((t) => t.id === Number(tipoId));
  const cat = tipo?.categoria;
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;

  // Calcula días entre fechas automáticamente.
  const calcDias = (ini: string, fin: string) => {
    if (!ini || !fin) return "";
    const d = Math.round((new Date(fin).getTime() - new Date(ini).getTime()) / 86400000) + 1;
    return d > 0 ? String(d) : "";
  };

  const guardar = async () => {
    if (!tipoId) { alert("Selecciona el tipo de solicitud."); return; }
    if (!f.fecha_inicio) { alert("Indica la fecha de inicio."); return; }
    setBusy(true);
    const payload: any = {
      empresa: data.empresa_id, empleado: data.empleado_id, tipo: tipoId,
      fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin || null,
      dias: Number(f.dias) || 0, motivo: f.motivo || "", estado: "PEND",
    };
    if (cat === "PRESTAMO") {
      payload.monto = f.monto ? Number(f.monto) : null;
      payload.cuotas = f.cuotas ? Number(f.cuotas) : null;
    }
    try { await api.crearSolicitudRH(payload); onSaved(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-teal-600 to-indigo-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Send className="w-4 h-4" /> Nueva solicitud</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          {tipos.length === 0 ? (
            <p className={`text-sm ${theme.textTertiary}`}>No hay tipos de solicitud configurados. Pide a RH que los habilite.</p>
          ) : (
            <>
              <div>
                <label className={lbl}>Tipo de solicitud *</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {tipos.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTipoId(t.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-sm ${tipoId === t.id ? "border-teal-500" : isDark ? "border-white/[0.08]" : "border-slate-200"}`}
                      style={tipoId === t.id ? { background: (t.color || "#14B8A6") + "15" } : {}}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color || "#14B8A6" }} />
                        <span className={`font-bold ${theme.textPrimary}`}>{t.nombre}</span>
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"}`}>{t.categoria}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{cat === "PRESTAMO" ? "Fecha" : "Inicio"} *</label>
                  <input type="date" className={inp} value={f.fecha_inicio}
                    onChange={(e) => { set("fecha_inicio", e.target.value); if (f.fecha_fin) set("dias", calcDias(e.target.value, f.fecha_fin)); }} />
                </div>
                {cat !== "PRESTAMO" && (
                  <div>
                    <label className={lbl}>Fin</label>
                    <input type="date" className={inp} value={f.fecha_fin}
                      onChange={(e) => { set("fecha_fin", e.target.value); set("dias", calcDias(f.fecha_inicio, e.target.value)); }} />
                  </div>
                )}
              </div>
              {cat !== "PRESTAMO" && (
                <div><label className={lbl}>Días</label><input type="number" className={inp} value={f.dias} onChange={(e) => set("dias", e.target.value)} placeholder="Se calcula con las fechas" /></div>
              )}
              {cat === "PRESTAMO" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Monto solicitado *</label><input type="number" className={inp} value={f.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0.00" /></div>
                  <div><label className={lbl}>Cuotas</label><input type="number" className={inp} value={f.cuotas} onChange={(e) => set("cuotas", e.target.value)} placeholder="12" /></div>
                </div>
              )}
              <div><label className={lbl}>Motivo / comentarios</label><textarea rows={2} className={inp} value={f.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Describe brevemente tu solicitud." /></div>
              {tipo?.requiere_documento && <p className="text-[11px] text-amber-500">Este tipo de solicitud requiere documento de soporte; podrás adjuntarlo desde RH.</p>}
            </>
          )}
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy || tipos.length === 0} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-teal-500 to-indigo-600">{busy ? "Enviando…" : "Enviar solicitud"}</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value, sub, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-3.5 ${isDark ? "bg-[#0F172A]/60 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span>
        <span className={`text-xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span>
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
      {sub && <div className={`text-[10px] ${theme.textTertiary}`}>{sub}</div>}
    </div>
  );
}

function Vacio({ icon: Icon, texto, theme }: any) {
  return (
    <div className={`text-center py-8 ${theme.textTertiary}`}>
      <Icon className="w-9 h-9 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}

function Vacaciones({ data, theme, isDark }: any) {
  const vac = data.vacaciones_resumen || {};
  const items = data.vacaciones || [];
  const pct = vac.dias_derecho ? Math.round((vac.dias_disponibles / vac.dias_derecho) * 100) : 0;
  return (
    <div className="space-y-4">
      {/* Barra de saldo */}
      <div className={`rounded-2xl border p-4 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${theme.textPrimary}`}>Saldo de vacaciones</span>
          <span className="text-sm font-black text-emerald-500">{vac.dias_disponibles ?? 0} días disponibles</span>
        </div>
        <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-slate-200"}`}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className={`flex justify-between text-[11px] mt-1.5 ${theme.textTertiary}`}>
          <span>Tomados: <b>{vac.dias_tomados ?? 0}</b></span>
          <span>Por ley (LFT): <b>{vac.dias_derecho ?? 0}</b></span>
        </div>
      </div>
      {items.length === 0 ? <Vacio icon={Palmtree} texto="No tienes vacaciones registradas." theme={theme} />
        : <div className="space-y-2">
          {items.map((v: any) => {
            const e = EST_SOL[v.estado] || EST_SOL.PEND;
            return (
              <div key={v.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <Palmtree className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className={`text-sm font-bold ${theme.textPrimary}`}>{v.fecha_inicio} → {v.fecha_fin}</div>
                    <div className={`text-[11px] ${theme.textTertiary}`}>{v.dias} día(s){v.notas ? ` · ${v.notas}` : ""}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${e.cls}`}>{e.label}</span>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

function Prestamos({ data, theme, isDark }: any) {
  const items = data.prestamos || [];
  if (items.length === 0) return <Vacio icon={Wallet} texto="No tienes préstamos registrados." theme={theme} />;
  return (
    <div className="space-y-2">
      {items.map((p: any) => {
        const activo = String(p.estado).toUpperCase() === "ACTIVO";
        const pagado = p.monto ? Math.round(((Number(p.monto) - Number(p.saldo)) / Number(p.monto)) * 100) : 0;
        return (
          <div key={p.id} className={`rounded-xl border p-3 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <div>
                  <div className={`text-sm font-bold ${theme.textPrimary}`}>{money(p.monto)} <span className={`text-[11px] font-normal ${theme.textTertiary}`}>en {p.cuotas} cuota(s)</span></div>
                  <div className={`text-[11px] ${theme.textTertiary}`}>Otorgado: {p.fecha_otorgamiento} · Cuota: {money(p.descuento_por_cuota)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-amber-600">{money(p.saldo)}</div>
                <div className={`text-[10px] font-bold uppercase ${activo ? "text-amber-500" : "text-emerald-500"}`}>{activo ? "Pendiente" : "Liquidado"}</div>
              </div>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden mt-2 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min(100, pagado)}%` }} />
            </div>
            <div className={`text-[10px] mt-1 ${theme.textTertiary}`}>{pagado}% pagado</div>
          </div>
        );
      })}
    </div>
  );
}

function Solicitudes({ data, theme, isDark }: any) {
  const items = data.solicitudes || [];
  if (items.length === 0) return <Vacio icon={FileText} texto="No has hecho solicitudes ni permisos." theme={theme} />;
  return (
    <div className="space-y-2">
      {items.map((s: any) => {
        const e = EST_SOL[s.estado] || EST_SOL.PEND;
        return (
          <div key={s.id} className={`flex items-start justify-between gap-2 rounded-xl border p-3 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
            <div className="flex items-start gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: (s.tipo_color || "#6366F1") + "22", color: s.tipo_color || "#6366F1" }}>
                <FileText className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-bold ${theme.textPrimary}`}>{s.tipo_nombre || "Solicitud"}</div>
                <div className={`text-[11px] ${theme.textTertiary}`}>
                  {s.fecha_inicio}{s.fecha_fin ? ` → ${s.fecha_fin}` : ""}{s.dias ? ` · ${s.dias} día(s)` : ""}{s.monto ? ` · ${money(s.monto)}` : ""}
                </div>
                {s.motivo && <div className={`text-[11px] mt-0.5 line-clamp-1 ${theme.textSecondary}`}>{s.motivo}</div>}
              </div>
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${e.cls}`}>{e.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Capacitaciones({ data, theme, isDark }: any) {
  const items = data.capacitaciones || [];
  if (items.length === 0) return <Vacio icon={GraduationCap} texto="No estás inscrito en capacitaciones." theme={theme} />;
  const EST: Record<string, string> = {
    PROGRAMADA: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    IMPARTIDA: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    VENCIDA: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  };
  return (
    <div className="space-y-2">
      {items.map((c: any) => (
        <div key={c.id} className={`rounded-xl border p-3 ${c.vencida ? "border-rose-500/30" : isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <GraduationCap className={`w-4 h-4 shrink-0 mt-0.5 ${c.vencida ? "text-rose-500" : "text-sky-500"}`} />
              <div className="min-w-0">
                <div className={`text-sm font-bold ${theme.textPrimary}`}>{c.curso}</div>
                <div className={`text-[11px] ${theme.textTertiary}`}>
                  {c.instructor ? `Instructor: ${c.instructor}` : ""}{c.fecha ? ` · ${c.fecha}` : ""}
                  {c.fecha_vencimiento ? ` · vence ${c.fecha_vencimiento}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.calificacion != null && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500"><Award className="w-3.5 h-3.5" /> {c.calificacion}</span>}
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${EST[c.estado] || EST.PROGRAMADA}`}>{c.vencida ? "Vencida" : c.estado}</span>
            </div>
          </div>
          {/* Acciones: constancia / evidencia */}
          {(c.puede_constancia || c.evidencia_url) && (
            <div className="flex items-center gap-3 mt-2 pl-6">
              {c.puede_constancia && c.participante_id && (
                <button onClick={() => api.abrirConstanciaParticipante(c.participante_id).catch((e: any) => alert((e as Error).message))}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-400">
                  <Award className="w-3.5 h-3.5" /> Descargar constancia
                </button>
              )}
              {c.evidencia_url && (
                <a href={c.evidencia_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Evidencia
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
