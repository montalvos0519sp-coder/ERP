"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Filter, ImagePlus, Package, Plus, Search, Trash2, Warehouse, X,
} from "lucide-react";

// Lee un archivo de imagen, lo redimensiona (máx 600px) y devuelve un data URL
// JPEG ligero — se guarda en el campo `fotos` (JSON) del producto sin necesidad
// de un endpoint de subida dedicado.
function fileToDataUrl(file: File, max = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Producto {
  id: number;
  codigo: string;
  codigo_interno?: string;
  sku: string;
  codigo_barras?: string;
  nombre: string;
  descripcion?: string;
  categoria?: number | null;
  categoria_nombre?: string;
  marca?: number | null;
  marca_nombre?: string;
  unidad_medida?: number | null;
  unidad_medida_codigo?: string;
  tipo?: string;
  tipo_display?: string;
  costo_promedio?: number | string;
  precio_venta?: number | string;
  existencia_total?: number | string;
  valor_inventario?: number | string;
  activo: boolean;
  serializado?: boolean;
  controla_lotes?: boolean;
  fotos?: string[];
}

interface Opt { id: number; nombre: string; codigo?: string; }

const PAGE_SIZE = 25;
const MXN = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

export default function ProductosAlmacenPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [items, setItems] = useState<Producto[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [fCategoria, setFCategoria] = useState<number | "">("");
  const [fMarca, setFMarca] = useState<number | "">("");
  const [fTipo, setFTipo] = useState<string>("");
  const [fActivo, setFActivo] = useState<string>("true");

  const [categorias, setCategorias] = useState<Opt[]>([]);
  const [marcas, setMarcas] = useState<Opt[]>([]);
  const [unidades, setUnidades] = useState<Opt[]>([]);
  const [almacenesOpt, setAlmacenesOpt] = useState<Opt[]>([]);

  const [showNew, setShowNew] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(PAGE_SIZE),
      };
      if (q.trim()) params.search = q.trim();
      if (fCategoria) params.categoria = String(fCategoria);
      if (fMarca) params.marca = String(fMarca);
      if (fTipo) params.tipo = fTipo;
      if (fActivo !== "") params.activo = fActivo;
      const r = await api.getProductos(params);
      setItems(r.results || []);
      setCount(r.count || (r.results || []).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, q, fCategoria, fMarca, fTipo, fActivo]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    api.getCategoriasAlmacen().then((r) => setCategorias(r.results || [])).catch(() => {});
    api.getMarcasAlmacen().then((r) => setMarcas(r.results || [])).catch(() => {});
    api.getUnidadesMedidaAlmacen().then((r) => setUnidades(r.results || [])).catch(() => {});
    api.getAlmacenes({ page_size: "200", activo: "true" }).then((r) => setAlmacenesOpt(r.results || [])).catch(() => {});
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Catalogo de productos</h1>
            <p className={`text-sm ${theme.textSecondary}`}>{count} productos registrados</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:scale-[1.03]"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className={`flex flex-wrap gap-2 items-center p-3 rounded-2xl border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input
            value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Codigo, SKU, nombre o codigo de barras…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none border ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`} />
        </div>
        <Select value={String(fCategoria)} onChange={(v) => { setPage(1); setFCategoria(v ? Number(v) : ""); }} isDark={isDarkMode}>
          <option value="">Todas las categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
        <Select value={String(fMarca)} onChange={(v) => { setPage(1); setFMarca(v ? Number(v) : ""); }} isDark={isDarkMode}>
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </Select>
        <Select value={fTipo} onChange={(v) => { setPage(1); setFTipo(v); }} isDark={isDarkMode}>
          <option value="">Todos los tipos</option>
          <option value="PRODUCTO">Producto</option>
          <option value="SERVICIO">Servicio</option>
          <option value="KIT">Kit</option>
        </Select>
        <Select value={fActivo} onChange={(v) => { setPage(1); setFActivo(v); }} isDark={isDarkMode}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
      </div>

      {/* Tabla */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Codigo</Th>
                <Th>SKU</Th>
                <Th>Nombre</Th>
                <Th>Categoria</Th>
                <Th>Unidad</Th>
                <Th align="right">Existencia</Th>
                <Th align="right">Costo prom.</Th>
                <Th align="right">Valor</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Sin productos.</td></tr>
              ) : items.map((p) => (
                <tr key={p.id}
                  onClick={() => router.push(`/almacen/productos/${p.id}`)}
                  className={`border-t cursor-pointer transition-colors ${
                    isDarkMode ? "border-white/[0.04] hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"
                  } ${!p.activo ? "opacity-60" : ""}`}>
                  <Td><span className="font-mono text-xs">{p.codigo_interno || p.codigo}</span></Td>
                  <Td><span className="font-mono text-xs">{p.sku}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${
                        isDarkMode ? "bg-white/[0.05]" : "bg-slate-100"
                      }`}>
                        {p.fotos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.fotos[0]} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Package className={`w-4 h-4 ${theme.textTertiary}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold ${theme.textPrimary}`}>{p.nombre}</div>
                        {p.descripcion && <div className={`text-xs ${theme.textTertiary} line-clamp-1`}>{p.descripcion}</div>}
                      </div>
                    </div>
                  </Td>
                  <Td><span className={theme.textSecondary}>{p.categoria_nombre || "—"}</span></Td>
                  <Td><span className={`text-xs font-mono ${theme.textSecondary}`}>{p.unidad_medida_codigo || "—"}</span></Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{Number(p.existencia_total || 0).toFixed(2)}</span></Td>
                  <Td align="right"><span className={theme.textSecondary}>{MXN(p.costo_promedio)}</span></Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{MXN(p.valor_inventario)}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${
          isDarkMode ? "border-white/[0.04]" : "border-slate-100"
        }`}>
          <div className={`text-xs ${theme.textTertiary}`}>
            Pagina {page} de {totalPages} · {count} resultados
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-lg disabled:opacity-30 ${
                isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"
              }`}>
              <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-lg disabled:opacity-30 ${
                isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"
              }`}>
              <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
            </button>
          </div>
        </div>
      </div>

      {showNew && (
        <NuevoProductoModal
          categorias={categorias}
          marcas={marcas}
          unidades={unidades}
          almacenes={almacenesOpt}
          onGoAlmacenes={() => router.push("/almacen/almacenes")}
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/almacen/productos/${id}`)}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
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

