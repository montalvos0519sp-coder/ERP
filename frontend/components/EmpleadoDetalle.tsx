"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, FileText, Edit, RefreshCw, AlertTriangle,
  Building2, Briefcase, Calendar, Mail, Phone, CreditCard, MapPin,
  Users, FileArchive, User, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Clock, Award, Banknote, ShieldAlert, BookOpen, Tag,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Hijo { id: number; nombre: string; fecha_nacimiento?: string; edad?: number; }
interface HistorialLaboral {
  id: number; empresa_anterior?: string; puesto_anterior?: string;
  fecha_inicio?: string; fecha_fin?: string; motivo_salida?: string;
}
interface Contrato {
  id: number; tipo_contrato?: string; fecha_inicio?: string;
  fecha_fin?: string; salario?: string | number; activo?: boolean;
}
interface Salario {
  id: number; salario_diario?: string | number; salario_semanal?: string | number;
  salario_mensual?: string | number; fecha_vigencia?: string; motivo?: string;
}
interface DocumentoOperador {
  id: number; tipo_documento?: string; archivo?: string; fecha_vencimiento?: string;
}
interface ContactoEmergencia {
  id: number; nombre: string; parentesco?: string; telefono?: string; email?: string;
}
interface Colega { id: number; nombre_completo: string; puesto?: string; }

interface EmpleadoData {
  id: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  numero_empleado?: string;
  email?: string;
  telefono_personal?: string;
  telefono_empresa?: string;
  extension?: string;
  departamento?: string;
  puesto?: string;
  empresa?: string;
  empresa_display?: string;
  fecha_contratacion?: string;
  fecha_ingreso?: string;
  dias_laborados?: number;
  antiguedad?: string | number;
  fecha_nacimiento?: string;
  age?: number | string;
  edad?: number | string;
  curp?: string;
  rfc?: string;
  nss?: string;
  estado_civil?: string;
  nacionalidad?: string;
  lugar_nacimiento?: string;
  escolaridad?: string;
  // address
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  codigo_postal?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  direccion?: string;
  // banking
  banco?: string;
  numero_cuenta?: string;
  clabe_interbancaria?: string;
  // docs
  foto_perfil?: string;
  foto_curp?: string;
  foto_rfc?: string;
  foto_nss?: string;
  foto_ine_frente?: string;
  foto_ine_vuelta?: string;
  comprobante_domicilio?: string;
  acta_nacimiento?: string;
  carta_recomendacion?: string;
  // references
  referencia_1_nombre?: string;
  referencia_1_telefono?: string;
  referencia_1_parentesco?: string;
  referencia_2_nombre?: string;
  referencia_2_telefono?: string;
  referencia_2_parentesco?: string;
  // contract / operational
  tipo_contrato?: string;
  salario_actual?: string | number;
  tipo_viaje?: string;
  tipo_carga?: string;
  division?: string;
  // relations
  supervisor?: { id: number; nombre_completo: string; puesto?: string };
  colegas?: Colega[];
  hijos?: Hijo[];
  historial_laboral?: HistorialLaboral[];
  contratos?: Contrato[];
  salarios?: Salario[];
  documentos_operador?: DocumentoOperador[];
  contactos_emergencia?: ContactoEmergencia[];
  // benefits
  vales_despensa?: boolean;
  caja_ahorro?: boolean;
  seguro_vida?: boolean;
  seguro_gastos_medicos?: boolean;
  fondo_retiro?: boolean;
  // status
  activo: boolean;
  eliminado?: boolean;
}

type TabKey = "laboral" | "personal" | "historial" | "salarios" | "documentos" | "emergencia";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parts[2]} ${months[+parts[1] - 1]} ${parts[0]}`;
}

function fmtMXN(v?: string | number) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? String(v) : `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 gap-3">
      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-700 dark:text-slate-200 text-right max-w-[58%] break-all ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color = "#3b82f6", children, className = "" }: {
  title: string; icon: React.ElementType; color?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
      {label}
    </span>
  );
}

