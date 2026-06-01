"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Edit3, Plus, RefreshCw, Save, Search, Sparkles, X } from "lucide-react";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

export default function ClientesPage() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { empresaActivaId } = useUser();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any | null>(null); // objeto cliente o {} para nuevo

  const load = useCallback(() => {
    if (!empresaActivaId) return;
    setLoading(true);
    api.getClientes({ empresa: String(empresaActivaId), page_size: "300" })
      .then((r) => setClientes(r.results || [])).catch(() => setClientes([])).finally(() => setLoading(false));
  }, [empresaActivaId]);
  useEffect(() => { load(); }, [load]);

  const filtrados = clientes.filter((c) =>
    !q || (c.razon_social || "").toLowerCase().includes(q.toLowerCase()) || (c.rfc || "").toLowerCase().includes(q.toLowerCase()));

  const card = isDarkMode ? "bg-[#0F172A]/70 border-white/[0.05]" : "bg-white border-slate-200/70";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/facturacion")} className={`p-2 rounded-xl border ${isDarkMode ? "border-white/[0.08]" : "border-slate-200"}`}>
            <ArrowLeft className={`w-4 h-4 ${theme.textSecondary}`} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-amber-500 to-orange-600">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Clientes</h1>
            <p className={`text-sm ${theme.textSecondary}`}>Receptores de CFDI 4.0. Domicilio autocompletado por C.P.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${isDarkMode ? "bg-white/[0.04] border-white/[0.08] text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600">
            <Plus className="w-4 h-4" /> Nuevo cliente
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
                <Th>Razón social</Th><Th>RFC</Th><Th>C.P.</Th><Th>Municipio / Estado</Th><Th align="center">Editar</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className={`py-10 text-center ${theme.textTertiary}`}>Cargando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} className={`py-10 text-center ${theme.textTertiary}`}>Sin clientes. Crea el primero.</td></tr>
              ) : filtrados.map((c) => (
                <tr key={c.id} className={`border-t ${isDarkMode ? "border-white/[0.04]" : "border-slate-100"}`}>
                  <Td><span className={`font-bold ${theme.textPrimary}`}>{c.razon_social}</span></Td>
                  <Td><span className="font-mono text-xs">{c.rfc}</span></Td>
                  <Td><span className="font-mono text-xs">{c.cp_fiscal || "—"}</span></Td>
                  <Td><span className={`text-xs ${theme.textSecondary}`}>{[c.municipio, c.estado].filter(Boolean).join(" · ") || "—"}</span></Td>
                  <Td align="center">
                    <button onClick={() => setEdit(c)} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/15"><Edit3 className="w-4 h-4" /></button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <ClienteModal cliente={edit} empresaId={empresaActivaId} isDark={isDarkMode} theme={theme}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
    </div>
  );
}

