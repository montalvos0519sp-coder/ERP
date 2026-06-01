"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Truck, Save, AlertTriangle, MapPin, User, Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import Combobox, { type ComboOption } from "@/components/Combobox";

interface OperadorLite { id: string; nombre: string; rfc?: string; numero_licencia?: string; }
interface UnidadLite { id: number; internal_id: string; license_plate?: string; make_model?: string; }
interface LugarLite { id: number; nombre: string; tipo: string; id_ubicacion?: string; codigo_postal?: string; }

// Defaults: si no son exactos, hace match parcial por nombre (case-insensitive).
const DEFAULT_ORIGEN_NAME = "PATIO NUEVO LAREDO";
const DEFAULT_DESTINO_NAME = "PLASTIEXPORT";

function findLugarByName(lugares: LugarLite[], target: string): LugarLite | undefined {
  const t = target.trim().toLowerCase();
  return (
    lugares.find(l => (l.nombre || "").trim().toLowerCase() === t) ||
    lugares.find(l => (l.nombre || "").trim().toLowerCase().includes(t))
  );
}

export default function ViajeForm() {
  const router = useRouter();
  const [operadores, setOperadores] = useState<OperadorLite[]>([]);
  const [unidades, setUnidades] = useState<UnidadLite[]>([]);
  const [lugares, setLugares] = useState<LugarLite[]>([]);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [folioCarga, setFolioCarga] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [ecoRemolque, setEcoRemolque] = useState("");
  const [placaRemolque, setPlacaRemolque] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.getOperadores().then((r: any) => setOperadores(r.results ?? [])),
      api.getCatUnidades().then((r: any) => setUnidades(Array.isArray(r) ? r : r.results ?? [])),
      api.getCatLugares().then((r: any) => setLugares(Array.isArray(r) ? r : r.results ?? [])),
    ]);
  }, []);

  // Aplica defaults Origen=PATIO NUEVO LAREDO / Destino=PLASTIEXPORT cuando los lugares cargan.
  useEffect(() => {
    if (lugares.length === 0) return;
    if (!origenId) {
      const lugar = findLugarByName(lugares, DEFAULT_ORIGEN_NAME);
      if (lugar) setOrigenId(String(lugar.id));
    }
    if (!destinoId) {
      const lugar = findLugarByName(lugares, DEFAULT_DESTINO_NAME);
      if (lugar) setDestinoId(String(lugar.id));
    }
  }, [lugares]); // eslint-disable-line react-hooks/exhaustive-deps

  const operadorOpts = useMemo<ComboOption[]>(() =>
    operadores.map(o => ({
      id: o.id,
      label: o.nombre,
      sublabel: o.numero_licencia ? `Lic. ${o.numero_licencia}` : (o.rfc || undefined),
    })), [operadores]);

  const unidadOpts = useMemo<ComboOption[]>(() =>
    unidades.map(u => ({
      id: String(u.id),
      label: u.internal_id,
      prefix: u.license_plate || undefined,
      sublabel: u.make_model || undefined,
    })), [unidades]);

  const lugarOpts = useMemo<ComboOption[]>(() =>
    lugares.map(l => ({
      id: String(l.id),
      label: l.nombre,
      prefix: l.id_ubicacion || undefined,
      sublabel: l.codigo_postal ? `CP ${l.codigo_postal}` : undefined,
    })), [lugares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fecha)        return setError("Falta la fecha del viaje.");
    if (!folioCarga.trim()) return setError("Falta el folio de carga.");
    if (!operadorId)   return setError("Selecciona un operador.");
    if (!unidadId)     return setError("Selecciona una unidad.");
    if (!origenId)     return setError("Selecciona un origen.");
    if (!destinoId)    return setError("Selecciona un destino.");

    setSaving(true);
    try {
      const r = await api.crearViaje({
        fecha_viaje: fecha,
        folio_carga: folioCarga.trim(),
        operador_id: operadorId,
        unidad_id: Number(unidadId),
        origen_id: Number(origenId),
        destino_id: Number(destinoId),
        observaciones: observaciones.trim() || null,
        eco_remolque: ecoRemolque.trim() || null,
        placa_remolque: placaRemolque.trim() || null,
      }) as any;
      router.push(`/viajes/${r.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el viaje.");
      setSaving(false);
    }
  };

  const labelCls = "block text-[10.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5";
  const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/viajes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck size={16} className="text-blue-500" /> Nuevo Viaje
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}><Calendar size={11} className="inline mr-1" /> Fecha del viaje <span className="text-red-400">*</span></label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Folio de Carga <span className="text-red-400">*</span></label>
              <input type="text" value={folioCarga} onChange={e => setFolioCarga(e.target.value)}
                placeholder="1746" className={inputCls + " font-mono"} />
            </div>
          </div>

          {/* Operador */}
          <div>
            <label className={labelCls}><User size={11} className="inline mr-1" /> Operador (RH) <span className="text-red-400">*</span></label>
            <Combobox
              options={operadorOpts}
              value={operadorId}
              onChange={setOperadorId}
              placeholder="Buscar o seleccionar operador…"
              emptyHint='Sin empleados con puesto "OPERADOR"'
            />
            {operadores.length === 0 && (
              <p className="text-[11px] text-amber-500 mt-1">
                No hay empleados con puesto "Operador". Crea uno en <Link href="/rh/empleados/nuevo" className="underline font-bold">RH</Link>.
              </p>
            )}
          </div>

          {/* Unidad */}
          <div>
            <label className={labelCls}><Truck size={11} className="inline mr-1" /> Unidad <span className="text-red-400">*</span></label>
            <Combobox
              options={unidadOpts}
              value={unidadId}
              onChange={setUnidadId}
              placeholder="Buscar unidad por ID interno, placa o modelo…"
              emptyHint="Sin unidades disponibles"
            />
          </div>

          {/* Remolque (manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}><Truck size={11} className="inline mr-1" /> Eco. Remolque</label>
              <input
                type="text"
                value={ecoRemolque}
                onChange={e => setEcoRemolque(e.target.value)}
                placeholder="R-001"
                className={inputCls + " font-mono uppercase"}
              />
            </div>
            <div>
              <label className={labelCls}><Truck size={11} className="inline mr-1" /> Placa Remolque</label>
              <input
                type="text"
                value={placaRemolque}
                onChange={e => setPlacaRemolque(e.target.value)}
                placeholder="ABC-123-XYZ"
                className={inputCls + " font-mono uppercase"}
              />
            </div>
          </div>

          {/* Origen / Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}><MapPin size={11} className="inline mr-1 text-emerald-500" /> Origen <span className="text-red-400">*</span></label>
              <Combobox
                options={lugarOpts}
                value={origenId}
                onChange={setOrigenId}
                placeholder="Buscar lugar de origen…"
              />
            </div>
            <div>
              <label className={labelCls}><MapPin size={11} className="inline mr-1 text-red-500" /> Destino <span className="text-red-400">*</span></label>
              <Combobox
                options={lugarOpts}
                value={destinoId}
                onChange={setDestinoId}
                placeholder="Buscar lugar de destino…"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              className={inputCls + " resize-y"} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link href="/viajes" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-200 dark:shadow-none transition-colors">
              <Save size={13} /> {saving ? "Guardando…" : "Crear viaje"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
