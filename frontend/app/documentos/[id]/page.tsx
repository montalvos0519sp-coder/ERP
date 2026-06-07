"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, Download, FileText,
  History, Lightbulb, Plus, Send, ShieldCheck, ShieldX, Sparkles, Upload,
  UploadCloud, UserCheck, Users as UsersIcon, X, Trash2, FileType2,
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Printer,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { DocSheet, DocEditor } from "@/components/documentos/DocWord";

interface PasoSolicitud {
  id: number; orden: number; aprobador: number;
  aprobador_username: string; aprobador_nombre: string;
  obligatorio: boolean; estado: string; comentario: string;
  decidido_en: string | null;
}

interface SolicitudActiva {
  id: number; estado: string; enviada_por_username: string;
  flujo_nombre: string; flujo_modo: string;
  comentario_envio: string; fecha_envio: string;
  pasos: PasoSolicitud[];
}

interface DocVersion {
  id: number; version: string; archivo_url: string;
  archivo_nombre_original: string; fecha_aprobacion: string | null;
  aprobado_por_username: string; notas_cambios: string; creado: string;
}

interface DocumentoDetalle {
  id: number;
  empresa: number;
  tipo: number;
  tipo_codigo: string;
  tipo_nombre: string;
  tipo_categoria: string;
  departamento: number | null;
  departamento_nombre: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  contenido: string;
  version: string;
  estado: string;
  archivo: string;
  archivo_url: string;
  archivo_nombre_original: string;
  archivo_mime: string;
  archivo_tamano: number;
  fecha_emision: string | null;
  fecha_aprobacion: string | null;
  fecha_proxima_revision: string | null;
  etiquetas: string;
  palabras_clave: string;
  creado_por: number | null;
  creado_por_username: string;
  aprobado_por_username: string;
  creado: string;
  actualizado: string;
  flujo: number | null;
  visible_para_todos: boolean;
  versiones: DocVersion[];
  solicitud_activa: SolicitudActiva | null;
  puede_descargar: boolean;
  puede_proponer_mejora: boolean;
}

interface Flujo { id: number; nombre: string; modo: string; n_pasos: number; }
interface Propuesta {
  id: number; titulo: string; descripcion: string; estado: string;
  autor_username: string; revisado_por_username: string;
  comentario_revision: string; fecha: string; fecha_revision: string | null;
  archivo_propuesto_url: string;
}

