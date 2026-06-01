interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Switch({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${checked ? "bg-emerald-500" : "bg-slate-600"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
