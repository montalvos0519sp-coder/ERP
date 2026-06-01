"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Plus, Printer, QrCode, Search, Trash2, X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface ProductoBasic {
  id: number;
  codigo: string;
  sku: string;
  codigo_barras?: string;
  nombre: string;
  tipo_codigo_barras?: string;
}

interface FilaEtiqueta {
  producto: ProductoBasic;
  copias: number;
  // Si se quiere override por fila.
  simbologia?: string;
}

// Tamanos en pulgadas.
const TAMANOS_PAPEL = [
  { id: "AVERY_5160", nombre: "Avery 5160 · 30 etiquetas (2.625\" × 1\")", cols: 3, w_mm: 66.7, h_mm: 25.4, gap_mm: 3.18 },
  { id: "AVERY_5163", nombre: "Avery 5163 · 10 etiquetas (4\" × 2\")",     cols: 2, w_mm: 101.6, h_mm: 50.8, gap_mm: 3.18 },
  { id: "TERMICA_4x6", nombre: "Termica 4\" × 6\" (Zebra)",                cols: 1, w_mm: 101.6, h_mm: 152.4, gap_mm: 0 },
  { id: "TERMICA_2x1", nombre: "Termica 2\" × 1\"",                         cols: 1, w_mm: 50.8, h_mm: 25.4, gap_mm: 0 },
  { id: "GRILLA_50mm", nombre: "Hoja A4 · grilla 50mm × 30mm",              cols: 4, w_mm: 50, h_mm: 30, gap_mm: 2 },
];

