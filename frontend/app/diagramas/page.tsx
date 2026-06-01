"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, CheckCircle2, Clock, Eye, FileEdit, Inbox, Pencil, Plus,
  Send, ShieldCheck, ShieldX, Trash2, User as UserIcon, Users, Workflow,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

type Permiso = "propietario" | "editar" | "ver" | "ninguno";
type Estado = "BORRADOR" | "EN_REVISION" | "APROBADO" | "RECHAZADO";

interface DiagramaListItem {
  id: number;
  titulo: string;
  descripcion: string;
  publico: boolean;
  miniatura: string;
  creado: string;
  actualizado: string;
  creado_por: number | null;
  creado_por_username: string;
  nodos_count: number;
  mi_permiso: Permiso;
  estado: Estado;
  modulo_codigo: string;
  modulo_nombre: string;
  aprobador: number | null;
  aprobador_username: string;
  enviado_aprobacion_en: string | null;
  visto_por_aprobador_en: string | null;
  decidido_en: string | null;
  decidido_por_username: string;
  comentario_decision: string;
}

interface UsuarioMini { id: number; username: string; first_name: string; last_name: string }

// Filtros de estado para "Mis diagramas".
type Filtro = "all" | "BORRADOR" | "ESPERA" | "VISTO" | "APROBADO" | "RECHAZADO";

const esEspera = (d: DiagramaListItem) => d.estado === "EN_REVISION" && !d.visto_por_aprobador_en;
const esVisto = (d: DiagramaListItem) => d.estado === "EN_REVISION" && !!d.visto_por_aprobador_en;

