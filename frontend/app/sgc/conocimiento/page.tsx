"use client";

// SGC · Base de Conocimiento / Lecciones Aprendidas (ISO 9001 · 7.1.6).
// Conocimientos de la organización: lecciones, mejores prácticas y fuentes
// externas — con guía de uso, estadísticas, nube de etiquetas y formulario
// dinámico (tipo en tarjetas, etiquetas tipo chip y estructura sugerida).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Lightbulb, Plus, RefreshCw, X, Search, Trash2, GraduationCap, Award,
  Briefcase, BookOpen, Layers, Tag, Hash, Repeat, Info, ChevronDown, ChevronUp,
  Wand2, User, Calendar, FolderOpen,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const TIPOS: [string, string][] = [
  ["LECCION", "Lección aprendida"], ["MEJOR_PRACTICA", "Mejor práctica"],
  ["EXPERIENCIA", "Experiencia"], ["FUENTE_EXTERNA", "Fuente externa"], ["OTRO", "Otro"],
];
const TIPO_META: Record<string, { color: string; icon: any; desc: string; plantilla: string }> = {
  LECCION: {
    color: "#F59E0B", icon: GraduationCap,
    desc: "Algo que salió mal o bien y dejó una enseñanza.",
    plantilla: "Situación / contexto:\n\n¿Qué ocurrió?:\n\n¿Qué aprendimos?:\n\n¿Cómo evitarlo o repetirlo a futuro?:\n",
  },
  MEJOR_PRACTICA: {
    color: "#10B981", icon: Award,
    desc: "Una forma de trabajar probada que conviene estandarizar.",
    plantilla: "Descripción de la práctica:\n\nBeneficio / resultado obtenido:\n\nCómo implementarla paso a paso:\n",
  },
  EXPERIENCIA: {
    color: "#0EA5E9", icon: Briefcase,
    desc: "Conocimiento adquirido por la operación o un proyecto.",
    plantilla: "Contexto:\n\nLo que hicimos:\n\nRecomendaciones para casos similares:\n",
  },
  FUENTE_EXTERNA: {
    color: "#8B5CF6", icon: BookOpen,
    desc: "Norma, curso, proveedor o referencia útil de fuera.",
    plantilla: "Resumen de la fuente:\n\nAplicabilidad a la organización:\n\nReferencia / liga:\n",
  },
  OTRO: { color: "#94A3B8", icon: Layers, desc: "Cualquier otro conocimiento a preservar.", plantilla: "" },
};
const lblDe = (arr: [string, string][], v: string) => arr.find(([x]) => x === v)?.[1] || v;
const tagsDe = (s: any) => String(s || "").split(",").map((t) => t.trim()).filter(Boolean);

