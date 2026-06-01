"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, CheckCircle, Eye, EyeOff, FileText, Image as ImageIcon, Info,
  Key, Layout, Moon, Palette, RotateCcw, Save, Settings, Shield, ShieldCheck, Sun,
  Trash2, Upload, Zap,
} from "lucide-react";

import Tabs from "@/components/ui/Tabs";
import { Switch, SatCombobox } from "@/components/ui";
import { api, API_BASE } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const ADMIN_ONLY_TABS = new Set(["empresa", "pac", "cfdi", "sistema"]);
import {
  ACCENT_SWATCHES, FONT_FAMILY_LABEL, FONT_SIZE_LABEL,
  type FontFamilyKey, type FontSizeKey, useUserPrefs,
} from "@/lib/UserPrefsContext";

interface ConfigForm {
  pac_proveedor: "facturacom" | "manual";
  pac_base_url: string;
  pac_api_key: string;
  pac_secret_key: string;
  pac_plugin: string;
  pac_sandbox: boolean;
  emisor_rfc: string;
  emisor_nombre: string;
  emisor_regimen: string;
  emisor_cp: string;
  moneda_default: string;
  forma_pago_default: string;
  metodo_pago_default: string;
  uso_cfdi_default: string;
  requiere_carta_porte: boolean;
  permite_facturacion: boolean;
  notificaciones_email: boolean;
}

const VACIO: ConfigForm = {
  pac_proveedor: "manual",
  pac_base_url: "https://api.factura.com",
  pac_api_key: "",
  pac_secret_key: "",
  pac_plugin: "9",
  pac_sandbox: false,
  emisor_rfc: "",
  emisor_nombre: "",
  emisor_regimen: "601",
  emisor_cp: "",
  moneda_default: "MXN",
  forma_pago_default: "99",
  metodo_pago_default: "PUE",
  uso_cfdi_default: "S01",
  requiere_carta_porte: false,
  permite_facturacion: true,
  notificaciones_email: false,
};

const TABS = [
  { id: "empresa", label: "Empresa" },
  { id: "pac", label: "PAC" },
  { id: "cfdi", label: "CFDI" },
  { id: "apariencia", label: "Apariencia" },
  { id: "sistema", label: "Sistema" },
];

