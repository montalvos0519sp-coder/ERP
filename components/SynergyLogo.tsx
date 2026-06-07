"use client";

import React from "react";

/* ════════════════════════════════════════════════════════════════════════
   SYNERGY CG — Logo vectorial (recreación del isotipo: globo + órbita + camión)
   Escala perfecto a cualquier tamaño. Usar `mark` para solo el isotipo.
   ════════════════════════════════════════════════════════════════════════ */

const NAVY = "#0A1A3F";
const BLUE = "#1A73E8";
const ORANGE = "#F7941E";

export function SynergyMark({ className = "", glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 72 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="syn-globe" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#5BA4FF" />
          <stop offset="55%" stopColor={BLUE} />
          <stop offset="100%" stopColor={NAVY} />
        </radialGradient>
        <linearGradient id="syn-orbit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB04D" />
          <stop offset="100%" stopColor={ORANGE} />
        </linearGradient>
        {glow && (
          <filter id="syn-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>

      <g filter={glow ? "url(#syn-glow)" : undefined}>
        {/* Globo */}
        <circle cx="40" cy="28" r="17" fill="url(#syn-globe)" />
        {/* Meridianos y paralelos */}
        <g stroke="rgba(255,255,255,0.55)" strokeWidth="1" fill="none">
          <ellipse cx="40" cy="28" rx="6.5" ry="17" />
          <ellipse cx="40" cy="28" rx="13" ry="17" />
          <line x1="23" y1="28" x2="57" y2="28" />
          <path d="M25.5 19 H54.5" />
          <path d="M25.5 37 H54.5" />
        </g>

        {/* Órbita naranja (swoosh con flecha) */}
        <g transform="rotate(-24 40 28)">
          <path
            d="M16 28 A24 11 0 1 1 64 28"
            stroke="url(#syn-orbit)"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M64 28 l-5 -3.4 l0 6.8 z" fill={ORANGE} />
        </g>

        {/* Camión (cadena de suministro) */}
        <g transform="translate(10 33)">
          <rect x="0" y="2" width="13" height="10" rx="1.4" fill={NAVY} stroke="#fff" strokeWidth="1" />
          <path d="M13 5 h5.2 l3.3 3.6 V12 H13 Z" fill={NAVY} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
          <rect x="14.3" y="6" width="3.4" height="2.6" rx="0.5" fill="#9CC2FF" />
          <circle cx="5" cy="13.5" r="2.4" fill="#0B0F22" stroke="#fff" strokeWidth="0.9" />
          <circle cx="17.5" cy="13.5" r="2.4" fill="#0B0F22" stroke="#fff" strokeWidth="0.9" />
        </g>
      </g>
    </svg>
  );
}

/* Logo completo: isotipo + wordmark "SYNERGY CG".
   variant="onDark" usa texto blanco; "onLight" usa azul marino. */
export default function SynergyLogo({
  size = "md",
  variant = "onDark",
  tagline = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "onDark" | "onLight";
  tagline?: boolean;
  className?: string;
}) {
  const dims = { sm: "h-7", md: "h-9", lg: "h-12" }[size];
  const txt = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];
  const primary = variant === "onDark" ? "text-white" : "";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <SynergyMark className={`${dims} w-auto shrink-0`} />
      <div className="leading-none">
        <p className={`font-black tracking-tight ${txt}`}>
          <span className={primary} style={variant === "onLight" ? { color: NAVY } : undefined}>SYNERGY</span>{" "}
          <span style={{ color: ORANGE }}>CG</span>
        </p>
        {tagline && (
          <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-1">
            Soluciones integrales para tu cadena de suministro
          </p>
        )}
      </div>
    </div>
  );
}
