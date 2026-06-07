"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Truck, Trash2, AlertTriangle, MapPin, Plus, RefreshCw,
  FileText, Calendar, Clock, Package, Download, Save, Copy, Check,
  Route, User, Building2, Hash, Weight, Box, Flag, Navigation,
  Activity, ChevronDown, Edit3, Ban, Wallet, Pencil,
  GripVertical, ShieldCheck, Stamp, FileCheck, XCircle,
  Receipt, Paperclip,
} from "lucide-react";
import { api } from "@/lib/api";
import SatCombobox from "@/components/SatCombobox";
import Combobox from "@/components/Combobox";

interface Lugar  { id: number; nombre: string; id_ubicacion?: string; codigo_postal?: string; direccion?: string; }
interface Parada { id: number; orden: number; lugar_id: number; id_ubicacion: string; destino: string; direccion: string; codigo_postal: string; fecha_hora: string; kms: string; observaciones?: string; }
interface Mercancia { id: number; parada_origen_id?: number | null; parada_destino_id?: number | null; origen_codigo?: string; destino_codigo?: string; clave_producto: string; descripcion: string; cantidad: string; peso_kg: string; unidad_medida: string; material_peligroso: boolean; clave_material_peligroso?: string; embalaje?: string; descripcion_embalaje?: string; notas?: string; }
interface Determinante { id: number; codigo: string; nombre: string; cliente?: string; ubicacion?: number | null; ubicacion_nombre?: string; activo?: boolean; }
interface Timbre { id: number; uuid: string; estado: string; fecha: string; motivo_cancelacion?: string; }
interface CategoriaGasto { id: number; nombre: string; descripcion?: string; activo?: boolean; }
interface EvidenciaGasto { id: number; nombre: string; mime: string; archivo_url: string; es_imagen: boolean; subido?: string; }
interface GastoViaje {
  id: number; viaje: number; categoria: number | null; categoria_nombre: string | null;
  descripcion: string; monto: string; fecha: string | null; evidencias: EvidenciaGasto[]; creado?: string;
}
interface Viaje {
  id: number; numero_viaje?: number; id_viaje: string; folio_carta?: string; folio_carga: string; fecha_viaje: string;
  operador: string; operador_id: string; unidad: string; unidad_id: number;
  origen: string; origen_id: number; origen_codigo: string;
  destino: string; destino_id: number; destino_codigo: string;
  estado: string; kms_totales: string;
  sueldo_operador?: string;
  eco_remolque?: string;
  placa_remolque?: string;
  mismo_origen_destino?: boolean;
  observaciones: string; paradas: Parada[]; mercancias: Mercancia[];
  operador_data?: { rfc?: string; numero_licencia?: string; licencia_vencimiento?: string; licencia_fuente?: string };
  unidad_data?: any;
  empresa?: number | string;
  empresa_id?: number | string;
  carta_porte_estado?: string;
  carta_porte_uuid?: string;
  timbres?: Timbre[];
  gastos?: GastoViaje[];
  total_gastos?: string;
}

