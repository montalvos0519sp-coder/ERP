// Sistema de temas (azul rey / verde corporativo) heredado del diseno 3rrecycling
// pero parametrizado para que cualquier empresa use sus propios colores.
export interface Theme {
  mode: "light" | "dark";
  bgBase: string;
  glassPanel: string;
  glassSidebar: string;
  glassHeader: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textHeaderPrimary: string;
  textHeaderSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGradient: string;
  accentHover: string;
  inputBase: string;
  inputHeader: string;
  submenuActive: string;
  divider: string;
  headerButton: string;
  surfaceElevated: string;
}

export const getTheme = (isDark: boolean): Theme => ({
  mode: isDark ? "dark" : "light",
  bgBase: isDark ? "bg-[#020617]" : "bg-[#F0F4F8]",
  glassPanel: isDark
    ? "bg-[#0F172A]/60 backdrop-blur-[40px] border-white/[0.03] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    : "bg-white/70 backdrop-blur-[40px] border-white/80 shadow-[0_8px_32px_rgba(26,115,232,0.06)]",
  glassSidebar: isDark
    ? "bg-[#0B0F19]/75 backdrop-blur-2xl border-white/[0.04]"
    : "bg-white border-slate-200/90 shadow-[4px_0_28px_rgba(0,0,0,0.07)]",
  glassHeader: isDark
    ? "bg-[#030712]/50 backdrop-blur-2xl border-white/[0.02]"
    : "bg-gradient-to-r from-[#1A73E8]/95 to-[#34A853]/95 backdrop-blur-xl border-transparent shadow-lg shadow-[#1A73E8]/10",
  textPrimary: isDark ? "text-slate-100" : "text-slate-800",
  textSecondary: isDark ? "text-slate-400" : "text-slate-500",
  textTertiary: isDark ? "text-slate-500" : "text-slate-400",
  textHeaderPrimary: isDark ? "text-white" : "text-white",
  textHeaderSecondary: isDark ? "text-slate-400" : "text-white/90",
  accentPrimary: isDark ? "text-[#14B8A6]" : "text-[#1A73E8]",
  accentSecondary: isDark ? "text-[#10B981]" : "text-[#34A853]",
  accentGradient: isDark
    ? "bg-gradient-to-r from-[#0EA5E9] via-[#14B8A6] to-[#10B981]"
    : "bg-gradient-to-r from-[#1A73E8] to-[#34A853]",
  accentHover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#1A73E8]/5",
  inputBase: isDark
    ? "bg-[#1E293B]/40 border-white/[0.05] text-white focus:border-[#14B8A6]/50 focus:bg-[#1E293B]/80 focus:shadow-[0_0_15px_rgba(20,184,166,0.1)]"
    : "bg-white/80 border-slate-200/50 text-slate-900 focus:border-[#1A73E8]/50 focus:bg-white focus:shadow-[0_0_15px_rgba(26,115,232,0.1)]",
  inputHeader: isDark
    ? "bg-white/[0.03] border-white/[0.06] text-white focus:border-[#14B8A6]/50 placeholder:text-white/30"
    : "bg-white/10 border-white/20 text-white focus:border-white/50 focus:bg-white/20 placeholder:text-white/70",
  submenuActive: isDark ? "bg-white/[0.03] text-[#14B8A6]" : "bg-[#1A73E8]/5 text-[#1A73E8]",
  divider: isDark ? "border-white/[0.03]" : "border-slate-200/60",
  headerButton: isDark
    ? "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] text-slate-300 hover:text-white"
    : "bg-white/15 border-white/20 hover:bg-white/25 text-white shadow-sm hover:shadow-md",
  surfaceElevated: isDark
    ? "bg-[#0F172A] border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
    : "bg-white border border-slate-200 shadow-[0_20px_40px_rgba(26,115,232,0.15)]",
});
