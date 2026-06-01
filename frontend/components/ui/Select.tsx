import { SelectHTMLAttributes, ReactNode } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { getTheme } from "@/lib/theme";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, children, className = "", ...rest }: Props) {
  const { isDark } = useTheme();
  const t = getTheme(isDark);
  return (
    <label className="block">
      {label && <span className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>{label}</span>}
      <select
        {...rest}
        className={`w-full ${t.inputBase} border rounded-lg px-3 py-2 text-sm outline-none transition-all ${className}`}
      >
        {children}
      </select>
    </label>
  );
}
