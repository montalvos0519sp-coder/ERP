"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, GripVertical, Plus, Save, Trash2, Users, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

type Tipo = "texto" | "parrafo" | "numero" | "booleano" | "seleccion" | "foto" | "fecha"
  | "unidad" | "km_unidad" | "termo" | "horas_termo";

interface Campo {
  clave: string;
  seccion: string;
  etiqueta: string;
  tipo: Tipo;
  obligatorio: boolean;
  ayuda: string;
  opciones: string[];
  min_valor: number | null;
  max_valor: number | null;
  depende_de: string;   // clave del campo que controla la visibilidad
  mostrar_si: string;   // valor que debe tener ese campo (boolean: "si"/"no")
  foto_aplica: "" | "siempre" | "si_si" | "si_no";  // pedir foto adjunta a este campo
  foto_obligatoria: boolean;
}

const nuevaClave = () => Math.random().toString(36).slice(2, 12);

interface UsuarioMini { id: number; username: string; first_name: string; last_name: string }

const TIPOS: { id: Tipo; label: string }[] = [
  { id: "texto", label: "Texto corto" },
  { id: "parrafo", label: "Texto largo" },
  { id: "numero", label: "Número" },
  { id: "booleano", label: "Sí / No" },
  { id: "seleccion", label: "Selección" },
  { id: "foto", label: "Foto" },
  { id: "fecha", label: "Fecha" },
  { id: "unidad", label: "Unidad (flota)" },
  { id: "km_unidad", label: "Km de la unidad → actualiza catálogo" },
  { id: "termo", label: "Termo" },
  { id: "horas_termo", label: "Horas del termo → actualiza catálogo" },
];

const campoVacio = (): Campo => ({
  clave: nuevaClave(), seccion: "", etiqueta: "", tipo: "texto", obligatorio: false,
  ayuda: "", opciones: [], min_valor: null, max_valor: null,
  depende_de: "", mostrar_si: "", foto_aplica: "", foto_obligatoria: false,
});

