"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCode2, FileText, Plus, RefreshCw, Receipt, Stamp, Trash2, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const MXN = (v: any) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));
const USO_CFDI = [["G02", "G02 · Devoluciones, descuentos o bonificaciones"], ["G03", "G03 · Gastos en general"], ["S01", "S01 · Sin efectos fiscales"]];
const ESTADO_COLOR: Record<string, string> = {
  TIMBRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  BORRADOR: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  CANCELADA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  ERROR: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

export default function NotasCreditoPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getFacturas({ empresa: String(empresaActivaId), tipo_comprobante: "E", page_size: "200" })
      .then((r) => setNotas(r.results || [])).catch(() => setNotas([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const [busy, setBusy] = useState<number | null>(null);

  const timbrar = async (id: number) => {
    try { await api.timbrarFactura(id); load(); } catch (e) { alert((e as Error).message); }
  };

  const descargar = async (n: any, accion: "xml" | "pdf") => {
    setBusy(n.id);
    try {
      await api.descargarCFDI(
        n.id, accion, `${n.serie_letra}${n.folio}.${accion}`,
        accion === "pdf" ? "open" : "download",
      );
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(null); }
  };

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/facturacion")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-rose-500 to-pink-600">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Notas de crédito</h1>
            <p className={`text-sm ${theme.textSecondary}`}>CFDI de Egreso relacionado a una factura (tipo relación 01).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600">
            <Plus className="w-4 h-4" /> Nueva nota de crédito
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Folio</Th><Th>Fecha</Th><Th>Cliente</Th><Th>Relacionada</Th>
                <Th align="right">Total</Th><Th align="center">Estado</Th><Th align="center">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : notas.length === 0 ? (
                <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Sin notas de crédito. Crea la primera.</td></tr>
              ) : notas.map((n) => (
                <tr key={n.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-mono font-bold ${theme.textPrimary}`}>{n.serie_letra}{n.folio}</span></Td>
                  <Td><span className={`text-xs ${theme.textSecondary}`}>{new Date(n.fecha_emision).toLocaleDateString("es-MX")}</span></Td>
                  <Td><span className={theme.textPrimary}>{n.cliente_data?.razon_social || "—"}</span></Td>
                  <Td><span className={`text-xs font-mono ${theme.textTertiary}`}>{n.relacionada_folio || "—"}</span></Td>
                  <Td align="right"><span className={`font-mono font-bold ${theme.textPrimary}`}>{MXN(n.total)}</span></Td>
                  <Td align="center"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ESTADO_COLOR[n.estado] || ESTADO_COLOR.BORRADOR}`}>{n.estado}</span></Td>
                  <Td align="center">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      {(n.estado === "BORRADOR" || n.estado === "ERROR") && (
                        <button onClick={() => timbrar(n.id)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400"><Stamp className="w-3.5 h-3.5" /> Timbrar</button>
                      )}
                      {n.estado === "TIMBRADA" && (
                        <>
                          <button onClick={() => descargar(n, "pdf")} disabled={busy === n.id} title="Ver / descargar PDF"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-40">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => descargar(n, "xml")} disabled={busy === n.id} title="Descargar XML"
                            className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-500/10 disabled:opacity-40">
                            <FileCode2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {n.estado === "CANCELADA" && <span className={`text-xs ${theme.textTertiary}`}>—</span>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NuevaNCModal isDark={isDarkMode} theme={theme} empresaId={empresaActivaId}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}

interface Concepto { producto: number | ""; descripcion: string; cantidad: string; precio: string; }

function NuevaNCModal({ isDark, theme, empresaId, onClose, onCreated }: {
  isDark: boolean; theme: any; empresaId: number | null; onClose: () => void; onCreated: () => void;
}) {
  const [series, setSeries] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [serie, setSerie] = useState<number | "">("");
  const [relacionada, setRelacionada] = useState<number | "">("");
  const [usoCfdi, setUsoCfdi] = useState("G02");
  const [conceptos, setConceptos] = useState<Concepto[]>([{ producto: "", descripcion: "", cantidad: "1", precio: "0" }]);
  const [timbrarAhora, setTimbrarAhora] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getSeries().then((r) => setSeries((r.results || []).filter((s: any) => s.tipo_comprobante === "E"))).catch(() => {});
    api.getFacturas({ empresa: String(empresaId || ""), tipo_comprobante: "I", estado: "TIMBRADA", page_size: "200" }).then((r) => setFacturas(r.results || [])).catch(() => {});
    api.getProductosFacturacion().then((r) => setProductos(r.results || [])).catch(() => {});
  }, [empresaId]);

  const facRel = facturas.find((f) => f.id === relacionada);
  const subtotal = conceptos.reduce((s, c) => s + (parseFloat(c.cantidad) || 0) * (parseFloat(c.precio) || 0), 0);
  const total = subtotal * 1.16;
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const setC = (i: number, c: Partial<Concepto>) => setConceptos((p) => p.map((x, k) => k === i ? { ...x, ...c } : x));
  const onPickProd = (i: number, pid: number | "") => {
    const p = productos.find((x) => x.id === pid);
    setC(i, { producto: pid, descripcion: p?.descripcion || "", precio: p?.precio_unitario ? String(p.precio_unitario) : conceptos[i].precio });
  };

  const guardar = async () => {
    if (!serie) { alert("Selecciona la serie (tipo E)."); return; }
    if (!relacionada || !facRel) { alert("Selecciona la factura relacionada."); return; }
    const vals = conceptos.filter((c) => c.producto && Number(c.cantidad) > 0);
    if (vals.length === 0) { alert("Agrega al menos un concepto."); return; }
    setBusy(true);
    try {
      const nc = await api.crearFactura({
        empresa: empresaId, serie, cliente: facRel.cliente,
        tipo_comprobante: "E", tipo_relacion: "01", factura_relacionada: relacionada,
        forma_pago: facRel.forma_pago || "99", metodo_pago: "PUE", uso_cfdi: usoCfdi, moneda: "MXN",
        conceptos: vals.map((c) => {
          const p = productos.find((x) => x.id === c.producto);
          return {
            descripcion: c.descripcion || p?.descripcion || "",
            clave_prod_serv: p?.clave_prod_serv || "01010101",
            clave_unidad: p?.clave_unidad || "ACT",
            cantidad: c.cantidad, precio_unitario: c.precio, tasa_iva: "0.16", objeto_imp: "02",
          };
        }),
      });
      if (timbrarAhora && nc?.id) {
        try { await api.timbrarFactura(nc.id); } catch (e) { alert("Creada, pero el timbrado falló: " + (e as Error).message); }
      }
      onCreated();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border p-6 space-y-3 max-h-[90vh] overflow-auto ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>Nueva nota de crédito</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Factura relacionada (origen) *" theme={theme}>
            <select value={relacionada} onChange={(e) => setRelacionada(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">— Selecciona —</option>
              {facturas.map((f) => <option key={f.id} value={f.id}>{f.serie_letra}{f.folio} · {f.cliente_data?.razon_social || ""} · {MXN(f.total)}</option>)}
            </select>
          </Campo>
          <Campo label="Serie NC (tipo E) *" theme={theme}>
            <select value={serie} onChange={(e) => setSerie(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">— Selecciona —</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.letra}</option>)}
            </select>
            {series.length === 0 && <p className="text-[11px] text-amber-500 mt-1">No hay series tipo E. Crea una en Series.</p>}
          </Campo>
          <Campo label="Uso CFDI" theme={theme}>
            <select value={usoCfdi} onChange={(e) => setUsoCfdi(e.target.value)} className={inputCls}>
              {USO_CFDI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente" theme={theme}>
            <div className={`${inputCls} flex items-center`}>{facRel?.cliente_data?.razon_social || "— (de la factura) —"}</div>
          </Campo>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-bold ${theme.textSecondary}`}>Conceptos a acreditar</label>
            <button onClick={() => setConceptos((p) => [...p, { producto: "", descripcion: "", cantidad: "1", precio: "0" }])} className="inline-flex items-center gap-1 text-xs font-bold text-rose-400"><Plus className="w-3 h-3" /> Agregar</button>
          </div>
          <div className="space-y-1.5">
            {conceptos.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select value={c.producto} onChange={(e) => onPickProd(i, e.target.value ? Number(e.target.value) : "")} className={`${inputCls} text-xs py-1.5`}>
                    <option value="">— concepto/producto —</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
                  </select>
                </div>
                <div className="col-span-3"><input value={c.descripcion} onChange={(e) => setC(i, { descripcion: e.target.value })} placeholder="descripción" className={`${inputCls} text-xs py-1.5`} /></div>
                <div className="col-span-2"><input type="number" value={c.cantidad} onChange={(e) => setC(i, { cantidad: e.target.value })} placeholder="cant" className={`${inputCls} text-xs py-1.5 text-right`} /></div>
                <div className="col-span-1"><input type="number" value={c.precio} onChange={(e) => setC(i, { precio: e.target.value })} placeholder="$" className={`${inputCls} text-xs py-1.5 text-right`} /></div>
                <div className="col-span-1 text-center"><button onClick={() => setConceptos((p) => p.filter((_, k) => k !== i))} className="p-1 rounded text-rose-400 hover:bg-rose-500/15"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-between pt-1 ${theme.textPrimary}`}>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={timbrarAhora} onChange={(e) => setTimbrarAhora(e.target.checked)} /> Timbrar al guardar</label>
          <span className="text-sm">Subtotal: <b className="font-mono">{MXN(subtotal)}</b> · Total: <b className="font-mono text-rose-400">{MXN(total)}</b></span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-rose-500 to-pink-600">{busy ? "Guardando…" : "Crear nota de crédito"}</button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, theme, children }: { label: string; theme: any; children: React.ReactNode }) {
  return <div><label className={`text-xs font-bold mb-1 block ${theme.textSecondary}`}>{label}</label>{children}</div>;
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${a}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return <td className={`px-3 py-2.5 ${a}`}>{children}</td>;
}
