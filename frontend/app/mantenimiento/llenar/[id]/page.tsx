"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Check, CheckCircle2, Send, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

type Tipo = "texto" | "parrafo" | "numero" | "booleano" | "seleccion" | "foto" | "fecha"
  | "unidad" | "km_unidad" | "termo" | "horas_termo";

interface Campo {
  id: number;
  clave: string;
  seccion: string;
  etiqueta: string;
  tipo: Tipo;
  obligatorio: boolean;
  ayuda: string;
  opciones: string[];
  min_valor: number | null;
  max_valor: number | null;
  depende_de: string;
  mostrar_si: string;
  foto_aplica: "" | "siempre" | "si_si" | "si_no";
  foto_obligatoria: boolean;
}

// ¿Aplica una foto adjunta a este campo, según su respuesta actual?
function fotoAplica(c: Campo, valores: Record<number, any>): boolean {
  if (c.tipo === "foto" || !c.foto_aplica) return false;
  if (c.foto_aplica === "siempre") return true;
  const val = c.tipo === "booleano" ? (valores[c.id] == null ? null : (valores[c.id] ? "si" : "no")) : null;
  if (c.foto_aplica === "si_si") return val === "si";
  if (c.foto_aplica === "si_no") return val === "no";
  return false;
}

// Valor "normalizado" de un campo para evaluar condiciones (espejo del backend).
function valorNorm(c: Campo, valores: Record<number, any>): string | null {
  const v = valores[c.id];
  if (c.tipo === "booleano") return v == null ? null : (v ? "si" : "no");
  if (c.tipo === "numero") return v === "" || v == null ? null : String(v);
  return String(v ?? "").trim();
}

// Un campo es visible si no depende de nadie, o si su campo controlador (que
// debe estar visible) tiene el valor esperado.
function esVisible(c: Campo, porClave: Record<string, Campo>, valores: Record<number, any>, depth = 0): boolean {
  if (!c.depende_de || depth > 10) return true;
  const ctrl = porClave[c.depende_de];
  if (!ctrl) return true;
  if (!esVisible(ctrl, porClave, valores, depth + 1)) return false;
  return valorNorm(ctrl, valores) === c.mostrar_si;
}

