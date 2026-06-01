import { ReactNode } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { getTheme } from "@/lib/theme";

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  actions?: ReactNode;
}

export function Card({ children, title, subtitle, className = "", actions }: Props) {
  const { isDark } = useTheme();
  const t = getTheme(isDark);
  return (
    <div className={`${t.glassPanel} border rounded-2xl p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className={`text-lg font-bold ${t.textPrimary}`}>{title}</h3>}
            {subtitle && <p className={`text-sm mt-1 ${t.textSecondary}`}>{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
