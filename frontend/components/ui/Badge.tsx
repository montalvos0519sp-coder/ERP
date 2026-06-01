interface Props {
  text: string;
  type?: "default" | "success" | "alert" | "neural" | "warning";
  pulse?: boolean;
}

const STYLES: Record<NonNullable<Props["type"]>, string> = {
  default: "bg-slate-700/30 text-slate-300 border-slate-600/40",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  alert: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  neural: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export function Badge({ text, type = "default", pulse }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STYLES[type]} ${pulse ? "animate-pulse" : ""}`}
    >
      {text}
    </span>
  );
}

export default Badge;
