"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, MoveHorizontal,
  Plus, Search, Trash2, X, XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Mov {
  id: number;
  folio?: string;
  tipo?: string;
  tipo_display?: string;
  subtipo?: string;
  estado?: string;
  almacen_origen?: number | null;
  almacen_origen_nombre?: string;
  almacen_destino?: number | null;
  almacen_destino_nombre?: string;
  fecha?: string;
  creado?: string;
  comentario?: string;
  total_lineas?: number;
  importe_total?: number | string;
}

interface Opt { id: number; nombre: string; codigo?: string }

const PAGE_SIZE = 25;
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-slate-500/20 text-slate-200 border-slate-500/30",
  APROBADO: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  CANCELADO: "bg-rose-500/20 text-rose-200 border-rose-500/30",
};
const TIPOS = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "AJUSTE", label: "Ajuste" },
];

const MXN = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

export default function MovimientosPage() {
  const { theme, isDarkMode } = useTheme();

  const [items, setItems] = useState<Mov[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [fTipo, setFTipo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fAlmacen, setFAlmacen] = useState<number | "">("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [q, setQ] = useState("");

  const [almacenes, setAlmacenes] = useState<Opt[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE), ordering: "-creado" };
      if (fTipo) params.tipo = fTipo;
      if (fEstado) params.estado = fEstado;
      if (fAlmacen) params.almacen = String(fAlmacen);
      if (fDesde) params.fecha_desde = fDesde;
      if (fHasta) params.fecha_hasta = fHasta;
      if (q.trim()) params.search = q.trim();
      const r = await api.getMovimientosAlmacen(params);
      setItems(r.results || []);
      setCount(r.count || (r.results || []).length);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [page, fTipo, fEstado, fAlmacen, fDesde, fHasta, q]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    api.getAlmacenes({ page_size: "200" }).then((r) => setAlmacenes(r.results || [])).catch(() => {});
    api.getProductos({ page_size: "500", activo: "true" }).then((r) => setProductos(r.results || [])).catch(() => {});
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  const aprobar = async (id: number) => {
    if (!confirm("Aprobar este movimiento?")) return;
    try { await api.aprobarMovimientoAlmacen(id); cargar(); } catch (e) { alert((e as Error).message); }
  };
  const cancelar = async (id: number) => {
    if (!confirm("Cancelar este movimiento?")) return;
    try { await api.cancelarMovimientoAlmacen(id); cargar(); } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            <MoveHorizontal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Movimientos de inventario</h1>
            <p className={`text-sm ${theme.textSecondary}`}>{count} movimientos registrados</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
          <Plus className="w-4 h-4" /> Nuevo movimiento
        </button>
      </div>

      {/* Filtros */}
      <div className={`flex flex-wrap gap-2 items-center p-3 rounded-2xl border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Folio, comentario…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none border ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`} />
        </div>
        <Select isDark={isDarkMode} value={fTipo} onChange={(v) => { setPage(1); setFTipo(v); }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select isDark={isDarkMode} value={fEstado} onChange={(v) => { setPage(1); setFEstado(v); }}>
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="APROBADO">Aprobado</option>
          <option value="CANCELADO">Cancelado</option>
        </Select>
        <Select isDark={isDarkMode} value={String(fAlmacen)} onChange={(v) => { setPage(1); setFAlmacen(v ? Number(v) : ""); }}>
          <option value="">Todos los almacenes</option>
          {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
        <input type="date" value={fDesde} onChange={(e) => { setPage(1); setFDesde(e.target.value); }}
          className={`px-3 py-2 rounded-lg text-sm border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
        <input type="date" value={fHasta} onChange={(e) => { setPage(1); setFHasta(e.target.value); }}
          className={`px-3 py-2 rounded-lg text-sm border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
      </div>

      {/* Tabla */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Folio</Th><Th>Fecha</Th><Th>Tipo</Th>
                <Th>Origen → Destino</Th><Th>Estado</Th>
                <Th align="right">Lineas</Th><Th align="right">Total</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Sin movimientos.</td></tr>
              ) : items.map((m) => (
                <tr key={m.id} className={`border-t ${isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"}`}>
                  <Td><span className="font-mono text-xs font-bold">{m.folio || `MOV-${m.id}`}</span></Td>
                  <Td><span className="text-xs">{m.fecha || m.creado ? new Date(m.fecha || m.creado || "").toLocaleDateString() : "—"}</span></Td>
                  <Td><span className="text-xs font-bold">{m.tipo_display || m.tipo}</span></Td>
                  <Td>
                    <span className={`text-xs ${theme.textSecondary}`}>
                      {m.almacen_origen_nombre || "—"} → {m.almacen_destino_nombre || "—"}
                    </span>
                  </Td>
                  <Td>
                    {m.estado && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${ESTADO_COLOR[m.estado] || ESTADO_COLOR.BORRADOR}`}>
                        {m.estado}
                      </span>
                    )}
                  </Td>
                  <Td align="right">{m.total_lineas ?? "—"}</Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{MXN(m.importe_total)}</span></Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-1">
                      <button title="Ver" onClick={() => window.open(api.getMovimientoImprimirUrl(m.id), "_blank")}
                        className={`p-1.5 rounded-lg ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                        <Eye className={`w-4 h-4 ${theme.textSecondary}`} />
                      </button>
                      {m.estado === "BORRADOR" && (
                        <>
                          <button title="Aprobar" onClick={() => aprobar(m.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button title="Cancelar" onClick={() => cancelar(m.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {m.estado === "APROBADO" && (
                        <button title="Cancelar" onClick={() => cancelar(m.id)}
                          className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
          <div className={`text-xs ${theme.textTertiary}`}>Pagina {page} de {totalPages} · {count} resultados</div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
              <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
              <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
          </div>
        </div>
      </div>

      {showNew && (
        <NuevoMovimientoModal almacenes={almacenes} productos={productos}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); cargar(); }} />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
function Select({ value, onChange, children, isDark }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 rounded-lg text-sm border outline-none ${
        isDark ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
      }`}>
      {children}
    </select>
  );
}

interface Linea { producto: number | ""; cantidad: string; costo_unitario: string; }

function NuevoMovimientoModal({ almacenes, productos, onClose, onCreated }: {
  almacenes: Opt[]; productos: any[]; onClose: () => void; onCreated: () => void;
}) {
  const [tipo, setTipo] = useState("ENTRADA");
  const [subtipo, setSubtipo] = useState("");
  const [almacenOrigen, setAlmacenOrigen] = useState<number | "">("");
  const [almacenDestino, setAlmacenDestino] = useState<number | "">("");
  const [ubicacionOrigen, setUbicacionOrigen] = useState<number | "">("");
  const [ubicacionDestino, setUbicacionDestino] = useState<number | "">("");
  const [ubicsOrigen, setUbicsOrigen] = useState<any[]>([]);
  const [ubicsDestino, setUbicsDestino] = useState<any[]>([]);
  const [comentario, setComentario] = useState("");

  // Al cambiar el almacén, carga sus ubicaciones para elegir el destino/origen exacto.
  useEffect(() => {
    setUbicacionOrigen("");
    if (!almacenOrigen) { setUbicsOrigen([]); return; }
    api.getUbicacionesAlmacen({ almacen: String(almacenOrigen), activa: "true", page_size: "500" })
      .then((r) => setUbicsOrigen(r.results || [])).catch(() => setUbicsOrigen([]));
  }, [almacenOrigen]);
  useEffect(() => {
    setUbicacionDestino("");
    if (!almacenDestino) { setUbicsDestino([]); return; }
    api.getUbicacionesAlmacen({ almacen: String(almacenDestino), activa: "true", page_size: "500" })
      .then((r) => setUbicsDestino(r.results || [])).catch(() => setUbicsDestino([]));
  }, [almacenDestino]);
  const [lineas, setLineas] = useState<Linea[]>([{ producto: "", cantidad: "1", costo_unitario: "0" }]);
  const [busy, setBusy] = useState(false);

  const addLinea = () => setLineas((p) => [...p, { producto: "", cantidad: "1", costo_unitario: "0" }]);
  const setLinea = (i: number, l: Partial<Linea>) =>
    setLineas((p) => p.map((x, k) => k === i ? { ...x, ...l } : x));
  const delLinea = (i: number) => setLineas((p) => p.filter((_, k) => k !== i));

  const submit = async () => {
    const validas = lineas.filter((l) => l.producto && Number(l.cantidad) > 0);
    if (validas.length === 0) { alert("Agrega al menos una linea."); return; }
    if (tipo === "ENTRADA" && !almacenDestino) { alert("Selecciona almacen destino."); return; }
    if (tipo === "SALIDA" && !almacenOrigen) { alert("Selecciona almacen origen."); return; }
    if (tipo === "TRANSFERENCIA" && (!almacenOrigen || !almacenDestino)) {
      alert("Selecciona origen y destino."); return;
    }
    setBusy(true);
    try {
      const payload: any = {
        tipo, subtipo: subtipo || tipo,
        comentario,
        detalles: validas.map((l) => ({
          producto: l.producto,
          cantidad: parseFloat(l.cantidad) || 0,
          costo_unitario: parseFloat(l.costo_unitario) || 0,
          ...(ubicacionOrigen ? { ubicacion_origen: ubicacionOrigen } : {}),
          ...(ubicacionDestino ? { ubicacion_destino: ubicacionDestino } : {}),
        })),
      };
      if (almacenOrigen) payload.almacen_origen = almacenOrigen;
      if (almacenDestino) payload.almacen_destino = almacenDestino;

      if (tipo === "ENTRADA") await api.crearMovimientoEntrada(payload);
      else if (tipo === "SALIDA") await api.crearMovimientoSalida(payload);
      else if (tipo === "AJUSTE") await api.crearMovimientoAjuste(payload);
      else await api.crearMovimientoAlmacen(payload);
      onCreated();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/[0.06] p-6 space-y-3 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Nuevo movimiento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Subtipo">
            <input value={subtipo} onChange={(e) => setSubtipo(e.target.value)}
              placeholder="COMPRA, VENTA, MERMA, etc."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </Field>
          {(tipo === "SALIDA" || tipo === "TRANSFERENCIA" || tipo === "AJUSTE") && (
            <Field label="Almacen origen *">
              <select value={almacenOrigen} onChange={(e) => setAlmacenOrigen(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                <option value="">—</option>
                {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          )}
          {(tipo === "ENTRADA" || tipo === "TRANSFERENCIA" || tipo === "AJUSTE") && (
            <Field label="Almacen destino *">
              <select value={almacenDestino} onChange={(e) => setAlmacenDestino(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                <option value="">—</option>
                {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          )}

          {/* Ubicación exacta de origen */}
          {(tipo === "SALIDA" || tipo === "TRANSFERENCIA" || tipo === "AJUSTE") && almacenOrigen !== "" && (
            <Field label="Ubicación origen (opcional)">
              {ubicsOrigen.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Este almacén no tiene ubicaciones registradas.</p>
              ) : (
                <select value={ubicacionOrigen} onChange={(e) => setUbicacionOrigen(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                  <option value="">— General del almacén —</option>
                  {ubicsOrigen.map((u) => <option key={u.id} value={u.id}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ""}</option>)}
                </select>
              )}
            </Field>
          )}

          {/* Ubicación exacta de destino */}
          {(tipo === "ENTRADA" || tipo === "TRANSFERENCIA" || tipo === "AJUSTE") && almacenDestino !== "" && (
            <Field label="Ubicación destino (opcional)">
              {ubicsDestino.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Este almacén no tiene ubicaciones registradas.</p>
              ) : (
                <select value={ubicacionDestino} onChange={(e) => setUbicacionDestino(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                  <option value="">— General del almacén —</option>
                  {ubicsDestino.map((u) => <option key={u.id} value={u.id}>{u.codigo}{u.nombre ? ` · ${u.nombre}` : ""}</option>)}
                </select>
              )}
            </Field>
          )}
        </div>

        <Field label="Comentario">
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">Lineas</label>
            <button onClick={addLinea}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200">
              <Plus className="w-3 h-3" /> Agregar linea
            </button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-auto pr-1">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <select value={l.producto} onChange={(e) => setLinea(i, { producto: e.target.value ? Number(e.target.value) : "" })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white">
                    <option value="">— producto —</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })}
                    placeholder="cant"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white text-right" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={l.costo_unitario} onChange={(e) => setLinea(i, { costo_unitario: e.target.value })}
                    placeholder="costo"
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white text-right" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => delLinea(i)} className="p-1 rounded-md hover:bg-rose-500/20 text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            {busy ? "Creando…" : "Crear movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-300 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
