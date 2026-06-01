"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Building2, Download, Eye, FileCode2, FileText, Plus, Receipt,
  RefreshCw, Wallet, X, CheckCircle2, Clock, XCircle, AlertTriangle, Search,
} from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Concepto {
  id: number; descripcion: string; clave_prod_serv: string; clave_unidad: string;
  unidad: string; cantidad: string; precio_unitario: string; descuento: string;
  tasa_iva: string;
}
interface Factura {
  id: number; folio: number; serie_letra: string; fecha_emision: string;
  fecha_timbrado?: string | null;
  cliente_data: { rfc: string; razon_social: string; regimen_fiscal?: string; cp_fiscal?: string };
  conceptos?: Concepto[];
  subtotal?: string; iva_trasladado?: string; iva_retenido?: string; isr_retenido?: string;
  total: string; estado: string; folio_fiscal: string; pac_uid?: string;
  tipo_comprobante?: string; uso_cfdi?: string; forma_pago?: string; metodo_pago?: string;
  moneda?: string; log_pac?: any;
}

const money = (v?: string | number) =>
  `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

const TIPO_LABEL: Record<string, string> = {
  I: "Ingreso", E: "Egreso", T: "Traslado", N: "Nomina", P: "Pago",
};

export default function FacturacionPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const { empresaActivaId } = useUser();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<Factura | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("TODAS");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const load = () => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getFacturas({ empresa: String(empresaActivaId) })
      .then((r) => setFacturas(r?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empresaActivaId]);

  const timbrar = async (id: number) => {
    setBusy(id);
    try {
      await api.timbrarFactura(id);
      flash("ok", "Factura timbrada correctamente.");
      load();
    } catch (e) { flash("err", (e as Error).message); }
    finally { setBusy(null); }
  };

  const descargar = async (f: Factura, accion: "xml" | "pdf") => {
    setBusy(f.id);
    try {
      await api.descargarCFDI(
        f.id, accion,
        `${f.serie_letra}-${f.folio}.${accion}`,
        accion === "pdf" ? "open" : "download",
      );
    } catch (e) { flash("err", (e as Error).message); }
    finally { setBusy(null); }
  };

  const abrirDetalle = async (f: Factura) => {
    // El listado no trae conceptos completos; recargamos el objeto individual.
    setDetalle(f);
    try {
      const full = await api.getFacturas({ empresa: String(empresaActivaId), id: String(f.id) });
      const item = (full?.results || []).find((x: any) => x.id === f.id);
      if (item) setDetalle(item);
    } catch { /* mantenemos lo que ya teníamos */ }
  };

  const estadoColor = (estado: string) =>
    estado === "TIMBRADA" ? "success" :
    estado === "CANCELADA" ? "alert" :
    estado === "ERROR" ? "alert" : "default";

  const EstadoIcon = ({ estado }: { estado: string }) => {
    if (estado === "TIMBRADA") return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (estado === "CANCELADA") return <XCircle className="w-3.5 h-3.5" />;
    if (estado === "ERROR") return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const filtradas = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return facturas.filter((f) => {
      if (filtro !== "TODAS" && f.estado !== filtro) return false;
      if (!ql) return true;
      return (
        `${f.serie_letra}-${f.folio}`.toLowerCase().includes(ql) ||
        (f.cliente_data?.razon_social || "").toLowerCase().includes(ql) ||
        (f.cliente_data?.rfc || "").toLowerCase().includes(ql) ||
        (f.folio_fiscal || "").toLowerCase().includes(ql)
      );
    });
  }, [facturas, q, filtro]);

  const stats = useMemo(() => {
    const tot = facturas.length;
    const timbradas = facturas.filter((f) => f.estado === "TIMBRADA");
    const monto = timbradas.reduce((s, f) => s + Number(f.total || 0), 0);
    const borradores = facturas.filter((f) => f.estado === "BORRADOR").length;
    return { tot, timbradas: timbradas.length, monto, borradores };
  }, [facturas]);

  const ESTADOS = ["TODAS", "TIMBRADA", "BORRADOR", "CANCELADA", "ERROR"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Facturacion CFDI 4.0</h1>
            <p className={`text-sm ${t.textSecondary}`}>Emite, timbra, descarga XML/PDF y cancela tus CFDI.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar</Button>
          <Link href="/facturacion/clientes"><Button variant="secondary"><Building2 className="w-4 h-4" /> Clientes</Button></Link>
          <Link href="/facturacion/pagos"><Button variant="secondary"><Wallet className="w-4 h-4" /> Complementos</Button></Link>
          <Link href="/facturacion/notas-credito"><Button variant="secondary"><Receipt className="w-4 h-4" /> Notas de crédito</Button></Link>
          <Link href="/facturacion/reportes"><Button variant="secondary"><BarChart3 className="w-4 h-4" /> Reportes</Button></Link>
          <Link href="/facturacion/nueva"><Button><Plus className="w-4 h-4" /> Nueva factura</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard t={t} label="Total facturas" value={String(stats.tot)} color="#6366F1" icon={<FileText className="w-5 h-5" />} />
        <KpiCard t={t} label="Timbradas" value={String(stats.timbradas)} color="#10B981" icon={<CheckCircle2 className="w-5 h-5" />} />
        <KpiCard t={t} label="Borradores" value={String(stats.borradores)} color="#F59E0B" icon={<Clock className="w-5 h-5" />} />
        <KpiCard t={t} label="Monto timbrado" value={money(stats.monto)} color="#14B8A6" icon={<BarChart3 className="w-5 h-5" />} />
      </div>

      {/* Toolbar: búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${t.divider} flex-1 min-w-[220px]`}>
          <Search className={`w-4 h-4 ${t.textTertiary}`} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por folio, cliente, RFC o UUID…"
            className={`bg-transparent outline-none text-sm w-full ${t.textPrimary}`}
          />
        </div>
        <div className="flex gap-1">
          {ESTADOS.map((e) => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtro === e
                  ? "bg-emerald-500 text-white shadow"
                  : `${t.textSecondary} ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`
              }`}>
              {e === "TODAS" ? "Todas" : e.charAt(0) + e.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead className={`text-left text-[11px] uppercase tracking-wide ${t.textTertiary} border-b ${t.divider}`}>
              <tr>
                <th className="px-6 py-3">Folio</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className={`border-b ${t.divider} ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.015]"} transition-colors`}>
                  <td className={`px-6 py-3 font-mono font-bold ${t.textPrimary}`}>{f.serie_letra}-{f.folio}</td>
                  <td className={`px-6 py-3 ${t.textSecondary}`}>{new Date(f.fecha_emision).toLocaleDateString("es-MX")}</td>
                  <td className="px-6 py-3">
                    <div className={`${t.textPrimary} font-semibold`}>{f.cliente_data?.razon_social}</div>
                    <div className={`text-[10px] font-mono ${t.textTertiary}`}>{f.cliente_data?.rfc}</div>
                  </td>
                  <td className={`px-6 py-3 text-right font-mono font-bold ${t.textPrimary}`}>{money(f.total)}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Badge text={f.estado} type={estadoColor(f.estado) as any} />
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {f.estado === "BORRADOR" && (
                        <Button size="sm" onClick={() => timbrar(f.id)} disabled={busy === f.id}>
                          {busy === f.id ? "Timbrando…" : "Timbrar"}
                        </Button>
                      )}
                      <button onClick={() => abrirDetalle(f)} title="Ver detalles"
                        className={`p-2 rounded-lg transition-all ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-black/5 text-slate-600"}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {f.estado === "TIMBRADA" && (
                        <>
                          <button onClick={() => descargar(f, "pdf")} disabled={busy === f.id} title="Ver / descargar PDF"
                            className="p-2 rounded-lg transition-all text-rose-500 hover:bg-rose-500/10 disabled:opacity-40">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => descargar(f, "xml")} disabled={busy === f.id} title="Descargar XML"
                            className="p-2 rounded-lg transition-all text-sky-500 hover:bg-sky-500/10 disabled:opacity-40">
                            <FileCode2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={6} className={`text-center py-10 ${t.textTertiary}`}>
                  {loading ? "Cargando…" : "Sin facturas que coincidan."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold ${
          toast.type === "ok"
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
            : "bg-rose-500/15 border-rose-500/40 text-rose-300"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <DetalleModal
          f={detalle} t={t} isDark={isDark}
          tipoLabel={TIPO_LABEL[detalle.tipo_comprobante || "I"] || detalle.tipo_comprobante || "—"}
          onClose={() => setDetalle(null)}
          onTimbrar={() => { timbrar(detalle.id); setDetalle(null); }}
          onDescargar={(accion) => descargar(detalle, accion)}
          estadoColor={estadoColor}
          EstadoIcon={EstadoIcon}
          busy={busy === detalle.id}
        />
      )}
    </div>
  );
}

function KpiCard({ t, label, value, color, icon }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${t.divider} ${t.surface || ""}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textTertiary}`}>{label}</span>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: color + "1f", color }}>{icon}</span>
      </div>
      <div className={`text-2xl font-black mt-2 ${t.textPrimary}`}>{value}</div>
    </div>
  );
}

