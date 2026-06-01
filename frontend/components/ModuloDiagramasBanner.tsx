"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, Workflow } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface DiagItem {
  id: number;
  titulo: string;
  descripcion: string;
  nodos_count: number;
  modulo_codigo: string;
  modulo_nombre: string;
  creado_por_username: string;
}

/**
 * Banner que aparece arriba del contenido de un modulo y lista los diagramas de
 * flujo APROBADOS y vinculados a ese modulo. Cualquier usuario con acceso al
 * modulo los ve aqui sin tener que entrar a /diagramas. Si el modulo no tiene
 * diagramas vinculados, no renderiza nada.
 */
export default function ModuloDiagramasBanner({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useTheme();
  const [items, setItems] = useState<DiagItem[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancel = false;
    // Solo tiene sentido en rutas de modulo (no en la propia pagina de diagramas).
    if (!pathname || pathname === "/" || pathname.startsWith("/diagramas")) {
      setItems([]);
      return;
    }
    api.diagramasPorModulo({ ruta: pathname })
      .then((r) => { if (!cancel) setItems(r.results || []); })
      .catch(() => { if (!cancel) setItems([]); });
    return () => { cancel = true; };
  }, [pathname]);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("erp.modDiagramas.open");
      if (v !== null) setOpen(v === "1");
    } catch { /* */ }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      const nv = !v;
      try { window.localStorage.setItem("erp.modDiagramas.open", nv ? "1" : "0"); } catch { /* */ }
      return nv;
    });
  };

  if (items.length === 0) return null;

  const moduloNombre = items[0]?.modulo_nombre || "este módulo";

  return (
    <div className={`mx-4 mt-4 rounded-2xl border overflow-hidden ${
      isDark ? "bg-fuchsia-500/[0.06] border-fuchsia-500/20" : "bg-fuchsia-50 border-fuchsia-200"
    }`}>
      <button onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 transition-colors ${
          isDark ? "hover:bg-white/[0.03]" : "hover:bg-fuchsia-100/50"
        }`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
            <Workflow className="w-4 h-4" />
          </span>
          <span className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
            Diagramas de flujo · {moduloNombre}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-500">
            {items.length}
          </span>
        </div>
        {open ? <ChevronUp className={`w-4 h-4 ${theme.textTertiary}`} />
              : <ChevronDown className={`w-4 h-4 ${theme.textTertiary}`} />}
      </button>

      {open && (
        <div className="px-4 pb-3 flex gap-2.5 overflow-x-auto custom-scrollbar">
          {items.map((d) => (
            <div key={d.id}
              className={`shrink-0 w-60 rounded-xl border p-3 transition-all hover:shadow-md ${
                isDark ? "bg-[#0F172A]/70 border-white/[0.06] hover:border-fuchsia-500/30"
                       : "bg-white border-slate-200 hover:border-fuchsia-300"
              }`}>
              <button onClick={() => router.push(`/diagramas/${d.id}`)}
                title={d.descripcion || d.titulo} className="block w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: "linear-gradient(135deg,rgba(236,72,153,0.18),rgba(139,92,246,0.22))" }}>
                    <Workflow className="w-4 h-4 text-fuchsia-500" />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${theme.textPrimary}`}>{d.titulo}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>
                      {d.nodos_count} nodos · {d.creado_por_username || "—"}
                    </p>
                  </div>
                </div>
                {d.descripcion && (
                  <p className={`mt-1.5 text-[11px] truncate ${theme.textSecondary}`}>{d.descripcion}</p>
                )}
              </button>
              <button onClick={() => router.push(`/diagramas/${d.id}?pdf=1`)}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] hover:opacity-90 transition-opacity">
                <FileText className="w-3.5 h-3.5" /> Ver en PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
