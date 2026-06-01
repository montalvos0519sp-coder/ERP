"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Calendar, ChevronLeft, ChevronRight, Layers, Package,
  Plus, Search, X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

type Tab = "lotes" | "series";

interface Lote {
  id: number;
  producto: number;
  producto_nombre?: string;
  producto_codigo?: string;
  numero_lote: string;
  fecha_fabricacion: string | null;
  fecha_caducidad: string | null;
  cantidad_inicial: string | number;
  activo: boolean;
}

interface Serie {
  id: number;
  producto: number;
  producto_nombre?: string;
  producto_codigo?: string;
  numero_serie: string;
  lote: number | null;
  estado: string;
}

const PAGE_SIZE = 25;

export default function LotesPage() {
  const { theme, isDarkMode } = useTheme();
  const [tab, setTab] = useState<Tab>("lotes");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EAB308)" }}>
          <Layers className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Lotes y Series</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Trazabilidad por lote + caducidad y por numero de serie.</p>
        </div>
      </div>

      <div className={`inline-flex rounded-xl p-1 border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <button onClick={() => setTab("lotes")}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold ${
            tab === "lotes" ? "bg-amber-500 text-slate-900"
              : isDarkMode ? "text-slate-300 hover:bg-white/[0.04]" : "text-slate-600 hover:bg-slate-50"
          }`}>Lotes</button>
        <button onClick={() => setTab("series")}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold ${
            tab === "series" ? "bg-amber-500 text-slate-900"
              : isDarkMode ? "text-slate-300 hover:bg-white/[0.04]" : "text-slate-600 hover:bg-slate-50"
          }`}>Series</button>
      </div>

      {tab === "lotes" ? <LotesTab /> : <SeriesTab />}
    </div>
  );
}

// ─── LOTES ──────────────────────────────────────────────────────────────────
function LotesTab() {
  const { theme, isDarkMode } = useTheme();
  const [items, setItems] = useState<Lote[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [soloPorCaducar, setSoloPorCaducar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [showNew, setShowNew] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page), page_size: String(PAGE_SIZE),
      };
      if (search.trim()) params.search = search.trim();
      if (soloPorCaducar) params.por_caducar = "true";
      const r = soloPorCaducar
        ? await api.getLotesPorCaducar(params)
        : await api.getLotesAlmacen(params);
      setItems(r.results || []);
      setCount((r as any).count ?? (r.results || []).length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, soloPorCaducar]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    api.getProductosAlmacen({ page_size: "200", activo: "true" })
      .then((r) => setProductos(r.results || [])).catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2 items-center p-3 rounded-2xl border ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar numero de lote…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none border ${
              isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`} />
        </div>
        <label className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          isDarkMode ? "border-white/[0.06] text-slate-300" : "border-slate-200 text-slate-600"
        }`}>
          <input type="checkbox" checked={soloPorCaducar} onChange={(e) => { setSoloPorCaducar(e.target.checked); setPage(1); }} />
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Solo por caducar
        </label>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuevo lote
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"
      }`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
            <tr className={theme.textSecondary}>
              <Th>Lote</Th><Th>Producto</Th><Th>Fab.</Th><Th>Caducidad</Th>
              <Th align="right">Cantidad inicial</Th><Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={`px-4 py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className={`px-4 py-10 text-center ${theme.textTertiary}`}>Sin lotes.</td></tr>
            ) : items.map((l) => {
              const cad = l.fecha_caducidad ? new Date(l.fecha_caducidad) : null;
              const diasRest = cad ? Math.ceil((cad.getTime() - Date.now()) / 86400_000) : null;
              const peligro = diasRest !== null && diasRest <= 30 && diasRest >= 0;
              const vencido = diasRest !== null && diasRest < 0;
              return (
                <tr key={l.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className="font-mono text-xs">{l.numero_lote}</span></Td>
                  <Td>
                    <div className={`text-xs ${theme.textPrimary}`}>{l.producto_nombre || `#${l.producto}`}</div>
                    {l.producto_codigo && <div className={`text-[10px] font-mono ${theme.textTertiary}`}>{l.producto_codigo}</div>}
                  </Td>
                  <Td><span className="text-xs">{l.fecha_fabricacion || "—"}</span></Td>
                  <Td>
                    <span className="text-xs inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {l.fecha_caducidad || "—"}
                      {diasRest !== null && (
                        <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          vencido ? "bg-rose-500/20 text-rose-300"
                          : peligro ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                        }`}>{vencido ? `Vencido ${-diasRest}d` : `${diasRest}d`}</span>
                      )}
                    </span>
                  </Td>
                  <Td align="right"><span className="font-mono text-xs">{l.cantidad_inicial}</span></Td>
                  <Td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    l.activo ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-300"
                  }`}>{l.activo ? "Activo" : "Inactivo"}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-2 border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
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
        )}
      </div>

      {showNew && <NuevoLoteModal productos={productos} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); cargar(); }} />}
    </div>
  );
}

