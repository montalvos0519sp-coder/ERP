"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  Layers, MapPin, Package, Pencil, Plus, RotateCcw, Search, Trash2, Warehouse, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useOnClickOutside } from "@/lib/hooks";
import { useTheme } from "@/lib/ThemeContext";

interface Almacen {
  id: number;
  codigo: string;
  nombre: string;
  sucursal?: number | null;
  sucursal_nombre?: string;
  direccion?: string;
  activo: boolean;
}

interface Existencia {
  id: number; almacen: number; producto: number;
  producto_nombre?: string; producto_sku?: string; unidad_medida?: string;
  cantidad: number | string; disponible: number | string;
}

interface Zona { id: number; almacen: number; codigo: string; nombre: string; }
interface Rack { id: number; zona: number; codigo: string; nombre: string; }
interface Nivel { id: number; rack: number; codigo: string; nombre: string; }
interface Ubicacion { id: number; nivel: number; codigo: string; nombre: string; }

type NuevoTipo = "almacen" | "zona" | "rack" | "nivel" | "ubicacion";

export default function AlmacenesPage() {
  const { theme, isDarkMode } = useTheme();

  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [fSucursal, setFSucursal] = useState("");
  // Selecciones por nivel (filtros faceta de los chips).
  const [selA, setSelA] = useState<Set<number>>(new Set());
  const [selZ, setSelZ] = useState<Set<number>>(new Set());
  const [selR, setSelR] = useState<Set<number>>(new Set());
  const [selN, setSelN] = useState<Set<number>>(new Set());
  const [selU, setSelU] = useState<Set<number>>(new Set());
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [expA, setExpA] = useState<Set<number>>(new Set());
  const [expZ, setExpZ] = useState<Set<number>>(new Set());
  const [expR, setExpR] = useState<Set<number>>(new Set());
  const [expN, setExpN] = useState<Set<number>>(new Set());

  const [nuevoTipo, setNuevoTipo] = useState<NuevoTipo | null>(null);
  const [nuevoParent, setNuevoParent] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ tipo: NuevoTipo; id: number; codigo: string; nombre: string } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, z, r, n, u, e] = await Promise.all([
        api.getAlmacenes({ page_size: "200" }).catch(() => ({ results: [] })),
        api.getZonasAlmacen().catch(() => ({ results: [] })),
        api.getRacksAlmacen().catch(() => ({ results: [] })),
        api.getNivelesAlmacen().catch(() => ({ results: [] })),
        api.getUbicacionesAlmacen().catch(() => ({ results: [] })),
        api.getExistenciasAlmacen({ page_size: "1000" }).catch(() => ({ results: [] })),
      ]);
      setAlmacenes(a.results || []);
      setZonas(z.results || []);
      setRacks(r.results || []);
      setNiveles(n.results || []);
      setUbicaciones(u.results || []);
      setExistencias((e.results || []) as Existencia[]);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // ── Filtrado de la jerarquía ──────────────────────────────────────────
  // Combina: búsqueda de texto + selecciones por nivel (chips) + estado +
  // sucursal. Un nodo se muestra si pasa su propio filtro y conserva al menos
  // un descendiente visible cuando hay filtros en niveles más profundos.
  const ql = q.trim().toLowerCase();
  const filtrando = ql.length > 0;
  const has = (s?: string) => !!s && s.toLowerCase().includes(ql);

  const okU = (u: Ubicacion): boolean =>
    (!selU.size || selU.has(u.id)) && (!filtrando || has(u.codigo) || has(u.nombre));
  const okN = (nv: Nivel): boolean => {
    if (selN.size && !selN.has(nv.id)) return false;
    const vis = ubicaciones.filter((u) => u.nivel === nv.id && okU(u));
    if (selU.size) return vis.length > 0;
    if (filtrando) return has(nv.codigo) || has(nv.nombre) || vis.length > 0;
    return true;
  };
  const okR = (r: Rack): boolean => {
    if (selR.size && !selR.has(r.id)) return false;
    const vis = niveles.filter((nv) => nv.rack === r.id && okN(nv));
    if (selN.size || selU.size) return vis.length > 0;
    if (filtrando) return has(r.codigo) || has(r.nombre) || vis.length > 0;
    return true;
  };
  const okZ = (z: Zona): boolean => {
    if (selZ.size && !selZ.has(z.id)) return false;
    const vis = racks.filter((r) => r.zona === z.id && okR(r));
    if (selR.size || selN.size || selU.size) return vis.length > 0;
    if (filtrando) return has(z.codigo) || has(z.nombre) || vis.length > 0;
    return true;
  };
  const okA = (a: Almacen): boolean => {
    if (selA.size && !selA.has(a.id)) return false;
    if (fEstado === "activo" && !a.activo) return false;
    if (fEstado === "inactivo" && a.activo) return false;
    if (fSucursal && (a.sucursal_nombre || "") !== fSucursal) return false;
    const vis = zonas.filter((z) => z.almacen === a.id && okZ(z));
    if (selZ.size || selR.size || selN.size || selU.size) return vis.length > 0;
    if (filtrando) return has(a.codigo) || has(a.nombre) || has(a.sucursal_nombre) || vis.length > 0;
    return true;
  };

  // Productos agregados por almacén (suma cantidades de todas sus existencias).
  const productosPorAlmacen = useMemo(() => {
    const m = new Map<number, { producto: number; nombre: string; sku: string; unidad: string; cantidad: number; disponible: number }[]>();
    const agg = new Map<string, { producto: number; nombre: string; sku: string; unidad: string; cantidad: number; disponible: number }>();
    for (const e of existencias) {
      const k = `${e.almacen}|${e.producto}`;
      const cur = agg.get(k) || {
        producto: e.producto, nombre: e.producto_nombre || `#${e.producto}`,
        sku: e.producto_sku || "", unidad: e.unidad_medida || "", cantidad: 0, disponible: 0,
      };
      cur.cantidad += Number(e.cantidad || 0);
      cur.disponible += Number(e.disponible || 0);
      agg.set(k, cur);
      if (!m.has(e.almacen)) m.set(e.almacen, []);
    }
    for (const [k, v] of agg) {
      const almId = Number(k.split("|")[0]);
      m.get(almId)!.push(v);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.cantidad - a.cantidad);
    return m;
  }, [existencias]);

  // Sucursales disponibles (derivadas de los almacenes cargados).
  const sucursales = useMemo(
    () => Array.from(new Set(almacenes.map((a) => a.sucursal_nombre).filter(Boolean))) as string[],
    [almacenes],
  );

  // ¿Conviene auto-expandir? Solo cuando hay texto o selección en sub-niveles.
  const autoExp = filtrando || !!(selZ.size || selR.size || selN.size || selU.size);
  const hayFiltros = filtrando || fEstado !== "todos" || !!fSucursal ||
    !!(selA.size || selZ.size || selR.size || selN.size || selU.size);

  const visibles = almacenes.filter(okA);

  const limpiarFiltros = () => {
    setQ(""); setFEstado("todos"); setFSucursal("");
    setSelA(new Set()); setSelZ(new Set()); setSelR(new Set()); setSelN(new Set()); setSelU(new Set());
  };
  const expandirTodo = () => {
    setExpA(new Set(almacenes.map((a) => a.id)));
    setExpZ(new Set(zonas.map((z) => z.id)));
    setExpR(new Set(racks.map((r) => r.id)));
    setExpN(new Set(niveles.map((nv) => nv.id)));
  };
  const colapsarTodo = () => {
    setExpA(new Set()); setExpZ(new Set()); setExpR(new Set()); setExpN(new Set());
  };

  const LABELS: Record<NuevoTipo, string> = {
    almacen: "almacén", zona: "zona", rack: "rack", nivel: "nivel", ubicacion: "ubicación",
  };
  const abrirEditar = (tipo: NuevoTipo, item: { id: number; codigo: string; nombre: string }) =>
    setEditData({ tipo, id: item.id, codigo: item.codigo, nombre: item.nombre });
  const eliminarItem = async (tipo: NuevoTipo, item: { id: number; nombre: string }) => {
    if (!confirm(`¿Eliminar ${LABELS[tipo]} "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
    const fn = {
      almacen: api.eliminarAlmacenAlmacen, zona: api.eliminarZonaAlmacen,
      rack: api.eliminarRackAlmacen, nivel: api.eliminarNivelAlmacen,
      ubicacion: api.eliminarUbicacionAlmacen,
    }[tipo];
    try { await fn(item.id); cargar(); }
    catch (e) { alert((e as Error).message); }
  };

  const ctrl = isDarkMode
    ? "bg-[#0F172A]/70 border-white/[0.08] text-slate-100 focus:border-violet-500/40"
    : "bg-white border-slate-200 text-slate-800 focus:border-violet-400/60";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Almacenes</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Estructura de zonas, racks, niveles y ubicaciones.</p>
          </div>
        </div>
        <button onClick={() => { setNuevoTipo("almacen"); setNuevoParent(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
          <Plus className="w-4 h-4" /> Nuevo almacen
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={`rounded-2xl border p-3 ${isDarkMode ? "bg-[#0F172A]/40 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
        <div className="flex flex-col lg:flex-row gap-2.5">
          {/* Buscar */}
          <div className="relative flex-1 min-w-0">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar almacén, zona, rack, nivel o ubicación…"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-colors ${isDarkMode ? "placeholder:text-slate-500" : "placeholder:text-slate-400"} ${ctrl}`}
            />
            {q && (
              <button onClick={() => setQ("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md ${theme.textTertiary} hover:text-rose-400`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Estado + sucursal */}
          <div className="flex gap-2.5">
            <select value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)}
              className={`px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer transition-colors ${ctrl}`}>
              <option value="todos">Todos los estados</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>
            {sucursales.length > 0 && (
              <select value={fSucursal} onChange={(e) => setFSucursal(e.target.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer transition-colors ${ctrl}`}>
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-1.5">
            <button onClick={expandirTodo} title="Expandir todo"
              className={`inline-flex items-center justify-center w-10 h-[42px] rounded-xl border transition-colors ${ctrl} hover:border-violet-400/50`}>
              <ChevronsUpDown className="w-4 h-4" />
            </button>
            <button onClick={colapsarTodo} title="Colapsar todo"
              className={`inline-flex items-center justify-center w-10 h-[42px] rounded-xl border transition-colors ${ctrl} hover:border-violet-400/50`}>
              <ChevronsDownUp className="w-4 h-4" />
            </button>
            {hayFiltros && (
              <button onClick={limpiarFiltros} title="Limpiar filtros"
                className="inline-flex items-center gap-1.5 px-3 h-[42px] rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors">
                <RotateCcw className="w-4 h-4" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Chips-filtro: click abre popover con checklist para filtrar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <ChipFilter isDark={isDarkMode} color="violet"  label="Almacenes"  items={almacenes}   selected={selA} onChange={setSelA} />
          <ChipFilter isDark={isDarkMode} color="indigo"  label="Zonas"       items={zonas}       selected={selZ} onChange={setSelZ} />
          <ChipFilter isDark={isDarkMode} color="emerald" label="Racks"       items={racks}       selected={selR} onChange={setSelR} />
          <ChipFilter isDark={isDarkMode} color="sky"     label="Niveles"     items={niveles}     selected={selN} onChange={setSelN} />
          <ChipFilter isDark={isDarkMode} color="amber"   label="Ubicaciones" items={ubicaciones} selected={selU} onChange={setSelU} />
        </div>
      </div>

      {loading ? (
        <div className={`text-center py-20 ${theme.textTertiary}`}>Cargando…</div>
      ) : visibles.length === 0 ? (
        <div className={`text-center py-20 px-6 rounded-3xl border-2 border-dashed ${
          isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/40"
        }`}>
          <Warehouse className={`w-14 h-14 mx-auto mb-3 ${theme.textTertiary}`} />
          <h3 className={`font-black text-lg ${theme.textPrimary}`}>
            {filtrando ? "Sin coincidencias" : "Sin almacenes"}
          </h3>
          <p className={`text-sm ${theme.textSecondary}`}>
            {filtrando ? `Nada coincide con "${q}".` : "Crea tu primer almacen para empezar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((a) => {
            const zs = zonas.filter((z) => z.almacen === a.id && okZ(z));
            const prods = productosPorAlmacen.get(a.id) || [];
            const open = autoExp ? zs.length > 0 : expA.has(a.id);
            return (
              <div key={a.id} className={`rounded-2xl border ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"}`}>
                <div className="flex items-center justify-between p-4">
                  <button onClick={() => toggle(setExpA, a.id)} className="flex items-center gap-3 flex-1 text-left">
                    {open ? <ChevronDown className={`w-4 h-4 ${theme.textSecondary}`} /> : <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />}
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-300 flex items-center justify-center">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`text-base font-black ${theme.textPrimary}`}>{a.nombre}</div>
                      <div className={`text-xs ${theme.textTertiary} flex items-center gap-2`}>
                        <span className="font-mono">{a.codigo}</span>
                        {a.sucursal_nombre && <span><Building2 className="w-3 h-3 inline mr-1" />{a.sucursal_nombre}</span>}
                        <span>· {zs.length} zonas</span>
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                          <Package className="w-3 h-3" />{prods.length} productos
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditDel onEdit={() => abrirEditar("almacen", a)} onDelete={() => eliminarItem("almacen", a)} />
                    <button onClick={() => { setNuevoTipo("zona"); setNuevoParent(a.id); }}
                      className="text-xs font-bold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25">
                      <Plus className="w-3 h-3" /> Zona
                    </button>
                  </div>
                </div>
                {open && (
                  <div className={`px-4 pb-3 space-y-1.5 border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                    {/* Productos / existencias del almacén */}
                    <div className="pt-3">
                      <div className={`text-[11px] font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${theme.textSecondary}`}>
                        <Package className="w-3.5 h-3.5 text-emerald-500" /> Productos en existencia ({prods.length})
                      </div>
                      {prods.length === 0 ? (
                        <div className={`text-xs ${theme.textTertiary}`}>
                          Sin existencias. Aparecen al aprobar movimientos de entrada.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {prods.map((p) => (
                            <div key={p.producto}
                              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                              <div className="min-w-0">
                                <div className={`text-xs font-bold truncate ${theme.textPrimary}`}>{p.nombre}</div>
                                {p.sku && <div className={`text-[10px] font-mono ${theme.textTertiary}`}>{p.sku}</div>}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black font-mono text-emerald-500 tabular-nums">
                                  {p.cantidad.toLocaleString("es-MX")} {p.unidad}
                                </div>
                                {p.disponible !== p.cantidad && (
                                  <div className={`text-[10px] ${theme.textTertiary}`}>{p.disponible.toLocaleString("es-MX")} disp.</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Estructura física */}
                    <div className={`text-[11px] font-black uppercase tracking-wider pt-2 flex items-center gap-1.5 ${theme.textSecondary}`}>
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Ubicaciones
                    </div>
                    {zs.length === 0 ? (
                      <div className={`pt-1 text-sm ${theme.textTertiary}`}>Sin zonas. Agrega la primera.</div>
                    ) : zs.map((z) => {
                      const rs = racks.filter((r) => r.zona === z.id && okR(r));
                      const oZ = autoExp ? rs.length > 0 : expZ.has(z.id);
                      return (
                        <div key={z.id} className="ml-6 mt-2">
                          <div className="flex items-center justify-between">
                            <button onClick={() => toggle(setExpZ, z.id)} className="flex items-center gap-2 flex-1 text-left">
                              {oZ ? <ChevronDown className={`w-3.5 h-3.5 ${theme.textTertiary}`} /> : <ChevronRight className={`w-3.5 h-3.5 ${theme.textTertiary}`} />}
                              <MapPin className="w-4 h-4 text-indigo-400" />
                              <span className={`text-sm font-bold ${theme.textPrimary}`}>{z.nombre}</span>
                              <span className={`text-xs font-mono ${theme.textTertiary}`}>· {z.codigo} · {rs.length} racks</span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <EditDel onEdit={() => abrirEditar("zona", z)} onDelete={() => eliminarItem("zona", z)} />
                              <button onClick={() => { setNuevoTipo("rack"); setNuevoParent(z.id); }}
                                className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25">
                                <Plus className="w-3 h-3" /> Rack
                              </button>
                            </div>
                          </div>
                          {oZ && (
                            <div className="ml-6 mt-1.5 space-y-1">
                              {rs.length === 0 ? (
                                <div className={`text-xs ${theme.textTertiary}`}>Sin racks.</div>
                              ) : rs.map((r) => {
                                const ns = niveles.filter((nv) => nv.rack === r.id && okN(nv));
                                const oR = autoExp ? ns.length > 0 : expR.has(r.id);
                                return (
                                  <div key={r.id}>
                                    <div className="flex items-center justify-between">
                                      <button onClick={() => toggle(setExpR, r.id)} className="flex items-center gap-2 flex-1 text-left">
                                        {oR ? <ChevronDown className={`w-3 h-3 ${theme.textTertiary}`} /> : <ChevronRight className={`w-3 h-3 ${theme.textTertiary}`} />}
                                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className={`text-sm ${theme.textPrimary}`}>{r.nombre}</span>
                                        <span className={`text-xs font-mono ${theme.textTertiary}`}>· {r.codigo} · {ns.length} niveles</span>
                                      </button>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <EditDel onEdit={() => abrirEditar("rack", r)} onDelete={() => eliminarItem("rack", r)} />
                                        <button onClick={() => { setNuevoTipo("nivel"); setNuevoParent(r.id); }}
                                          className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25">
                                          <Plus className="w-3 h-3" /> Nivel
                                        </button>
                                      </div>
                                    </div>
                                    {oR && (
                                      <div className="ml-6 mt-1 space-y-0.5">
                                        {ns.length === 0 ? (
                                          <div className={`text-xs ${theme.textTertiary}`}>Sin niveles.</div>
                                        ) : ns.map((nv) => {
                                          const ubs = ubicaciones.filter((u) => u.nivel === nv.id && okU(u));
                                          const oN = autoExp ? ubs.length > 0 : expN.has(nv.id);
                                          return (
                                            <div key={nv.id}>
                                              <div className="flex items-center justify-between">
                                                <button onClick={() => toggle(setExpN, nv.id)} className="flex items-center gap-2 flex-1 text-left">
                                                  {oN ? <ChevronDown className={`w-3 h-3 ${theme.textTertiary}`} /> : <ChevronRight className={`w-3 h-3 ${theme.textTertiary}`} />}
                                                  <span className={`text-xs font-bold ${theme.textSecondary}`}>{nv.nombre}</span>
                                                  <span className={`text-[11px] font-mono ${theme.textTertiary}`}>· {nv.codigo} · {ubs.length} ubic.</span>
                                                </button>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <EditDel tiny onEdit={() => abrirEditar("nivel", nv)} onDelete={() => eliminarItem("nivel", nv)} />
                                                  <button onClick={() => { setNuevoTipo("ubicacion"); setNuevoParent(nv.id); }}
                                                    className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25">
                                                    <Plus className="w-2.5 h-2.5" /> Ubicacion
                                                  </button>
                                                </div>
                                              </div>
                                              {oN && (
                                                <div className="ml-6 mt-0.5 flex flex-wrap gap-1.5 py-1">
                                                  {ubs.length === 0 ? (
                                                    <div className={`text-[11px] ${theme.textTertiary}`}>Sin ubicaciones.</div>
                                                  ) : ubs.map((u) => (
                                                    <span key={u.id} title={u.nombre}
                                                      className={`group/ub inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md ${isDarkMode ? "bg-white/[0.05] text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                                      {u.codigo}
                                                      <button onClick={() => abrirEditar("ubicacion", u)} title="Editar"
                                                        className="opacity-0 group-hover/ub:opacity-100 text-slate-400 hover:text-violet-400 transition-opacity">
                                                        <Pencil className="w-2.5 h-2.5" />
                                                      </button>
                                                      <button onClick={() => eliminarItem("ubicacion", u)} title="Eliminar"
                                                        className="opacity-0 group-hover/ub:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity">
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nuevoTipo && (
        <NuevoNivelModal tipo={nuevoTipo} parentId={nuevoParent}
          onClose={() => { setNuevoTipo(null); setNuevoParent(null); }}
          onCreated={() => { setNuevoTipo(null); setNuevoParent(null); cargar(); }} />
      )}
      {editData && (
        <NuevoNivelModal tipo={editData.tipo} parentId={null}
          editId={editData.id} initCodigo={editData.codigo} initNombre={editData.nombre}
          onClose={() => setEditData(null)}
          onCreated={() => { setEditData(null); cargar(); }} />
      )}
    </div>
  );
}

function EditDel({ onEdit, onDelete, tiny }: {
  onEdit: () => void; onDelete: () => void; tiny?: boolean;
}) {
  const ic = tiny ? "w-3 h-3" : "w-3.5 h-3.5";
  const pad = tiny ? "p-0.5" : "p-1";
  return (
    <>
      <button onClick={onEdit} title="Editar"
        className={`${pad} rounded-md text-slate-400 hover:text-violet-400 hover:bg-violet-500/15 transition-colors`}>
        <Pencil className={ic} />
      </button>
      <button onClick={onDelete} title="Eliminar"
        className={`${pad} rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors`}>
        <Trash2 className={ic} />
      </button>
    </>
  );
}

const CHIP_COLORS: Record<string, string> = {
  violet:  "bg-violet-500/12 text-violet-500 border-violet-500/20",
  indigo:  "bg-indigo-500/12 text-indigo-500 border-indigo-500/20",
  emerald: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  sky:     "bg-sky-500/12 text-sky-600 border-sky-500/20",
  amber:   "bg-amber-500/12 text-amber-600 border-amber-500/20",
};
const CHIP_ACTIVE: Record<string, string> = {
  violet:  "ring-2 ring-violet-500/40",
  indigo:  "ring-2 ring-indigo-500/40",
  emerald: "ring-2 ring-emerald-500/40",
  sky:     "ring-2 ring-sky-500/40",
  amber:   "ring-2 ring-amber-500/40",
};

interface FiltroItem { id: number; codigo: string; nombre: string; }

// Chip clickeable: abre un popover con checklist para filtrar por ese nivel.
function ChipFilter({ isDark, color, label, items, selected, onChange }: {
  isDark: boolean; color: keyof typeof CHIP_COLORS; label: string;
  items: FiltroItem[]; selected: Set<number>; onChange: (s: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const ql = s.trim().toLowerCase();
  const filtered = items.filter(
    (it) => !ql || (it.codigo || "").toLowerCase().includes(ql) || (it.nombre || "").toLowerCase().includes(ql),
  );
  const active = selected.size > 0;

  const toggle = (id: number) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    onChange(n);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all hover:brightness-110 ${CHIP_COLORS[color]} ${active ? CHIP_ACTIVE[color] : ""}`}>
        <span className="tabular-nums">{active ? `${selected.size} sel.` : items.length}</span>
        <span className="opacity-70 font-semibold">{label}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute z-50 mt-1.5 left-0 w-64 rounded-xl border shadow-xl overflow-hidden ${
          isDark ? "bg-[#0F172A] border-white/[0.08]" : "bg-white border-slate-200"
        }`}>
          <div className={`p-2 border-b ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <input autoFocus value={s} onChange={(e) => setS(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}…`}
                className={`w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs outline-none ${
                  isDark ? "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
                }`} />
            </div>
          </div>
          <ul className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className={`px-3 py-2 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin elementos.</li>
            ) : filtered.map((it) => {
              const on = selected.has(it.id);
              return (
                <li key={it.id}>
                  <button onClick={() => toggle(it.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50"
                    }`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      on ? `${CHIP_COLORS[color]} border-transparent` : isDark ? "border-white/20" : "border-slate-300"
                    }`}>
                      {on && <Check className="w-3 h-3" />}
                    </span>
                    <span className={`font-mono shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{it.codigo}</span>
                    <span className={`truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>{it.nombre}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {active && (
            <div className={`p-2 border-t ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
              <button onClick={() => onChange(new Set())}
                className={`w-full text-xs font-bold py-1.5 rounded-lg ${isDark ? "text-rose-400 hover:bg-white/[0.04]" : "text-rose-500 hover:bg-rose-50"}`}>
                Quitar selección ({selected.size})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NuevoNivelModal({ tipo, parentId, editId, initCodigo, initNombre, onClose, onCreated }: {
  tipo: NuevoTipo; parentId: number | null;
  editId?: number; initCodigo?: string; initNombre?: string;
  onClose: () => void; onCreated: () => void;
}) {
  const editando = editId != null;
  const [codigo, setCodigo] = useState(initCodigo ?? "");
  const [nombre, setNombre] = useState(initNombre ?? "");
  const [busy, setBusy] = useState(false);

  const sustantivo: Record<NuevoTipo, string> = {
    almacen: "almacén", zona: "zona", rack: "rack", nivel: "nivel", ubicacion: "ubicación",
  };
  const titulo = `${editando ? "Editar" : "Nuevo"} ${sustantivo[tipo]}`;
  const parentField: Record<NuevoTipo, string | null> = {
    almacen: null, zona: "almacen", rack: "zona", nivel: "rack", ubicacion: "nivel",
  };

  const submit = async () => {
    if (!codigo.trim() || !nombre.trim()) { alert("Completa codigo y nombre."); return; }
    setBusy(true);
    try {
      const payload: any = { codigo: codigo.trim(), nombre: nombre.trim() };
      if (editando) {
        const fn = {
          almacen: api.actualizarAlmacenAlmacen,
          zona: api.actualizarZonaAlmacen,
          rack: api.actualizarRackAlmacen,
          nivel: api.actualizarNivelAlmacen,
          ubicacion: api.actualizarUbicacionAlmacen,
        }[tipo];
        await fn(editId!, payload);
      } else {
        payload.activo = true;
        const pField = parentField[tipo];
        if (pField && parentId) payload[pField] = parentId;
        const fn = {
          almacen: api.crearAlmacenAlmacen,
          zona: api.crearZonaAlmacen,
          rack: api.crearRackAlmacen,
          nivel: api.crearNivelAlmacen,
          ubicacion: api.crearUbicacionAlmacen,
        }[tipo];
        await fn(payload);
      }
      onCreated();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/[0.06] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">{titulo}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 mb-1 block">Codigo *</label>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 mb-1 block">Nombre *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            {busy ? "Guardando…" : editando ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
