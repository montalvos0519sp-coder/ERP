"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

import { Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";

interface Evento {
  id: number; fecha: string; nivel: string; accion: string; descripcion: string;
  user_username: string; empresa_nombre: string; metodo: string; ruta: string; ip: string;
}

export default function BitacoraPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const load = () => api.getBitacora({ page_size: "100" }).then((r) => setEventos(r.results || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const color = (nivel: string) =>
    nivel === "ERROR" ? "bg-rose-500/15 text-rose-300" :
    nivel === "WARN" ? "bg-amber-500/15 text-amber-300" :
    "bg-emerald-500/15 text-emerald-300";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Bitacora del sistema</h1>
            <p className={`text-sm ${t.textSecondary}`}>Auditoria de eventos importantes y cambios en la API.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4" /> Refrescar</Button>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-xs">
            <thead className={`text-left text-[10px] uppercase tracking-wide ${t.textTertiary} border-b ${t.divider}`}>
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Nivel</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Empresa</th>
                <th className="px-6 py-3">Accion</th>
                <th className="px-6 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className={`border-b ${t.divider}`}>
                  <td className={`px-6 py-2 font-mono text-[10px] ${t.textSecondary}`}>{new Date(e.fecha).toLocaleString("es-MX")}</td>
                  <td className="px-6 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color(e.nivel)}`}>{e.nivel}</span>
                  </td>
                  <td className={`px-6 py-2 ${t.textPrimary}`}>{e.user_username || "-"}</td>
                  <td className={`px-6 py-2 ${t.textSecondary}`}>{e.empresa_nombre || "-"}</td>
                  <td className={`px-6 py-2 ${t.textPrimary}`}>{e.accion}</td>
                  <td className={`px-6 py-2 ${t.textTertiary}`}>{e.descripcion}</td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr><td colSpan={6} className={`text-center py-10 ${t.textTertiary}`}>Sin eventos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
