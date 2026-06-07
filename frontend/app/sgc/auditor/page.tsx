"use client";

// SGC · Modo Auditor — checklist de auditoría por cláusula ISO 9001, imprimible,
// para preparar la certificación. Reúne requisito + estado de cumplimiento del
// diagnóstico + evidencia + hallazgos, con veredicto y semáforo de certificación.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Printer, ClipboardCheck, CheckCircle2, AlertTriangle,
  XCircle, CircleDashed, ShieldCheck, Search,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const VEREDICTO: Record<string, { label: string; cls: string; icon: any; color: string }> = {
  SI: { label: "Conforme", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, color: "#10B981" },
  PARCIAL: { label: "Observación", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: AlertTriangle, color: "#F59E0B" },
  NO: { label: "No conforme", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: XCircle, color: "#F43F5E" },
  NA: { label: "No aplica", cls: "bg-slate-500/15 text-slate-500 border-slate-500/30", icon: CircleDashed, color: "#94A3B8" },
  PENDIENTE: { label: "Pendiente", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", icon: CircleDashed, color: "#94A3B8" },
};

export default function ModoAuditorPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId, user } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.getChecklistAuditoria(empresaActivaId || undefined)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const r = data?.resumen;
  const capitulos = useMemo(() => {
    const caps = data?.capitulos || [];
    if (filtro === "TODOS" && !q) return caps;
    const ql = q.toLowerCase();
    return caps.map((c: any) => ({
      ...c,
      items: c.items.filter((it: any) =>
        (filtro === "TODOS" || it.cumple === filtro) &&
        (!ql || `${it.clausula} ${it.titulo} ${it.descripcion}`.toLowerCase().includes(ql))),
    })).filter((c: any) => c.items.length);
  }, [data, filtro, q]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const hoy = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5 print:p-0 print:max-w-none">
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { break-inside: avoid; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Hero (no se imprime) */}
      <div className={`relative overflow-hidden rounded-3xl border ${card} no-print`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #334155 0, transparent 40%), radial-gradient(circle at 90% 80%, #10B981 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"><ClipboardCheck className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Modo Auditor</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-slate-600 to-slate-800">ISO 9001:2015</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Checklist de auditoría por cláusula, con veredicto y evidencia — listo para imprimir y preparar la certificación.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-slate-700 to-slate-900 shadow-md hover:shadow-lg transition"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
            </div>
          </div>
          {/* Barra de progreso de cumplimiento */}
          {r && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Avance hacia la certificación</span>
                <span className="text-sm font-black" style={{ color: r.listo_certificacion ? "#10B981" : "#F59E0B" }}>{r.cumplimiento}% conforme</span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.cumplimiento}%`, background: r.listo_certificacion ? "linear-gradient(90deg,#10B981,#34D399)" : "linear-gradient(90deg,#F59E0B,#FBBF24)" }} />
              </div>
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] ${theme.textTertiary}`}>
                <span><b className="text-emerald-500">{r.conformes}</b> conformes</span>
                <span><b className="text-amber-500">{r.observaciones}</b> observaciones</span>
                <span><b className="text-rose-500">{r.no_conformes}</b> no conformes</span>
                <span><b>{r.pendientes}</b> pendientes</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encabezado del reporte (se imprime) */}
      <div className={`rounded-2xl border p-5 ${card} print-break`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-lg font-black ${theme.textPrimary}`}>Reporte de Auditoría Interna — ISO 9001:2015</h2>
            <p className={`text-sm ${theme.textSecondary}`}>Empresa: <b>{user?.empresas?.find((e: any) => e.id === empresaActivaId)?.nombre || "—"}</b> · Fecha: {hoy}</p>
            <p className={`text-xs mt-0.5 ${theme.textTertiary}`}>Auditor: {user?.first_name || user?.username || "—"} · Norma de referencia: ISO 9001:2015</p>
          </div>
          {r && (
            <div className={`text-center px-4 py-2 rounded-xl border ${r.listo_certificacion ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
              <div className="text-2xl font-black" style={{ color: r.listo_certificacion ? "#10B981" : "#F59E0B" }}>{r.cumplimiento}%</div>
              <div className={`text-[10px] font-bold uppercase ${theme.textTertiary}`}>cumplimiento</div>
            </div>
          )}
        </div>
        {/* Veredicto global */}
        {r && (
          <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl ${r.listo_certificacion ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
            <ShieldCheck className={`w-5 h-5 ${r.listo_certificacion ? "text-emerald-500" : "text-amber-500"}`} />
            <span className={`text-sm font-bold ${theme.textPrimary}`}>
              {r.listo_certificacion
                ? "Sistema listo para certificación: sin no conformidades ni requisitos pendientes."
                : `Pendiente para certificación: ${r.no_conformes} no conformidades y ${r.pendientes} requisitos sin evaluar.`}
            </span>
          </div>
        )}
        {/* Resumen numérico */}
        {r && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
            <Resumen label="Requisitos" value={r.total} color="#6366F1" theme={theme} isDark={isDarkMode} />
            <Resumen label="Conformes" value={r.conformes} color="#10B981" theme={theme} isDark={isDarkMode} />
            <Resumen label="Observaciones" value={r.observaciones} color="#F59E0B" theme={theme} isDark={isDarkMode} />
            <Resumen label="No conformes" value={r.no_conformes} color="#F43F5E" theme={theme} isDark={isDarkMode} />
            <Resumen label="Pendientes" value={r.pendientes} color="#94A3B8" theme={theme} isDark={isDarkMode} />
          </div>
        )}
      </div>

      {/* Filtros (no se imprime) */}
      <div className="flex items-center justify-between gap-2 flex-wrap no-print">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todos"], ["SI", "Conformes"], ["PARCIAL", "Observaciones"], ["NO", "No conformes"], ["PENDIENTE", "Pendientes"]].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${filtro === v ? "bg-slate-700 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cláusula o requisito…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
      </div>

      {/* Checklist por capítulo */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando checklist…</p>
      : !capitulos.length ? <p className={`text-sm ${theme.textTertiary}`}>Sin requisitos. Completa el diagnóstico ISO primero.</p>
      : capitulos.map((c: any) => (
        <div key={c.capitulo} className={`rounded-2xl border overflow-hidden ${card} print-break`}>
          <div className={`flex items-center justify-between px-4 py-2.5 ${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
            <h3 className={`text-sm font-black ${theme.textPrimary}`}><span className="font-mono">{c.capitulo}.</span> {c.nombre}</h3>
            <span className={`text-xs font-bold ${theme.textTertiary}`}>{c.conforme}/{c.total} conformes · {c.cumplimiento}%</span>
          </div>
          <div className="divide-y" style={{ borderColor: isDarkMode ? "#ffffff0f" : "#0000000a" }}>
            {c.items.map((it: any) => {
              const v = VEREDICTO[it.cumple] || VEREDICTO.PENDIENTE;
              return (
                <div key={it.id} className="px-4 py-3 print-break">
                  <div className="flex items-start gap-3">
                    <v.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: v.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${theme.textPrimary}`}><span className="font-mono text-xs">{it.clausula}</span> · {it.titulo}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${v.cls}`}>{v.label}</span>
                      </div>
                      {it.descripcion && <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{it.descripcion}</p>}
                      {it.evidencia && <p className={`text-xs mt-1 ${theme.textTertiary}`}><b>Evidencia:</b> {it.evidencia}</p>}
                      {it.observaciones && <p className="text-xs mt-1 text-amber-600"><b>Observación:</b> {it.observaciones}</p>}
                      {it.hallazgos?.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {it.hallazgos.map((h: any, i: number) => (
                            <p key={i} className="text-xs text-rose-600"><b>Hallazgo ({h.tipo_display}):</b> {h.descripcion} <span className={theme.textTertiary}>— {h.auditoria}</span></p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Firmas (se imprime) */}
      <div className="grid grid-cols-2 gap-8 pt-8 mt-4 print-break">
        {["Auditor líder", "Responsable de calidad"].map((rol) => (
          <div key={rol} className="text-center">
            <div className={`border-t pt-1 ${isDarkMode ? "border-white/20" : "border-slate-400"}`}>
              <span className={`text-xs font-bold ${theme.textSecondary}`}>{rol}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumen({ label, value, color, theme, isDark }: any) {
  return (
    <div className={`rounded-xl border p-2.5 text-center ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
      <div className="text-xl font-black tabular-nums" style={{ color }}>{value}</div>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}
