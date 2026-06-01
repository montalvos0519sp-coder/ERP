"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Save, Trash2 } from "lucide-react";

import { Button, Card, Combobox, Input, Select, type ComboOption } from "@/components/ui";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Concepto {
  descripcion: string;
  clave_prod_serv: string;
  clave_unidad: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  objeto_imp: string;
  tasa_iva: number;
  no_identificacion: string;
}

const conceptoVacio: Concepto = {
  descripcion: "",
  clave_prod_serv: "",
  clave_unidad: "",
  unidad: "",
  cantidad: 1,
  precio_unitario: 0,
  descuento: 0,
  objeto_imp: "02",
  tasa_iva: 0.16,
  no_identificacion: "",
};

export default function NuevaFacturaPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();
  const router = useRouter();

  const [clientes, setClientes] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  // Catalogos SAT
  const [usosCfdi, setUsosCfdi] = useState<any[]>([]);
  const [formasPago, setFormasPago] = useState<any[]>([]);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);

  const [clienteId, setClienteId] = useState<number | "">("");
  const [serieId, setSerieId] = useState<number | "">("");
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [formaPago, setFormaPago] = useState("99");
  const [metodoPago, setMetodoPago] = useState("PUE");
  const [moneda, setMoneda] = useState("MXN");
  const [conceptos, setConceptos] = useState<Concepto[]>([{ ...conceptoVacio }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!empresaActivaId) return;
    api.getClientes({ empresa: String(empresaActivaId) })
      .then((r) => setClientes(r.results || [])).catch(() => {});
    api.getSeries().then((r) => setSeries(r.results || [])).catch(() => {});
    api.getUsosCFDI().then((r) => setUsosCfdi(r.results || [])).catch(() => {});
    api.getFormasPago().then((r) => setFormasPago(r.results || [])).catch(() => {});
    api.getMetodosPago().then((r) => setMetodosPago(r.results || [])).catch(() => {});
    apiFetchMonedas()
      .then(setMonedas)
      .catch(() => setMonedas([
        { clave: "MXN", descripcion: "Peso Mexicano" },
        { clave: "USD", descripcion: "Dolar americano" },
        { clave: "EUR", descripcion: "Euro" },
      ]));
  }, [empresaActivaId]);

  const totales = useMemo(() => {
    let subtotal = 0, iva = 0;
    conceptos.forEach((c) => {
      const base = (Number(c.cantidad) * Number(c.precio_unitario)) - Number(c.descuento);
      subtotal += base;
      iva += base * Number(c.tasa_iva);
    });
    return { subtotal, iva, total: subtotal + iva };
  }, [conceptos]);

  // ── Searchers para los comboboxes ────────────────────────────────────
  const searchClaveProdServ = async (q: string): Promise<ComboOption[]> => {
    if (q.length < 2) return [];
    try {
      const r = await api.buscarClaveProdServ(q);
      return (r.results || []).map((x: any) => ({
        id: x.clave, label: x.clave, description: x.descripcion, raw: x,
      }));
    } catch { return []; }
  };

  const searchClaveUnidad = async (q: string): Promise<ComboOption[]> => {
    if (q.length < 1) return [];
    try {
      const r = await apiSearchUnidad(q);
      return r.map((x: any) => ({
        id: x.clave, label: x.clave, description: `${x.nombre}${x.simbolo ? ` (${x.simbolo})` : ""}`, raw: x,
      }));
    } catch { return []; }
  };

  const updateConcepto = (idx: number, patch: Partial<Concepto>) => {
    setConceptos((arr) => arr.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const submit = async () => {
    if (!empresaActivaId || !clienteId || !serieId) {
      setError("Selecciona cliente y serie.");
      return;
    }
    setSaving(true); setError("");
    try {
      await api.crearFactura({
        empresa: empresaActivaId,
        cliente: clienteId,
        serie: serieId,
        uso_cfdi: usoCfdi,
        forma_pago: formaPago,
        metodo_pago: metodoPago,
        moneda,
        tipo_comprobante: "I",
        conceptos: conceptos.map((c) => ({ ...c })),
      });
      router.push("/facturacion");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/facturacion" className={`p-2 rounded-xl ${theme.surfaceElevated} hover:scale-105 transition-all`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Nueva factura CFDI 4.0</h1>
          <p className={`text-sm ${theme.textSecondary}`}>Captura los conceptos con autocompletado SAT.</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}

      <Card title="Datos generales" subtitle="Escribe en cualquier campo para buscar. Aceptan tanto clave como descripcion.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <FieldLabel label="Cliente" required>
            <Combobox
              value={clienteId ? (clientes.find((c) => c.id === clienteId)?.razon_social || "") : ""}
              onChange={(_v, opt) => setClienteId(opt?.raw?.id || "")}
              search={async (q) => {
                const matches = !q
                  ? clientes.slice(0, 30)
                  : clientes.filter((c) =>
                      (c.razon_social || "").toLowerCase().includes(q.toLowerCase()) ||
                      (c.rfc || "").toLowerCase().includes(q.toLowerCase()),
                    ).slice(0, 30);
                return matches.map((c) => ({
                  id: c.id, label: c.razon_social, description: c.rfc, raw: c,
                }));
              }}
              placeholder="Escribe razon social o RFC..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>

          <FieldLabel label="Serie" required>
            <Combobox
              value={serieId ? (series.find((s) => s.id === serieId)?.letra || "") : ""}
              onChange={(_v, opt) => setSerieId(opt?.raw?.id || "")}
              search={async (q) => {
                const matches = !q
                  ? series
                  : series.filter((s) =>
                      (s.letra || "").toLowerCase().includes(q.toLowerCase()) ||
                      (s.descripcion || "").toLowerCase().includes(q.toLowerCase()),
                    );
                return matches.map((s) => ({
                  id: s.id, label: s.letra, description: s.descripcion, raw: s,
                }));
              }}
              placeholder="A, F, CP..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>

          <FieldLabel label="Uso CFDI" required>
            <Combobox
              value={usoCfdi}
              onChange={(v, opt) => setUsoCfdi(opt ? opt.label : v)}
              search={async (q) => {
                const list = usosCfdi.length ? usosCfdi : [{ clave: "G03", descripcion: "Gastos en general" }];
                const matches = !q
                  ? list
                  : list.filter((u: any) =>
                      (u.clave || "").toLowerCase().includes(q.toLowerCase()) ||
                      (u.descripcion || "").toLowerCase().includes(q.toLowerCase()),
                    );
                return matches.map((u: any) => ({
                  id: u.clave, label: u.clave, description: u.descripcion, raw: u,
                }));
              }}
              placeholder="G03, S01, gastos..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>

          <FieldLabel label="Forma de pago" required>
            <Combobox
              value={formaPago}
              onChange={(v, opt) => setFormaPago(opt ? opt.label : v)}
              search={async (q) => {
                const list = formasPago.length ? formasPago : [{ clave: "99", descripcion: "Por definir" }];
                const matches = !q
                  ? list
                  : list.filter((f: any) =>
                      (f.clave || "").toLowerCase().includes(q.toLowerCase()) ||
                      (f.descripcion || "").toLowerCase().includes(q.toLowerCase()),
                    );
                return matches.map((f: any) => ({
                  id: f.clave, label: f.clave, description: f.descripcion, raw: f,
                }));
              }}
              placeholder="01 efectivo, 03 transferencia..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>

          <FieldLabel label="Metodo de pago" required>
            <Combobox
              value={metodoPago}
              onChange={(v, opt) => setMetodoPago(opt ? opt.label : v)}
              search={async (q) => {
                const list = metodosPago.length ? metodosPago : [
                  { clave: "PUE", descripcion: "Pago en una sola exhibicion" },
                  { clave: "PPD", descripcion: "Pago en parcialidades o diferido" },
                ];
                const matches = !q
                  ? list
                  : list.filter((m: any) =>
                      (m.clave || "").toLowerCase().includes(q.toLowerCase()) ||
                      (m.descripcion || "").toLowerCase().includes(q.toLowerCase()),
                    );
                return matches.map((m: any) => ({
                  id: m.clave, label: m.clave, description: m.descripcion, raw: m,
                }));
              }}
              placeholder="PUE, PPD..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>

          <FieldLabel label="Moneda" required>
            <Combobox
              value={moneda}
              onChange={(v, opt) => setMoneda(opt ? opt.label : v)}
              search={async (q) => {
                const list = monedas.length ? monedas : [{ clave: "MXN", descripcion: "Peso Mexicano" }];
                const matches = !q
                  ? list
                  : list.filter((m: any) =>
                      (m.clave || "").toLowerCase().includes(q.toLowerCase()) ||
                      (m.descripcion || "").toLowerCase().includes(q.toLowerCase()),
                    );
                return matches.map((m: any) => ({
                  id: m.clave, label: m.clave, description: m.descripcion, raw: m,
                }));
              }}
              placeholder="MXN, USD, EUR..."
              showAllOnOpen
              minChars={0}
            />
          </FieldLabel>
        </div>
      </Card>

      <Card title="Conceptos" subtitle="Escribe para buscar en el catalogo SAT — autocompletado en tiempo real."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setConceptos([...conceptos, { ...conceptoVacio }])}>
            <Plus className="w-4 h-4" /> Agregar concepto
          </Button>
        }>
        <div className="space-y-4">
          {conceptos.map((c, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${theme.divider}`}
              style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#10B981,#14B8A6)" }}>
                    {i + 1}
                  </div>
                  <span className={`text-sm font-bold ${theme.textPrimary}`}>Concepto {i + 1}</span>
                </div>
                {conceptos.length > 1 && (
                  <button onClick={() => setConceptos(conceptos.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {/* Descripcion libre - el usuario escribe lo que quiera */}
                <FieldLabel label="Descripcion" required className="md:col-span-3">
                  <input
                    className={inputClass(isDark)}
                    value={c.descripcion}
                    onChange={(e) => updateConcepto(i, { descripcion: e.target.value })}
                    placeholder="Describe el bien o servicio..."
                  />
                </FieldLabel>

                {/* Clave ProdServ SAT con autocompletado */}
                <FieldLabel label="Clave Prod/Serv (SAT)" required className="md:col-span-3">
                  <Combobox
                    value={c.clave_prod_serv}
                    onChange={(v, opt) => updateConcepto(i, { clave_prod_serv: opt ? opt.label : v })}
                    search={searchClaveProdServ}
                    placeholder="Escribe clave o descripcion (ej: 78101, transporte)..."
                    minChars={2}
                  />
                </FieldLabel>

                {/* Clave Unidad SAT con autocompletado */}
                <FieldLabel label="Clave Unidad (SAT)" required className="md:col-span-2">
                  <Combobox
                    value={c.clave_unidad}
                    onChange={(v, opt) => {
                      if (opt) updateConcepto(i, { clave_unidad: opt.label, unidad: opt.raw?.nombre || c.unidad });
                      else updateConcepto(i, { clave_unidad: v });
                    }}
                    search={searchClaveUnidad}
                    placeholder="H87, KGM, MTR..."
                    minChars={1}
                  />
                </FieldLabel>

                <FieldLabel label="Unidad" className="md:col-span-2">
                  <input className={inputClass(isDark)} value={c.unidad}
                    onChange={(e) => updateConcepto(i, { unidad: e.target.value })} placeholder="Pieza" />
                </FieldLabel>
                <FieldLabel label="Cantidad">
                  <input type="number" step="0.001" min="0" className={inputClass(isDark)} value={c.cantidad}
                    onChange={(e) => updateConcepto(i, { cantidad: Number(e.target.value) })} />
                </FieldLabel>
                <FieldLabel label="Precio unit.">
                  <input type="number" step="0.01" min="0" className={inputClass(isDark)} value={c.precio_unitario}
                    onChange={(e) => updateConcepto(i, { precio_unitario: Number(e.target.value) })} />
                </FieldLabel>

                <FieldLabel label="Descuento">
                  <input type="number" step="0.01" min="0" className={inputClass(isDark)} value={c.descuento}
                    onChange={(e) => updateConcepto(i, { descuento: Number(e.target.value) })} />
                </FieldLabel>
                <FieldLabel label="Tasa IVA">
                  <TasaIVASelector value={c.tasa_iva} onChange={(v) => updateConcepto(i, { tasa_iva: v })} isDark={isDark} />
                </FieldLabel>
                <FieldLabel label="Objeto impuesto">
                  <select className={inputClass(isDark)} value={c.objeto_imp}
                    onChange={(e) => updateConcepto(i, { objeto_imp: e.target.value })}>
                    <option value="01">01 - No objeto</option>
                    <option value="02">02 - Si objeto</option>
                    <option value="03">03 - Si y no obligado</option>
                  </select>
                </FieldLabel>
              </div>

              {/* Subtotal del concepto */}
              <div className={`mt-3 pt-3 border-t ${theme.divider} text-right text-xs ${theme.textSecondary}`}>
                Importe: <span className={`font-mono font-bold ${theme.textPrimary}`}>
                  ${((Number(c.cantidad) * Number(c.precio_unitario)) - Number(c.descuento)).toFixed(2)}
                </span>
                {" + IVA "}<span className={`font-mono ${theme.textPrimary}`}>
                  ${(((Number(c.cantidad) * Number(c.precio_unitario)) - Number(c.descuento)) * Number(c.tasa_iva)).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Footer totales + acciones */}
      <Card>
        <div className="flex flex-wrap items-center justify-end gap-6">
          <div className={`text-sm ${theme.textSecondary}`}>
            Subtotal: <span className={`font-mono font-bold ${theme.textPrimary}`}>${totales.subtotal.toFixed(2)}</span>
          </div>
          <div className={`text-sm ${theme.textSecondary}`}>
            IVA: <span className={`font-mono font-bold ${theme.textPrimary}`}>${totales.iva.toFixed(2)}</span>
          </div>
          <div className={`text-lg ${theme.textPrimary} font-black`}>
            TOTAL: <span className="text-emerald-400">${totales.total.toFixed(2)}</span>
          </div>
          <Button onClick={submit} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Crear factura"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Helper para buscar unidades (no estaba en api.ts).
async function apiSearchUnidad(q: string): Promise<any[]> {
  const base = process.env.NEXT_PUBLIC_API_URL || ""; // "" => mismo origen (proxy de Next)
  const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
  const res = await fetch(`${base}/api/catalogos-sat/clave-unidad/?search=${encodeURIComponent(q)}&page_size=20`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) return [];
  const d = await res.json();
  return d.results || [];
}

function FieldLabel({ label, required, children, className = "" }: any) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-slate-400">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function inputClass(dark: boolean) {
  return dark
    ? "w-full bg-[#1E293B]/40 border border-white/[0.05] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#14B8A6]/50 focus:shadow-[0_0_15px_rgba(20,184,166,0.1)] transition-all"
    : "w-full bg-white/80 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A73E8]/50 transition-all";
}

async function apiFetchMonedas(): Promise<any[]> {
  const base = process.env.NEXT_PUBLIC_API_URL || ""; // "" => mismo origen (proxy de Next)
  const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : null;
  const res = await fetch(`${base}/api/catalogos-sat/moneda/?page_size=50`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("Sin monedas");
  const d = await res.json();
  return d.results || [];
}

/**
 * Selector de Tasa IVA con opcion Manual/Especifica.
 * Opciones predefinidas: 16%, 8% (frontera), 0%. La cuarta opcion permite
 * capturar manualmente una tasa custom (ej. 7%, 12.5%, etc.).
 */
function TasaIVASelector({ value, onChange, isDark }: { value: number; onChange: (v: number) => void; isDark: boolean }) {
  // Si el valor no esta entre las opciones predefinidas, abrimos modo manual.
  const PRESETS = [0.16, 0.08, 0];
  const [manual, setManual] = React.useState(!PRESETS.includes(Number(value)));
  const [manualVal, setManualVal] = React.useState<string>(
    !PRESETS.includes(Number(value)) ? String(Number(value) * 100) : "",
  );

  // Si cambia el value externo a un preset, salimos del modo manual.
  React.useEffect(() => {
    if (PRESETS.includes(Number(value))) {
      setManual(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-1.5">
      <select
        className={inputClass(isDark)}
        value={manual ? "manual" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "manual") {
            setManual(true);
            // No cambies el valor todavia; deja que el usuario lo capture.
          } else {
            setManual(false);
            onChange(Number(v));
          }
        }}
      >
        <option value="manual">Manual / Especifica...</option>
        <option value="0.16">16%</option>
        <option value="0.08">8% (frontera)</option>
        <option value="0">0% (exento)</option>
      </select>
      {manual && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ej. 7.5"
            className={`${inputClass(isDark)} pr-7 text-right font-mono`}
            value={manualVal}
            onChange={(e) => {
              setManualVal(e.target.value);
              const num = Number(e.target.value);
              if (!isNaN(num)) onChange(num / 100);
            }}
          />
          <span className="text-xs font-bold text-slate-400">%</span>
        </div>
      )}
    </div>
  );
}
