"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle, Eye, EyeOff,
  RefreshCw, Save, Shield, Zap,
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
  const [showSecret, setShowSecret] = useState(false);
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
        <div className="rounded-2xl border border-violet-200/60 dark:border-violet-500/15 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 dark:from-violet-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 p-5 sm:p-6 shadow-sm dark:backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center ring-1 ring-violet-200 dark:ring-violet-400/30 shrink-0">
              <Shield size={20} className="text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Configuracion PAC + Datos patronales</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Credenciales para timbrar nomina (Factura.com) y datos del registro patronal.</p>
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

        {/* Seccion PAC */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-emerald-500" />
            <h2 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">PAC (Factura.com)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl>Proveedor</Lbl>
              <select value={data.proveedor || "FACTURA_COM"} onChange={(e) => setField("proveedor", e.target.value)} className={inp}>
                <option value="FACTURA_COM">Factura.com</option>
                <option value="OTRO">Otro PAC</option>
              </select>
            </div>
            <div>
              <Lbl>Ambiente</Lbl>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setField("pac_sandbox", true); setField("pac_endpoint", "https://sandbox.factura.com"); }}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${data.pac_sandbox ? "bg-amber-500 text-white border-transparent" : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"}`}>
                  Sandbox · Pruebas
                </button>
                <button type="button" onClick={() => { setField("pac_sandbox", false); setField("pac_endpoint", "https://api.factura.com"); }}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${!data.pac_sandbox ? "bg-rose-600 text-white border-transparent" : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"}`}>
                  Produccion · LIVE
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Lbl>Endpoint base</Lbl>
              <input value={data.pac_endpoint || ""} onChange={(e) => setField("pac_endpoint", e.target.value)} placeholder="https://sandbox.factura.com" className={inp} />
            </div>
            <div>
              <Lbl>API Key (F-Api-Key)</Lbl>
              <input value={data.pac_api_key || ""} onChange={(e) => setField("pac_api_key", e.target.value)} placeholder="F-PLUGIN-API-KEY" className={`${inp} font-mono`} />
            </div>
            <div>
              <Lbl>Secret Key (F-Secret-Key)</Lbl>
              <div className="relative">
                <input type={showSecret ? "text" : "password"} value={data.pac_secret_key || ""} onChange={(e) => setField("pac_secret_key", e.target.value)}
                  placeholder="F-PLUGIN-SECRET-KEY" className={`${inp} font-mono pr-10`} />
                <button type="button" onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Seccion datos patronales */}
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] p-5 sm:p-6 space-y-4">
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
