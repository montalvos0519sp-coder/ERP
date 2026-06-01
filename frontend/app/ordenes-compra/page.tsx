"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle, FileSpreadsheet, FileText, Package, Plus, RefreshCw,
  Search, ShoppingCart, Snowflake, Trash2, Truck, X, XCircle,
} from "lucide-react";

import Tabs from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const TABS = [
  { id: "todos", label: "Todas" },
  { id: "BORRADOR", label: "Borrador" },
  { id: "APROBADA", label: "Aprobadas" },
  { id: "PARCIAL", label: "Recepcion parcial" },
  { id: "CERRADA", label: "Cerradas" },
];

export default function OrdenesCompraPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getOrdenesCompra({ empresa: String(empresaActivaId) })
      .then((r) => setOrdenes(r.results || []))
      .catch(() => setOrdenes([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empresaActivaId]);

  const filtered = useMemo(() => {
    let res = ordenes;
    if (filter !== "todos") res = res.filter((o) => o.estado === filter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((o) => (o.folio || "").toLowerCase().includes(q) || (o.proveedor_nombre || "").toLowerCase().includes(q));
    }
    return res;
  }, [ordenes, filter, search]);

  const totales = useMemo(() => ({
    pendiente: ordenes.filter((o) => o.estado === "BORRADOR" || o.estado === "APROBADA").reduce((s, o) => s + Number(o.total || 0), 0),
    recibidas: ordenes.filter((o) => o.estado === "CERRADA").reduce((s, o) => s + Number(o.total || 0), 0),
    canceladas: ordenes.filter((o) => o.estado === "CANCELADA").length,
  }), [ordenes]);

  const estadoBadge = (estado: string) => {
    const map: Record<string, { label: string; color: string }> = {
      BORRADOR: { label: "Borrador", color: "#94A3B8" },
      APROBADA: { label: "Aprobada", color: "#3B82F6" },
      PARCIAL: { label: "Recepcion parcial", color: "#F59E0B" },
      CERRADA: { label: "Cerrada", color: "#10B981" },
      CANCELADA: { label: "Cancelada", color: "#EF4444" },
    };
    const e = map[estado] || map.BORRADOR;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
        style={{ color: e.color, background: e.color + "15", borderColor: e.color + "40" }}>
        {e.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative rounded-3xl border overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg,rgba(139,92,246,0.12),rgba(99,102,241,0.08))"
            : "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.05))",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Ordenes de Compra</h1>
              <p className={`text-sm ${theme.textSecondary}`}>Crea, aprueba y recibe OC. Integrado con Almacen y CXP.</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KPI label="Total OC" value={ordenes.length.toString()} color="#8B5CF6" />
            <KPI label="Pendiente $" value={`$${totales.pendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} color="#F59E0B" />
            <KPI label="Recibido $" value={`$${totales.recibidas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} color="#10B981" />
            <KPI label="Canceladas" value={totales.canceladas.toString()} color="#EF4444" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.divider} ${theme.surfaceElevated}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio o proveedor..."
            className="bg-transparent outline-none text-sm w-64" />
        </div>
        <div className="flex-1" />
        <button onClick={load} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${theme.surfaceElevated} hover:scale-105 transition-all`}>
          <RefreshCw className="w-4 h-4" /> Refrescar
        </button>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
          <Plus className="w-4 h-4" /> Nueva orden
        </button>
      </div>

      <Tabs tabs={TABS} activeTab={filter} onChange={setFilter} theme={theme} />

      <div className={`rounded-3xl border ${theme.divider}`}
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
        {loading ? (
          <div className={`p-16 text-center ${theme.textTertiary}`}>Cargando ordenes...</div>
        ) : filtered.length === 0 ? (
          <EmptyState theme={theme} isDark={isDark}
            icon={<ShoppingCart className="w-12 h-12" />}
            title="Sin ordenes de compra"
            subtitle="Crea tu primera OC para empezar a registrar compras."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`text-left text-[10px] uppercase tracking-[0.2em] font-black ${theme.textTertiary} border-b ${theme.divider}`}>
                <tr>
                  <th className="px-6 py-3">Folio</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Proveedor</th>
                  <th className="px-6 py-3">Asignado a</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                  <th className="px-6 py-3 text-right">IVA</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={`border-b ${theme.divider}`}>
                    <td className={`px-6 py-3 font-mono font-bold ${theme.textPrimary}`}>{o.folio}</td>
                    <td className={`px-6 py-3 ${theme.textSecondary} text-xs`}>{new Date(o.fecha).toLocaleDateString("es-MX")}</td>
                    <td className={`px-6 py-3 ${theme.textPrimary}`}>{o.proveedor_nombre || "-"}</td>
                    <td className="px-6 py-3">
                      {o.unidad_numero ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Truck className="w-3.5 h-3.5" />{o.unidad_numero}</span>
                      ) : o.termo_numero ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600"><Snowflake className="w-3.5 h-3.5" />{o.termo_numero}</span>
                      ) : o.es_insumo ? (
                        <span className={`text-xs ${theme.textSecondary}`}>Insumo general</span>
                      ) : <span className={`text-xs ${theme.textTertiary}`}>—</span>}
                      {o.tipo_mantenimiento_display && (
                        <span className={`block text-[10px] ${theme.textTertiary}`}>{o.tipo_mantenimiento_display}</span>
                      )}
                    </td>
                    <td className={`px-6 py-3 text-right font-mono ${theme.textPrimary}`}>${Number(o.subtotal).toFixed(2)}</td>
                    <td className={`px-6 py-3 text-right font-mono ${theme.textSecondary}`}>${Number(o.iva).toFixed(2)}</td>
                    <td className={`px-6 py-3 text-right font-mono font-bold ${theme.textPrimary}`}>${Number(o.total).toFixed(2)}</td>
                    <td className="px-6 py-3">{estadoBadge(o.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flujo OC */}
      <div className={`rounded-3xl border p-6 ${theme.divider}`}
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
        <h3 className={`font-black text-sm uppercase tracking-widest mb-4 ${theme.textPrimary}`}>Flujo de Orden de Compra</h3>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Borrador", icon: FileText, color: "#94A3B8" },
            { label: "Aprobacion", icon: CheckCircle, color: "#3B82F6" },
            { label: "Recepcion", icon: Package, color: "#F59E0B" },
            { label: "Almacen", icon: Truck, color: "#10B981" },
            { label: "CXP", icon: FileSpreadsheet, color: "#8B5CF6" },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: step.color + "12", borderColor: step.color + "40", color: step.color }}>
                <step.icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{step.label}</span>
              </div>
              {i < arr.length - 1 && <span className={`text-xs ${theme.textTertiary}`}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {showNew && (
        <NuevaOrdenModal isDark={isDark} theme={theme} empresaId={empresaActivaId}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}

interface Linea { producto: number | ""; descripcion: string; cantidad: string; precio: string; }

function NuevaOrdenModal({ isDark, theme, empresaId, onClose, onCreated }: {
  isDark: boolean; theme: any; empresaId: number | null; onClose: () => void; onCreated: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [termos, setTermos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [proveedor, setProveedor] = useState<number | "">("");
  const [folio, setFolio] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [asignacion, setAsignacion] = useState<"insumo" | "unidad" | "thermo">("insumo");
  const [unidad, setUnidad] = useState<number | "">("");
  const [termo, setTermo] = useState<number | "">("");
  const [tipoMtto, setTipoMtto] = useState("CORRECTIVO");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ producto: "", descripcion: "", cantidad: "1", precio: "0" }]);
  const [busy, setBusy] = useState(false);

  const recargarProveedores = () =>
    api.getProveedores().then((r) => setProveedores(r.results || [])).catch(() => {});

  useEffect(() => {
    recargarProveedores();
    api.getUnidades({ page_size: "300" }).then((r: any) => setUnidades(r.results || [])).catch(() => {});
    api.getTermos({ page_size: "300" }).then((r: any) => setTermos(r.results || [])).catch(() => {});
    api.getProductos({ page_size: "300", activo: "true" }).then((r: any) => setProductos(r.results || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLinea = () => setLineas((p) => [...p, { producto: "", descripcion: "", cantidad: "1", precio: "0" }]);
  const setLinea = (i: number, l: Partial<Linea>) => setLineas((p) => p.map((x, k) => k === i ? { ...x, ...l } : x));
  const delLinea = (i: number) => setLineas((p) => p.filter((_, k) => k !== i));

  const subtotal = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio) || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${
    isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"
  }`;

  const guardar = async () => {
    if (!proveedor) { alert("Selecciona un proveedor."); return; }
    if (!folio.trim()) { alert("Captura el folio."); return; }
    if (asignacion === "unidad" && !unidad) { alert("Selecciona la unidad."); return; }
    if (asignacion === "thermo" && !termo) { alert("Selecciona el thermo."); return; }
    const validas = lineas.filter((l) => l.producto && Number(l.cantidad) > 0);
    if (validas.length === 0) { alert("Agrega al menos una partida con producto y cantidad."); return; }
    setBusy(true);
    try {
      await api.crearOrdenCompra({
        empresa: empresaId,
        proveedor,
        folio: folio.trim(),
        fecha,
        fecha_entrega: fechaEntrega || null,
        subtotal: subtotal.toFixed(2),
        iva: iva.toFixed(2),
        total: total.toFixed(2),
        estado: "BORRADOR",
        notas,
        es_insumo: asignacion === "insumo",
        unidad: asignacion === "unidad" ? unidad : null,
        termo: asignacion === "thermo" ? termo : null,
        tipo_mantenimiento: asignacion === "insumo" ? null : (asignacion === "thermo" ? "THERMO" : tipoMtto),
        partidas: validas.map((l) => {
          const cant = parseFloat(l.cantidad) || 0;
          const precio = parseFloat(l.precio) || 0;
          return {
            producto: l.producto,
            descripcion: l.descripcion || (productos.find((p) => p.id === l.producto)?.nombre ?? ""),
            cantidad: cant, precio_unitario: precio, importe: (cant * precio).toFixed(2),
          };
        }),
      });
      onCreated();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-3xl border p-6 space-y-3 max-h-[90vh] overflow-auto ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>Nueva orden de compra</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
            <X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-bold ${theme.textSecondary}`}>Proveedor *</label>
              <div className="flex items-center gap-2">
                <a href="/cxp/proveedores" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300">
                  <Plus className="w-3 h-3" /> Nuevo proveedor
                </a>
                <button type="button" onClick={recargarProveedores} title="Recargar lista"
                  className={`${theme.textTertiary} hover:text-violet-400`}>
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <select value={proveedor} onChange={(e) => setProveedor(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">— Selecciona —</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social || p.nombre_comercial}</option>)}
            </select>
            {proveedores.length === 0 && (
              <p className="text-[11px] text-amber-500 mt-1">No hay proveedores. Crea uno con “Nuevo proveedor” y recarga.</p>
            )}
          </div>
          <Campo label="Folio *" theme={theme}><input value={folio} onChange={(e) => setFolio(e.target.value)} className={`${inputCls} font-mono`} /></Campo>
          <Campo label="Fecha *" theme={theme}><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Fecha de entrega" theme={theme}><input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className={inputCls} /></Campo>
        </div>

        {/* Asignación a flota */}
        <div className={`rounded-xl border p-3 ${isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
          <div className={`text-xs font-bold mb-2 ${theme.textSecondary}`}>¿Para qué es esta compra?</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {([["insumo", "Insumo general", Package], ["unidad", "Unidad (motor)", Truck], ["thermo", "Thermo", Snowflake]] as const).map(([val, lbl, Ic]) => (
              <button key={val} type="button" onClick={() => setAsignacion(val)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  asignacion === val ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-transparent"
                  : isDark ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
                <Ic className="w-3.5 h-3.5" /> {lbl}
              </button>
            ))}
          </div>
          {asignacion === "unidad" && (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Unidad *" theme={theme}>
                <select value={unidad} onChange={(e) => setUnidad(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
                  <option value="">— Selecciona —</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.numero}{u.placas ? ` · ${u.placas}` : ""}</option>)}
                </select>
              </Campo>
              <Campo label="Tipo de mantenimiento" theme={theme}>
                <select value={tipoMtto} onChange={(e) => setTipoMtto(e.target.value)} className={inputCls}>
                  <option value="CORRECTIVO">Correctivo</option>
                  <option value="PREVENTIVO">Preventivo (Motor)</option>
                </select>
              </Campo>
            </div>
          )}
          {asignacion === "thermo" && (
            <Campo label="Thermo *" theme={theme}>
              <select value={termo} onChange={(e) => setTermo(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
                <option value="">— Selecciona —</option>
                {termos.map((t) => <option key={t.id} value={t.id}>{t.numero}{t.marca ? ` · ${t.marca}` : ""}</option>)}
              </select>
            </Campo>
          )}
        </div>

        {/* Partidas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-bold ${theme.textSecondary}`}>Partidas</label>
            <button onClick={addLinea} className="inline-flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300">
              <Plus className="w-3 h-3" /> Agregar partida
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-auto pr-1">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select value={l.producto} onChange={(e) => setLinea(i, { producto: e.target.value ? Number(e.target.value) : "" })}
                    className={`${inputCls} text-xs py-1.5`}>
                    <option value="">— producto —</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{(p.codigo_interno || p.codigo)} · {p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} placeholder="descripción"
                    className={`${inputCls} text-xs py-1.5`} />
                </div>
                <div className="col-span-2">
                  <input type="number" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} placeholder="cant"
                    className={`${inputCls} text-xs py-1.5 text-right`} />
                </div>
                <div className="col-span-1">
                  <input type="number" value={l.precio} onChange={(e) => setLinea(i, { precio: e.target.value })} placeholder="$"
                    className={`${inputCls} text-xs py-1.5 text-right`} />
                </div>
                <div className="col-span-1 text-center">
                  <button onClick={() => delLinea(i)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Campo label="Notas" theme={theme}>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputCls} />
        </Campo>

        {/* Totales */}
        <div className={`flex justify-end gap-6 text-sm ${theme.textPrimary} pt-1`}>
          <span>Subtotal: <b className="font-mono">${subtotal.toFixed(2)}</b></span>
          <span>IVA 16%: <b className="font-mono">${iva.toFixed(2)}</b></span>
          <span>Total: <b className="font-mono text-violet-400">${total.toFixed(2)}</b></span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            {busy ? "Guardando…" : "Crear orden"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, theme, children }: { label: string; theme: any; children: React.ReactNode }) {
  return (
    <div>
      <label className={`text-xs font-bold mb-1 block ${theme.textSecondary}`}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ label, value, color }: any) {
  const { theme, isDarkMode: isDark } = useTheme();
  return (
    <div className="w-32 h-20 rounded-2xl border flex flex-col items-center justify-center px-2"
      style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", borderColor: color + "30" }}>
      <p className="text-lg font-black truncate w-full text-center" style={{ color }}>{value}</p>
      <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>{label}</p>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, theme }: any) {
  return (
    <div className="p-16 text-center">
      <div className={`mx-auto mb-3 ${theme.textTertiary}`}>{icon}</div>
      <p className={`text-sm font-bold ${theme.textPrimary}`}>{title}</p>
      <p className={`text-xs mt-1 ${theme.textTertiary}`}>{subtitle}</p>
    </div>
  );
}
