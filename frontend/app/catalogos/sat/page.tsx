"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Upload } from "lucide-react";

import { Button, Card, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import { useTheme } from "@/lib/ThemeContext";

const TIPOS = [
  { value: "cp", label: "Carta Porte 3.1 (ClaveProdServCP)" },
  { value: "prod", label: "Productos y Servicios (CFDI)" },
  { value: "unidad", label: "Claves de Unidad" },
  { value: "cp_postal", label: "Codigos Postales" },
  { value: "estado", label: "Estados" },
  { value: "municipio", label: "Municipios" },
  { value: "colonia", label: "Colonias" },
];

export default function CatalogosSATPage() {
  const { isDark } = useTheme();
  const t = useMemo(() => getTheme(isDark), [isDark]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [tipo, setTipo] = useState("cp");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>("");
  const ref = useRef<HTMLInputElement>(null);

  const load = () => api.getCatalogosSATStats().then(setStats).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!archivo) return;
    setLoading(true); setLog("");
    try {
      const r = await api.uploadCatalogoSAT(tipo, archivo);
      setLog(r.log || "OK");
      setArchivo(null);
      if (ref.current) ref.current.value = "";
      load();
    } catch (e) {
      setLog((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Catalogos SAT</h1>
          <p className={`text-sm ${t.textSecondary}`}>
            Carga/actualiza los catalogos del SAT desde Excel. Estos datos alimentan facturacion y Carta Porte.
          </p>
        </div>
      </div>

      <Card title="Estadisticas actuales">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {stats && Object.entries(stats).map(([k, v]) => (
            <div key={k} className={`p-4 rounded-xl border ${t.divider} text-center`}>
              <div className={`text-2xl font-bold ${t.textPrimary}`}>{v.toLocaleString()}</div>
              <div className={`text-[10px] ${t.textTertiary} mt-1`}>{k}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Subir catalogo desde Excel" subtitle="Selecciona el tipo y el archivo .xlsx. El sistema importa automaticamente.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Tipo de catalogo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((tp) => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
          </Select>
          <label className="block">
            <span className={`block text-xs font-semibold mb-1.5 ${t.textSecondary}`}>Archivo .xlsx</span>
            <input
              ref={ref}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className={`block w-full text-sm ${t.textSecondary} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30`}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button disabled={!archivo || loading} onClick={upload}>
            <Upload className="w-4 h-4" /> {loading ? "Subiendo..." : "Subir y cargar"}
          </Button>
        </div>
        {log && (
          <pre className={`mt-4 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap ${isDark ? "bg-black/30 text-emerald-300" : "bg-slate-100 text-slate-700"}`}>
            {log}
          </pre>
        )}
      </Card>

      <Card title="Comandos disponibles" subtitle="Tambien puedes cargar via terminal en el backend.">
        <pre className={`p-3 rounded-lg text-[11px] font-mono ${isDark ? "bg-black/30 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
{`# Carga TODOS los catalogos desde /backend/data_catalogos/
python manage.py cargar_catalogos_sat

# Solo Carta Porte
python manage.py cargar_catalogos_sat --solo cp

# Catalogos pequenos (UsoCFDI, FormaPago, etc) sin Excel
python manage.py seed_sat_minimo`}
        </pre>
      </Card>
    </div>
  );
}
