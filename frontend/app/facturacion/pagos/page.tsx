"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCode2, FileText, Plus, RefreshCw, Stamp, Trash2, Wallet, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const MXN = (v: any) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));
const FORMAS_PAGO = [
  ["03", "03 · Transferencia"], ["01", "01 · Efectivo"], ["02", "02 · Cheque nominativo"],
  ["04", "04 · Tarjeta de crédito"], ["28", "28 · Tarjeta de débito"], ["99", "99 · Por definir"],
];
const ESTADO_COLOR: Record<string, string> = {
  TIMBRADA: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  BORRADOR: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  CANCELADA: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  ERROR: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

export default function PagosPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getPagos({ empresa: String(empresaActivaId) }).then((r) => setPagos(r.results || [])).catch(() => setPagos([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const [busy, setBusy] = useState<number | null>(null);

  const timbrar = async (id: number) => {
    try { await api.timbrarPago(id); load(); }
    catch (e) { alert((e as Error).message); }
  };

  const descargar = async (p: any, accion: "xml" | "pdf") => {
    setBusy(p.id);
    try {
      await api.descargarCFDI(
        p.id, accion, `REP-${p.serie_letra}${p.folio}.${accion}`,
        accion === "pdf" ? "open" : "download", "pagos",
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
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-sky-500 to-blue-600">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Complementos de pago (REP)</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Recepción de pagos para CFDI con método PPD.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600">
            <Plus className="w-4 h-4" /> Nuevo REP
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Folio</Th><Th>Fecha pago</Th><Th>Forma</Th><Th align="center">Docs</Th>
                <Th align="right">Monto</Th><Th align="center">Estado</Th><Th align="center">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : pagos.length === 0 ? (
                <tr><td colSpan={7} className={`py-10 text-center ${theme.textTertiary}`}>Sin complementos de pago. Crea el primero.</td></tr>
              ) : pagos.map((p) => (
                <tr key={p.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-mono font-bold ${theme.textPrimary}`}>{p.serie_letra}{p.folio}</span></Td>
                  <Td><span className={`text-xs ${theme.textSecondary}`}>{p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString("es-MX") : "—"}</span></Td>
                  <Td><span className="text-xs font-mono">{p.forma_pago}</span></Td>
                  <Td align="center">{(p.documentos || []).length}</Td>
                  <Td align="right"><span className={`font-mono font-bold ${theme.textPrimary}`}>{MXN(p.monto)}</span></Td>
                  <Td align="center"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ESTADO_COLOR[p.estado] || ESTADO_COLOR.BORRADOR}`}>{p.estado}</span></Td>
                  <Td align="center">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      {(p.estado === "BORRADOR" || p.estado === "ERROR") && (
                        <button onClick={() => timbrar(p.id)} title="Timbrar" className="inline-flex items-center gap-1 text-xs font-bold text-sky-500 hover:text-sky-400">
                          <Stamp className="w-3.5 h-3.5" /> Timbrar
                        </button>
                      )}
                      {p.estado === "TIMBRADA" && (
                        <>
                          <button onClick={() => descargar(p, "pdf")} disabled={busy === p.id} title="Ver / descargar PDF"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-40">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => descargar(p, "xml")} disabled={busy === p.id} title="Descargar XML"
                            className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-500/10 disabled:opacity-40">
                            <FileCode2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {p.estado === "CANCELADA" && <span className={`text-xs ${theme.textTertiary}`}>—</span>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NuevoPagoModal isDark={isDarkMode} theme={theme} empresaId={empresaActivaId}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}

interface Doc { factura: number | ""; saldo_anterior: string; importe_pagado: string; parcialidad: string; }

function NuevoPagoModal({ isDark, theme, empresaId, onClose, onCreated }: {
  isDark: boolean; theme: any; empresaId: number | null; onClose: () => void; onCreated: () => void;
}) {
  const ahora = new Date().toISOString().slice(0, 16);
  const [series, setSeries] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [serie, setSerie] = useState<number | "">("");
  const [fecha, setFecha] = useState(ahora);
  const [formaPago, setFormaPago] = useState("03");
  const [numOp, setNumOp] = useState("");
  const [docs, setDocs] = useState<Doc[]>([{ factura: "", saldo_anterior: "0", importe_pagado: "0", parcialidad: "1" }]);
  const [timbrarAhora, setTimbrarAhora] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getSeries().then((r) => setSeries((r.results || []).filter((s: any) => s.tipo_comprobante === "P"))).catch(() => {});
    api.getFacturas({ empresa: String(empresaId || ""), tipo_comprobante: "I", estado: "TIMBRADA", page_size: "200" })
      .then((r) => setFacturas(r.results || [])).catch(() => {});
  }, [empresaId]);

  const monto = docs.reduce((s, d) => s + (parseFloat(d.importe_pagado) || 0), 0);
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  const setDoc = (i: number, d: Partial<Doc>) => setDocs((p) => p.map((x, k) => k === i ? { ...x, ...d } : x));
  const onPickFactura = (i: number, fid: number | "") => {
    const f = facturas.find((x) => x.id === fid);
    setDoc(i, { factura: fid, saldo_anterior: f ? String(f.total) : "0", importe_pagado: f ? String(f.total) : "0" });
  };

  const guardar = async () => {
    if (!serie) { alert("Selecciona la serie del REP (tipo P)."); return; }
    const validos = docs.filter((d) => d.factura && Number(d.importe_pagado) > 0);
    if (validos.length === 0) { alert("Relaciona al menos una factura con importe."); return; }
    setBusy(true);
    try {
      const pago = await api.crearPago({
        empresa: empresaId, serie, fecha_pago: new Date(fecha).toISOString(),
        forma_pago: formaPago, moneda: "MXN", tipo_cambio: "1", monto: monto.toFixed(2),
        numero_operacion: numOp, estado: "BORRADOR",
        documentos: validos.map((d) => {
          const sa = parseFloat(d.saldo_anterior) || 0;
          const ip = parseFloat(d.importe_pagado) || 0;
          return {
            factura: d.factura, numero_parcialidad: parseInt(d.parcialidad) || 1,
            saldo_anterior: sa.toFixed(2), importe_pagado: ip.toFixed(2),
            saldo_insoluto: (sa - ip).toFixed(2),
          };
        }),
      });
      if (timbrarAhora && pago?.id) {
        try { await api.timbrarPago(pago.id); } catch (e) { alert("Creado, pero el timbrado falló: " + (e as Error).message); }
      }
      onCreated();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border p-6 space-y-3 max-h-[90vh] overflow-auto ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>Nuevo complemento de pago</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}><X className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Serie REP (tipo P) *" theme={theme}>
            <select value={serie} onChange={(e) => setSerie(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
              <option value="">— Selecciona —</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.letra}</option>)}
            </select>
            {series.length === 0 && <p className="text-[11px] text-amber-500 mt-1">No hay series tipo P. Crea una en Series.</p>}
          </Campo>
          <Campo label="Fecha de pago *" theme={theme}><input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Forma de pago *" theme={theme}>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputCls}>
              {FORMAS_PAGO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="No. de operación" theme={theme}><input value={numOp} onChange={(e) => setNumOp(e.target.value)} className={inputCls} /></Campo>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-bold ${theme.textSecondary}`}>Facturas relacionadas (PPD)</label>
            <button onClick={() => setDocs((p) => [...p, { factura: "", saldo_anterior: "0", importe_pagado: "0", parcialidad: "1" }])} className="inline-flex items-center gap-1 text-xs font-bold text-sky-400"><Plus className="w-3 h-3" /> Agregar</button>
          </div>
          <div className="space-y-1.5">
            {docs.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select value={d.factura} onChange={(e) => onPickFactura(i, e.target.value ? Number(e.target.value) : "")} className={`${inputCls} text-xs py-1.5`}>
                    <option value="">— factura —</option>
                    {facturas.map((f) => <option key={f.id} value={f.id}>{f.serie_letra}{f.folio} · {f.cliente_data?.razon_social || ""} · {MXN(f.total)}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><input type="number" value={d.parcialidad} onChange={(e) => setDoc(i, { parcialidad: e.target.value })} placeholder="parc." className={`${inputCls} text-xs py-1.5 text-right`} /></div>
                <div className="col-span-2"><input type="number" value={d.saldo_anterior} onChange={(e) => setDoc(i, { saldo_anterior: e.target.value })} placeholder="saldo ant." className={`${inputCls} text-xs py-1.5 text-right`} /></div>
                <div className="col-span-2"><input type="number" value={d.importe_pagado} onChange={(e) => setDoc(i, { importe_pagado: e.target.value })} placeholder="pagado" className={`${inputCls} text-xs py-1.5 text-right`} /></div>
                <div className="col-span-1 text-center"><button onClick={() => setDocs((p) => p.filter((_, k) => k !== i))} className="p-1 rounded text-rose-400 hover:bg-rose-500/15"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>
            ))}
          </div>
          {facturas.length === 0 && <p className="text-[11px] text-amber-500 mt-1">No hay facturas timbradas tipo Ingreso para relacionar.</p>}
        </div>

        <div className={`flex items-center justify-between pt-1 ${theme.textPrimary}`}>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={timbrarAhora} onChange={(e) => setTimbrarAhora(e.target.checked)} /> Timbrar al guardar
          </label>
          <span className="text-sm">Monto total: <b className="font-mono text-sky-400">{MXN(monto)}</b></span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-sky-500 to-blue-600">{busy ? "Guardando…" : "Crear REP"}</button>
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
