"use client";

// SGC · Biblioteca de Plantillas ISO (ISO 9001 · 7.5).
// Catálogo profesional de plantillas documentales agrupadas por el ciclo PHVA,
// con información de cada documento y generación en un clic como borrador
// controlado para la empresa activa.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileStack, RefreshCw, Search, Eye, Download, X, Copy, ChevronDown, ChevronUp,
  ScrollText, BookOpen, FileText, ListChecks, ClipboardList, CalendarRange, Table2, File,
  MousePointerClick, FileSignature, CheckCircle2, ShieldCheck, LayoutGrid, Layers, Info, ListTree,
  FileType2,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { DocSheet } from "@/components/documentos/DocWord";

const CATEGORIAS = [
  ["TODAS", "Todas"], ["POLITICA", "Política"], ["MANUAL", "Manual"],
  ["PROCEDIMIENTO", "Procedimiento"], ["INSTRUCTIVO", "Instructivo"], ["FORMATO", "Formato"],
  ["PLAN", "Plan"], ["MATRIZ", "Matriz"], ["OTRO", "Otro"],
];
const CAT_META: Record<string, { icon: any; color: string }> = {
  POLITICA: { icon: ScrollText, color: "#6366F1" },
  MANUAL: { icon: BookOpen, color: "#8B5CF6" },
  PROCEDIMIENTO: { icon: FileText, color: "#0EA5E9" },
  INSTRUCTIVO: { icon: ListChecks, color: "#14B8A6" },
  FORMATO: { icon: ClipboardList, color: "#F59E0B" },
  PLAN: { icon: CalendarRange, color: "#10B981" },
  MATRIZ: { icon: Table2, color: "#F43F5E" },
  OTRO: { icon: File, color: "#94A3B8" },
};

// Ciclo PHVA derivado de la cláusula ISO (4-6 Planear, 7-8 Hacer, 9 Verificar, 10 Actuar).
const FASES = [
  { id: "P", label: "Planear", desc: "Contexto, liderazgo y planificación", clausulas: "4 · 5 · 6", color: "#6366F1" },
  { id: "H", label: "Hacer", desc: "Apoyo y operación", clausulas: "7 · 8", color: "#0EA5E9" },
  { id: "V", label: "Verificar", desc: "Evaluación del desempeño", clausulas: "9", color: "#14B8A6" },
  { id: "A", label: "Actuar", desc: "Mejora continua", clausulas: "10", color: "#F59E0B" },
  { id: "G", label: "General", desc: "Documentos transversales", clausulas: "—", color: "#94A3B8" },
];
function faseDe(clausula: string): string {
  const n = parseInt(String(clausula || "").trim(), 10);
  if (n >= 4 && n <= 6) return "P";
  if (n === 7 || n === 8) return "H";
  if (n === 9) return "V";
  if (n === 10) return "A";
  return "G";
}

// Extrae los títulos de sección del contenido para un índice "qué incluye".
function parseSecciones(contenido: string): string[] {
  if (!contenido) return [];
  const lineas = String(contenido).split("\n");
  const out: string[] = [];
  lineas.forEach((raw, i) => {
    const l = raw.trim();
    if (!l || l.includes("|") || /[═─]/.test(l) || l.includes("{{")) return;
    // Secciones numeradas tipo "1. OBJETIVO".
    const num = l.match(/^(\d+)\.\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,/()-]{2,56})$/);
    if (num) { out.push(num[2].replace(/\s+/g, " ").trim()); return; }
    // Títulos en mayúsculas (formatos/matrices), saltando el encabezado.
    if (i > 12 && /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,/()-]{3,52}$/.test(l) && !/^\d/.test(l)) {
      out.push(l.replace(/\s+/g, " ").trim());
    }
  });
  // Dedupe conservando orden.
  return Array.from(new Set(out)).slice(0, 10);
}

