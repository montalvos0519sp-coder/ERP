"use client";

// Renderizador y editor de documentos estilo Word, compartido por la ficha del
// documento, la creación de documentos y la biblioteca de plantillas.
// El contenido es texto estructurado (secciones numeradas, tablas con "|",
// viñetas) que se convierte en una hoja con formato profesional y se exporta
// al mismo .docx en el backend.

import { useMemo, useRef, useState } from "react";
import {
  Heading1, Heading2, Table as TableIcon, List as ListIcon, ListOrdered, PenLine,
  Eye, Pencil, Minus, CheckSquare, FormInput, FileSignature, CaseUpper,
  Calendar as CalIcon, Building2, Maximize2, Minimize2,
} from "lucide-react";

// ── Parser: convierte el contenido plano en bloques con formato ──────────────
export function parseDoc(text: string): React.ReactNode[] {
  const lines = (text || "").split("\n");
  const out: React.ReactNode[] = [];
  let key = 0;
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${key++}`} className="list-disc pl-7 my-2 space-y-0.5 text-[12.5px] text-slate-700">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const s = raw.trim();
    if (s.includes("|")) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && lines[i].includes("|")) { buf.push(lines[i]); i++; }
      const rows = buf.filter((r) => !/^[\s\-|]+$/.test(r.trim()));
      const cells = rows.map((r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
      if (cells.length) {
        out.push(
          <table key={`t${key++}`} className="w-full border-collapse my-3 text-[11.5px]">
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => ri === 0
                    ? <th key={ci} className="border border-slate-300 bg-indigo-50 text-indigo-800 font-bold px-2 py-1 text-left align-top">{c}</th>
                    : <td key={ci} className="border border-slate-300 px-2 py-1 align-top text-slate-700">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      continue;
    }
    if (!s) { flush(); i++; continue; }
    if (/^[═─_]{3,}$/.test(s)) { flush(); i++; continue; }
    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/.test(s)) {
      flush();
      out.push(<h3 key={`h${key++}`} className="text-[14px] font-bold text-indigo-700 mt-5 mb-2 pb-1 border-b-2 border-indigo-200 uppercase tracking-tight">{s}</h3>);
      i++; continue;
    }
    if (/^\d+\.\d+\S*\s+\S/.test(s)) {
      flush();
      out.push(<h4 key={`s${key++}`} className="text-[12.5px] font-bold text-slate-800 mt-3 mb-1">{s}</h4>);
      i++; continue;
    }
    if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,/()\-]{3,}$/.test(s) && !/[a-záéíóúñ]/.test(s)) {
      flush();
      out.push(<div key={`c${key++}`} className="text-[12.5px] font-bold text-indigo-700 mt-4 mb-1.5">{s}</div>);
      i++; continue;
    }
    if (/^([•\-]|[a-z]\)|\d+\))\s+/.test(s)) { bullets.push(s.replace(/^([•\-]|[a-z]\)|\d+\))\s+/, "")); i++; continue; }
    flush();
    out.push(<p key={`p${key++}`} className="text-[12.5px] leading-relaxed my-1 whitespace-pre-wrap text-slate-700">{raw}</p>);
    i++;
  }
  flush();
  return out;
}

// ── Hoja de documento (vista de lectura / preview) ──────────────────────────
export function DocSheet({ contenido, compact }: { contenido: string; compact?: boolean }) {
  const blocks = useMemo(() => parseDoc(contenido), [contenido]);
  return (
    <div className={`mx-auto max-w-[780px] bg-white text-slate-800 shadow-xl ring-1 ring-slate-300/50 rounded-sm ${compact ? "px-10 py-9" : "px-14 py-12"}`}
      style={{ fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif" }}>
      {blocks.length ? blocks : <p className="text-slate-400 text-sm italic">Sin contenido todavía.</p>}
    </div>
  );
}

// ── Editor con barra de herramientas + vista previa en vivo ──────────────────
export function DocEditor({
  value, onChange, isDark, theme, rows = 24, defaultPreview = true,
}: {
  value: string; onChange: (v: string) => void; isDark: boolean; theme: any;
  rows?: number; defaultPreview?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [previewEdit, setPreviewEdit] = useState(defaultPreview);
  const [fs, setFs] = useState(false);

  const insertar = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) { onChange(value + snippet); return; }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? start;
    const nuevo = value.slice(0, start) + snippet + value.slice(end);
    onChange(nuevo);
    requestAnimationFrame(() => { ta.focus(); const pos = start + snippet.length; ta.selectionStart = ta.selectionEnd = pos; });
  };
  const transformarLineas = (fn: (linea: string) => string) => {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end); if (lineEnd === -1) lineEnd = value.length;
    const seg = value.slice(lineStart, lineEnd);
    const nuevoSeg = seg.split("\n").map(fn).join("\n");
    onChange(value.slice(0, lineStart) + nuevoSeg + value.slice(lineEnd));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = lineStart; ta.selectionEnd = lineStart + nuevoSeg.length; });
  };
  const tablaSnippet = (cols: number) => {
    const w = 16;
    const head = Array.from({ length: cols }, (_, i) => `Columna ${String.fromCharCode(65 + i)}`.padEnd(w)).join(" | ");
    const sep = Array.from({ length: cols }, () => "-".repeat(w)).join("-|-");
    const row = Array.from({ length: cols }, () => " ".repeat(w)).join(" | ");
    return `\n  ${head}\n  ${sep}\n  ${row}\n  ${row}\n\n`;
  };
  const onTaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") { e.preventDefault(); insertar("  "); }
  };
  const stats = useMemo(() => {
    const t = value || "";
    return { palabras: (t.match(/\S+/g) || []).length, caracteres: t.length, lineas: t ? t.split("\n").length : 0 };
  }, [value]);

  const SNIPPETS: Record<string, string> = {
    seccion: "\n\n1. TÍTULO DE LA SECCIÓN\n",
    subseccion: "\n  1.1 Subtítulo\n",
    lista: "\n  • Primer elemento\n  • Segundo elemento\n  • Tercer elemento\n",
    numerada: "\n  1) Primer paso\n  2) Segundo paso\n  3) Tercer paso\n",
    firma: "\n\nElaboró: ______________   Revisó: ______________   Aprobó: ______________\n",
    casilla: "  ☐ Opción\n",
    campo: "______________",
    separador: "\n───────────────────────────────────────────────────────────────\n",
    controlcambios: "\n\nCONTROL DE CAMBIOS\n  Versión | Fecha       | Descripción del cambio        | Autor\n  --------|-------------|-------------------------------|---------\n  1.0     | {{fecha}}   | Emisión inicial               | \n",
    encabezado: "  {{empresa}}\n  TÍTULO DEL DOCUMENTO\n  Código: ____   Versión: 1.0   Fecha: {{fecha}}\n  Elaboró: ______   Revisó: ______   Aprobó: ______\n\n",
  };

  const btn = `inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition ${isDark ? "text-slate-300 hover:bg-white/[0.08]" : "text-slate-600 hover:bg-white"}`;
  const ico = `inline-flex items-center justify-center w-7 h-7 rounded-md transition ${isDark ? "text-slate-300 hover:bg-white/[0.08]" : "text-slate-600 hover:bg-white"}`;
  const Div = () => <span className={`w-px h-5 mx-0.5 ${isDark ? "bg-white/10" : "bg-slate-300"}`} />;

  const toolbar = (
    <div className={`flex items-center gap-0.5 flex-wrap p-1.5 rounded-lg border ${isDark ? "bg-[#1E293B]/40 border-white/[0.08]" : "bg-slate-50 border-slate-200"}`}>
      <button type="button" onClick={() => insertar(SNIPPETS.seccion)} title="Insertar sección" className={btn}><Heading1 className="w-3.5 h-3.5" /> Sección</button>
      <button type="button" onClick={() => insertar(SNIPPETS.subseccion)} title="Insertar subsección" className={btn}><Heading2 className="w-3.5 h-3.5" /> Subsec.</button>
      <button type="button" onClick={() => insertar(SNIPPETS.lista)} title="Viñetas" className={ico}><ListIcon className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.numerada)} title="Lista numerada" className={ico}><ListOrdered className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.separador)} title="Separador" className={ico}><Minus className="w-4 h-4" /></button>
      <Div />
      <span className={`text-[10px] font-bold ${theme.textTertiary} pl-1`}>Tabla</span>
      {[2, 3, 4, 5].map((c) => (
        <button key={c} type="button" onClick={() => insertar(tablaSnippet(c))} title={`Tabla de ${c} columnas`} className={ico}><span className="inline-flex items-center text-[11px] font-black"><TableIcon className="w-3.5 h-3.5 mr-0.5" />{c}</span></button>
      ))}
      <Div />
      <button type="button" onClick={() => insertar(SNIPPETS.casilla)} title="Casilla de verificación" className={ico}><CheckSquare className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.campo)} title="Campo a llenar" className={ico}><FormInput className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.firma)} title="Bloque de firmas" className={ico}><PenLine className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.controlcambios)} title="Control de cambios" className={ico}><FileSignature className="w-4 h-4" /></button>
      <button type="button" onClick={() => insertar(SNIPPETS.encabezado)} title="Encabezado de documento" className={ico}><Building2 className="w-4 h-4" /></button>
      <Div />
      <button type="button" onClick={() => transformarLineas((l) => l.trim() ? "  • " + l.replace(/^\s*[•\-]\s*/, "").trim() : l)} title="Convertir líneas en viñetas" className={ico}><ListIcon className="w-4 h-4 opacity-70" /></button>
      <button type="button" onClick={() => transformarLineas((l) => l.trim() ? l.toUpperCase() : l)} title="Mayúsculas" className={ico}><CaseUpper className="w-4 h-4" /></button>
      <Div />
      <button type="button" onClick={() => insertar("{{empresa}}")} title="Campo: empresa" className={btn}><Building2 className="w-3.5 h-3.5" /> empresa</button>
      <button type="button" onClick={() => insertar("{{fecha}}")} title="Campo: fecha" className={btn}><CalIcon className="w-3.5 h-3.5" /> fecha</button>
      <div className="flex-1" />
      <button type="button" onClick={() => setPreviewEdit(!previewEdit)} title="Alternar vista previa"
        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition ${previewEdit ? "bg-indigo-600 text-white" : isDark ? "text-slate-300 hover:bg-white/[0.08]" : "text-slate-600 hover:bg-white"}`}>
        {previewEdit ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />} {previewEdit ? "Vista previa" : "Solo editor"}
      </button>
      <button type="button" onClick={() => setFs(!fs)} title={fs ? "Salir de pantalla completa" : "Pantalla completa"}
        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition ${isDark ? "text-slate-300 hover:bg-white/[0.08]" : "text-slate-600 hover:bg-white"}`}>
        {fs ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} {fs ? "Reducir" : "Ampliar"}
      </button>
    </div>
  );

  const statsBar = (
    <span className={`text-[11px] ${theme.textTertiary}`}>
      {stats.palabras} palabras · {stats.lineas} líneas · {stats.caracteres} caracteres · <span className="opacity-80">Tab para indentar</span>
    </span>
  );

  const textarea = (
    <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onTaKey} rows={fs ? undefined : rows} spellCheck={false}
      className={`w-full px-4 py-3 rounded-lg border text-[13px] leading-relaxed outline-none font-mono ${fs ? "h-full min-h-0 resize-none" : "resize-y"} ${isDark ? "bg-[#0b1220] border-white/[0.08] text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"}`}
      placeholder="Redacta aquí el contenido del documento…" />
  );
  const preview = previewEdit && (
    <div className={`rounded-lg border overflow-auto p-4 ${fs ? "h-full min-h-0" : "max-h-[560px]"} ${isDark ? "bg-[#0b1220] border-white/[0.08]" : "bg-slate-100 border-slate-200"}`}>
      <DocSheet contenido={value} compact />
    </div>
  );

  // Pantalla completa: lado a lado con espacio amplio.
  if (fs) {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col gap-3 p-4 bg-slate-900/95 backdrop-blur-sm">
        {toolbar}
        <div className={`grid gap-3 flex-1 min-h-0 ${previewEdit ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {textarea}
          {preview}
        </div>
        {statsBar}
      </div>
    );
  }

  // En línea: la vista previa se apila a ancho completo (no se ve pequeña).
  return (
    <div className="space-y-3">
      {toolbar}
      <div className="space-y-3">
        {textarea}
        {preview}
      </div>
      {statsBar}
    </div>
  );
}
