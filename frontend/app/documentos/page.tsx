"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Calendar, Download, FileText, FolderOpen, Plus, Search, Users as UsersIcon,
  X, Info, ChevronRight, ChevronLeft, Hash, Tag, CalendarClock, Eye, EyeOff, UploadCloud,
  CheckCircle2, FileCheck2, Clock, AlertTriangle, Lightbulb, FileEdit,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

type Estado = "BORRADOR" | "EN_REVISION" | "VIGENTE" | "OBSOLETO" | "RECHAZADO";

interface DocumentoItem {
  id: number; empresa: number; tipo: number; tipo_codigo: string; tipo_nombre: string;
  tipo_categoria: string; departamento: number | null; departamento_nombre: string;
  codigo: string; titulo: string; descripcion: string; version: string; estado: Estado;
  archivo_url: string; archivo_nombre_original: string; archivo_mime: string; archivo_tamano: number;
  fecha_emision: string | null; fecha_aprobacion: string | null; fecha_proxima_revision: string | null;
  etiquetas: string; palabras_clave: string; creado_por_username: string; aprobado_por_username: string;
  actualizado: string; visible_para_todos: boolean;
}
interface TipoDoc { id: number; empresa: number; categoria: string; codigo: string; nombre: string; color: string; icono: string; activo: boolean; }
interface Departamento { id: number; nombre: string; empresa: number; }