export default function DiagramasListPage() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const { user } = useUser();
  const [items, setItems] = useState<DiagramaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [nuevo, setNuevo] = useState({ titulo: "", descripcion: "" });
  const [filtro, setFiltro] = useState<Filtro>("all");

  // Estado del modal "Enviar a aprobacion" desde la lista.
  const [enviarDe, setEnviarDe] = useState<DiagramaListItem | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioMini[]>([]);
  const [aprobadorId, setAprobadorId] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getDiagramas();
      setItems(r.results || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    api.getUsuarios().then((r) => setUsuarios(r.results || [])).catch(() => {});
  }, []);

  const crear = async () => {
    if (!nuevo.titulo.trim()) return;
    try {
      const d = await api.crearDiagrama({
        titulo: nuevo.titulo.trim(),
        descripcion: nuevo.descripcion.trim(),
        data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      });
      router.push(`/diagramas/${d.id}`);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este diagrama? No se puede deshacer.")) return;
    try {
      await api.eliminarDiagrama(id);
      setItems((p) => p.filter((x) => x.id !== id));
    } catch (e) { alert((e as Error).message); }
  };

  const abrirEnviar = (d: DiagramaListItem) => {
    setEnviarDe(d);
    setAprobadorId(null);
    setComentario("");
  };

  const confirmarEnviar = async () => {
    if (!enviarDe || !aprobadorId) { alert("Selecciona un aprobador."); return; }
    setEnviando(true);
    try {
      await api.enviarDiagramaAprobacion(enviarDe.id, aprobadorId, comentario);
      setEnviarDe(null);
      await cargar();
    } catch (e) { alert((e as Error).message); }
    finally { setEnviando(false); }
  };

  // ── Buckets ────────────────────────────────────────────────────────────────
  // Diagramas que ME toca aprobar (alguien me los envio, o auto-aprobacion).
  const porAprobar = useMemo(
    () => items.filter((d) => d.estado === "EN_REVISION" && user?.id != null && d.aprobador === user.id),
    [items, user?.id],
  );
  // Mis diagramas (soy propietario).
  const mios = useMemo(
    () => items.filter((d) => d.mi_permiso === "propietario"),
    [items],
  );
  // Compartidos conmigo.
  const compartidos = useMemo(
    () => items.filter((d) => d.mi_permiso === "editar" || d.mi_permiso === "ver"),
    [items],
  );

  const counts = useMemo(() => ({
    all: mios.length,
    BORRADOR: mios.filter((d) => d.estado === "BORRADOR").length,
    ESPERA: mios.filter(esEspera).length,
    VISTO: mios.filter(esVisto).length,
    APROBADO: mios.filter((d) => d.estado === "APROBADO").length,
    RECHAZADO: mios.filter((d) => d.estado === "RECHAZADO").length,
  }), [mios]);

  const miosFiltrados = useMemo(() => {
    switch (filtro) {
      case "BORRADOR": return mios.filter((d) => d.estado === "BORRADOR");
      case "ESPERA": return mios.filter(esEspera);
      case "VISTO": return mios.filter(esVisto);
      case "APROBADO": return mios.filter((d) => d.estado === "APROBADO");
      case "RECHAZADO": return mios.filter((d) => d.estado === "RECHAZADO");
      default: return mios;
    }
  }, [mios, filtro]);

  const CHIPS: Array<{ id: Filtro; label: string; icon: any; count: number; color: string }> = [
    { id: "all",       label: "Todos",     icon: Workflow,     count: counts.all,       color: "#8B5CF6" },
    { id: "BORRADOR",  label: "Borradores", icon: FileEdit,    count: counts.BORRADOR,  color: "#94A3B8" },
    { id: "ESPERA",    label: "En espera",  icon: Clock,       count: counts.ESPERA,    color: "#F59E0B" },
    { id: "VISTO",     label: "Vistos",     icon: Eye,         count: counts.VISTO,     color: "#0EA5E9" },
    { id: "APROBADO",  label: "Aprobados",  icon: CheckCircle2, count: counts.APROBADO, color: "#10B981" },
    { id: "RECHAZADO", label: "Rechazados", icon: ShieldX,     count: counts.RECHAZADO, color: "#F43F5E" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
            <Workflow className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>
              Diagramas de Flujo
            </h1>
            <p className={`text-sm ${theme.textSecondary}`}>
              Crea flujos, envíalos a aprobación y sigue su estado: en espera, vistos, aprobados.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}
        >
          <Plus className="w-4 h-4" /> Nuevo diagrama
        </button>
      </div>

      {loading ? (
        <div className={`text-center py-20 ${theme.textTertiary}`}>Cargando…</div>
      ) : items.length === 0 ? (
        <EmptyState onCreate={() => setShowNew(true)} isDark={isDarkMode} theme={theme} />
      ) : (
        <>
          {/* Te toca aprobar */}
          {porAprobar.length > 0 && (
            <section className="space-y-3">
              <div className={`rounded-2xl border p-4 ${
                isDarkMode ? "bg-amber-500/[0.06] border-amber-500/25" : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500">
                    <Inbox className="w-4 h-4" />
                  </span>
                  <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>
                    Te toca aprobar
                  </h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    {porAprobar.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {porAprobar.map((d) => (
                    <DiagramaCard
                      key={d.id} d={d} myId={user?.id ?? null}
                      isDark={isDarkMode} theme={theme}
                      onOpen={() => router.push(`/diagramas/${d.id}`)}
                      onDelete={() => eliminar(d.id)}
                      onEnviar={() => abrirEnviar(d)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Mis diagramas + filtros por estado */}
          <section className="space-y-4">
            <SectionHeader
              icon={<UserIcon className="w-4 h-4" />}
              label="Mis diagramas"
              count={mios.length}
              theme={theme}
              isDark={isDarkMode}
            />

            {/* Chips de filtro por estado */}
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => {
                const active = filtro === chip.id;
                const Icon = chip.icon;
                return (
                  <button key={chip.id} onClick={() => setFiltro(chip.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      active
                        ? "text-white shadow-md"
                        : isDarkMode
                          ? "bg-white/[0.03] border-white/[0.06] text-slate-300 hover:bg-white/[0.06]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    style={active ? { background: chip.color, borderColor: chip.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {chip.label}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? "bg-white/25" : isDarkMode ? "bg-white/[0.06]" : "bg-slate-100"
                    }`}>{chip.count}</span>
                  </button>
                );
              })}
            </div>

            {miosFiltrados.length === 0 ? (
              <p className={`text-sm py-8 text-center rounded-2xl border border-dashed ${
                isDarkMode ? "border-white/[0.06] text-slate-400 bg-white/[0.02]" : "border-slate-200 text-slate-500 bg-slate-50/40"
              }`}>
                {filtro === "all"
                  ? 'Aún no creas ninguno. Empieza con el botón "Nuevo diagrama".'
                  : "No hay diagramas en este estado."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {miosFiltrados.map((d) => (
                  <DiagramaCard
                    key={d.id} d={d} myId={user?.id ?? null}
                    isDark={isDarkMode} theme={theme}
                    onOpen={() => router.push(`/diagramas/${d.id}`)}
                    onDelete={() => eliminar(d.id)}
                    onEnviar={() => abrirEnviar(d)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Compartidos conmigo */}
          {compartidos.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<Users className="w-4 h-4" />}
                label="Compartidos conmigo"
                count={compartidos.length}
                theme={theme}
                isDark={isDarkMode}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {compartidos.map((d) => (
                  <DiagramaCard
                    key={d.id} d={d} myId={user?.id ?? null}
                    isDark={isDarkMode} theme={theme}
                    onOpen={() => router.push(`/diagramas/${d.id}`)}
                    onDelete={() => eliminar(d.id)}
                    onEnviar={() => abrirEnviar(d)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal crear */}
      {showNew && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNew(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
              isDarkMode ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"
            }`}>
            <div>
              <h2 className={`text-lg font-black ${theme.textPrimary}`}>Nuevo diagrama</h2>
              <p className={`text-xs ${theme.textTertiary}`}>Empieza con un canvas vacío.</p>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Título</label>
              <input autoFocus value={nuevo.titulo}
                onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
                placeholder="Ej. Proceso de timbrado CFDI"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${
                  isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white focus:border-[#EC4899]/50"
                             : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#EC4899]/50"
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Descripción (opcional)</label>
              <textarea value={nuevo.descripcion}
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                placeholder="Para qué sirve, quién lo usa…"
                rows={3}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${
                  isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white focus:border-[#EC4899]/50"
                             : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#EC4899]/50"
                }`}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowNew(false)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                  isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}>Cancelar</button>
              <button onClick={crear} disabled={!nuevo.titulo.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
                Crear y editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar a aprobacion */}
      {enviarDe && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setEnviarDe(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 ${
              isDarkMode ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"
            }`}>
            <div>
              <h2 className={`text-lg font-black ${theme.textPrimary}`}>Enviar a aprobación</h2>
              <p className={`text-xs ${theme.textTertiary}`}>
                "{enviarDe.titulo}" pasará a <b>En revisión</b> y el aprobador será notificado en su bandeja.
              </p>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Aprobador</label>
              <select value={aprobadorId ?? ""}
                onChange={(e) => setAprobadorId(e.target.value ? Number(e.target.value) : null)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${
                  isDarkMode ? "bg-[#1E293B]/60 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}>
                <option value="">— Selecciona —</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}{u.first_name ? ` (${u.first_name} ${u.last_name || ""})` : ""}
                    {user?.id === u.id ? " — yo mismo (auto-aprobación)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Comentario (opcional)</label>
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
                placeholder="Contexto para el aprobador…"
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${
                  isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setEnviarDe(null)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                  isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}>Cancelar</button>
              <button onClick={confirmarEnviar} disabled={enviando || !aprobadorId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-40 bg-indigo-600 hover:bg-indigo-700">
                <Send className="w-4 h-4" /> {enviando ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count, theme, isDark }: any) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
        isDark ? "bg-white/[0.05] text-slate-300" : "bg-slate-100 text-slate-600"
      }`}>{icon}</span>
      <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>{label}</h2>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        isDark ? "bg-white/[0.05] text-slate-400" : "bg-slate-100 text-slate-500"
      }`}>{count}</span>
    </div>
  );
}

function EstadoBadge({ d, isDark }: { d: DiagramaListItem; isDark: boolean }) {
  // "Vistos" es un sub-estado de EN_REVISION (lo vio el aprobador, sin decidir).
  const key: Estado | "VISTO" = esVisto(d) ? "VISTO" : d.estado;
  const labels = {
    BORRADOR: "Borrador", EN_REVISION: "En espera", VISTO: "Visto",
    APROBADO: "Aprobado", RECHAZADO: "Rechazado",
  } as const;
  const dark = {
    BORRADOR:    "bg-slate-500/20 text-slate-200 border-slate-500/30",
    EN_REVISION: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    VISTO:       "bg-sky-500/20 text-sky-200 border-sky-500/30",
    APROBADO:    "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    RECHAZADO:   "bg-rose-500/20 text-rose-200 border-rose-500/30",
  } as const;
  const light = {
    BORRADOR:    "bg-slate-100 text-slate-700 border-slate-300",
    EN_REVISION: "bg-amber-100 text-amber-800 border-amber-300",
    VISTO:       "bg-sky-100 text-sky-800 border-sky-300",
    APROBADO:    "bg-emerald-100 text-emerald-800 border-emerald-300",
    RECHAZADO:   "bg-rose-100 text-rose-800 border-rose-300",
  } as const;
  const cls = (isDark ? dark : light)[key] || (isDark ? dark : light).BORRADOR;
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md border ${cls}`}>
      {labels[key]}
    </span>
  );
}

function PermisoBadge({ permiso, isDark }: { permiso: Permiso; isDark: boolean }) {
  let cls: string;
  let label: string;
  let Icon: any;
  switch (permiso) {
    case "propietario":
      cls = isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                   : "bg-emerald-100 text-emerald-800 border-emerald-300";
      label = "Propietario"; Icon = UserIcon; break;
    case "editar":
      cls = isDark ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                   : "bg-blue-100 text-blue-800 border-blue-300";
      label = "Puedo editar"; Icon = Pencil; break;
    default:
      cls = isDark ? "bg-slate-500/20 text-slate-200 border-slate-500/30"
                   : "bg-slate-100 text-slate-700 border-slate-300";
      label = "Solo ver"; Icon = Eye; break;
  }
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md border inline-flex items-center gap-1 ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

// Linea de estado de aprobacion contextual segun el estado del diagrama.
function ApprovalMeta({ d, theme, isDark }: { d: DiagramaListItem; theme: any; isDark: boolean }) {
  if (d.estado === "EN_REVISION") {
    const color = esVisto(d)
      ? (isDark ? "text-sky-400" : "text-sky-600")
      : (isDark ? "text-amber-400" : "text-amber-600");
    return (
      <div className={`text-[11px] flex items-center gap-1.5 ${color}`}>
        {esVisto(d) ? <Eye className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {esVisto(d)
          ? <span>Visto por <b>{d.aprobador_username || "—"}</b>, falta decisión</span>
          : <span>En espera de <b>{d.aprobador_username || "—"}</b></span>}
      </div>
    );
  }
  if (d.estado === "APROBADO") {
    return (
      <div className={`text-[11px] flex items-center gap-1.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
        <ShieldCheck className="w-3 h-3" /> Aprobado por <b>{d.decidido_por_username || "—"}</b>
      </div>
    );
  }
  if (d.estado === "RECHAZADO") {
    return (
      <div className={`text-[11px] flex items-center gap-1.5 ${isDark ? "text-rose-400" : "text-rose-600"}`}>
        <ShieldX className="w-3 h-3" /> Rechazado por <b>{d.decidido_por_username || "—"}</b>
      </div>
    );
  }
  return (
    <div className={`text-[11px] flex items-center gap-1.5 ${theme.textTertiary}`}>
      <FileEdit className="w-3 h-3" /> Borrador — sin enviar
    </div>
  );
}

function DiagramaCard({ d, myId, isDark, theme, onOpen, onDelete, onEnviar }: any) {
  const esPropio: boolean = d.mi_permiso === "propietario";
  const puedeEnviar: boolean = esPropio && (d.estado === "BORRADOR" || d.estado === "RECHAZADO");
  const meToca: boolean = d.estado === "EN_REVISION" && myId != null && d.aprobador === myId;
  return (
    <div className={`group relative rounded-3xl border overflow-hidden transition-all hover:scale-[1.01] hover:shadow-xl ${
      isDark ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
    }`}>
      {/* Preview / placeholder */}
      <button onClick={onOpen} className="block w-full aspect-video relative"
        style={{
          background: d.miniatura
            ? `url(${d.miniatura}) center/cover`
            : "linear-gradient(135deg,rgba(236,72,153,0.08),rgba(139,92,246,0.12))",
        }}>
        {!d.miniatura && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Workflow className={`w-12 h-12 ${isDark ? "text-pink-500/40" : "text-pink-500/50"}`} />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end">
          <PermisoBadge permiso={d.mi_permiso} isDark={isDark} />
          <EstadoBadge d={d} isDark={isDark} />
          {d.modulo_nombre && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md border ${
              isDark ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/30" : "bg-cyan-100 text-cyan-800 border-cyan-300"
            }`}>
              ⛓ {d.modulo_codigo}
            </span>
          )}
        </div>
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="flex-1 min-w-0 text-left">
            <h3 className={`text-base font-black truncate ${theme.textPrimary}`}>{d.titulo}</h3>
            {d.descripcion && (
              <p className={`text-xs mt-0.5 truncate ${theme.textSecondary}`}>{d.descripcion}</p>
            )}
          </button>
          {esPropio && d.estado !== "APROBADO" && (
            <button onClick={onDelete}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"
              }`}
              title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Estado de aprobacion */}
        <div className="mt-2.5">
          <ApprovalMeta d={d} theme={theme} isDark={isDark} />
        </div>

        {/* Acciones */}
        {(puedeEnviar || meToca) && (
          <div className="mt-3 flex gap-2">
            {puedeEnviar && (
              <button onClick={onEnviar}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                <Send className="w-3.5 h-3.5" /> Enviar a aprobación
              </button>
            )}
            {meToca && (
              <button onClick={onOpen}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" /> Revisar y decidir
              </button>
            )}
          </div>
        )}

        <div className={`mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>
          <span className="inline-flex items-center gap-1">
            <UserIcon className="w-3 h-3" /> {d.creado_por_username || "—"}
          </span>
          <span>{d.nodos_count} nodos</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(d.actualizado).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate, isDark, theme }: any) {
  return (
    <div className={`text-center py-20 px-6 rounded-3xl border-2 border-dashed ${
      isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/40"
    }`}>
      <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-md"
        style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
        <Workflow className="w-9 h-9 text-white" />
      </div>
      <h2 className={`text-xl font-black ${theme.textPrimary}`}>Aún no tienes diagramas</h2>
      <p className={`text-sm mt-1 ${theme.textSecondary}`}>
        Empieza el primero — toma menos de un minuto.
      </p>
      <button onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
        style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
        <Plus className="w-4 h-4" /> Crear mi primer diagrama
      </button>
    </div>
  );
}