export default function DocumentoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();

  const [doc, setDoc] = useState<DocumentoDetalle | null>(null);
  const [flujos, setFlujos] = useState<Flujo[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [wordBusy, setWordBusy] = useState(false);

  // Edición del contenido redactado en el sistema (documentos sin archivo).
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({ titulo: "", contenido: "" });
  const [guardando, setGuardando] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ampliado, setAmpliado] = useState(false);

  // Modales
  const [showEnviar, setShowEnviar] = useState(false);
  const [showRechazar, setShowRechazar] = useState(false);
  const [showNuevaVer, setShowNuevaVer] = useState(false);
  const [showPropuesta, setShowPropuesta] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [d, props] = await Promise.all([
        api.getDocumento(id),
        api.getPropuestasMejora({ documento: id, page_size: "50" }),
      ]);
      setDoc(d as DocumentoDetalle);
      setPropuestas(props.results || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!doc?.empresa) return;
    api.getFlujosAprobacion({ empresa: String(doc.empresa), activo: "true", page_size: "100" })
      .then((r) => setFlujos(r.results || [])).catch(() => {});
  }, [doc?.empresa]);

  // Si venimos de "generar desde plantilla" (?nuevo=1), abre el editor de una vez.
  useEffect(() => {
    if (!doc) return;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nuevo") === "1"
        && doc.estado === "BORRADOR" && !editando) {
      setBorrador({ titulo: doc.titulo, contenido: doc.contenido || "" });
      setEditando(true);
    }
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirEditor = () => {
    if (!doc) return;
    setBorrador({ titulo: doc.titulo, contenido: doc.contenido || "" });
    setEditando(true);
  };

  const guardarContenido = async () => {
    if (!borrador.titulo.trim()) { alert("El título no puede estar vacío."); return; }
    setGuardando(true);
    try {
      await api.actualizarDocumento(id, { titulo: borrador.titulo, contenido: borrador.contenido });
      setEditando(false);
      await cargar();
    } catch (e) { alert((e as Error).message); }
    finally { setGuardando(false); }
  };

  if (loading) return <div className={`p-10 ${theme.textTertiary}`}>Cargando…</div>;
  if (!doc) return <div className={`p-10 ${theme.textTertiary}`}>Documento no encontrado.</div>;

  const esCreador = user && doc.creado_por === user.id;
  const puedeEditar = (esCreador || user?.is_superuser) && (doc.estado === "BORRADOR" || doc.estado === "RECHAZADO");
  const tieneContenido = !!(doc.contenido && doc.contenido.trim());
  const miPaso = doc.solicitud_activa?.pasos.find(
    (p) => p.aprobador === user?.id && p.estado === "PENDIENTE",
  );
  const puedeAprobar = !!miPaso || user?.is_superuser;
  // Para flujo SECUENCIAL, mi paso debe ser el menor pendiente.
  const sigueOrden = (() => {
    if (!miPaso) return true;
    if (doc.solicitud_activa?.flujo_modo !== "SECUENCIAL") return true;
    const minP = Math.min(
      ...(doc.solicitud_activa?.pasos.filter((p) => p.estado === "PENDIENTE").map((p) => p.orden) || [0]),
    );
    return miPaso.orden === minP;
  })();

  const aprobar = async (comentario: string) => {
    setBusy(true);
    try { await api.aprobarPasoDocumento(id, comentario); await cargar(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const rechazar = async (comentario: string) => {
    if (!comentario.trim()) return alert("Indica motivo del rechazo.");
    setBusy(true);
    try { await api.rechazarPasoDocumento(id, comentario); setShowRechazar(false); await cargar(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const marcarObsoleto = async () => {
    if (!confirm("Marcar como OBSOLETO? El documento dejara de estar vigente.")) return;
    setBusy(true);
    try { await api.marcarDocumentoObsoleto(id); await cargar(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const eliminar = async () => {
    if (!doc) return;
    if (!confirm(`¿Eliminar el borrador "${doc.codigo} · ${doc.titulo}"? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try { await api.eliminarDocumento(id); router.push("/documentos"); }
    catch (e) { alert((e as Error).message); setBusy(false); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle at 10% 20%, #2563EB 0, transparent 40%), radial-gradient(circle at 90% 80%, #6366F1 0, transparent 42%)" }} />
        <div className="relative p-6">
          <div className="flex items-start gap-3">
            <button onClick={() => router.push("/documentos")}
              className={`p-2 rounded-xl border shrink-0 ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.05]" : "border-slate-200 hover:bg-slate-50"} transition`}>
              <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {doc.tipo_codigo} · {doc.tipo_categoria}
                </span>
                <EstadoBadge estado={doc.estado} />
                {doc.departamento_nombre && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{doc.departamento_nombre}</span>
                )}
                <span className={`text-xs font-mono ${theme.textTertiary}`}>{doc.codigo} · v{doc.version}</span>
              </div>
              <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.textPrimary}`}>{doc.titulo}</h1>
              {doc.descripcion && <p className={`text-sm mt-1 max-w-2xl ${theme.textSecondary}`}>{doc.descripcion}</p>}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {doc.puede_descargar && doc.archivo_url && (
                <a href={api.descargarDocumentoUrl(id)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg text-white text-sm font-bold transition">
                  <Download className="w-4 h-4" /> Descargar
                </a>
              )}
              {tieneContenido && (
                <button
                  onClick={async () => { setWordBusy(true); try { await api.descargarDocumentoWord(id); } catch (e) { alert((e as Error).message); } finally { setWordBusy(false); } }}
                  disabled={wordBusy}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition disabled:opacity-50 ${isDarkMode ? "border-sky-400/30 text-sky-300 hover:bg-sky-500/10" : "border-sky-300 text-sky-600 hover:bg-sky-50"}`}>
                  <FileType2 className={`w-4 h-4 ${wordBusy ? "animate-pulse" : ""}`} /> {wordBusy ? "Generando…" : "Descargar Word"}
                </button>
              )}
            </div>
          </div>
          {/* Ciclo de vida del documento */}
          <div className="mt-5">
            <CicloVidaDoc estado={doc.estado} theme={theme} isDark={isDarkMode} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Visor + meta */}
        <div className="lg:col-span-2 space-y-5">
          {/* Visor / Editor del documento */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
          }`}>
            <div className={`flex items-center justify-between gap-2 px-4 py-2 border-b ${
              isDarkMode ? "border-white/[0.06]" : "border-slate-200"
            }`}>
              <div className={`text-xs font-bold ${theme.textSecondary}`}>
                {editando ? "Editando documento" : (tieneContenido ? "Contenido del documento" : "Vista del documento")}
              </div>
              <div className="flex items-center gap-2">
                {!editando && tieneContenido && (
                  <span className={`text-[10px] ${theme.textTertiary}`}>{doc.contenido.length} caracteres</span>
                )}
                {!editando && doc.archivo_url && !tieneContenido && (
                  <span className={`text-[10px] ${theme.textTertiary}`}>{doc.archivo_nombre_original || "—"} · {Math.round(doc.archivo_tamano / 1024)} KB</span>
                )}
                {!editando && tieneContenido && (
                  <div className={`inline-flex items-center rounded-lg border overflow-hidden ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
                    <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} title="Alejar" className={`p-1.5 ${isDarkMode ? "text-slate-300 hover:bg-white/[0.06]" : "text-slate-600 hover:bg-slate-100"}`}><ZoomOut className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setZoom(1)} title="Restablecer zoom" className={`px-1.5 text-[10px] font-black tabular-nums ${theme.textSecondary}`}>{Math.round(zoom * 100)}%</button>
                    <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title="Acercar" className={`p-1.5 ${isDarkMode ? "text-slate-300 hover:bg-white/[0.06]" : "text-slate-600 hover:bg-slate-100"}`}><ZoomIn className="w-3.5 h-3.5" /></button>
                    <button onClick={() => window.print()} title="Imprimir" className={`p-1.5 border-l ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}><Printer className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAmpliado(true)} title="Pantalla completa" className={`p-1.5 border-l ${isDarkMode ? "border-white/[0.08] text-slate-300 hover:bg-white/[0.06]" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}><Maximize2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {!editando && puedeEditar && (tieneContenido || !doc.archivo_url) && (
                  <button onClick={abrirEditor}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" /> Editar contenido
                  </button>
                )}
              </div>
            </div>

            {editando ? (
              /* ── Editor profesional: barra + texto + vista previa en vivo ── */
              <div className="p-4 space-y-3">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-wider ${theme.textTertiary}`}>Título del documento</label>
                  <input value={borrador.titulo} onChange={(e) => setBorrador((b) => ({ ...b, titulo: e.target.value }))}
                    className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`} />
                </div>

                <DocEditor value={borrador.contenido} onChange={(v) => setBorrador((b) => ({ ...b, contenido: v }))} isDark={isDarkMode} theme={theme} rows={26} />

                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setEditando(false)} disabled={guardando}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
                  <button onClick={guardarContenido} disabled={guardando}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40">
                    <CheckCircle2 className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            ) : tieneContenido ? (
              /* ── Lectura del contenido como hoja de documento Word ── */
              <div className={`max-h-[720px] overflow-auto p-6 ${isDarkMode ? "bg-[#0a0f1c]" : "bg-slate-200/70"}`}>
                <div style={{ zoom: zoom }}>
                  <DocSheet contenido={doc.contenido} />
                </div>
              </div>
            ) : (
              /* ── Visor de archivo ── */
              <div className="h-[600px] bg-slate-900/40">
                {doc.archivo_url && doc.archivo_mime.includes("pdf") ? (
                  <iframe src={`${api.descargarDocumentoUrl(id)}#view=FitH`} className="w-full h-full" title="Visor PDF" />
                ) : doc.archivo_url && doc.archivo_mime.startsWith("image/") ? (
                  <img src={api.descargarDocumentoUrl(id)} alt={doc.titulo} className="w-full h-full object-contain" />
                ) : (
                  <div className="h-full flex items-center justify-center flex-col gap-2 text-slate-400">
                    <FileText className="w-16 h-16" />
                    <p className="text-sm">Este documento aún no tiene contenido ni archivo.</p>
                    {puedeEditar && (
                      <button onClick={abrirEditor} className="text-sm text-blue-400 hover:underline">Redactar contenido</button>
                    )}
                    {doc.puede_descargar && doc.archivo_url && (
                      <a href={api.descargarDocumentoUrl(id)} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline">Descargar para ver</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Propuestas de mejora */}
          <section className={`rounded-2xl border p-5 ${
            isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-black uppercase tracking-wider inline-flex items-center gap-2 ${theme.textSecondary}`}>
                <Lightbulb className="w-4 h-4" /> Propuestas de mejora
              </h2>
              {doc.puede_proponer_mejora && (
                <button onClick={() => setShowPropuesta(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" /> Proponer
                </button>
              )}
            </div>
            {propuestas.length === 0 ? (
              <p className={`text-sm ${theme.textTertiary}`}>Aun no hay propuestas.</p>
            ) : (
              <ul className="space-y-3">
                {propuestas.map((p) => (
                  <PropuestaItem key={p.id} p={p} theme={theme} isDarkMode={isDarkMode}
                    canReview={!!esCreador} userId={user?.id ?? null} onChange={cargar} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Lateral derecho: meta + flujo + acciones */}
        <aside className="space-y-4">
          {/* Acciones segun estado */}
          <div className={`rounded-2xl border p-4 space-y-2 ${
            isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-1 ${theme.textSecondary}`}>Acciones</h3>
            {esCreador && (doc.estado === "BORRADOR" || doc.estado === "RECHAZADO") && (
              <button onClick={() => setShowEnviar(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
                <Send className="w-4 h-4" /> Enviar a aprobacion
              </button>
            )}
            {puedeAprobar && doc.estado === "EN_REVISION" && sigueOrden && (
              <>
                <button onClick={() => aprobar("")} disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40">
                  <ShieldCheck className="w-4 h-4" /> Aprobar
                </button>
                <button onClick={() => setShowRechazar(true)} disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-40">
                  <ShieldX className="w-4 h-4" /> Rechazar
                </button>
              </>
            )}
            {puedeAprobar && doc.estado === "EN_REVISION" && !sigueOrden && miPaso && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                Flujo secuencial. Tu paso #{miPaso.orden} se desbloqueara cuando los anteriores aprueben.
              </div>
            )}
            {esCreador && doc.estado === "VIGENTE" && (
              <>
                <button onClick={() => setShowNuevaVer(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                  <UploadCloud className="w-4 h-4" /> Subir nueva version
                </button>
                <button onClick={marcarObsoleto} disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-bold disabled:opacity-40">
                  Marcar obsoleto
                </button>
              </>
            )}
            {(esCreador || user?.is_superuser) && (doc.estado === "BORRADOR" || doc.estado === "RECHAZADO") && (
              <button onClick={eliminar} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-sm font-bold disabled:opacity-40">
                <Trash2 className="w-4 h-4" /> Eliminar borrador
              </button>
            )}
          </div>

          {/* Solicitud activa */}
          {doc.solicitud_activa && (
            <div className={`rounded-2xl border p-4 ${
              isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary} inline-flex items-center gap-2`}>
                <UserCheck className="w-4 h-4" /> Flujo: {doc.solicitud_activa.flujo_nombre}
              </h3>
              <div className={`text-[10px] ${theme.textTertiary} mb-2`}>
                Modo: {doc.solicitud_activa.flujo_modo} · Estado: {doc.solicitud_activa.estado}
              </div>
              <ol className="space-y-1.5">
                {doc.solicitud_activa.pasos.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      p.estado === "APROBADO" ? "bg-emerald-500 text-white"
                      : p.estado === "RECHAZADO" ? "bg-rose-500 text-white"
                      : "bg-slate-700 text-slate-300"
                    }`}>{p.orden}</span>
                    <div className="flex-1 min-w-0">
                      <div className={theme.textPrimary}>{p.aprobador_nombre}</div>
                      <div className={`text-[10px] ${theme.textTertiary}`}>
                        {p.estado}{p.decidido_en ? ` · ${new Date(p.decidido_en).toLocaleString()}` : ""}
                      </div>
                      {p.comentario && <div className={`text-[10px] italic ${theme.textTertiary}`}>"{p.comentario}"</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Meta */}
          <div className={`rounded-2xl border p-4 space-y-1.5 text-xs ${
            isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>Datos del documento</h3>
            <Row label="Creado por" value={doc.creado_por_username || "—"} theme={theme} />
            <Row label="Aprobado por" value={doc.aprobado_por_username || "—"} theme={theme} />
            <Row label="F. emision" value={doc.fecha_emision || "—"} theme={theme} />
            <Row label="F. aprobacion" value={doc.fecha_aprobacion || "—"} theme={theme} />
            <Row label="Prox. revision" value={doc.fecha_proxima_revision || "—"} theme={theme} />
            <Row label="Actualizado" value={new Date(doc.actualizado).toLocaleString()} theme={theme} />
          </div>

          {/* Historial de versiones */}
          {doc.versiones.length > 0 && (
            <div className={`rounded-2xl border p-4 ${
              isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary} inline-flex items-center gap-2`}>
                <History className="w-4 h-4" /> Historial de versiones
              </h3>
              <ul className="space-y-1.5">
                {doc.versiones.map((v) => (
                  <li key={v.id} className="text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className={theme.textPrimary}>v{v.version}</div>
                      <div className={`text-[10px] ${theme.textTertiary}`}>{new Date(v.creado).toLocaleDateString()} · {v.aprobado_por_username}</div>
                    </div>
                    {v.archivo_url && (
                      <a href={v.archivo_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                        ver
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Modales */}
      {showEnviar && (
        <EnviarAprobacionModal
          flujos={flujos}
          onClose={() => setShowEnviar(false)}
          onSubmit={async (flujoId, comentario) => {
            setBusy(true);
            try {
              await api.enviarDocumentoAprobacion(id, flujoId || undefined, comentario);
              setShowEnviar(false); await cargar();
            } catch (e) { alert((e as Error).message); }
            finally { setBusy(false); }
          }}
        />
      )}
      {showRechazar && (
        <ComentarioModal title="Rechazar documento" placeholder="Motivo del rechazo *"
          required onClose={() => setShowRechazar(false)} onSubmit={rechazar} />
      )}
      {showNuevaVer && (
        <NuevaVersionModal onClose={() => setShowNuevaVer(false)}
          onSubmit={async (version, archivo, notas) => {
            const fd = new FormData();
            fd.append("version", version);
            fd.append("archivo", archivo);
            fd.append("notas_cambios", notas);
            setBusy(true);
            try { await api.nuevaVersionDocumento(id, fd); setShowNuevaVer(false); await cargar(); }
            catch (e) { alert((e as Error).message); }
            finally { setBusy(false); }
          }} />
      )}
      {showPropuesta && (
        <PropuestaModal documentoId={Number(id)} onClose={() => setShowPropuesta(false)}
          onCreated={() => { setShowPropuesta(false); cargar(); }} />
      )}

      {/* Lector a pantalla completa */}
      {ampliado && doc && (
        <div className="fixed inset-0 z-[500] flex flex-col bg-slate-800/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm font-black truncate flex items-center gap-2"><FileText className="w-4 h-4 shrink-0" /> {doc.titulo}</h2>
              <span className="font-mono text-[10px] text-white/60">{doc.codigo} · v{doc.version}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center rounded-lg border border-white/15 overflow-hidden">
                <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} title="Alejar" className="p-2 text-white/80 hover:bg-white/10"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => setZoom(1)} className="px-2 text-[11px] font-black tabular-nums text-white/80">{Math.round(zoom * 100)}%</button>
                <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title="Acercar" className="p-2 text-white/80 hover:bg-white/10"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setZoom(1)} title="Restablecer" className="p-2 text-white/80 hover:bg-white/10 border-l border-white/15"><RotateCcw className="w-4 h-4" /></button>
              </div>
              <button onClick={() => window.print()} title="Imprimir" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"><Printer className="w-4 h-4" /> Imprimir</button>
              <button onClick={async () => { setWordBusy(true); try { await api.descargarDocumentoWord(id); } catch (e) { alert((e as Error).message); } finally { setWordBusy(false); } }} disabled={wordBusy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-50"><FileType2 className="w-4 h-4" /> Word</button>
              <button onClick={() => setAmpliado(false)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8">
            <div style={{ zoom: zoom }}>
              <DocSheet contenido={doc.contenido} />
            </div>
          </div>
        </div>
      )}

      {/* Área e impresión aislada: al imprimir solo se ve la hoja del documento */}
      {doc && tieneContenido && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body { background: #fff !important; }
              body * { visibility: hidden !important; }
              .doc-print-area, .doc-print-area * { visibility: visible !important; }
              .doc-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; zoom: 1 !important; }
              .doc-print-area > div { box-shadow: none !important; max-width: 100% !important; }
              @page { margin: 1.4cm; }
            }
          ` }} />
          <div className="doc-print-area" aria-hidden style={{ position: "fixed", left: "-10000px", top: 0 }}>
            <DocSheet contenido={doc.contenido} />
          </div>
        </>
      )}
    </div>
  );
}

// Ciclo de vida del documento controlado (ISO 7.5): muestra en qué etapa está.
function CicloVidaDoc({ estado, theme, isDark }: { estado: string; theme: any; isDark: boolean }) {
  const FLUJO = [
    { id: "BORRADOR", label: "Borrador", icon: FileText, color: "#94A3B8" },
    { id: "EN_REVISION", label: "En revisión", icon: Clock, color: "#F59E0B" },
    { id: "VIGENTE", label: "Vigente", icon: CheckCircle2, color: "#10B981" },
  ];
  const obsoleto = estado === "OBSOLETO";
  const rechazado = estado === "RECHAZADO";
  const idx = FLUJO.findIndex((f) => f.id === estado);
  return (
    <div className="flex items-center gap-1 max-w-xl">
      {FLUJO.map((f, i) => {
        const done = !obsoleto && !rechazado && idx >= i;
        const actual = estado === f.id;
        return (
          <div key={f.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${actual ? "ring-2" : ""}`}
                style={{ background: done ? f.color : (isDark ? "#ffffff10" : "#0000000a"), color: done ? "#fff" : (isDark ? "#64748b" : "#94a3b8"), ...(actual ? { boxShadow: `0 0 0 2px ${f.color}55` } : {}) }}>
                <f.icon className="w-4 h-4" />
              </div>
              <span className={`text-[9px] font-bold mt-1 ${done ? theme.textPrimary : theme.textTertiary}`}>{f.label}</span>
            </div>
            {i < FLUJO.length - 1 && <div className="h-0.5 flex-1 mb-4" style={{ background: (!obsoleto && !rechazado && idx > i) ? FLUJO[i + 1].color : (isDark ? "#ffffff14" : "#0000000d") }} />}
          </div>
        );
      })}
      {obsoleto && <span className="ml-3 text-[11px] font-bold text-zinc-400 inline-flex items-center gap-1 mb-4"><ShieldX className="w-3.5 h-3.5" /> Obsoleto</span>}
      {rechazado && <span className="ml-3 text-[11px] font-bold text-rose-500 inline-flex items-center gap-1 mb-4"><ShieldX className="w-3.5 h-3.5" /> Rechazado</span>}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    BORRADOR:    "bg-slate-500/20 text-slate-200 border-slate-500/30",
    EN_REVISION: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    VIGENTE:     "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    OBSOLETO:    "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    RECHAZADO:   "bg-rose-500/20 text-rose-200 border-rose-500/30",
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[estado] || map.BORRADOR}`}>
      {estado.replace("_", " ")}
    </span>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <div className="flex justify-between gap-2">
      <span className={theme.textTertiary}>{label}</span>
      <span className={`${theme.textPrimary} text-right`}>{value}</span>
    </div>
  );
}

function PropuestaItem({ p, theme, isDarkMode, canReview, userId, onChange }: {
  p: Propuesta; theme: any; isDarkMode: boolean; canReview: boolean; userId: number | null; onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    try { await api.aceptarPropuestaMejora(p.id, ""); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    const comentario = prompt("Motivo del rechazo (obligatorio):") || "";
    if (!comentario.trim()) return;
    setBusy(true);
    try { await api.rechazarPropuestaMejora(p.id, comentario); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <li className={`p-3 rounded-xl border ${
      isDarkMode ? "bg-white/[0.02] border-white/[0.05]" : "bg-slate-50/50 border-slate-200/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              p.estado === "PENDIENTE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : p.estado === "ACEPTADA" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : p.estado === "RECHAZADA" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
            }`}>{p.estado}</span>
            <span className={`text-[10px] ${theme.textTertiary}`}>{new Date(p.fecha).toLocaleDateString()}</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${theme.textPrimary}`}>{p.titulo}</div>
          <div className={`text-xs ${theme.textSecondary}`}>{p.descripcion}</div>
          <div className={`text-[10px] mt-1 ${theme.textTertiary}`}>Por {p.autor_username}</div>
          {p.comentario_revision && (
            <div className={`text-[10px] italic mt-1 ${theme.textTertiary}`}>"{p.comentario_revision}" — {p.revisado_por_username}</div>
          )}
        </div>
        {canReview && p.estado === "PENDIENTE" && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={accept} disabled={busy} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40">Aceptar</button>
            <button onClick={reject} disabled={busy} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40">Rechazar</button>
          </div>
        )}
      </div>
    </li>
  );
}

function EnviarAprobacionModal({ flujos, onClose, onSubmit }: {
  flujos: Flujo[]; onClose: () => void;
  onSubmit: (flujoId: number | null, comentario: string) => Promise<void>;
}) {
  const [flujoId, setFlujoId] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Enviar a aprobacion" onClose={onClose}>
      <p className="text-xs text-slate-400 mb-2">
        Se creara una solicitud usando el flujo seleccionado. Si no escoges, se usa el flujo
        por defecto configurado para este tipo de documento.
      </p>
      <label className="text-xs text-slate-300 font-bold">Flujo de aprobacion</label>
      <select value={flujoId ?? ""} onChange={(e) => setFlujoId(e.target.value ? Number(e.target.value) : null)}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
        <option value="">— Auto (default del tipo) —</option>
        {flujos.map((f) => <option key={f.id} value={f.id}>{f.nombre} · {f.modo} · {f.n_pasos} pasos</option>)}
      </select>
      <label className="text-xs text-slate-300 font-bold mt-3 block">Comentario (opcional)</label>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={async () => { setBusy(true); try { await onSubmit(flujoId, comentario); } finally { setBusy(false); } }}
          disabled={busy} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-40">
          Enviar
        </button>
      </div>
    </Modal>
  );
}

function ComentarioModal({ title, placeholder, required, onClose, onSubmit }: {
  title: string; placeholder: string; required?: boolean;
  onClose: () => void; onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={async () => { setBusy(true); try { await onSubmit(text); } finally { setBusy(false); } }}
          disabled={busy || (required && !text.trim())}
          className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-40">
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

function NuevaVersionModal({ onClose, onSubmit }: {
  onClose: () => void; onSubmit: (version: string, archivo: File, notas: string) => Promise<void>;
}) {
  const [version, setVersion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Subir nueva version" onClose={onClose}>
      <p className="text-xs text-slate-400 mb-3">
        La version actual pasa al historial. La nueva queda en BORRADOR y tendras que enviarla
        de nuevo a aprobacion para que sea VIGENTE.
      </p>
      <label className="text-xs text-slate-300 font-bold block">Numero de version *</label>
      <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.0"
        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono" />
      <label className="text-xs text-slate-300 font-bold block mt-3">Archivo *</label>
      <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)}
        className="w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer" />
      <label className="text-xs text-slate-300 font-bold block mt-3">Notas de cambios *</label>
      <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3}
        placeholder="Que cambio en esta version?"
        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={async () => { if (!version || !archivo) return; setBusy(true); try { await onSubmit(version, archivo, notas); } finally { setBusy(false); } }}
          disabled={busy || !version || !archivo}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-40">
          Subir
        </button>
      </div>
    </Modal>
  );
}

function PropuestaModal({ documentoId, onClose, onCreated }: {
  documentoId: number; onClose: () => void; onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!titulo.trim() || !descripcion.trim()) return alert("Completa titulo y descripcion.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("documento", String(documentoId));
      fd.append("titulo", titulo.trim());
      fd.append("descripcion", descripcion.trim());
      if (archivo) fd.append("archivo_propuesto", archivo);
      await api.crearPropuestaMejora(fd);
      onCreated();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Proponer mejora" onClose={onClose}>
      <p className="text-xs text-slate-400 mb-3">
        Describe el cambio sugerido. La propuesta se enviara al responsable del documento para
        que la revise.
      </p>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Titulo *"
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4}
        placeholder="Describe la mejora..."
        className="w-full mt-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <label className="text-xs text-slate-300 font-bold block mt-3">Adjunto (opcional)</label>
      <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)}
        className="w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-900 file:cursor-pointer" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={submit} disabled={busy}
          className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-bold disabled:opacity-40">
          Enviar propuesta
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
