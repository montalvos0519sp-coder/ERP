"use client";

import React from "react";
import Combobox, { type ComboOption } from "./Combobox";
import { API_BASE } from "@/lib/api";

/**
 * Cliente SAT que hace fetch directo a los endpoints de catalogos.
 * No usa apiFetch porque para los catalogos no nos importa el manejo de auth
 * (cualquier usuario autenticado puede consultarlos).
 */
async function satFetch(path: string, q: string, pageSize = 30): Promise<any[]> {
  if (typeof window === "undefined") return [];
  const token = window.localStorage.getItem("erp.jwt.access");
  const url = `${API_BASE}${path}?search=${encodeURIComponent(q)}&page_size=${pageSize}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

type SatKey =
  | "regimen-fiscal"
  | "uso-cfdi"
  | "forma-pago"
  | "metodo-pago"
  | "moneda"
  | "clave-prod-serv"
  | "clave-prod-serv-cp"
  | "clave-unidad"
  | "estados"
  | "municipios"
  | "codigos-postales"
  | "colonias"
  | "tipo-figura"
  | "tipo-permiso"
  | "config-vehicular"
  | "subtipo-rem";

const CONFIGS: Record<SatKey, {
  path: string;
  /** Campo que va a quedar en el input cuando se selecciona. */
  keyField: string;
  /** Campo descriptivo (subtitulo). */
  descField: string;
  /** Caracteres minimos para activar busqueda. 0 = muestra todos al abrir. */
  minChars?: number;
  /** Mostrar todas las opciones al abrir aunque no haya texto. */
  showAllOnOpen?: boolean;
}> = {
  "regimen-fiscal":     { path: "/api/catalogos-sat/regimen-fiscal/",    keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "uso-cfdi":           { path: "/api/catalogos-sat/uso-cfdi/",          keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "forma-pago":         { path: "/api/catalogos-sat/forma-pago/",        keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "metodo-pago":        { path: "/api/catalogos-sat/metodo-pago/",       keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "moneda":             { path: "/api/catalogos-sat/moneda/",            keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "clave-prod-serv":    { path: "/api/catalogos-sat/clave-prod-serv/",   keyField: "clave", descField: "descripcion", minChars: 2 },
  "clave-prod-serv-cp": { path: "/api/catalogos-sat/clave-prod-serv-cp/",keyField: "clave", descField: "descripcion", minChars: 2 },
  "clave-unidad":       { path: "/api/catalogos-sat/clave-unidad/",      keyField: "clave", descField: "nombre",      minChars: 1 },
  "estados":            { path: "/api/catalogos-sat/estados/",           keyField: "clave", descField: "nombre",      minChars: 0, showAllOnOpen: true },
  "municipios":         { path: "/api/catalogos-sat/municipios/",        keyField: "clave", descField: "nombre",      minChars: 1 },
  "codigos-postales":   { path: "/api/catalogos-sat/codigos-postales/",  keyField: "codigo_postal", descField: "estado", minChars: 3 },
  "colonias":           { path: "/api/catalogos-sat/colonias/",          keyField: "nombre", descField: "codigo_postal", minChars: 2 },
  "tipo-figura":        { path: "/api/catalogos-sat/tipo-figura/",       keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "tipo-permiso":       { path: "/api/catalogos-sat/tipo-permiso/",      keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "config-vehicular":   { path: "/api/catalogos-sat/config-vehicular/",  keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
  "subtipo-rem":        { path: "/api/catalogos-sat/subtipo-rem/",       keyField: "clave", descField: "descripcion", minChars: 0, showAllOnOpen: true },
};

interface Props {
  /** Que catalogo SAT consultar. */
  catalogo: SatKey;
  value: string;
  /** Notifica cambios. `option` solo se pasa cuando el usuario selecciona del dropdown. */
  onChange: (val: string, option?: ComboOption) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Combobox preconfigurado para cualquier catalogo SAT. Ejemplo:
 *
 *   <SatCombobox catalogo="regimen-fiscal" value={r} onChange={setR} />
 *   <SatCombobox catalogo="clave-prod-serv" value={c} onChange={setC} />
 */
export default function SatCombobox({ catalogo, value, onChange, placeholder, className }: Props) {
  const cfg = CONFIGS[catalogo];

  const search = async (q: string): Promise<ComboOption[]> => {
    if ((cfg.minChars ?? 0) > 0 && q.length < (cfg.minChars ?? 0) && !cfg.showAllOnOpen) return [];
    const results = await satFetch(cfg.path, q, 30);
    return results.map((r: any) => ({
      id: r[cfg.keyField] || r.id || r.clave,
      label: String(r[cfg.keyField] ?? ""),
      description: String(r[cfg.descField] ?? ""),
      raw: r,
    }));
  };

  return (
    <Combobox
      value={value}
      onChange={onChange}
      search={search}
      placeholder={placeholder || PLACEHOLDERS[catalogo]}
      className={className}
      minChars={cfg.minChars ?? 1}
      showAllOnOpen={cfg.showAllOnOpen ?? false}
    />
  );
}

const PLACEHOLDERS: Record<SatKey, string> = {
  "regimen-fiscal":     "601, RESICO, persona moral...",
  "uso-cfdi":           "G03, gastos, S01...",
  "forma-pago":         "03 transferencia, 01 efectivo...",
  "metodo-pago":        "PUE, PPD...",
  "moneda":             "MXN, USD, EUR...",
  "clave-prod-serv":    "Escribe codigo o descripcion (78101, transporte)...",
  "clave-prod-serv-cp": "Clave Carta Porte (escribe codigo o descripcion)...",
  "clave-unidad":       "H87 pieza, KGM kilogramo, MTR metro...",
  "estados":            "NLE, JAL, CMX...",
  "municipios":         "Buscar municipio...",
  "codigos-postales":   "Codigo postal de 5 digitos...",
  "colonias":           "Buscar colonia...",
  "tipo-figura":        "01 Operador, 02 Propietario...",
  "tipo-permiso":       "TPAF01, TPAF02, transporte de carga...",
  "config-vehicular":   "Configuracion vehicular SAT (camion, tractor, etc.)...",
  "subtipo-rem":        "Subtipo de remolque/semirremolque SAT...",
};
