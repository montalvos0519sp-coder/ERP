"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, GaugeCircle, RefreshCw, Search,
  Settings2, Snowflake, Truck, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

type Tab = "motor" | "thermo";

const NUM = (v: number | string | undefined, dec = 2) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(v || 0));

const ESTADO: Record<string, { label: string; cls: string; cell: string }> = {
  VENCIDO:  { label: "Vencido",  cls: "bg-rose-500/15 text-rose-500 border-rose-500/30",       cell: "bg-rose-500/15 text-rose-500" },
  PROXIMO:  { label: "Próximo",  cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",    cell: "bg-amber-500/15 text-amber-600" },
  OK:       { label: "OK",       cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", cell: "text-emerald-500" },
};

interface Row {
  id: number; unidad: string; placas?: string; tipo?: string; marca?: string; observacion?: string;
  intervalo: number; estado: string; fecha_ultimo_servicio?: string | null;
  km_base?: number; km_prox?: number; km_actual?: number; km_pendientes?: number;
  hrs_base?: number; hrs_prox?: number; hrs_actual?: number; hrs_pendientes?: number;
}

export default function PreventivoPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [tab, setTab] = useState<Tab>("motor");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [motor, setMotor] = useState<{ km_totales_flota: number; top5: Row[]; unidades: Row[] } | null>(null);
  const [thermo, setThermo] = useState<{ hrs_totales_flota: number; top5: Row[]; termos: Row[] } | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "motor") setMotor(await api.getPreventivoMotor());
      else setThermo(await api.getPreventivoThermo());
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { cargar(); }, [cargar]);

  const esMotor = tab === "motor";
  const data = esMotor ? motor : thermo;
  const filas: Row[] = (esMotor ? motor?.unidades : thermo?.termos) || [];
  const top5: Row[] = data?.top5 || [];
  const totalLabel = esMotor ? "KM TOTALES FLOTA" : "HORAS TOTALES FLOTA";
  const totalValor = esMotor ? motor?.km_totales_flota : thermo?.hrs_totales_flota;
  const unidadMedida = esMotor ? "km" : "hrs";

  const ql = q.trim().toLowerCase();
  const visibles = useMemo(
    () => !ql ? filas : filas.filter((r) =>
      (r.unidad || "").toLowerCase().includes(ql) ||
      (r.placas || "").toLowerCase().includes(ql) ||
      (r.marca || "").toLowerCase().includes(ql)),
    [filas, ql],
  );

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const pend = (r: Row) => esMotor ? r.km_pendientes : r.hrs_pendientes;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/mantenimiento")}
            className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-cyan-500 to-blue-600">
            <GaugeCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Tablero Preventivo</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Próximos servicios por kilometraje (motor) y por horas (Thermo King).</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl text-white font-black text-sm shadow-md bg-gradient-to-r from-cyan-500 to-blue-600">
            <span className="opacity-80 text-[10px] block uppercase tracking-wider">{totalLabel}</span>
            {loading ? "…" : `${NUM(totalValor)} ${unidadMedida}`}
          </div>
          <button onClick={cargar} disabled={loading}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabBtn active={tab === "motor"} onClick={() => setTab("motor")} icon={Truck} label="Motor (km)" isDark={isDarkMode} />
        <TabBtn active={tab === "thermo"} onClick={() => setTab("thermo")} icon={Snowflake} label="Thermo King (hrs)" isDark={isDarkMode} />
      </div>

      {/* Top 5 */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Top 5 · {esMotor ? "Unidades" : "Thermos"} próximas a servicio
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Unidad</Th><Th align="right">{esMotor ? "Km" : "Hrs"} pendientes</Th><Th align="center">Estado</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className={`py-6 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : top5.length === 0 ? (
                <tr><td colSpan={3} className={`py-6 text-center ${theme.textTertiary}`}>Sin unidades registradas.</td></tr>
              ) : top5.map((r) => (
                <tr key={r.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-black ${theme.textPrimary}`}>{r.unidad}</span></Td>
                  <Td align="right"><span className="font-black tabular-nums text-amber-600">{NUM(pend(r))} {unidadMedida}</span></Td>
                  <Td align="center"><EstadoPill estado={r.estado} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle general */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#0B1220] to-[#0B2942] flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-cyan-300 uppercase tracking-wider">
            Detalle general de {esMotor ? "flota" : "thermos"}
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar unidad…"
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-xs placeholder:text-white/50 outline-none focus:bg-white/20 w-44" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Unidad</Th>
                <Th align="right">{esMotor ? "Km base" : "Hrs base"} (últ. servicio)</Th>
                <Th align="right">Intervalo</Th>
                <Th align="right">{esMotor ? "Km próx" : "Hrs próx"}</Th>
                <Th align="right">{esMotor ? "Km actual" : "Hrs actual"}</Th>
                <Th align="right">Pendientes</Th>
                <Th align="center">Estado</Th>
                <Th>Últ. servicio</Th>
                <Th align="center">Config</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : visibles.length === 0 ? (
                <tr><td colSpan={9} className={`py-10 text-center ${theme.textTertiary}`}>
                  {filas.length === 0 ? "No hay unidades en flota. Agrégalas en el módulo de Flota." : `Sin coincidencias para "${q}".`}
                </td></tr>
              ) : visibles.map((r) => {
                const e = ESTADO[r.estado] || ESTADO.OK;
                return (
                  <tr key={r.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                    <Td>
                      <span className={`font-black ${theme.textPrimary}`}>{r.unidad}</span>
                      {(r.placas || r.marca) && <span className={`block text-[11px] ${theme.textTertiary}`}>{r.placas || r.marca}</span>}
                    </Td>
                    <Td align="right"><span className={theme.textSecondary}>{NUM(esMotor ? r.km_base : r.hrs_base)}</span></Td>
                    <Td align="right"><span className={theme.textTertiary}>{NUM(r.intervalo)}</span></Td>
                    <Td align="right"><span className="font-bold text-blue-500 tabular-nums">{NUM(esMotor ? r.km_prox : r.hrs_prox)}</span></Td>
                    <Td align="right"><span className="font-bold text-emerald-500 tabular-nums">{NUM(esMotor ? r.km_actual : r.hrs_actual)}</span></Td>
                    <Td align="right">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-black tabular-nums ${e.cell}`}>{NUM(pend(r))}</span>
                    </Td>
                    <Td align="center"><EstadoPill estado={r.estado} /></Td>
                    <Td><span className={`text-xs ${theme.textTertiary}`}>{r.fecha_ultimo_servicio ? new Date(r.fecha_ultimo_servicio).toLocaleDateString("es-MX") : "—"}</span></Td>
                    <Td align="center">
                      <button onClick={() => setEditRow(r)} title="Configurar intervalo"
                        className="p-1.5 rounded-lg text-cyan-500 hover:bg-cyan-500/15">
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && (
        <ConfigModal row={editRow} esMotor={esMotor} isDark={isDarkMode}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); cargar(); }} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, isDark }: {
  active: boolean; onClick: () => void; icon: any; label: string; isDark: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
        active
          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-md"
          : isDark ? "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const e = ESTADO[estado] || ESTADO.OK;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${e.cls}`}>
      {estado === "OK" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {e.label}
    </span>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${a}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return <td className={`px-3 py-2.5 ${a}`}>{children}</td>;
}

function ConfigModal({ row, esMotor, isDark, onClose, onSaved }: {
  row: Row; esMotor: boolean; isDark: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [intervalo, setIntervalo] = useState(String(row.intervalo ?? ""));
  const [ultimo, setUltimo] = useState(String((esMotor ? row.km_base : row.hrs_base) ?? ""));
  const [actual, setActual] = useState(String((esMotor ? row.km_actual : row.hrs_actual) ?? ""));
  const [fecha, setFecha] = useState(row.fecha_ultimo_servicio || "");
  const [busy, setBusy] = useState(false);
  const u = esMotor ? "km" : "hrs";

  const guardar = async () => {
    setBusy(true);
    try {
      if (esMotor) {
        await api.configurarUnidadPreventivo({
          id: row.id,
          intervalo_km_preventivo: intervalo,
          km_ultimo_servicio: ultimo,
          km_actual: actual,
          fecha_ultimo_servicio: fecha || null,
        });
      } else {
        await api.configurarTermoPreventivo({
          id: row.id,
          intervalo_horas_preventivo: intervalo,
          horas_ultimo_servicio: ultimo,
          horas_actual: actual,
          fecha_ultimo_servicio: fecha || null,
        });
      }
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  };

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${
    isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"
  }`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border p-6 space-y-3 ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>Configurar · {row.unidad}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
            <X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          </button>
        </div>

        <Field label={`Intervalo de servicio (${u})`} isDark={isDark}>
          <input type="number" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className={inputCls} />
        </Field>
        <Field label={`${esMotor ? "Odómetro" : "Horómetro"} del último servicio (${u})`} isDark={isDark}>
          <input type="number" value={ultimo} onChange={(e) => setUltimo(e.target.value)} className={inputCls} />
        </Field>
        <Field label={`${esMotor ? "Odómetro" : "Horómetro"} actual (${u})`} isDark={isDark}>
          <input type="number" value={actual} onChange={(e) => setActual(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Fecha del último servicio" isDark={isDark}>
          <input type="date" value={fecha || ""} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
        </Field>

        <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          El próximo servicio se calcula como <b>último servicio + intervalo</b>. Los {u} pendientes = próximo − actual.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-cyan-500 to-blue-600">
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`text-xs font-bold mb-1 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>{label}</label>
      {children}
    </div>
  );
}
