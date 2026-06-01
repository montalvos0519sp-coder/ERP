"use client";
export default function PageSkeleton() {
  return (
    <div className="min-h-screen p-6 space-y-5 animate-pulse">
      <div className="h-14 rounded-2xl bg-white/5 w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/5" />)}
      </div>
      <div className="h-10 rounded-xl bg-white/5 w-full" />
      <div className="h-96 rounded-xl bg-white/5 w-full" />
    </div>
  );
}