const ESTADO_META: Record<Estado, { label: string; cls: string; dot: string }> = {
  BORRADOR:    { label: "Borrador",    cls: "bg-slate-500/15 text-slate-500 border-slate-500/30", dot: "#64748b" },
  EN_REVISION: { label: "En revisión", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", dot: "#f59e0b" },
  VIGENTE:     { label: "Vigente",     cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "#10b981" },
  OBSOLETO:    { label: "Obsoleto",    cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30", dot: "#71717a" },
  RECHAZADO:   { label: "Rechazado",   cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", dot: "#f43f5e" },
};

// Glosario didáctico de los tipos de documento ISO 9001.
const TIPO_AYUDA: Record<string, string> = {
  POLITICA: "Declaración de la dirección (alto nivel). Ej.: Política de Calidad.",
  MANUAL: "Documento marco que describe el SGC. Prefijo común: MN.",
  PROCEDIMIENTO: "Describe QUÉ se hace y QUIÉN lo hace. Prefijo común: PR.",
  INSTRUCTIVO: "Describe el CÓMO, paso a paso. Prefijo común: IT.",
  FORMATO: "Plantilla que se llena para generar un registro. Prefijo común: FR.",
  REGISTRO: "Evidencia de que algo se hizo (un formato lleno). Prefijo común: RG.",
  PLAN: "Plan de calidad, auditorías, capacitación, etc.",
  OTRO: "Tipo personalizado.",
};

export default function DocumentosListPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const empresaActiva = user?.perfil?.empresa_activa ?? user?.empresas?.[0]?.id ?? null;

  const [items, setItems] = useState<DocumentoItem[]>([]);
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [guia, setGuia] = useState(false);

  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState<number | "">("");
  const [fDepto, setFDepto] = useState<number | "">("");
  const [fEstado, setFEstado] = useState<Estado | "">("");
  const [showNew, setShowNew] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "100" };
      if (empresaActiva) params.empresa = String(empresaActiva);
      if (fTipo) params.tipo = String(fTipo);
      if (fDepto) params.departamento = String(fDepto);
      if (fEstado) params.estado = fEstado;
      if (q.trim()) params.search = q.trim();
      const r = await api.getDocumentos(params);
      setItems(r.results || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [empresaActiva, fTipo, fDepto, fEstado, q]);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!empresaActiva) return;
    api.getTiposDocumento({ empresa: String(empresaActiva), page_size: "100" }).then((r) => setTipos(r.results || [])).catch(() => {});
    api.getRHDepartamentos().then((r) => setDepartamentos((r.results || []).filter((d: any) => !empresaActiva || d.empresa === empresaActiva))).catch(() => {});
  }, [empresaActiva]);

  const stats = useMemo(() => {
    const hoy = Date.now();
    const porVencer = items.filter((d) => d.estado === "VIGENTE" && d.fecha_proxima_revision && new Date(d.fecha_proxima_revision).getTime() - hoy < 30 * 864e5).length;
    return {
      total: items.length,
      vigentes: items.filter((d) => d.estado === "VIGENTE").length,
      revision: items.filter((d) => d.estado === "EN_REVISION").length,
      borradores: items.filter((d) => d.estado === "BORRADOR").length,
      porVencer,
    };
  }, [items]);

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";
  const inpF = `px-3 py-2 rounded-lg text-sm border outline-none ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#0EA5E9,#3B82F6)" }}><FolderOpen className="w-7 h-7 text-white" /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Gestión Documental</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Documentos controlados del SGC · ISO 9001 cláusula 7.5 (información documentada).</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setGuia((g) => !g)} className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Info className="w-4 h-4" /> ¿Cómo funciona?</button>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]" style={{ background: "linear-gradient(135deg,#0EA5E9,#3B82F6)" }}><Plus className="w-4 h-4" /> Subir documento</button>
        </div>
      </div>

      {/* Guía didáctica */}
      {guia && (
        <div className={`rounded-2xl border p-5 ${isDarkMode ? "bg-sky-500/[0.06] border-sky-500/20" : "bg-sky-50 border-sky-200"}`}>
          <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-sky-500" /><h2 className={`font-black ${theme.textPrimary}`}>Control de documentos en 4 pasos</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              ["1. Crear", FileEdit, "Subes el archivo con su código único, tipo y versión. Nace como Borrador."],
              ["2. Aprobar", FileCheck2, "Lo envías a aprobación. Quien aprueba queda registrado (firma de control)."],
              ["3. Vigente", CheckCircle2, "Una vez aprobado pasa a Vigente: es la versión oficial que todos deben usar."],
              ["4. Revisar", CalendarClock, "Se revisa periódicamente. Al cambiarlo, sube la versión y el anterior queda obsoleto."],
            ].map(([t, Ic, d]: any) => (
              <div key={t} className={`rounded-xl p-3 ${isDarkMode ? "bg-white/[0.03]" : "bg-white border border-slate-200/70"}`}>
                <div className="flex items-center gap-2 mb-1"><Ic className="w-4 h-4 text-sky-500" /><span className={`text-sm font-black ${theme.textPrimary}`}>{t}</span></div>
                <p className={`text-xs ${theme.textSecondary}`}>{d}</p>
              </div>
            ))}
          </div>
          <p className={`text-[11px] mt-3 ${theme.textTertiary}`}>Convención de código sugerida: <b>TIPO-ÁREA-CONSECUTIVO</b> (ej. <span className="font-mono">PR-RH-001</span> = Procedimiento del área de RH, número 001).</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI icon={FileText} color="#0EA5E9" label="Documentos" value={stats.total} c={card} theme={theme} />
        <KPI icon={CheckCircle2} color="#10B981" label="Vigentes" value={stats.vigentes} c={card} theme={theme} />
        <KPI icon={Clock} color="#F59E0B" label="En revisión" value={stats.revision} c={card} theme={theme} />
        <KPI icon={FileEdit} color="#64748B" label="Borradores" value={stats.borradores} c={card} theme={theme} />
        <KPI icon={AlertTriangle} color="#F43F5E" label="Por revisar (≤30d)" value={stats.porVencer} c={card} theme={theme} />
      </div>

      {/* Filtros */}
      <div className={`flex flex-wrap gap-2 items-center p-3 rounded-2xl border ${card}`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código, título, palabras clave…" className={`w-full pl-9 pr-3 ${inpF}`} />
        </div>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value ? Number(e.target.value) : "")} className={inpF}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.codigo} - {t.nombre}</option>)}
        </select>
        <select value={fDepto} onChange={(e) => setFDepto(e.target.value ? Number(e.target.value) : "")} className={inpF}>
          <option value="">Todos los deptos</option>
          {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value as Estado | "")} className={inpF}>
          <option value="">Todos los estados</option>
          <option value="VIGENTE">Vigentes</option>
          <option value="EN_REVISION">En revisión</option>
          <option value="BORRADOR">Borradores</option>
          <option value="RECHAZADO">Rechazados</option>
          <option value="OBSOLETO">Obsoletos</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? <div className={`text-center py-20 ${theme.textTertiary}`}>Cargando…</div>
      : items.length === 0 ? (
        <div className={`text-center py-20 px-6 rounded-3xl border-2 border-dashed ${isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/40"}`}>
          <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${theme.textTertiary}`} />
          <h3 className={`font-black text-lg ${theme.textPrimary}`}>Aún no hay documentos</h3>
          <p className={`text-sm ${theme.textSecondary} mt-1`}>Sube el primer documento controlado de tu SGC.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"><Plus className="w-4 h-4" /> Subir documento</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d) => <DocumentoCard key={d.id} d={d} theme={theme} isDark={isDarkMode} onClick={() => router.push(`/documentos/${d.id}`)} />)}
        </div>
      )}

      {showNew && empresaActiva && (
        <NuevoDocumentoModal empresaId={empresaActiva} tipos={tipos} departamentos={departamentos} isDark={isDarkMode} theme={theme} onClose={() => setShowNew(false)} onCreated={(id) => router.push(`/documentos/${id}`)} />
      )}
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, c, theme }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${c}`}>
      <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}><Icon className="w-4 h-4" /></span><span className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>{value}</span></div>
      <div className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${theme.textTertiary}`}>{label}</div>
    </div>
  );
}

function DocumentoCard({ d, theme, isDark, onClick }: { d: DocumentoItem; theme: any; isDark: boolean; onClick: () => void; }) {
  const em = ESTADO_META[d.estado];
  const porVencer = d.estado === "VIGENTE" && d.fecha_proxima_revision && new Date(d.fecha_proxima_revision).getTime() - Date.now() < 30 * 864e5;
  return (
    <button onClick={onClick} className={`group text-left rounded-3xl border overflow-hidden transition-all hover:scale-[1.01] hover:shadow-xl ${isDark ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"} ${porVencer ? "ring-1 ring-rose-500/30" : ""}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">{d.tipo_codigo}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${em.cls}`}>{em.label}</span>
            </div>
            <div className={`text-xs font-mono ${theme.textTertiary}`}>{d.codigo} · v{d.version}</div>
            <h3 className={`text-base font-black mt-0.5 truncate ${theme.textPrimary}`}>{d.titulo}</h3>
            {d.descripcion && <p className={`text-xs mt-1 line-clamp-2 ${theme.textSecondary}`}>{d.descripcion}</p>}
          </div>
          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
        </div>
        <div className={`mt-4 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] ${theme.textTertiary}`}>
          {d.departamento_nombre && <div className="inline-flex items-center gap-1 col-span-2"><Building2 className="w-3 h-3" /> {d.departamento_nombre}</div>}
          {d.fecha_proxima_revision && <div className={`inline-flex items-center gap-1 col-span-2 ${porVencer ? "text-rose-500 font-bold" : ""}`}><CalendarClock className="w-3 h-3" /> Revisar: {d.fecha_proxima_revision}{porVencer ? " (próximo)" : ""}</div>}
          <div className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(d.actualizado).toLocaleDateString()}</div>
          <div className="inline-flex items-center gap-1 truncate"><UsersIcon className="w-3 h-3" /> {d.creado_por_username || "-"}</div>
        </div>
      </div>
    </button>
  );
}

// ── Modal didáctico por pasos, claro/oscuro ─────────────────────────────────
function NuevoDocumentoModal({ empresaId, tipos, departamentos, isDark, theme, onClose, onCreated }: {
  empresaId: number; tipos: TipoDoc[]; departamentos: Departamento[]; isDark: boolean; theme: any;
  onClose: () => void; onCreated: (id: number) => void;
}) {
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState<any>({ tipo: "", departamento: "", codigo: "", titulo: "", descripcion: "", version: "1.0", fecha_proxima_revision: "", etiquetas: "", palabras_clave: "", visible_para_todos: true });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-300 text-slate-900"}`;
  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const sec = `rounded-xl border p-3 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/60"}`;
  const tipoSel = tipos.find((t) => t.id === Number(f.tipo));

  // Al elegir tipo, prefijar el código con su clave (PR-, IT-…).
  const elegirTipo = (id: string) => {
    set("tipo", id ? Number(id) : "");
    const t = tipos.find((x) => x.id === Number(id));
    if (t && !f.codigo) set("codigo", `${t.codigo}-`);
  };
  const unAno = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); set("fecha_proxima_revision", d.toISOString().slice(0, 10)); };

  const submit = async () => {
    if (!f.tipo || !f.codigo.trim() || !f.titulo.trim()) { alert("Completa tipo, código y título."); setPaso(1); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("empresa", String(empresaId));
      fd.append("tipo", String(f.tipo));
      if (f.departamento) fd.append("departamento", String(f.departamento));
      fd.append("codigo", f.codigo.trim());
      fd.append("titulo", f.titulo.trim());
      fd.append("descripcion", f.descripcion);
      fd.append("version", f.version);
      if (f.fecha_proxima_revision) fd.append("fecha_proxima_revision", f.fecha_proxima_revision);
      if (f.etiquetas) fd.append("etiquetas", f.etiquetas);
      if (f.palabras_clave) fd.append("palabras_clave", f.palabras_clave);
      fd.append("visible_para_todos", f.visible_para_todos ? "true" : "false");
      if (archivo) fd.append("archivo", archivo);
      const r = await api.crearDocumento(fd);
      onCreated(r.id);
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  const PASOS = ["Clasificación", "Identificación", "Archivo y vigencia"];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[94vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        {/* Encabezado + stepper */}
        <div className="px-5 py-3 shrink-0" style={{ background: "linear-gradient(90deg,#0EA5E9,#3B82F6)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white">Nuevo documento controlado — paso {paso} de 3</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
          </div>
          <div className="flex items-center gap-1 mt-2.5">
            {PASOS.map((t, i) => (
              <div key={t} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => i + 1 < paso && setPaso(i + 1)} className={`flex items-center gap-1.5 ${i + 1 <= paso ? "" : "opacity-50"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${i + 1 < paso ? "bg-white text-sky-600" : i + 1 === paso ? "bg-white text-sky-600 ring-2 ring-white/40" : "bg-white/20 text-white"}`}>{i + 1 < paso ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}</span>
                  <span className="text-[11px] font-bold text-white hidden sm:block">{t}</span>
                </button>
                {i < PASOS.length - 1 && <div className={`flex-1 h-0.5 mx-1.5 rounded ${i + 1 < paso ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-auto flex-1 space-y-4">
          {/* PASO 1 · Clasificación */}
          {paso === 1 && (
            <>
              <div className={`rounded-xl p-3 text-sm flex gap-2 ${isDark ? "bg-sky-500/10 text-sky-200" : "bg-sky-50 text-sky-800"}`}>
                <Info className="w-5 h-5 shrink-0 text-sky-500" /><span>Clasifica el documento para que el sistema sepa cómo controlarlo. El <b>tipo</b> define el prefijo del código.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tipo de documento *</label>
                  <select className={inp} value={f.tipo} onChange={(e) => elegirTipo(e.target.value)}>
                    <option value="">— Selecciona —</option>
                    {tipos.map((t) => <option key={t.id} value={t.id}>{t.codigo} · {t.nombre}</option>)}
                  </select>
                  {tipoSel && <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>{TIPO_AYUDA[tipoSel.categoria] || "Documento controlado."}</p>}
                </div>
                <div><label className={lbl}>Departamento / área</label>
                  <select className={inp} value={f.departamento} onChange={(e) => set("departamento", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">— Sin departamento —</option>
                    {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* PASO 2 · Identificación */}
          {paso === 2 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={`${lbl} flex items-center gap-1`}><Hash className="w-3.5 h-3.5" /> Código único *</label>
                  <input className={`${inp} font-mono`} value={f.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase())} placeholder="PR-RH-001" />
                  <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Identificador controlado e irrepetible (TIPO-ÁREA-CONSECUTIVO).</p>
                </div>
                <div><label className={lbl}>Versión *</label><input className={inp} value={f.version} onChange={(e) => set("version", e.target.value)} placeholder="1.0" /><p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Inicia en 1.0.</p></div>
              </div>
              <div><label className={lbl}>Título *</label><input className={inp} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Procedimiento de alta de empleados" /></div>
              <div><label className={lbl}>Descripción / propósito</label><textarea rows={2} className={inp} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿Para qué sirve este documento y a qué proceso aplica?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`${lbl} flex items-center gap-1`}><Tag className="w-3.5 h-3.5" /> Etiquetas</label><input className={inp} value={f.etiquetas} onChange={(e) => set("etiquetas", e.target.value)} placeholder="rh, contratación" /><p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Separadas por coma (para clasificar).</p></div>
                <div><label className={lbl}>Palabras clave</label><input className={inp} value={f.palabras_clave} onChange={(e) => set("palabras_clave", e.target.value)} placeholder="alta, ingreso, expediente" /><p className={`text-[11px] mt-1 ${theme.textTertiary}`}>Ayudan a encontrarlo en la búsqueda.</p></div>
              </div>
            </>
          )}

          {/* PASO 3 · Archivo y vigencia */}
          {paso === 3 && (
            <>
              <div>
                <label className={lbl}>Archivo (PDF, Word, Excel…)</label>
                <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); setArchivo(e.dataTransfer.files?.[0] || null); }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition ${drag ? "border-sky-500 bg-sky-500/10" : isDark ? "border-white/15 hover:border-white/30" : "border-slate-300 hover:border-sky-400"}`}>
                  <UploadCloud className={`w-8 h-8 ${drag ? "text-sky-500" : theme.textTertiary}`} />
                  {archivo ? <span className={`text-sm font-bold ${theme.textPrimary}`}>{archivo.name} <span className={theme.textTertiary}>({Math.round(archivo.size / 1024)} KB)</span></span>
                    : <><span className={`text-sm font-bold ${theme.textSecondary}`}>Arrastra el archivo aquí o haz clic</span><span className={`text-[11px] ${theme.textTertiary}`}>El archivo es la versión oficial controlada</span></>}
                  <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className={sec}>
                <div className="flex items-center justify-between">
                  <label className={`${lbl} flex items-center gap-1 mb-0`}><CalendarClock className="w-3.5 h-3.5" /> Próxima revisión</label>
                  <button type="button" onClick={unAno} className="text-[11px] font-bold text-sky-500 hover:text-sky-400">+1 año</button>
                </div>
                <input type="date" className={`${inp} mt-1`} value={f.fecha_proxima_revision} onChange={(e) => set("fecha_proxima_revision", e.target.value)} />
                <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>ISO pide revisar la vigencia periódicamente. Recomendado: 1 año.</p>
              </div>
              <button type="button" onClick={() => set("visible_para_todos", !f.visible_para_todos)} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                {f.visible_para_todos ? <Eye className="w-5 h-5 text-emerald-500" /> : <EyeOff className="w-5 h-5 text-amber-500" />}
                <div className="flex-1"><div className={`text-sm font-bold ${theme.textPrimary}`}>{f.visible_para_todos ? "Visible para toda la empresa" : "Acceso restringido"}</div><div className={`text-[11px] ${theme.textTertiary}`}>{f.visible_para_todos ? "Cualquier usuario podrá consultarlo (control de distribución 7.5.3)." : "Definirás quién puede verlo desde la ficha del documento."}</div></div>
                <span className={`w-10 h-6 rounded-full p-0.5 transition ${f.visible_para_todos ? "bg-emerald-500" : "bg-slate-400"}`}><span className={`block w-5 h-5 rounded-full bg-white transition ${f.visible_para_todos ? "translate-x-4" : ""}`} /></span>
              </button>
              <p className={`text-[11px] ${theme.textTertiary}`}>El documento nace como <b>Borrador</b>. Desde su ficha podrás enviarlo a aprobación para hacerlo Vigente.</p>
            </>
          )}
        </div>

        {/* Navegación */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={() => (paso > 1 ? setPaso(paso - 1) : onClose())} className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>{paso > 1 ? <><ChevronLeft className="w-4 h-4" /> Atrás</> : "Cancelar"}</button>
          {paso < 3
            ? <button onClick={() => { if (paso === 1 && !f.tipo) { alert("Selecciona el tipo."); return; } if (paso === 2 && (!f.codigo.trim() || !f.titulo.trim())) { alert("Completa código y título."); return; } setPaso(paso + 1); }} className="inline-flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(90deg,#0EA5E9,#3B82F6)" }}>Siguiente <ChevronRight className="w-4 h-4" /></button>
            : <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#0EA5E9,#3B82F6)" }}><CheckCircle2 className="w-4 h-4" /> {busy ? "Subiendo…" : "Crear documento"}</button>}
        </div>
      </div>
    </div>
  );
}
