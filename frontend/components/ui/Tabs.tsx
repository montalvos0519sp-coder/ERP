"use client";

import React from "react";
import type { Theme } from "@/lib/theme";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  theme: Theme;
}

export default function Tabs({ tabs, activeTab, onChange, theme }: TabsProps) {
  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-xl border ${theme.divider} ${
        theme.mode === "dark" ? "bg-white/[0.02]" : "bg-slate-100/50"
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-black tracking-wider uppercase transition-all duration-300 ${
            activeTab === tab.id
              ? theme.mode === "dark"
                ? "bg-[#1E293B] text-white shadow-md border border-white/5"
                : "bg-white text-[#1A73E8] shadow-sm border border-slate-200/50"
              : `${theme.textSecondary} hover:bg-white/5`
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
