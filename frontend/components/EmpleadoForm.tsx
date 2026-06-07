"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Plus, Trash2, AlertTriangle, CheckCircle, Eye,
  User, Briefcase, Home, Users, FileText, CreditCard, DollarSign,
  Truck, History, Download, FileArchive, Camera, RefreshCw, Clock,
  Building2, Phone, X, Sparkles, ChevronRight, ChevronDown, Search, ExternalLink,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import Combobox from "@/components/Combobox";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SelectOption { id: string | number; nombre: string; }
interface ContratoItem {
  _key: number; id?: number;
  tipo_contrato: string; fecha_inicio: string; fecha_fin: string;
  comentarios: string; archivo?: File | null; archivo_url?: string;
}
interface SalarioItem {
  _key: number; id?: number;
  sueldo_diario: string; fecha_efectiva: string; observaciones: string;
}
interface HijoItem { _key: number; id?: number; nombre: string; fecha_nacimiento: string; }
interface HistorialItem {
  _key: number; id?: number;
  tipo_evento: string; fecha_inicio: string; fecha_fin: string;
  puesto: string; departamento_id: string; descripcion: string;
  motivo_salida: string; archivo?: File | null; archivo_url?: string;
}
interface DocOperadorItem {
  _key: number; id?: number;
  tipo_documento: string; numero_documento: string;
  fecha_expedicion: string; fecha_vencimiento: string;
  observaciones: string; archivo?: File | null; archivo_url?: string;
}
interface FormState {
  nombre: string; apellido: string; email: string;
  telefono_personal: string; fecha_contratacion: string; numero_empleado: string;
  puesto_id: string; departamento_id: string; supervisor_id: string;
  fecha_nacimiento: string; estado_civil: string; nacionalidad: string;
  curp: string; rfc: string; nss: string;
  nombre_conyuge: string; telefono_conyuge: string;
  direccion: string; codigo_postal: string; colonia: string;
  ciudad: string; estado_addr: string; pais: string;
  nombre_referencia_1: string; telefono_referencia_1: string; relacion_referencia_1: string;
  nombre_referencia_2: string; telefono_referencia_2: string; relacion_referencia_2: string;
  empresa: string; lugar_id: string;
  /**
   * "División Operativa" en la UI = M2M a `ternium.Empresa` (catálogo de
   * Empresas). El backend persiste estos IDs en `Empleado.empresas`.
   */
  empresas_ids: string[];
  banco: string; numero_cuenta: string; numero_tarjeta: string; clabe_interbancaria: string;
  activo: boolean;
}
type TabKey = "personal" | "familia" | "operativa" | "contratos" | "salario" | "bancarios" | "documentos" | "doc_operador" | "historial";

// ─── Constants ──────────────────────────────────────────────────────────────────

const TIPO_EVENTO_OPTS: SelectOption[] = [
  { id: "ACTA_ADMINISTRATIVA", nombre: "Acta Administrativa" },
  { id: "SUSPENSION",          nombre: "Suspensión" },
  { id: "INCAPACIDAD",         nombre: "Incapacidad" },
  { id: "PERMISO",             nombre: "Permiso" },
  { id: "RENUNCIA",            nombre: "Renuncia" },
  { id: "BAJA",                nombre: "Baja" },
  { id: "ABANDONO",            nombre: "Abandono" },
  { id: "CAMBIO_PUESTO",       nombre: "Cambio de Puesto" },
  { id: "RECONTRATACION",      nombre: "Recontratación" },
];
const TIPO_CONTRATO_OPTS: SelectOption[] = [
  { id: "INDETERMINADO", nombre: "Tiempo Indeterminado" },
  { id: "DETERMINADO",   nombre: "Tiempo Determinado" },
  { id: "HONORARIOS",    nombre: "Honorarios" },
  { id: "PRACTICAS",     nombre: "Prácticas Profesionales" },
];
const BANCO_OPTS: SelectOption[] = [
  { id: "BBVA",             nombre: "BBVA México" },
  { id: "BANAMEX",          nombre: "Citibanamex" },
  { id: "SANTANDER",        nombre: "Santander" },
  { id: "BANORTE",          nombre: "Banorte" },
  { id: "HSBC",             nombre: "HSBC" },
  { id: "SCOTIABANK",       nombre: "Scotiabank" },
  { id: "INBURSA",          nombre: "Inbursa" },
  { id: "AZTECA",           nombre: "Banco Azteca" },
  { id: "BANBAJIO",         nombre: "Banco del Bajío (BanBajío)" },
  { id: "AFIRME",           nombre: "Afirme" },
  { id: "BANSI",            nombre: "Bansí" },
  { id: "MIFEL",            nombre: "Banca Mifel" },
  { id: "MULTIVA",          nombre: "Multiva" },
  { id: "INVEX",            nombre: "Invex Banco" },
  { id: "BX_MAS",           nombre: "Ve por Más (BX+)" },
  { id: "INTERACCIONES",    nombre: "Banco Interacciones" },
  { id: "COMPARTAMOS",      nombre: "Compartamos Banco" },
  { id: "CI_BANCO",         nombre: "CI Banco" },
  { id: "ACTINVER",         nombre: "Actinver" },
  { id: "SABADELL",         nombre: "Sabadell" },
  { id: "INMOBILIARIO",     nombre: "Banco Inmobiliario Mexicano" },
  { id: "BANREGIO",         nombre: "Banregio" },
  { id: "HEY_BANCO",        nombre: "Hey Banco (Banregio)" },
  { id: "NU_BANK",          nombre: "Nu (Nubank)" },
  { id: "MERCADO_PAGO",     nombre: "Mercado Pago" },
  { id: "SPIN_OXXO",        nombre: "Spin by OXXO" },
  { id: "FONDEADORA",       nombre: "Fondeadora" },
  { id: "BROXEL",           nombre: "Broxel" },
  { id: "BANJERCITO",       nombre: "Banjército" },
  { id: "BANBIENESTAR",     nombre: "Banco del Bienestar (Bansefi)" },
  { id: "NAFIN",            nombre: "Nacional Financiera (Nafin)" },
  { id: "BANCOMEXT",        nombre: "Bancomext" },
  { id: "JP_MORGAN",        nombre: "J.P. Morgan" },
  { id: "DEUTSCHE",         nombre: "Deutsche Bank México" },
  { id: "CREDIT_SUISSE",    nombre: "Credit Suisse" },
  { id: "OTRO",             nombre: "Otro" },
];

const ESTADO_CIVIL_OPTS: SelectOption[] = [
  { id: "soltero", nombre: "Soltero(a)" }, { id: "casado", nombre: "Casado(a)" },
  { id: "divorciado", nombre: "Divorciado(a)" }, { id: "viudo", nombre: "Viudo(a)" },
  { id: "union_libre", nombre: "Unión Libre" },
];
const DEFAULT: FormState = {
  nombre: "", apellido: "", email: "", telefono_personal: "", fecha_contratacion: "",
  numero_empleado: "", puesto_id: "", departamento_id: "", supervisor_id: "",
  fecha_nacimiento: "", estado_civil: "", nacionalidad: "Mexicana", curp: "", rfc: "", nss: "",
  nombre_conyuge: "", telefono_conyuge: "",
  direccion: "", codigo_postal: "", colonia: "", ciudad: "", estado_addr: "", pais: "México",
  nombre_referencia_1: "", telefono_referencia_1: "", relacion_referencia_1: "",
  nombre_referencia_2: "", telefono_referencia_2: "", relacion_referencia_2: "",
  empresa: "", lugar_id: "", empresas_ids: [],
  banco: "", numero_cuenta: "", numero_tarjeta: "", clabe_interbancaria: "",
  activo: true,
};
const REQUIRED_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "nombre",             label: "Nombre(s)" },
  { key: "apellido",           label: "Apellido(s)" },
  { key: "email",              label: "Correo Electrónico" },
  { key: "fecha_contratacion", label: "Fecha de Contratación" },
  { key: "puesto_id",          label: "Puesto" },
  { key: "departamento_id",    label: "Departamento" },
  { key: "curp",               label: "CURP" },
  { key: "rfc",                label: "RFC" },
  { key: "nss",                label: "NSS" },
];