function ClienteModal({ cliente, empresaId, isDark, theme, onClose, onSaved }: {
  cliente: any; empresaId: number | null; isDark: boolean; theme: any; onClose: () => void; onSaved: () => void;
}) {
  const esNuevo = !cliente.id;
  const [f, setF] = useState<any>({
    razon_social: "", rfc: "", cp_fiscal: "", regimen_fiscal: "", uso_cfdi_default: "G03",
    calle: "", num_ext: "", num_int: "", colonia: "", municipio: "", estado: "", pais: "MEX",
    ...cliente,
  });
  const [regimenes, setRegimenes] = useState<any[]>([]);
  const [usos, setUsos] = useState<any[]>([]);
  const [colonias, setColonias] = useState<string[]>([]);
  const [cpInfo, setCpInfo] = useState<string>("");
  const [buscandoCP, setBuscandoCP] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastCP = useRef("");

  useEffect(() => {
    api.getRegimenes().then((r) => setRegimenes(r.results || [])).catch(() => {});
    api.getUsosCFDI().then((r) => setUsos(r.results || [])).catch(() => {});
    if (cliente.cp_fiscal && cliente.cp_fiscal.length === 5) buscarCP(cliente.cp_fiscal, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const buscarCP = async (cp: string, silent = false) => {
    if (cp.length !== 5 || !/^\d+$/.test(cp) || cp === lastCP.current) return;
    lastCP.current = cp;
    setBuscandoCP(true);
    try {
      const r = await api.lookupCodigoPostal(cp);
      if (r?.found) {
        setColonias(r.colonias || []);
        setCpInfo(`${r.municipio}, ${r.estado}`);
        setF((p: any) => ({
          ...p,
          estado: r.estado || p.estado,
          municipio: r.municipio || p.municipio,
          pais: "MEX",
          // si solo hay una colonia, la autoselecciona; si no, deja la actual.
          colonia: (r.colonias || []).length === 1 ? r.colonias[0] : (silent ? p.colonia : p.colonia),
        }));
      } else {
        setColonias([]); setCpInfo("C.P. no encontrado en el catálogo SAT.");
      }
    } catch { setCpInfo(""); }
    finally { setBuscandoCP(false); }
  };

  const guardar = async () => {
    if (!f.razon_social?.trim() || !f.rfc?.trim()) { alert("Razón social y RFC son obligatorios."); return; }
    if (!f.regimen_fiscal) { alert("Selecciona el régimen fiscal."); return; }
    setBusy(true);
    const payload = {
      empresa: empresaId, razon_social: f.razon_social.trim(), rfc: f.rfc.trim().toUpperCase(),
      nombre_comercial: f.nombre_comercial || "", regimen_fiscal: f.regimen_fiscal,
      cp_fiscal: f.cp_fiscal || "", uso_cfdi_default: f.uso_cfdi_default || "G03",
      calle: f.calle || "", num_ext: f.num_ext || "", num_int: f.num_int || "",
      colonia: f.colonia || "", municipio: f.municipio || "", estado: f.estado || "", pais: f.pais || "MEX",
      direccion: [f.calle, f.num_ext, f.colonia, f.municipio, f.estado].filter(Boolean).join(", "),
      email: f.email || "", telefono: f.telefono || "",
    };
    try {
      if (esNuevo) await api.crearCliente(payload);
      else await api.actualizarCliente(cliente.id, payload);
      onSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const lbl = `text-xs font-bold mb-1 block ${theme.textSecondary}`;
  const inp = `w-full px-3 py-2 rounded-lg border text-sm outline-none ${isDark ? "bg-[#1E293B]/60 border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-3xl rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200"}`}>
        <div className="px-5 py-3 bg-gradient-to-r from-[#0B1220] to-[#0B2942] flex items-center justify-between">
          <h2 className="text-base font-black text-white flex items-center gap-2">📄 {esNuevo ? "Nuevo cliente" : "Editar cliente"} · Datos Fiscales (CFDI 4.0)</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/80" /></button>
        </div>

        <div className="p-5 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {/* Identificación */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-blue-500">Identificación del Contribuyente</h3>
            <div><label className={lbl}>Razón Social *</label><input className={inp} value={f.razon_social || ""} onChange={(e) => set("razon_social", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>RFC *</label><input className={`${inp} font-mono uppercase`} value={f.rfc || ""} onChange={(e) => set("rfc", e.target.value.toUpperCase())} maxLength={13} /></div>
              <div>
                <label className={lbl}>C.P. Fiscal *</label>
                <input className={`${inp} font-mono`} value={f.cp_fiscal || ""} maxLength={5}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 5); set("cp_fiscal", v); if (v.length === 5) buscarCP(v); }} />
              </div>
            </div>
            <div><label className={lbl}>Régimen Fiscal (SAT) *</label>
              <select className={inp} value={f.regimen_fiscal || ""} onChange={(e) => set("regimen_fiscal", e.target.value)}>
                <option value="">— Selecciona —</option>
                {regimenes.map((r) => <option key={r.clave} value={r.clave}>{r.clave} - {r.descripcion}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Uso de CFDI *</label>
              <select className={inp} value={f.uso_cfdi_default || "G03"} onChange={(e) => set("uso_cfdi_default", e.target.value)}>
                {usos.map((u) => <option key={u.clave} value={u.clave}>{u.clave} - {u.descripcion}</option>)}
              </select>
            </div>
            <p className={`text-[11px] ${theme.textTertiary}`}>Asegúrate de que coincida con el Régimen Fiscal para evitar rechazos del SAT.</p>
          </div>

          {/* Domicilio */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-blue-500">Domicilio Fiscal / Operativo</h3>
            <div className="grid grid-cols-[1fr_80px_80px] gap-3">
              <div><label className={lbl}>Calle</label><input className={inp} value={f.calle || ""} onChange={(e) => set("calle", e.target.value)} /></div>
              <div><label className={lbl}>No. Ext</label><input className={inp} value={f.num_ext || ""} onChange={(e) => set("num_ext", e.target.value)} /></div>
              <div><label className={lbl}>No. Int</label><input className={inp} value={f.num_int || ""} onChange={(e) => set("num_int", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Colonia</label>
                <input className={inp} list="colonias-cp" value={f.colonia || ""} onChange={(e) => set("colonia", e.target.value)} />
                <datalist id="colonias-cp">{colonias.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div><label className={lbl}>Municipio / Alcaldía</label><input className={inp} value={f.municipio || ""} onChange={(e) => set("municipio", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Estado</label><input className={inp} value={f.estado || ""} onChange={(e) => set("estado", e.target.value)} /></div>
              <div><label className={lbl}>País *</label><input className={inp} value={f.pais || "MEX"} onChange={(e) => set("pais", e.target.value)} /></div>
            </div>
            <div className={`rounded-xl p-3 border ${isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200"}`}>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className={`font-bold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>Auto-completado inteligente</div>
                  <p className={theme.textSecondary}>
                    {buscandoCP ? "Buscando código postal…" : cpInfo
                      ? <>Detectado: <b>{cpInfo}</b>{colonias.length > 1 ? ` · ${colonias.length} colonias sugeridas` : ""}.</>
                      : "Al ingresar el Código Postal, se llenan Estado, Municipio y se sugieren las colonias oficiales del SAT."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`px-5 py-3 border-t flex justify-between items-center ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-bold border ${isDark ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>✕ Cancelar</button>
          <button onClick={guardar} disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 inline-flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900">
            <Save className="w-4 h-4" /> {busy ? "Guardando…" : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return <th className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${align === "center" ? "text-center" : "text-left"}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return <td className={`px-3 py-2.5 ${align === "center" ? "text-center" : ""}`}>{children}</td>;
}