export default function EtiquetasPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [search, setSearch] = useState("");
  const [resultados, setResultados] = useState<ProductoBasic[]>([]);
  const [seleccion, setSeleccion] = useState<FilaEtiqueta[]>([]);
  const [tamanoId, setTamanoId] = useState(TAMANOS_PAPEL[0].id);
  const [defaultSimbologia, setDefaultSimbologia] = useState("");  // "" = usa la del producto
  const [escala, setEscala] = useState(2);
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(true);

  const tamano = TAMANOS_PAPEL.find((t) => t.id === tamanoId) || TAMANOS_PAPEL[0];

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setResultados([]); return; }
    setBusy(true);
    try {
      const r = await api.getProductosAlmacen({ search: q.trim(), page_size: "20" });
      setResultados(r.results || []);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(search), 350);
    return () => clearTimeout(t);
  }, [search, buscar]);

  const agregar = (p: ProductoBasic) => {
    setSeleccion((prev) => {
      if (prev.some((f) => f.producto.id === p.id)) return prev;
      return [...prev, { producto: p, copias: 1 }];
    });
  };

  const filas: { fila: FilaEtiqueta; idx: number }[] = useMemo(() => {
    // Expande cada producto * copias en filas individuales.
    const out: { fila: FilaEtiqueta; idx: number }[] = [];
    let i = 0;
    for (const f of seleccion) {
      for (let c = 0; c < Math.max(1, f.copias); c++) {
        out.push({ fila: f, idx: i++ });
      }
    }
    return out;
  }, [seleccion]);

  const imprimir = () => {
    if (filas.length === 0) return;
    const w = window.open("", "_blank", "width=1024,height=720");
    if (!w) return;

    const labelHtml = filas.map(({ fila }) => {
      const simb = (defaultSimbologia || fila.simbologia
                    || fila.producto.tipo_codigo_barras || "QR").toUpperCase();
      if (simb === "NONE") return "";
      const src = api.barcodeProductoUrl(fila.producto.id, {
        simbologia: simb, escala,
      });
      const nombre = escapeHtml(fila.producto.nombre);
      const meta = escapeHtml(`${fila.producto.codigo} · SKU ${fila.producto.sku}`);
      return `<div class="label">
        <img src="${src}" />
        <div class="nombre">${nombre}</div>
        <div class="meta">${meta}</div>
      </div>`;
    }).join("");

    w.document.write(`<!doctype html><html><head><title>Etiquetas</title>
      <style>
        @page { size: auto; margin: 8mm; }
        body { font-family: system-ui, sans-serif; margin: 0; color: #0F172A; }
        .grid {
          display: grid;
          grid-template-columns: repeat(${tamano.cols}, ${tamano.w_mm}mm);
          gap: ${tamano.gap_mm}mm;
          justify-content: start;
        }
        .label {
          width: ${tamano.w_mm}mm;
          height: ${tamano.h_mm}mm;
          border: 1px dashed #cbd5e1;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          overflow: hidden;
          page-break-inside: avoid;
        }
        .label img { max-width: 100%; max-height: 60%; object-fit: contain; }
        .nombre { font-size: 8pt; font-weight: 700; margin-top: 1mm; text-align: center; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .meta { font-size: 6pt; color: #64748b; text-align: center; margin-top: 0.5mm; font-family: ui-monospace, Menlo, monospace; }
        @media print { .label { border: none; } .noprint { display: none; } }
      </style></head><body>
      <div class="noprint" style="padding:12px;background:#f1f5f9;text-align:center">
        ${filas.length} etiquetas · <button onclick="window.print()" style="padding:6px 12px;border:none;background:#4f46e5;color:white;border-radius:6px;cursor:pointer">Imprimir</button>
      </div>
      <div class="grid">${labelHtml}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/almacen")}
          className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#4F46E5,#8B5CF6)" }}>
          <QrCode className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Imprimir etiquetas</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Genera codigos de barras o QR para varios productos a la vez.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lateral: configuracion + buscador */}
        <div className="space-y-4">
          <Card isDark={isDarkMode}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>1. Buscar productos</h3>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="SKU, codigo, codigo de barras…"
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none ${
                  isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`} />
            </div>
            <div className="mt-2 max-h-64 overflow-auto space-y-1">
              {busy && <div className={`text-xs ${theme.textTertiary} px-2 py-1`}>Buscando…</div>}
              {!busy && resultados.length === 0 && search && <div className={`text-xs ${theme.textTertiary} px-2 py-1`}>Sin resultados.</div>}
              {resultados.map((p) => {
                const ya = seleccion.some((f) => f.producto.id === p.id);
                return (
                  <button key={p.id} onClick={() => agregar(p)} disabled={ya}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs border flex items-start gap-2 ${
                      ya ? "opacity-40 cursor-not-allowed" : (isDarkMode ? "border-white/[0.06] hover:bg-white/[0.04]" : "border-slate-200 hover:bg-slate-50")
                    }`}>
                    <Plus className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <div className={`font-mono ${theme.textPrimary}`}>{p.codigo} · {p.sku}</div>
                      <div className={`truncate ${theme.textSecondary}`}>{p.nombre}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card isDark={isDarkMode}>
            <h3 className={`text-xs font-black uppercase tracking-wider mb-3 ${theme.textSecondary}`}>2. Formato de hoja</h3>
            <select value={tamanoId} onChange={(e) => setTamanoId(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}>
              {TAMANOS_PAPEL.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>

            <h3 className={`text-xs font-black uppercase tracking-wider mt-4 mb-1 ${theme.textSecondary}`}>Simbologia (override)</h3>
            <select value={defaultSimbologia} onChange={(e) => setDefaultSimbologia(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}>
              <option value="">— Usar la del producto —</option>
              <option value="QR">QR Code</option>
              <option value="CODE128">Code 128</option>
              <option value="CODE39">Code 39</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPCA">UPC-A</option>
              <option value="ITF">ITF</option>
            </select>

            <h3 className={`text-xs font-black uppercase tracking-wider mt-4 mb-1 ${theme.textSecondary}`}>Tamano</h3>
            <input type="range" min={1} max={4} value={escala} onChange={(e) => setEscala(Number(e.target.value))}
              className="w-full" />
            <div className={`text-[11px] ${theme.textTertiary}`}>Escala {escala}x</div>
          </Card>

          <button onClick={imprimir} disabled={filas.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white shadow-md disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#4F46E5,#8B5CF6)" }}>
            <Printer className="w-4 h-4" /> Imprimir {filas.length} etiqueta{filas.length === 1 ? "" : "s"}
          </button>
        </div>

        {/* Lista seleccionada */}
        <div className="lg:col-span-2">
          <Card isDark={isDarkMode}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                3. Productos en la lista ({seleccion.length})
              </h3>
              {seleccion.length > 0 && (
                <button onClick={() => setSeleccion([])}
                  className="text-xs text-rose-400 hover:underline">Vaciar</button>
              )}
            </div>
            {seleccion.length === 0 ? (
              <div className={`text-center py-12 ${theme.textTertiary} text-sm`}>
                Busca y agrega productos para imprimir sus etiquetas.
              </div>
            ) : (
              <div className="space-y-2">
                {seleccion.map((f, i) => {
                  const simb = (defaultSimbologia || f.simbologia
                                || f.producto.tipo_codigo_barras || "QR").toUpperCase();
                  const previewSrc = simb !== "NONE"
                    ? api.barcodeProductoUrl(f.producto.id, { simbologia: simb, escala: 1 })
                    : "";
                  return (
                    <div key={f.producto.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isDarkMode ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
                    }`}>
                      <div className="w-14 h-14 bg-white rounded-md flex items-center justify-center p-1 border border-slate-300 shrink-0">
                        {previewSrc ? (
                          <img src={previewSrc} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-500">N/A</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${theme.textPrimary}`}>{f.producto.nombre}</div>
                        <div className={`text-[11px] font-mono ${theme.textTertiary}`}>
                          {f.producto.codigo} · SKU {f.producto.sku} · {simb}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className={`text-[10px] ${theme.textTertiary}`}>Copias</label>
                        <input type="number" min={1} max={500} value={f.copias}
                          onChange={(e) => {
                            const next = [...seleccion];
                            next[i] = { ...next[i], copias: Math.max(1, Number(e.target.value) || 1) };
                            setSeleccion(next);
                          }}
                          className="w-16 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-sm text-white" />
                        <button onClick={() => setSeleccion(seleccion.filter((x) => x.producto.id !== f.producto.id))}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
      {children}
    </div>
  );
}

function escapeHtml(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]
  );
}
