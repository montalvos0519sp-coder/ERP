import { ButtonHTMLAttributes, ReactNode } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { getTheme } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({ children, variant = "primary", size = "md", fullWidth, className = "", ...rest }: Props) {
  const { isDark } = useTheme();
  const t = getTheme(isDark);
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants: Record<Variant, string> = {
    primary: `${t.accentGradient} text-white hover:opacity-90 shadow-lg`,
    secondary: isDark
      ? "bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/[0.05]"
      : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200",
    ghost: isDark ? "text-slate-300 hover:bg-white/[0.04]" : "text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg",
  };
  return (
    <button {...rest} className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {children}
    </button>
  );
}
