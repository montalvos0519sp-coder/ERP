"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator, RefreshCw, Save } from "lucide-react";

import { api } from "@/lib/api";
import { useUser } from "@/lib/UserContext";

const PERIODICIDAD = [
  { v: "01", l: "01 · Diario" },
  { v: "02", l: "02 · Semanal" },
  { v: "03", l: "03 · Catorcenal" },
  { v: "04", l: "04 · Quincenal" },
  { v: "05", l: "05 · Mensual" },
  { v: "06", l: "06 · Bimestral" },
];

export default function NuevoPeriodoPage() {
  const router = useRouter();
  const { empresaActivaId } = useUser();
  const hoy = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState({
    nombre: "",
    tipo_nomina: "O",
    periodicidad_pago: "04",
    fecha_inicio: hoy,
    fecha_fin: hoy,
    fecha_pago: hoy,
    num_dias_pagados: 15,
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: any) => setData((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!data.nombre.trim()) { setErr("Captura un nombre."); return; }
    if (!empresaActivaId) { setErr("Sin empresa activa."); return; }
    setSaving(true);
    setErr(null);
    try {
      const r = await api.crearPeriodoNomina({ ...data, empresa: empresaActivaId });
      router.push(`/nomina/periodos/${r.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  };

  const inp = "w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070613]">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/nomina/periodos" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft size={13} /> Volver a periodos
        </Link>

        <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 p-5 sm:p-6 dark:backdrop-blur-xl">
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Calculator className="text-emerald-500" /> Nuevo periodo
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Define las fechas y la periodicidad. Despues podras cargar los empleados.</p>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-300">{err}</div>
        )}

        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/[0.06] p-5 sm:p-6 space-y-4">
          <div>
            <Lbl>Nombre del periodo *</Lbl>
            <input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: 1ra quincena Mayo 2026" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl>Tipo de nomina</Lbl>
              <select value={data.tipo_nomina} onChange={(e) => set("tipo_nomina", e.target.value)} className={inp}>
                <option value="O">O · Ordinaria</option>
                <option value="E">E · Extraordinaria (finiquito, indemnizacion, etc.)</option>
              </select>
            </div>
            <div>
              <Lbl>Periodicidad de pago</Lbl>
              <select value={data.periodicidad_pago} onChange={(e) => set("periodicidad_pago", e.target.value)} className={inp}>
                {PERIODICIDAD.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Fecha inicio</Lbl>
              <input type="date" value={data.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} className={inp} />
            </div>
            <div>
              <Lbl>Fecha fin</Lbl>
              <input type="date" value={data.fecha_fin} onChange={(e) => set("fecha_fin", e.target.value)} className={inp} />
            </div>
            <div>
              <Lbl>Fecha de pago</Lbl>
              <input type="date" value={data.fecha_pago} onChange={(e) => set("fecha_pago", e.target.value)} className={inp} />
            </div>
            <div>
              <Lbl>Dias pagados</Lbl>
              <input type="number" min={1} max={31} value={data.num_dias_pagados} onChange={(e) => set("num_dias_pagados", parseInt(e.target.value, 10) || 0)} className={inp} />
            </div>
          </div>
          <div>
            <Lbl>Descripcion (opcional)</Lbl>
            <textarea rows={2} value={data.descripcion} onChange={(e) => set("descripcion", e.target.value)} className={inp + " resize-y"} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/nomina/periodos" className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">Cancelar</Link>
          <button onClick={submit} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white shadow-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)", boxShadow: "0 8px 28px -8px rgba(16,185,129,0.5)" }}>
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Crear periodo</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-400">{children}</label>;
}