const CURP_RE = /^[A-Z]{4}\d{6}[HM](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const RFC_RE  = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const NSS_RE  = /^\d{11}$/;

const FORMAT_RULES: { key: keyof FormState; label: string; re: RegExp; hint: string }[] = [
  { key: "curp", label: "CURP", re: CURP_RE, hint: "18 caracteres con formato oficial" },
  { key: "rfc",  label: "RFC",  re: RFC_RE,  hint: "12 o 13 caracteres con formato oficial" },
  { key: "nss",  label: "NSS",  re: NSS_RE,  hint: "11 dígitos numéricos" },
];

let _k = 0;
const nk = () => ++_k;
const toArr = (d: unknown): SelectOption[] =>
  Array.isArray(d) ? d : Array.isArray((d as Record<string, unknown>)?.results)
    ? (d as { results: SelectOption[] }).results : [];

// ─── Design tokens ─────────────────────────────────────────────────────────────

const G    = "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)";
const GLOW = "rgba(124, 58, 237, 0.25)";

const ANIM_CSS = `
@keyframes fadeSlideUp {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes shimmer {
  from { background-position:-400px 0; }
  to   { background-position: 400px 0; }
}
@keyframes float {
  0%,100% { transform:translateY(0px); }
  50%      { transform:translateY(-5px); }
}
@keyframes slideIn {
  from { opacity:0; transform:translateX(-8px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes pulse-ring {
  0%   { box-shadow:0 0 0 0   rgba(124,58,237,.4); }
  70%  { box-shadow:0 0 0 8px rgba(124,58,237,0); }
  100% { box-shadow:0 0 0 0   rgba(124,58,237,0); }
}
@keyframes blob {
  0%,100% { border-radius:60% 40% 30% 70%/60% 30% 70% 40%; transform:translate(0,0) scale(1); }
  33%      { border-radius:40% 60% 50% 50%/30% 60% 40% 70%; transform:translate(18px,-25px) scale(1.04); }
  66%      { border-radius:50% 40% 70% 30%/50% 70% 30% 50%; transform:translate(-12px,18px) scale(0.96); }
}
@keyframes shake {
  0%,100% { transform:translateX(0); }
  20%     { transform:translateX(-5px); }
  40%     { transform:translateX(5px); }
  60%     { transform:translateX(-3px); }
  80%     { transform:translateX(3px); }
}
.anim-fadeslide { animation:fadeSlideUp .35s cubic-bezier(.22,1,.36,1) both; }
.anim-float     { animation:float 3s ease-in-out infinite; }
.anim-slide-in  { animation:slideIn .28s cubic-bezier(.22,1,.36,1) both; }
.anim-shake     { animation:shake .4s ease-in-out; }
.blob-1 { animation:blob 10s ease-in-out infinite; }
.blob-2 { animation:blob 13s ease-in-out infinite 2.5s; }
`;

// ─── Form primitives ────────────────────────────────────────────────────────────

function fieldClass(err?: boolean) {
  return [
    "w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-200",
    "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100",
    "placeholder-slate-300 dark:placeholder-slate-600 shadow-sm",
    err
      ? "border-red-400 dark:border-red-600 focus:ring-red-400/30 focus:border-red-500 bg-red-50/30 dark:bg-red-950/10"
      : "border-slate-200 dark:border-slate-700 focus:ring-violet-400/30 focus:border-violet-400 hover:border-violet-300 dark:hover:border-violet-700",
    "focus:outline-none focus:ring-2",
  ].join(" ");
}
const readCls = "w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-default select-none";

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1 text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-red-400 text-xs font-black">*</span>}
    </label>
  );
}

function Inp({ value, onChange, placeholder, type = "text", mono = false, readOnly = false, err = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; mono?: boolean; readOnly?: boolean; err?: boolean;
}) {
  return (
    <input type={type} value={value} readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
      className={`${readOnly ? readCls : fieldClass(err)} ${mono ? "font-mono tracking-wide" : ""}`} />
  );
}

