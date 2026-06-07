"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle,
  RefreshCw, Save, Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

export default function ConfigNominaPage() {
  const { empresaActivaId } = useUser();
  const [data, setData] = useState<any>({
    proveedor: "FACTURA_COM",
    pac_endpoint: "https://sandbox.factura.com",
    pac_sandbox: true,
    serie_default: "N",
    riesgo_puesto_default: "1",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; txt: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!empresaActivaId) return;
      setLoading(true);
      try {
        const r = await api.getConfigNomina(empresaActivaId);
        if (r.results && r.results[0]) setData({ ...data, ...r.results[0] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      } catch { /* */ } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActivaId]);

  const save = async () => {
    if (!empresaActivaId) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...data, empresa: empresaActivaId };
      const r = await api.upsertConfigNomina(payload);
      setData((p: any) => ({ ...p, ...r }));
      setMsg({ kind: "ok", txt: "Configuracion guardada." });
    } catch (e) {
      setMsg({ kind: "err", txt: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const setField = (k: string, v: any) => setData((p: any) => ({ ...p, [k]: v }));
  const inp = "w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 transition-colors";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613] relative">
      <div className="relative max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/nomina" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft size={13} /> Volver al panel de nomina
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl" style={{ background: "linear-gradient(120deg,#10B981 0%,#14B8A6 50%,#0EA5E9 100%)" }}>
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center shadow-lg shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Datos patronales de nómina</h1>
              <p className="text-sm text-white/80">Registro patronal, riesgo de puesto y serie para los recibos de nómina.</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
            msg.kind === "ok"
              ? "bg-emerald-50 dark:bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
              : "bg-rose-50 dark:bg-rose-500/[0.08] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
          }`}>
            {msg.kind === "ok" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {msg.txt}
          </div>
        )}

        {/* Nota: el PAC se configura una sola vez a nivel empresa */}
        <div className="bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 ring-1 ring-emerald-200/50 dark:ring-emerald-400/25">
            <Zap size={18} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">El PAC se configura en la empresa</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-1">
              La nómina timbra con las mismas credenciales de Factura.com que las facturas y la Carta Porte.
              Captúralas una sola vez en <Link href="/admin/configuracion" className="font-bold underline">Configuración de empresa</Link>.
              Aquí solo defines los datos patronales para los recibos.
            </p>
          </div>
        </div>

        {/* Seccion datos patronales */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-500" />
            <h2 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">Datos patronales</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl>Registro Patronal IMSS</Lbl>
              <input value={data.registro_patronal || ""} onChange={(e) => setField("registro_patronal", e.target.value)} placeholder="Y1234567890" className={`${inp} font-mono uppercase`} />
            </div>
            <div>
              <Lbl>RFC Patron Origen (opcional)</Lbl>
              <input value={data.rfc_patron_origen || ""} onChange={(e) => setField("rfc_patron_origen", e.target.value.toUpperCase())} placeholder="Si emite por terceros" className={`${inp} font-mono uppercase`} />
            </div>
            <div>
              <Lbl>Riesgo de puesto por defecto</Lbl>
              <select value={data.riesgo_puesto_default || "1"} onChange={(e) => setField("riesgo_puesto_default", e.target.value)} className={inp}>
                <option value="1">1 · Clase I (Riesgo minimo)</option>
                <option value="2">2 · Clase II (Riesgo bajo)</option>
                <option value="3">3 · Clase III (Riesgo medio)</option>
                <option value="4">4 · Clase IV (Riesgo alto)</option>
                <option value="5">5 · Clase V (Riesgo maximo)</option>
              </select>
            </div>
            <div>
              <Lbl>Serie CFDI</Lbl>
              <input value={data.serie_default || "N"} onChange={(e) => setField("serie_default", e.target.value)} placeholder="N" className={inp} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={save} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white shadow-lg disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)", boxShadow: "0 8px 28px -8px rgba(16,185,129,0.5)" }}>
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar configuracion</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-400">{children}</label>;
}