function DocLink({ href, label, color = "#3b82f6" }: { href: string; label: string; color?: string }) {
  if (!href) return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 opacity-40">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <FileText size={14} style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <span className="ml-auto text-[10px] text-slate-300">Sin archivo</span>
    </div>
  );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: `${color}25`, background: `${color}08` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <FileText size={14} style={{ color }} />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{label}</span>
      <ExternalLink size={10} className="ml-auto shrink-0 text-slate-300 dark:text-slate-600" />
    </a>
  );
}

function Accordion({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        {title}
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
  );
}

// ─── Tab: Laboral ─────────────────────────────────────────────────────────────

function TabLaboral({ emp }: { emp: EmpleadoData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Contrato & Posición" icon={Briefcase} color="#3b82f6">
        <InfoRow label="Número Empleado" value={emp.numero_empleado} />
        <InfoRow label="Puesto" value={emp.puesto} />
        <InfoRow label="Departamento" value={emp.departamento} />
        <InfoRow label="Empresa" value={emp.empresa_display ?? emp.empresa} />
        <InfoRow label="Tipo de Contrato" value={emp.tipo_contrato} />
        <InfoRow label="Fecha Contratación" value={fmtDate(emp.fecha_contratacion ?? emp.fecha_ingreso)} />
        <InfoRow label="Antigüedad" value={emp.antiguedad != null ? `${emp.antiguedad} años` : undefined} />
        <InfoRow label="Días Laborados" value={emp.dias_laborados != null ? `${emp.dias_laborados.toLocaleString("es-MX")} días` : undefined} />
        {emp.tipo_viaje && <InfoRow label="Tipo de Viaje" value={emp.tipo_viaje} />}
        {emp.tipo_carga && <InfoRow label="Tipo de Carga" value={emp.tipo_carga} />}
        {emp.division && <InfoRow label="División" value={emp.division} />}
      </SectionCard>

      <div className="space-y-5">
        <SectionCard title="Contacto Laboral" icon={Mail} color="#14b8a6">
          <InfoRow label="Correo" value={emp.email} />
          <InfoRow label="Teléfono Personal" value={emp.telefono_personal} />
          {emp.telefono_empresa && <InfoRow label="Teléfono Empresa" value={emp.telefono_empresa} />}
          {emp.extension && <InfoRow label="Extensión" value={emp.extension} />}
          <InfoRow label="Salario Actual" value={fmtMXN(emp.salario_actual)} />
        </SectionCard>

        {emp.supervisor && (
          <SectionCard title="Estructura Organizacional" icon={Users} color="#a855f7">
            <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[10px] font-black text-purple-600 dark:text-purple-400 shrink-0">
                {emp.supervisor.nombre_completo.split(" ").map(w => w[0]).slice(0,2).join("")}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Jefe Directo</p>
                <Link href={`/rh/empleados/${emp.supervisor.id}`} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
                  {emp.supervisor.nombre_completo}
                </Link>
                {emp.supervisor.puesto && <p className="text-[10px] text-slate-400">{emp.supervisor.puesto}</p>}
              </div>
            </div>
            {emp.colegas && emp.colegas.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Equipo</p>
                <div className="space-y-2">
                  {emp.colegas.slice(0,5).map(c => (
                    <Link key={c.id} href={`/rh/empleados/${c.id}`}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500">
                        {c.nombre_completo.split(" ").map(w => w[0]).slice(0,2).join("")}
                      </div>
                      <span className="font-semibold">{c.nombre_completo}</span>
                      {c.puesto && <span className="text-slate-400 text-[10px]">· {c.puesto}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {emp.contratos && emp.contratos.length > 0 && (
        <SectionCard title="Historial de Contratos" icon={FileText} color="#f97316" className="md:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Tipo</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Inicio</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Fin</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Salario</th>
                  <th className="pb-2 font-bold uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {emp.contratos.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                    <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-200">{c.tipo_contrato ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-500">{fmtDate(c.fecha_inicio)}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.fecha_fin ? fmtDate(c.fecha_fin) : "Indefinido"}</td>
                    <td className="py-2 pr-4 text-slate-500">{fmtMXN(c.salario)}</td>
                    <td className="py-2">
                      {c.activo
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full"><CheckCircle size={8} /> Vigente</span>
                        : <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">Terminado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Personal ────────────────────────────────────────────────────────────

function TabPersonal({ emp }: { emp: EmpleadoData }) {
  const domicilio = [emp.calle, emp.numero_exterior ? `#${emp.numero_exterior}` : undefined, emp.numero_interior ? `Int. ${emp.numero_interior}` : undefined].filter(Boolean).join(" ") || emp.direccion;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Datos Personales" icon={User} color="#a855f7">
        <InfoRow label="Fecha Nacimiento" value={fmtDate(emp.fecha_nacimiento)} />
        <InfoRow label="Edad" value={emp.age ?? emp.edad} />
        <InfoRow label="Estado Civil" value={emp.estado_civil} />
        <InfoRow label="Nacionalidad" value={emp.nacionalidad} />
        <InfoRow label="Lugar de Nacimiento" value={emp.lugar_nacimiento} />
        <InfoRow label="Escolaridad" value={emp.escolaridad} />
        <InfoRow label="CURP" value={emp.curp} mono />
        <InfoRow label="RFC" value={emp.rfc} mono />
        <InfoRow label="NSS" value={emp.nss} mono />
      </SectionCard>

      <div className="space-y-5">
        <SectionCard title="Domicilio" icon={MapPin} color="#f97316">
          {domicilio && <InfoRow label="Calle y Número" value={domicilio} />}
          <InfoRow label="Colonia" value={emp.colonia} />
          <InfoRow label="Municipio" value={emp.municipio ?? emp.ciudad} />
          <InfoRow label="C.P." value={emp.codigo_postal} />
          <InfoRow label="Estado" value={emp.estado} />
          <InfoRow label="País" value={emp.pais ?? "México"} />
        </SectionCard>

        <SectionCard title="Referencias Personales" icon={Users} color="#64748b">
          {emp.referencia_1_nombre ? (
            <div className="space-y-2">
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{emp.referencia_1_nombre}</p>
                <p className="text-[11px] text-slate-400">{emp.referencia_1_parentesco}</p>
                <p className="text-[11px] text-slate-500 font-mono">{emp.referencia_1_telefono}</p>
              </div>
              {emp.referencia_2_nombre && (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{emp.referencia_2_nombre}</p>
                  <p className="text-[11px] text-slate-400">{emp.referencia_2_parentesco}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{emp.referencia_2_telefono}</p>
                </div>
              )}
            </div>
          ) : <p className="text-xs text-slate-400">Sin referencias registradas</p>}
        </SectionCard>
      </div>

      {/* Hijos */}
      {emp.hijos && emp.hijos.length > 0 && (
        <SectionCard title={`Hijos (${emp.hijos.length})`} icon={Users} color="#ec4899">
          <div className="space-y-2">
            {emp.hijos.map((h, i) => (
              <div key={h.id ?? i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{h.nombre}</p>
                  {h.fecha_nacimiento && <p className="text-[10px] text-slate-400">{fmtDate(h.fecha_nacimiento)}</p>}
                </div>
                {h.edad != null && <Badge label={`${h.edad} años`} color="#ec4899" />}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Documentos personales (archivos subidos) */}
      <SectionCard title="Documentos Personales" icon={FileText} color="#22c55e">
        <div className="space-y-2">
          <DocLink href={emp.foto_curp ? `${API_BASE}${emp.foto_curp}` : ""} label="CURP" color="#a855f7" />
          <DocLink href={emp.foto_rfc ? `${API_BASE}${emp.foto_rfc}` : ""} label="RFC" color="#3b82f6" />
          <DocLink href={emp.foto_nss ? `${API_BASE}${emp.foto_nss}` : ""} label="NSS / IMSS" color="#14b8a6" />
          <DocLink href={emp.foto_ine_frente ? `${API_BASE}${emp.foto_ine_frente}` : ""} label="INE Frente" color="#f97316" />
          <DocLink href={emp.foto_ine_vuelta ? `${API_BASE}${emp.foto_ine_vuelta}` : ""} label="INE Vuelta" color="#f97316" />
          <DocLink href={emp.comprobante_domicilio ? `${API_BASE}${emp.comprobante_domicilio}` : ""} label="Comprobante de Domicilio" color="#64748b" />
          <DocLink href={emp.acta_nacimiento ? `${API_BASE}${emp.acta_nacimiento}` : ""} label="Acta de Nacimiento" color="#22c55e" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Historial ───────────────────────────────────────────────────────────

function TabHistorial({ emp }: { emp: EmpleadoData }) {
  if (!emp.historial_laboral || emp.historial_laboral.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
          <BookOpen size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Sin historial laboral registrado</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SectionCard title="Historial Laboral Anterior" icon={Clock} color="#f59e0b">
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-amber-100 dark:bg-amber-900/30" />
          <div className="space-y-5 pl-8">
            {emp.historial_laboral.map((h, i) => (
              <div key={h.id ?? i} className="relative">
                <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{h.empresa_anterior ?? "Empresa no especificada"}</p>
                    <div className="flex gap-1.5 shrink-0">
                      {h.fecha_inicio && <Badge label={fmtDate(h.fecha_inicio)} color="#64748b" />}
                      {h.fecha_fin && <Badge label={fmtDate(h.fecha_fin)} color="#64748b" />}
                    </div>
                  </div>
                  {h.puesto_anterior && <p className="text-xs text-slate-500 mb-1">{h.puesto_anterior}</p>}
                  {h.motivo_salida && (
                    <p className="text-[11px] text-slate-400 italic">Motivo de salida: {h.motivo_salida}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Salarios ────────────────────────────────────────────────────────────

function TabSalarios({ emp }: { emp: EmpleadoData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Evolución Salarial" icon={Banknote} color="#22c55e" className="md:col-span-2">
        {emp.salarios && emp.salarios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Vigencia</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Diario</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Semanal</th>
                  <th className="pb-2 pr-4 font-bold uppercase tracking-wide">Mensual</th>
                  <th className="pb-2 font-bold uppercase tracking-wide">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {emp.salarios.map((s, i) => (
                  <tr key={s.id ?? i} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-slate-600 dark:text-slate-300">{fmtDate(s.fecha_vigencia)}</td>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200 font-semibold">{fmtMXN(s.salario_diario)}</td>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200 font-semibold">{fmtMXN(s.salario_semanal)}</td>
                    <td className="py-2.5 pr-4 font-bold text-emerald-600 dark:text-emerald-400">{fmtMXN(s.salario_mensual)}</td>
                    <td className="py-2.5 text-slate-400 italic">{s.motivo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">Sin historial salarial</p>
        )}
      </SectionCard>

      <SectionCard title="Datos Bancarios" icon={CreditCard} color="#3b82f6">
        <InfoRow label="Banco" value={emp.banco} />
        <InfoRow label="No. de Cuenta" value={emp.numero_cuenta} mono />
        <InfoRow label="CLABE Interbancaria" value={emp.clabe_interbancaria} mono />
      </SectionCard>

      <SectionCard title="Beneficios" icon={Award} color="#a855f7">
        {([
          ["Vales de Despensa", emp.vales_despensa],
          ["Caja de Ahorro", emp.caja_ahorro],
          ["Seguro de Vida", emp.seguro_vida],
          ["Seguro Gastos Médicos", emp.seguro_gastos_medicos],
          ["Fondo de Retiro", emp.fondo_retiro],
        ] as [string, boolean | undefined][]).map(([label, val]) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
            {val
              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full"><CheckCircle size={8} /> Sí</span>
              : <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">No</span>
            }
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Tab: Documentos ─────────────────────────────────────────────────────────

function TabDocumentos({ emp }: { emp: EmpleadoData }) {
  const autoGenDocs = [
    { slug: "contrato-indeterminado",   label: "Contrato Indeterminado",   color: "#22c55e" },
    { slug: "contrato-determinado",     label: "Contrato Determinado",     color: "#22c55e" },
    { slug: "aviso-privacidad",         label: "Aviso de Privacidad",      color: "#3b82f6" },
    { slug: "convenio-confidencialidad",label: "Convenio Confidencialidad",color: "#3b82f6" },
    { slug: "autorizacion-correo",      label: "Autorización Correo SAT",  color: "#3b82f6" },
    { slug: "carta-adhesion",           label: "Carta Adhesión Plan",      color: "#3b82f6" },
    { slug: "descripcion-puesto",       label: "Descripción de Puesto",    color: "#64748b" },
    { slug: "carta-renuncia",           label: "Carta de Renuncia",        color: "#f97316" },
    { slug: "formato-desfase",          label: "Formato de Desfase",       color: "#f97316" },
  ];

  return (
    <div className="space-y-5">
      {/* Auto-generated documents */}
      <SectionCard title="Documentos Generables" icon={FileText} color="#3b82f6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {autoGenDocs.map(doc => (
            <a key={doc.slug}
              href={`${API_BASE}/rh/descargar-documento-individual/${emp.id}/${doc.slug}/`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={{ borderColor: `${doc.color}25`, background: `${doc.color}08` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${doc.color}15` }}>
                <FileText size={13} style={{ color: doc.color }} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{doc.label}</span>
              <ExternalLink size={9} className="ml-auto shrink-0 text-slate-300 dark:text-slate-600" />
            </a>
          ))}
        </div>
      </SectionCard>

      {/* Operator docs */}
      {emp.documentos_operador && emp.documentos_operador.length > 0 && (
        <SectionCard title="Documentos de Operador" icon={Tag} color="#f97316">
          <div className="space-y-2">
            {emp.documentos_operador.map((d, i) => (
              <div key={d.id ?? i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                    <FileText size={12} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.tipo_documento ?? "Documento"}</p>
                    {d.fecha_vencimiento && (
                      <p className="text-[10px] text-slate-400">Vence: {fmtDate(d.fecha_vencimiento)}</p>
                    )}
                  </div>
                </div>
                {d.archivo && (
                  <a href={`${API_BASE}${d.archivo}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <ExternalLink size={9} /> Ver
                  </a>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ZIP all */}
      <a href={`${API_BASE}/rh/descargar-documentos-zip/${emp.id}/`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
          <FileArchive size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Descargar TODOS los documentos</p>
          <p className="text-[11px] text-blue-400">Incluye todos los documentos personales y generados</p>
        </div>
        <ExternalLink size={13} className="ml-auto text-blue-400" />
      </a>
    </div>
  );
}

// ─── Tab: Emergencia ─────────────────────────────────────────────────────────

function TabEmergencia({ emp }: { emp: EmpleadoData }) {
  const contactos = emp.contactos_emergencia ?? [];
  if (contactos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mb-3">
          <ShieldAlert size={24} className="text-red-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Sin contactos de emergencia registrados</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {contactos.map((c, i) => (
        <Accordion key={c.id ?? i} title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] font-black text-red-500 shrink-0">
              {c.nombre.split(" ").map(w => w[0]).slice(0,2).join("")}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.nombre}</p>
              {c.parentesco && <p className="text-[10px] text-slate-400">{c.parentesco}</p>}
            </div>
            {c.telefono && (
              <a href={`tel:${c.telefono}`} onClick={e => e.stopPropagation()}
                className="ml-auto mr-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <Phone size={10} /> {c.telefono}
              </a>
            )}
          </div>
        }>
          <div className="space-y-1 pt-2">
            {c.telefono && <InfoRow label="Teléfono" value={c.telefono} />}
            {c.email && <InfoRow label="Correo" value={c.email} />}
            {c.parentesco && <InfoRow label="Parentesco" value={c.parentesco} />}
          </div>
        </Accordion>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EmpleadoDetalle({ id }: { id: string }) {
  const { isDarkMode } = useTheme();
  const [emp, setEmp] = useState<EmpleadoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("laboral");

  const load = async () => {
    setLoading(true); setError(false);
    try { setEmp(await api.getEmpleado(id)); }
    catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={28} className="text-amber-400" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white mb-1">No se encontró el empleado</h3>
        <p className="text-sm text-slate-400 mb-4">Verifica que el endpoint <code>/rh/api/empleado-info/{id}/</code> exista.</p>
        <div className="flex justify-center gap-3">
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">
            <RefreshCw size={13} /> Reintentar
          </button>
          <Link href="/rh/empleados" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
            <ArrowLeft size={13} /> Volver
          </Link>
        </div>
      </div>
    );
  }

  const initial = ((emp.nombre?.[0] ?? "") + (emp.apellido?.[0] ?? "")).toUpperCase() || "E";
  const tabs: { key: TabKey; label: string }[] = [
    { key: "laboral",    label: "Laboral" },
    { key: "personal",  label: "Personal" },
    { key: "historial", label: "Historial" },
    { key: "salarios",  label: "Salarios" },
    { key: "documentos",label: "Documentos" },
    { key: "emergencia",label: "Emergencia" },
  ];

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2">
        <Link href="/rh/empleados"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
          <ArrowLeft size={14} /> Directorio
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{emp.nombre_completo}</span>
      </div>

      {/* ── Profile Hero ── */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1a4d6b 50%, #0f3d3d 100%)" }}>
        <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />

        {emp.foto_perfil ? (
          <img src={emp.foto_perfil} alt={emp.nombre_completo}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-2xl text-white shrink-0 backdrop-blur-sm shadow-lg">
            {initial || <User size={28} />}
          </div>
        )}

        <div className="flex-1 min-w-0 relative">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {emp.activo
              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full"><CheckCircle size={9} /> Activo</span>
              : <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-400/30 px-2 py-0.5 rounded-full"><XCircle size={9} /> Inactivo</span>
            }
            {emp.numero_empleado && (
              <span className="text-[10px] font-bold bg-white/10 text-blue-200 px-2 py-0.5 rounded-full border border-white/15">#{emp.numero_empleado}</span>
            )}
          </div>
          <h1 className="text-xl font-black text-white leading-tight">{emp.nombre_completo}</h1>
          <p className="text-blue-200/70 text-sm mt-0.5">{emp.puesto ?? "—"}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            {emp.departamento && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-200/80 font-semibold">
                <Building2 size={11} /> {emp.departamento}
              </span>
            )}
            {(emp.empresa_display ?? emp.empresa) && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-200/80 font-semibold">
                <Briefcase size={11} /> {emp.empresa_display ?? emp.empresa}
              </span>
            )}
            {emp.email && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-200/80 font-semibold">
                <Mail size={11} /> {emp.email}
              </span>
            )}
            {emp.fecha_contratacion && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-200/80 font-semibold">
                <Calendar size={11} /> Desde {fmtDate(emp.fecha_contratacion)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 relative shrink-0">
          <Link href={`/rh/empleados/${emp.id}/editar`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all backdrop-blur-sm">
            <Edit size={12} /> Editar
          </Link>
          <a href={`${API_BASE}/rh/descargar-documentos-zip/${emp.id}/`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all backdrop-blur-sm">
            <FileArchive size={12} /> ZIP
          </a>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-1.5 shadow-sm overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[80px] py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "laboral"    && <TabLaboral    emp={emp} />}
      {activeTab === "personal"   && <TabPersonal   emp={emp} />}
      {activeTab === "historial"  && <TabHistorial  emp={emp} />}
      {activeTab === "salarios"   && <TabSalarios   emp={emp} />}
      {activeTab === "documentos" && <TabDocumentos emp={emp} />}
      {activeTab === "emergencia" && <TabEmergencia emp={emp} />}

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Link href="/rh/empleados"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={14} /> Volver al Directorio
        </Link>
        <Link href={`/rh/empleados/${emp.id}/editar`}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none transition-colors">
          <Edit size={13} /> Editar Empleado
        </Link>
      </div>
    </div>
  );
}