function DetalleModal({ f, t, isDark, tipoLabel, onClose, onTimbrar, onDescargar, estadoColor, EstadoIcon, busy }: any) {
  const money = (v?: string | number) =>
    `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const errorPac = f.estado === "ERROR" ? (f.log_pac?.response?.message || f.log_pac?.response?.message?.message) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${t.divider}`}
        style={{ background: isDark ? "#0F172A" : "#FFFFFF" }}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-start justify-between p-6 border-b ${t.divider}`}
          style={{ background: isDark ? "#0F172A" : "#FFFFFF" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black ${t.textPrimary}`}>{f.serie_letra}-{f.folio}</h2>
                <Badge text={f.estado} type={estadoColor(f.estado)} />
              </div>
              <p className={`text-xs ${t.textSecondary}`}>CFDI 4.0 · {tipoLabel} · {f.moneda || "MXN"}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"} ${t.textSecondary}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error del PAC */}
          {errorPac && (
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm">
              <p className="font-bold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Error al timbrar</p>
              <p className="text-xs opacity-90 break-words">{typeof errorPac === "string" ? errorPac : JSON.stringify(errorPac)}</p>
            </div>
          )}

          {/* Receptor + datos fiscales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoBlock t={t} title="Receptor">
              <Row t={t} k="Razón social" v={f.cliente_data?.razon_social} />
              <Row t={t} k="RFC" v={f.cliente_data?.rfc} mono />
              <Row t={t} k="Régimen" v={f.cliente_data?.regimen_fiscal} />
              <Row t={t} k="CP fiscal" v={f.cliente_data?.cp_fiscal} mono />
              <Row t={t} k="Uso CFDI" v={f.uso_cfdi} mono />
            </InfoBlock>
            <InfoBlock t={t} title="Datos del comprobante">
              <Row t={t} k="Tipo" v={tipoLabel} />
              <Row t={t} k="Forma de pago" v={f.forma_pago} mono />
              <Row t={t} k="Método de pago" v={f.metodo_pago} mono />
              <Row t={t} k="Emisión" v={f.fecha_emision ? new Date(f.fecha_emision).toLocaleString("es-MX") : "—"} />
              <Row t={t} k="Timbrado" v={f.fecha_timbrado ? new Date(f.fecha_timbrado).toLocaleString("es-MX") : "—"} />
            </InfoBlock>
          </div>

          {/* UUID */}
          {f.folio_fiscal && (
            <div className={`p-4 rounded-xl border ${t.divider}`} style={{ background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.05)" }}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${t.textTertiary} mb-1`}>Folio fiscal (UUID SAT)</p>
              <p className={`font-mono text-sm font-bold ${t.textPrimary} break-all`}>{f.folio_fiscal}</p>
            </div>
          )}

          {/* Conceptos */}
          <div>
            <h3 className={`text-sm font-black uppercase tracking-wide ${t.textPrimary} mb-2`}>Conceptos</h3>
            <div className={`rounded-xl border overflow-hidden ${t.divider}`}>
              <table className="w-full text-sm">
                <thead className={`text-left text-[10px] uppercase tracking-wide ${t.textTertiary} ${isDark ? "bg-white/[0.03]" : "bg-black/[0.02]"}`}>
                  <tr>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">P. Unitario</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {(f.conceptos || []).map((c: any) => (
                    <tr key={c.id} className={`border-t ${t.divider}`}>
                      <td className={`px-3 py-2 ${t.textPrimary}`}>
                        <div className="font-semibold">{c.descripcion}</div>
                        <div className={`text-[10px] font-mono ${t.textTertiary}`}>{c.clave_prod_serv} · {c.clave_unidad}</div>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${t.textSecondary}`}>{Number(c.cantidad)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${t.textSecondary}`}>{money(c.precio_unitario)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${t.textPrimary}`}>{money(Number(c.cantidad) * Number(c.precio_unitario))}</td>
                    </tr>
                  ))}
                  {(!f.conceptos || f.conceptos.length === 0) && (
                    <tr><td colSpan={4} className={`text-center py-4 ${t.textTertiary}`}>Sin conceptos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-1.5">
              <TotalRow t={t} k="Subtotal" v={money(f.subtotal)} />
              {Number(f.iva_trasladado) > 0 && <TotalRow t={t} k="IVA trasladado" v={money(f.iva_trasladado)} />}
              {Number(f.iva_retenido) > 0 && <TotalRow t={t} k="IVA retenido" v={`- ${money(f.iva_retenido)}`} />}
              {Number(f.isr_retenido) > 0 && <TotalRow t={t} k="ISR retenido" v={`- ${money(f.isr_retenido)}`} />}
              <div className={`flex justify-between pt-2 mt-1 border-t ${t.divider}`}>
                <span className={`font-black ${t.textPrimary}`}>Total</span>
                <span className={`font-black text-lg ${t.textPrimary}`}>{money(f.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer acciones */}
        <div className={`sticky bottom-0 flex flex-wrap items-center justify-end gap-2 p-4 border-t ${t.divider}`}
          style={{ background: isDark ? "#0F172A" : "#FFFFFF" }}>
          {f.estado === "BORRADOR" && (
            <Button onClick={onTimbrar} disabled={busy}>{busy ? "Timbrando…" : "Timbrar ahora"}</Button>
          )}
          {f.estado === "TIMBRADA" && (
            <>
              <Button variant="secondary" onClick={() => onDescargar("pdf")} disabled={busy}>
                <FileText className="w-4 h-4" /> Ver PDF
              </Button>
              <Button variant="secondary" onClick={() => onDescargar("xml")} disabled={busy}>
                <Download className="w-4 h-4" /> Descargar XML
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ t, title, children }: any) {
  return (
    <div className={`rounded-xl border p-4 ${t.divider}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${t.textTertiary} mb-2`}>{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ t, k, v, mono }: any) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${t.textTertiary}`}>{k}</span>
      <span className={`text-sm font-semibold text-right ${t.textPrimary} ${mono ? "font-mono" : ""}`}>{v || "—"}</span>
    </div>
  );
}
function TotalRow({ t, k, v }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className={t.textSecondary}>{k}</span>
      <span className={`font-mono font-semibold ${t.textPrimary}`}>{v}</span>
    </div>
  );
}
