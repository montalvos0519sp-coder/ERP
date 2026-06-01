"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, ChevronDown, ChevronUp, FolderCog, Plus, Sparkles, Trash2, Users as UsersIcon,
  Workflow, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface TipoDoc {
  id: number; empresa: number; categoria: string;
  codigo: string; nombre: string; descripcion: string;
  color: string; icono: string; activo: boolean;
}

interface Paso {
  id?: number; aprobador: number; aprobador_username?: string;
  aprobador_nombre?: string; orden: number; obligatorio: boolean;
  descripcion?: string;
}

interface Flujo {
  id: number; empresa: number; nombre: string; descripcion: string;
  tipo_documento: number | null; tipo_documento_codigo: string;
  tipo_documento_nombre: string;
  modo: "UNICO" | "PARALELO" | "SECUENCIAL"; min_aprobaciones: number;
  activo: boolean; es_default: boolean;
  pasos: Paso[]; n_pasos: number;
}

interface UserItem { id: number; username: string; first_name: string; last_name: string; }

export default function AdminDocumentosPage() {
  const { user } = useUser();
  const { theme, isDarkMode } = useTheme();
  const empresaActiva = user?.perfil?.empresa_activa ?? user?.empresas?.[0]?.id ?? null;
  const esStaff = (user?.empresas || []).some((e) => e.id === empresaActiva && e.es_staff) || user?.is_superuser;

  const [tab, setTab] = useState<"tipos" | "flujos">("tipos");

  if (!empresaActiva) {
    return <div className="p-10 text-slate-400">Selecciona una empresa activa.</div>;
  }
  if (!esStaff) {
    return <div className="p-10 text-slate-400">Solo staff puede acceder a la configuracion documental.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#3B82F6)" }}>
          <FolderCog className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Documentos · Configuracion</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Tipos de documento y flujos de aprobacion (ISO 9001).</p>
        </div>
      </div>

      <div className={`inline-flex rounded-xl p-1 border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        {(["tipos", "flujos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize ${
              tab === t
                ? "bg-blue-600 text-white"
                : isDarkMode ? "text-slate-300 hover:bg-white/[0.04]" : "text-slate-600 hover:bg-slate-50"
            }`}>
            {t === "tipos" ? "Tipos de documento" : "Flujos de aprobacion"}
          </button>
        ))}
      </div>

      {tab === "tipos" && <TiposTab empresaId={empresaActiva} />}
      {tab === "flujos" && <FlujosTab empresaId={empresaActiva} />}
    </div>
  );
}