function NuevoProductoModal({ categorias, marcas, unidades, almacenes, onGoAlmacenes, onClose, onCreated }: {
  categorias: Opt[]; marcas: Opt[]; unidades: Opt[]; almacenes: Opt[];
  onGoAlmacenes: () => void; onClose: () => void; onCreated: (id: number) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [sku, setSku] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [tipoCodigoBarras, setTipoCodigoBarras] = useState("QR");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("PRODUCTO_TERMINADO");
  const [categoria, setCategoria] = useState<number | "">("");
  const [marca, setMarca] = useState<number | "">("");
  const [unidadMedida, setUnidadMedida] = useState<number | "">("");
  const [costo, setCosto] = useState("0");
  const [precio, setPrecio] = useState("0");
  const [stockMin, setStockMin] = useState("0");
  const [stockMax, setStockMax] = useState("0");
  const [serializado, setSerializado] = useState(false);
  const [controlaLotes, setControlaLotes] = useState(false);
  // Existencia inicial opcional.
  const [almacenInicial, setAlmacenInicial] = useState<number | "">("");
  const [cantidadInicial, setCantidadInicial] = useState("0");
  // Foto del producto (data URL).
  const [foto, setFoto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const elegirFoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Selecciona un archivo de imagen."); return; }
    try { setFoto(await fileToDataUrl(file)); }
    catch { alert("No se pudo procesar la imagen."); }
  };

  // Preview live: lo que se va a codificar (codigo_barras > sku > codigo).
  const previewPayload = (codigoBarras.trim() || sku.trim() || codigo.trim());
  const previewSrc = previewPayload && tipoCodigoBarras !== "NONE"
    ? api.barcodePreviewUrl(tipoCodigoBarras, previewPayload, { escala: 1 })
    : "";

  const submit = async () => {
    if (!codigo.trim() || !nombre.trim()) {
      alert("Completa codigo y nombre.");
      return;
    }
    if (!unidadMedida) {
      alert("Selecciona una unidad de medida (requerida).");
      return;
    }
    setBusy(true);
    try {
      const r = await api.crearProductoAlmacen({
        codigo_interno: codigo.trim(),
        sku: sku.trim() || codigo.trim(),
        codigo_barras: codigoBarras.trim() || "",
        tipo_codigo_barras: tipoCodigoBarras,
        nombre: nombre.trim(),
        descripcion,
        tipo,
        categoria: categoria || null,
        marca: marca || null,
        unidad_medida: unidadMedida,
        costo_promedio: parseFloat(costo) || 0,
        precio_venta: parseFloat(precio) || 0,
        inventario_min: parseFloat(stockMin) || 0,
        inventario_max: parseFloat(stockMax) || 0,
        serializado,
        manejo_lote: controlaLotes,
        manejo_caducidad: controlaLotes,
        fotos: foto ? [foto] : [],
        activo: true,
      });
      // Existencia inicial: registra una entrada aprobada para dar de alta el stock.
      const cant = parseFloat(cantidadInicial) || 0;
      if (almacenInicial && cant > 0) {
        try {
          await api.crearMovimientoEntrada({
            tipo: "ENTRADA", subtipo: "ENTRADA",
            almacen_destino: almacenInicial,
            comentario: "Existencia inicial al crear el producto",
            aprobar: true,
            detalles: [{ producto: r.id, cantidad: cant, costo_unitario: parseFloat(costo) || 0 }],
          });
        } catch (e) {
          alert(`El producto se creó, pero no se pudo registrar la existencia inicial:\n${(e as Error).message}`);
        }
      }
      onCreated(r.id);
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/[0.06] p-6 space-y-3 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Nuevo producto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Foto del producto */}
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => elegirFoto(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-xl border border-dashed border-slate-600 bg-slate-800/50 flex items-center justify-center overflow-hidden hover:border-violet-500/60 shrink-0">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="w-6 h-6 text-slate-500" />
            )}
          </button>
          <div className="text-xs text-slate-400">
            <button type="button" onClick={() => fileRef.current?.click()} className="font-bold text-violet-300 hover:text-violet-200">
              {foto ? "Cambiar foto" : "Subir foto"}
            </button>
            {foto && (
              <button type="button" onClick={() => setFoto("")}
                className="ml-3 inline-flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3 h-3" /> Quitar
              </button>
            )}
            <p className="mt-1 text-slate-500">JPG/PNG. Se optimiza automáticamente.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Codigo *"><Input value={codigo} onChange={setCodigo} mono /></Field>
          <Field label="SKU"><Input value={sku} onChange={setSku} mono /></Field>
          <Field label="Codigo de barras (opcional)">
            <Input value={codigoBarras} onChange={setCodigoBarras} mono />
          </Field>
          <Field label="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              <option value="PRODUCTO_TERMINADO">Producto Terminado</option>
              <option value="MATERIA_PRIMA">Materia Prima</option>
              <option value="REFACCION">Refaccion</option>
              <option value="CONSUMIBLE">Consumible</option>
              <option value="SERVICIO">Servicio</option>
            </select>
          </Field>
        </div>

        {/* Simbologia + preview en vivo */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <Field label="Simbologia (etiqueta automatica)">
            <select value={tipoCodigoBarras} onChange={(e) => setTipoCodigoBarras(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              <option value="QR">QR Code (recomendado · acepta cualquier texto)</option>
              <option value="CODE128">Code 128 (alfanumerico · industria)</option>
              <option value="CODE39">Code 39 (alfanumerico · simple)</option>
              <option value="EAN13">EAN-13 (12 digitos · comercio retail)</option>
              <option value="EAN8">EAN-8 (7 digitos · empaque chico)</option>
              <option value="UPCA">UPC-A (11 digitos · USA)</option>
              <option value="ITF">Interleaved 2 of 5 (digitos · cajas)</option>
              <option value="NONE">Sin codigo</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Se genera automaticamente con <span className="font-mono text-slate-300">{previewPayload || "—"}</span>.
              EAN/UPC exigen longitudes especificas; si no aplica usa QR.
            </p>
          </Field>
          <div className="w-32 h-32 rounded-lg bg-white flex items-center justify-center p-1 border border-slate-700">
            {tipoCodigoBarras === "NONE" ? (
              <span className="text-[10px] text-slate-500 text-center">Sin codigo</span>
            ) : previewSrc ? (
              <img src={previewSrc} alt="Vista previa" className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
            ) : (
              <span className="text-[10px] text-slate-500 text-center">Llena codigo/SKU para preview</span>
            )}
          </div>
        </div>

        <Field label="Nombre *"><Input value={nombre} onChange={setNombre} /></Field>
        <Field label="Descripcion">
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Categoria">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              <option value="">—</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Marca">
            <select value={marca} onChange={(e) => setMarca(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              <option value="">—</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Field>
          <Field label="Unidad de medida">
            <select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              <option value="">—</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.codigo || u.nombre}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Costo promedio"><Input value={costo} onChange={setCosto} type="number" /></Field>
          <Field label="Precio venta"><Input value={precio} onChange={setPrecio} type="number" /></Field>
          <Field label="Stock minimo"><Input value={stockMin} onChange={setStockMin} type="number" /></Field>
          <Field label="Stock maximo"><Input value={stockMax} onChange={setStockMax} type="number" /></Field>
        </div>

        {/* Existencia inicial */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-xs font-bold text-slate-300 mb-2">Existencia inicial (opcional)</div>
          {almacenes.length === 0 ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-slate-400">
                No hay almacenes dados de alta. Crea uno para poder asignar cantidades.
              </p>
              <button type="button" onClick={onGoAlmacenes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                <Warehouse className="w-3.5 h-3.5" /> Crear almacén
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Almacén">
                <select value={almacenInicial} onChange={(e) => setAlmacenInicial(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                  <option value="">— Sin existencia inicial —</option>
                  {almacenes.map((a) => <option key={a.id} value={a.id}>{a.codigo ? `${a.codigo} · ` : ""}{a.nombre}</option>)}
                </select>
              </Field>
              <Field label="Cantidad inicial">
                <Input value={cantidadInicial} onChange={setCantidadInicial} type="number" />
              </Field>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={serializado} onChange={(e) => setSerializado(e.target.checked)} />
            Serializado
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={controlaLotes} onChange={(e) => setControlaLotes(e.target.checked)} />
            Controla lotes
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            {busy ? "Creando…" : "Crear producto"}
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
function Input({ value, onChange, type = "text", mono = false }: { value: string; onChange: (v: string) => void; type?: string; mono?: boolean }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} type={type}
      className={`w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white ${mono ? "font-mono" : ""}`} />
  );
}