function Sel({ value, onChange, options, placeholder = "Buscar o seleccionar…", err = false }: {
  value: string; onChange: (v: string) => void; options: SelectOption[]; placeholder?: string; err?: boolean;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const selected   = options.find(o => String(o.id) === value);
  const [query, setQuery]   = useState("");
  const [open,  setOpen]    = useState(false);
  const [hi,    setHi]      = useState(-1);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    !query || o.nombre.toLowerCase().includes(query.toLowerCase())
  );

  const pick = (o: SelectOption) => { onChange(String(o.id)); setOpen(false); setHi(-1); };
  const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); setOpen(false); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && hi >= 0 && filtered[hi]) { e.preventDefault(); pick(filtered[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };

  useEffect(() => {
    if (hi >= 0 && listRef.current) {
      listRef.current.children[hi]?.scrollIntoView({ block: "nearest" });
    }
  }, [hi]);

  return (
    <div ref={wrapRef} className="relative">
      {/* trigger */}
      <div
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={[
          "flex items-center gap-2 w-full px-3.5 py-2.5 text-sm rounded-xl border cursor-pointer",
          "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-sm",
          "transition-all duration-200 select-none",
          err
            ? "border-red-400 dark:border-red-600"
            : open
              ? "border-violet-400 ring-2 ring-violet-400/30"
              : "border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700",
        ].join(" ")}
      >
        <span className={`flex-1 truncate ${!selected ? "text-slate-400 dark:text-slate-500" : ""}`}>
          {selected ? selected.nombre : placeholder}
        </span>
        {selected && (
          <button type="button" onClick={clear} className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors shrink-0">
            <X size={13} />
          </button>
        )}
        <ChevronDown size={15} className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>

      {/* dropdown */}
      {open && (
        <div className="absolute z-[300] mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          {/* search */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setHi(0); }}
                onKeyDown={onKey}
                placeholder="Buscar…"
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setHi(-1); inputRef.current?.focus(); }}>
                  <X size={12} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                </button>
              )}
            </div>
          </div>
          {/* options */}
          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">Sin resultados</li>
            ) : filtered.map((o, i) => {
              const active = String(o.id) === value;
              const highlighted = i === hi;
              return (
                <li
                  key={o.id}
                  onMouseDown={() => pick(o)}
                  onMouseEnter={() => setHi(i)}
                  className={[
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer transition-colors",
                    highlighted
                      ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                      : active
                        ? "bg-violet-50/60 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                  ].join(" ")}
                >
                  {active && <CheckCircle size={13} className="text-violet-500 shrink-0" />}
                  <span className={`flex-1 truncate font-medium ${active ? "" : "pl-[21px]"}`}>{o.nombre}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Textarea({ value, onChange, rows = 2, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
      placeholder={placeholder} className={`${fieldClass()} resize-none`} />
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>;
}

function IconInput({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch">
      <span className="flex items-center justify-center px-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 border-r-0 rounded-l-xl shrink-0 text-violet-400">
        <Icon size={14} />
      </span>
      <div className="flex-1 [&>input]:rounded-l-none [&>input]:border-l-0 [&>select]:rounded-l-none [&>select]:border-l-0">
        {children}
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800/60 text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-400 transition-all duration-200 group">
      <Plus size={13} className="group-hover:rotate-90 transition-transform duration-200" /> {label}
    </button>
  );
}

function FileDropzone({ file, url, onChange, label = "Adjuntar archivo" }: {
  file?: File | null; url?: string; onChange: (f: File | null) => void; label?: string;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 transition-all duration-200 group">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-950/40 flex items-center justify-center transition-colors shrink-0">
        <FileText size={14} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 truncate flex-1 group-hover:text-violet-500 transition-colors">
        {file?.name ?? label}
      </span>
      {url && !file && (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:underline shrink-0">
          <Eye size={10} /> Ver
        </a>
      )}
      {file && (
        <button type="button" onClick={e => { e.preventDefault(); onChange(null); }}
          className="text-slate-300 hover:text-red-400 shrink-0 transition-colors"><X size={12} /></button>
      )}
      <input type="file" accept=".pdf,image/*" className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

// ─── Section card ───────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-visible">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: G, boxShadow: `0 4px 12px ${GLOW}` }}>
          <Icon size={14} />
        </div>
        <div>
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 leading-none">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function FormsetRow({ title, onRemove, children }: {
  title: string; onRemove: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-violet-200 dark:hover:border-violet-800/50 transition-all duration-300 anim-fadeslide">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: G }}>
            <FileText size={11} />
          </div>
          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        <button type="button" onClick={onRemove}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200">
          <Trash2 size={10} /> Eliminar
        </button>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
      <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-200 dark:border-slate-700">
        <Plus size={18} className="text-violet-300" />
      </div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
    </div>
  );
}

// ─── Tab contents ───────────────────────────────────────────────────────────────

function TabPersonal({ f, s, errFields }: {
  f: FormState;
  s: (k: keyof FormState) => (v: string) => void;
  errFields: Set<keyof FormState>;
}) {
  return (
    <Section icon={User} title="Datos Personales" subtitle="Información personal del empleado">
      <Row2>
        <div><Lbl>Fecha de Nacimiento</Lbl><Inp type="date" value={f.fecha_nacimiento} onChange={s("fecha_nacimiento")} /></div>
        <div>
          <Lbl>Teléfono Personal</Lbl>
          <IconInput icon={Phone}><Inp value={f.telefono_personal} onChange={s("telefono_personal")} placeholder="10 dígitos" /></IconInput>
        </div>
      </Row2>
      <Row2>
        <div><Lbl>Estado Civil</Lbl><Sel value={f.estado_civil} onChange={s("estado_civil")} options={ESTADO_CIVIL_OPTS} /></div>
        <div><Lbl>Nacionalidad</Lbl><Inp value={f.nacionalidad} onChange={s("nacionalidad")} /></div>
      </Row2>
      <Row3>
        <div>
          <Lbl required>CURP</Lbl>
          <Inp value={f.curp} onChange={v => s("curp")(v.toUpperCase())} mono placeholder="AAAA000000HDFXXX00" err={errFields.has("curp")} />
          {errFields.has("curp") && <p className="text-[11px] text-red-500 mt-1 font-semibold">Formato oficial de 18 caracteres</p>}
        </div>
        <div>
          <Lbl required>RFC</Lbl>
          <Inp value={f.rfc} onChange={v => s("rfc")(v.toUpperCase())} mono placeholder="AAAA000000XXX" err={errFields.has("rfc")} />
          {errFields.has("rfc") && <p className="text-[11px] text-red-500 mt-1 font-semibold">Formato oficial de 12 o 13 caracteres</p>}
        </div>
        <div>
          <Lbl required>NSS</Lbl>
          <Inp value={f.nss} onChange={v => s("nss")(v.replace(/\D/g, ""))} mono placeholder="11 dígitos" err={errFields.has("nss")} />
          {errFields.has("nss") && <p className="text-[11px] text-red-500 mt-1 font-semibold">11 dígitos numéricos</p>}
        </div>
      </Row3>
      {errFields.size > 0 && <div className="sr-only">{errFields.size}</div>}
    </Section>
  );
}

function TabFamilia({ f, s, hijos, setHijos, colonias, cpLoading, cpNotFound }: {
  f: FormState; s: (k: keyof FormState) => (v: string) => void;
  hijos: HijoItem[]; setHijos: React.Dispatch<React.SetStateAction<HijoItem[]>>;
  colonias: string[]; cpLoading: boolean; cpNotFound: boolean;
}) {
  const cpValido = /^\d{5}$/.test(f.codigo_postal.trim());
  return (
    <div className="space-y-5">
      <Section icon={Home} title="Domicilio" subtitle="Dirección de residencia del empleado">
        <div><Lbl>Calle y Número</Lbl><Inp value={f.direccion} onChange={s("direccion")} placeholder="Calle, No. Ext, No. Int" /></div>
        <Row2>
          <div>
            <Lbl>Código Postal</Lbl>
            <div className="relative">
              <Inp value={f.codigo_postal} onChange={v => s("codigo_postal")(v.replace(/\D/g, "").slice(0, 5))} placeholder="5 dígitos" />
              {cpValido && cpLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-bold text-violet-500">
                  <RefreshCw size={11} className="animate-spin" /> Buscando...
                </span>
              )}
              {cpValido && !cpLoading && !cpNotFound && (f.estado_addr || f.ciudad) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <CheckCircle size={11} /> Encontrado
                </span>
              )}
              {cpValido && !cpLoading && cpNotFound && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                  <AlertTriangle size={11} /> No encontrado
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">
              Al capturar el CP se autocompletan estado, ciudad y colonias.
            </p>
          </div>
          <div>
            <Lbl>Colonia</Lbl>
            <input value={f.colonia} onChange={e => s("colonia")(e.target.value)} list="colonias-dl"
              placeholder={colonias.length ? `${colonias.length} colonia${colonias.length !== 1 ? "s" : ""} disponible${colonias.length !== 1 ? "s" : ""}` : "Colonia"}
              className={fieldClass()} />
            <datalist id="colonias-dl">{colonias.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </Row2>
        <Row3>
          <div><Lbl>Ciudad</Lbl><Inp value={f.ciudad} onChange={s("ciudad")} /></div>
          <div><Lbl>Estado</Lbl><Inp value={f.estado_addr} onChange={s("estado_addr")} /></div>
          <div><Lbl>País</Lbl><Inp value={f.pais} onChange={s("pais")} /></div>
        </Row3>
      </Section>
      <Section icon={Users} title="Familia" subtitle="Cónyuge e hijos">
        <Row2>
          <div><Lbl>Nombre del Cónyuge</Lbl><Inp value={f.nombre_conyuge} onChange={s("nombre_conyuge")} /></div>
          <div><Lbl>Teléfono del Cónyuge</Lbl><Inp value={f.telefono_conyuge} onChange={s("telefono_conyuge")} /></div>
        </Row2>
        <div>
          <div className="flex items-center justify-between mb-3">
            <Lbl>Hijos</Lbl>
          </div>
          <div className="space-y-2">
            {hijos.map((h, i) => (
              <div key={h._key} className="flex gap-3 items-end p-3 bg-violet-50/60 dark:bg-violet-950/10 rounded-xl border border-violet-100 dark:border-violet-900/20 anim-fadeslide">
                <div className="flex-1"><Lbl>Nombre</Lbl><Inp value={h.nombre} onChange={v => setHijos(p => p.map((x, j) => j === i ? { ...x, nombre: v } : x))} placeholder="Nombre completo" /></div>
                <div className="flex-1"><Lbl>Fecha de Nacimiento</Lbl><Inp type="date" value={h.fecha_nacimiento} onChange={v => setHijos(p => p.map((x, j) => j === i ? { ...x, fecha_nacimiento: v } : x))} /></div>
                <button type="button" onClick={() => setHijos(p => p.filter((_, j) => j !== i))}
                  className="mb-0.5 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all duration-150"><Trash2 size={13} /></button>
              </div>
            ))}
            <AddBtn label="Agregar Hijo/a" onClick={() => setHijos(p => [...p, { _key: nk(), nombre: "", fecha_nacimiento: "" }])} />
          </div>
        </div>
      </Section>
      <Section icon={Users} title="Referencias Personales" subtitle="Contactos de referencia fuera de la empresa">
        {[1, 2].map(n => (
          <div key={n} className={n === 2 ? "pt-2 mt-2 border-t border-slate-100 dark:border-slate-800" : ""}>
            <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-violet-500 mb-3">Referencia {n}</p>
            <Row3>
              <div><Lbl>Nombre Completo</Lbl><Inp value={n === 1 ? f.nombre_referencia_1 : f.nombre_referencia_2} onChange={v => n === 1 ? s("nombre_referencia_1")(v) : s("nombre_referencia_2")(v)} /></div>
              <div><Lbl>Teléfono</Lbl><Inp value={n === 1 ? f.telefono_referencia_1 : f.telefono_referencia_2} onChange={v => n === 1 ? s("telefono_referencia_1")(v) : s("telefono_referencia_2")(v)} /></div>
              <div><Lbl>Relación</Lbl><Inp value={n === 1 ? f.relacion_referencia_1 : f.relacion_referencia_2} onChange={v => n === 1 ? s("relacion_referencia_1")(v) : s("relacion_referencia_2")(v)} /></div>
            </Row3>
          </div>
        ))}
      </Section>
    </div>
  );
}

function TabOperativa({ f, setF, lugares }: {
  f: FormState; setF: React.Dispatch<React.SetStateAction<FormState>>;
  lugares: SelectOption[];
}) {
  return (
    <Section icon={Building2} title="Asignación de Empresa" subtitle="Lugar actual del empleado">
      <div>
        <Lbl>Lugar de operación</Lbl>
        {/* Combobox del catálogo de Lugares con búsqueda integrada. */}
        <Combobox
          value={f.lugar_id}
          onChange={(id: string) => setF(p => ({ ...p, lugar_id: id }))}
          options={lugares.map((l: any) => ({
            id: String(l.id),
            label: String(l.nombre || ''),
          }))}
          placeholder="Buscar lugar en el catálogo…"
          emptyHint="No se encontraron lugares con ese nombre"
        />
        {lugares.length === 0 && (
          <p className="text-[11px] text-amber-500 mt-1">
            El catálogo de lugares no tiene registros disponibles.
          </p>
        )}
      </div>
    </Section>
  );
}

function TabContratos({ contratos, setContratos }: { contratos: ContratoItem[]; setContratos: React.Dispatch<React.SetStateAction<ContratoItem[]>> }) {
  const up = (i: number, k: keyof ContratoItem, v: unknown) =>
    setContratos(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <div className="space-y-4">
      {contratos.length === 0 && <EmptyState label="Sin contratos — agrega el primero" />}
      {contratos.map((c, i) => (
        <FormsetRow key={c._key} title={`Contrato #${i + 1}`} onRemove={() => setContratos(p => p.filter((_, j) => j !== i))}>
          <div><Lbl>Tipo de Contrato</Lbl><Sel value={c.tipo_contrato} onChange={v => up(i, "tipo_contrato", v)} options={TIPO_CONTRATO_OPTS} /></div>
          <Row2>
            <div><Lbl>Fecha de Inicio</Lbl><Inp type="date" value={c.fecha_inicio} onChange={v => up(i, "fecha_inicio", v)} /></div>
            {c.tipo_contrato === "DETERMINADO" && (
              <div className="anim-fadeslide"><Lbl>Fecha de Fin</Lbl><Inp type="date" value={c.fecha_fin} onChange={v => up(i, "fecha_fin", v)} /></div>
            )}
          </Row2>
          <div><Lbl>Archivo del Contrato</Lbl><FileDropzone file={c.archivo} url={c.archivo_url} onChange={f => up(i, "archivo", f)} label="Adjuntar contrato (PDF o imagen)" /></div>
          <div><Lbl>Comentarios</Lbl><Textarea value={c.comentarios} onChange={v => up(i, "comentarios", v)} /></div>
        </FormsetRow>
      ))}
      <AddBtn label="Agregar Contrato" onClick={() => setContratos(p => [...p, { _key: nk(), tipo_contrato: "", fecha_inicio: "", fecha_fin: "", comentarios: "" }])} />
    </div>
  );
}

const MXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);
const DIAS_MES = 365 / 12; // 30.4167 — factor LFT Art. 89

function SueldoCalc({ label, value, color }: { label: string; value: number | null; color: "violet" | "sky" | "emerald" }) {
  const cls = {
    violet: "border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300",
    sky:    "border-sky-200    dark:border-sky-800/40    bg-sky-50    dark:bg-sky-950/20    text-sky-700    dark:text-sky-300",
    emerald:"border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
  }[color];
  const empty = "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500";
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div className={`px-3.5 py-2.5 text-sm rounded-xl border font-bold transition-colors ${value != null ? cls : empty}`}>
        {value != null ? MXN(value) : "—"}
      </div>
    </div>
  );
}

function TabSalario({ salarios, setSalarios }: { salarios: SalarioItem[]; setSalarios: React.Dispatch<React.SetStateAction<SalarioItem[]>> }) {
  const up = (i: number, k: keyof SalarioItem, v: string) =>
    setSalarios(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <div className="space-y-4">
      {salarios.length === 0 && <EmptyState label="Sin registros salariales — agrega el primero" />}
      {salarios.map((s, i) => {
        const daily = parseFloat(s.sueldo_diario);
        const ok    = !isNaN(daily) && daily > 0;
        return (
          <FormsetRow key={s._key} title={`Salario #${i + 1}`} onRemove={() => setSalarios(p => p.filter((_, j) => j !== i))}>
            {/* Fila 1: entrada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Lbl>Fecha Efectiva</Lbl><Inp type="date" value={s.fecha_efectiva} onChange={v => up(i, "fecha_efectiva", v)} /></div>
              <div>
                <Lbl>Sueldo Diario</Lbl>
                <IconInput icon={() => <span className="text-sm font-black text-violet-500">$</span>}>
                  <Inp value={s.sueldo_diario} onChange={v => up(i, "sueldo_diario", v)} placeholder="0.00" type="number" />
                </IconInput>
              </div>
            </div>
            {/* Fila 2: conversiones automáticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <SueldoCalc label="Sueldo Semanal"    value={ok ? daily * 7          : null} color="violet" />
              <SueldoCalc label="Sueldo Quincenal"  value={ok ? daily * 15         : null} color="sky" />
              <SueldoCalc label="Sueldo Mensual"    value={ok ? daily * 7 * 4     : null} color="emerald" />
            </div>
            <div><Lbl>Observaciones</Lbl><Textarea value={s.observaciones} onChange={v => up(i, "observaciones", v)} /></div>
          </FormsetRow>
        );
      })}
      <AddBtn label="Agregar Salario" onClick={() => setSalarios(p => [...p, { _key: nk(), sueldo_diario: "", fecha_efectiva: "", observaciones: "" }])} />
    </div>
  );
}

function TabBancarios({ f, s, setF }: { f: FormState; s: (k: keyof FormState) => (v: string) => void; setF: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <Section icon={CreditCard} title="Datos Bancarios" subtitle="Cuenta para depósito de nómina">
      <Row2>
        <div><Lbl>Banco</Lbl><Sel value={f.banco} onChange={v => setF(p => ({ ...p, banco: v }))} options={BANCO_OPTS} placeholder="Buscar banco…" /></div>
        <div><Lbl>Número de Cuenta</Lbl><Inp value={f.numero_cuenta} onChange={s("numero_cuenta")} mono /></div>
      </Row2>
      <Row2>
        <div><Lbl>Número de Tarjeta</Lbl><Inp value={f.numero_tarjeta} onChange={s("numero_tarjeta")} mono /></div>
        <div>
          <Lbl>CLABE Interbancaria</Lbl>
          <IconInput icon={CreditCard}><Inp value={f.clabe_interbancaria} onChange={s("clabe_interbancaria")} mono placeholder="18 dígitos" /></IconInput>
        </div>
      </Row2>
    </Section>
  );
}

function TabDocumentos() {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const docs = [
    { key: "ine_documento",                      label: "INE / IFE",                   color: "#6366f1" },
    { key: "comprobante_domicilio",               label: "Comprobante de Domicilio",    color: "#f97316" },
    { key: "curriculum_vitae",                    label: "Curriculum Vitae",            color: "#64748b" },
    { key: "acta_nacimiento_documento",           label: "Acta de Nacimiento",          color: "#10b981" },
    { key: "comprobante_estudios_documento",      label: "Comprobante de Estudios",     color: "#8b5cf6" },
    { key: "constancia_fiscal_documento",         label: "Constancia Fiscal (SAT)",     color: "#0ea5e9" },
    { key: "carta_recomendacion_1_documento",     label: "Carta de Recomendación 1",    color: "#ec4899" },
    { key: "carta_recomendacion_2_documento",     label: "Carta de Recomendación 2",    color: "#ec4899" },
    { key: "aviso_retencion_infonavit_documento", label: "Aviso Retención INFONAVIT",   color: "#f59e0b" },
    { key: "semanas_cotizadas_imss_documento",    label: "Semanas Cotizadas IMSS",      color: "#14b8a6" },
  ];
  return (
    <div className="space-y-3">
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Los documentos en formato PDF o imagen serán almacenados en el expediente digital del empleado.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {docs.map(d => (
          <label key={d.key} className="cursor-pointer group">
            <div className={`bg-white dark:bg-slate-900 rounded-xl border overflow-hidden transition-all duration-300 group-hover:shadow-md ${files[d.key] ? "shadow-md" : "border-slate-200 dark:border-slate-800"}`}
              style={files[d.key] ? { borderColor: d.color + "50" } : {}}>
              <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold"
                style={{ background: d.color + "12", borderBottom: `1px solid ${d.color}20`, color: d.color }}>
                <FileText size={11} />
                <span className="truncate">{d.label}</span>
                {files[d.key] && <CheckCircle size={11} className="ml-auto shrink-0" />}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <span className="text-[11px] text-slate-400 truncate flex-1">
                  {files[d.key]?.name ?? "Haz clic para adjuntar..."}
                </span>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: files[d.key] ? d.color : d.color + "15" }}>
                  {files[d.key] ? <CheckCircle size={11} className="text-white" /> : <Plus size={10} style={{ color: d.color }} />}
                </div>
              </div>
            </div>
            <input type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => setFiles(p => ({ ...p, [d.key]: e.target.files?.[0] ?? null }))} />
          </label>
        ))}
      </div>
    </div>
  );
}

const TIPOS_DOCUMENTO_OPERADOR = [
  "LICENCIA",
  "LICENCIA FEDERAL",
  "TARJETÓN",
  "CARTA PORTE",
  "INE",
  "CURP",
  "RFC",
  "COMPROBANTE DE DOMICILIO",
  "ANTIDOPING",
  "EXAMEN MÉDICO",
  "CONTRATO",
  "PSICOMETRÍA",
  "CERTIFICADO MÉDICO",
  "OTRO",
];

function TabDocOperador({ docs, setDocs }: { docs: DocOperadorItem[]; setDocs: React.Dispatch<React.SetStateAction<DocOperadorItem[]>> }) {
  const up = (i: number, k: keyof DocOperadorItem, v: unknown) =>
    setDocs(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <div className="space-y-4">
      <datalist id="tipos-doc-operador-dl">
        {TIPOS_DOCUMENTO_OPERADOR.map(t => <option key={t} value={t} />)}
      </datalist>
      <div className="rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 p-3 text-xs text-sky-800 dark:text-sky-200">
        <strong>Tip:</strong> escribe <code className="font-mono">LICENCIA</code> en el tipo para que el número se exponga al módulo de viajes (al asignar este empleado como operador, su número de licencia se sincronizará).
      </div>
      {docs.length === 0 && <EmptyState label="Sin documentos de operador" />}
      {docs.map((d, i) => {
        const tipoNorm = (d.tipo_documento || "").trim().toUpperCase();
        const esLicencia = tipoNorm === "LICENCIA" || tipoNorm === "LICENCIA FEDERAL";
        return (
        <FormsetRow key={d._key} title={`Documento Operador #${i + 1}${esLicencia ? "  ·  vinculado a Viajes" : ""}`} onRemove={() => setDocs(p => p.filter((_, j) => j !== i))}>
          <Row2>
            <div>
              <Lbl>Tipo de Documento</Lbl>
              <input
                value={d.tipo_documento}
                onChange={e => up(i, "tipo_documento", e.target.value)}
                list="tipos-doc-operador-dl"
                placeholder="Selecciona o escribe (ej. LICENCIA)"
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-sky-400/50"
              />
            </div>
            <div><Lbl>Número de Documento</Lbl><Inp value={d.numero_documento} onChange={v => up(i, "numero_documento", v)} mono /></div>
          </Row2>
          <Row2>
            <div><Lbl>Fecha de Expedición</Lbl><Inp type="date" value={d.fecha_expedicion} onChange={v => up(i, "fecha_expedicion", v)} /></div>
            <div><Lbl>Fecha de Vencimiento</Lbl><Inp type="date" value={d.fecha_vencimiento} onChange={v => up(i, "fecha_vencimiento", v)} /></div>
          </Row2>
          <div><Lbl>Archivo</Lbl><FileDropzone file={d.archivo} url={d.archivo_url} onChange={f => up(i, "archivo", f)} /></div>
          <div><Lbl>Observaciones</Lbl><Textarea value={d.observaciones} onChange={v => up(i, "observaciones", v)} /></div>
        </FormsetRow>
        );
      })}
      <AddBtn label="Agregar Documento" onClick={() => setDocs(p => [...p, { _key: nk(), tipo_documento: "", numero_documento: "", fecha_expedicion: "", fecha_vencimiento: "", observaciones: "" }])} />
    </div>
  );
}

function TabHistorial({ items, setItems, departamentos, activo }: {
  items: HistorialItem[]; setItems: React.Dispatch<React.SetStateAction<HistorialItem[]>>;
  departamentos: SelectOption[]; activo: boolean;
}) {
  const up = (i: number, k: keyof HistorialItem, v: unknown) =>
    setItems(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  function show(tipo: string) {
    const r = { fecha_fin: false, puesto: false, departamento: false, descripcion: false, motivo: false };
    if (tipo === "SUSPENSION" || tipo === "INCAPACIDAD") { r.fecha_fin = r.descripcion = true; }
    else if (tipo === "RENUNCIA" || tipo === "BAJA" || tipo === "ABANDONO") { r.descripcion = r.motivo = true; }
    else if (tipo === "CAMBIO_PUESTO") { r.puesto = r.departamento = r.descripcion = true; }
    else if (["ACTA_ADMINISTRATIVA", "PERMISO", "RECONTRATACION"].includes(tipo)) { r.descripcion = true; }
    return r;
  }
  return (
    <div className="space-y-4">
      {/* Banner informativo: estado automático según eventos */}
      <div className={`rounded-xl border p-3 flex items-start gap-3 ${activo
        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
        : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activo ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          <AlertTriangle size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black ${activo ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"}`}>
              Estado actual del empleado: {activo ? "ACTIVO" : "INACTIVO"}
            </span>
            <span className={`inline-flex w-2 h-2 rounded-full ${activo ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          </div>
          <p className={`text-[11.5px] mt-1 leading-relaxed ${activo ? "text-emerald-700/90 dark:text-emerald-300/90" : "text-rose-700/90 dark:text-rose-300/90"}`}>
            <span className="font-bold">Regla automática:</span> si agregás un evento de
            <span className="font-bold"> Renuncia</span>,
            <span className="font-bold"> Abandono</span> o
            <span className="font-bold"> Baja</span>, el empleado pasa a <span className="font-bold">inactivo</span>.
            Si luego agregás una <span className="font-bold">Recontratación</span> más reciente, vuelve a <span className="font-bold">activo</span>.
            El sistema usa el evento con fecha más reciente para decidir.
          </p>
        </div>
      </div>
      {items.length === 0 && <EmptyState label="Sin eventos en el historial laboral" />}
      {items.map((h, i) => {
        const f = show(h.tipo_evento);
        return (
          <FormsetRow key={h._key} title={`Evento #${i + 1}`} onRemove={() => setItems(p => p.filter((_, j) => j !== i))}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Lbl>Tipo de Evento</Lbl><Sel value={h.tipo_evento} onChange={v => up(i, "tipo_evento", v)} options={TIPO_EVENTO_OPTS} placeholder="Seleccionar..." /></div>
              <div><Lbl>Fecha de Inicio</Lbl><Inp type="date" value={h.fecha_inicio} onChange={v => up(i, "fecha_inicio", v)} /></div>
              {f.fecha_fin && <div className="anim-fadeslide"><Lbl>Fecha de Fin</Lbl><Inp type="date" value={h.fecha_fin} onChange={v => up(i, "fecha_fin", v)} /></div>}
            </div>
            {(f.puesto || f.departamento) && (
              <Row2>
                {f.puesto && <div className="anim-fadeslide"><Lbl>Nuevo Puesto</Lbl><Inp value={h.puesto} onChange={v => up(i, "puesto", v)} /></div>}
                {f.departamento && <div className="anim-fadeslide"><Lbl>Nuevo Depto.</Lbl><Sel value={h.departamento_id} onChange={v => up(i, "departamento_id", v)} options={departamentos} /></div>}
              </Row2>
            )}
            {f.descripcion && <div className="anim-fadeslide"><Lbl>Descripción</Lbl><Textarea value={h.descripcion} onChange={v => up(i, "descripcion", v)} /></div>}
            {f.motivo && <div className="anim-fadeslide"><Lbl>Motivo de Salida</Lbl><Inp value={h.motivo_salida} onChange={v => up(i, "motivo_salida", v)} /></div>}
            <div><Lbl>Documento Adjunto</Lbl><FileDropzone file={h.archivo} url={h.archivo_url} onChange={f => up(i, "archivo", f)} /></div>
          </FormsetRow>
        );
      })}
      <AddBtn label="Agregar Evento" onClick={() => setItems(p => [...p, { _key: nk(), tipo_evento: "", fecha_inicio: "", fecha_fin: "", puesto: "", departamento_id: "", descripcion: "", motivo_salida: "" }])} />
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function EmpleadoForm({ mode, id }: { mode: "nuevo" | "editar"; id?: string }) {
  const router = useRouter();
  useTheme();
  const fotoRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const [form, setForm]           = useState<FormState>(DEFAULT);
  const [fotoPreview, setFoto]    = useState<string | null>(null);
  const [tab, setTab]             = useState<TabKey>("personal");
  const [tabKey, setTabKey]       = useState(0);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [validErrs, setValidErrs] = useState<string[]>([]);
  const [errFields, setErrFields] = useState<Set<keyof FormState>>(new Set());
  const [success, setSuccess]     = useState(false);
  const [colonias, setColonias]   = useState<string[]>([]);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpNotFound, setCpNotFound] = useState(false);
  const [showOp, setShowOp]       = useState(false);
  const [dashStats, setDashStats] = useState<Record<string, unknown> | null>(null);
  const [shakeBar, setShakeBar]   = useState(false);

  const [contratos, setContratos]   = useState<ContratoItem[]>([]);
  const [salarios, setSalarios]     = useState<SalarioItem[]>([]);
  const [hijos, setHijos]           = useState<HijoItem[]>([]);
  const [historial, setHistorial]   = useState<HistorialItem[]>([]);
  const [docOp, setDocOp]           = useState<DocOperadorItem[]>([]);

  const [puestos, setPuestos]             = useState<SelectOption[]>([]);
  const [departamentos, setDepartamentos] = useState<SelectOption[]>([]);
  const [supervisores, setSupervisores]   = useState<SelectOption[]>([]);
  const [empresas, setEmpresas]           = useState<SelectOption[]>([]);
  const [lugares, setLugares]             = useState<SelectOption[]>([]);

  const s = (k: keyof FormState) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const switchTab = (t: TabKey) => { setTab(t); setTabKey(n => n + 1); };

  useEffect(() => {
    Promise.allSettled([
      api.getRHPuestos().then((d: unknown) => setPuestos(toArr(d))),
      api.getRHDepartamentos().then((d: unknown) => setDepartamentos(toArr(d))),
      api.getRHSupervisores().then((d: unknown) => setSupervisores(toArr(d))).catch(() => {}),
      // Los chips de "División Operativa" en el form se alimentan del
      // catálogo de Empresas (ternium.Empresa). El backend guarda los IDs
      // seleccionados en el M2M `Empleado.empresas` (vía `empresas_ids`).
      api.getCatEmpresas().then((d: unknown) => setEmpresas(toArr(d))),
      api.getCatLugares().then((d: unknown) => setLugares(toArr(d))).catch(() => {}),
    ]);
  }, []);

  // Auto-asignación a la(s) empresa(s) disponible(s). El ERP opera con una sola
  // empresa, por lo que ya no se elige manualmente: si `empresas_ids` está vacío
  // y el catálogo de empresas ya cargó, se asignan todas las disponibles.
  useEffect(() => {
    if (empresas.length === 0) return;
    setForm(p => p.empresas_ids.length > 0
      ? p
      : { ...p, empresas_ids: empresas.map(e => String(e.id)) });
  }, [empresas]);

  useEffect(() => {
    const p = puestos.find(x => String(x.id) === form.puesto_id);
    setShowOp(!!p && String(p.nombre).toUpperCase().includes("OPERADOR"));
  }, [form.puesto_id, puestos]);

  // ── Auto-cálculo de "activo" según el historial laboral ────────────────────
  // RENUNCIA/ABANDONO/BAJA → inactivo
  // RECONTRATACION → activo
  // Se toma el evento más reciente por fecha_inicio.
  useEffect(() => {
    const TERMINAL = new Set(["RENUNCIA", "ABANDONO", "BAJA"]);
    const REACTIVAR = "RECONTRATACION";
    const relevantes = historial
      .filter(h => TERMINAL.has(h.tipo_evento) || h.tipo_evento === REACTIVAR)
      .slice()
      .sort((a, b) => (a.fecha_inicio || "").localeCompare(b.fecha_inicio || ""));
    if (relevantes.length === 0) return;
    const ultimo = relevantes[relevantes.length - 1];
    const deberiaEstarActivo = ultimo.tipo_evento === REACTIVAR;
    setForm(p => p.activo === deberiaEstarActivo ? p : { ...p, activo: deberiaEstarActivo });
  }, [historial]);

  useEffect(() => {
    const cp = form.codigo_postal.trim();
    if (cp.length !== 5 || !/^\d{5}$/.test(cp)) {
      setColonias([]); setCpNotFound(false); setCpLoading(false);
      return;
    }
    let cancel = false;
    setCpLoading(true);
    setCpNotFound(false);
    const t = setTimeout(() => {
      fetch(`${API_BASE}/api/catalogos-sat/codigos-postales/lookup/?cp=${cp}`, {
        credentials: "include",
        headers: typeof window !== "undefined" && window.localStorage.getItem("erp.jwt.access")
          ? { Authorization: `Bearer ${window.localStorage.getItem("erp.jwt.access")}` }
          : {},
      })
        .then(r => r.json())
        .then(j => {
          if (cancel) return;
          if (!j?.found) {
            setColonias([]);
            setCpNotFound(true);
            return;
          }
          const colonias: string[] = Array.isArray(j.colonias) ? j.colonias : [];
          setForm(p => ({
            ...p,
            estado_addr: j.estado || p.estado_addr,
            ciudad: j.municipio || p.ciudad,
            pais: j.pais || "México",
            colonia: colonias.length === 1
              ? colonias[0]
              : (colonias.includes(p.colonia) ? p.colonia : ""),
          }));
          setColonias(colonias);
        })
        .catch(() => { if (!cancel) { setColonias([]); setCpNotFound(true); } })
        .finally(() => { if (!cancel) setCpLoading(false); });
    }, 250); // debounce
    return () => { cancel = true; clearTimeout(t); };
  }, [form.codigo_postal]);

  useEffect(() => {
    if (mode !== "editar" || !id) return;
    api.getEmpleado(id).then((data: Record<string, unknown>) => {
      setForm({
        nombre: String(data.nombre ?? ""), apellido: String(data.apellido ?? ""),
        email: String(data.email ?? ""), telefono_personal: String(data.telefono_personal ?? data.telefono ?? ""),
        fecha_contratacion: String(data.fecha_contratacion ?? data.fecha_ingreso ?? ""),
        numero_empleado: String(data.numero_empleado ?? ""),
        // El backend devuelve `puesto` (FK id) y `departamento_id` (derivado).
        // Mantengo retro-compat con `puesto_id` si llega.
        puesto_id: String(data.puesto_id ?? data.puesto ?? ""),
        departamento_id: String(data.departamento_id ?? ""),
        supervisor_id: String((data.supervisor as Record<string, unknown>)?.id ?? ""),
        fecha_nacimiento: String(data.fecha_nacimiento ?? ""),
        estado_civil: String(data.estado_civil ?? ""), nacionalidad: String(data.nacionalidad ?? "Mexicana"),
        curp: String(data.curp ?? ""), rfc: String(data.rfc ?? ""), nss: String(data.nss ?? ""),
        nombre_conyuge: String(data.nombre_conyuge ?? ""), telefono_conyuge: String(data.telefono_conyuge ?? ""),
        direccion: String(data.direccion ?? ""), codigo_postal: String(data.codigo_postal ?? ""),
        colonia: String(data.colonia ?? ""), ciudad: String(data.ciudad ?? ""),
        estado_addr: String(data.estado ?? ""), pais: String(data.pais ?? "México"),
        nombre_referencia_1: String(data.nombre_referencia_1 ?? data.referencia_1_nombre ?? ""),
        telefono_referencia_1: String(data.telefono_referencia_1 ?? data.referencia_1_telefono ?? ""),
        relacion_referencia_1: String(data.relacion_referencia_1 ?? data.referencia_1_parentesco ?? ""),
        nombre_referencia_2: String(data.nombre_referencia_2 ?? data.referencia_2_nombre ?? ""),
        telefono_referencia_2: String(data.telefono_referencia_2 ?? data.referencia_2_telefono ?? ""),
        relacion_referencia_2: String(data.relacion_referencia_2 ?? data.referencia_2_parentesco ?? ""),
        empresa: String(data.empresa ?? ""),
        lugar_id: String(data.lugar_id ?? ""),
        // El backend devuelve `empresas_ids` (M2M nuevo). Mantenemos
        // compatibilidad con datos antiguos en `division_operativa`.
        empresas_ids: Array.isArray(data.empresas_ids)
          ? data.empresas_ids.map(String)
          : (Array.isArray(data.division_operativa) ? data.division_operativa.map(String) : []),
        banco: String(data.banco ?? ""), numero_cuenta: String(data.numero_cuenta ?? ""),
        numero_tarjeta: String(data.numero_tarjeta ?? ""), clabe_interbancaria: String(data.clabe_interbancaria ?? ""),
        activo: data.activo === undefined ? true : Boolean(data.activo),
      });
      if (data.foto_perfil) setFoto(String(data.foto_perfil));
      if (Array.isArray(data.contratos)) setContratos((data.contratos as ContratoItem[]).map(c => ({ ...c, _key: nk() })));
      if (Array.isArray(data.salarios)) setSalarios((data.salarios as SalarioItem[]).map(x => ({ ...x, _key: nk() })));
      if (Array.isArray(data.hijos)) setHijos((data.hijos as HijoItem[]).map(x => ({ ...x, _key: nk() })));
      if (Array.isArray(data.historial_laboral)) setHistorial((data.historial_laboral as HistorialItem[]).map(x => ({ ...x, _key: nk() })));
      if (Array.isArray(data.documentos_operador)) setDocOp((data.documentos_operador as DocOperadorItem[]).map(x => ({ ...x, _key: nk() })));
      if (data.dashboard_stats) setDashStats(data.dashboard_stats as Record<string, unknown>);
    }).catch(() => setError("No se pudo cargar los datos del empleado."));
  }, [mode, id]);

  const validate = (): string[] => {
    const issues: string[] = [];
    const fields = new Set<keyof FormState>();
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      const v = form[key];
      if (!v || (typeof v === "string" && !v.trim())) {
        issues.push(label);
        fields.add(key);
      }
    });
    FORMAT_RULES.forEach(({ key, label, re, hint }) => {
      const v = String(form[key] ?? "").trim().toUpperCase();
      if (v && !re.test(v)) {
        issues.push(`${label}: ${hint}`);
        fields.add(key);
      }
    });
    setErrFields(fields);
    return issues;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = validate();
    if (missing.length > 0) {
      setValidErrs(missing);
      setShakeBar(true);
      setTimeout(() => setShakeBar(false), 500);
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setValidErrs([]);
    setSaving(true); setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach(x => fd.append(k, x));
        else fd.append(k, String(v));
      });
      if (fotoRef.current?.files?.[0]) fd.append("foto_perfil", fotoRef.current.files[0]);
      fd.append("contratos_json", JSON.stringify(contratos));
      fd.append("salarios_json", JSON.stringify(salarios));
      fd.append("hijos_json", JSON.stringify(hijos));
      fd.append("historial_laboral_json", JSON.stringify(historial));
      fd.append("documentos_operador_json", JSON.stringify(
        docOp.map(({ archivo, ...rest }) => rest)
      ));
      docOp.forEach((d, idx) => {
        if (d.archivo instanceof File) fd.append(`doc_op_archivo_${idx}`, d.archivo);
      });
      const result = mode === "nuevo" ? await api.crearEmpleadoRH(fd) : await api.actualizarEmpleadoRH(id!, fd);
      setSuccess(true);
      setTimeout(() => router.push(`/rh/empleados/${result?.id ?? id}`), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el empleado.");
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally { setSaving(false); }
  };

  const allTabs: { key: TabKey; label: string; icon: React.ElementType; hide?: boolean }[] = [
    { key: "personal",     label: "Datos Personales",   icon: User },
    { key: "familia",      label: "Familia y Domicilio", icon: Home },
    { key: "operativa",    label: "Info. Operativa",     icon: Building2 },
    { key: "contratos",    label: "Contratos",           icon: FileText },
    { key: "salario",      label: "Salario",             icon: DollarSign },
    { key: "bancarios",    label: "Datos Bancarios",     icon: CreditCard },
    { key: "documentos",   label: "Documentos",          icon: FileArchive },
    { key: "doc_operador", label: "Doc. Operador",       icon: Truck, hide: !showOp },
    { key: "historial",    label: "Historial Laboral",   icon: History },
  ];
  const tabs = allTabs.filter(t => !t.hide);

  const nombrePreview = [form.nombre, form.apellido].filter(Boolean).join(" ");
  const initial = ((form.nombre?.[0] ?? "") + (form.apellido?.[0] ?? "")).toUpperCase() || "?";

  // pct complete
  const filledRequired = REQUIRED_FIELDS.filter(({ key }) => {
    const v = form[key]; return v && typeof v === "string" && v.trim().length > 0;
  }).length;
  const pct = Math.round((filledRequired / REQUIRED_FIELDS.length) * 100);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {/* ═══ Background ═══ */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950" />
        <div className="blob-1 absolute -top-48 -left-48 w-[480px] h-[480px] opacity-[0.1] dark:opacity-[0.04]"
          style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)" }} />
        <div className="blob-2 absolute right-[-120px] top-[-60px] w-[380px] h-[380px] opacity-[0.07] dark:opacity-[0.03]"
          style={{ background: "radial-gradient(circle,#4f46e5,transparent 70%)" }} />
      </div>

      <form onSubmit={handleSubmit} className="min-h-screen">

        {/* ═══ BODY ═══ */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          <div className="flex gap-6 items-start">

            {/* ─── LEFT SIDEBAR ─── */}
            <aside className="hidden lg:flex flex-col gap-3 w-52 xl:w-56 shrink-0" style={{ position: "sticky", top: "16px" }}>

              {/* Back + Save row */}
              <div className="flex items-center gap-2">
                <Link href={mode === "editar" && id ? `/rh/empleados/${id}` : "/rh/empleados"}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all duration-200">
                  <ArrowLeft size={13} /> Volver
                </Link>
                <button type="submit" disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-md"
                  style={{ background: G, boxShadow: `0 4px 14px ${GLOW}` }}>
                  {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>

              {/* Photo card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex flex-col items-center gap-3.5 p-5">
                  <div className="relative group cursor-pointer" onClick={() => fotoRef.current?.click()}>
                    <div className="absolute -inset-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" style={{ background: G }} />
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-white dark:border-slate-700 shadow-lg"
                      style={{ background: G }}>
                      {fotoPreview
                        ? <img src={fotoPreview} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center font-black text-3xl text-white/90 select-none">{initial}</div>}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 group-hover:bg-black/50 transition-all duration-300 text-transparent group-hover:text-white">
                        <Camera size={16} />
                        <span className="text-[9px] font-bold">Cambiar</span>
                      </div>
                    </div>
                    {!fotoPreview && <div className="absolute inset-0 rounded-full" style={{ animation: "pulse-ring 2.5s ease infinite" }} />}
                    <input ref={fotoRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setFoto(URL.createObjectURL(f)); }} />
                  </div>
                  {nombrePreview ? (
                    <div className="text-center">
                      <p className="text-[13px] font-black text-slate-800 dark:text-white leading-tight">{nombrePreview}</p>
                      {form.puesto_id && puestos.find(p => String(p.id) === form.puesto_id) && (
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: "#7c3aed" }}>
                          {puestos.find(p => String(p.id) === form.puesto_id)?.nombre}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">Ingresa nombre<br />para previsualizar</p>
                  )}
                  <button type="button" onClick={() => fotoRef.current?.click()}
                    className="w-full py-1.5 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800/50 text-xs font-bold text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-400 transition-all duration-200">
                    Subir foto
                  </button>
                </div>
              </div>

              {/* Vertical tab nav */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Secciones</p>
                  <span className="text-[10px] font-bold" style={{ color: pct === 100 ? "#10b981" : "#7c3aed" }}>{pct}%</span>
                </div>
                {/* progress */}
                <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
                  <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : G }} />
                </div>
                <nav className="p-1.5 space-y-0.5">
                  {tabs.map(t => {
                    const active = tab === t.key;
                    return (
                      <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left group ${
                          active ? "text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400"
                        }`}
                        style={active ? { background: G, boxShadow: `0 2px 10px ${GLOW}` } : {}}>
                        <t.icon size={13} className="shrink-0" />
                        <span className="flex-1 truncate">{t.label}</span>
                        {active && <ChevronRight size={10} className="shrink-0 opacity-70" />}
                      </button>
                    );
                  })}
                </nav>
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <button type="reset"
                    onClick={() => { setForm(DEFAULT); setHijos([]); setContratos([]); setSalarios([]); setHistorial([]); setDocOp([]); setFoto(null); setError(null); setValidErrs([]); setErrFields(new Set()); }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700 hover:border-red-200 transition-all duration-200 flex items-center justify-center gap-1.5">
                    <Trash2 size={11} /> Limpiar formulario
                  </button>
                </div>
              </div>
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Mobile top bar */}
              <div className="lg:hidden flex items-center gap-2">
                <Link href={mode === "editar" && id ? `/rh/empleados/${id}` : "/rh/empleados"}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all">
                  <ArrowLeft size={13} /> Volver
                </Link>
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                  <p className="font-black text-slate-800 dark:text-white text-xs truncate">{nombrePreview || (mode === "nuevo" ? "Nuevo Empleado" : "Editar Empleado")}</p>
                </div>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-white shadow-md disabled:opacity-50"
                  style={{ background: G }}>
                  {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
              </div>

              {/* Mobile tabs */}
              <div className="lg:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex overflow-x-auto p-1.5 gap-1">
                  {tabs.map(t => {
                    const active = tab === t.key;
                    return (
                      <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded-xl transition-all duration-200 shrink-0 ${active ? "text-white shadow-sm" : "text-slate-500 hover:text-violet-600 hover:bg-violet-50/80"}`}
                        style={active ? { background: G } : {}}>
                        <t.icon size={10} /> {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Alerts ── */}
              <div ref={alertRef} className="space-y-3">
                {/* Validation errors */}
                {validErrs.length > 0 && (
                  <div className={`anim-fadeslide rounded-2xl border border-red-200 dark:border-red-800/50 overflow-hidden ${shakeBar ? "anim-shake" : ""}`}>
                    <div className="flex items-center gap-2.5 px-5 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30">
                      <AlertTriangle size={15} className="text-red-500 shrink-0" />
                      <p className="font-black text-sm text-red-700 dark:text-red-400">Campos requeridos incompletos</p>
                    </div>
                    <div className="px-5 py-4 bg-white dark:bg-slate-900">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Completa los siguientes campos antes de guardar:</p>
                      <div className="flex flex-wrap gap-2">
                        {validErrs.map(f => (
                          <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg text-xs font-bold text-red-600 dark:text-red-400">
                            <X size={9} /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* API error */}
                {error && (
                  <div className="anim-fadeslide flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl">
                    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-red-700 dark:text-red-400 mb-0.5">Error al guardar</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80">{error}</p>
                    </div>
                    <button type="button" onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-500 transition-colors shrink-0"><X size={13} /></button>
                  </div>
                )}
                {/* Success */}
                {success && (
                  <div className="anim-fadeslide flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-md">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-emerald-700 dark:text-emerald-400">¡Empleado guardado exitosamente!</p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Redirigiendo al perfil...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats — edit mode */}
              {mode === "editar" && dashStats && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden anim-fadeslide">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: G }}>
                      <Sparkles size={13} className="anim-float" />
                    </div>
                    <span className="font-black text-sm text-slate-800 dark:text-slate-100">Resumen del Empleado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800">
                    {[
                      { label: "Sueldo Mensual",  value: dashStats.sueldo_mensual,        color: "#6366f1", icon: DollarSign },
                      { label: "Vacaciones",       value: dashStats.vacaciones_disponibles, color: "#10b981", icon: Clock },
                      { label: "Actas Admin.",     value: dashStats.actas_administrativas,  color: "#ef4444", icon: FileText },
                      { label: "Suspensiones",     value: dashStats.suspensiones,           color: "#f59e0b", icon: AlertTriangle },
                      { label: "Permisos",         value: dashStats.permisos,               color: "#0ea5e9", icon: CheckCircle },
                      { label: "Re-Contrat.",      value: dashStats.recontrataciones,       color: "#8b5cf6", icon: RefreshCw },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9.5px] font-extrabold uppercase tracking-widest truncate" style={{ color: stat.color }}>{stat.label}</p>
                          <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{String(stat.value ?? "0")}</p>
                        </div>
                        <stat.icon size={20} style={{ color: stat.color, opacity: 0.15 }} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic info card */}
              <Section icon={Briefcase} title="Información Básica" subtitle="Datos de identificación y puesto">
                <Row2>
                  <div>
                    <Lbl required>Nombre(s)</Lbl>
                    <Inp value={form.nombre} onChange={s("nombre")} placeholder="Nombre(s)" err={errFields.has("nombre")} />
                  </div>
                  <div>
                    <Lbl required>Apellido(s)</Lbl>
                    <Inp value={form.apellido} onChange={s("apellido")} placeholder="Apellido(s)" err={errFields.has("apellido")} />
                  </div>
                </Row2>
                <Row3>
                  <div>
                    <Lbl>Número de Empleado</Lbl>
                    <Inp value={form.numero_empleado} onChange={s("numero_empleado")} placeholder="Automático" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Lbl required>Puesto</Lbl>
                      <Link href="/rh/catalogos" target="_blank" title="Gestionar puestos"
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-colors mb-1.5 shrink-0">
                        <ExternalLink size={11} />
                        <span className="hidden md:inline">Gestionar</span>
                      </Link>
                    </div>
                    <Sel value={form.puesto_id} onChange={v => setForm(p => ({ ...p, puesto_id: v }))} options={puestos} err={errFields.has("puesto_id")} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Lbl required>Departamento</Lbl>
                      <Link href="/rh/catalogos" target="_blank" title="Gestionar departamentos"
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-colors mb-1.5 shrink-0">
                        <ExternalLink size={11} />
                        <span className="hidden md:inline">Gestionar</span>
                      </Link>
                    </div>
                    <Sel value={form.departamento_id} onChange={v => setForm(p => ({ ...p, departamento_id: v }))} options={departamentos} err={errFields.has("departamento_id")} />
                  </div>
                </Row3>
                <Row2>
                  <div>
                    <Lbl>Supervisor / Jefe Inmediato</Lbl>
                    <Sel value={form.supervisor_id} onChange={v => setForm(p => ({ ...p, supervisor_id: v }))} options={supervisores} placeholder="Sin supervisor" />
                  </div>
                  <div>
                    <Lbl required>Fecha de Contratación</Lbl>
                    <Inp type="date" value={form.fecha_contratacion} onChange={s("fecha_contratacion")} err={errFields.has("fecha_contratacion")} />
                  </div>
                </Row2>
                <div>
                  <Lbl required>Correo Electrónico</Lbl>
                  <IconInput icon={() => <span className="text-sm font-black text-violet-500">@</span>}>
                    <Inp type="email" value={form.email} onChange={s("email")} placeholder="correo@empresa.com" err={errFields.has("email")} />
                  </IconInput>
                  {errFields.has("email") && <p className="text-[11px] text-red-500 mt-1 font-semibold">Este campo es obligatorio</p>}
                </div>
              </Section>

              {/* Tab content */}
              <div key={tabKey} className="anim-fadeslide">
                {tab === "personal"    && <TabPersonal f={form} s={s} errFields={errFields} />}
                {tab === "familia"     && <TabFamilia f={form} s={s} hijos={hijos} setHijos={setHijos} colonias={colonias} cpLoading={cpLoading} cpNotFound={cpNotFound} />}
                {tab === "operativa"   && <TabOperativa f={form} setF={setForm} lugares={lugares} />}
                {tab === "contratos"   && <TabContratos contratos={contratos} setContratos={setContratos} />}
                {tab === "salario"     && <TabSalario salarios={salarios} setSalarios={setSalarios} />}
                {tab === "bancarios"   && <TabBancarios f={form} s={s} setF={setForm} />}
                {tab === "documentos"  && <TabDocumentos />}
                {tab === "doc_operador"&& <TabDocOperador docs={docOp} setDocs={setDocOp} />}
                {tab === "historial"   && <TabHistorial items={historial} setItems={setHistorial} departamentos={departamentos} activo={form.activo} />}
              </div>

              {/* Downloads (edit) */}
              {mode === "editar" && id && (
                <Section icon={Download} title="Descargar Documentos" subtitle="Genera documentos con los datos actuales">
                  <div className="flex flex-wrap gap-3">
                    <a href={`${API_BASE}/rh/descargar-documentos-zip/${id}/`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 shadow-md"
                      style={{ background: G, boxShadow: `0 4px 16px ${GLOW}` }}>
                      <FileArchive size={14} /> Descargar TODOS (ZIP)
                    </a>
                    {[
                      { slug: "contrato-indeterminado",   label: "Contrato" },
                      { slug: "aviso-privacidad",          label: "Aviso de Privacidad" },
                      { slug: "convenio-confidencialidad", label: "Convenio Confidencialidad" },
                    ].map(d => (
                      <a key={d.slug} href={`${API_BASE}/rh/descargar-documento-individual/${id}/${d.slug}/`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200">
                        <FileText size={12} /> {d.label}
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Bottom save — mobile friendly, always at end of content */}
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {pct === 100
                    ? <span className="text-emerald-500 font-bold">✓ Formulario completo</span>
                    : <span>Faltan <span className="font-bold" style={{ color: "#7c3aed" }}>{REQUIRED_FIELDS.length - filledRequired}</span> campos requeridos</span>
                  }
                </p>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ background: G, boxShadow: saving ? "none" : `0 4px 16px ${GLOW}` }}>
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Guardando..." : "Guardar Empleado"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </form>
    </>
  );
}
