"use client";

import { useMemo } from "react";
import {
  AtSign, Briefcase, Building2, Check, IdCard, Mail, Moon, Palette,
  RotateCcw, ShieldCheck, Sparkles, Sun, Type, UserCircle, UserCog, Users, Zap,
} from "lucide-react";

import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import {
  ACCENT_SWATCHES, FONT_FAMILY_LABEL, FONT_SIZE_LABEL,
  type FontFamilyKey, type FontSizeKey, useUserPrefs,
} from "@/lib/UserPrefsContext";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────
const FONT_SAMPLES: Record<FontFamilyKey, string> = {
  system: "'Plus Jakarta Sans', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
  raleway: "'Raleway', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  spacegrotesk: "'Space Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const SIZE_PX: Record<FontSizeKey, string> = { sm: "14", md: "16", lg: "17.5", xl: "19" };

// ─── Página ──────────────────────────────────────────────────────────────────
export default function PerfilPage() {
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const { user, menuBackend } = useUser();
  const { prefs, setFontFamily, setFontSize, setAccent, setDarkOverridesAccent, reset } = useUserPrefs();

  const iniciales = useMemo(() => {
    if (!user) return "";
    const fn = (user.first_name || "").trim();
    const ln = (user.last_name || "").trim();
    if (fn || ln) return ((fn[0] || "") + (ln[0] || "")).toUpperCase();
    return (user.username || "?").slice(0, 2).toUpperCase();
  }, [user]);

  if (!user) return null;

  const nombreCompleto = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  const rol = user.is_superuser
    ? "Super Admin"
    : menuBackend?.es_staff_empresa
      ? "Staff de empresa"
      : "Usuario";
  const rolGradient = user.is_superuser
    ? "linear-gradient(135deg,#8B5CF6,#EC4899)"
    : menuBackend?.es_staff_empresa
      ? "linear-gradient(135deg,#F59E0B,#EF4444)"
      : "linear-gradient(135deg,#1A73E8,#14B8A6)";

  const modulosTotal = menuBackend?.secciones.reduce((acc, s) => acc + s.items.length, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-3xl border ${
          isDarkMode
            ? "bg-[#0F172A]/70 border-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
            : "bg-white border-slate-200/70 shadow-[0_30px_80px_rgba(15,23,42,0.08)]"
        }`}
      >
        {/* Capa de gradiente sutil */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            background: `radial-gradient(900px 200px at 20% 0%, var(--user-accent,#1A73E8) 0%, transparent 60%), radial-gradient(700px 200px at 90% 100%, #14B8A6 0%, transparent 65%)`,
          }}
        />
        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-white font-black text-3xl sm:text-4xl tracking-tight shadow-xl"
              style={{ background: rolGradient }}
            >
              {iniciales}
            </div>
            {user.is_active && (
              <span className={`absolute -bottom-1 -right-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                isDarkMode
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-emerald-500 text-white border-white shadow"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-emerald-400" : "bg-white"} animate-pulse`} />
                Activo
              </span>
            )}
          </div>

          {/* Identidad */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.textPrimary}`}>
                {nombreCompleto}
              </h1>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow"
                style={{ background: rolGradient }}
              >
                <ShieldCheck className="w-3 h-3" /> {rol}
              </span>
            </div>
            <div className={`mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${theme.textSecondary}`}>
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="w-4 h-4" /> {user.username}
              </span>
              {user.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className={`relative grid grid-cols-3 border-t ${theme.divider}`}>
          <Stat icon={<Building2 className="w-4 h-4" />} label="Empresas" value={user.empresas.length} isDark={isDarkMode} />
          <Stat icon={<Zap className="w-4 h-4" />} label="Módulos accesibles" value={user.is_superuser ? "Todos" : modulosTotal} isDark={isDarkMode} divider />
          <Stat icon={<IdCard className="w-4 h-4" />} label="ID interno" value={`#${user.id}`} isDark={isDarkMode} divider />
        </div>
      </div>

      {/* ── DOS COLUMNAS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Cuenta ─────────────────────────────────────────────────── */}
        <section className={`lg:col-span-1 rounded-3xl border p-6 space-y-5 ${
          isDarkMode
            ? "bg-[#0F172A]/60 border-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "bg-white border-slate-200/70 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
        }`}>
          <Header
            icon={<UserCircle className="w-5 h-5 text-white" />}
            iconBg="linear-gradient(135deg,#1A73E8,#14B8A6)"
            title="Datos de cuenta"
            subtitle="Información personal y membresías"
            isDark={isDarkMode}
          />

          <ul className="space-y-3">
            <Field label="Nombre" value={nombreCompleto} icon={<UserCog className="w-4 h-4" />} isDark={isDarkMode} />
            <Field label="Usuario" value={user.username} icon={<AtSign className="w-4 h-4" />} isDark={isDarkMode} mono />
            <Field label="Correo" value={user.email || "—"} icon={<Mail className="w-4 h-4" />} isDark={isDarkMode} />
            <Field label="Rol" value={rol} icon={<ShieldCheck className="w-4 h-4" />} isDark={isDarkMode} />
            <Field label="Empresas" value={String(user.empresas.length)} icon={<Building2 className="w-4 h-4" />} isDark={isDarkMode} />
          </ul>

          {user.empresas.length > 0 && (
            <div>
              <p className={`text-[11px] font-black uppercase tracking-wider mb-2 ${theme.textTertiary}`}>
                Membresías
              </p>
              <ul className="space-y-2">
                {user.empresas.map((e) => (
                  <li
                    key={e.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                      isDarkMode
                        ? "bg-white/[0.02] border-white/[0.04]"
                        : "bg-slate-50/70 border-slate-200/60"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-[11px] font-black"
                      style={{
                        background:
                          e.color_primario && e.color_secundario
                            ? `linear-gradient(135deg,${e.color_primario},${e.color_secundario})`
                            : "linear-gradient(135deg,#1A73E8,#14B8A6)",
                      }}
                    >
                      {e.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${theme.textPrimary}`}>{e.nombre}</p>
                      <p className={`text-[10px] uppercase tracking-wider ${theme.textTertiary}`}>
                        {e.rfc} · {e.rol}
                      </p>
                    </div>
                    {e.es_staff && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Staff
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Apariencia ─────────────────────────────────────────────── */}
        <section className={`lg:col-span-2 rounded-3xl border p-6 space-y-6 ${
          isDarkMode
            ? "bg-[#0F172A]/60 border-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "bg-white border-slate-200/70 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <Header
              icon={<Palette className="w-5 h-5 text-white" />}
              iconBg="linear-gradient(135deg,#8B5CF6,#EC4899)"
              title="Apariencia"
              subtitle="Personaliza la interfaz solo para ti"
              isDark={isDarkMode}
            />
            <button
              onClick={reset}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
                isDarkMode
                  ? "bg-white/[0.04] border-white/[0.06] text-slate-300 hover:bg-white/[0.08]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              title="Restaurar valores por defecto"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
            </button>
          </div>

          {/* Tema */}
          <div>
            <SubLabel icon={<Sparkles className="w-3.5 h-3.5" />} text="Tema" isDark={isDarkMode} />
            <div className="grid grid-cols-2 gap-3">
              <ThemeCard
                active={!isDarkMode}
                onClick={() => isDarkMode && toggleTheme()}
                icon={<Sun className="w-5 h-5" />}
                title="Claro"
                hint="Fondos blancos, alta legibilidad"
                accent="from-amber-300 via-orange-300 to-rose-300"
                isDark={isDarkMode}
              />
              <ThemeCard
                active={isDarkMode}
                onClick={() => !isDarkMode && toggleTheme()}
                icon={<Moon className="w-5 h-5" />}
                title="Oscuro"
                hint="Menos fatiga visual de noche"
                accent="from-indigo-500 via-violet-500 to-slate-700"
                isDark={isDarkMode}
              />
            </div>

            <label
              className={`mt-3 flex items-center justify-between p-3 rounded-2xl border ${
                isDarkMode
                  ? "bg-white/[0.02] border-white/[0.04]"
                  : "bg-slate-50/70 border-slate-200/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDarkMode ? "bg-white/[0.04]" : "bg-slate-200/70"
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${theme.textSecondary}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${theme.textPrimary}`}>Header neutro en modo oscuro</p>
                  <p className={`text-xs ${theme.textTertiary}`}>
                    Si está apagado, la barra superior usa tu color de acento.
                  </p>
                </div>
              </div>
              <Toggle
                checked={prefs.darkOverridesAccent}
                onChange={setDarkOverridesAccent}
              />
            </label>
          </div>

          {/* Tipografía */}
          <div>
            <SubLabel icon={<Type className="w-3.5 h-3.5" />} text="Tipografía" isDark={isDarkMode} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(FONT_FAMILY_LABEL) as [FontFamilyKey, string][]).map(([k, label]) => {
                const active = prefs.fontFamily === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFontFamily(k)}
                    className={`group relative flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? isDarkMode
                          ? "border-transparent bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-transparent shadow-[0_0_0_2px_var(--user-accent,#6366F1)_inset]"
                          : "border-transparent bg-gradient-to-br from-indigo-50 via-fuchsia-50/70 to-white shadow-[0_0_0_2px_var(--user-accent,#1A73E8)_inset]"
                        : isDarkMode
                          ? "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
                          : "bg-white border-slate-200/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-lg font-bold truncate ${theme.textPrimary}`}
                        style={{ fontFamily: FONT_SAMPLES[k] }}
                      >
                        Aa Bb Cc 123
                      </p>
                      <p className={`text-[11px] truncate ${theme.textTertiary}`}>{label}</p>
                    </div>
                    {active && (
                      <span
                        className="ml-3 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white"
                        style={{ background: "var(--user-accent,#1A73E8)" }}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tamaño */}
          <div>
            <SubLabel icon={<Type className="w-3.5 h-3.5" />} text="Tamaño base" isDark={isDarkMode} />
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(FONT_SIZE_LABEL) as [FontSizeKey, string][]).map(([k, label]) => {
                const active = prefs.fontSize === k;
                const scale = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" }[k];
                return (
                  <button
                    key={k}
                    onClick={() => setFontSize(k)}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${
                      active
                        ? "text-white shadow-md"
                        : isDarkMode
                          ? "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] text-slate-300"
                          : "bg-white border-slate-200/70 hover:border-slate-300 text-slate-600"
                    }`}
                    style={active ? { background: "var(--user-accent,#1A73E8)", borderColor: "transparent" } : {}}
                  >
                    <span className={`font-black ${scale}`}>Aa</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "opacity-90" : ""}`}>
                      {label}
                    </span>
                    <span className={`text-[9px] ${active ? "opacity-70" : "opacity-50"}`}>{SIZE_PX[k]}px</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acento */}
          <div>
            <SubLabel icon={<Palette className="w-3.5 h-3.5" />} text="Color de acento" isDark={isDarkMode} />
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
              {ACCENT_SWATCHES.map((s) => {
                const active = prefs.accent.toLowerCase() === s.value.toLowerCase();
                return (
                  <button
                    key={s.value}
                    onClick={() => setAccent(s.value)}
                    title={s.name}
                    className={`group relative aspect-square rounded-2xl transition-all hover:scale-110 ${
                      active ? "scale-110" : ""
                    }`}
                    style={{
                      background: s.value,
                      boxShadow: active
                        ? `0 0 0 3px ${isDarkMode ? "#0F172A" : "#fff"}, 0 0 0 5px ${s.value}, 0 10px 25px -8px ${s.value}`
                        : `0 6px 16px -8px ${s.value}55`,
                    }}
                  >
                    {active && (
                      <Check
                        className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow"
                        strokeWidth={3.5}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className={`mt-3 text-[11px] ${theme.textTertiary}`}>
              El acento afecta botones primarios, links activos, el header (cuando no está en modo neutro) y los focos
              de campos.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Subcomponentes locales ──────────────────────────────────────────────────
function Header({
  icon, iconBg, title, subtitle, isDark,
}: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className={`text-lg font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {title}
        </h2>
        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>
      </div>
    </div>
  );
}

function SubLabel({ icon, text, isDark }: { icon: React.ReactNode; text: string; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 mb-2 text-[11px] font-black uppercase tracking-wider ${
      isDark ? "text-slate-400" : "text-slate-500"
    }`}>
      {icon} {text}
    </div>
  );
}

function Field({
  label, value, icon, mono, isDark,
}: { label: string; value: string; icon: React.ReactNode; mono?: boolean; isDark: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isDark ? "bg-white/[0.04] text-slate-300" : "bg-slate-100 text-slate-500"
      }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          {label}
        </p>
        <p
          className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"} ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </li>
  );
}

function Stat({
  icon, label, value, isDark, divider,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; isDark: boolean; divider?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-4 ${
        divider ? (isDark ? "border-l border-white/[0.04]" : "border-l border-slate-200/60") : ""
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isDark ? "bg-white/[0.04] text-slate-300" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          {label}
        </p>
        <p className={`text-base font-black truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{value}</p>
      </div>
    </div>
  );
}

function ThemeCard({
  active, onClick, icon, title, hint, accent, isDark,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; hint: string; accent: string; isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all ${
        active
          ? "shadow-lg shadow-black/10"
          : isDark
            ? "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
            : "bg-white border-slate-200/70 hover:border-slate-300"
      }`}
      style={
        active
          ? {
              borderColor: "transparent",
              boxShadow: `0 0 0 2px var(--user-accent,#1A73E8) inset, 0 12px 30px -8px var(--user-accent,#1A73E8)55`,
            }
          : {}
      }
    >
      <div
        aria-hidden
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${accent}`}
      />
      <div className="relative flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${accent} text-white shadow`}
        >
          {icon}
        </div>
        <div>
          <p className={`text-sm font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
        </div>
        {active && (
          <span
            className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--user-accent,#1A73E8)" }}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-slate-400/40"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