// ── Tipos ────────────────────────────────────────────────────────────────────
function TiposTab({ empresaId }: { empresaId: number }) {
  const { theme, isDarkMode } = useTheme();
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TipoDoc | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTiposDocumento({ empresa: String(empresaId), page_size: "200" });
      setTipos(r.results || []);
    } finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const sembrar = async () => {
    if (!confirm("Crear los tipos ISO 9001 estandar (Politica, Manual, PR, IT, FR, RG, Plan)?")) return;
    try {
      const r = await api.cargarTiposDocumentoSugeridos(empresaId);
      alert(`Se crearon ${r.creados} de ${r.total_sugeridos} tipos.`);
      cargar();
    } catch (e) { alert((e as Error).message); }
  };

  const eliminar = async (t: TipoDoc) => {
    if (!confirm(`Eliminar tipo ${t.codigo}?`)) return;
    try { await api.eliminarTipoDocumento(t.id); cargar(); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={sembrar}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold">
          <Sparkles className="w-4 h-4" /> Sembrar tipos ISO 9001
        </button>
        <button onClick={() => setEditing({
          id: 0, empresa: empresaId, categoria: "PROCEDIMIENTO", codigo: "", nombre: "",
          descripcion: "", color: "#3B82F6", icono: "FileText", activo: true,
        })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuevo tipo
        </button>
      </div>

      {loading ? <div className={theme.textTertiary}>Cargando…</div> : (
        <div className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
        }`}>
          <table className="w-full text-sm">
            <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
              <tr className={theme.textSecondary}>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase">Codigo</th>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase">Nombre</th>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase">Categoria</th>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase">Activo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tipos.length === 0 && (
                <tr><td colSpan={5} className={`px-4 py-6 text-center text-sm ${theme.textTertiary}`}>
                  Aun no hay tipos. Usa "Sembrar" para crear los estandar.
                </td></tr>
              )}
              {tipos.map((t) => (
                <tr key={t.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <td className={`px-4 py-2 font-mono text-xs ${theme.textPrimary}`}>{t.codigo}</td>
                  <td className={`px-4 py-2 ${theme.textPrimary}`}>{t.nombre}</td>
                  <td className={`px-4 py-2 text-xs ${theme.textSecondary}`}>{t.categoria}</td>
                  <td className="px-4 py-2">
                    {t.activo ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditing(t)} className="text-xs text-blue-400 hover:underline mr-3">editar</button>
                    <button onClick={() => eliminar(t)} className="text-xs text-rose-400 hover:underline">eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TipoModal tipo={editing} empresaId={empresaId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); cargar(); }} />
      )}
    </div>
  );
}

function TipoModal({ tipo, empresaId, onClose, onSaved }: {
  tipo: TipoDoc; empresaId: number; onClose: () => void; onSaved: () => void;
}) {
  const [t, setT] = useState(tipo);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!t.codigo.trim() || !t.nombre.trim()) return alert("Codigo y nombre requeridos.");
    setBusy(true);
    try {
      const data = { ...t, empresa: empresaId };
      if (t.id) await api.actualizarTipoDocumento(t.id, data);
      else await api.crearTipoDocumento(data);
      onSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={t.id ? "Editar tipo de documento" : "Nuevo tipo de documento"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Codigo *</label>
          <input value={t.codigo} onChange={(e) => setT({ ...t, codigo: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Categoria *</label>
          <select value={t.categoria} onChange={(e) => setT({ ...t, categoria: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
            {["POLITICA", "MANUAL", "PROCEDIMIENTO", "INSTRUCTIVO", "FORMATO", "REGISTRO", "PLAN", "OTRO"].map((c) =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
        </div>
      </div>
      <label className="text-xs font-bold text-slate-300 block mt-3 mb-1">Nombre *</label>
      <input value={t.nombre} onChange={(e) => setT({ ...t, nombre: e.target.value })}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <label className="text-xs font-bold text-slate-300 block mt-3 mb-1">Descripcion</label>
      <textarea value={t.descripcion} onChange={(e) => setT({ ...t, descripcion: e.target.value })} rows={2}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <label className="text-xs font-bold text-slate-300 block mt-3 mb-1 flex items-center gap-2">
        <input type="checkbox" checked={t.activo} onChange={(e) => setT({ ...t, activo: e.target.checked })} />
        Activo
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-40">
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ── Flujos ───────────────────────────────────────────────────────────────────
function FlujosTab({ empresaId }: { empresaId: number }) {
  const { theme, isDarkMode } = useTheme();
  const [flujos, setFlujos] = useState<Flujo[]>([]);
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Flujo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getFlujosAprobacion({ empresa: String(empresaId), page_size: "100" });
      setFlujos(r.results || []);
    } finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    api.getTiposDocumento({ empresa: String(empresaId), page_size: "200" })
      .then((r) => setTipos(r.results || [])).catch(() => {});
    api.getUsuarios().then((r) => setUsers(r.results || [])).catch(() => {});
  }, [empresaId]);

  const eliminar = async (f: Flujo) => {
    if (!confirm(`Eliminar flujo ${f.nombre}?`)) return;
    try { await api.eliminarFlujoAprobacion(f.id); cargar(); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing({
          id: 0, empresa: empresaId, nombre: "", descripcion: "",
          tipo_documento: null, tipo_documento_codigo: "", tipo_documento_nombre: "",
          modo: "UNICO", min_aprobaciones: 1, activo: true, es_default: false,
          pasos: [], n_pasos: 0,
        })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuevo flujo
        </button>
      </div>

      {loading ? <div className={theme.textTertiary}>Cargando…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flujos.length === 0 && (
            <div className={`col-span-2 text-center py-10 rounded-2xl border-2 border-dashed ${theme.textTertiary} ${
              isDarkMode ? "border-white/[0.06]" : "border-slate-200"
            }`}>
              Aun no hay flujos. Crea uno para definir quien aprueba cada tipo.
            </div>
          )}
          {flujos.map((f) => (
            <div key={f.id} className={`rounded-2xl border p-4 ${
              isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Workflow className="w-4 h-4 text-blue-400" />
                    <span className={`font-black ${theme.textPrimary}`}>{f.nombre}</span>
                    {f.es_default && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">default</span>
                    )}
                  </div>
                  <div className={`text-xs ${theme.textSecondary}`}>
                    {f.tipo_documento ? `${f.tipo_documento_codigo} · ${f.tipo_documento_nombre}` : "Sin tipo asignado"}
                  </div>
                  <div className={`text-xs ${theme.textTertiary} mt-1`}>
                    {f.modo} · {f.n_pasos} aprobador{f.n_pasos === 1 ? "" : "es"}
                    {f.modo === "PARALELO" && ` · min ${f.min_aprobaciones} firmas`}
                  </div>
                  {f.pasos.length > 0 && (
                    <ol className="mt-2 space-y-0.5">
                      {f.pasos.map((p) => (
                        <li key={p.id} className={`text-xs ${theme.textSecondary}`}>
                          #{p.orden} {p.aprobador_nombre || p.aprobador_username}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(f)} className="text-xs text-blue-400 hover:underline">editar</button>
                  <button onClick={() => eliminar(f)} className="text-xs text-rose-400 hover:underline">eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <FlujoModal flujo={editing} empresaId={empresaId} tipos={tipos} users={users}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); cargar(); }} />
      )}
    </div>
  );
}

function FlujoModal({ flujo, empresaId, tipos, users, onClose, onSaved }: {
  flujo: Flujo; empresaId: number; tipos: TipoDoc[]; users: UserItem[];
  onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState(flujo);
  const [pasos, setPasos] = useState<Paso[]>(flujo.pasos || []);
  const [busy, setBusy] = useState(false);

  const addPaso = () => setPasos([...pasos, { aprobador: 0, orden: pasos.length + 1, obligatorio: true }]);
  const updPaso = (i: number, p: Partial<Paso>) => {
    const next = [...pasos];
    next[i] = { ...next[i], ...p };
    setPasos(next);
  };
  const delPaso = (i: number) => setPasos(pasos.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!f.nombre.trim()) return alert("Falta nombre.");
    if (pasos.length === 0 || pasos.some((p) => !p.aprobador)) return alert("Agrega aprobadores validos.");
    setBusy(true);
    try {
      const data = { ...f, empresa: empresaId };
      let saved: Flujo;
      if (f.id) {
        saved = await api.actualizarFlujoAprobacion(f.id, data);
      } else {
        saved = await api.crearFlujoAprobacion(data);
      }
      await api.setPasosFlujo(saved.id, pasos.map((p, i) => ({
        aprobador: p.aprobador, orden: i + 1,
        obligatorio: p.obligatorio, descripcion: p.descripcion,
      })));
      onSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={f.id ? "Editar flujo" : "Nuevo flujo de aprobacion"} onClose={onClose}>
      <label className="text-xs font-bold text-slate-300 block mb-1">Nombre *</label>
      <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
      <label className="text-xs font-bold text-slate-300 block mt-3 mb-1">Tipo de documento</label>
      <select value={f.tipo_documento ?? ""} onChange={(e) => setF({ ...f, tipo_documento: e.target.value ? Number(e.target.value) : null })}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
        <option value="">— Generico (cualquiera) —</option>
        {tipos.map((t) => <option key={t.id} value={t.id}>{t.codigo} {t.nombre}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Modo *</label>
          <select value={f.modo} onChange={(e) => setF({ ...f, modo: e.target.value as Flujo["modo"] })}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
            <option value="UNICO">Un solo aprobador</option>
            <option value="PARALELO">Paralelo (varios a la vez)</option>
            <option value="SECUENCIAL">Secuencial (orden estricto)</option>
          </select>
        </div>
        {f.modo === "PARALELO" && (
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Min. aprobaciones</label>
            <input type="number" min={1} value={f.min_aprobaciones}
              onChange={(e) => setF({ ...f, min_aprobaciones: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
          Activo
        </label>
        <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <input type="checkbox" checked={f.es_default} onChange={(e) => setF({ ...f, es_default: e.target.checked })} />
          Default para este tipo
        </label>
      </div>

      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Aprobadores</h4>
          <button onClick={addPaso} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        {pasos.length === 0 && (
          <p className="text-xs text-slate-500 italic">Sin aprobadores. Agrega al menos uno.</p>
        )}
        <ol className="space-y-2">
          {pasos.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold">{i + 1}</span>
              <select value={p.aprobador} onChange={(e) => updPaso(i, { aprobador: Number(e.target.value) })}
                className="flex-1 px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm text-white">
                <option value={0}>— Selecciona —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}{u.first_name ? ` (${u.first_name} ${u.last_name})` : ""}
                  </option>
                ))}
              </select>
              <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                <input type="checkbox" checked={p.obligatorio} onChange={(e) => updPaso(i, { obligatorio: e.target.checked })} />
                obligatorio
              </label>
              <button onClick={() => delPaso(i)} className="text-rose-400 hover:bg-rose-500/10 rounded p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
        <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-40">
          Guardar
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 max-h-[92vh] overflow-auto">
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