function NuevoLoteModal({ productos, onClose, onCreated }: { productos: any[]; onClose: () => void; onCreated: () => void }) {
  const [producto, setProducto] = useState<number | "">("");
  const [numero, setNumero] = useState("");
  const [fechaFab, setFechaFab] = useState("");
  const [fechaCad, setFechaCad] = useState("");
  const [cantidad, setCantidad] = useState("0");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!producto || !numero.trim()) return alert("Selecciona producto e ingresa numero de lote.");
    setBusy(true);
    try {
      await api.crearLoteAlmacen({
        producto, numero_lote: numero.trim(),
        fecha_fabricacion: fechaFab || null,
        fecha_caducidad: fechaCad || null,
        cantidad_inicial: parseFloat(cantidad) || 0,
        activo: true,
      });
      onCreated();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-white">Nuevo lote</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <label className="text-xs font-bold text-slate-300 block">Producto *</label>
        <select value={producto} onChange={(e) => setProducto(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
          <option value="">— Selecciona —</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo_interno || p.codigo} · {p.nombre}</option>)}
        </select>
        <label className="text-xs font-bold text-slate-300 block mt-3">Numero de lote *</label>
        <input value={numero} onChange={(e) => setNumero(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono" />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block">F. fabricacion</label>
            <input type="date" value={fechaFab} onChange={(e) => setFechaFab(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block">Caducidad</label>
            <input type="date" value={fechaCad} onChange={(e) => setFechaCad(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </div>
        </div>
        <label className="text-xs font-bold text-slate-300 block mt-3">Cantidad inicial</label>
        <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold disabled:opacity-40">
            {busy ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SERIES ─────────────────────────────────────────────────────────────────
function SeriesTab() {
  const { theme, isDarkMode } = useTheme();
  const [items, setItems] = useState<Serie[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "100" };
      if (search.trim()) params.search = search.trim();
      const r = await api.getSeriesAlmacen(params);
      setItems(r.results || []);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-3">
      <div className={`flex gap-2 p-3 rounded-2xl border ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textTertiary}`} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar numero de serie…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none ${isDarkMode ? "bg-[#1E293B]/40 border-white/[0.05] text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
        </div>
      </div>
      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-[#0F172A]/70 border-white/[0.06]" : "bg-white border-slate-200/70"}`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"}>
            <tr className={theme.textSecondary}>
              <Th>Numero de serie</Th><Th>Producto</Th><Th>Lote</Th><Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className={`px-4 py-8 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className={`px-4 py-8 text-center ${theme.textTertiary}`}>Sin series.</td></tr>
            ) : items.map((s) => (
              <tr key={s.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                <Td><span className="font-mono text-xs">{s.numero_serie}</span></Td>
                <Td>
                  <div className={`text-xs ${theme.textPrimary}`}>{s.producto_nombre || `#${s.producto}`}</div>
                  {s.producto_codigo && <div className={`text-[10px] font-mono ${theme.textTertiary}`}>{s.producto_codigo}</div>}
                </Td>
                <Td><span className="font-mono text-xs">{s.lote ?? "—"}</span></Td>
                <Td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.estado === "DISPONIBLE" ? "bg-emerald-500/20 text-emerald-300"
                  : s.estado === "VENDIDA" ? "bg-blue-500/20 text-blue-300"
                  : s.estado === "RESERVADA" ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-500/20 text-slate-300"
                }`}>{s.estado}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-[11px] uppercase tracking-wider font-bold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
