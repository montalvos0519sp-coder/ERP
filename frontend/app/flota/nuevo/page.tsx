"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Calendar, FileText, Fuel, Link2, Save, Shield, Snowflake, Truck,
} from "lucide-react";

import { SatCombobox } from "@/components/ui";
import { api, apiFetch, API_BASE } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface UnidadForm {
  // Identificacion
  numero: string;
  placas: string;
  vin: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  tipo: string;
  // SAT Carta Porte
  config_vehicular: string;
  peso_bruto_vehicular: string;
  permiso_sct: string;
  numero_permiso_sct: string;
  aseguradora_resp_civil: string;
  poliza_resp_civil: string;
  aseguradora_med_ambiente: string;
  poliza_med_ambiente: string;
  aseguradora_carga: string;
  poliza_carga: string;
  prima_seguro_carga: string;
  // Remolques
  remolque1_subtipo: string;
  remolque1_placa: string;
  remolque2_subtipo: string;
  remolque2_placa: string;
  // Capacidades
  capacidad_carga_kg: string;
  capacidad_combustible_litros: string;
  tipo_combustible: string;
  rendimiento_promedio_kml: string;
  // Operativo
  km_actual: string;
  fecha_adquisicion: string;
  valor_factura: string;
  proveedor_compra: string;
  notas: string;
  // Vigencias
  fecha_tarjeta_circulacion: string;
  fecha_verificacion_vence: string;
  fecha_seguro_vence: string;
  fecha_revista_vence: string;
}

const VACIO: UnidadForm = {
  numero: "", placas: "", vin: "", marca: "", modelo: "", anio: "", color: "", tipo: "",
  config_vehicular: "", peso_bruto_vehicular: "", permiso_sct: "", numero_permiso_sct: "",
  aseguradora_resp_civil: "", poliza_resp_civil: "",
  aseguradora_med_ambiente: "", poliza_med_ambiente: "",
  aseguradora_carga: "", poliza_carga: "", prima_seguro_carga: "",
  remolque1_subtipo: "", remolque1_placa: "", remolque2_subtipo: "", remolque2_placa: "",
  capacidad_carga_kg: "", capacidad_combustible_litros: "", tipo_combustible: "DIESEL",
  rendimiento_promedio_kml: "",
  km_actual: "", fecha_adquisicion: "", valor_factura: "", proveedor_compra: "", notas: "",
  fecha_tarjeta_circulacion: "", fecha_verificacion_vence: "",
  fecha_seguro_vence: "", fecha_revista_vence: "",
};

const TIPO_COMBUSTIBLE_OPTIONS = [
  { v: "DIESEL", l: "Diesel" },
  { v: "GASOLINA", l: "Gasolina" },
  { v: "GAS_LP", l: "Gas LP" },
  { v: "GAS_NATURAL", l: "Gas natural" },
  { v: "HIBRIDO", l: "Hibrido" },
  { v: "ELECTRICO", l: "Electrico" },
  { v: "OTRO", l: "Otro" },
];

