"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, FileStack, User as UserIcon } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

interface Valor {
  id: number; campo: number; etiqueta: string; tipo: string; seccion: string;
  texto: string | null; numero: number | null; booleano: boolean | null; foto_url: string | null;
}
interface Respuesta {
  id: number; flujo_nombre: string; tecnico_username: string; nota: string;
  creado: string; valores: Valor[];
  unidad_numero: string; termo_numero: string;
}

function valorTexto(v: Valor): string {
  if (v.tipo === "booleano") return v.booleano ? "Sí" : "No";
  if (["numero", "km_unidad", "horas_termo"].includes(v.tipo)) return v.numero != null ? String(v.numero) : "—";
  return v.texto || "—";  // unidad/termo guardan su etiqueta en texto
}

export default function RespuestasPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isDarkMode: isDark, theme } = useTheme();
  const [items, setItems] = useState<Respuesta[]>([]);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([
        api.respuestasFlujoMantto(id),
        api.getFlujoMantto(id).catch(() => null),
      ]);
      setItems(r.results || []);
      if (f) setNombre(f.nombre);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/mantenimiento/flujos")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <div className="min-w-0">
          <h1 className={`text-xl font-black tracking-tight truncate ${theme.textPrimary}`}>Respuestas resguardadas</h1>
          <p className={`text-sm ${theme.textSecondary}`}>{nombre} · {items.length} registros</p>
        </div>
      </div>

      {loading ? (
        <div className={`text-center py-16 ${theme.textTertiary}`}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className={`text-center py-16 px-6 rounded-3xl border-2 border-dashed ${isDark ? "border-white/[0.06] text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <FileStack className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aún no hay respuestas para este flujo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold ${theme.textTertiary} mb-3`}>
                <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.tecnico_username || "—"}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.creado).toLocaleString("es-MX")}</span>
                {r.unidad_numero && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">🚚 {r.unidad_numero}</span>}
                {r.termo_numero && <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600">❄ {r.termo_numero}</span>}
              </div>
              <div className="space-y-2">
                {r.valores.map((v) => (
                  <div key={v.id} className="flex items-start gap-2">
                    <span className={`text-xs font-bold shrink-0 ${theme.textSecondary}`} style={{ minWidth: 130 }}>{v.etiqueta}:</span>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {v.tipo !== "foto" && (
                        <span className={`text-sm ${theme.textPrimary}`}>{valorTexto(v)}</span>
                      )}
                      {v.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.foto_url} alt={v.etiqueta} onClick={() => setZoom(v.foto_url)}
                          className="w-24 h-24 object-cover rounded-lg border border-white/10 cursor-zoom-in" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {r.nota && (
                <p className={`mt-3 text-xs italic ${theme.textSecondary} border-t pt-2 ${isDark ? "border-white/[0.06]" : "border-slate-100"}`}>
                  Nota: {r.nota}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoom && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="foto" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