function PhotoInput({ prev, isDark, onPick, onClear }: {
  prev?: string; isDark: boolean; onPick: (f: File | undefined) => void; onClear: () => void;
}) {
  return (
    <div>
      {prev ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prev} alt="foto" className="w-full max-h-64 object-cover rounded-xl border border-white/10" />
          <button onClick={onClear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer ${
          isDark ? "border-white/[0.1] text-slate-400" : "border-slate-300 text-slate-500"
        }`}>
          <Camera className="w-8 h-8" />
          <span className="text-sm font-bold">Tomar / subir foto</span>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

export default function LlenarFlujoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const etapaEjecucion = searchParams?.get("etapa") || "";
  const id = params?.id as string;
  const { isDarkMode: isDark, theme } = useTheme();

  const [flujo, setFlujo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valores, setValores] = useState<Record<number, any>>({});
  const [fotos, setFotos] = useState<Record<number, File>>({});
  const [fotoPrev, setFotoPrev] = useState<Record<number, string>>({});
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  // Catálogos de flota para los campos especiales.
  const [unidades, setUnidades] = useState<any[]>([]);
  const [termos, setTermos] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const f = await api.getFlujoMantto(id);
      setFlujo(f);
    } catch (e) { alert((e as Error).message); router.push("/mantenimiento/flujos"); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const tipos = new Set<string>((flujo?.campos || []).map((c: any) => c.tipo));
    if (tipos.has("unidad") || tipos.has("km_unidad") || tipos.has("termo") || tipos.has("horas_termo")) {
      api.getUnidades({ activo: "true" }).then((r) => setUnidades(r.results || [])).catch(() => {});
      api.getTermos({ activo: "true" }).then((r) => setTermos(r.results || [])).catch(() => {});
    }
  }, [flujo]);

  const setVal = (cid: number, v: any) => setValores((p) => ({ ...p, [cid]: v }));

  // Al elegir unidad: prellena km y, si la unidad lleva termo fijo, el termo.
  const onSelectUnidad = (campoId: number, unidadId: string) => {
    const campos: Campo[] = flujo?.campos || [];
    const u = unidades.find((x) => String(x.id) === String(unidadId));
    setValores((p) => {
      const next = { ...p, [campoId]: unidadId };
      for (const c of campos) {
        if (c.tipo === "km_unidad" && u) next[c.id] = String(Number(u.km_actual ?? 0));
        if (c.tipo === "termo") {
          if (u?.termo_fijo && u?.termo) next[c.id] = String(u.termo);
        }
        if (c.tipo === "horas_termo") {
          const t = termos.find((x) => String(x.id) === String(u?.termo));
          if (u?.termo_fijo && t) next[c.id] = String(Number(t.horas_actual ?? 0));
        }
      }
      return next;
    });
  };

  const onFoto = (cid: number, file: File | undefined) => {
    if (!file) return;
    setFotos((p) => ({ ...p, [cid]: file }));
    setFotoPrev((p) => ({ ...p, [cid]: URL.createObjectURL(file) }));
  };
  const clearFoto = (cid: number) => {
    setFotos((p) => { const n = { ...p }; delete n[cid]; return n; });
    setFotoPrev((p) => { const n = { ...p }; delete n[cid]; return n; });
  };

  const enviar = async () => {
    const campos: Campo[] = flujo?.campos || [];
    const porClave: Record<string, Campo> = {};
    campos.forEach((c) => { if (c.clave) porClave[c.clave] = c; });
    const visibles = campos.filter((c) => esVisible(c, porClave, valores));
    // Validación cliente (espejo de la del backend); solo campos visibles.
    const numericos = ["numero", "km_unidad", "horas_termo", "unidad", "termo"];
    for (const c of visibles) {
      const v = valores[c.id];
      const vacio = c.tipo === "foto" ? !fotos[c.id]
        : c.tipo === "booleano" ? (v === undefined || v === null)
        : numericos.includes(c.tipo) ? (v === undefined || v === "" || v === null)
        : !String(v ?? "").trim();
      if (c.obligatorio && vacio) { alert(`"${c.etiqueta}" es obligatorio.`); return; }
      if ((c.tipo === "numero" || c.tipo === "km_unidad" || c.tipo === "horas_termo") && !vacio) {
        const n = Number(v);
        if (c.min_valor != null && n < c.min_valor) { alert(`"${c.etiqueta}" debe ser ≥ ${c.min_valor}.`); return; }
        if (c.max_valor != null && n > c.max_valor) { alert(`"${c.etiqueta}" debe ser ≤ ${c.max_valor}.`); return; }
      }
      if (c.foto_obligatoria && fotoAplica(c, valores) && !fotos[c.id]) {
        alert(`Falta la foto de "${c.etiqueta}".`); return;
      }
    }
    const payload = visibles.map((c) => {
      if (c.tipo === "foto") return null;
      if (c.tipo === "booleano") return valores[c.id] == null ? null : { campo: c.id, booleano: !!valores[c.id] };
      if (c.tipo === "numero" || c.tipo === "km_unidad" || c.tipo === "horas_termo")
        return valores[c.id] === "" || valores[c.id] == null ? null : { campo: c.id, numero: Number(valores[c.id]) };
      if (c.tipo === "unidad") {
        const v = valores[c.id]; if (!v) return null;
        const u = unidades.find((x) => String(x.id) === String(v));
        return { campo: c.id, numero: Number(v), texto: u ? `${u.numero}${u.placas ? " · " + u.placas : ""}` : "" };
      }
      if (c.tipo === "termo") {
        const v = valores[c.id]; if (!v) return null;
        const t = termos.find((x) => String(x.id) === String(v));
        return { campo: c.id, numero: Number(v), texto: t ? `${t.numero}${t.marca ? " · " + t.marca : ""}` : "" };
      }
      const t = String(valores[c.id] ?? "").trim();
      return t ? { campo: c.id, texto: t } : null;
    }).filter(Boolean);

    const visiblesIds = new Set(visibles.map((c) => c.id));
    const fd = new FormData();
    fd.append("valores", JSON.stringify(payload));
    if (etapaEjecucion) fd.append("etapa_ejecucion", etapaEjecucion);
    if (nota.trim()) fd.append("nota", nota.trim());
    Object.entries(fotos).forEach(([cid, file]) => { if (visiblesIds.has(Number(cid))) fd.append(`foto_${cid}`, file); });

    setEnviando(true);
    try {
      await api.responderFlujoMantto(id, fd);
      setOk(true);
    } catch (e) { alert((e as Error).message); }
    finally { setEnviando(false); }
  };

  const inputCls = `w-full px-3 py-3 rounded-xl border text-base outline-none ${
    isDark ? "bg-[#1E293B]/50 border-white/[0.08] text-white focus:border-emerald-500/50"
           : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500/50"
  }`;

  if (loading) return <div className={`p-10 text-center ${theme.textTertiary}`}>Cargando…</div>;

  if (ok) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-10 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
        <h1 className={`text-2xl font-black ${theme.textPrimary}`}>¡Enviado y resguardado!</h1>
        <p className={`text-sm mt-2 ${theme.textSecondary}`}>Tu respuesta de "{flujo?.nombre}" quedó guardada.</p>
        {etapaEjecucion && <p className={`text-xs mt-2 ${theme.textTertiary}`}>Si había una siguiente etapa, ya se habilitó a sus responsables.</p>}
        <div className="mt-6 flex gap-2 justify-center">
          {!etapaEjecucion && (
            <button onClick={() => { setOk(false); setValores({}); setFotos({}); setFotoPrev({}); setNota(""); }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700">
              Llenar otra vez
            </button>
          )}
          <button onClick={() => router.push(etapaEjecucion ? "/mantenimiento/pendientes" : "/mantenimiento/flujos?tab=llenar")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border ${isDark ? "bg-white/[0.04] border-white/[0.06] text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const campos: Campo[] = flujo?.campos || [];
  // Evalúa visibilidad condicional con las respuestas actuales.
  const porClave: Record<string, Campo> = {};
  campos.forEach((c) => { if (c.clave) porClave[c.clave] = c; });
  const camposVisibles = campos.filter((c) => esVisible(c, porClave, valores));
  // Unidad seleccionada (para bloquear el termo fijo, etc.).
  const unidadCampo = campos.find((c) => c.tipo === "unidad");
  const unidadSel = unidadCampo ? unidades.find((u) => String(u.id) === String(valores[unidadCampo.id])) : null;
  // Agrupa por sección (solo visibles).
  const secciones: { nombre: string; campos: Campo[] }[] = [];
  for (const c of camposVisibles) {
    const sec = c.seccion || "General";
    let g = secciones.find((s) => s.nombre === sec);
    if (!g) { g = { nombre: sec, campos: [] }; secciones.push(g); }
    g.campos.push(c);
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/mantenimiento/flujos?tab=llenar")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100"}`}>
          <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <div className="min-w-0">
          <h1 className={`text-lg font-black tracking-tight truncate ${theme.textPrimary}`}>{flujo?.nombre}</h1>
          {flujo?.descripcion && <p className={`text-xs ${theme.textSecondary}`}>{flujo.descripcion}</p>}
        </div>
      </div>

      {secciones.map((sec) => (
        <div key={sec.nombre} className="space-y-3">
          <h2 className={`text-xs font-black uppercase tracking-wider ${theme.textTertiary}`}>{sec.nombre}</h2>
          {sec.campos.map((c) => (
            <div key={c.id} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
              <label className={`block text-sm font-bold mb-2 ${theme.textPrimary}`}>
                {c.etiqueta} {c.obligatorio && <span className="text-rose-500">*</span>}
              </label>
              {c.ayuda && <p className={`text-xs mb-2 ${theme.textTertiary}`}>{c.ayuda}</p>}

              {c.tipo === "texto" && (
                <input value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls} />
              )}
              {c.tipo === "parrafo" && (
                <textarea value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} rows={3} className={`${inputCls} resize-none`} />
              )}
              {c.tipo === "fecha" && (
                <input type="date" value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls} />
              )}
              {c.tipo === "numero" && (
                <>
                  <input type="number" inputMode="decimal" value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls}
                    min={c.min_valor ?? undefined} max={c.max_valor ?? undefined} />
                  {(c.min_valor != null || c.max_valor != null) && (
                    <p className={`text-[11px] mt-1 ${theme.textTertiary}`}>
                      Rango permitido: {c.min_valor ?? "−∞"} a {c.max_valor ?? "∞"}
                    </p>
                  )}
                </>
              )}
              {c.tipo === "booleano" && (
                <div className="flex gap-2">
                  {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map((opt) => {
                    const sel = valores[c.id] === opt.v;
                    return (
                      <button key={opt.l} onClick={() => setVal(c.id, opt.v)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                          sel ? (opt.v ? "bg-emerald-600 border-transparent text-white" : "bg-rose-600 border-transparent text-white")
                              : isDark ? "bg-white/[0.03] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"
                        }`}>
                        {sel && <Check className="w-4 h-4 inline mr-1" />}{opt.l}
                      </button>
                    );
                  })}
                </div>
              )}
              {c.tipo === "seleccion" && (
                <div className="space-y-2">
                  {(c.opciones || []).map((op) => {
                    const sel = valores[c.id] === op;
                    return (
                      <button key={op} onClick={() => setVal(c.id, op)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          sel ? "bg-emerald-600 border-transparent text-white"
                              : isDark ? "bg-white/[0.03] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"
                        }`}>
                        {sel && <Check className="w-4 h-4 inline mr-1.5" />}{op}
                      </button>
                    );
                  })}
                </div>
              )}
              {c.tipo === "unidad" && (
                <select value={valores[c.id] ?? ""} onChange={(e) => onSelectUnidad(c.id, e.target.value)} className={inputCls}>
                  <option value="">— Selecciona la unidad —</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.numero}{u.placas ? ` · ${u.placas}` : ""}</option>)}
                </select>
              )}
              {c.tipo === "km_unidad" && (
                <>
                  <input type="number" inputMode="decimal" value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls}
                    min={c.min_valor ?? undefined} max={c.max_valor ?? undefined} placeholder="Km actual" />
                  <p className={`text-[11px] mt-1 text-amber-500`}>Al enviar, actualiza el km de la unidad en el catálogo.</p>
                </>
              )}
              {c.tipo === "termo" && (
                unidadSel?.termo_fijo && unidadSel?.termo ? (
                  <div className={`px-3 py-3 rounded-xl border text-sm ${isDark ? "bg-white/[0.03] border-white/[0.08] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    🔒 Termo fijo: <b>{unidadSel.termo_detalle?.numero || termos.find((t) => t.id === unidadSel.termo)?.numero || unidadSel.termo}</b>
                  </div>
                ) : (
                  <select value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls}>
                    <option value="">— Selecciona el termo —</option>
                    {termos.map((t) => <option key={t.id} value={t.id}>{t.numero}{t.marca ? ` · ${t.marca}` : ""}</option>)}
                  </select>
                )
              )}
              {c.tipo === "horas_termo" && (
                <>
                  <input type="number" inputMode="decimal" value={valores[c.id] ?? ""} onChange={(e) => setVal(c.id, e.target.value)} className={inputCls}
                    min={c.min_valor ?? undefined} max={c.max_valor ?? undefined} placeholder="Horómetro" />
                  <p className={`text-[11px] mt-1 text-amber-500`}>Al enviar, actualiza el horómetro del termo en el catálogo.</p>
                </>
              )}

              {c.tipo === "foto" && (
                <PhotoInput prev={fotoPrev[c.id]} isDark={isDark}
                  onPick={(f) => onFoto(c.id, f)} onClear={() => clearFoto(c.id)} />
              )}

              {/* Foto adjunta al campo (cuando el creador la configuró y aplica) */}
              {fotoAplica(c, valores) && (
                <div className="mt-3">
                  <p className={`text-xs font-bold mb-1.5 ${theme.textSecondary}`}>
                    📷 Foto {c.foto_obligatoria && <span className="text-rose-500">*</span>}
                  </p>
                  <PhotoInput prev={fotoPrev[c.id]} isDark={isDark}
                    onPick={(f) => onFoto(c.id, f)} onClear={() => clearFoto(c.id)} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Nota general */}
      <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70"}`}>
        <label className={`block text-sm font-bold mb-2 ${theme.textPrimary}`}>Nota general (opcional)</label>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={`${inputCls} resize-none`}
          placeholder="Comentarios adicionales…" />
      </div>

      {/* Barra de envío fija */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
        <div className="max-w-lg mx-auto">
          <button onClick={enviar} disabled={enviando}
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-black text-white shadow-xl disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
            <Send className="w-5 h-5" /> {enviando ? "Enviando…" : "Enviar respuesta"}
          </button>
        </div>
      </div>
    </div>
  );
}
