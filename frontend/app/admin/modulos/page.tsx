"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes } from "lucide-react";

import { Card, Switch } from "@/components/ui";
import { api } from "@/lib/api";
import { getIcon } from "@/lib/icons";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";

interface Modulo {
  id: number; codigo: string; nombre: string; categoria: string;
  color: string; icono: string; ruta_frontend: string; es_core: boolean;
}

interface ModuloEmpresa {
  id?: number; empresa: number; modulo: number; activo: boolean;
}

export default function AdminModulosPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const { empresaActivaId } = useUser();

  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [modulosEmpresa, setModulosEmpresa] = useState<ModuloEmpresa[]>([]);

  useEffect(() => {
    api.getModulos().then((r) => setModulos(r.results || [])).catch(() => {});
  }, []);

  const refreshME = () => {
    if (!empresaActivaId) return;
    api.getModulosEmpresa(empresaActivaId).then((r) => setModulosEmpresa(r.results || [])).catch(() => {});
  };
  useEffect(refreshME, [empresaActivaId]);

  const activoMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    modulosEmpresa.forEach((me) => { map[me.modulo] = me.activo; });
    return map;
  }, [modulosEmpresa]);

  const grouped = useMemo(() => {
    const map: Record<string, Modulo[]> = {};
    modulos.forEach((m) => {
      (map[m.categoria] = map[m.categoria] || []).push(m);
    });
    return map;
  }, [modulos]);

  const handleToggle = async (mod: Modulo, activo: boolean) => {
    if (!empresaActivaId) return;
    await api.toggleModuloEmpresa(empresaActivaId, mod.id, activo);
    refreshME();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
          <Boxes className="w-6 h-6" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Modulos del sistema</h1>
          <p className={`text-sm ${t.textSecondary}`}>
            Activa o desactiva modulos para la empresa actual. Solo los modulos activos aparecen en el menu.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, mods]) => (
        <Card key={cat} title={cat}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mods.map((m) => {
              const Icon = getIcon(m.icono);
              const activo = !!activoMap[m.id];
              return (
                <div key={m.id} className={`p-4 rounded-xl border ${t.divider} flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}22`, color: m.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${t.textPrimary} truncate`}>{m.nombre}</div>
                      <div className={`text-[10px] ${t.textTertiary} truncate`}>{m.codigo}{m.es_core ? " · core" : ""}</div>
                    </div>
                  </div>
                  <Switch checked={activo} onChange={(v) => handleToggle(m, v)} />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
