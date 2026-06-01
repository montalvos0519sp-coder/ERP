"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Barcode, Box, Boxes, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, DollarSign, Download, Edit3, ImagePlus, Layers,
  Package, PackageCheck, Printer, QrCode, Save, Tag, Trash2, Warehouse, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

// Lee una imagen, la redimensiona (máx 600px) y devuelve un data URL JPEG ligero.
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

const PAGE_SIZE = 25;
const MXN = (v: number | string | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

export default function ProductoDetallePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();

  const [producto, setProducto] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const elegirFoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Selecciona un archivo de imagen."); return; }
    try {
      const url = await fileToDataUrl(file);
      setEdit((prev: any) => ({ ...prev, fotos: [url] }));
    } catch { alert("No se pudo procesar la imagen."); }
  };

  const [existencias, setExistencias] = useState<any[]>([]);
  const [kardex, setKardex] = useState<any[]>([]);
  const [kardexCount, setKardexCount] = useState(0);
  const [kardexPage, setKardexPage] = useState(1);
  const [lotes, setLotes] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const p = await api.getProductoAlmacen(id);
      setProducto(p);
      setEdit(p);
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const cargarRelacionados = useCallback(async () => {
    if (!id) return;
    try {
      const [ex, kx, lt, sr] = await Promise.all([
        api.getProductoExistencias(id).catch(() => ({ results: [] })),
        api.getProductoKardex(id, { page: String(kardexPage), page_size: String(PAGE_SIZE) })
          .catch(() => ({ results: [], count: 0 })),
        producto?.controla_lotes
          ? api.getProductoLotes(id).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        producto?.serializado
          ? api.getProductoSeries(id).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
      ]);
      setExistencias((ex as any).results || (Array.isArray(ex) ? ex : []));
      setKardex(((kx as any).results) || []);
      setKardexCount((kx as any).count || 0);
      setLotes(((lt as any).results) || []);
      setSeries(((sr as any).results) || []);
    } catch (e) {
      console.error(e);
    }
  }, [id, kardexPage, producto?.controla_lotes, producto?.serializado]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (producto) cargarRelacionados(); }, [producto, cargarRelacionados]);

  const guardar = async () => {
    if (!id || !edit) return;
    setBusy(true);
    try {
      const r = await api.actualizarProductoAlmacen(id, {
        codigo_interno: edit.codigo_interno ?? edit.codigo,
        sku: edit.sku,
        codigo_barras: edit.codigo_barras || "",
        tipo_codigo_barras: edit.tipo_codigo_barras || "QR",
        nombre: edit.nombre,
        descripcion: edit.descripcion,
        costo_promedio: parseFloat(edit.costo_promedio) || 0,
        precio_venta: parseFloat(edit.precio_venta) || 0,
        inventario_min: parseFloat(edit.inventario_min ?? edit.stock_minimo) || 0,
        inventario_max: parseFloat(edit.inventario_max ?? edit.stock_maximo) || 0,
        fotos: Array.isArray(edit.fotos) ? edit.fotos : (edit.fotos ? [edit.fotos] : []),
        activo: !!edit.activo,
      });
      setProducto(r);
      setEdit(r);
      setEditing(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!producto) {
    return <div className={`p-10 text-center ${theme.textTertiary}`}>Cargando…</div>;
  }

  const totalKxPages = Math.max(1, Math.ceil(kardexCount / PAGE_SIZE));

  // ── Métricas para los KPIs ───────────────────────────────────────────
  const existTotal = existencias.reduce((s, e) => s + Number(e.total ?? e.cantidad ?? 0), 0);
  const dispTotal = existencias.reduce((s, e) => s + Number(e.disponible ?? e.cantidad_disponible ?? 0), 0);
  const numAlmacenes = new Set(existencias.map((e) => e.almacen_nombre ?? e.almacen)).size;
  const valorInv = Number(producto.valor_inventario ?? 0) ||
    existencias.reduce((s, e) => s + Number(e.total ?? e.cantidad ?? 0) * Number(e.costo_promedio ?? producto.costo_promedio ?? 0), 0);
  const stockMin = Number(producto.inventario_min ?? producto.stock_minimo ?? 0);
  const bajoMinimo = stockMin > 0 && existTotal < stockMin;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/almacen/productos")}
            className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>{producto.nombre}</h1>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                producto.activo ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border-slate-500/30"
              }`}>
                {producto.activo ? "Activo" : "Inactivo"}
              </span>
              {bajoMinimo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-500 border-rose-500/30">
                  <AlertTriangle className="w-3 h-3" /> Bajo mínimo
                </span>
              )}
            </div>
            <p className={`text-xs font-mono ${theme.textTertiary}`}>{producto.codigo_interno || producto.codigo} · SKU {producto.sku}</p>
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEdit(producto); setEditing(false); }}
              className={`px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
              <Save className="w-4 h-4" /> {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            <Edit3 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat isDark={isDarkMode} accent="indigo"  icon={Boxes}       label="Existencia total" value={existTotal.toLocaleString("es-MX")} sub={producto.unidad_medida_codigo || ""} />
        <Stat isDark={isDarkMode} accent="emerald" icon={DollarSign}  label="Valor inventario" value={MXN(valorInv)} sub="costo promedio" />
        <Stat isDark={isDarkMode} accent="sky"     icon={Warehouse}   label="Almacenes"        value={String(numAlmacenes)} sub={`${dispTotal.toLocaleString("es-MX")} disponibles`} />
        <Stat isDark={isDarkMode} accent={bajoMinimo ? "rose" : "teal"} icon={bajoMinimo ? AlertTriangle : PackageCheck}
          label="Stock mínimo" value={stockMin.toLocaleString("es-MX")} sub={bajoMinimo ? "¡por debajo!" : "en nivel óptimo"} />
      </div>

      {/* Datos */}
      <Card isDark={isDarkMode}>
        <SectionTitle theme={theme} accent="indigo" icon={Tag} title="Datos del producto" />

        {/* Foto del producto */}
        <div className="flex items-center gap-4 mt-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => elegirFoto(e.target.files?.[0])} />
          <div className={`relative w-24 h-24 rounded-2xl overflow-hidden border flex items-center justify-center shrink-0 ${
            isDarkMode ? "bg-[#1E293B]/40 border-white/[0.08]" : "bg-slate-50 border-slate-200"
          }`}>
            {(editing ? edit?.fotos?.[0] : producto.fotos?.[0]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editing ? edit.fotos[0] : producto.fotos[0]} alt={producto.nombre} className="w-full h-full object-cover" />
            ) : (
              <Package className={`w-9 h-9 ${theme.textTertiary}`} />
            )}
          </div>
          {editing ? (
            <div className="text-xs">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                <ImagePlus className="w-3.5 h-3.5" /> {edit?.fotos?.[0] ? "Cambiar foto" : "Subir foto"}
              </button>
              {edit?.fotos?.[0] && (
                <button type="button" onClick={() => setEdit({ ...edit, fotos: [] })}
                  className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-rose-400 hover:bg-rose-500/10">
                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                </button>
              )}
              <p className={`mt-1.5 ${theme.textTertiary}`}>JPG/PNG. Se optimiza automáticamente.</p>
            </div>
          ) : (
            <p className={`text-xs ${theme.textTertiary}`}>
              {producto.fotos?.[0] ? "Foto del producto." : "Sin foto. Edita el producto para subir una."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <FieldView theme={theme} label="Codigo" editing={editing} value={edit?.codigo_interno ?? edit?.codigo}
            onChange={(v) => setEdit({ ...edit, codigo_interno: v })} mono />
          <FieldView theme={theme} label="SKU" editing={editing} value={edit?.sku}
            onChange={(v) => setEdit({ ...edit, sku: v })} mono />
          <FieldView theme={theme} label="Codigo de barras" editing={editing} value={edit?.codigo_barras || ""}
            onChange={(v) => setEdit({ ...edit, codigo_barras: v })} mono />
          <FieldView theme={theme} label="Categoria" value={producto.categoria_nombre || "—"} />
          <FieldView theme={theme} label="Marca" value={producto.marca_nombre || "—"} />
          <FieldView theme={theme} label="Unidad" value={producto.unidad_medida_codigo || "—"} />
          <FieldView theme={theme} label="Tipo" value={producto.tipo_display || producto.tipo || "—"} />
          <FieldView theme={theme} label="Estado" value={producto.activo ? "Activo" : "Inactivo"} />
          <FieldView theme={theme} label="Costo promedio" editing={editing} value={edit?.costo_promedio ?? "0"}
            onChange={(v) => setEdit({ ...edit, costo_promedio: v })} type="number" formatted={MXN} />
          <FieldView theme={theme} label="Precio venta" editing={editing} value={edit?.precio_venta ?? "0"}
            onChange={(v) => setEdit({ ...edit, precio_venta: v })} type="number" formatted={MXN} />
          <FieldView theme={theme} label="Stock minimo" editing={editing} value={edit?.inventario_min ?? edit?.stock_minimo ?? "0"}
            onChange={(v) => setEdit({ ...edit, inventario_min: v })} type="number" />
          <FieldView theme={theme} label="Stock maximo" editing={editing} value={edit?.inventario_max ?? edit?.stock_maximo ?? "0"}
            onChange={(v) => setEdit({ ...edit, inventario_max: v })} type="number" />
        </div>
        <div className="mt-4">
          <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Descripcion</label>
          {editing ? (
            <textarea value={edit?.descripcion || ""} onChange={(e) => setEdit({ ...edit, descripcion: e.target.value })} rows={3}
              className={`mt-1 w-full px-3 py-2 rounded-lg text-sm border ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
          ) : (
            <p className={`mt-1 text-sm ${theme.textSecondary}`}>{producto.descripcion || "—"}</p>
          )}
        </div>
      </Card>

      {/* Etiqueta / codigo de barras */}
      <BarcodePanel
        producto={producto}
        edit={edit}
        editing={editing}
        onChangeTipo={(v) => setEdit({ ...edit, tipo_codigo_barras: v })}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      {/* Existencias */}
      <Card isDark={isDarkMode}>
        <SectionTitle theme={theme} accent="emerald" icon={Warehouse} title={`Existencias por almacen (${existencias.length})`} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Almacen</Th><Th>Ubicacion</Th>
                <Th align="right">Disponible</Th>
                <Th align="right">Reservado</Th>
                <Th align="right">Total</Th>
                <Th align="right">Costo prom.</Th>
              </tr>
            </thead>
            <tbody>
              {existencias.length === 0 ? (
                <tr><td colSpan={6} className={`py-6 text-center ${theme.textTertiary}`}>Sin existencias.</td></tr>
              ) : existencias.map((e: any, i: number) => (
                <tr key={i} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-bold ${theme.textPrimary}`}>{e.almacen_nombre || e.almacen || "—"}</span></Td>
                  <Td><span className={`text-xs ${theme.textSecondary}`}>{e.ubicacion_nombre || "—"}</span></Td>
                  <Td align="right">{Number(e.disponible || e.cantidad_disponible || 0).toFixed(2)}</Td>
                  <Td align="right">{Number(e.reservado || e.cantidad_reservada || 0).toFixed(2)}</Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{Number(e.total || e.cantidad || 0).toFixed(2)}</span></Td>
                  <Td align="right">{MXN(e.costo_promedio)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Kardex */}
      <Card isDark={isDarkMode}>
        <SectionTitle theme={theme} accent="blue" icon={Box} title="Kardex" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Fecha</Th><Th>Tipo</Th><Th>Documento</Th>
                <Th align="right">Entrada</Th><Th align="right">Salida</Th>
                <Th align="right">Saldo</Th><Th align="right">Costo</Th>
              </tr>
            </thead>
            <tbody>
              {kardex.length === 0 ? (
                <tr><td colSpan={7} className={`py-6 text-center ${theme.textTertiary}`}>Sin movimientos.</td></tr>
              ) : kardex.map((k: any) => (
                <tr key={k.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className="text-xs">{k.fecha ? new Date(k.fecha).toLocaleString() : "—"}</span></Td>
                  <Td><span className="text-xs font-bold">{k.tipo_display || k.tipo}</span></Td>
                  <Td><span className="text-xs font-mono">{k.folio || k.documento || "—"}</span></Td>
                  <Td align="right" className="text-emerald-400">{Number(k.entrada || 0) ? Number(k.entrada).toFixed(2) : ""}</Td>
                  <Td align="right" className="text-rose-400">{Number(k.salida || 0) ? Number(k.salida).toFixed(2) : ""}</Td>
                  <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{Number(k.saldo || 0).toFixed(2)}</span></Td>
                  <Td align="right">{MXN(k.costo_unitario || k.costo)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {kardexCount > PAGE_SIZE && (
          <div className={`flex items-center justify-between pt-3 ${theme.textTertiary} text-xs`}>
            <span>Pagina {kardexPage} de {totalKxPages}</span>
            <div className="flex items-center gap-1">
              <button disabled={kardexPage <= 1} onClick={() => setKardexPage((p) => Math.max(1, p - 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={kardexPage >= totalKxPages} onClick={() => setKardexPage((p) => Math.min(totalKxPages, p + 1))}
                className={`p-1.5 rounded-lg disabled:opacity-30 ${isDarkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Lotes */}
      {producto.controla_lotes && (
        <Card isDark={isDarkMode}>
          <SectionTitle theme={theme} accent="amber" icon={Layers} title={`Lotes vigentes (${lotes.length})`} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
                <tr className="text-left">
                  <Th>Lote</Th><Th>Fecha fabricacion</Th><Th>Caducidad</Th>
                  <Th align="right">Cantidad</Th><Th>Almacen</Th>
                </tr>
              </thead>
              <tbody>
                {lotes.length === 0 ? (
                  <tr><td colSpan={5} className={`py-6 text-center ${theme.textTertiary}`}>Sin lotes vigentes.</td></tr>
                ) : lotes.map((l: any) => (
                  <tr key={l.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                    <Td><span className="font-mono text-xs font-bold">{l.numero_lote || l.codigo}</span></Td>
                    <Td><span className="text-xs"><Calendar className="w-3 h-3 inline mr-1" />{l.fecha_fabricacion || "—"}</span></Td>
                    <Td><span className="text-xs">{l.fecha_caducidad || "—"}</span></Td>
                    <Td align="right"><span className={`font-bold ${theme.textPrimary}`}>{Number(l.cantidad || 0).toFixed(2)}</span></Td>
                    <Td><span className="text-xs">{l.almacen_nombre || "—"}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Series */}
      {producto.serializado && (
        <Card isDark={isDarkMode}>
          <SectionTitle theme={theme} accent="cyan" icon={Barcode} title={`Series (${series.length})`} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
                <tr className="text-left">
                  <Th>Numero de serie</Th><Th>Estado</Th><Th>Almacen</Th><Th>Cliente</Th>
                </tr>
              </thead>
              <tbody>
                {series.length === 0 ? (
                  <tr><td colSpan={4} className={`py-6 text-center ${theme.textTertiary}`}>Sin series.</td></tr>
                ) : series.map((s: any) => (
                  <tr key={s.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                    <Td><span className="font-mono text-xs font-bold">{s.numero_serie}</span></Td>
                    <Td><span className="text-xs">{s.estado_display || s.estado || "—"}</span></Td>
                    <Td><span className="text-xs">{s.almacen_nombre || "—"}</span></Td>
                    <Td><span className="text-xs">{s.cliente_nombre || "—"}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border p-5 ${
      isDark ? "bg-[#0F172A]/70 border-white/[0.04]" : "bg-white border-slate-200/70"
    }`}>{children}</div>
  );
}
const ACCENTS: Record<string, { grad: string; soft: string }> = {
  indigo:  { grad: "from-indigo-500 to-violet-600",  soft: "bg-indigo-500/12 text-indigo-500" },
  emerald: { grad: "from-emerald-500 to-teal-600",   soft: "bg-emerald-500/12 text-emerald-500" },
  sky:     { grad: "from-sky-500 to-cyan-600",       soft: "bg-sky-500/12 text-sky-500" },
  blue:    { grad: "from-blue-500 to-indigo-600",    soft: "bg-blue-500/12 text-blue-500" },
  amber:   { grad: "from-amber-500 to-orange-600",   soft: "bg-amber-500/12 text-amber-600" },
  cyan:    { grad: "from-cyan-500 to-teal-600",       soft: "bg-cyan-500/12 text-cyan-600" },
  rose:    { grad: "from-rose-500 to-pink-600",      soft: "bg-rose-500/12 text-rose-500" },
  teal:    { grad: "from-teal-500 to-emerald-600",   soft: "bg-teal-500/12 text-teal-600" },
  violet:  { grad: "from-violet-500 to-purple-600",  soft: "bg-violet-500/12 text-violet-500" },
};

function Stat({ isDark, accent, icon: Icon, label, value, sub }: {
  isDark: boolean; accent: keyof typeof ACCENTS; icon: any; label: string; value: string; sub?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
      <div className={`absolute -right-7 -top-7 w-24 h-24 rounded-full bg-gradient-to-br ${a.grad} opacity-[0.16]`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-gradient-to-br ${a.grad} shadow-sm`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
      <div className={`text-[11px] uppercase tracking-wider font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className={`text-xl font-black mt-0.5 tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      {sub ? <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{sub}</div> : null}
    </div>
  );
}

function SectionTitle({ theme, icon: Icon, title, accent = "violet" }: { theme: any; icon: any; title: string; accent?: keyof typeof ACCENTS }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ACCENTS[accent].soft}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className={`text-sm font-black uppercase tracking-wider ${theme.textPrimary}`}>{title}</h2>
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align = "left", className = "" }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-3 py-2 ${align === "right" ? "text-right" : ""} ${className}`}>{children}</td>;
}
function FieldView({ theme, label, value, editing, onChange, type = "text", mono, formatted }: {
  theme: any; label: string; value: any; editing?: boolean; onChange?: (v: string) => void;
  type?: string; mono?: boolean; formatted?: (v: any) => string;
}) {
  return (
    <div>
      <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>{label}</label>
      {editing && onChange ? (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type}
          className={`mt-1 w-full px-3 py-1.5 rounded-lg text-sm border bg-slate-800 border-slate-700 text-white ${mono ? "font-mono" : ""}`} />
      ) : (
        <div className={`mt-1 text-sm font-bold ${theme.textPrimary} ${mono ? "font-mono" : ""}`}>
          {formatted ? formatted(value) : (value ?? "—")}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Barcode panel ────────────────────────────── */
function BarcodePanel({ producto, edit, editing, onChangeTipo, theme, isDarkMode }: {
  producto: any; edit: any; editing: boolean;
  onChangeTipo: (v: string) => void; theme: any; isDarkMode: boolean;
}) {
  // Cuando editas eliges simbologia distinta y se ve preview con la elegida.
  // Cuando no editas, se ve la simbologia guardada del producto.
  const tipo = editing
    ? (edit?.tipo_codigo_barras || producto.tipo_codigo_barras || "QR")
    : (producto.tipo_codigo_barras || "QR");
  const payload = (editing
    ? (edit?.codigo_barras || edit?.sku || edit?.codigo_interno || edit?.codigo)
    : (producto.codigo_barras || producto.sku || producto.codigo_interno || producto.codigo)) || "";

  // Cuando editamos en vivo usamos preview-url para reflejar cambios sin guardar.
  const isPreview = editing && (edit?.codigo_barras !== producto.codigo_barras
                                || edit?.tipo_codigo_barras !== producto.tipo_codigo_barras);
  const src = tipo === "NONE" || !payload
    ? ""
    : isPreview
      ? api.barcodePreviewUrl(tipo, payload, { escala: 2 })
      : api.barcodeProductoUrl(producto.id, { escala: 2 });
  const downloadSrc = tipo !== "NONE" && payload
    ? api.barcodeProductoUrl(producto.id, { escala: 3 })
    : "";

  const imprimir = () => {
    if (!src) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Etiqueta ${producto.sku}</title>
      <style>
        body{font-family:system-ui;margin:24px;text-align:center;color:#0F172A}
        .label{border:1px solid #cbd5e1;border-radius:12px;padding:18px;display:inline-block}
        .meta{font-size:11px;color:#64748b;margin-top:6px}
        h1{font-size:14px;margin:8px 0 4px}
        img{max-width:280px}
        @media print { body{margin:0} .noprint{display:none} }
      </style></head><body>
      <div class="label">
        <img src="${src}" alt="codigo" />
        <h1>${escapeHtml(producto.nombre)}</h1>
        <div class="meta">${escapeHtml(producto.codigo)} · SKU ${escapeHtml(producto.sku)}</div>
      </div>
      <div class="noprint" style="margin-top:16px"><button onclick="window.print()">Imprimir</button></div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className={`rounded-2xl border p-5 ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-4 h-4" style={{ color: "#8B5CF6" }} />
        <h3 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Etiqueta · codigo de barras / QR</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5 items-start">
        <div className="space-y-3">
          <div>
            <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Simbologia</label>
            {editing ? (
              <select value={tipo} onChange={(e) => onChangeTipo(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
                <option value="QR">QR Code (recomendado · acepta cualquier texto)</option>
                <option value="CODE128">Code 128 (alfanumerico · industria)</option>
                <option value="CODE39">Code 39 (alfanumerico · simple)</option>
                <option value="EAN13">EAN-13 (12 digitos · comercio retail)</option>
                <option value="EAN8">EAN-8 (7 digitos · empaque chico)</option>
                <option value="UPCA">UPC-A (11 digitos · USA)</option>
                <option value="ITF">Interleaved 2 of 5 (digitos pares)</option>
                <option value="NONE">Sin codigo</option>
              </select>
            ) : (
              <div className={`mt-1 text-sm font-bold ${theme.textPrimary}`}>{tipo}</div>
            )}
          </div>
          <div>
            <label className={`text-[11px] uppercase tracking-wider font-bold ${theme.textTertiary}`}>Contenido codificado</label>
            <div className={`mt-1 text-sm font-mono font-bold ${theme.textPrimary} break-all`}>
              {tipo === "NONE" ? "—" : (payload || "—")}
            </div>
            <p className={`mt-1 text-[11px] ${theme.textTertiary}`}>
              Toma <code className="font-mono">codigo_barras</code> si esta lleno, si no SKU, si no codigo interno.
              EAN/UPC exigen longitudes especificas — si no aplica usa QR o Code 128.
            </p>
          </div>
          {tipo !== "NONE" && payload && !editing && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={imprimir}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700">
                <Printer className="w-3.5 h-3.5" /> Imprimir etiqueta
              </button>
              <a href={downloadSrc} download={`etiqueta_${producto.sku || producto.id}.png`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDarkMode ? "border-white/[0.08] text-slate-200 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                <Download className="w-3.5 h-3.5" /> Descargar PNG
              </a>
            </div>
          )}
        </div>

        <div className="w-full h-56 rounded-xl bg-white border border-slate-300 flex items-center justify-center p-3">
          {tipo === "NONE" ? (
            <span className="text-xs text-slate-500 text-center">Sin codigo configurado</span>
          ) : src ? (
            <img src={src} alt="codigo del producto" className="max-h-full max-w-full object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; (e.currentTarget as HTMLImageElement).alt = "Error generando"; }} />
          ) : (
            <span className="text-xs text-slate-500 text-center">Configura SKU o codigo de barras</span>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]
  );
}
