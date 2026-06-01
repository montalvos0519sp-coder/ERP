import { InputHTMLAttributes } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { getTheme } from "@/lib/theme";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = "", ...rest }: Props) {
  const { isDark } = useTheme();
  const t = getTheme(isDark);
  return (
    <label className="block">
      {label && <span className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>{label}</span>}
      <input
        {...rest}
        className={`w-full ${t.inputBase} border rounded-lg px-3 py-2 text-sm outline-none transition-all ${error ? "border-rose-500" : ""} ${className}`}
      />
      {hint && !error && <span className={`text-[10px] mt-1 ${t.textTertiary}`}>{hint}</span>}
      {error && <span className="text-[10px] mt-1 text-rose-400">{error}</span>}
    </label>
  );
}