export default function PlantillasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("TODAS");
  const [agrupar, setAgrupar] = useState(true);
  const [guia, setGuia] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [word, setWord] = useState<number | null>(null);
  const [ver, setVer] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getPlantillasDoc()
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const generar = async (p: any) => {
    if (!empresaActivaId) { alert("Selecciona una empresa activa."); return; }
    setBusy(p.id);
    try {
      const r = await api.generarDocumentoDesdePlantilla(p.id, empresaActivaId);
      if (r?.documento) router.push(`/documentos/${r.documento}?nuevo=1`);
      else alert("Documento generado en borrador. Revísalo en Documentos.");
    } catch (e) { alert((e as Error).message); } finally { setBusy(null); }
  };

  const descargarWord = async (p: any) => {
    setWord(p.id);
    try { await api.descargarPlantillaWord(p.id, empresaActivaId || undefined); }
    catch (e) { alert((e as Error).message); } finally { setWord(null); }
  };

  const visibles = useMemo(() => items.filter((p) => {
    if (q && !`${p.nombre} ${p.codigo} ${p.descripcion || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fCat !== "TODAS" && p.categoria !== fCat) return false;
    return true;
  }), [items, q, fCat]);

  const stats = useMemo(() => {
    const cats = new Set(items.map((p) => p.categoria));
    const clausulas = new Set(items.map((p) => String(p.clausula || "").trim()).filter(Boolean));
    return { total: items.length, oblig: items.filter((p) => p.obligatoria).length, cats: cats.size, clausulas: clausulas.size };
  }, [items]);

  const porFase = useMemo(() => {
    const g: Record<string, any[]> = { P: [], H: [], V: [], A: [], G: [] };
    visibles.forEach((p) => { g[faseDe(p.clausula)].push(p); });
    return g;
  }, [visibles]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  const renderCard = (p: any) => {
    const cm = CAT_META[p.categoria] || CAT_META.OTRO;
    const secs = parseSecciones(p.contenido);
    return (
      <div key={p.id} className={`group rounded-2xl border p-4 flex flex-col transition hover:shadow-lg ${card}`} style={{ borderTopColor: cm.color, borderTopWidth: 3 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.color + "1f", color: cm.color }}><cm.icon className="w-4.5 h-4.5" /></span>
            <div className="min-w-0">
              <span className={`font-mono text-[10px] font-black ${theme.textTertiary}`}>{p.codigo}</span>
              <h3 className={`text-sm font-black leading-tight ${theme.textPrimary}`}>{p.nombre}</h3>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0" style={{ background: cm.color + "1a", color: cm.color }}>{p.categoria_display || p.categoria}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {p.clausula && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400">ISO {p.clausula}</span>}
          {p.obligatoria && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 inline-flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5" /> Obligatoria</span>}
          {secs.length > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${isDarkMode ? "bg-white/[0.05] text-slate-400" : "bg-slate-100 text-slate-500"}`}><ListTree className="w-2.5 h-2.5" /> {secs.length} secciones</span>}
        </div>
        {p.descripcion && <p className={`text-xs mt-2 line-clamp-2 ${theme.textSecondary}`}>{p.descripcion}</p>}
        {secs.length > 0 && (
          <div className={`mt-2 text-[11px] line-clamp-2 ${theme.textTertiary}`}>
            <span className="font-bold">Incluye: </span>{secs.slice(0, 5).join(" · ")}{secs.length > 5 ? "…" : ""}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: isDarkMode ? "#ffffff0d" : "#0000000a" }}>
          <button onClick={() => generar(p)} disabled={busy === p.id} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-md transition">
            {busy === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSignature className="w-3.5 h-3.5" />} {busy === p.id ? "Generando…" : "Generar"}
          </button>
          <button onClick={() => descargarWord(p)} disabled={word === p.id} title="Descargar Word (.docx)" className={`inline-flex items-center justify-center gap-1 px-3 h-9 rounded-lg border text-xs font-bold disabled:opacity-50 ${isDarkMode ? "border-sky-400/30 text-sky-300 hover:bg-sky-500/10" : "border-sky-200 text-sky-600 hover:bg-sky-50"}`}>{word === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileType2 className="w-4 h-4" />} Word</button>
          {p.contenido && <button onClick={() => setVer(p)} title="Vista previa" className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.05]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Eye className="w-4 h-4" /></button>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #6366F1 0, transparent 40%), radial-gradient(circle at 90% 80%, #8B5CF6 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-600"><FileStack className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Biblioteca de Plantillas</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-indigo-500 to-violet-600">ISO 7.5</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>Documentación ISO 9001:2015 lista para usar. Genera cada documento con un clic; se rellena con los datos de tu empresa y queda como borrador controlado.</p>
              </div>
            </div>
            <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Stat icon={FileStack} color="#6366F1" label="Plantillas" value={stats.total} isDark={isDarkMode} theme={theme} />
            <Stat icon={ShieldCheck} color="#F43F5E" label="Obligatorias" value={stats.oblig} isDark={isDarkMode} theme={theme} />
            <Stat icon={Layers} color="#0EA5E9" label="Categorías" value={stats.cats} isDark={isDarkMode} theme={theme} />
            <Stat icon={CheckCircle2} color="#10B981" label="Cláusulas ISO" value={stats.clausulas} isDark={isDarkMode} theme={theme} />
          </div>
        </div>
      </div>

      {/* Banner método */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button onClick={() => setGuia(!guia)} className="w-full flex items-center justify-between gap-2 px-4 py-3">
          <span className={`text-sm font-black flex items-center gap-2 ${theme.textPrimary}`}><Info className="w-4 h-4 text-indigo-400" /> ¿Cómo funciona la biblioteca?</span>
          {guia ? <ChevronUp className={`w-4 h-4 ${theme.textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${theme.textTertiary}`} />}
        </button>
        {guia && (
          <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-white/[0.06]" : "border-slate-100"}`}>
            <p className={`text-xs mt-3 mb-3 ${theme.textSecondary}`}>
              Redactar la documentación desde cero es el mayor freno para certificarse. Aquí cada plantilla ya trae la estructura formal que pide la norma (control documental, secciones por cláusula y campos a completar). El método es simple:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { ic: MousePointerClick, t: "1. Elige", d: "Selecciona la plantilla por fase PHVA o categoría. Pulsa «Vista» para ver su contenido." },
                { ic: FileSignature, t: "2. Genera", d: "Con un clic se crea un documento rellenando {{empresa}}, {{fecha}} y demás campos automáticos." },
                { ic: CheckCircle2, t: "3. Edita y aprueba", d: "Queda como borrador controlado en Gestión Documental para personalizar, versionar y aprobar." },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl border p-3 ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2 mb-1"><span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center"><s.ic className="w-4 h-4" /></span><span className={`text-xs font-black ${theme.textPrimary}`}>{s.t}</span></div>
                  <p className={`text-[11px] leading-snug ${theme.textTertiary}`}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {CATEGORIAS.map(([v, l]) => {
            const n = v === "TODAS" ? items.length : items.filter((p) => p.categoria === v).length;
            if (v !== "TODAS" && n === 0) return null;
            return (
              <button key={v} onClick={() => setFCat(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${fCat === v ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
                {l} <span className={`px-1 rounded ${fCat === v ? "bg-white/20" : isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plantilla…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
          <div className={`flex rounded-lg border overflow-hidden ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
            <button onClick={() => setAgrupar(true)} className={`p-2 ${agrupar ? "bg-indigo-500 text-white" : theme.textTertiary}`} title="Por fase PHVA"><Layers className="w-4 h-4" /></button>
            <button onClick={() => setAgrupar(false)} className={`p-2 ${!agrupar ? "bg-indigo-500 text-white" : theme.textTertiary}`} title="Cuadrícula"><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><FileStack className="w-10 h-10 mx-auto mb-3 text-indigo-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin plantillas</p><p className={`text-sm ${theme.textSecondary}`}>No hay plantillas para esta categoría o búsqueda.</p></div>
      ) : agrupar ? (
        // ── AGRUPADO POR FASE PHVA ──
        <div className="space-y-6">
          {FASES.map((fase) => {
            const lista = porFase[fase.id];
            if (!lista || lista.length === 0) return null;
            return (
              <div key={fase.id}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-sm" style={{ background: fase.color }}>{fase.id === "G" ? "·" : fase.id}</span>
                  <div className="flex-1">
                    <h2 className={`text-sm font-black ${theme.textPrimary}`}>{fase.label} <span className="font-bold" style={{ color: fase.color }}>· {fase.desc}</span></h2>
                    <span className={`text-[11px] ${theme.textTertiary}`}>Cláusulas {fase.clausulas} · {lista.length} plantilla{lista.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{lista.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{visibles.map(renderCard)}</div>
      )}

      {/* Modal vista previa */}
      {ver && (() => {
        const cm = CAT_META[ver.categoria] || CAT_META.OTRO;
        const secs = parseSecciones(ver.contenido);
        return (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setVer(null)}>
            <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-4xl rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col ${isDarkMode ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
              <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-700 flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-white flex items-center gap-2 truncate"><cm.icon className="w-4 h-4 shrink-0" /> {ver.nombre}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-white/70">{ver.codigo}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white">{ver.categoria_display || ver.categoria}</span>
                    {ver.clausula && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white">ISO {ver.clausula}</span>}
                    {ver.obligatoria && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-400/30 text-white">Obligatoria</span>}
                  </div>
                </div>
                <button onClick={() => setVer(null)} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0"><X className="w-4 h-4 text-white/80" /></button>
              </div>
              <div className="flex-1 overflow-hidden flex">
                {/* Índice de secciones */}
                {secs.length > 0 && (
                  <div className={`hidden md:block w-56 shrink-0 overflow-auto p-4 border-r ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                    {ver.descripcion && <p className={`text-[11px] mb-3 ${theme.textSecondary}`}>{ver.descripcion}</p>}
                    <div className={`text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1 ${theme.textTertiary}`}><ListTree className="w-3.5 h-3.5" /> Contenido</div>
                    <ol className="space-y-1">
                      {secs.map((s, i) => (
                        <li key={i} className={`text-[11px] leading-snug flex gap-1.5 ${theme.textSecondary}`}><span className="font-black" style={{ color: cm.color }}>{i + 1}.</span> <span className="truncate">{s}</span></li>
                      ))}
                    </ol>
                  </div>
                )}
                {/* Hoja del documento */}
                <div className={`flex-1 overflow-auto p-5 ${isDarkMode ? "bg-[#0b1220]" : "bg-slate-100"}`}>
                  <DocSheet contenido={ver.contenido} compact />
                  <p className={`text-center text-[11px] mt-3 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Vista previa. Los campos {"{{…}}"} se completan automáticamente al generar ({"{{empresa}}"}, {"{{fecha}}"}, {"{{anio}}"}, {"{{rfc}}"}).
                  </p>
                </div>
              </div>
              <div className={`px-5 py-3 border-t flex items-center justify-end gap-2 shrink-0 ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
                <button onClick={() => { navigator.clipboard?.writeText(ver.contenido || ""); }} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
                <button onClick={() => descargarWord(ver)} disabled={word === ver.id} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50 ${isDarkMode ? "border-sky-400/30 text-sky-300 hover:bg-sky-500/10" : "border-sky-200 text-sky-600 hover:bg-sky-50"}`}>
                  {word === ver.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileType2 className="w-3.5 h-3.5" />} Descargar Word
                </button>
                <button onClick={() => { generar(ver); setVer(null); }} disabled={busy === ver.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-violet-600">
                  <FileSignature className="w-3.5 h-3.5" /> Generar documento
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-2xl border p-3 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}