export default function ConfiguracionPage() {
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const { user, empresaActivaId, reload, menuBackend } = useUser();
  const { prefs, setFontFamily, setFontSize, setAccent, setDarkOverridesAccent, reset } = useUserPrefs();

  const esAdmin = !!user?.is_superuser || !!menuBackend?.es_staff_empresa;
  const tabsVisibles = useMemo(
    () => (esAdmin ? TABS : TABS.filter((t) => !ADMIN_ONLY_TABS.has(t.id))),
    [esAdmin],
  );

  const [activeTab, setActiveTab] = useState(esAdmin ? "empresa" : "apariencia");

  useEffect(() => {
    if (!esAdmin && ADMIN_ONLY_TABS.has(activeTab)) setActiveTab("apariencia");
  }, [esAdmin, activeTab]);
  const [form, setForm] = useState<ConfigForm>(VACIO);
  const [empresa, setEmpresa] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Carga inicial.
  useEffect(() => {
    if (!empresaActivaId) return;
    api.getConfiguracion(empresaActivaId)
      .then((c) => {
        // El Secret Key nunca viaja en el GET (write_only). Lo dejamos vacio
        // en el form y marcamos si ya hay uno guardado para no borrarlo.
        setSecretSet(!!c.pac_secret_key_set);
        setForm({ ...VACIO, ...c, pac_secret_key: "" });
      })
      .catch(() => { /* */ });
    api.getEmpresa(empresaActivaId).then(setEmpresa).catch(() => { /* */ });
  }, [empresaActivaId]);

  // Preview de logo nuevo seleccionado.
  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const flashOk = (text: string) => {
    setMsg({ type: "ok", text });
    setTimeout(() => setMsg(null), 3000);
  };
  const flashErr = (text: string) => {
    setMsg({ type: "err", text });
    setTimeout(() => setMsg(null), 5000);
  };

  const guardarConfig = async () => {
    if (!empresaActivaId) return;
    setSavingConfig(true);
    try {
      // Si el usuario no capturo un Secret Key nuevo, no lo enviamos para no
      // sobrescribir el guardado con un valor vacio.
      const payload: Partial<ConfigForm> = { ...form };
      if (!form.pac_secret_key) delete payload.pac_secret_key;
      const saved = await api.actualizarConfiguracion(empresaActivaId, payload);
      if (form.pac_secret_key) setSecretSet(true);
      setForm((f) => ({ ...f, pac_secret_key: "" }));
      if (saved && typeof saved.pac_secret_key_set === "boolean") setSecretSet(saved.pac_secret_key_set);
      flashOk("Configuracion guardada correctamente.");
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setSavingConfig(false);
    }
  };

  /**
   * Restaura SOLO la apariencia (fuente, tamano, acento, override-en-oscuro)
   * a los valores default. NO toca PAC, CFDI defaults ni datos de empresa.
   */
  const restaurarApariencia = () => {
    reset();
    flashOk("Apariencia restaurada al modo default.");
  };

  const guardarEmpresa = async () => {
    if (!empresaActivaId || !empresa) return;
    setSavingEmpresa(true);
    try {
      const { id, sucursales, creada, actualizada, logo, ...payload } = empresa;
      await api.actualizarEmpresa(empresaActivaId, payload);
      flashOk("Datos de empresa actualizados.");
      reload();
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setSavingEmpresa(false);
    }
  };

  const subirLogo = async () => {
    if (!empresaActivaId || !logoFile) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", logoFile);
      const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
      const res = await fetch(`${API_BASE}/api/core/empresas/${empresaActivaId}/logo/`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error subiendo logo");
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      const data = await api.getEmpresa(empresaActivaId);
      setEmpresa(data);
      flashOk("Logo actualizado.");
      reload();
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const eliminarLogo = async () => {
    if (!empresaActivaId) return;
    if (!confirm("Eliminar logo de la empresa?")) return;
    setUploadingLogo(true);
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
      await fetch(`${API_BASE}/api/core/empresas/${empresaActivaId}/logo/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await api.getEmpresa(empresaActivaId);
      setEmpresa(data);
      flashOk("Logo eliminado.");
      reload();
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const conexionPACOk = useMemo(() => {
    if (form.pac_proveedor === "manual") return true;
    return !!(form.pac_api_key && (form.pac_secret_key || secretSet));
  }, [form, secretSet]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#6366F1,#14B8A6)" }}>
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Configuracion del Sistema</h1>
          <p className={`text-sm ${theme.textSecondary}`}>
            Empresa activa: <span className={`font-bold ${theme.accentPrimary}`}>{empresa?.nombre_comercial || "..."}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <Tabs tabs={tabsVisibles} activeTab={activeTab} onChange={setActiveTab} theme={theme} />
      </div>

      {/* Toast / msg */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${
          msg.type === "ok"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
        }`}>
          {msg.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* ── TAB: EMPRESA ─────────────────────────────────────────────── */}
      {activeTab === "empresa" && empresa && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          {/* Logo card */}
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<ImageIcon className="w-5 h-5" />}
            title="Logo de la empresa"
            subtitle="Aparece en el sidebar y en los documentos generados (CFDI PDF, Carta Porte)."
          >
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="shrink-0">
                <div
                  className="w-32 h-32 rounded-3xl border-2 border-dashed flex items-center justify-center overflow-hidden"
                  style={{
                    borderColor: logoPreview || empresa.logo ? "transparent" : (isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"),
                    background: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  }}
                >
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : empresa.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={empresa.logo.startsWith("http") ? empresa.logo : `${API_BASE}${empresa.logo}`}
                      alt={empresa.nombre_comercial} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-center px-4">
                      <ImageIcon className={`w-8 h-8 mb-2 ${theme.textTertiary}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>Sin logo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                <button onClick={() => logoInputRef.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all hover:scale-105 ${theme.surfaceElevated}`}>
                  <Upload className="w-4 h-4" /> Seleccionar imagen
                </button>
                {logoFile && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${theme.textSecondary}`}>{logoFile.name} · {(logoFile.size / 1024).toFixed(1)} KB</span>
                    <button onClick={subirLogo} disabled={uploadingLogo}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg"
                      style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
                      {uploadingLogo ? "Subiendo..." : "Subir logo"}
                    </button>
                  </div>
                )}
                {empresa.logo && !logoFile && (
                  <button onClick={eliminarLogo}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar logo actual
                  </button>
                )}
                <p className={`text-[11px] ${theme.textTertiary}`}>
                  Formato recomendado: PNG cuadrado (al menos 256×256). El logo se redimensiona automaticamente al sidebar.
                </p>
              </div>
            </div>
          </Section>

          {/* Datos basicos */}
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<Building2 className="w-5 h-5" />}
            title="Datos generales"
            subtitle="Informacion legal y de contacto de la empresa."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre comercial">
                <input className={`input ${inputClass(isDarkMode)}`} value={empresa.nombre_comercial}
                  onChange={(e) => setEmpresa({ ...empresa, nombre_comercial: e.target.value })} />
              </Field>
              <Field label="Razon social">
                <input className={`input ${inputClass(isDarkMode)}`} value={empresa.razon_social}
                  onChange={(e) => setEmpresa({ ...empresa, razon_social: e.target.value })} />
              </Field>
              <Field label="RFC">
                <input className={`input ${inputClass(isDarkMode)} font-mono uppercase`} value={empresa.rfc}
                  onChange={(e) => setEmpresa({ ...empresa, rfc: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="CP fiscal">
                <input className={`input ${inputClass(isDarkMode)} font-mono`} value={empresa.cp_fiscal || ""}
                  onChange={(e) => setEmpresa({ ...empresa, cp_fiscal: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={`input ${inputClass(isDarkMode)}`} value={empresa.email || ""}
                  onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} />
              </Field>
              <Field label="Telefono">
                <input className={`input ${inputClass(isDarkMode)}`} value={empresa.telefono || ""}
                  onChange={(e) => setEmpresa({ ...empresa, telefono: e.target.value })} />
              </Field>
              <Field label="Direccion" className="md:col-span-2">
                <input className={`input ${inputClass(isDarkMode)}`} value={empresa.direccion || ""}
                  onChange={(e) => setEmpresa({ ...empresa, direccion: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={guardarEmpresa} disabled={savingEmpresa}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center gap-2"
                style={{ background: "linear-gradient(135deg,#1A73E8,#34A853)" }}>
                <Save className="w-4 h-4" /> {savingEmpresa ? "Guardando..." : "Guardar datos"}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: PAC ─────────────────────────────────────────────────── */}
      {activeTab === "pac" && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<Zap className="w-5 h-5" />}
            title="Proveedor Autorizado de Certificacion"
            subtitle="Configura el PAC que timbrara tus CFDI 4.0 y Carta Porte. Cambia entre PACs sin tocar codigo."
          >
            {/* Selector visual de PAC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { id: "facturacom", label: "Factura.com", desc: "PAC autorizado SAT, CFDI 4.0 + Carta Porte", color: "#6366F1" },
                { id: "manual", label: "Manual (sin timbrado)", desc: "Borradores para desarrollo y pruebas", color: "#94A3B8" },
              ].map((p) => {
                const sel = form.pac_proveedor === p.id;
                return (
                  <button key={p.id} onClick={() => setForm({ ...form, pac_proveedor: p.id as any })}
                    className="text-left p-4 rounded-2xl border transition-all"
                    style={{
                      borderColor: sel ? p.color : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                      background: sel ? p.color + "12" : (isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                      boxShadow: sel ? `0 4px 16px ${p.color}30` : "none",
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${theme.textPrimary}`}>{p.label}</span>
                      {sel && <CheckCircle className="w-5 h-5" style={{ color: p.color }} />}
                    </div>
                    <span className={`text-xs ${theme.textTertiary}`}>{p.desc}</span>
                  </button>
                );
              })}
            </div>

            {form.pac_proveedor === "facturacom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="URL base">
                  <input className={`input ${inputClass(isDarkMode)} font-mono text-xs`} value={form.pac_base_url}
                    onChange={(e) => setForm({ ...form, pac_base_url: e.target.value })} />
                </Field>
                <Field label="F-PLUGIN">
                  <input className={`input ${inputClass(isDarkMode)} font-mono`} value={form.pac_plugin}
                    onChange={(e) => setForm({ ...form, pac_plugin: e.target.value })} />
                </Field>
                <Field label="API Key" icon={<Key className="w-3 h-3" />}>
                  <input className={`input ${inputClass(isDarkMode)} font-mono`} value={form.pac_api_key}
                    onChange={(e) => setForm({ ...form, pac_api_key: e.target.value })} placeholder="F-Api-Key" />
                </Field>
                <Field label="Secret Key" icon={<Shield className="w-3 h-3" />}>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      className={`input ${inputClass(isDarkMode)} font-mono pr-10`}
                      value={form.pac_secret_key}
                      onChange={(e) => setForm({ ...form, pac_secret_key: e.target.value })}
                      placeholder={secretSet ? "•••••••••• (guardado)" : "F-Secret-Key"}
                    />
                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${theme.textTertiary}`}>
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className={`text-[10px] mt-1 block ${theme.textTertiary}`}>
                    {secretSet
                      ? "Ya hay un Secret Key guardado. Dejalo vacio para conservarlo; escribe uno nuevo solo para reemplazarlo."
                      : "Se guarda cifrado y no se vuelve a mostrar por seguridad."}
                  </span>
                </Field>
                <div className="md:col-span-2">
                  <label className={`flex items-center justify-between p-4 rounded-xl border ${theme.divider}`}>
                    <div>
                      <p className={`text-sm font-bold ${theme.textPrimary}`}>Sandbox</p>
                      <p className={`text-xs ${theme.textTertiary}`}>Usa el ambiente de pruebas del PAC (no genera CFDI reales).</p>
                    </div>
                    <Switch checked={form.pac_sandbox} onChange={(v) => setForm({ ...form, pac_sandbox: v })} />
                  </label>
                </div>
              </div>
            )}

            {/* Estado de conexion */}
            <div className={`mt-5 p-4 rounded-xl border flex items-center gap-3 ${
              conexionPACOk
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              {conexionPACOk
                ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                : <Info className="w-5 h-5 text-amber-400" />}
              <div className="flex-1">
                <p className={`text-sm font-bold ${conexionPACOk ? "text-emerald-300" : "text-amber-300"}`}>
                  {conexionPACOk ? "Configuracion completa" : "Faltan credenciales del PAC"}
                </p>
                <p className={`text-xs ${theme.textSecondary}`}>
                  {conexionPACOk
                    ? form.pac_proveedor === "manual"
                      ? "Modo manual activo. Las facturas se generan como borrador (sin timbrar)."
                      : "Listo para timbrar CFDI y Carta Porte 3.1."
                    : "Captura el API Key y Secret Key del PAC para poder timbrar."}
                </p>
              </div>
            </div>
          </Section>

          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<FileText className="w-5 h-5" />}
            title="Datos del emisor CFDI"
            subtitle="Estos datos viajan en el XML de cada factura emitida."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="RFC emisor">
                <input className={`input ${inputClass(isDarkMode)} font-mono uppercase`} value={form.emisor_rfc}
                  onChange={(e) => setForm({ ...form, emisor_rfc: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Razon social emisor">
                <input className={`input ${inputClass(isDarkMode)}`} value={form.emisor_nombre}
                  onChange={(e) => setForm({ ...form, emisor_nombre: e.target.value })} />
              </Field>
              <Field label="Regimen fiscal SAT">
                <SatCombobox
                  catalogo="regimen-fiscal"
                  value={form.emisor_regimen}
                  onChange={(v, opt) => setForm({ ...form, emisor_regimen: opt ? opt.label : v })}
                />
              </Field>
              <Field label="CP lugar de expedicion">
                <input className={`input ${inputClass(isDarkMode)} font-mono`} value={form.emisor_cp}
                  onChange={(e) => setForm({ ...form, emisor_cp: e.target.value })} />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end">
            <button onClick={guardarConfig} disabled={savingConfig}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center gap-2"
              style={{ background: "linear-gradient(135deg,#1A73E8,#34A853)" }}>
              <Save className="w-4 h-4" /> {savingConfig ? "Guardando..." : "Guardar PAC + Emisor"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: CFDI ────────────────────────────────────────────────── */}
      {activeTab === "cfdi" && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<FileText className="w-5 h-5" />}
            title="Defaults CFDI"
            subtitle="Valores precargados cuando capturas una factura nueva."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Moneda SAT">
                <SatCombobox catalogo="moneda" value={form.moneda_default}
                  onChange={(v, opt) => setForm({ ...form, moneda_default: opt ? opt.label : v })} />
              </Field>
              <Field label="Forma de pago SAT">
                <SatCombobox catalogo="forma-pago" value={form.forma_pago_default}
                  onChange={(v, opt) => setForm({ ...form, forma_pago_default: opt ? opt.label : v })} />
              </Field>
              <Field label="Metodo de pago SAT">
                <SatCombobox catalogo="metodo-pago" value={form.metodo_pago_default}
                  onChange={(v, opt) => setForm({ ...form, metodo_pago_default: opt ? opt.label : v })} />
              </Field>
              <Field label="Uso CFDI SAT">
                <SatCombobox catalogo="uso-cfdi" value={form.uso_cfdi_default}
                  onChange={(v, opt) => setForm({ ...form, uso_cfdi_default: opt ? opt.label : v })} />
              </Field>
            </div>
          </Section>

          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Caracteristicas activas"
            subtitle="Habilita o deshabilita modulos fiscales por empresa."
          >
            <div className="space-y-3">
              <FeatureToggle
                theme={theme}
                title="Habilitar facturacion CFDI"
                desc="Los usuarios pueden emitir CFDI desde el modulo de Facturacion."
                checked={form.permite_facturacion}
                onChange={(v) => setForm({ ...form, permite_facturacion: v })}
              />
              <FeatureToggle
                theme={theme}
                title="Requiere Complemento Carta Porte 3.1"
                desc="Los viajes pueden generar y timbrar Carta Porte automaticamente."
                checked={form.requiere_carta_porte}
                onChange={(v) => setForm({ ...form, requiere_carta_porte: v })}
              />
              <FeatureToggle
                theme={theme}
                title="Notificaciones por email"
                desc="Envia un correo cuando se emite o cancela un CFDI."
                checked={form.notificaciones_email}
                onChange={(v) => setForm({ ...form, notificaciones_email: v })}
              />
            </div>
          </Section>

          <div className="flex justify-end">
            <button onClick={guardarConfig} disabled={savingConfig}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center gap-2"
              style={{ background: "linear-gradient(135deg,#1A73E8,#34A853)" }}>
              <Save className="w-4 h-4" /> {savingConfig ? "Guardando..." : "Guardar configuracion"}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: APARIENCIA ──────────────────────────────────────────── */}
      {activeTab === "apariencia" && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<Layout className="w-5 h-5" />}
            title="Tema visual"
            subtitle="Cambia entre modo oscuro y modo claro."
          >
            <div className={`p-1.5 rounded-2xl flex border ${theme.divider} ${isDarkMode ? "bg-white/[0.02]" : "bg-slate-100/50"}`}>
              <button onClick={() => isDarkMode && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  !isDarkMode ? "bg-white shadow-sm text-[#1A73E8]" : "text-slate-500 hover:text-slate-300"
                }`}>
                <Sun size={14} /> Modo Fluido
              </button>
              <button onClick={() => !isDarkMode && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  isDarkMode ? "bg-[#1E293B] shadow-sm text-[#14B8A6]" : "text-slate-500 hover:text-slate-700"
                }`}>
                <Moon size={14} /> Modo Oscuro
              </button>
            </div>
            <div className="mt-4">
              <FeatureToggle
                theme={theme}
                title="Modo black en oscuro"
                desc="Cuando esta en modo oscuro, el header usa fondo neutro en vez del acento."
                checked={prefs.darkOverridesAccent}
                onChange={setDarkOverridesAccent}
              />
            </div>
          </Section>

          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<Palette className="w-5 h-5" />}
            title="Color de acento"
            subtitle="Define el color que se usa en botones, links y el header del sistema."
          >
            <div className="flex flex-wrap gap-3">
              {ACCENT_SWATCHES.map((s) => (
                <button key={s.value} onClick={() => setAccent(s.value)}
                  className="group flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 rounded-2xl border-2 transition-all ${prefs.accent === s.value ? "scale-110 shadow-lg" : "border-transparent"}`}
                    style={{
                      background: s.value,
                      borderColor: prefs.accent === s.value ? (isDarkMode ? "#fff" : "#000") : "transparent",
                      boxShadow: prefs.accent === s.value ? `0 4px 20px ${s.value}80` : "none",
                    }} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${prefs.accent === s.value ? theme.textPrimary : theme.textTertiary}`}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<FileText className="w-5 h-5" />}
            title="Tipografia"
            subtitle="Selecciona la fuente del sistema. El cambio aplica en toda la interfaz."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(FONT_FAMILY_LABEL).map(([k, label]) => {
                const sel = prefs.fontFamily === k;
                return (
                  <button key={k} onClick={() => setFontFamily(k as FontFamilyKey)}
                    className="text-left p-4 rounded-2xl border transition-all"
                    style={{
                      borderColor: sel ? (isDarkMode ? "#14B8A6" : "#1A73E8") : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                      background: sel ? (isDarkMode ? "rgba(20,184,166,0.08)" : "rgba(26,115,232,0.05)") : (isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${theme.textPrimary}`}>{label}</span>
                      {sel && <CheckCircle className="w-4 h-4" style={{ color: isDarkMode ? "#14B8A6" : "#1A73E8" }} />}
                    </div>
                    <span className={`text-xs ${theme.textTertiary}`} style={{ fontFamily: getFontStack(k as FontFamilyKey) }}>
                      Aa Bb Cc — The quick brown fox jumps over the lazy dog
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
              {Object.entries(FONT_SIZE_LABEL).map(([k, label]) => (
                <button key={k} onClick={() => setFontSize(k as FontSizeKey)}
                  className="p-3 rounded-xl border text-xs font-bold transition-all"
                  style={{
                    borderColor: prefs.fontSize === k ? (isDarkMode ? "#14B8A6" : "#1A73E8") : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                    background: prefs.fontSize === k ? (isDarkMode ? "rgba(20,184,166,0.08)" : "rgba(26,115,232,0.05)") : "transparent",
                    color: prefs.fontSize === k ? (isDarkMode ? "#14B8A6" : "#1A73E8") : (isDarkMode ? "#94a3b8" : "#64748b"),
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Modo default — restaura SOLO apariencia */}
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${theme.divider}`}
            style={{ background: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${theme.textPrimary}`}>Modo default</p>
              <p className={`text-xs ${theme.textTertiary}`}>
                Restaura SOLO la apariencia: tema oscuro, fuente sistema, color azul, tamaño normal. No toca PAC, CFDI ni datos de empresa.
              </p>
            </div>
            <button onClick={restaurarApariencia}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
              <RotateCcw className="w-4 h-4" /> Restaurar apariencia
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: SISTEMA ─────────────────────────────────────────────── */}
      {activeTab === "sistema" && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<Info className="w-5 h-5" />}
            title="Informacion del sistema"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow theme={theme} label="Version" value="ERP Profesional v1.0" />
              <InfoRow theme={theme} label="Backend" value={API_BASE} />
              <InfoRow theme={theme} label="Empresa activa" value={empresa?.nombre_comercial || "-"} />
              <InfoRow theme={theme} label="Empresas con acceso" value={String(user?.empresas?.length || 0)} />
              <InfoRow theme={theme} label="Tu rol" value={user?.is_superuser ? "Super Admin" : (user?.empresas?.[0]?.rol || "USER")} />
              <InfoRow theme={theme} label="Modo de PAC" value={form.pac_proveedor === "manual" ? "Manual (sin timbrar)" : "Factura.com"} />
            </div>
          </Section>

          <Section
            isDark={isDarkMode}
            theme={theme}
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Atajos administrativos"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Empresas", desc: "Gestionar tenants", href: "/admin/empresas" },
                { label: "Usuarios", desc: "Crear y desactivar", href: "/admin/usuarios" },
                { label: "Modulos", desc: "Activar por empresa", href: "/admin/modulos" },
                { label: "Permisos", desc: "Asignar a usuarios", href: "/admin/permisos" },
                { label: "Catalogos SAT", desc: "Cargar desde Excel", href: "/catalogos/sat" },
                { label: "Bitacora", desc: "Auditoria del sistema", href: "/admin/bitacora" },
              ].map((s) => (
                <a key={s.href} href={s.href}
                  className={`p-4 rounded-xl border transition-all hover:scale-105 ${theme.divider} ${theme.accentHover}`}>
                  <p className={`text-sm font-bold ${theme.textPrimary}`}>{s.label}</p>
                  <p className={`text-[11px] ${theme.textTertiary} mt-0.5`}>{s.desc}</p>
                </a>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes helpers ──────────────────────────────────────────────
function Section({ isDark, theme, icon, title, subtitle, children }: any) {
  return (
    <div className={`rounded-3xl border p-6 ${theme.divider}`}
      style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: isDark ? "rgba(20,184,166,0.12)" : "rgba(26,115,232,0.08)",
            color: isDark ? "#14B8A6" : "#1A73E8",
          }}>
          {icon}
        </div>
        <div>
          <h3 className={`font-black text-base uppercase tracking-tight ${theme.textPrimary}`}>{title}</h3>
          {subtitle && <p className={`text-[12px] mt-0.5 ${theme.textSecondary}`}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon, children, className = "" }: any) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-slate-400 flex items-center gap-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}

function FeatureToggle({ theme, title, desc, checked, onChange }: any) {
  return (
    <label className={`flex items-center justify-between p-4 rounded-xl border ${theme.divider} hover:bg-white/[0.02] transition-all`}>
      <div className="pr-4">
        <p className={`text-sm font-bold ${theme.textPrimary}`}>{title}</p>
        <p className={`text-xs ${theme.textTertiary} mt-0.5`}>{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function InfoRow({ theme, label, value }: any) {
  return (
    <div className={`p-3 rounded-xl border ${theme.divider}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textTertiary}`}>{label}</p>
      <p className={`text-sm font-mono font-bold mt-1 ${theme.textPrimary} truncate`}>{value}</p>
    </div>
  );
}

function inputClass(dark: boolean) {
  return dark
    ? "w-full bg-[#1E293B]/40 border border-white/[0.05] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#14B8A6]/50 focus:shadow-[0_0_15px_rgba(20,184,166,0.1)] transition-all"
    : "w-full bg-white/80 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A73E8]/50 focus:shadow-[0_0_15px_rgba(26,115,232,0.1)] transition-all";
}

function getFontStack(k: FontFamilyKey): string {
  return {
    system: "'Plus Jakarta Sans', system-ui, sans-serif",
    poppins: "'Poppins', sans-serif",
    nunito: "'Nunito', sans-serif",
    raleway: "'Raleway', sans-serif",
    playfair: "'Playfair Display', serif",
    spacegrotesk: "'Space Grotesk', sans-serif",
    mono: "'JetBrains Mono', monospace",
  }[k];
}
