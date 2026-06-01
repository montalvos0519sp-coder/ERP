"use client";
import { ReactNode, useState } from "react";

interface Props {
  children: ReactNode;
  content: string;
  position?: "right" | "top" | "bottom" | "left";
}

export default function Tooltip({ children, content, position = "right" }: Props) {
  const [show, setShow] = useState(false);
  if (!content) return <>{children}</>;

  const pos: Record<string, string> = {
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <div className="relative inline-block w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span
          className={`absolute ${pos[position]} whitespace-nowrap z-[999] px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-slate-900 text-white shadow-lg border border-white/10 pointer-events-none`}
          style={{ animation: "var(--animate-fade-in)" }}
        >
          {content}
        </span>
      )}
    </div>
  );
}