export default function ConocimientoPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState("TODOS");
  const [fTag, setFTag] = useState<string | null>(null);
  const [guia, setGuia] = useState(true);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getConocimiento({ empresa: String(empresaActivaId) })
      .then((r) => setItems(r?.results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const eliminar = async (e: any, k: any) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${k.titulo}"?`)) return;
    try { await api.eliminarConocimiento(k.id); load(); } catch (err) { alert((err as Error).message); }
  };

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    TIPOS.forEach(([v]) => { by[v] = items.filter((k) => k.tipo === v).length; });
    const areas = new Set(items.map((k) => (k.area || "").trim()).filter(Boolean));
    const tagCount: Record<string, number> = {};
    items.forEach((k) => tagsDe(k.etiquetas).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 14);
    const areasList = Array.from(areas).sort();
    return { by, total: items.length, areas: areas.size, areasList, topTags };
  }, [items]);

  const visibles = useMemo(() => items.filter((k) => {
    if (q && !`${k.titulo} ${k.contenido} ${k.etiquetas} ${k.area}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fTipo !== "TODOS" && k.tipo !== fTipo) return false;
    if (fTag && !tagsDe(k.etiquetas).includes(fTag)) return false;
    return true;
  }), [items, q, fTipo, fTag]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #F59E0B 0, transparent 40%), radial-gradient(circle at 90% 80%, #F97316 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/sgc")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}><ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} /></button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600"><Lightbulb className="w-7 h-7 text-white" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>Base de Conocimiento</h1>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-amber-500 to-orange-600">ISO 7.1.6</span>
                </div>
                <p className={`text-sm mt-0.5 max-w-xl ${theme.textSecondary}`}>El "saber" de tu organización: lecciones aprendidas, mejores prácticas y fuentes — para no repetir errores ni perder conocimiento cuando alguien se va.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md hover:shadow-lg transition"><Plus className="w-4 h-4" /> Nuevo conocimiento</button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-5">
            <Stat icon={Lightbulb} color="#F59E0B" label="Total" value={stats.total} isDark={isDarkMode} theme={theme} />
            <Stat icon={GraduationCap} color="#F59E0B" label="Lecciones" value={stats.by.LECCION || 0} isDark={isDarkMode} theme={theme} />
            <Stat icon={Award} color="#10B981" label="Prácticas" value={stats.by.MEJOR_PRACTICA || 0} isDark={isDarkMode} theme={theme} />
            <Stat icon={Briefcase} color="#0EA5E9" label="Experiencias" value={stats.by.EXPERIENCIA || 0} isDark={isDarkMode} theme={theme} />
            <Stat icon={BookOpen} color="#8B5CF6" label="Fuentes" value={stats.by.FUENTE_EXTERNA || 0} isDark={isDarkMode} theme={theme} />
            <Stat icon={FolderOpen} color="#64748B" label="Áreas" value={stats.areas} isDark={isDarkMode} theme={theme} />
          </div>
        </div>
      </div>

      {/* Guía de uso */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <button onClick={() => setGuia(!guia)} className="w-full flex items-center justify-between gap-2 px-4 py-3">
          <span className={`text-sm font-black flex items-center gap-2 ${theme.textPrimary}`}><Info className="w-4 h-4 text-amber-500" /> ¿Cómo usar la base de conocimiento?</span>
          {guia ? <ChevronUp className={`w-4 h-4 ${theme.textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${theme.textTertiary}`} />}
        </button>
        {guia && (
          <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-white/[0.06]" : "border-slate-100"}`}>
            <p className={`text-xs mt-3 mb-3 ${theme.textSecondary}`}>
              ISO 9001 <b>7.1.6</b> pide determinar, mantener y poner a disposición el conocimiento necesario para operar. Aquí preservas ese saber para que no se pierda. El método es simple:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { ic: Plus, t: "1. Captura", d: "Al cerrar un proyecto, auditoría o incidente, registra qué aprendiste mientras está fresco." },
                { ic: Tag, t: "2. Clasifica", d: "Asigna el tipo (lección, práctica, fuente…) y el área o proceso al que pertenece." },
                { ic: Hash, t: "3. Etiqueta", d: "Agrega etiquetas (#proveedores, #calidad…) para encontrarlo en segundos." },
                { ic: Repeat, t: "4. Reutiliza", d: "Antes de iniciar un trabajo similar, consúltala para no repetir errores." },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl border p-3 ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2 mb-1"><span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center"><s.ic className="w-4 h-4" /></span><span className={`text-xs font-black ${theme.textPrimary}`}>{s.t}</span></div>
                  <p className={`text-[11px] leading-snug ${theme.textTertiary}`}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nube de etiquetas */}
      {stats.topTags.length > 0 && (
        <div className={`rounded-2xl border p-3 ${card}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider mr-1 inline-flex items-center gap-1 ${theme.textTertiary}`}><Hash className="w-3.5 h-3.5" /> Etiquetas</span>
            {stats.topTags.map(([t, n]) => {
              const on = fTag === t;
              return (
                <button key={t} onClick={() => setFTag(on ? null : t)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition ${on ? "bg-amber-500 text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.05]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  #{t} <span className="opacity-70 tabular-nums">{n}</span>
                </button>
              );
            })}
            {fTag && <button onClick={() => setFTag(null)} className="text-[11px] text-amber-500 font-bold ml-1">limpiar</button>}
          </div>
        </div>
      )}

      {/* Filtros + búsqueda */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {[["TODOS", "Todos"], ...TIPOS].map(([v, l]) => {
            const n = v === "TODOS" ? items.length : (stats.by[v] || 0);
            const tm = TIPO_META[v];
            return (
              <button key={v} onClick={() => setFTipo(v)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${fTipo === v ? "text-white border-transparent" : isDarkMode ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}
                style={fTipo === v ? { background: v === "TODOS" ? "#F59E0B" : tm.color } : undefined}>
                {tm && <tm.icon className="w-3.5 h-3.5" />} {l} <span className={`px-1 rounded ${fTipo === v ? "bg-white/20" : isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative"><Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textTertiary}`} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conocimiento…" className={`pl-8 pr-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} /></div>
      </div>

      {/* Listado */}
      {loading ? <p className={`text-sm ${theme.textTertiary}`}>Cargando…</p>
      : items.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}><Lightbulb className="w-10 h-10 mx-auto mb-3 text-amber-400" /><p className={`font-bold ${theme.textPrimary}`}>Sin conocimientos registrados</p><p className={`text-sm mb-4 ${theme.textSecondary}`}>Empieza capturando una lección aprendida o una mejor práctica reciente.</p><button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600"><Plus className="w-4 h-4" /> Crear el primero</button></div>
      ) : visibles.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${card}`}><Search className="w-8 h-8 mx-auto mb-2 text-amber-400" /><p className={`text-sm ${theme.textSecondary}`}>Sin resultados para el filtro actual.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibles.map((k) => {
            const tm = TIPO_META[k.tipo] || TIPO_META.OTRO;
            return (
              <div key={k.id} className={`group relative rounded-2xl border p-4 transition hover:shadow-lg ${card}`} style={{ borderLeftColor: tm.color, borderLeftWidth: 3 }}>
                <button onClick={() => setEdit(k)} className="text-left w-full">
                  <div className="flex items-start gap-2.5">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: tm.color + "1f", color: tm.color }}><tm.icon className="w-4.5 h-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`text-sm font-black pr-5 ${theme.textPrimary}`}>{k.titulo}</h3>
                      </div>
                      <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full mt-1" style={{ background: tm.color + "1a", color: tm.color }}>{k.tipo_display || lblDe(TIPOS, k.tipo)}</span>
                      {k.area && <span className={`inline-flex items-center gap-1 text-[10px] ml-1.5 ${theme.textTertiary}`}><FolderOpen className="w-3 h-3" /> {k.area}</span>}
                    </div>
                  </div>
                  {k.contenido && <p className={`text-xs mt-2.5 line-clamp-3 ${theme.textSecondary}`}>{k.contenido}</p>}
                  {k.origen && <div className={`text-[11px] mt-2 ${theme.textTertiary}`}>Origen: <span className={theme.textSecondary}>{k.origen}</span></div>}
                  {tagsDe(k.etiquetas).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tagsDe(k.etiquetas).map((t: string) => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-white/[0.06] text-slate-300" : "bg-amber-50 text-amber-700"}`}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className={`flex items-center justify-between gap-2 mt-3 pt-2.5 border-t text-[11px] ${theme.textTertiary}`} style={{ borderColor: isDarkMode ? "#ffffff0d" : "#0000000a" }}>
                    <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {k.autor_nombre || "—"}</span>
                    {k.fecha && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {k.fecha}</span>}
                  </div>
                </button>
                <button onClick={(e) => eliminar(e, k)} className="absolute top-3 right-3 p-1.5 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      {edit && <ConocimientoModal item={edit} empresaId={empresaActivaId} areas={stats.areasList} isDark={isDarkMode} theme={theme} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, isDark, theme }: any) {
  return (
    <div className={`rounded-xl border p-2.5 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "20", color }}><Icon className="w-3.5 h-3.5" /></span><span className={`text-xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

// ── Editor de etiquetas tipo chips ──────────────────────────────────────────
function TagsInput({ value, onChange, isDark, theme }: any) {
  const tags = tagsDe(value);
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,/g, "");
    if (!v || tags.includes(v)) { setDraft(""); return; }
    onChange([...tags, v].join(", "));
    setDraft("");
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t).join(", "));
  return (
    <div className={`flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border ${isDark ? "bg-[#1E293B]/60 border-white/[0.08]" : "bg-white border-slate-200"}`}>
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600">
          #{t}<button type="button" onClick={() => remove(t)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } else if (e.key === "Backspace" && !draft && tags.length) { remove(tags[tags.length - 1]); } }}
        onBlur={() => draft && add(draft)}
        placeholder={tags.length ? "Añadir…" : "Escribe y pulsa Enter"} className={`flex-1 min-w-[110px] bg-transparent outline-none text-sm ${isDark ? "text-white" : "text-slate-900"}`} />
    </div>
  );
}

function ConocimientoModal({ item, empresaId, areas, isDark, theme, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    titulo: "", tipo: "LECCION", area: "", contenido: "", origen: "", etiquetas: "", ...item,
  });
  const [busy, setBusy] = useState(false);
  const id = item.id || f.id;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const tm = TIPO_META[f.tipo] || TIPO_META.OTRO;

  const usarPlantilla = () => {
    if (!tm.plantilla) return;
    if (f.contenido?.trim() && !confirm("¿Reemplazar el contenido actual con la estructura sugerida?")) return;
    set("contenido", tm.plantilla);
  };

  const guardar = async () => {
    if (!f.titulo?.trim()) { alert("Indica el título."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, titulo: f.titulo, tipo: f.tipo, area: f.area || "",
      contenido: f.contenido || "", origen: f.origen || "", etiquetas: f.etiquetas || "",
    };
    try {
      if (id) { await api.actualizarConocimiento(id, payload); onSaved(); }
      else { const saved = await api.crearConocimiento(payload); if (saved?.id) setF((p: any) => ({ ...p, id: saved.id })); onSaved(); }
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-white flex items-center gap-2"><Lightbulb className="w-4 h-4" /> {id ? "Editar conocimiento" : "Nuevo conocimiento"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>
        <div className="p-5 overflow-auto space-y-4">
          {/* Tipo como tarjetas seleccionables */}
          <div>
            <label className={lbl}>¿Qué tipo de conocimiento es?</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TIPOS.map(([v, l]) => {
                const m = TIPO_META[v]; const on = f.tipo === v;
                return (
                  <button key={v} type="button" onClick={() => set("tipo", v)}
                    className="rounded-xl border-2 p-2 text-center transition"
                    style={{ borderColor: on ? m.color : (isDark ? "#ffffff14" : "#e2e8f0"), background: on ? m.color + "14" : "transparent" }}>
                    <m.icon className="w-5 h-5 mx-auto mb-1" style={{ color: m.color }} />
                    <span className={`block text-[10px] font-bold leading-tight ${on ? "" : theme.textSecondary}`} style={on ? { color: m.color } : undefined}>{l}</span>
                  </button>
                );
              })}
            </div>
            <p className={`text-[11px] mt-1.5 ${theme.textTertiary}`}>{tm.desc}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2"><label className={lbl}>Título *</label><input className={inp} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Resume el conocimiento en una frase" autoFocus /></div>
            <div>
              <label className={lbl}>Área / proceso</label>
              <input className={inp} list="kb-areas" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="Calidad, Compras…" />
              <datalist id="kb-areas">{(areas || []).map((a: string) => <option key={a} value={a} />)}</datalist>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`${lbl} mb-0`}>Contenido</label>
              {tm.plantilla && <button type="button" onClick={usarPlantilla} className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-500"><Wand2 className="w-3.5 h-3.5" /> Estructura sugerida</button>}
            </div>
            <textarea rows={7} className={inp} value={f.contenido} onChange={(e) => set("contenido", e.target.value)} placeholder="Describe la lección, práctica o conocimiento. Usa «Estructura sugerida» para guiarte." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>Origen</label><input className={inp} value={f.origen} onChange={(e) => set("origen", e.target.value)} placeholder="Proyecto, auditoría, NC, fuente externa…" /></div>
            <div><label className={lbl}>Etiquetas</label><TagsInput value={f.etiquetas} onChange={(v: string) => set("etiquetas", v)} isDark={isDark} theme={theme} /></div>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cerrar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-amber-500 to-orange-600">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
