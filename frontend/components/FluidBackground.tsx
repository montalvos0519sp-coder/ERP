"use client";

interface Props { isDark: boolean }

export function FluidBackground({ isDark }: Props) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-30"
        style={{
          background: isDark
            ? "radial-gradient(circle, #14B8A6 0%, transparent 70%)"
            : "radial-gradient(circle, #1A73E8 0%, transparent 70%)",
          animation: "var(--animate-liquid)",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-25"
        style={{
          background: isDark
            ? "radial-gradient(circle, #10B981 0%, transparent 70%)"
            : "radial-gradient(circle, #34A853 0%, transparent 70%)",
          animation: "var(--animate-liquid)",
          animationDelay: "10s",
        }}
      />
      <div
        className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, #4F46E5 0%, transparent 70%)",
          animation: "var(--animate-liquid)",
          animationDelay: "20s",
        }}
      />
    </div>
  );
}

export default FluidBackground;
