"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Edit3, Fuel, GaugeCircle, Hash,
  Save, Trash2, Truck, Wrench, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

const NUM = (v: any, dec = 2) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(v || 0));

const COMBUSTIBLES = ["DIESEL", "GASOLINA", "GAS_LP", "GAS_NATURAL", "HIBRIDO", "ELECTRICO", "OTRO"];

const ESTADO: Record<string, { label: string; cls: string }> = {
  VENCIDO: { label: "Vencido", cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  PROXIMO: { label: "Próximo", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  OK:      { label: "OK",      cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
};

function estadoDe(pend: number, intervalo: number) {
  if (pend <= 0) return "VENCIDO";
  if (pend <= intervalo * 0.15) return "PROXIMO";
  return "OK";
}

export default function UnidadDetallePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();

  const [u, setU] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.getUnidad(id);
      if (!r || !r.id) { setNotFound(true); return; }
      setU(r); setEdit(r);
    } catch { setNotFound(true); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setBusy(true);
    try {
      const r = await api.actualizarUnidad(id, {
        numero: edit.numero, placas: edit.placas, vin: edit.vin,
        marca: edit.marca, modelo: edit.modelo,
        anio: edit.anio ? Number(edit.anio) : null, color: edit.color,
        tipo: edit.tipo, tipo_combustible: edit.tipo_combustible,
        km_actual: edit.km_actual || 0,
        intervalo_km_preventivo: edit.intervalo_km_preventivo || 0,
        km_ultimo_servicio: edit.km_ultimo_servicio || 0,
        fecha_ultimo_servicio: edit.fecha_ultimo_servicio || null,
        notas: edit.notas,
      });
      setU(r); setEdit(r); setEditing(false);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar la unidad "${u.numero}"? Esta acción no se puede deshacer.`)) return;
    try { await api.eliminarUnidad(id); router.push("/flota"); }
    catch (e) { alert((e as Error).message); }
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-10 text-center">
        <Truck className={`w-14 h-14 mx-auto mb-3 ${theme.textTertiary}`} />
        <h2 className={`text-lg font-black ${theme.textPrimary}`}>Unidad no encontrada</h2>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>La unidad #{id} no existe o no tienes acceso.</p>
        <button onClick={() => router.push("/flota")}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600">
          Volver a Flota
        </button>
      </div>
    );
  }
  if (!u) return <div className={`p-10 text-center ${theme.textTertiary}`}>Cargando…</div>;

  const actual = Number(u.km_actual || 0);
  const base = Number(u.km_ultimo_servicio || 0);
  const intervalo = Number(u.intervalo_km_preventivo || 0);
  const prox = base + intervalo;
  const pend = prox - actual;
  const estado = estadoDe(pend, intervalo);
  const e = ESTADO[estado];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/flota")}
            className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-amber-500 to-orange-600">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>{u.numero}</h1>
            <p className={`text-xs font-mono ${theme.textTertiary}`}>
              {u.placas || "sin placas"}{u.marca ? ` · ${u.marca} ${u.modelo || ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEdit(u); setEditing(false); }}
                className={`px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={busy}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-amber-500 to-orange-600">
                <Save className="w-4 h-4" /> {busy ? "Guardando…" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={eliminar}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
              <button onClick={() => setEditing(true)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                <Edit3 className="w-4 h-4" /> Editar
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs de mantenimiento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat isDark={isDarkMode} accent="from-emerald-500 to-teal-600" icon={GaugeCircle} label="Km actual" value={NUM(actual)} />
        <Stat isDark={isDarkMode} accent="from-blue-500 to-indigo-600" icon={Wrench} label="Próximo servicio" value={NUM(prox)} sub={`cada ${NUM(intervalo, 0)} km`} />
        <Stat isDark={isDarkMode} accent={pend <= 0 ? "from-rose-500 to-pink-600" : "from-amber-500 to-orange-600"} icon={AlertTriangle} label="Km pendientes" value={NUM(pend)} />
        <div className={`rounded-2xl border p-4 flex flex-col justify-center ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
          <div className={`text-[11px] uppercase tracking-wider font-bold mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Estado preventivo</div>
          <span className={`inline-flex items-center gap-1 self-start text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${e.cls}`}>
            {estado === "OK" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {e.label}
          </span>
        </div>
      </div>

      {/* Datos de la unidad */}
      <Card isDark={isDarkMode}>
        <Title icon={Hash} title="Datos de la unidad" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          <FieldView isDark={isDarkMode} theme={theme} label="Número económico" editing={editing} value={edit?.numero} onChange={(v) => setEdit({ ...edit, numero: v })} mono />
          <FieldView isDark={isDarkMode} theme={theme} label="Placas" editing={editing} value={edit?.placas} onChange={(v) => setEdit({ ...edit, placas: v })} mono />
          <FieldView isDark={isDarkMode} theme={theme} label="VIN" editing={editing} value={edit?.vin} onChange={(v) => setEdit({ ...edit, vin: v })} mono />
          <FieldView isDark={isDarkMode} theme={theme} label="Tipo" editing={editing} value={edit?.tipo} onChange={(v) => setEdit({ ...edit, tipo: v })} />
          <FieldView isDark={isDarkMode} theme={theme} label="Marca" editing={editing} value={edit?.marca} onChange={(v) => setEdit({ ...edit, marca: v })} />
          <FieldView isDark={isDarkMode} theme={theme} label="Modelo" editing={editing} value={edit?.modelo} onChange={(v) => setEdit({ ...edit, modelo: v })} />
          <FieldView isDark={isDarkMode} theme={theme} label="Año" editing={editing} value={edit?.anio} onChange={(v) => setEdit({ ...edit, anio: v })} type="number" />
          <FieldView isDark={isDarkMode} theme={theme} label="Color" editing={editing} value={edit?.color} onChange={(v) => setEdit({ ...edit, color: v })} />
          {editing ? (
            <div>
              <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Combustible</label>
              <select value={edit?.tipo_combustible || "DIESEL"} onChange={(ev) => setEdit({ ...edit, tipo_combustible: ev.target.value })}
                className={`mt-1 w-full px-3 py-1.5 rounded-lg text-sm border ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                {COMBUSTIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <FieldView isDark={isDarkMode} theme={theme} label="Combustible" value={u.tipo_combustible} icon={Fuel} />
          )}
        </div>
      </Card>

      {/* Mantenimiento preventivo */}
      <Card isDark={isDarkMode}>
        <Title icon={Wrench} title="Mantenimiento preventivo" accent="text-cyan-500" />
        <p className={`text-xs mt-1 ${theme.textTertiary}`}>
          Estos valores alimentan el <b>Tablero Preventivo</b>. El próximo servicio = último servicio + intervalo.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          <FieldView isDark={isDarkMode} theme={theme} label="Km actual (odómetro)" editing={editing} value={edit?.km_actual} onChange={(v) => setEdit({ ...edit, km_actual: v })} type="number" />
          <FieldView isDark={isDarkMode} theme={theme} label="Intervalo de servicio (km)" editing={editing} value={edit?.intervalo_km_preventivo} onChange={(v) => setEdit({ ...edit, intervalo_km_preventivo: v })} type="number" />
          <FieldView isDark={isDarkMode} theme={theme} label="Km del último servicio" editing={editing} value={edit?.km_ultimo_servicio} onChange={(v) => setEdit({ ...edit, km_ultimo_servicio: v })} type="number" />
          <FieldView isDark={isDarkMode} theme={theme} label="Fecha último servicio" editing={editing} value={edit?.fecha_ultimo_servicio} onChange={(v) => setEdit({ ...edit, fecha_ultimo_servicio: v })} type="date" />
        </div>
        <div className="mt-3">
          <button onClick={() => router.push("/mantenimiento/preventivo")}
            className="text-xs font-bold text-cyan-500 hover:underline inline-flex items-center gap-1">
            <GaugeCircle className="w-3.5 h-3.5" /> Ver Tablero Preventivo
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return <div className={`rounded-3xl border p-5 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>{children}</div>;
}
function Title({ icon: Icon, title, accent = "text-amber-500" }: { icon: any; title: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${accent}`} />
      <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
    </div>
  );
}
function Stat({ isDark, accent, icon: Icon, label, value, sub }: {
  isDark: boolean; accent: string; icon: any; label: string; value: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className={`absolute -right-7 -top-7 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.16]`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-gradient-to-br ${accent} shadow-sm`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-black mt-0.5 tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}
function FieldView({ isDark, theme, label, value, editing, onChange, type = "text", mono, icon: Icon }: {
  isDark: boolean; theme: any; label: string; value: any; editing?: boolean;
  onChange?: (v: string) => void; type?: string; mono?: boolean; icon?: any;
}) {
  return (
    <div>
      <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</label>
      {editing && onChange ? (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type}
          className={`mt-1 w-full px-3 py-1.5 rounded-lg text-sm border ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"} ${mono ? "font-mono" : ""}`} />
      ) : (
        <div className={`mt-1 text-sm font-bold flex items-center gap-1.5 ${theme.textPrimary} ${mono ? "font-mono" : ""}`}>
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {value !== undefined && value !== null && value !== "" ? value : "—"}
        </div>
      )}
    </div>
  );
}