export default function UnidadNuevaPage() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [form, setForm] = useState<UnidadForm>(VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Termo (equipo de refrigeracion)
  const [termoFijo, setTermoFijo] = useState(false);
  const [termoId, setTermoId] = useState<number | null>(null);
  const [termos, setTermos] = useState<any[]>([]);
  useEffect(() => { api.getTermos({ activo: "true" }).then((r) => setTermos(r.results || [])).catch(() => {}); }, []);

  const set = (k: keyof UnidadForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Numero (puede preocupar al usuario que sea unique)
  const inputCls = (dark: boolean) => dark
    ? "w-full bg-[#1E293B]/40 border border-white/[0.05] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400/50 focus:shadow-[0_0_15px_rgba(96,165,250,0.1)] transition-all"
    : "w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500/50 transition-all";

  const labelCls = "block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!empresaActivaId) return setError("Sin empresa activa");
    if (!form.numero.trim()) return setError("Falta el numero economico");
    setSaving(true);
    try {
      // Convertimos strings vacios a null/numbers donde el backend lo espera.
      const payload: any = {
        empresa: empresaActivaId,
        ...form,
        anio: form.anio ? Number(form.anio) : null,
        peso_bruto_vehicular: form.peso_bruto_vehicular || 0,
        prima_seguro_carga: form.prima_seguro_carga || 0,
        capacidad_carga_kg: form.capacidad_carga_kg || 0,
        capacidad_combustible_litros: form.capacidad_combustible_litros || 0,
        rendimiento_promedio_kml: form.rendimiento_promedio_kml || 0,
        km_actual: form.km_actual || 0,
        valor_factura: form.valor_factura || 0,
        termo_fijo: termoFijo,
        termo: termoFijo ? termoId : null,
      };
      // Limpia fechas vacias.
      for (const k of [
        "fecha_adquisicion", "fecha_tarjeta_circulacion",
        "fecha_verificacion_vence", "fecha_seguro_vence", "fecha_revista_vence",
      ]) if (!payload[k]) payload[k] = null;

      await api.crearUnidad(payload);
      router.push("/flota");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la unidad");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb / volver */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Link href="/flota" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            <ArrowLeft size={14} /> Volver a Flota
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck size={16} className="text-amber-500" /> Nueva unidad
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── 1. Identificacion ──────────────────────────────────── */}
          <Section icon={<Truck size={16} className="text-blue-500" />} title="Identificacion" subtitle="Datos basicos del vehiculo." isDark={isDarkMode}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Numero economico *" >
                <input className={inputCls(isDarkMode) + " font-mono uppercase"} value={form.numero} onChange={(e) => set("numero", e.target.value.toUpperCase())} placeholder="U-001" />
              </Field>
              <Field label="Placas">
                <input className={inputCls(isDarkMode) + " font-mono uppercase"} value={form.placas} onChange={(e) => set("placas", e.target.value.toUpperCase())} placeholder="ABC-123-XYZ" />
              </Field>
              <Field label="VIN / NIV">
                <input className={inputCls(isDarkMode) + " font-mono uppercase text-xs"} value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} maxLength={17} />
              </Field>
              <Field label="Marca">
                <input className={inputCls(isDarkMode)} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Kenworth" />
              </Field>
              <Field label="Modelo">
                <input className={inputCls(isDarkMode)} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="T800" />
              </Field>
              <Field label="Anio modelo">
                <input type="number" className={inputCls(isDarkMode)} value={form.anio} onChange={(e) => set("anio", e.target.value)} placeholder="2024" />
              </Field>
              <Field label="Color">
                <input className={inputCls(isDarkMode)} value={form.color} onChange={(e) => set("color", e.target.value)} />
              </Field>
              <Field label="Tipo unidad">
                <input className={inputCls(isDarkMode)} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="Tractor / Caja seca / Plataforma" />
              </Field>
            </div>
          </Section>

          {/* ── 2. SAT Carta Porte 3.1 ─────────────────────────────── */}
          <Section icon={<FileText size={16} className="text-emerald-500" />} title="Carta Porte 3.1 (SAT)" subtitle="Campos obligatorios para timbrar Carta Porte." isDark={isDarkMode} accent="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Configuracion vehicular SAT *">
                <SatCombobox catalogo="config-vehicular" value={form.config_vehicular}
                  onChange={(v, opt) => set("config_vehicular", opt ? opt.label : v)} />
              </Field>
              <Field label="Peso bruto vehicular (toneladas) *">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"}
                  value={form.peso_bruto_vehicular} onChange={(e) => set("peso_bruto_vehicular", e.target.value)} placeholder="35.5" />
              </Field>
              <Field label="Tipo de permiso SCT *">
                <SatCombobox catalogo="tipo-permiso" value={form.permiso_sct}
                  onChange={(v, opt) => set("permiso_sct", opt ? opt.label : v)} />
              </Field>
              <Field label="Numero del permiso SCT *">
                <input className={inputCls(isDarkMode) + " font-mono"} value={form.numero_permiso_sct}
                  onChange={(e) => set("numero_permiso_sct", e.target.value)} placeholder="123ABCD" />
              </Field>
            </div>
          </Section>

          {/* ── 3. Seguros ─────────────────────────────────────────── */}
          <Section icon={<Shield size={16} className="text-rose-500" />} title="Seguros" subtitle="Responsabilidad civil obligatoria. Medio ambiente requerido para materiales peligrosos." isDark={isDarkMode} accent="rose">
            <div className="space-y-4">
              <SubBlock title="Responsabilidad civil (obligatorio)" required isDark={isDarkMode}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Aseguradora">
                    <input className={inputCls(isDarkMode)} value={form.aseguradora_resp_civil} onChange={(e) => set("aseguradora_resp_civil", e.target.value)} />
                  </Field>
                  <Field label="Numero de poliza">
                    <input className={inputCls(isDarkMode) + " font-mono"} value={form.poliza_resp_civil} onChange={(e) => set("poliza_resp_civil", e.target.value)} />
                  </Field>
                </div>
              </SubBlock>

              <SubBlock title="Medio ambiente (si transporta material peligroso)" isDark={isDarkMode}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Aseguradora">
                    <input className={inputCls(isDarkMode)} value={form.aseguradora_med_ambiente} onChange={(e) => set("aseguradora_med_ambiente", e.target.value)} />
                  </Field>
                  <Field label="Numero de poliza">
                    <input className={inputCls(isDarkMode) + " font-mono"} value={form.poliza_med_ambiente} onChange={(e) => set("poliza_med_ambiente", e.target.value)} />
                  </Field>
                </div>
              </SubBlock>

              <SubBlock title="Carga (opcional)" isDark={isDarkMode}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Aseguradora">
                    <input className={inputCls(isDarkMode)} value={form.aseguradora_carga} onChange={(e) => set("aseguradora_carga", e.target.value)} />
                  </Field>
                  <Field label="Numero de poliza">
                    <input className={inputCls(isDarkMode) + " font-mono"} value={form.poliza_carga} onChange={(e) => set("poliza_carga", e.target.value)} />
                  </Field>
                  <Field label="Prima del seguro">
                    <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.prima_seguro_carga} onChange={(e) => set("prima_seguro_carga", e.target.value)} />
                  </Field>
                </div>
              </SubBlock>
            </div>
          </Section>

          {/* ── 4. Remolques ───────────────────────────────────────── */}
          <Section icon={<Truck size={16} className="text-violet-500" />} title="Remolques" subtitle="Hasta 2 segun SAT. Solo si la unidad lleva remolque." isDark={isDarkMode} accent="violet">
            <div className="space-y-4">
              <SubBlock title="Remolque 1" isDark={isDarkMode}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Subtipo SAT">
                    <SatCombobox catalogo="subtipo-rem" value={form.remolque1_subtipo}
                      onChange={(v, opt) => set("remolque1_subtipo", opt ? opt.label : v)} />
                  </Field>
                  <Field label="Placa">
                    <input className={inputCls(isDarkMode) + " font-mono uppercase"} value={form.remolque1_placa} onChange={(e) => set("remolque1_placa", e.target.value.toUpperCase())} />
                  </Field>
                </div>
              </SubBlock>
              <SubBlock title="Remolque 2 (opcional)" isDark={isDarkMode}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Subtipo SAT">
                    <SatCombobox catalogo="subtipo-rem" value={form.remolque2_subtipo}
                      onChange={(v, opt) => set("remolque2_subtipo", opt ? opt.label : v)} />
                  </Field>
                  <Field label="Placa">
                    <input className={inputCls(isDarkMode) + " font-mono uppercase"} value={form.remolque2_placa} onChange={(e) => set("remolque2_placa", e.target.value.toUpperCase())} />
                  </Field>
                </div>
              </SubBlock>
            </div>
          </Section>

          {/* ── 5. Capacidades ─────────────────────────────────────── */}
          <Section icon={<Fuel size={16} className="text-amber-500" />} title="Capacidades y combustible" subtitle="Datos operativos para control de consumo y rendimiento." isDark={isDarkMode} accent="amber">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Capacidad de carga (kg)">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.capacidad_carga_kg} onChange={(e) => set("capacidad_carga_kg", e.target.value)} />
              </Field>
              <Field label="Tanque combustible (L)">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.capacidad_combustible_litros} onChange={(e) => set("capacidad_combustible_litros", e.target.value)} />
              </Field>
              <Field label="Tipo de combustible">
                <select className={inputCls(isDarkMode)} value={form.tipo_combustible} onChange={(e) => set("tipo_combustible", e.target.value)}>
                  {TIPO_COMBUSTIBLE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Rendimiento promedio (km/L)">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.rendimiento_promedio_kml} onChange={(e) => set("rendimiento_promedio_kml", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* ── Termo (refrigeracion) ─────────────────────────────── */}
          <Section icon={<Snowflake size={16} className="text-sky-500" />} title="Termo (refrigeracion)" subtitle="Indica si la unidad lleva un termo fijo y vinculalo desde el catalogo." isDark={isDarkMode} accent="blue">
            <label className="inline-flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={termoFijo} onChange={(e) => { setTermoFijo(e.target.checked); if (!e.target.checked) setTermoId(null); }} className="accent-sky-600 w-4 h-4" />
              <span className="text-sm text-slate-600 dark:text-slate-300">El termo va <b>fijo</b> a esta unidad</span>
            </label>
            {termoFijo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Field label="Termo asignado">
                  <select className={inputCls(isDarkMode)} value={termoId ?? ""} onChange={(e) => setTermoId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Selecciona un termo —</option>
                    {termos.map((t) => <option key={t.id} value={t.id}>{t.numero}{t.marca ? ` · ${t.marca}` : ""}</option>)}
                  </select>
                </Field>
                <Link href="/flota/termos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline pb-2">
                  <Link2 size={14} /> Administrar termos
                </Link>
              </div>
            )}
            {!termoFijo && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Sin termo fijo: los termos se asignan por separado (en los formularios o por viaje).
              </p>
            )}
          </Section>

          {/* ── 6. Operativo ──────────────────────────────────────── */}
          <Section icon={<Calendar size={16} className="text-cyan-500" />} title="Adquisicion y operacion" isDark={isDarkMode} accent="cyan">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="KM actual">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.km_actual} onChange={(e) => set("km_actual", e.target.value)} />
              </Field>
              <Field label="Fecha adquisicion">
                <input type="date" className={inputCls(isDarkMode)} value={form.fecha_adquisicion} onChange={(e) => set("fecha_adquisicion", e.target.value)} />
              </Field>
              <Field label="Valor factura">
                <input type="number" step="0.01" className={inputCls(isDarkMode) + " font-mono"} value={form.valor_factura} onChange={(e) => set("valor_factura", e.target.value)} />
              </Field>
              <Field label="Proveedor / agencia" className="sm:col-span-2 lg:col-span-3">
                <input className={inputCls(isDarkMode)} value={form.proveedor_compra} onChange={(e) => set("proveedor_compra", e.target.value)} />
              </Field>
              <Field label="Notas internas" className="sm:col-span-2 lg:col-span-3">
                <textarea rows={2} className={inputCls(isDarkMode) + " resize-y"} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* ── 7. Vigencias ──────────────────────────────────────── */}
          <Section icon={<Calendar size={16} className="text-yellow-500" />} title="Vigencias de documentos" subtitle="El sistema genera alertas conforme se acercan las fechas." isDark={isDarkMode} accent="yellow">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Tarjeta circulacion">
                <input type="date" className={inputCls(isDarkMode)} value={form.fecha_tarjeta_circulacion} onChange={(e) => set("fecha_tarjeta_circulacion", e.target.value)} />
              </Field>
              <Field label="Verificacion vence">
                <input type="date" className={inputCls(isDarkMode)} value={form.fecha_verificacion_vence} onChange={(e) => set("fecha_verificacion_vence", e.target.value)} />
              </Field>
              <Field label="Seguro vence">
                <input type="date" className={inputCls(isDarkMode)} value={form.fecha_seguro_vence} onChange={(e) => set("fecha_seguro_vence", e.target.value)} />
              </Field>
              <Field label="Revista mecanica vence">
                <input type="date" className={inputCls(isDarkMode)} value={form.fecha_revista_vence} onChange={(e) => set("fecha_revista_vence", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Footer acciones sticky */}
          <div className="sticky bottom-0 backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3"
            style={{
              borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              background: isDarkMode ? "rgba(8,12,24,0.92)" : "rgba(255,255,255,0.92)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}>
            <Link href="/flota" className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <div className="flex-1" />
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white shadow-lg disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
              <Save size={14} /> {saving ? "Guardando..." : "Crear unidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────
function Section({ icon, title, subtitle, children, isDark, accent = "blue" }: any) {
  const accentBg: Record<string, string> = {
    blue: "rgba(59,130,246,0.06)",
    emerald: "rgba(16,185,129,0.06)",
    rose: "rgba(244,63,94,0.06)",
    violet: "rgba(139,92,246,0.06)",
    amber: "rgba(245,158,11,0.06)",
    cyan: "rgba(6,182,212,0.06)",
    yellow: "rgba(234,179,8,0.06)",
  };
  return (
    <div className={`rounded-2xl border p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 shadow-sm`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accentBg[accent] }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">{title}</h3>
          {subtitle && <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10.5px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400 dark:text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SubBlock({ title, required, children, isDark }: any) {
  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${isDark ? "bg-slate-900/30 border-slate-700/50" : "bg-slate-50 border-slate-200"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${required ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>
        {title}
      </p>
      {children}
    </div>
  );
}