export default function FlujoBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const esNuevo = id === "nuevo";
  const { isDarkMode: isDark, theme } = useTheme();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [tecnicosIds, setTecnicosIds] = useState<number[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioMini[]>([]);
  const [loading, setLoading] = useState(!esNuevo);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (esNuevo) { setCampos([campoVacio()]); return; }
    setLoading(true);
    try {
      const f = await api.getFlujoMantto(id);
      setNombre(f.nombre); setDescripcion(f.descripcion || ""); setActivo(f.activo);
      setTecnicosIds((f.tecnicos_detalle || []).map((t: any) => t.id));
      setCampos((f.campos || []).map((c: any) => ({
        clave: c.clave || nuevaClave(),
        seccion: c.seccion || "", etiqueta: c.etiqueta, tipo: c.tipo,
        obligatorio: c.obligatorio, ayuda: c.ayuda || "",
        opciones: c.opciones || [], min_valor: c.min_valor, max_valor: c.max_valor,
        depende_de: c.depende_de || "", mostrar_si: c.mostrar_si || "",
        foto_aplica: c.foto_aplica || "", foto_obligatoria: !!c.foto_obligatoria,
      })));
    } finally { setLoading(false); }
  }, [esNuevo, id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { api.getUsuarios().then((r) => setUsuarios(r.results || [])).catch(() => {}); }, []);

  const setCampo = (i: number, patch: Partial<Campo>) =>
    setCampos((cs) => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const addCampo = () => setCampos((cs) => [...cs, campoVacio()]);
  const delCampo = (i: number) => setCampos((cs) => cs.filter((_, idx) => idx !== i));
  const mover = (i: number, dir: -1 | 1) => setCampos((cs) => {
    const j = i + dir;
    if (j < 0 || j >= cs.length) return cs;
    const next = [...cs]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const toggleTecnico = (uid: number) =>
    setTecnicosIds((ids) => ids.includes(uid) ? ids.filter((x) => x !== uid) : [...ids, uid]);

  const guardar = async () => {
    if (!nombre.trim()) { alert("Ponle un nombre al flujo."); return; }
    if (campos.length === 0 || campos.some((c) => !c.etiqueta.trim())) {
      alert("Todos los campos deben tener una etiqueta."); return;
    }
    setSaving(true);
    const payload = {
      nombre: nombre.trim(), descripcion: descripcion.trim(), activo,
      tecnicos_ids: tecnicosIds,
      campos: campos.map((c, i) => ({
        clave: c.clave, seccion: c.seccion.trim(), etiqueta: c.etiqueta.trim(), tipo: c.tipo,
        obligatorio: c.obligatorio, ayuda: c.ayuda.trim(), orden: i,
        opciones: c.tipo === "seleccion" ? c.opciones.filter((o) => o.trim()) : [],
        min_valor: c.tipo === "numero" ? c.min_valor : null,
        max_valor: c.tipo === "numero" ? c.max_valor : null,
        depende_de: c.depende_de, mostrar_si: c.depende_de ? c.mostrar_si : "",
        foto_aplica: c.tipo === "foto" ? "" : c.foto_aplica,
        foto_obligatoria: c.tipo !== "foto" && !!c.foto_aplica && c.foto_obligatoria,
      })),
    };
    try {
      if (esNuevo) await api.crearFlujoMantto(payload);
      else await api.actualizarFlujoMantto(id, payload);
      router.push("/mantenimiento/flujos");
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm outline-none ${
    isDark ? "bg-[#1E293B]/50 border-white/[0.06] text-white focus:border-indigo-500/50"
           : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500/50"
  }`;

  if (loading) return <div className={`p-10 text-center ${theme.textTertiary}`}>Cargando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push("/mantenimiento/flujos")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <h1 className={`text-xl font-black tracking-tight truncate ${theme.textPrimary}`}>
            {esNuevo ? "Nuevo flujo" : "Editar flujo"}
          </h1>
        </div>
        <button onClick={guardar} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
          <Save className="w-4 h-4" /> {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {/* Datos del flujo */}
      <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
        <div>
          <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Nombre del flujo *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls}
            placeholder="Ej. Inspección diaria de unidad" />
        </div>
        <div>
          <label className={`block text-xs font-bold mb-1 ${theme.textSecondary}`}>Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
            className={`${inputCls} resize-none`} placeholder="Para qué sirve, cuándo se llena…" />
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
          <span className={`text-sm ${theme.textSecondary}`}>Activo (visible para los técnicos)</span>
        </label>
      </div>

      {/* Técnicos asignados */}
      <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-emerald-500" />
          <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Técnicos asignados</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">{tecnicosIds.length}</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {usuarios.map((u) => {
            const sel = tecnicosIds.includes(u.id);
            return (
              <button key={u.id} onClick={() => toggleTecnico(u.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  sel ? "bg-emerald-600 border-transparent text-white"
                      : isDark ? "bg-white/[0.03] border-white/[0.06] text-slate-300" : "bg-white border-slate-200 text-slate-600"
                }`}>
                {sel && <Check className="w-3 h-3" />}
                {u.username}{u.first_name ? ` · ${u.first_name}` : ""}
              </button>
            );
          })}
          {usuarios.length === 0 && <span className={`text-xs ${theme.textTertiary}`}>No hay usuarios.</span>}
        </div>
      </div>

      {/* Campos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Campos del checklist</h2>
          <button onClick={addCampo}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isDark ? "bg-white/[0.04] border-white/[0.06] text-indigo-300" : "bg-white border-slate-200 text-indigo-600"
            }`}>
            <Plus className="w-4 h-4" /> Agregar campo
          </button>
        </div>

        {campos.map((c, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
              <span className={`text-xs font-bold ${theme.textTertiary}`}>{TIPOS.find((t) => t.id === c.tipo)?.label}</span>
              <div className="flex-1" />
              <button onClick={() => mover(i, -1)} disabled={i === 0} className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 ${isDark ? "hover:bg-white/[0.06] text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => mover(i, 1)} disabled={i === campos.length - 1} className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 ${isDark ? "hover:bg-white/[0.06] text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => delCampo(i)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-rose-500/15 text-rose-400" : "hover:bg-rose-50 text-rose-500"}`}><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Etiqueta / pregunta *</label>
                <input value={c.etiqueta} onChange={(e) => setCampo(i, { etiqueta: e.target.value })} className={inputCls}
                  placeholder="Ej. ¿Nivel de aceite OK?" />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Tipo</label>
                <select value={c.tipo} onChange={(e) => setCampo(i, { tipo: e.target.value as Tipo })} className={inputCls}>
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Sección (checklist)</label>
                <input value={c.seccion} onChange={(e) => setCampo(i, { seccion: e.target.value })} className={inputCls}
                  placeholder="Ej. Motor, Llantas…" />
              </div>

              {c.tipo === "numero" && (
                <>
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Valor mínimo (mayor o igual)</label>
                    <input type="number" value={c.min_valor ?? ""} onChange={(e) => setCampo(i, { min_valor: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="sin mínimo" />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Valor máximo (menor o igual)</label>
                    <input type="number" value={c.max_valor ?? ""} onChange={(e) => setCampo(i, { max_valor: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} placeholder="sin máximo" />
                  </div>
                </>
              )}

              {c.tipo === "seleccion" && (
                <div className="sm:col-span-2">
                  <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Opciones (una por línea)</label>
                  <textarea value={c.opciones.join("\n")} onChange={(e) => setCampo(i, { opciones: e.target.value.split("\n") })} rows={3}
                    className={`${inputCls} resize-none`} placeholder={"Bueno\nRegular\nMalo"} />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className={`block text-[11px] font-bold mb-1 ${theme.textSecondary}`}>Texto de ayuda (opcional)</label>
                <input value={c.ayuda} onChange={(e) => setCampo(i, { ayuda: e.target.value })} className={inputCls}
                  placeholder="Aclaración para el técnico" />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer sm:col-span-2">
                <input type="checkbox" checked={c.obligatorio} onChange={(e) => setCampo(i, { obligatorio: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
                <span className={`text-sm ${theme.textSecondary}`}>Campo obligatorio</span>
              </label>

              {/* Foto adjunta a este campo (no aplica a campos tipo Foto) */}
              {c.tipo !== "foto" && (
                <div className={`sm:col-span-2 rounded-xl border p-3 ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-[11px] font-black uppercase tracking-wider mb-2 ${theme.textTertiary}`}>
                    Pedir foto en este campo
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={c.foto_aplica}
                      onChange={(e) => setCampo(i, { foto_aplica: e.target.value as Campo["foto_aplica"] })}
                      className={`${inputCls} flex-1 min-w-[160px]`}>
                      <option value="">No pedir foto</option>
                      <option value="siempre">Siempre</option>
                      {c.tipo === "booleano" && <option value="si_si">Solo si responde “Sí”</option>}
                      {c.tipo === "booleano" && <option value="si_no">Solo si responde “No”</option>}
                    </select>
                    {c.foto_aplica && (
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={c.foto_obligatoria} onChange={(e) => setCampo(i, { foto_obligatoria: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
                        <span className={`text-sm ${theme.textSecondary}`}>Foto obligatoria</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Condición: mostrar este campo solo si otro campo tiene cierto valor */}
              {(() => {
                // Campos previos que pueden controlar (Sí/No o selección).
                const controles = campos
                  .slice(0, i)
                  .filter((cc) => cc.tipo === "booleano" || cc.tipo === "seleccion");
                if (controles.length === 0) return null;
                const ctrl = campos.find((cc) => cc.clave === c.depende_de);
                const valores = ctrl
                  ? (ctrl.tipo === "booleano"
                      ? [{ v: "si", l: "Sí" }, { v: "no", l: "No" }]
                      : ctrl.opciones.filter((o) => o.trim()).map((o) => ({ v: o, l: o })))
                  : [];
                return (
                  <div className={`sm:col-span-2 rounded-xl border p-3 ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                    <p className={`text-[11px] font-black uppercase tracking-wider mb-2 ${theme.textTertiary}`}>
                      Condición (opcional) — mostrar este campo solo si…
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={c.depende_de}
                        onChange={(e) => setCampo(i, { depende_de: e.target.value, mostrar_si: "" })}
                        className={`${inputCls} flex-1 min-w-[140px]`}>
                        <option value="">Siempre visible</option>
                        {controles.map((cc) => (
                          <option key={cc.clave} value={cc.clave}>{cc.etiqueta || "(campo sin nombre)"}</option>
                        ))}
                      </select>
                      {c.depende_de && (
                        <>
                          <span className={`text-sm font-bold ${theme.textTertiary}`}>=</span>
                          <select value={c.mostrar_si} onChange={(e) => setCampo(i, { mostrar_si: e.target.value })}
                            className={`${inputCls} flex-1 min-w-[120px]`}>
                            <option value="">— valor —</option>
                            {valores.map((v) => <option key={v.v} value={v.v}>{v.l}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                    {c.depende_de && (
                      <p className={`text-[11px] mt-1.5 ${theme.textTertiary}`}>
                        Ej.: pon un campo de foto con esta condición para pedir evidencia cuando la respuesta sea “No”.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}

        {campos.length === 0 && (
          <p className={`text-sm text-center py-6 rounded-2xl border border-dashed ${isDark ? "border-white/[0.06] text-slate-400" : "border-slate-200 text-slate-500"}`}>
            Sin campos. Agrega el primero.
          </p>
        )}
      </div>
    </div>
  );
}
