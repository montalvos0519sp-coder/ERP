"use client";
import { useEffect, useState } from "react";

/** Hook para detectar atajos globales tipo Ctrl+K / Cmd+K. */
export function useKeyPress(targetKey: string, modifier?: "metaKey" | "ctrlKey" | "shiftKey" | "altKey") {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const target = targetKey.toLowerCase();
    const down = (e: KeyboardEvent) => {
      if (!e.key || e.key.toLowerCase() !== target) return;
      if (modifier && !(e as any)[modifier]) return;
      e.preventDefault();
      setPressed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key && e.key.toLowerCase() === target) setPressed(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [targetKey, modifier]);
  // El consumidor revisa pressed y resetea. Lo dejamos lazy.
  useEffect(() => {
    if (!pressed) return;
    const t = setTimeout(() => setPressed(false), 50);
    return () => clearTimeout(t);
  }, [pressed]);
  return pressed;
}

/** Cierra un dropdown al hacer click fuera. */
export function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}
