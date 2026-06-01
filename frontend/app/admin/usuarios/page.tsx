"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, ShieldCheck, X } from "lucide-react";

import { Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";

interface User {
  id: number; username: string; email: string; first_name: string; last_name: string;
  is_active: boolean; is_staff: boolean; is_superuser: boolean;
  empresas: { id: number; nombre: string; rol: string }[];
}

export default function AdminUsuariosPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<{ username: string; email: string; first_name: string; last_name: string; password: string; is_staff: boolean } | null>(null);
  const [error, setError] = useState("");

  const load = () => api.getUsuarios().then((r) => setUsers(r.results || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form) return;
    setError("");
    try {
      await api.crearUsuario(form);
      setForm(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Usuarios</h1>
          <p className={`text-sm ${t.textSecondary}`}>Administra las cuentas que acceden al ERP.</p>
        </div>
        <Button onClick={() => setForm({ username: "", email: "", first_name: "", last_name: "", password: "", is_staff: false })}>
          <Plus className="w-4 h-4" /> Nuevo usuario
        </Button>
      </div>

      {form && (
        <Card title="Nuevo usuario" actions={<button onClick={() => setForm(null)} className={t.textTertiary}><X className="w-5 h-5" /></button>}>
          {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Nombre" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Apellidos" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_staff} onChange={(e) => setForm({ ...form, is_staff: e.target.checked })} />
              <span className={t.textSecondary}>Es staff (puede administrar)</span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={submit}><Save className="w-4 h-4" /> Crear</Button>
          </div>
        </Card>
      )}

      <Card title="Usuarios">
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead className={`text-left text-[11px] uppercase tracking-wide ${t.textTertiary} border-b ${t.divider}`}>
              <tr>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Empresas</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b ${t.divider}`}>
                  <td className="px-6 py-3">
                    <div className={`${t.textPrimary} font-semibold`}>{u.first_name} {u.last_name}</div>
                    <div className={`text-[10px] ${t.textTertiary}`}>@{u.username}{u.is_superuser ? " · super" : ""}</div>
                  </td>
                  <td className={`px-6 py-3 ${t.textSecondary}`}>{u.email || "-"}</td>
                  <td className="px-6 py-3">
                    {u.empresas.map((e) => (
                      <span key={e.id} className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 mr-1">
                        {e.nombre} · {e.rol}
                      </span>
                    ))}
                    {!u.empresas.length && <span className={t.textTertiary}>-</span>}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