function fmtMXN(x: unknown) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(x || 0));
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ViajeDetalle({ id }: { id: string }) {
  const [v, setV] = useState<Viaje | null>(null);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyParada, setBusyParada] = useState(false);
  const [busyMerc, setBusyMerc] = useState(false);

  // Gastos de viaje
  const [mostrarModalGasto, setMostrarModalGasto] = useState(false);
  const [categoriasGasto, setCategoriasGasto] = useState<CategoriaGasto[]>([]);
  const [nuevoGasto, setNuevoGasto] = useState<{ categoria: string; descripcion: string; monto: string; fecha: string }>({
    categoria: "", descripcion: "", monto: "", fecha: "",
  });
  const [archivosGasto, setArchivosGasto] = useState<File[]>([]);
  const [mostrarAltaCategoria, setMostrarAltaCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState<{ nombre: string; descripcion: string }>({ nombre: "", descripcion: "" });
  const [busyGasto, setBusyGasto] = useState(false);
  const [busyCatGasto, setBusyCatGasto] = useState(false);

  // Modal nueva parada
  const [openParada, setOpenParada] = useState(false);
  const [pLugarId, setPLugarId] = useState("");
  const [pFechaHora, setPFechaHora] = useState("");
  const [pKms, setPKms] = useState("0");
  const [pDeterminante, setPDeterminante] = useState("");

  // Determinantes (catálogo)
  const [determinantes, setDeterminantes] = useState<Determinante[]>([]);
  const [openDeterminante, setOpenDeterminante] = useState(false);
  const [dtCodigo, setDtCodigo] = useState("");
  const [dtNombre, setDtNombre] = useState("");
  const [dtCliente, setDtCliente] = useState("");
  const [dtUbicacion, setDtUbicacion] = useState("");
  const [busyDt, setBusyDt] = useState(false);

  // Drag & drop de paradas (itinerario)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Carta Porte (SAT)
  const [busyCp, setBusyCp] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpAviso, setCpAviso] = useState<string | null>(null);
  const [cpMotivo, setCpMotivo] = useState("02");
  const [cpUuidCopied, setCpUuidCopied] = useState(false);

  // Modal nueva mercancía / edición (mId !== null indica edición)
  const [openMerc, setOpenMerc] = useState(false);
  const [mId, setMId] = useState<number | null>(null);
  const [mClave, setMClave] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mCant, setMCant] = useState("1");
  const [mPeso, setMPeso] = useState("0");
  const [mUM, setMUM] = useState("H87");
  const [mPel, setMPel] = useState(false);
  const [mClaveMP, setMClaveMP] = useState("");
  const [mEmbalaje, setMEmbalaje] = useState("");
  const [mDescEmbalaje, setMDescEmbalaje] = useState("");
  const [mPOrigen, setMPOrigen] = useState("");
  const [mPDestino, setMPDestino] = useState("");

  // Edición del viaje
  const [openEdit, setOpenEdit] = useState(false);
  const [editFecha, setEditFecha] = useState("");
  const [editFolio, setEditFolio] = useState("");
  const [editEstado, setEditEstado] = useState("PLANIFICADO");
  const [editObs, setEditObs] = useState("");
  const [editSueldo, setEditSueldo] = useState("0");
  const [editEcoRemolque, setEditEcoRemolque] = useState("");
  const [editPlacaRemolque, setEditPlacaRemolque] = useState("");
  const [editOrigenId, setEditOrigenId] = useState<number | "">("");
  const [editDestinoId, setEditDestinoId] = useState<number | "">("");
  const [editOperadorId, setEditOperadorId] = useState<string>("");
  const [editUnidadId, setEditUnidadId] = useState<number | "">("");
  const [editOperadores, setEditOperadores] = useState<Array<{ id: string; nombre: string; numero_licencia?: string }>>([]);
  const [editUnidades, setEditUnidades] = useState<Array<{ id: number; internal_id: string; license_plate?: string; make_model?: string }>>([]);
  const [busyEdit, setBusyEdit] = useState(false);

  // Confirmación de cancelar viaje
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busyCancel, setBusyCancel] = useState(false);

  // Edición rápida de tarjetas (Operador licencia / Unidad / SCT)
  const [openEditOp, setOpenEditOp] = useState(false);
  const [edOpRfc, setEdOpRfc] = useState("");
  const [edOpNumLic, setEdOpNumLic] = useState("");
  const [edOpFExp, setEdOpFExp] = useState("");
  const [edOpFVenc, setEdOpFVenc] = useState("");
  const [busyEdOp, setBusyEdOp] = useState(false);

  const [openEditUni, setOpenEditUni] = useState(false);
  const [edUniPlaca, setEdUniPlaca] = useState("");
  const [edUniMM, setEdUniMM] = useState("");
  const [edUniYear, setEdUniYear] = useState("");
  const [busyEdUni, setBusyEdUni] = useState(false);

  const [openEditSct, setOpenEditSct] = useState(false);
  const [edSctTipo, setEdSctTipo] = useState("");
  const [edSctNo, setEdSctNo] = useState("");
  const [edSctAseg, setEdSctAseg] = useState("");
  const [edSctPol, setEdSctPol] = useState("");
  const [busyEdSct, setBusyEdSct] = useState(false);

  // Quick-edit del sueldo del operador
  const [openEditSueldo, setOpenEditSueldo] = useState(false);
  const [edSueldoValor, setEdSueldoValor] = useState("0");
  const [busyEdSueldo, setBusyEdSueldo] = useState(false);

  // Modal de editar Lugar/Parada
  const [openEditParada, setOpenEditParada] = useState(false);
  const [editParadaId, setEditParadaId] = useState<number | null>(null);
  const [editLugarId, setEditLugarId] = useState<number | null>(null);
  const [edNombre, setEdNombre] = useState("");
  const [edRfc, setEdRfc] = useState("");
  const [edCalle, setEdCalle] = useState("");
  const [edExt, setEdExt] = useState("");
  const [edInt, setEdInt] = useState("");
  const [edColonia, setEdColonia] = useState("");
  const [edCP, setEdCP] = useState("");
  const [edMunicipio, setEdMunicipio] = useState("");
  const [edEstado, setEdEstado] = useState("");
  const [edPais, setEdPais] = useState("México");
  const [edFechaHora, setEdFechaHora] = useState("");
  const [edKms, setEdKms] = useState("0");
  const [edDeterminante, setEdDeterminante] = useState("");
  const [edColonias, setEdColonias] = useState<string[]>([]);
  const [busyEditParada, setBusyEditParada] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [vj, lug] = await Promise.all([
        api.getViaje(id) as Promise<Viaje>,
        api.getCatLugares().then((r: any) => Array.isArray(r) ? r : r.results ?? []),
      ]);
      setV(vj);
      setLugares(lug);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el viaje");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const cargarDeterminantes = async () => {
    try {
      const empresa = (v as any)?.empresa ?? (v as any)?.empresa_id;
      const params = empresa ? { empresa: String(empresa) } : undefined;
      const r = await api.getDeterminantes(params) as any;
      setDeterminantes(Array.isArray(r) ? r : (r?.results ?? []));
    } catch { /* ignore */ }
  };

  useEffect(() => { cargarDeterminantes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [v?.id]);

  const kmsTotales = useMemo(() => {
    if (!v) return 0;
    return v.paradas.reduce((s, p) => s + (parseFloat(p.kms) || 0), 0);
  }, [v]);

  const totalesMercancia = useMemo(() => {
    if (!v) return { items: 0, bultos: 0, peso: 0, peligrosas: 0 };
    return v.mercancias.reduce((acc, m) => ({
      items: acc.items + 1,
      bultos: acc.bultos + (parseFloat(m.cantidad) || 0),
      peso: acc.peso + (parseFloat(m.peso_kg) || 0),
      peligrosas: acc.peligrosas + (m.material_peligroso ? 1 : 0),
    }), { items: 0, bultos: 0, peso: 0, peligrosas: 0 });
  }, [v]);

  const [copied, setCopied] = useState(false);
  const copyId = () => {
    if (!v) return;
    navigator.clipboard.writeText(v.folio_carta || v.id_viaje).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const ESTADO_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    PLANIFICADO: { bg: "bg-sky-100 dark:bg-sky-500/20 ring-sky-300 dark:ring-sky-500/30",       text: "text-sky-700 dark:text-sky-200",     dot: "bg-sky-500" },
    EN_RUTA:     { bg: "bg-amber-100 dark:bg-amber-500/20 ring-amber-300 dark:ring-amber-500/30", text: "text-amber-700 dark:text-amber-200", dot: "bg-amber-500 animate-pulse" },
    ENTREGADO:   { bg: "bg-emerald-100 dark:bg-emerald-500/20 ring-emerald-300 dark:ring-emerald-500/30", text: "text-emerald-700 dark:text-emerald-200", dot: "bg-emerald-500" },
    CANCELADO:   { bg: "bg-slate-200 dark:bg-slate-500/20 ring-slate-300 dark:ring-slate-500/30", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
  };

  const agregarParada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pLugarId) return;
    setBusyParada(true);
    try {
      await api.agregarParadaViaje(id, {
        lugar_id: Number(pLugarId),
        fecha_hora: pFechaHora || null,
        kms: pKms || 0,
        ...(pDeterminante ? { determinante: Number(pDeterminante) } : {}),
      } as any);
      setOpenParada(false);
      setPLugarId(""); setPFechaHora(""); setPKms("0"); setPDeterminante("");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error agregando parada");
    } finally { setBusyParada(false); }
  };

  const eliminarParada = async (pid: number) => {
    if (!confirm("¿Eliminar esta parada?")) return;
    await api.eliminarParadaViaje(id, pid);
    await load();
  };

  // Reordenar paradas (drag & drop)
  const soltarParada = async (destinoIdx: number) => {
    const origenIdx = dragIdx;
    setDragIdx(null);
    setOverIdx(null);
    if (!v || origenIdx === null || origenIdx === destinoIdx) return;
    const nuevas = [...v.paradas];
    const [movida] = nuevas.splice(origenIdx, 1);
    nuevas.splice(destinoIdx, 0, movida);
    // Optimista
    setV(prev => prev ? ({ ...prev, paradas: nuevas }) : prev);
    const ordenIds = nuevas.map(p => p.id);
    try {
      await api.reordenarParadasViaje(v.id, ordenIds);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo reordenar el itinerario");
      await load();
    }
  };

  // Alta de determinante
  const crearDeterminante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtCodigo.trim() || !dtNombre.trim()) return;
    setBusyDt(true);
    try {
      await api.crearDeterminante({
        codigo: dtCodigo.trim(),
        nombre: dtNombre.trim(),
        cliente: dtCliente.trim() || null,
        ubicacion: dtUbicacion ? Number(dtUbicacion) : null,
      });
      setOpenDeterminante(false);
      setDtCodigo(""); setDtNombre(""); setDtCliente(""); setDtUbicacion("");
      await cargarDeterminantes();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creando determinante");
    } finally { setBusyDt(false); }
  };

  // Carta Porte (SAT)
  const timbrarCP = async () => {
    if (!v) return;
    setBusyCp(true); setCpError(null); setCpAviso(null);
    try {
      const r = await api.timbrarCartaPorte(v.id) as any;
      const uuid = r?.carta_porte_uuid || "";
      setCpAviso(`Carta Porte timbrada correctamente ante el SAT.${uuid ? ` UUID: ${uuid}` : ""}`);
      await load();
    } catch (e: unknown) {
      setCpError(e instanceof Error ? e.message : "No se pudo timbrar la Carta Porte");
    } finally { setBusyCp(false); }
  };

  const reactivarCP = async () => {
    if (!v) return;
    setBusyCp(true); setCpError(null); setCpAviso(null);
    try {
      const r = await api.reactivarCartaPorte(v.id) as any;
      const uuid = r?.carta_porte_uuid || "";
      setCpAviso(`Carta Porte re-timbrada (nuevo folio fiscal).${uuid ? ` UUID: ${uuid}` : ""}`);
      await load();
    } catch (e: unknown) {
      setCpError(e instanceof Error ? e.message : "No se pudo volver a timbrar la Carta Porte");
    } finally { setBusyCp(false); }
  };

  const cancelarCP = async () => {
    if (!v) return;
    setBusyCp(true); setCpError(null); setCpAviso(null);
    try {
      await api.cancelarCartaPorte(v.id, cpMotivo);
      setCpAviso("Carta Porte cancelada ante el SAT.");
      await load();
    } catch (e: unknown) {
      setCpError(e instanceof Error ? e.message : "No se pudo cancelar la Carta Porte");
    } finally { setBusyCp(false); }
  };

  const descargarViajePdf = async () => {
    if (!v) return;
    try { await api.descargarViajePdf(v.id); } catch (e) { alert(e instanceof Error ? e.message : "No se pudo abrir el PDF"); }
  };
  const descargarCpXml = async () => {
    if (!v) return;
    try { await api.descargarCartaPorteXml(v.id); } catch (e) { alert(e instanceof Error ? e.message : "No se pudo descargar el XML"); }
  };
  const descargarCpPdf = async () => {
    if (!v) return;
    try { await api.descargarCartaPortePdf(v.id); } catch (e) { alert(e instanceof Error ? e.message : "No se pudo descargar el PDF"); }
  };

  const copiarUuidCp = () => {
    if (!v?.carta_porte_uuid) return;
    navigator.clipboard.writeText(v.carta_porte_uuid).then(() => {
      setCpUuidCopied(true);
      setTimeout(() => setCpUuidCopied(false), 1500);
    });
  };

  const resetMercForm = () => {
    setMId(null);
    setMClave(""); setMDesc(""); setMCant("1"); setMPeso("0"); setMUM("H87"); setMPel(false);
    setMClaveMP(""); setMEmbalaje(""); setMDescEmbalaje("");
    setMPOrigen(""); setMPDestino("");
  };

  // Valores por defecto para nueva mercancía: Clave SAT 14121503 (Cartón),
  // descripción "Cartón", Unidad de Medida 32, cantidad 1, y origen/destino
  // sugeridos = primera/última parada del viaje.
  const abrirNuevaMerc = () => {
    setMId(null);
    setMClave("14121503");
    setMDesc("Cartón");
    setMCant("1");
    setMPeso("0");
    setMUM("32");
    setMPel(false);
    setMClaveMP(""); setMEmbalaje(""); setMDescEmbalaje("");
    if (v && v.paradas.length > 0) {
      setMPOrigen(String(v.paradas[0].id));
      setMPDestino(String(v.paradas[v.paradas.length - 1].id));
    } else {
      setMPOrigen(""); setMPDestino("");
    }
    setOpenMerc(true);
  };

  const abrirEditarMerc = (m: Mercancia) => {
    setMId(m.id);
    setMClave(m.clave_producto || "");
    setMDesc(m.descripcion || "");
    setMCant(String(m.cantidad ?? "1"));
    setMPeso(String(m.peso_kg ?? "0"));
    setMUM(m.unidad_medida || "H87");
    setMPel(!!m.material_peligroso);
    setMClaveMP(m.clave_material_peligroso || "");
    setMEmbalaje(m.embalaje || "");
    setMDescEmbalaje(m.descripcion_embalaje || "");
    setMPOrigen(m.parada_origen_id ? String(m.parada_origen_id) : "");
    setMPDestino(m.parada_destino_id ? String(m.parada_destino_id) : "");
    setOpenMerc(true);
  };

  const guardarMercancia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mDesc.trim()) return;
    setBusyMerc(true);
    try {
      const payload = {
        clave_producto: mClave.trim() || null,
        descripcion: mDesc.trim(),
        cantidad: mCant || 1,
        peso_kg: mPeso || 0,
        unidad_medida: mUM,
        material_peligroso: mPel,
        clave_material_peligroso: mPel ? (mClaveMP.trim() || null) : null,
        embalaje: mPel ? (mEmbalaje.trim() || null) : null,
        descripcion_embalaje: mPel ? (mDescEmbalaje.trim() || null) : null,
        parada_origen_id: mPOrigen ? Number(mPOrigen) : null,
        parada_destino_id: mPDestino ? Number(mPDestino) : null,
      };
      if (mId !== null) {
        await api.actualizarMercanciaViaje(id, mId, payload);
      } else {
        await api.agregarMercanciaViaje(id, payload);
      }
      setOpenMerc(false);
      resetMercForm();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error guardando mercancía");
    } finally { setBusyMerc(false); }
  };

  const eliminarMercancia = async (mid: number) => {
    if (!confirm("¿Eliminar esta mercancía?")) return;
    await api.eliminarMercanciaViaje(id, mid);
    await load();
  };

  // ── Gastos de viaje ──────────────────────────────────────────────
  const cargarCategoriasGasto = async () => {
    try {
      const res = await api.getCategoriasGasto() as any;
      const lista = (res?.results ?? res) as CategoriaGasto[];
      setCategoriasGasto(Array.isArray(lista) ? lista : []);
    } catch { /* ignore */ }
  };

  const abrirModalGasto = () => {
    setNuevoGasto({ categoria: "", descripcion: "", monto: "", fecha: "" });
    setArchivosGasto([]);
    setMostrarAltaCategoria(false);
    setNuevaCategoria({ nombre: "", descripcion: "" });
    cargarCategoriasGasto();
    setMostrarModalGasto(true);
  };

  const crearCategoriaGastoInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.nombre.trim()) return;
    setBusyCatGasto(true);
    try {
      const creada = await api.crearCategoriaGasto({
        nombre: nuevaCategoria.nombre.trim(),
        descripcion: nuevaCategoria.descripcion.trim(),
      }) as CategoriaGasto;
      await cargarCategoriasGasto();
      if (creada?.id) setNuevoGasto(prev => ({ ...prev, categoria: String(creada.id) }));
      setNuevaCategoria({ nombre: "", descripcion: "" });
      setMostrarAltaCategoria(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creando categoría");
    } finally { setBusyCatGasto(false); }
  };

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    if (!nuevoGasto.monto || Number(nuevoGasto.monto) < 0) {
      alert("Ingresa un monto válido (≥ 0).");
      return;
    }
    setBusyGasto(true);
    try {
      const gasto = await api.crearGastoViaje({
        viaje: v.id,
        categoria: nuevoGasto.categoria ? Number(nuevoGasto.categoria) : null,
        descripcion: nuevoGasto.descripcion.trim(),
        monto: nuevoGasto.monto,
        fecha: nuevoGasto.fecha || null,
      }) as GastoViaje;
      for (const file of archivosGasto) {
        await api.subirEvidenciaGasto(gasto.id, file);
      }
      setMostrarModalGasto(false);
      setNuevoGasto({ categoria: "", descripcion: "", monto: "", fecha: "" });
      setArchivosGasto([]);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error guardando el gasto");
    } finally { setBusyGasto(false); }
  };

  const eliminarGasto = async (gid: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await api.eliminarGastoViaje(gid);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error eliminando el gasto");
    }
  };

  const subirEvidencia = async (gastoId: number, file: File | null | undefined) => {
    if (!file) return;
    try {
      await api.subirEvidenciaGasto(gastoId, file);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error subiendo la evidencia");
    }
  };

  const eliminarEvidencia = async (gastoId: number, evId: number) => {
    if (!confirm("¿Eliminar esta evidencia?")) return;
    try {
      await api.eliminarEvidenciaGasto(gastoId, evId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error eliminando la evidencia");
    }
  };

  const abrirEdicion = async () => {
    if (!v) return;
    setEditFecha(v.fecha_viaje);
    setEditFolio(v.folio_carga || "");
    setEditEstado(v.estado);
    setEditObs(v.observaciones || "");
    setEditSueldo(String(v.sueldo_operador ?? "0"));
    setEditEcoRemolque(v.eco_remolque || "");
    setEditPlacaRemolque(v.placa_remolque || "");
    setEditOrigenId(v.origen_id || "");
    setEditDestinoId(v.destino_id || "");
    setEditOperadorId(v.operador_id || "");
    setEditUnidadId(v.unidad_id || "");
    setOpenEdit(true);
    // Cargar operadores y unidades si aún no se cargaron
    if (editOperadores.length === 0) {
      try {
        const r = await api.getOperadores();
        setEditOperadores(((r as any)?.results ?? []) as any);
      } catch { /* ignore */ }
    }
    if (editUnidades.length === 0) {
      try {
        const r = await (api as any).getCatUnidades?.();
        setEditUnidades(Array.isArray(r) ? r : (r?.results ?? []));
      } catch { /* ignore */ }
    }
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    setBusyEdit(true);
    try {
      await api.actualizarViaje(v.id, {
        fecha_viaje: editFecha,
        folio_carga: editFolio.trim(),
        estado: editEstado,
        observaciones: editObs.trim(),
        sueldo_operador: editSueldo || "0",
        eco_remolque: editEcoRemolque.trim(),
        placa_remolque: editPlacaRemolque.trim(),
        origen_id: editOrigenId || undefined,
        destino_id: editDestinoId || undefined,
        operador_id: editOperadorId || undefined,
        unidad_id: editUnidadId || undefined,
      });
      setOpenEdit(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al guardar cambios");
    } finally {
      setBusyEdit(false);
    }
  };

  const abrirEditarParada = (p: Parada) => {
    setEditParadaId(p.id);
    setEditLugarId(p.lugar_id);
    setEdNombre(p.destino || "");
    setEdRfc((p as any).rfc || "");
    setEdCalle((p as any).calle || "");
    setEdExt((p as any).numero_exterior || "");
    setEdInt((p as any).numero_interior || "");
    setEdColonia((p as any).colonia || "");
    setEdCP(p.codigo_postal || "");
    setEdMunicipio((p as any).municipio || "");
    setEdEstado((p as any).estado || "");
    setEdPais((p as any).pais || "México");
    setEdFechaHora(p.fecha_hora ? p.fecha_hora.slice(0, 16) : "");
    setEdKms(String(p.kms || "0"));
    setEdDeterminante((p as any).determinante ? String((p as any).determinante) : "");
    setEdColonias([]);
    setOpenEditParada(true);
  };

  // Autocomplete CP → Estado / Municipio / Colonias
  useEffect(() => {
    if (!openEditParada) return;
    const cp = edCP.trim();
    if (!/^\d{5}$/.test(cp)) { setEdColonias([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.buscarCP(cp) as any;
        if (r.found) {
          if (r.estado) setEdEstado(r.estado);
          if (r.municipio) setEdMunicipio(r.municipio);
          // lookup/ devuelve colonias como lista de strings.
          setEdColonias((r.colonias || []).map((c: any) => (typeof c === "string" ? c : c?.nombre)).filter(Boolean));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [edCP, openEditParada]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarParada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParadaId || !editLugarId) return;
    setBusyEditParada(true);
    try {
      // 1) Actualizar Lugar maestro (datos fiscales/dirección)
      await api.editarCatLugar(editLugarId, {
        nombre: edNombre.trim(),
        rfc: edRfc.trim() || null,
        calle: edCalle.trim() || null,
        numero_exterior: edExt.trim() || null,
        numero_interior: edInt.trim() || null,
        colonia: edColonia.trim() || null,
        codigo_postal: edCP.trim() || null,
        municipio: edMunicipio.trim() || null,
        estado: edEstado.trim() || null,
        pais: edPais.trim() || "México",
      });
      // 2) Actualizar Parada (fecha_hora, kms, observaciones)
      await api.actualizarParadaViaje(id, editParadaId, {
        fecha_hora: edFechaHora || null,
        kms: edKms || 0,
        determinante: edDeterminante ? Number(edDeterminante) : null,
      } as any);
      setOpenEditParada(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al guardar la ubicación");
    } finally {
      setBusyEditParada(false);
    }
  };

  const cancelarViaje = async () => {
    if (!v) return;
    setBusyCancel(true);
    try {
      await api.actualizarViaje(v.id, { estado: "CANCELADO" });
      setConfirmCancel(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al cancelar el viaje");
    } finally {
      setBusyCancel(false);
    }
  };

  if (loading) return <div className="min-h-screen p-6 text-center text-sm text-slate-400 animate-pulse flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando viaje…</div>;
  if (error || !v) return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
        <AlertTriangle size={28} className="mx-auto text-red-500 mb-2" />
        <p className="text-sm font-bold text-red-700">{error || "Viaje no encontrado"}</p>
        <Link href="/viajes" className="inline-block mt-3 text-sm text-red-600 hover:underline">← Volver al listado</Link>
      </div>
    </div>
  );

  const estadoStyle = ESTADO_STYLES[v.estado] || ESTADO_STYLES.CANCELADO;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* ── Breadcrumb + acciones ──────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/viajes" className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft size={14} /> Bitácora
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{v.id_viaje}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={descargarViajePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-900/20 transition-all">
              <Download size={13} /> Carta de Traslado · PDF
            </button>
            <button onClick={() => {
                setEdSueldoValor(v.sueldo_operador ? String(v.sueldo_operador) : "0");
                setOpenEditSueldo(true);
              }}
              title="Asignar/actualizar el sueldo del operador para este viaje"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-900/20 transition-all">
              <Wallet size={13} /> Poner sueldo al operador
            </button>
            <button onClick={abrirEdicion}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors">
              <Edit3 size={12} /> Editar
            </button>
            {v.estado !== "CANCELADO" && (
              <button onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                <Ban size={12} /> Cancelar viaje
              </button>
            )}
          </div>
        </div>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-transparent bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 shadow-sm dark:shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.1),transparent_50%)]" />

          <div className="relative p-6 sm:p-7">
            <div className="flex items-start justify-between flex-wrap gap-4">
              {/* Identificador */}
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-[10px] font-black text-blue-700 dark:text-blue-200 uppercase tracking-[0.18em] mb-3 ring-1 ring-blue-200 dark:ring-blue-500/25">
                  <FileText size={10} /> Carta de Traslado
                </div>
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Folio Carta de Traslado</span>
                  {v.numero_viaje !== undefined && (
                    <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 ring-1 ring-slate-200 dark:ring-transparent px-1.5 py-0.5 rounded">
                      #{v.numero_viaje}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight leading-none text-blue-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-blue-200">
                    {v.folio_carta || v.id_viaje}
                  </span>
                  <button onClick={copyId} title="Copiar ID"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-[10px] font-bold text-blue-700 dark:text-blue-200 hover:bg-slate-50 dark:hover:bg-white/15 transition-colors">
                    {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ring-1 ${estadoStyle.bg} ${estadoStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot}`} />
                    {v.estado.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <Hash size={11} /> ID interno: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{v.id_viaje}</span>
                </p>
              </div>

              {/* Ruta origen → destino visual */}
              <div className="flex items-center gap-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 min-w-[280px] shadow-sm dark:shadow-none">
                <div className="text-right">
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300 mb-0.5">Origen</div>
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-white">{v.origen_codigo || "—"}</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{v.origen}</div>
                </div>
                <div className="flex items-center px-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-400/30" />
                  <div className="w-12 h-px bg-gradient-to-r from-emerald-400 via-blue-400 to-rose-400" />
                  <Navigation size={12} className="text-blue-600 dark:text-blue-300 mx-0.5" />
                  <div className="w-12 h-px bg-gradient-to-r from-emerald-400 via-blue-400 to-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-400/30" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300 mb-0.5">Destino</div>
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-white">{v.destino_codigo || "—"}</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{v.destino}</div>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-6">
              <Kpi icon={Calendar}  label="Fecha"     value={v.fecha_viaje} accent="text-blue-700 dark:text-blue-300" />
              <Kpi icon={Route}     label="Kms"       value={kmsTotales.toFixed(2)} mono accent="text-emerald-700 dark:text-emerald-300" />
              <Kpi icon={MapPin}    label="Paradas"   value={String(v.paradas.length)} accent="text-indigo-700 dark:text-indigo-300" />
              <Kpi icon={Package}   label="Mercancías" value={String(totalesMercancia.items)} accent="text-amber-700 dark:text-amber-300" />
              <Kpi icon={Box}       label="Bultos"    value={totalesMercancia.bultos.toFixed(0)} mono accent="text-violet-700 dark:text-violet-300" />
              <Kpi icon={Weight}    label="Peso kg"   value={totalesMercancia.peso.toFixed(2)} mono accent="text-sky-700 dark:text-sky-300" />
              <Kpi icon={Hash}      label="Sueldo Op." value={`$${parseFloat(v.sueldo_operador || "0").toFixed(2)}`} mono accent="text-emerald-700 dark:text-emerald-300" />
            </div>
            {v.mismo_origen_destino && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold ring-1 ring-amber-200 dark:ring-amber-900/40">
                <AlertTriangle size={11} /> Viaje redondo · origen y destino son el mismo lugar
              </div>
            )}
          </div>
        </div>

        {/* ── Tarjetas de información ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard icon={User}     title="Operador" tone="violet"
            onEdit={() => {
              setEdOpRfc(v.operador_data?.rfc || "");
              setEdOpNumLic(v.operador_data?.numero_licencia || "");
              setEdOpFExp("");
              setEdOpFVenc(v.operador_data?.licencia_vencimiento ? v.operador_data.licencia_vencimiento.slice(0, 10) : "");
              setOpenEditOp(true);
            }}
            editLabel="Editar licencia federal (refleja en RH)"
            lines={[
              { label: "Nombre",      value: v.operador },
              { label: "RFC",         value: v.operador_data?.rfc || "—", mono: true },
              {
                label: v.operador_data?.licencia_fuente === 'RH/DocumentoOperador' ? "Lic. Federal (RH)" : "No. Licencia",
                value: v.operador_data?.numero_licencia || "—",
                mono: true,
              },
              ...(v.operador_data?.licencia_vencimiento ? [{
                label: "Vencimiento Lic.",
                value: new Date(v.operador_data.licencia_vencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
              }] : []),
            ]} />
          <InfoCard icon={Truck}    title="Unidad" tone="blue"
            onEdit={() => {
              setEdUniPlaca(v.unidad_data?.license_plate || "");
              setEdUniMM(v.unidad_data?.make_model || "");
              setEdUniYear(v.unidad_data?.year ? String(v.unidad_data.year) : "");
              setOpenEditUni(true);
            }}
            editLabel="Editar unidad (refleja en catálogo)"
            lines={[
              { label: "Económico",      value: v.unidad_data?.internal_id || v.unidad },
              { label: "Placa",          value: v.unidad_data?.license_plate || "—", mono: true },
              { label: "Marca / Modelo", value: v.unidad_data?.make_model || "—" },
              { label: "Año",            value: v.unidad_data?.year ? String(v.unidad_data.year) : "—" },
              { label: "Eco. Remolque",  value: v.eco_remolque || v.unidad_data?.eco_remolque_1 || "—", mono: true },
              { label: "Placa Remolque", value: v.placa_remolque || v.unidad_data?.placa_remolque_1 || "—", mono: true },
            ]} />
          <InfoCard icon={Building2} title="Permiso SCT" tone="amber"
            onEdit={() => {
              setEdSctTipo(v.unidad_data?.permiso_sct || "");
              setEdSctNo(v.unidad_data?.no_permiso_sct || "");
              setEdSctAseg(v.unidad_data?.nombre_aseguradora || "");
              setEdSctPol(v.unidad_data?.no_poliza_seguro || "");
              setOpenEditSct(true);
            }}
            editLabel="Editar SCT (refleja en catálogo de unidad)"
            lines={[
              { label: "Permiso SCT",     value: v.unidad_data?.permiso_sct || "—" },
              { label: "No. Permiso",     value: v.unidad_data?.no_permiso_sct || "—", mono: true },
              { label: "Aseguradora",     value: v.unidad_data?.nombre_aseguradora || "—" },
              { label: "No. Póliza",      value: v.unidad_data?.no_poliza_seguro || "—", mono: true },
            ]} />
        </div>

        {/* ── Ruta e Itinerario (Timeline) ───────────────────────────── */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Route size={16} className="text-blue-500" /> Ruta e Itinerario
              </h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Destino Base: <span className="font-mono font-bold">{v.origen_codigo}</span> → <span className="font-mono font-bold">{v.destino_codigo}</span> · {v.paradas.length} parada{v.paradas.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw size={11} /> Recargar
              </button>
              <button onClick={() => setOpenDeterminante(true)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                <Plus size={11} /> Determinante
              </button>
              <button onClick={() => setOpenParada(true)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors">
                <Plus size={11} /> Agregar parada
              </button>
            </div>
          </div>

          {/* Timeline vertical */}
          <div className="p-5">
            {v.paradas.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-400 italic">Sin paradas en el itinerario</div>
            ) : (
              <>
              {v.paradas.length > 1 && (
                <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1.5">
                  <GripVertical size={12} /> Arrastra para reordenar
                </p>
              )}
              <ol className="relative">
                {/* línea vertical */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 to-rose-400 dark:from-emerald-500 dark:via-blue-500 dark:to-rose-500" />
                {v.paradas.map((p, i) => {
                  const isFirst = i === 0;
                  const isLast = i === v.paradas.length - 1;
                  const dotCls = isFirst
                    ? "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900/40"
                    : isLast
                      ? "bg-rose-500 ring-rose-200 dark:ring-rose-900/40"
                      : "bg-blue-500 ring-blue-200 dark:ring-blue-900/40";
                  return (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={e => { e.preventDefault(); if (overIdx !== i) setOverIdx(i); }}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      onDrop={e => { e.preventDefault(); soltarParada(i); }}
                      className={`relative pl-12 pb-4 last:pb-0 group cursor-move ${
                        dragIdx === i ? "opacity-50" : ""
                      } ${overIdx === i && dragIdx !== null && dragIdx !== i ? "ring-2 ring-blue-400 rounded-xl" : ""}`}
                    >
                      {/* Dot */}
                      <span className={`absolute left-3 top-1.5 w-4 h-4 rounded-full ring-4 ${dotCls} z-10`}>
                        {(isFirst || isLast) && <Flag size={8} className="text-white absolute inset-0 m-auto" />}
                      </span>
                      {/* Card */}
                      <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        {/* Agarre de arrastre */}
                        <GripVertical size={14} className="absolute right-2 top-2 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ring-1 ${
                                isFirst
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900/40"
                                  : isLast
                                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-900/40"
                                    : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-900/40"
                              }`}>
                                {p.id_ubicacion || "—"}
                              </span>
                              {isFirst && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Origen</span>}
                              {isLast && <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Destino</span>}
                              {!isFirst && !isLast && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Parada intermedia</span>}
                            </div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">{p.destino}</h4>
                            {p.direccion && <p className="text-[11.5px] text-slate-500 mt-0.5">{p.direccion}</p>}
                            {(p as any).determinante && (() => {
                              const det = determinantes.find(d => d.id === (p as any).determinante);
                              return (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-900/40">
                                  <Hash size={9} /> Det. {det ? `${det.codigo} · ${det.nombre}` : (p as any).determinante}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="text-right">
                              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Fecha/Hora</div>
                              <div className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmtDateTime(p.fecha_hora)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Kms</div>
                              <div className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums">{Number(p.kms).toFixed(2)}</div>
                            </div>
                            <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => abrirEditarParada(p)} title="Editar ubicación"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-blue-600 transition-all">
                                <Edit3 size={11} />
                              </button>
                              {!isFirst && !isLast && (
                                <button onClick={() => eliminarParada(p.id)} title="Eliminar parada"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {p.codigo_postal && (
                          <div className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-400">
                            <span className="font-mono font-bold">CP {p.codigo_postal}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              </>
            )}
          </div>

          {/* Total */}
          <div className="px-5 py-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Activity size={12} /> Kilómetros totales
            </span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono tabular-nums">{kmsTotales.toFixed(3)} km</span>
          </div>
        </section>

        {/* ── Mercancías ──────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Package size={16} className="text-amber-500" /> Mercancías
              </h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {totalesMercancia.items} item{totalesMercancia.items !== 1 ? "s" : ""} ·
                <span className="font-mono font-bold mx-1">{totalesMercancia.bultos.toFixed(0)}</span>bultos ·
                <span className="font-mono font-bold mx-1">{totalesMercancia.peso.toFixed(2)}</span>kg
                {totalesMercancia.peligrosas > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                    · <AlertTriangle size={10} /> {totalesMercancia.peligrosas} peligrosa{totalesMercancia.peligrosas !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <button onClick={abrirNuevaMerc} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 shadow-sm transition-colors">
              <Plus size={11} /> Nueva mercancía
            </button>
          </div>

          {v.mercancias.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin mercancías registradas</p>
              <p className="text-[11.5px] text-slate-400 mt-1">Agrega la primera mercancía del viaje.</p>
              <button onClick={abrirNuevaMerc} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors">
                <Plus size={11} /> Nueva mercancía
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["Tramo", "Producto / Servicio (SAT)", "Peligroso", "Cantidad", "Peso (kg)", "UM", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {v.mercancias.map(m => {
                    const paradaOrigen = v.paradas.find(p => p.id === m.parada_origen_id);
                    const paradaDestino = v.paradas.find(p => p.id === m.parada_destino_id);
                    return (
                    <tr key={m.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group">
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900/40">{m.origen_codigo || "—"}</span>
                            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{paradaOrigen?.destino || "—"}</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/40">{m.destino_codigo || "—"}</span>
                            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{paradaDestino?.destino || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{m.clave_producto || "—"}</span>
                        </div>
                        <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{m.descripcion}</div>
                      </td>
                      <td className="px-3 py-3">
                        {m.material_peligroso ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/40">
                            <AlertTriangle size={9} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900/40">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[13px] font-black tabular-nums text-slate-800 dark:text-white">{Number(m.cantidad).toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[13px] font-black tabular-nums text-slate-800 dark:text-white">{Number(m.peso_kg).toFixed(3)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{m.unidad_medida}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEditarMerc(m)} title="Editar"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-blue-600 transition-all">
                            <Edit3 size={11} />
                          </button>
                          <button onClick={() => eliminarMercancia(m.id)} title="Eliminar"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                {/* Totales en footer */}
                <tfoot className="bg-amber-50/40 dark:bg-amber-950/20 border-t-2 border-amber-200 dark:border-amber-900/40">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Totales</td>
                    <td className="px-3 py-2.5 font-mono text-sm font-black text-amber-700 dark:text-amber-300 tabular-nums">{totalesMercancia.bultos.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono text-sm font-black text-amber-700 dark:text-amber-300 tabular-nums">{totalesMercancia.peso.toFixed(3)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── Gastos de viaje ─────────────────────────────────────────── */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Receipt size={16} className="text-emerald-500" /> Gastos de viaje
              </h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {(v.gastos?.length ?? 0)} gasto{(v.gastos?.length ?? 0) !== 1 ? "s" : ""} registrado{(v.gastos?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Total gastos</div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">{fmtMXN(v.total_gastos)}</div>
              </div>
              <button onClick={abrirModalGasto} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-colors">
                <Plus size={11} /> Agregar gasto
              </button>
            </div>
          </div>

          {(v.gastos?.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Aún no hay gastos registrados para este viaje.</p>
              <button onClick={abrirModalGasto} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                <Plus size={11} /> Agregar gasto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["Categoría", "Descripción", "Fecha", "Monto", "Evidencias", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {(v.gastos ?? []).map(g => (
                    <tr key={g.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors group align-top">
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {g.categoria_nombre || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{g.descripcion || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">{g.fecha || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[13px] font-black tabular-nums text-emerald-700 dark:text-emerald-300">{fmtMXN(g.monto)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(g.evidencias ?? []).map(ev => (
                            <div key={ev.id} className="relative group/ev">
                              {ev.es_imagen ? (
                                <img
                                  src={ev.archivo_url}
                                  alt={ev.nombre}
                                  onClick={() => window.open(ev.archivo_url, "_blank")}
                                  className="h-12 w-12 object-cover rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => window.open(ev.archivo_url, "_blank")}
                                  title={ev.nombre}
                                  className="inline-flex items-center gap-1.5 max-w-[160px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <FileText size={12} className="shrink-0 text-rose-500" />
                                  <span className="truncate">{ev.nombre}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => eliminarEvidencia(g.id, ev.id)}
                                title="Eliminar evidencia"
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow opacity-0 group-hover/ev:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {(g.evidencias?.length ?? 0) === 0 && (
                            <span className="text-[11px] text-slate-400 italic">Sin evidencias</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <label title="Agregar evidencia"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-600 transition-all cursor-pointer">
                            <Paperclip size={11} />
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                subirEvidencia(g.id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button onClick={() => eliminarGasto(g.id)} title="Eliminar gasto"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50/40 dark:bg-emerald-950/20 border-t-2 border-emerald-200 dark:border-emerald-900/40">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Total</td>
                    <td className="px-3 py-2.5 font-mono text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{fmtMXN(v.total_gastos)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── Carta Porte (SAT) ───────────────────────────────────────── */}
        {(() => {
          const cpEstado = (v.carta_porte_estado || "BORRADOR").toUpperCase();
          const cpStyles: Record<string, { bg: string; text: string }> = {
            BORRADOR:  { bg: "bg-slate-100 dark:bg-slate-800 ring-slate-300 dark:ring-slate-700", text: "text-slate-700 dark:text-slate-300" },
            TIMBRADO:  { bg: "bg-emerald-100 dark:bg-emerald-500/20 ring-emerald-300 dark:ring-emerald-500/30", text: "text-emerald-700 dark:text-emerald-200" },
            CANCELADO: { bg: "bg-rose-100 dark:bg-rose-500/20 ring-rose-300 dark:ring-rose-500/30", text: "text-rose-700 dark:text-rose-200" },
          };
          const cpStyle = cpStyles[cpEstado] || cpStyles.BORRADOR;
          return (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" /> Carta Porte (SAT)
                  </h2>
                  <p className="text-[11.5px] text-slate-500 mt-0.5">Timbrado del complemento Carta Porte 3.1</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ring-1 ${cpStyle.bg} ${cpStyle.text}`}>
                  <Stamp size={11} /> {cpEstado}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {cpError && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3 text-[12px] text-red-700 dark:text-red-300 flex items-start gap-2">
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    <div><strong className="block mb-0.5">Error del PAC</strong><span className="whitespace-pre-wrap break-words">{cpError}</span></div>
                  </div>
                )}

                {cpAviso && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-3 text-[12px] text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                    <FileCheck size={14} className="shrink-0 mt-0.5" />
                    <div className="flex-1"><strong className="block mb-0.5">¡Timbrado exitoso!</strong><span className="whitespace-pre-wrap break-words">{cpAviso}</span></div>
                    <button onClick={() => setCpAviso(null)} className="shrink-0 text-emerald-600/70 hover:text-emerald-700"><XCircle size={13} /></button>
                  </div>
                )}

                {cpEstado === "TIMBRADO" && (
                  <div className="space-y-3">
                    {v.carta_porte_uuid && (
                      <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3">
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">UUID Fiscal</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-100 break-all">{v.carta_porte_uuid}</span>
                          <button onClick={copiarUuidCp} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-200 hover:bg-slate-50 dark:hover:bg-white/15 transition-colors">
                            {cpUuidCopied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={descargarCpPdf}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 shadow-sm transition-colors">
                        <Download size={13} /> Descargar PDF (SAT)
                      </button>
                      <button onClick={descargarCpXml}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors">
                        <Download size={13} /> Descargar XML
                      </button>
                      <div className="inline-flex items-center gap-2">
                        <select value={cpMotivo} onChange={e => setCpMotivo(e.target.value)} disabled={busyCp}
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono">
                          <option value="01">01 - Comprobante con errores con relación</option>
                          <option value="02">02 - Comprobante con errores sin relación</option>
                          <option value="03">03 - No se llevó a cabo la operación</option>
                          <option value="04">04 - Operación nominativa en una factura global</option>
                        </select>
                        <button onClick={cancelarCP} disabled={busyCp}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-60 transition-all">
                          <Ban size={13} /> {busyCp ? "Procesando…" : "Cancelar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(cpEstado === "BORRADOR" || cpEstado === "CANCELADO") && (
                  <button onClick={cpEstado === "CANCELADO" ? reactivarCP : timbrarCP} disabled={busyCp}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-900/20 disabled:opacity-60 transition-all">
                    <FileCheck size={14} /> {busyCp ? "Timbrando…" : (cpEstado === "CANCELADO" ? "Volver a timbrar" : "Timbrar Carta Porte")}
                  </button>
                )}

                {v.timbres && v.timbres.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          {["UUID", "Estado", "Fecha", "Motivo"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                        {v.timbres.map(t => (
                          <tr key={t.id}>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300" title={t.uuid}>{t.uuid ? `${t.uuid.slice(0, 8)}…${t.uuid.slice(-4)}` : "—"}</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">{t.estado}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">{fmtDateTime(t.fecha)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-500">{t.motivo_cancelacion || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <FileText size={12} className="shrink-0 mt-0.5" />
                  El timbrado usa el PAC configurado de la empresa (Factura.com). Si la empresa usa PAC &apos;manual&apos;, el timbre es simulado.
                </p>
              </div>
            </section>
          );
        })()}

        {v.observaciones && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><FileText size={12} /> Observaciones</h3>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{v.observaciones}</p>
          </div>
        )}
      </div>

      {/* Modal Nueva Parada */}
      {openParada && (
        <Modal onClose={() => setOpenParada(false)} title="Agregar Destino del Itinerario">
          <form onSubmit={agregarParada} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Lugar</label>
              <select value={pLugarId} onChange={e => setPLugarId(e.target.value)} required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">— Selecciona un lugar —</option>
                {lugares.map(l => (
                  <option key={l.id} value={l.id}>{l.id_ubicacion ? `[${l.id_ubicacion}] ` : ""}{l.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha y hora</label>
                <input type="datetime-local" value={pFechaHora} onChange={e => setPFechaHora(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kilómetros</label>
                <input type="number" step="0.001" value={pKms} onChange={e => setPKms(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Determinante <span className="text-[10px] text-slate-400 normal-case">(opcional)</span></label>
              <select value={pDeterminante} onChange={e => setPDeterminante(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">— Sin determinante —</option>
                {determinantes.map(d => (
                  <option key={d.id} value={d.id}>{d.codigo} · {d.nombre}{d.cliente ? ` (${d.cliente})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenParada(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busyParada} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyParada ? "Guardando…" : "Agregar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nueva / Editar Mercancía */}
      {openMerc && (
        <Modal onClose={() => { setOpenMerc(false); resetMercForm(); }} title={mId !== null ? "Editar mercancía" : "Nueva mercancía"}>
          <form onSubmit={guardarMercancia} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Clave de Producto / Servicio (SAT)</label>
              <SatCombobox
                tipo="ClaveProdServ"
                value={mClave}
                onChange={(clave, desc) => {
                  setMClave(clave);
                  // Si la descripción está vacía, autocompletamos con la del catálogo
                  if (!mDesc.trim() && desc) setMDesc(desc);
                }}
                placeholder="Buscar producto/servicio SAT…"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
              <input value={mDesc} onChange={e => setMDesc(e.target.value)} required placeholder="Ej. Cartón"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Clave de Unidad de Medida (SAT)</label>
              <SatCombobox
                tipo="ClaveUnidad"
                value={mUM}
                onChange={(clave) => setMUM(clave || "H87")}
                placeholder="Buscar unidad de medida SAT…"
                initialLabel={mUM ? `${mUM} — Unidad SAT` : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cantidad</label>
                <input type="number" step="0.01" value={mCant} onChange={e => setMCant(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Peso (kg)</label>
                <input type="number" step="0.001" value={mPeso} onChange={e => setMPeso(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Origen (parada del itinerario)</label>
                <Combobox
                  options={v.paradas.map(p => ({
                    id: String(p.id),
                    label: p.destino,
                    prefix: p.id_ubicacion || undefined,
                    sublabel: p.kms && Number(p.kms) > 0 ? `${Number(p.kms).toFixed(2)} km` : undefined,
                  }))}
                  value={mPOrigen}
                  onChange={(id) => setMPOrigen(id)}
                  placeholder="Selecciona origen…"
                  emptyHint="Sin paradas en el itinerario" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Destino (parada del itinerario)</label>
                <Combobox
                  options={v.paradas.map(p => ({
                    id: String(p.id),
                    label: p.destino,
                    prefix: p.id_ubicacion || undefined,
                    sublabel: p.kms && Number(p.kms) > 0 ? `${Number(p.kms).toFixed(2)} km` : undefined,
                  }))}
                  value={mPDestino}
                  onChange={(id) => setMPDestino(id)}
                  placeholder="Selecciona destino…"
                  emptyHint="Sin paradas en el itinerario" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mPel} onChange={e => setMPel(e.target.checked)} className="rounded" />
              <span className="font-bold text-slate-700 dark:text-slate-300">¿Material peligroso?</span>
            </label>
            {mPel && (
              <div className="rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 ring-1 ring-rose-400/40 p-3 space-y-3">
                <p className="text-[11.5px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Datos de material peligroso (Carta Porte SAT)
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Clave material peligroso (SAT)</label>
                  <input value={mClaveMP} onChange={e => setMClaveMP(e.target.value)} placeholder="Ej. 1203"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de embalaje (SAT)</label>
                    <input value={mEmbalaje} onChange={e => setMEmbalaje(e.target.value)} placeholder="Ej. 4G"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Descripción del embalaje</label>
                    <input value={mDescEmbalaje} onChange={e => setMDescEmbalaje(e.target.value)} placeholder="Ej. Caja de cartón"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setOpenMerc(false); resetMercForm(); }} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busyMerc} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyMerc ? "Guardando…" : (mId !== null ? "Guardar cambios" : "Agregar")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Agregar Gasto de viaje */}
      {mostrarModalGasto && (
        <Modal onClose={() => !busyGasto && setMostrarModalGasto(false)} title="Agregar gasto">
          <form onSubmit={guardarGasto} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500">Categoría</label>
                <button type="button" onClick={() => setMostrarAltaCategoria(s => !s)}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                  <Plus size={10} /> Dar de alta categoría
                </button>
              </div>
              <select value={nuevoGasto.categoria} onChange={e => setNuevoGasto(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">— Sin categoría —</option>
                {categoriasGasto.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {mostrarAltaCategoria && (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-400/40 p-3 space-y-2">
                <p className="text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Plus size={12} /> Nueva categoría de gasto
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
                  <input value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Casetas"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                  <input value={nuevaCategoria.descripcion} onChange={e => setNuevaCategoria(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción (opcional)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setMostrarAltaCategoria(false)} disabled={busyCatGasto}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
                  <button type="button" onClick={crearCategoriaGastoInline} disabled={busyCatGasto || !nuevaCategoria.nombre.trim()}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                    <Save size={11} /> {busyCatGasto ? "Guardando…" : "Crear categoría"}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
              <input value={nuevoGasto.descripcion} onChange={e => setNuevoGasto(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej. Caseta autopista México-Querétaro"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Precio (MXN) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" step="0.01" min="0" required
                    value={nuevoGasto.monto}
                    onChange={e => setNuevoGasto(prev => ({ ...prev, monto: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                <input type="date" value={nuevoGasto.fecha} onChange={e => setNuevoGasto(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Evidencias <span className="text-[10px] text-slate-400 normal-case">(opcional · PDF o imágenes)</span>
              </label>
              <input type="file" multiple accept="application/pdf,image/*"
                onChange={e => setArchivosGasto(Array.from(e.target.files ?? []))}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:cursor-pointer" />
              {archivosGasto.length > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">{archivosGasto.length} archivo{archivosGasto.length !== 1 ? "s" : ""} seleccionado{archivosGasto.length !== 1 ? "s" : ""}.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setMostrarModalGasto(false)} disabled={busyGasto}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyGasto}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyGasto ? "Guardando…" : "Guardar gasto"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Editar Licencia del Operador (refleja en RH.DocumentoOperador) */}
      {openEditOp && v && (
        <Modal onClose={() => !busyEdOp && setOpenEditOp(false)} title="Editar Licencia Federal del Operador">
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!v.operador_id) return;
              setBusyEdOp(true);
              try {
                await api.actualizarOperadorLicencia(String(v.operador_id), {
                  rfc: edOpRfc.trim().toUpperCase() || undefined,
                  numero: edOpNumLic.trim(),
                  fecha_expedicion: edOpFExp || undefined,
                  fecha_vencimiento: edOpFVenc || undefined,
                });
                setOpenEditOp(false);
                await load();
              } catch (err) {
                alert(err instanceof Error ? err.message : "No se pudo guardar la licencia");
              } finally {
                setBusyEdOp(false);
              }
            }}
            className="space-y-3"
          >
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 px-3 py-2 text-[11.5px] text-violet-700 dark:text-violet-300">
              <strong>{v.operador}</strong> · RFC <span className="font-mono">{v.operador_data?.rfc || "—"}</span><br />
              Los cambios actualizan el documento <strong>LICENCIA FEDERAL</strong> en RH y se reflejan en todos los viajes del operador.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">RFC del Operador</label>
              <input type="text" value={edOpRfc} onChange={e => setEdOpRfc(e.target.value.toUpperCase())} maxLength={13}
                placeholder="XAXX010101000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase" />
              <p className="text-[10.5px] text-slate-400 mt-1">Cambiarlo actualiza también al empleado vinculado en RH.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Número de Licencia Federal</label>
              <input type="text" value={edOpNumLic} onChange={e => setEdOpNumLic(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de expedición</label>
                <input type="date" value={edOpFExp} onChange={e => setEdOpFExp(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de vencimiento</label>
                <input type="date" value={edOpFVenc} onChange={e => setEdOpFVenc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEditOp(false)} disabled={busyEdOp}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyEdOp}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEdOp ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Editar Unidad (refleja en catálogo de unidades) */}
      {openEditUni && v && (
        <Modal onClose={() => !busyEdUni && setOpenEditUni(false)} title="Editar Unidad">
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!v.unidad_id) return;
              setBusyEdUni(true);
              try {
                await api.editarCatUnidad(v.unidad_id, {
                  license_plate: edUniPlaca.trim() || null,
                  make_model: edUniMM.trim() || null,
                  year: edUniYear ? Number(edUniYear) : null,
                });
                setOpenEditUni(false);
                await load();
              } catch (err) {
                alert(err instanceof Error ? err.message : "No se pudo guardar la unidad");
              } finally {
                setBusyEdUni(false);
              }
            }}
            className="space-y-3"
          >
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 px-3 py-2 text-[11.5px] text-blue-700 dark:text-blue-300">
              Económico <strong className="font-mono">{v.unidad_data?.internal_id}</strong> (no editable) · Los cambios se reflejan en el catálogo de unidades.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Placa</label>
                <input type="text" value={edUniPlaca} onChange={e => setEdUniPlaca(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Año</label>
                <input type="number" min="1900" max="2100" value={edUniYear} onChange={e => setEdUniYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Marca / Modelo</label>
              <input type="text" value={edUniMM} onChange={e => setEdUniMM(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEditUni(false)} disabled={busyEdUni}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyEdUni}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEdUni ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Editar Permiso SCT (refleja en catálogo de unidades) */}
      {openEditSct && v && (
        <Modal onClose={() => !busyEdSct && setOpenEditSct(false)} title="Editar Permiso SCT y Aseguradora">
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!v.unidad_id) return;
              setBusyEdSct(true);
              try {
                const updated: any = await api.editarCatUnidad(v.unidad_id, {
                  permiso_sct: edSctTipo.trim() || null,
                  no_permiso_sct: edSctNo.trim() || null,
                  nombre_aseguradora: edSctAseg.trim() || null,
                  no_poliza_seguro: edSctPol.trim() || null,
                });
                // Reflejo inmediato: parchea v.unidad_data con la respuesta del backend
                setV(prev => prev ? ({
                  ...prev,
                  unidad_data: { ...(prev as any).unidad_data, ...updated },
                }) : prev);
                setOpenEditSct(false);
                // Y recarga completa para asegurar consistencia
                await load();
              } catch (err) {
                alert(err instanceof Error ? err.message : "No se pudo guardar el permiso SCT");
              } finally {
                setBusyEdSct(false);
              }
            }}
            className="space-y-3"
          >
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-3 py-2 text-[11.5px] text-amber-700 dark:text-amber-300">
              Unidad <strong className="font-mono">{v.unidad_data?.internal_id}</strong> · Los cambios se reflejan en el catálogo de unidades.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Permiso SCT</label>
              <Combobox
                options={[
                  { id: "",       label: "— Sin permiso SCT —" },
                  { id: "TPAF01", label: "TPAF01 - Autotransporte Federal de carga general" },
                  { id: "TPAF02", label: "TPAF02 - Transporte privado de carga" },
                  { id: "TPAF03", label: "TPAF03 - Carga especializada (materiales/residuos peligrosos)" },
                  { id: "TPAF04", label: "TPAF04 - Cuerpos y partes humanas" },
                  { id: "TPAF05", label: "TPAF05 - Objetos voluminosos / gran peso" },
                  { id: "TPAF06", label: "TPAF06 - Fondos y valores" },
                  { id: "TPAF07", label: "TPAF07 - Grúas (arrastre/salvamento)" },
                  { id: "TPAF10", label: "TPAF10 - Paquetería y mensajería" },
                  { id: "TPAF11", label: "TPAF11 - Empresa trasladista de vehículos nuevos" },
                  { id: "TPAF12", label: "TPAF12 - Transporte especial doméstico" },
                  { id: "TPAF13", label: "TPAF13 - Materiales agrícolas, ganaderos, pesqueros, silvícolas" },
                  { id: "TPAF14", label: "TPAF14 - Carga de gran peso/volumen hasta 90 ton" },
                  { id: "TPAF15", label: "TPAF15 - Privado de materiales/residuos peligrosos" },
                  { id: "TPAF16", label: "TPAF16 - Hidrocarburos y petrolíferos (terrestre)" },
                  { id: "TPAF20", label: "TPAF20 - Otro permiso" },
                ]}
                value={edSctTipo}
                onChange={v2 => setEdSctTipo(v2)}
                placeholder="— Selecciona permiso SCT —"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No. Permiso SCT</label>
                <input type="text" value={edSctNo} onChange={e => setEdSctNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No. Póliza Seguro</label>
                <input type="text" value={edSctPol} onChange={e => setEdSctPol(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Aseguradora</label>
              <input type="text" value={edSctAseg} onChange={e => setEdSctAseg(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEditSct(false)} disabled={busyEdSct}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyEdSct}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEdSct ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Poner sueldo al operador (rápido) */}
      {openEditSueldo && v && (
        <Modal onClose={() => !busyEdSueldo && setOpenEditSueldo(false)} title="Sueldo del operador (este viaje)">
          <form
            onSubmit={async e => {
              e.preventDefault();
              setBusyEdSueldo(true);
              try {
                const monto = Number(edSueldoValor);
                if (isNaN(monto) || monto < 0) {
                  alert("Ingresa un monto válido (≥ 0).");
                  setBusyEdSueldo(false);
                  return;
                }
                await api.actualizarViaje(v.id, { sueldo_operador: monto });
                setV(prev => prev ? ({ ...prev, sueldo_operador: String(monto) }) : prev);
                setOpenEditSueldo(false);
                await load();
              } catch (err) {
                alert(err instanceof Error ? err.message : "No se pudo guardar el sueldo");
              } finally {
                setBusyEdSueldo(false);
              }
            }}
            className="space-y-3"
          >
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-3 py-2 text-[11.5px] text-emerald-700 dark:text-emerald-300">
              Operador: <strong>{v.operador}</strong> · Viaje <span className="font-mono">{v.folio_carta || v.id_viaje}</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Sueldo (MXN)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={edSueldoValor}
                  onChange={e => setEdSueldoValor(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full pl-7 pr-3 py-2 text-base rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Este monto se incluye al generar la liquidación del operador.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEditSueldo(false)} disabled={busyEdSueldo}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyEdSueldo}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEdSueldo ? "Guardando…" : "Guardar sueldo"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar viaje */}
      {openEdit && (
        <Modal onClose={() => !busyEdit && setOpenEdit(false)} title="Editar viaje">
          <form onSubmit={guardarEdicion} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha del viaje</label>
                <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Folio de Carga</label>
                <input type="text" value={editFolio} onChange={e => setEditFolio(e.target.value)} required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Operador</label>
                <Combobox
                  options={editOperadores.map(o => ({
                    id: String(o.id),
                    label: o.nombre,
                    sublabel: o.numero_licencia ? `Lic. ${o.numero_licencia}` : undefined,
                  }))}
                  value={String(editOperadorId || "")}
                  onChange={v => setEditOperadorId(v)}
                  placeholder="— Selecciona operador —"
                  emptyHint="Sin operadores"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Unidad</label>
                <Combobox
                  options={editUnidades.map(u => ({
                    id: String(u.id),
                    label: u.internal_id,
                    prefix: u.license_plate || undefined,
                    sublabel: u.make_model || undefined,
                  }))}
                  value={editUnidadId ? String(editUnidadId) : ""}
                  onChange={v => setEditUnidadId(v ? Number(v) : "")}
                  placeholder="— Selecciona unidad —"
                  emptyHint="Sin unidades"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Origen</label>
                <Combobox
                  options={lugares.map(l => ({
                    id: String(l.id),
                    label: l.nombre,
                    prefix: l.id_ubicacion || undefined,
                    sublabel: l.direccion || undefined,
                  }))}
                  value={editOrigenId ? String(editOrigenId) : ""}
                  onChange={v => setEditOrigenId(v ? Number(v) : "")}
                  placeholder="— Selecciona origen —"
                  emptyHint="Sin lugares"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Destino</label>
                <Combobox
                  options={lugares.map(l => ({
                    id: String(l.id),
                    label: l.nombre,
                    prefix: l.id_ubicacion || undefined,
                    sublabel: l.direccion || undefined,
                  }))}
                  value={editDestinoId ? String(editDestinoId) : ""}
                  onChange={v => setEditDestinoId(v ? Number(v) : "")}
                  placeholder="— Selecciona destino —"
                  emptyHint="Sin lugares"
                />
              </div>
            </div>
            {editOrigenId && editDestinoId && editOrigenId === editDestinoId && (
              <div className="text-[11.5px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={12} /> El origen y destino son el mismo lugar (viaje redondo).
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sueldo del operador (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" min="0" step="0.01" value={editSueldo}
                    onChange={e => setEditSueldo(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                <Combobox
                  options={[
                    { id: "PLANIFICADO", label: "Planificado" },
                    { id: "EN_RUTA",     label: "En Ruta" },
                    { id: "ENTREGADO",   label: "Entregado" },
                    { id: "CANCELADO",   label: "Cancelado" },
                  ]}
                  value={editEstado}
                  onChange={v => setEditEstado(v)}
                  placeholder="— Selecciona estado —"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Eco. Remolque</label>
                <input type="text" value={editEcoRemolque} onChange={e => setEditEcoRemolque(e.target.value)}
                  placeholder="R-001"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Placa Remolque</label>
                <input type="text" value={editPlacaRemolque} onChange={e => setEditPlacaRemolque(e.target.value)}
                  placeholder="ABC-123-XYZ"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones</label>
              <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-y" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEdit(false)} disabled={busyEdit}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyEdit} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEdit ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Ubicación / Parada */}
      {openEditParada && (
        <Modal onClose={() => !busyEditParada && setOpenEditParada(false)} title="Editar ubicación">
          <form onSubmit={guardarParada} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del lugar</label>
              <input value={edNombre} onChange={e => setEdNombre(e.target.value)} required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">RFC</label>
                <input value={edRfc} onChange={e => setEdRfc(e.target.value.toUpperCase())} maxLength={13}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Código Postal <span className="text-[10px] text-slate-400 normal-case">(auto-llena Estado, Municipio, Colonias)</span>
                </label>
                <input value={edCP} onChange={e => setEdCP(e.target.value.replace(/\D/g, "").slice(0, 5))} maxLength={5}
                  placeholder="64860"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Calle</label>
                <input value={edCalle} onChange={e => setEdCalle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No. Ext.</label>
                <input value={edExt} onChange={e => setEdExt(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No. Int.</label>
                <input value={edInt} onChange={e => setEdInt(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Colonia</label>
                {edColonias.length > 0 ? (
                  <select value={edColonia} onChange={e => setEdColonia(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <option value="">— Selecciona o escribe abajo —</option>
                    {edColonias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input value={edColonia} onChange={e => setEdColonia(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Municipio</label>
                <input value={edMunicipio} onChange={e => setEdMunicipio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                <input value={edEstado} onChange={e => setEdEstado(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">País</label>
                <input value={edPais} onChange={e => setEdPais(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha y hora de la parada</label>
                <input type="datetime-local" value={edFechaHora} onChange={e => setEdFechaHora(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kilómetros del tramo</label>
                <input type="number" step="0.001" value={edKms} onChange={e => setEdKms(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Determinante <span className="text-[10px] text-slate-400 normal-case">(opcional)</span></label>
              <select value={edDeterminante} onChange={e => setEdDeterminante(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">— Sin determinante —</option>
                {determinantes.map(d => (
                  <option key={d.id} value={d.id}>{d.codigo} · {d.nombre}{d.cliente ? ` (${d.cliente})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenEditParada(false)} disabled={busyEditParada}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busyEditParada}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyEditParada ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nuevo Determinante */}
      {openDeterminante && (
        <Modal onClose={() => !busyDt && setOpenDeterminante(false)} title="Alta de Determinante">
          <form onSubmit={crearDeterminante} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Código *</label>
                <input value={dtCodigo} onChange={e => setDtCodigo(e.target.value)} required placeholder="Ej. DET-001"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cliente</label>
                <input value={dtCliente} onChange={e => setDtCliente(e.target.value)} placeholder="Cliente"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
              <input value={dtNombre} onChange={e => setDtNombre(e.target.value)} required placeholder="Nombre del determinante"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ubicación</label>
              <select value={dtUbicacion} onChange={e => setDtUbicacion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">— Sin ubicación —</option>
                {lugares.map(l => (
                  <option key={l.id} value={l.id}>{l.id_ubicacion ? `[${l.id_ubicacion}] ` : ""}{l.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpenDeterminante(false)} disabled={busyDt}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={busyDt}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Save size={11} /> {busyDt ? "Guardando…" : "Crear determinante"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Cancelación */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busyCancel && setConfirmCancel(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                  <Ban size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Cancelar viaje</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    ¿Confirmás que querés cancelar el viaje <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{v.folio_carta || v.id_viaje}</span>?
                    El viaje queda en estado <span className="font-bold">CANCELADO</span> pero no se elimina.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setConfirmCancel(false)} disabled={busyCancel}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Volver
                </button>
                <button onClick={cancelarViaje} disabled={busyCancel}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-1.5">
                  <Ban size={12} /> {busyCancel ? "Cancelando…" : "Sí, cancelar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, mono = false, accent = "text-slate-600 dark:text-slate-300" }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean; accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 backdrop-blur-sm px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.09] transition-colors shadow-sm dark:shadow-none">
      <div className={`flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.18em] mb-1 ${accent}`}>
        <Icon size={10} /> {label}
      </div>
      <div className={`text-lg font-black text-slate-800 dark:text-white ${mono ? "font-mono tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}

interface InfoLine { label: string; value: string; mono?: boolean; }

function InfoCard({ icon: Icon, title, tone, lines, onEdit, editLabel = "Editar" }: {
  icon: React.ElementType; title: string; tone: "blue" | "violet" | "amber"; lines: InfoLine[];
  onEdit?: () => void; editLabel?: string;
}) {
  const toneMap = {
    blue:   { bg: "bg-blue-50 dark:bg-blue-950/30",     border: "border-blue-200 dark:border-blue-900/40",     iconBg: "bg-blue-500",   chip: "text-blue-700 dark:text-blue-300",   editHover: "hover:bg-blue-100 dark:hover:bg-blue-900/30" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-900/40", iconBg: "bg-violet-500", chip: "text-violet-700 dark:text-violet-300", editHover: "hover:bg-violet-100 dark:hover:bg-violet-900/30" },
    amber:  { bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-200 dark:border-amber-900/40",   iconBg: "bg-amber-500",  chip: "text-amber-700 dark:text-amber-300",  editHover: "hover:bg-amber-100 dark:hover:bg-amber-900/30" },
  }[tone];
  return (
    <div className={`rounded-2xl border ${toneMap.border} ${toneMap.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${toneMap.iconBg} text-white flex items-center justify-center`}>
          <Icon size={13} />
        </div>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${toneMap.chip} flex-1`}>{title}</h3>
        {onEdit && (
          <button onClick={onEdit} title={editLabel}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${toneMap.chip} ${toneMap.editHover} transition-colors`}>
            <Pencil size={11} />
          </button>
        )}
      </div>
      <dl className="space-y-1.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">{line.label}</dt>
            <dd className={`text-[12.5px] font-bold text-slate-800 dark:text-slate-100 text-right truncate ${line.mono ? "font-mono" : ""}`}>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const downOnBackdropRef = useRef(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e => { downOnBackdropRef.current = e.target === e.currentTarget; }}
      onMouseUp={e => {
        if (downOnBackdropRef.current && e.target === e.currentTarget) onClose();
        downOnBackdropRef.current = false;
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
