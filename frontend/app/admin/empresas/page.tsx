"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";

import { Button, Card, Input, Select, SatCombobox } from "@/components/ui";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";

interface Empresa {
  id: number;
  nombre_comercial: string;
  razon_social: string;
  rfc: string;
  regimen_fiscal: string;
  cp_fiscal: string;
  email: string;
  telefono: string;
  activa: boolean;
}

const VACIA: Partial<Empresa> = {
  nombre_comercial: "",
  razon_social: "",
  rfc: "",
  regimen_fiscal: "601",
  cp_fiscal: "",
  email: "",
  telefono: "",
};

export default function EmpresasPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState<Partial<Empresa> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getEmpresas().then((r) => setEmpresas(r.results || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      if (editingId) await api.actualizarEmpresa(editingId, form);
      else await api.crearEmpresa(form);
      setForm(null);
      setEditingId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Empresas</h1>
          <p className={`text-sm ${t.textSecondary}`}>
            Gestiona las empresas (tenants) del sistema. Cada una tiene su propio PAC, RFC y modulos.
          </p>
        </div>
        <Button onClick={() => { setForm(VACIA); setEditingId(null); }}>
          <Plus className="w-4 h-4" /> Nueva empresa
        </Button>
      </div>

      {form && (
        <Card title={editingId ? "Editar empresa" : "Nueva empresa"} actions={(
          <button onClick={() => { setForm(null); setEditingId(null); }} className={t.textTertiary}>
            <X className="w-5 h-5" />
          </button>
        )}>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre comercial" value={form.nombre_comercial || ""} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
            <Input label="Razon social" value={form.razon_social || ""} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
            <Input label="RFC" value={form.rfc || ""} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} />
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Regimen fiscal SAT</label>
              <SatCombobox
                catalogo="regimen-fiscal"
                value={form.regimen_fiscal || "601"}
                onChange={(v, opt) => setForm({ ...form, regimen_fiscal: opt ? opt.label : v })}
              />
            </div>
            <Input label="CP fiscal" value={form.cp_fiscal || ""} onChange={(e) => setForm({ ...form, cp_fiscal: e.target.value })} />
            <Input label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setForm(null); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}><Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </Card>
      )}

      <Card title="Listado">
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead className={`text-left text-[11px] uppercase tracking-wide ${t.textTertiary} border-b ${t.divider}`}>
              <tr>
                <th className="px-6 py-3">Empresa</th>
                <th className="px-6 py-3">RFC</th>
                <th className="px-6 py-3">Regimen</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className={`border-b ${t.divider} hover:${isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                  <td className="px-6 py-3">
                    <div className={`${t.textPrimary} font-semibold`}>{e.nombre_comercial}</div>
                    <div className={`text-[10px] ${t.textTertiary}`}>{e.razon_social}</div>
                  </td>
                  <td className={`px-6 py-3 font-mono ${t.textSecondary}`}>{e.rfc}</td>
                  <td className={`px-6 py-3 ${t.textSecondary}`}>{e.regimen_fiscal}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${e.activa ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>
                      {e.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setForm(e); setEditingId(e.id); }}>Editar</Button>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr><td colSpan={5} className={`text-center py-10 ${t.textTertiary}`}>Sin empresas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
