"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Edit3, Plus, RefreshCw, Search, Trash2, Truck, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

const MXN = (v: any) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));

export default function ProveedoresPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [provs, setProvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getProveedores({ empresa: String(empresaActivaId) })
      .then((r) => setProvs(r.results || [])).catch(() => setProvs([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const eliminar = async (p: any) => {
    if (!confirm(`¿Eliminar al proveedor "${p.razon_social}"?`)) return;
    try { await api.eliminarProveedor(p.id); load(); } catch (e) { alert((e as Error).message); }
  };

  const filtrados = provs.filter((p) =>
    !q || (p.razon_social || "").toLowerCase().includes(q.toLowerCase()) || (p.rfc || "").toLowerCase().includes(q.toLowerCase()));

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cxp")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-violet-500 to-indigo-600">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Proveedores</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Catálogo de proveedores: datos bancarios, crédito y autorización.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600">
            <Plus className="w-4 h-4" /> Nuevo proveedor
          </button>
        </div>
      </div>

      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} w-full max-w-sm`}>
        <Search className="w-4 h-4 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por razón social o RFC…" className="bg-transparent outline-none text-sm w-full" />
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDarkMode ? "bg-white/[0.03]" : "bg-slate-50"} ${theme.textSecondary}`}>
              <tr className="text-left">
                <Th>Razón social</Th><Th>RFC</Th><Th>Contacto</Th><Th>Banco / CLABE</Th>
                <Th align="center">Días créd.</Th><Th align="right">Saldo a favor</Th>
                <Th align="center">Autorizado</Th><Th align="center">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className={`py-10 text-center ${theme.textTertiary}`}>Sin proveedores. Crea el primero.</td></tr>
              ) : filtrados.map((p) => (
                <tr key={p.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"} ${!p.activo ? "opacity-60" : ""}`}>
                  <Td>
                    <span className={`font-bold ${theme.textPrimary}`}>{p.razon_social}</span>
                    {p.requiere_xml && <span className="ml-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">XML</span>}
                    {p.nombre_comercial && <span className={`block text-[11px] ${theme.textTertiary}`}>{p.nombre_comercial}</span>}
                  </Td>
                  <Td><span className="font-mono text-xs">{p.rfc}</span></Td>
                  <Td>
                    <span className={`block text-xs ${theme.textSecondary}`}>{p.telefono || "—"}</span>
                    {p.email && <span className={`block text-[11px] ${theme.textTertiary}`}>{p.email}</span>}
                  </Td>
                  <Td>
                    <span className={`block text-xs ${theme.textSecondary}`}>{p.banco || "—"}</span>
                    {p.clabe && <span className={`block text-[11px] font-mono ${theme.textTertiary}`}>{p.clabe}</span>}
                  </Td>
                  <Td align="center"><span className={theme.textSecondary}>{p.dias_credito || 0}</span></Td>
                  <Td align="right"><span className={`font-mono ${Number(p.saldo_a_favor) > 0 ? "text-emerald-500 font-bold" : theme.textTertiary}`}>{MXN(p.saldo_a_favor)}</span></Td>
                  <Td align="center">
                    {p.autorizado
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-500 border-emerald-500/30"><BadgeCheck className="w-3 h-3" /> Sí</span>
                      : <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-600 border-amber-500/30">Pendiente</span>}
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEdit(p)} className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-500/15"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => eliminar(p)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <ProveedorModal prov={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
    </div>
  );
}

function ProveedorModal({ prov, empresaId, isDark, theme, onClose, onSaved }: {
  prov: any; empresaId: number | null; isDark: boolean; theme: any; onClose: () => void; onSaved: () => void;
}) {
  const esNuevo = !prov.id;
  const [f, setF] = useState<any>({
    razon_social: "", rfc: "", nombre_comercial: "", telefono: "", email: "",
    banco: "", cuenta: "", clabe: "", dias_credito: "0", saldo_a_favor: "0",
    autorizado: false, requiere_xml: false, activo: true, ...prov,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.razon_social?.trim() || !f.rfc?.trim()) { alert("Razón social y RFC son obligatorios."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, razon_social: f.razon_social.trim(), rfc: f.rfc.trim().toUpperCase(),
      nombre_comercial: f.nombre_comercial || "", telefono: f.telefono || "", email: f.email || "",
      banco: f.banco || "", cuenta: f.cuenta || "", clabe: f.clabe || "",
      dias_credito: parseInt(f.dias_credito) || 0, saldo_a_favor: String(parseFloat(f.saldo_a_favor) || 0),
      autorizado: !!f.autorizado, requiere_xml: !!f.requiere_xml, activo: f.activo !== false,
    };
    try {
      if (esNuevo) await api.crearProveedor(payload);
      else await api.actualizarProveedor(prov.id, payload);
      onSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 flex items-center justify-between">
          <h2 className="text-base font-black text-white">{esNuevo ? "Nuevo proveedor" : "Editar proveedor"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        <div className="p-5 overflow-auto space-y-4">
          <div>
            <h3 className="text-sm font-black text-violet-500 mb-2">Identificación</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Razón Social *</label><input className={inp} value={f.razon_social || ""} onChange={(e) => set("razon_social", e.target.value)} /></div>
              <div><label className={lbl}>RFC *</label><input className={`${inp} font-mono uppercase`} value={f.rfc || ""} maxLength={13} onChange={(e) => set("rfc", e.target.value.toUpperCase())} /></div>
              <div><label className={lbl}>Nombre comercial</label><input className={inp} value={f.nombre_comercial || ""} onChange={(e) => set("nombre_comercial", e.target.value)} /></div>
              <div><label className={lbl}>Teléfono</label><input className={inp} value={f.telefono || ""} onChange={(e) => set("telefono", e.target.value)} /></div>
              <div><label className={lbl}>Correo electrónico</label><input className={inp} value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-violet-500 mb-2">Datos bancarios</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Banco</label><input className={inp} value={f.banco || ""} onChange={(e) => set("banco", e.target.value)} /></div>
              <div><label className={lbl}>No. de cuenta</label><input className={`${inp} font-mono`} value={f.cuenta || ""} onChange={(e) => set("cuenta", e.target.value)} /></div>
              <div><label className={lbl}>CLABE interbancaria</label><input className={`${inp} font-mono`} value={f.clabe || ""} maxLength={18} onChange={(e) => set("clabe", e.target.value)} /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-violet-500 mb-2">Condiciones</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Días de crédito</label><input type="number" className={inp} value={f.dias_credito ?? "0"} onChange={(e) => set("dias_credito", e.target.value)} /></div>
              <div><label className={lbl}>Saldo a favor (nos debe)</label><input type="number" className={inp} value={f.saldo_a_favor ?? "0"} onChange={(e) => set("saldo_a_favor", e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={!!f.autorizado} onChange={(e) => set("autorizado", e.target.checked)} /> ¿Proveedor autorizado?</label>
              <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={!!f.requiere_xml} onChange={(e) => set("requiere_xml", e.target.checked)} /> ¿Requiere XML obligatorio?</label>
              <label className={`inline-flex items-center gap-2 text-sm ${theme.textPrimary}`}><input type="checkbox" checked={f.activo !== false} onChange={(e) => set("activo", e.target.checked)} /> Activo</label>
            </div>
          </div>
        </div>

        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}>Cancelar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-gradient-to-r from-violet-500 to-indigo-600">{busy ? "Guardando…" : "Guardar proveedor"}</button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`px-4 py-3 text-[10px] uppercase tracking-[0.15em] font-black ${a}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return <td className={`px-4 py-3 ${a}`}>{children}</td>;
}
