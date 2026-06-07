"use client";

// Página PÚBLICA de encuesta (sin login). El cliente abre el link, responde y
// envía; la respuesta cae en Quejas/Satisfacción del SGC.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, Send, CheckCircle2, Loader2, ClipboardX } from "lucide-react";

import { api } from "@/lib/api";

export default function EncuestaPublicaPage() {
  const params = useParams();
  const token = String(params?.token || "");
  const [enc, setEnc] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "cerrada" | "error" | "enviada">("cargando");
  const [resp, setResp] = useState<Record<string, any>>({});
  const [cliente, setCliente] = useState({ nombre: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [gracias, setGracias] = useState("");

  useEffect(() => {
    if (!token) return;
    api.getEncuestaPublica(token).then((d) => {
      if (!d) { setEstado("error"); return; }
      if (d.cerrada) { setEstado("cerrada"); return; }
      setEnc(d); setEstado("ok");
    }).catch(() => setEstado("error"));
  }, [token]);

  const color = enc?.color || "#EC4899";
  const set = (id: string, v: any) => setResp((p) => ({ ...p, [id]: v }));

  const enviar = async () => {
    // Validación de requeridas.
    for (const p of enc.preguntas || []) {
      if (p.requerido && (resp[p.id] == null || resp[p.id] === "" || (Array.isArray(resp[p.id]) && !resp[p.id].length))) {
        alert(`Responde: ${p.titulo}`); return;
      }
    }
    setBusy(true);
    try {
      const r = await api.responderEncuesta(token, { cliente_nombre: cliente.nombre, cliente_email: cliente.email, respuestas: resp });
      setGracias(r?.mensaje || "¡Gracias por tu respuesta!");
      setEstado("enviada");
    } catch { alert("No se pudo enviar. Intenta de nuevo."); }
    finally { setBusy(false); }
  };

  const Wrap = ({ children }: any) => (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${color}22, #0b1220 60%)` }}>
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );

  if (estado === "cargando") return <Wrap><div className="text-center text-white/80"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div></Wrap>;
  if (estado === "error") return <Wrap><div className="bg-white rounded-3xl p-8 text-center"><ClipboardX className="w-10 h-10 mx-auto text-rose-500 mb-2" /><h1 className="text-lg font-black text-slate-800">Encuesta no encontrada</h1><p className="text-sm text-slate-500">El enlace no es válido o expiró.</p></div></Wrap>;
  if (estado === "cerrada") return <Wrap><div className="bg-white rounded-3xl p-8 text-center"><ClipboardX className="w-10 h-10 mx-auto text-amber-500 mb-2" /><h1 className="text-lg font-black text-slate-800">Encuesta cerrada</h1><p className="text-sm text-slate-500">Esta encuesta ya no recibe respuestas. ¡Gracias!</p></div></Wrap>;
  if (estado === "enviada") return <Wrap><div className="bg-white rounded-3xl p-10 text-center"><div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: color + "22" }}><CheckCircle2 className="w-9 h-9" style={{ color }} /></div><h1 className="text-xl font-black text-slate-800">{gracias}</h1><p className="text-sm text-slate-500 mt-1">Tu opinión nos ayuda a mejorar.</p></div></Wrap>;

  return (
    <Wrap>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-7 py-6" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
          {enc.empresa_nombre && <div className="text-white/80 text-xs font-bold uppercase tracking-wider">{enc.empresa_nombre}</div>}
          <h1 className="text-2xl font-black text-white">{enc.titulo}</h1>
          {enc.descripcion && <p className="text-white/90 text-sm mt-1">{enc.descripcion}</p>}
        </div>
        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <input value={cliente.nombre} onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))} placeholder="Tu nombre (opcional)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400" />
            <input value={cliente.email} onChange={(e) => setCliente((c) => ({ ...c, email: e.target.value }))} placeholder="Tu correo (opcional)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400" />
          </div>

          {(enc.preguntas || []).map((p: any, i: number) => (
            <div key={p.id} className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-bold text-slate-800 mb-2">{i + 1}. {p.titulo} {p.requerido && <span style={{ color }}>*</span>}</label>
              <Pregunta p={p} value={resp[p.id]} onChange={(v) => set(p.id, v)} color={color} />
            </div>
          ))}

          <button onClick={enviar} disabled={busy} className="w-full py-3 rounded-xl text-white font-black text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {busy ? "Enviando…" : "Enviar respuesta"}
          </button>
          <p className="text-center text-[11px] text-slate-400">Tus respuestas son confidenciales.</p>
        </div>
      </div>
    </Wrap>
  );
}

function Pregunta({ p, value, onChange, color }: { p: any; value: any; onChange: (v: any) => void; color: string }) {
  const baseInp = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-slate-400";
  if (p.tipo === "rating") {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star className="w-8 h-8" style={{ fill: n <= (value || 0) ? "#f59e0b" : "transparent", color: n <= (value || 0) ? "#f59e0b" : "#cbd5e1" }} />
          </button>
        ))}
        {value ? <span className="ml-2 text-sm font-bold text-slate-500">{value}/5</span> : null}
      </div>
    );
  }
  if (p.tipo === "nps") {
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className="w-8 h-8 rounded-lg text-sm font-bold border" style={value === n ? { background: color, color: "#fff", borderColor: color } : { borderColor: "#e2e8f0", color: "#475569" }}>{n}</button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Nada probable</span><span>Muy probable</span></div>
      </div>
    );
  }
  if (p.tipo === "si_no") {
    return (
      <div className="flex gap-2">
        {["Sí", "No"].map((o) => <button key={o} type="button" onClick={() => onChange(o)} className="px-5 py-2 rounded-lg text-sm font-bold border" style={value === o ? { background: color, color: "#fff", borderColor: color } : { borderColor: "#e2e8f0", color: "#475569" }}>{o}</button>)}
      </div>
    );
  }
  if (p.tipo === "opcion") {
    return (
      <div className="space-y-1.5">
        {(p.opciones || []).map((o: string) => (
          <button key={o} type="button" onClick={() => onChange(o)} className="w-full text-left px-3 py-2 rounded-lg text-sm border flex items-center gap-2" style={value === o ? { background: color + "15", borderColor: color, color: "#1e293b" } : { borderColor: "#e2e8f0", color: "#475569" }}>
            <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: value === o ? color : "#cbd5e1" }}>{value === o && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}</span>{o}
          </button>
        ))}
      </div>
    );
  }
  if (p.tipo === "checkbox") {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (o: string) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return (
      <div className="space-y-1.5">
        {(p.opciones || []).map((o: string) => (
          <button key={o} type="button" onClick={() => toggle(o)} className="w-full text-left px-3 py-2 rounded-lg text-sm border flex items-center gap-2" style={arr.includes(o) ? { background: color + "15", borderColor: color, color: "#1e293b" } : { borderColor: "#e2e8f0", color: "#475569" }}>
            <span className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center" style={{ borderColor: arr.includes(o) ? color : "#cbd5e1", background: arr.includes(o) ? color : "transparent" }}>{arr.includes(o) && <CheckCircle2 className="w-3 h-3 text-white" />}</span>{o}
          </button>
        ))}
      </div>
    );
  }
  if (p.tipo === "parrafo") return <textarea rows={3} className={baseInp} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Escribe tu respuesta…" />;
  return <input className={baseInp} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Tu respuesta…" />;
}
