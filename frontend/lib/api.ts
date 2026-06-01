// Cliente HTTP del ERP con JWT (access + refresh) y CSRF cookies.
//
// Diseno: cuando un endpoint devuelve 401 (token expirado), intenta refrescar
// con el refresh_token automaticamente y reintenta UNA vez. Solo si el
// refresh tambien falla, limpia tokens y redirige a /login. Esto evita el
// "logout intermitente" al navegar entre modulos cuando el access caduca.

// API_BASE: URL base del backend. Se resuelve dinamicamente:
//   1. Si NEXT_PUBLIC_API_URL esta definida (Vercel/produccion), la usa SIEMPRE.
//      Esto es lo correcto en deploy: el backend vive en Render y el frontend
//      en Vercel, no en el mismo host.
//   2. En LAN/dev sin env var: usa el hostname actual + puerto 8000 (asi
//      seguimos pudiendo entrar desde 192.168.x.x:3000 → 192.168.x.x:8000).
//   3. SSR sin window: fallback a localhost:8000.
const ENV_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// Si hay URL explicita (NEXT_PUBLIC_API_URL, p.ej. en Vercel/producción) se usa
// siempre. Si NO la hay, se devuelve cadena vacía → las peticiones se hacen al
// MISMO origen (el puerto 3000) y Next las reenvía al backend vía rewrites
// (ver next.config.ts: /api → 127.0.0.1:8000). Asi, en red local solo hace
// falta que el 3000 sea accesible; el 8000 queda interno y no necesita firewall.
export function getApiBase(): string {
  return ENV_API_URL; // "" => mismo origen (proxy de Next)
}

// Compatibilidad con codigo viejo que importa `API_BASE` como string.
export const API_BASE: string = ENV_API_URL;

const TOKEN_KEY = "erp.jwt.access";
const REFRESH_KEY = "erp.jwt.refresh";

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

function getAccess(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function getRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

// Promesa unica para refresh — si llegan varias requests al mismo tiempo con
// access expirado, todas esperan al mismo refresh en lugar de spamear el PAC.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefresh();
  if (!refresh) return null;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.access) return null;
      window.localStorage.setItem(TOKEN_KEY, data.access);
      if (data.refresh) window.localStorage.setItem(REFRESH_KEY, data.refresh);
      return data.access as string;
    } catch {
      return null;
    } finally {
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();
  return refreshInFlight;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  try { window.sessionStorage.setItem("erp.return-to", window.location.pathname + window.location.search); } catch { /* */ }
  window.location.href = "/login";
}

interface FetchOpts extends RequestInit {
  _retried?: boolean;
}

// Etiqueta legible por nombre de campo (para mensajes de validacion).
const FIELD_LABELS: Record<string, string> = {
  sku: "SKU", codigo_interno: "Código", codigo: "Código",
  codigo_barras: "Código de barras", nombre: "Nombre",
  unidad_medida: "Unidad de medida", empresa: "Empresa",
  non_field_errors: "", detail: "",
};

// Traduce los mensajes de DRF mas comunes a español claro.
function traducirMsg(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already exists") || m.includes("must make a unique set") || m.includes("ya existe"))
    return "Ya existe un registro con ese valor (debe ser único).";
  if (m.includes("this field is required") || m.includes("es requerido"))
    return "Este campo es obligatorio.";
  if (m.includes("this field may not be blank") || m.includes("no puede estar"))
    return "Este campo no puede estar vacío.";
  if (m.includes("not a valid") || m.includes("no es un")) return "Valor inválido.";
  return msg;
}

// Convierte el cuerpo de error de DRF en un mensaje legible.
// DRF devuelve {detail: "..."} o {campo: ["error1", ...], ...}.
function formatApiError(body: any, status: number): string {
  if (!body) return `Error ${status}`;
  if (typeof body === "string") return body;
  if (body.detail) return String(body.detail);
  if (body.message) return String(body.message);
  if (typeof body === "object") {
    const partes: string[] = [];
    for (const [campo, val] of Object.entries(body)) {
      const msgs = (Array.isArray(val) ? val : [val]).map((v) => traducirMsg(String(v)));
      const label = FIELD_LABELS[campo] ?? campo;
      partes.push(label ? `${label}: ${msgs.join(" ")}` : msgs.join(" "));
    }
    if (partes.length) return partes.join("\n");
  }
  return `Error ${status}`;
}

export async function apiFetch<T = unknown>(endpoint: string, options: FetchOpts = {}): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };
  const token = getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const csrf = getCookie("csrftoken");
  if (csrf) headers["X-CSRFToken"] = csrf;
  if (options.body instanceof FormData) delete headers["Content-Type"];

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, credentials: "include" });
  } catch (e) {
    throw new Error(`No se pudo conectar a ${API_BASE}. ¿Esta corriendo el backend Django?`);
  }

  // 401 → intentamos refresh UNA vez y reintentamos.
  if (res.status === 401 && !options._retried) {
    const hadToken = !!getAccess();
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiFetch<T>(endpoint, { ...options, _retried: true });
    }
    clearTokens();
    // Si el usuario TENIA token y fallo (expiro o invalido), redirige a login.
    // Si no tenia token, simplemente devolvemos null silenciosamente — el
    // componente que llamo ya tiene try/catch para manejar el null.
    if (hadToken) redirectToLogin();
    return null as T;
  }
  if (res.status === 401) {
    clearTokens();
    redirectToLogin();
    return null as T;
  }

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* sin body */ }
    throw new Error(formatApiError(body, res.status));
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export const api = {
  // ── Auth ──
  login: (username: string, password: string) =>
    apiFetch<{ access: string; refresh: string; user: any }>("/api/auth/login/", {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  logout: () => apiFetch("/api/auth/logout/", { method: "POST" }),
  me: () => apiFetch<any>("/api/auth/me/"),
  updatePerfil: (data: object) => apiFetch<any>("/api/auth/me/", { method: "PATCH", body: JSON.stringify(data) }),

  // ── Core ──
  getEmpresas: () => apiFetch<{ results: any[] }>("/api/core/empresas/"),
  getEmpresa: (id: number) => apiFetch<any>(`/api/core/empresas/${id}/`),
  crearEmpresa: (data: object) => apiFetch<any>("/api/core/empresas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarEmpresa: (id: number, data: object) =>
    apiFetch<any>(`/api/core/empresas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarEmpresa: (id: number) =>
    apiFetch(`/api/core/empresas/${id}/`, { method: "DELETE" }),

  getConfiguracion: (empresaId: number) =>
    apiFetch<any>(`/api/core/configuracion/${empresaId}/`),
  actualizarConfiguracion: (empresaId: number, data: object) =>
    apiFetch<any>(`/api/core/configuracion/${empresaId}/`, { method: "PATCH", body: JSON.stringify(data) }),

  getUsuarios: () => apiFetch<{ results: any[] }>("/api/core/usuarios/"),
  crearUsuario: (data: object) => apiFetch<any>("/api/core/usuarios/", { method: "POST", body: JSON.stringify(data) }),
  resetPassword: (id: number, password: string) =>
    apiFetch<any>(`/api/core/usuarios/${id}/reset_password/`, { method: "POST", body: JSON.stringify({ password }) }),
  activarUsuario: (id: number) =>
    apiFetch<any>(`/api/core/usuarios/${id}/activar/`, { method: "POST" }),

  getUsuarioEmpresa: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/core/usuario-empresa/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearUsuarioEmpresa: (data: object) =>
    apiFetch<any>("/api/core/usuario-empresa/", { method: "POST", body: JSON.stringify(data) }),

  // ── Modulos ──
  getModulos: () => apiFetch<{ results: any[] }>("/api/modulos/modulos/?page_size=200"),
  getModulosEmpresa: (empresaId: number) =>
    apiFetch<{ results: any[] }>(`/api/modulos/modulo-empresa/?empresa=${empresaId}&page_size=200`),
  toggleModuloEmpresa: (empresa: number, modulo: number, activo: boolean) =>
    apiFetch<any>("/api/modulos/modulo-empresa/toggle/", {
      method: "POST", body: JSON.stringify({ empresa, modulo, activo }),
    }),
  getAsignaciones: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/modulos/asignaciones/${params ? "?" + new URLSearchParams(params) : ""}`),
  setAsignaciones: (user: number, empresa: number, modulos: number[]) =>
    apiFetch<any[]>("/api/modulos/asignaciones/bulk_set/", {
      method: "POST", body: JSON.stringify({ user, empresa, modulos }),
    }),
  getMiMenu: (empresa?: number) =>
    apiFetch<any>(`/api/modulos/mi-menu/${empresa ? `?empresa=${empresa}` : ""}`),

  // ── Catalogos SAT ──
  getCatalogosSATStats: () => apiFetch<Record<string, number>>("/api/catalogos-sat/estadisticas/"),
  buscarClaveProdServ: (q: string) =>
    apiFetch<{ results: any[] }>(`/api/catalogos-sat/clave-prod-serv/?search=${encodeURIComponent(q)}&page_size=20`),
  buscarClaveProdServCP: (q: string) =>
    apiFetch<{ results: any[] }>(`/api/catalogos-sat/clave-prod-serv-cp/?search=${encodeURIComponent(q)}&page_size=20`),
  buscarColonias: (cp: string) =>
    apiFetch<{ results: any[] }>(`/api/catalogos-sat/colonias/?codigo_postal=${cp}&page_size=200`),
  buscarClaveUnidad: (q: string) =>
    apiFetch<{ results: any[] }>(`/api/catalogos-sat/clave-unidad/?search=${encodeURIComponent(q)}&page_size=20`),
  getUsosCFDI: () => apiFetch<{ results: any[] }>("/api/catalogos-sat/uso-cfdi/?page_size=100"),
  getFormasPago: () => apiFetch<{ results: any[] }>("/api/catalogos-sat/forma-pago/?page_size=100"),
  getMetodosPago: () => apiFetch<{ results: any[] }>("/api/catalogos-sat/metodo-pago/?page_size=100"),
  getRegimenes: () => apiFetch<{ results: any[] }>("/api/catalogos-sat/regimen-fiscal/?page_size=100"),
  uploadCatalogoSAT: (tipo: string, archivo: File) => {
    const fd = new FormData();
    fd.append("tipo", tipo);
    fd.append("archivo", archivo);
    return apiFetch<{ ok: boolean; log: string }>("/api/catalogos-sat/upload/", { method: "POST", body: fd });
  },

  // ── Facturacion ──
  getClientes: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/facturacion/clientes/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearCliente: (data: object) =>
    apiFetch<any>("/api/facturacion/clientes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarCliente: (id: number, data: object) =>
    apiFetch<any>(`/api/facturacion/clientes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarCliente: (id: number) =>
    apiFetch(`/api/facturacion/clientes/${id}/`, { method: "DELETE" }),
  // Autocompletado de domicilio por código postal (catálogo SAT).
  lookupCodigoPostal: (cp: string) =>
    apiFetch<any>(`/api/catalogos-sat/codigos-postales/lookup/?cp=${encodeURIComponent(cp)}`),
  getFacturas: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/facturacion/facturas/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearFactura: (data: object) =>
    apiFetch<any>("/api/facturacion/facturas/", { method: "POST", body: JSON.stringify(data) }),
  timbrarFactura: (id: number) =>
    apiFetch<any>(`/api/facturacion/facturas/${id}/timbrar/`, { method: "POST" }),
  cancelarFactura: (id: number, motivo: string, folio_sustitucion = "") =>
    apiFetch<any>(`/api/facturacion/facturas/${id}/cancelar/`, {
      method: "POST", body: JSON.stringify({ motivo, folio_sustitucion }),
    }),
  // Descarga XML/PDF de un CFDI con autenticacion. `accion` = "xml" | "pdf".
  // `modo` = "download" fuerza guardado; "open" abre en pestana nueva (PDF).
  // `recurso` = "facturas" (default) o "pagos" para complementos de pago (REP).
  descargarCFDI: async (
    id: number, accion: "xml" | "pdf", nombre: string,
    modo: "download" | "open" = "download", recurso: "facturas" | "pagos" = "facturas",
  ) => {
    const token = getAccess();
    const res = await fetch(`${getApiBase()}/api/facturacion/${recurso}/${id}/${accion}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) {
      let msg = `No se pudo descargar el ${accion.toUpperCase()}.`;
      try { const j = await res.json(); if (j.detail) msg = j.detail; } catch { /* */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (modo === "open") {
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
  getSeries: () => apiFetch<{ results: any[] }>("/api/facturacion/series/"),
  getProductosFacturacion: () => apiFetch<{ results: any[] }>("/api/facturacion/productos/"),

  // Reportes y concentrado de facturación
  getConcentradoFacturacion: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/facturacion/reportes/concentrado/${params ? "?" + new URLSearchParams(params) : ""}`),
  getDetalleFacturacion: (params: Record<string, string>) =>
    apiFetch<any[]>(`/api/facturacion/reportes/detalle/?${new URLSearchParams(params)}`),

  // Complementos de pago (REP)
  getPagos: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/facturacion/pagos/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearPago: (data: object) =>
    apiFetch<any>("/api/facturacion/pagos/", { method: "POST", body: JSON.stringify(data) }),
  timbrarPago: (id: number) =>
    apiFetch<any>(`/api/facturacion/pagos/${id}/timbrar/`, { method: "POST" }),

  // ── Carta Porte ──
  getCartasPorte: () => apiFetch<{ results: any[] }>("/api/carta-porte/cartas-porte/"),
  getCPUbicaciones: () => apiFetch<{ results: any[] }>("/api/carta-porte/ubicaciones/"),
  getCPAutotransportes: () => apiFetch<{ results: any[] }>("/api/carta-porte/autotransportes/"),
  getCPOperadores: () => apiFetch<{ results: any[] }>("/api/carta-porte/operadores/"),

  // ── Viajes ──
  getViajes: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/viajes/viajes/${params ? "?" + new URLSearchParams(params) : ""}`),
  getViaje: (id: number | string) => apiFetch<any>(`/api/viajes/viajes/${id}/`),
  crearViaje: (data: object) =>
    apiFetch<any>("/api/viajes/viajes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarViaje: (id: number | string, data: object) =>
    apiFetch<any>(`/api/viajes/viajes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarViaje: (id: number | string) =>
    apiFetch(`/api/viajes/viajes/${id}/`, { method: "DELETE" }),

  // ── Carta Porte ops ──
  crearCartaPorte: (data: object) =>
    apiFetch<any>("/api/carta-porte/cartas-porte/", { method: "POST", body: JSON.stringify(data) }),
  crearUbicacionCP: (data: object) =>
    apiFetch<any>("/api/carta-porte/ubicaciones/", { method: "POST", body: JSON.stringify(data) }),
  crearAutotransporte: (data: object) =>
    apiFetch<any>("/api/carta-porte/autotransportes/", { method: "POST", body: JSON.stringify(data) }),
  crearOperadorCP: (data: object) =>
    apiFetch<any>("/api/carta-porte/operadores/", { method: "POST", body: JSON.stringify(data) }),

  // ── Bitacora ──
  getBitacora: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/bitacora/eventos/${params ? "?" + new URLSearchParams(params) : ""}`),

  // ── Ordenes de compra ──
  getOrdenesCompra: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/ordenes-compra/ordenes/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearOrdenCompra: (data: object) =>
    apiFetch<any>("/api/ordenes-compra/ordenes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarOrdenCompra: (id: number, data: object) =>
    apiFetch<any>(`/api/ordenes-compra/ordenes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  // ── Cuentas por pagar ──
  getProveedores: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/cxp/proveedores/?${new URLSearchParams({ page_size: "300", ...(params || {}) })}`),
  crearProveedor: (data: object) =>
    apiFetch<any>("/api/cxp/proveedores/", { method: "POST", body: JSON.stringify(data) }),
  actualizarProveedor: (id: number, data: object) =>
    apiFetch<any>(`/api/cxp/proveedores/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarProveedor: (id: number) =>
    apiFetch(`/api/cxp/proveedores/${id}/`, { method: "DELETE" }),
  getFacturasProveedor: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/cxp/facturas/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearFacturaProveedor: (data: object) =>
    apiFetch<any>("/api/cxp/facturas/", { method: "POST", body: JSON.stringify(data) }),
  pagarFacturaProveedor: (data: object) =>
    apiFetch<any>("/api/cxp/pagos/", { method: "POST", body: JSON.stringify(data) }),

  // ── Flota ──
  getUnidades: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/flota/unidades/${params ? "?" + new URLSearchParams(params) : ""}`),
  getUnidad: (id: number | string) => apiFetch<any>(`/api/flota/unidades/${id}/`),
  crearUnidad: (data: object) =>
    apiFetch<any>("/api/flota/unidades/", { method: "POST", body: JSON.stringify(data) }),
  actualizarUnidad: (id: number | string, data: object) =>
    apiFetch<any>(`/api/flota/unidades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarUnidad: (id: number | string) =>
    apiFetch(`/api/flota/unidades/${id}/`, { method: "DELETE" }),
  // Termos (equipos de refrigeracion)
  getTermos: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/flota/termos/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearTermo: (data: object) =>
    apiFetch<any>("/api/flota/termos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTermo: (id: number | string, data: object) =>
    apiFetch<any>(`/api/flota/termos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarTermo: (id: number | string) =>
    apiFetch(`/api/flota/termos/${id}/`, { method: "DELETE" }),
  getCargasCombustible: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/flota/cargas/${params ? "?" + new URLSearchParams(params) : ""}`),

  // ── Almacen ──
  // Catalogos: categorias, marcas, unidades de medida
  getCategoriasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/categorias/${params ? "?" + new URLSearchParams(params) : "?page_size=200"}`),
  crearCategoriaAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/categorias/", { method: "POST", body: JSON.stringify(data) }),
  actualizarCategoriaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/categorias/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarCategoriaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/categorias/${id}/`, { method: "DELETE" }),

  getMarcasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/marcas/${params ? "?" + new URLSearchParams(params) : "?page_size=200"}`),
  crearMarcaAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/marcas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarMarcaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/marcas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarMarcaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/marcas/${id}/`, { method: "DELETE" }),

  getUnidadesMedidaAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/unidades-medida/${params ? "?" + new URLSearchParams(params) : "?page_size=200"}`),
  crearUnidadMedidaAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/unidades-medida/", { method: "POST", body: JSON.stringify(data) }),
  actualizarUnidadMedidaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/unidades-medida/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarUnidadMedidaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/unidades-medida/${id}/`, { method: "DELETE" }),

  // Productos
  getAlmacenes: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/almacenes/${params ? "?" + new URLSearchParams(params) : ""}`),
  getProductos: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/productos/${params ? "?" + new URLSearchParams(params) : ""}`),
  // Alias: algunas páginas (lotes, etiquetas) usan este nombre más descriptivo.
  getProductosAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/productos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getProductoAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/productos/${id}/`),
  crearProductoAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/productos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarProductoAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/productos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarProductoAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/productos/${id}/`, { method: "DELETE" }),
  getProductoExistencias: (id: number | string) =>
    apiFetch<any>(`/api/almacen/productos/${id}/existencias/`),
  getProductoKardex: (id: number | string, params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(
      `/api/almacen/productos/${id}/kardex/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  getProductoLotes: (id: number | string) =>
    apiFetch<{ results: any[] }>(`/api/almacen/productos/${id}/lotes/`),
  getProductoSeries: (id: number | string) =>
    apiFetch<{ results: any[] }>(`/api/almacen/productos/${id}/series/`),
  buscarProductosAlmacen: (q: string, extras?: Record<string, any>) =>
    apiFetch<{ results: any[] }>("/api/almacen/productos/buscar/", {
      method: "POST",
      body: JSON.stringify({ q, ...(extras || {}) }),
    }),
  importarProductosAlmacen: (data: FormData) =>
    apiFetch<any>("/api/almacen/productos/importar/", { method: "POST", body: data }),
  getProductosExportarUrl: (params?: Record<string, string>) =>
    `${getApiBase()}/api/almacen/productos/exportar/${params ? "?" + new URLSearchParams(params) : ""}`,

  /** URL absoluta para mostrar el codigo de barras/QR de un producto.
   * Incluye el JWT en ?token= porque <img> no manda Authorization.
   */
  barcodeProductoUrl: (id: number | string, opts?: {
    simbologia?: string; payload?: string; escala?: number; texto?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (opts?.simbologia) params.set("simbologia", opts.simbologia);
    if (opts?.payload) params.set("payload", opts.payload);
    if (opts?.escala) params.set("escala", String(opts.escala));
    if (opts?.texto === false) params.set("texto", "0");
    if (typeof window !== "undefined") {
      const tok = window.localStorage.getItem("erp.jwt.access");
      if (tok) params.set("token", tok);
    }
    const qs = params.toString();
    return `${getApiBase()}/api/almacen/productos/${id}/barcode/${qs ? "?" + qs : ""}`;
  },

  /** URL para preview ad-hoc sin tener producto persistido (formulario de alta). */
  barcodePreviewUrl: (simbologia: string, payload: string, opts?: {
    escala?: number; texto?: boolean;
  }) => {
    const params = new URLSearchParams({ simbologia, payload });
    if (opts?.escala) params.set("escala", String(opts.escala));
    if (opts?.texto === false) params.set("texto", "0");
    if (typeof window !== "undefined") {
      const tok = window.localStorage.getItem("erp.jwt.access");
      if (tok) params.set("token", tok);
    }
    return `${getApiBase()}/api/almacen/productos/barcode-preview/?${params.toString()}`;
  },

  // Almacenes (estructura)
  getAlmacenAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/almacenes/${id}/`),
  crearAlmacenAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/almacenes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarAlmacenAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/almacenes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarAlmacenAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/almacenes/${id}/`, { method: "DELETE" }),
  getAlmacenExistencias: (id: number | string) =>
    apiFetch<any>(`/api/almacen/almacenes/${id}/existencias/`),
  getAlmacenJerarquia: (id: number | string) =>
    apiFetch<any>(`/api/almacen/almacenes/${id}/jerarquia/`),

  // Zonas / Racks / Niveles / Ubicaciones
  getZonasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/zonas/${params ? "?" + new URLSearchParams(params) : "?page_size=500"}`),
  crearZonaAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/zonas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarZonaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/zonas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarZonaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/zonas/${id}/`, { method: "DELETE" }),

  getRacksAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/racks/${params ? "?" + new URLSearchParams(params) : "?page_size=500"}`),
  crearRackAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/racks/", { method: "POST", body: JSON.stringify(data) }),
  actualizarRackAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/racks/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarRackAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/racks/${id}/`, { method: "DELETE" }),

  getNivelesAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/niveles/${params ? "?" + new URLSearchParams(params) : "?page_size=500"}`),
  crearNivelAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/niveles/", { method: "POST", body: JSON.stringify(data) }),
  actualizarNivelAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/niveles/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarNivelAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/niveles/${id}/`, { method: "DELETE" }),

  getUbicacionesAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/ubicaciones/${params ? "?" + new URLSearchParams(params) : "?page_size=500"}`),
  crearUbicacionAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/ubicaciones/", { method: "POST", body: JSON.stringify(data) }),
  actualizarUbicacionAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/ubicaciones/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarUbicacionAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/ubicaciones/${id}/`, { method: "DELETE" }),

  // Lotes
  getLotesAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/lotes/${params ? "?" + new URLSearchParams(params) : ""}`),
  getLoteAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/lotes/${id}/`),
  crearLoteAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/lotes/", { method: "POST", body: JSON.stringify(data) }),
  actualizarLoteAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/lotes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarLoteAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/lotes/${id}/`, { method: "DELETE" }),
  getLotesPorCaducar: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/lotes/por_caducar/${params ? "?" + new URLSearchParams(params) : ""}`),
  getLoteTrazabilidad: (id: number | string) =>
    apiFetch<any>(`/api/almacen/lotes/${id}/trazabilidad/`),

  // Series
  getSeriesAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/series/${params ? "?" + new URLSearchParams(params) : ""}`),
  getSerieAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/series/${id}/`),
  crearSerieAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/series/", { method: "POST", body: JSON.stringify(data) }),
  actualizarSerieAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/series/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarSerieAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/series/${id}/`, { method: "DELETE" }),
  getSerieHistorial: (id: number | string) =>
    apiFetch<any>(`/api/almacen/series/${id}/historial/`),
  buscarSeriesAlmacen: (data: object) =>
    apiFetch<{ results: any[] }>("/api/almacen/series/buscar/", {
      method: "POST", body: JSON.stringify(data),
    }),

  // Existencias
  getExistenciasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/existencias/${params ? "?" + new URLSearchParams(params) : ""}`),
  getExistenciaAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/existencias/${id}/`),
  getExistenciasResumen: () =>
    apiFetch<any>("/api/almacen/existencias/resumen/"),
  getExistenciasPorAlmacen: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/existencias/por_almacen/${params ? "?" + new URLSearchParams(params) : ""}`),
  getExistenciasValorizacion: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/existencias/valorizacion/${params ? "?" + new URLSearchParams(params) : ""}`),
  reservarExistencia: (data: object) =>
    apiFetch<any>("/api/almacen/existencias/reservar/", { method: "POST", body: JSON.stringify(data) }),
  liberarExistencia: (data: object) =>
    apiFetch<any>("/api/almacen/existencias/liberar/", { method: "POST", body: JSON.stringify(data) }),

  // Movimientos
  getMovimientosAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/movimientos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getMovimientoAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/movimientos/${id}/`),
  crearMovimientoAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/movimientos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarMovimientoAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/movimientos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarMovimientoAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/movimientos/${id}/`, { method: "DELETE" }),
  aprobarMovimientoAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/movimientos/${id}/aprobar/`, { method: "POST" }),
  cancelarMovimientoAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/movimientos/${id}/cancelar/`, { method: "POST" }),
  crearMovimientoEntrada: (data: object) =>
    apiFetch<any>("/api/almacen/movimientos/entrada/", { method: "POST", body: JSON.stringify(data) }),
  crearMovimientoSalida: (data: object) =>
    apiFetch<any>("/api/almacen/movimientos/salida/", { method: "POST", body: JSON.stringify(data) }),
  crearMovimientoAjuste: (data: object) =>
    apiFetch<any>("/api/almacen/movimientos/ajuste/", { method: "POST", body: JSON.stringify(data) }),
  getMovimientoImprimirUrl: (id: number | string) =>
    `${getApiBase()}/api/almacen/movimientos/${id}/imprimir/`,

  // Movimiento detalles
  getMovimientoDetalles: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/movimiento-detalles/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearMovimientoDetalle: (data: object) =>
    apiFetch<any>("/api/almacen/movimiento-detalles/", { method: "POST", body: JSON.stringify(data) }),
  actualizarMovimientoDetalle: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/movimiento-detalles/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarMovimientoDetalle: (id: number | string) =>
    apiFetch(`/api/almacen/movimiento-detalles/${id}/`, { method: "DELETE" }),

  // Transferencias
  getTransferenciasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/transferencias/${params ? "?" + new URLSearchParams(params) : ""}`),
  getTransferenciaAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/transferencias/${id}/`),
  crearTransferenciaAlmacen: (data: object) =>
    apiFetch<any>("/api/almacen/transferencias/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTransferenciaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/transferencias/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarTransferenciaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/transferencias/${id}/`, { method: "DELETE" }),
  enviarTransferencia: (id: number | string) =>
    apiFetch<any>(`/api/almacen/transferencias/${id}/enviar/`, { method: "POST" }),
  recibirTransferencia: (id: number | string) =>
    apiFetch<any>(`/api/almacen/transferencias/${id}/recibir/`, { method: "POST" }),
  cancelarTransferencia: (id: number | string) =>
    apiFetch<any>(`/api/almacen/transferencias/${id}/cancelar/`, { method: "POST" }),

  // Kardex
  getKardexAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/kardex/${params ? "?" + new URLSearchParams(params) : ""}`),
  getKardexPorProducto: (params: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/kardex/por_producto/?${new URLSearchParams(params)}`),
  getKardexExportarUrl: (params?: Record<string, string>) =>
    `${getApiBase()}/api/almacen/kardex/exportar/${params ? "?" + new URLSearchParams(params) : ""}`,

  // Alertas
  getAlertasAlmacen: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count?: number }>(`/api/almacen/alertas/${params ? "?" + new URLSearchParams(params) : ""}`),
  getAlertaAlmacen: (id: number | string) =>
    apiFetch<any>(`/api/almacen/alertas/${id}/`),
  actualizarAlertaAlmacen: (id: number | string, data: object) =>
    apiFetch<any>(`/api/almacen/alertas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarAlertaAlmacen: (id: number | string) =>
    apiFetch(`/api/almacen/alertas/${id}/`, { method: "DELETE" }),
  atenderAlertaAlmacen: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/almacen/alertas/${id}/atender/`, {
      method: "POST", body: JSON.stringify({ comentario }),
    }),
  generarAlertasAlmacen: () =>
    apiFetch<any>("/api/almacen/alertas/generar/", { method: "POST" }),
  getAlertasPendientes: () =>
    apiFetch<{ results: any[]; count?: number }>("/api/almacen/alertas/pendientes/"),

  // Reportes y dashboard
  getReporteExistencias: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/existencias/${params ? "?" + new URLSearchParams(params) : ""}`),
  getReporteKardex: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/kardex/${params ? "?" + new URLSearchParams(params) : ""}`),
  getReporteValorizacion: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/valorizacion/${params ? "?" + new URLSearchParams(params) : ""}`),
  getReporteMovimientos: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/movimientos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getReporteRotacion: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/rotacion/${params ? "?" + new URLSearchParams(params) : ""}`),
  getReporteCaducidades: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/almacen/reportes/caducidades/${params ? "?" + new URLSearchParams(params) : ""}`),
  getDashboardAlmacen: () =>
    apiFetch<any>("/api/almacen/dashboard/resumen/"),

  // Compat: getInventario (legacy)
  getInventario: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/almacen/existencias/${params ? "?" + new URLSearchParams(params) : ""}`),

  // ── Mantenimiento ──
  getOrdenesMantenimiento: () =>
    apiFetch<{ results: any[] }>("/api/mantenimiento/ordenes/"),

  // Tablero preventivo
  getPreventivoMotor: () =>
    apiFetch<{ km_totales_flota: number; top5: any[]; unidades: any[] }>("/api/mantenimiento/preventivo/motor/"),
  getPreventivoThermo: () =>
    apiFetch<{ hrs_totales_flota: number; top5: any[]; termos: any[] }>("/api/mantenimiento/preventivo/thermo/"),
  configurarUnidadPreventivo: (data: object) =>
    apiFetch<any>("/api/mantenimiento/preventivo/configurar-unidad/", { method: "POST", body: JSON.stringify(data) }),
  configurarTermoPreventivo: (data: object) =>
    apiFetch<any>("/api/mantenimiento/preventivo/configurar-termo/", { method: "POST", body: JSON.stringify(data) }),

  // ── SGC (Calidad / ISO) ──
  getSGCDashboard: (params?: Record<string, string>) =>
    apiFetch<any>(`/api/sgc/dashboard/resumen/${params ? "?" + new URLSearchParams(params) : ""}`),
  getAgendaSGC: (empresa?: number) =>
    apiFetch<any>(`/api/sgc/dashboard/agenda/${empresa ? `?empresa=${empresa}` : ""}`),
  // Encuestas (admin)
  getEncuestas: (empresa?: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/encuestas/?page_size=100${empresa ? `&empresa=${empresa}` : ""}`),
  crearEncuesta: (data: object) =>
    apiFetch<any>("/api/sgc/encuestas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarEncuesta: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/encuestas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarEncuesta: (id: number) =>
    apiFetch<any>(`/api/sgc/encuestas/${id}/`, { method: "DELETE" }),
  getResultadosEncuesta: (id: number) =>
    apiFetch<any>(`/api/sgc/encuestas/${id}/resultados/`),
  // Encuestas (público, sin login)
  getEncuestaPublica: (token: string) =>
    apiFetch<any>(`/api/sgc/encuesta-publica/${token}/`),
  responderEncuesta: (token: string, data: object) =>
    apiFetch<any>(`/api/sgc/encuesta-publica/${token}/responder/`, { method: "POST", body: JSON.stringify(data) }),
  getRequisitosISO: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/requisitos/?page_size=300${params ? "&" + new URLSearchParams(params) : ""}`),
  getDiagnostico: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/diagnostico/?page_size=300${params ? "&" + new URLSearchParams(params) : ""}`),
  guardarEvaluacionReq: (data: object) =>
    apiFetch<any>("/api/sgc/diagnostico/", { method: "POST", body: JSON.stringify(data) }),
  actualizarEvaluacionReq: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/diagnostico/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  getNoConformidades: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/no-conformidades/?page_size=300${params ? "&" + new URLSearchParams(params) : ""}`),
  crearNoConformidad: (data: object) =>
    apiFetch<any>("/api/sgc/no-conformidades/", { method: "POST", body: JSON.stringify(data) }),
  actualizarNoConformidad: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/no-conformidades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  getRiesgos: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/riesgos/?page_size=300${params ? "&" + new URLSearchParams(params) : ""}`),
  crearRiesgo: (data: object) =>
    apiFetch<any>("/api/sgc/riesgos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarRiesgo: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/riesgos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  // Auditorías + hallazgos
  getAuditorias: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/auditorias/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearAuditoria: (data: object) => apiFetch<any>("/api/sgc/auditorias/", { method: "POST", body: JSON.stringify(data) }),
  actualizarAuditoria: (id: number, data: object) => apiFetch<any>(`/api/sgc/auditorias/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  crearHallazgo: (data: object) => apiFetch<any>("/api/sgc/hallazgos/", { method: "POST", body: JSON.stringify(data) }),
  eliminarHallazgo: (id: number) => apiFetch(`/api/sgc/hallazgos/${id}/`, { method: "DELETE" }),
  // KPIs
  getKPIs: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/kpis/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearKPI: (data: object) => apiFetch<any>("/api/sgc/kpis/", { method: "POST", body: JSON.stringify(data) }),
  actualizarKPI: (id: number, data: object) => apiFetch<any>(`/api/sgc/kpis/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  // Capacitación
  getCapacitaciones: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/capacitaciones/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearCapacitacion: (data: object) => apiFetch<any>("/api/sgc/capacitaciones/", { method: "POST", body: JSON.stringify(data) }),
  actualizarCapacitacion: (id: number, data: object) => apiFetch<any>(`/api/sgc/capacitaciones/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  // Equipos / calibración
  getEquiposSGC: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/equipos/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearEquipoSGC: (data: object) => apiFetch<any>("/api/sgc/equipos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarEquipoSGC: (id: number, data: object) => apiFetch<any>(`/api/sgc/equipos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  // Evaluación de proveedores
  getEvaluacionesProveedor: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/evaluaciones-proveedor/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearEvaluacionProveedor: (data: object) => apiFetch<any>("/api/sgc/evaluaciones-proveedor/", { method: "POST", body: JSON.stringify(data) }),
  // Quejas
  getQuejas: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/sgc/quejas/?page_size=200${params ? "&" + new URLSearchParams(params) : ""}`),
  crearQueja: (data: object) => apiFetch<any>("/api/sgc/quejas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarQueja: (id: number, data: object) => apiFetch<any>(`/api/sgc/quejas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  // Herramientas inteligentes SGC
  generarCapaDesdeDiagnostico: (empresa: number) => apiFetch<any>("/api/sgc/diagnostico/generar_capa/", { method: "POST", body: JSON.stringify({ empresa }) }),
  cerrarNoConformidad: (id: number, eficacia = true) => apiFetch<any>(`/api/sgc/no-conformidades/${id}/cerrar/`, { method: "POST", body: JSON.stringify({ eficacia }) }),
  convertirHallazgoNC: (id: number) => apiFetch<any>(`/api/sgc/hallazgos/${id}/convertir_nc/`, { method: "POST" }),
  escalarQuejaNC: (id: number) => apiFetch<any>(`/api/sgc/quejas/${id}/escalar/`, { method: "POST" }),
  // Política y objetivos
  getPolitica: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/politica/?${new URLSearchParams(params || {})}`),
  crearPolitica: (data: object) => apiFetch<any>("/api/sgc/politica/", { method: "POST", body: JSON.stringify(data) }),
  actualizarPolitica: (id: number, data: object) => apiFetch<any>(`/api/sgc/politica/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  getObjetivos: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/objetivos/?page_size=200&${new URLSearchParams(params || {})}`),
  crearObjetivo: (data: object) => apiFetch<any>("/api/sgc/objetivos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarObjetivo: (id: number, data: object) => apiFetch<any>(`/api/sgc/objetivos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarObjetivo: (id: number) => apiFetch(`/api/sgc/objetivos/${id}/`, { method: "DELETE" }),
  // Contexto + partes interesadas
  getContexto: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/contexto/?page_size=300&${new URLSearchParams(params || {})}`),
  crearContexto: (data: object) => apiFetch<any>("/api/sgc/contexto/", { method: "POST", body: JSON.stringify(data) }),
  actualizarContexto: (id: number, data: object) => apiFetch<any>(`/api/sgc/contexto/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarContexto: (id: number) => apiFetch(`/api/sgc/contexto/${id}/`, { method: "DELETE" }),
  getPartesInteresadas: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/partes-interesadas/?page_size=300&${new URLSearchParams(params || {})}`),
  crearParteInteresada: (data: object) => apiFetch<any>("/api/sgc/partes-interesadas/", { method: "POST", body: JSON.stringify(data) }),
  actualizarParteInteresada: (id: number, data: object) => apiFetch<any>(`/api/sgc/partes-interesadas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarParteInteresada: (id: number) => apiFetch(`/api/sgc/partes-interesadas/${id}/`, { method: "DELETE" }),
  // Revisión por la dirección
  getRevisiones: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/revisiones-direccion/?page_size=100&${new URLSearchParams(params || {})}`),
  crearRevision: (data: object) => apiFetch<any>("/api/sgc/revisiones-direccion/", { method: "POST", body: JSON.stringify(data) }),
  actualizarRevision: (id: number, data: object) => apiFetch<any>(`/api/sgc/revisiones-direccion/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  getDatosRevision: (empresa: number) => apiFetch<any>(`/api/sgc/revisiones-direccion/datos_sugeridos/?empresa=${empresa}`),
  getSnapshotRevision: (empresa: number) => apiFetch<any>(`/api/sgc/revisiones-direccion/snapshot/?empresa=${empresa}`),
  getAcuerdosRevision: (revId: number) => apiFetch<{ results: any[] }>(`/api/sgc/acuerdos-revision/?revision=${revId}&page_size=100`),
  crearAcuerdoRevision: (data: object) => apiFetch<any>("/api/sgc/acuerdos-revision/", { method: "POST", body: JSON.stringify(data) }),
  actualizarAcuerdoRevision: (id: number, data: object) => apiFetch<any>(`/api/sgc/acuerdos-revision/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarAcuerdoRevision: (id: number) => apiFetch<any>(`/api/sgc/acuerdos-revision/${id}/`, { method: "DELETE" }),
  // Competencias
  getPerfilesPuesto: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/perfiles-puesto/?page_size=200&${new URLSearchParams(params || {})}`),
  crearPerfilPuesto: (data: object) => apiFetch<any>("/api/sgc/perfiles-puesto/", { method: "POST", body: JSON.stringify(data) }),
  actualizarPerfilPuesto: (id: number, data: object) => apiFetch<any>(`/api/sgc/perfiles-puesto/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  getCompetencias: (params?: Record<string, string>) => apiFetch<{ results: any[] }>(`/api/sgc/competencias/?page_size=300&${new URLSearchParams(params || {})}`),
  crearCompetencia: (data: object) => apiFetch<any>("/api/sgc/competencias/", { method: "POST", body: JSON.stringify(data) }),
  actualizarCompetencia: (id: number, data: object) => apiFetch<any>(`/api/sgc/competencias/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarCompetencia: (id: number) => apiFetch<any>(`/api/sgc/competencias/${id}/`, { method: "DELETE" }),
  // Competencias granulares del perfil
  getCompetenciasPerfil: (perfilId: number) => apiFetch<{ results: any[] }>(`/api/sgc/competencias-perfil/?perfil=${perfilId}&page_size=100`),
  crearCompetenciaPerfil: (data: object) => apiFetch<any>("/api/sgc/competencias-perfil/", { method: "POST", body: JSON.stringify(data) }),
  actualizarCompetenciaPerfil: (id: number, data: object) => apiFetch<any>(`/api/sgc/competencias-perfil/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarCompetenciaPerfil: (id: number) => apiFetch<any>(`/api/sgc/competencias-perfil/${id}/`, { method: "DELETE" }),
  // Detalles de evaluación (nivel real por competencia → brecha)
  actualizarEvaluacionDetalle: (id: number, data: object) => apiFetch<any>(`/api/sgc/evaluacion-detalles/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  sembrarDetallesEvaluacion: (evalId: number) => apiFetch<any>(`/api/sgc/competencias/${evalId}/sembrar_detalles/`, { method: "POST" }),
  crearCapacitacionDesdeBrecha: (evalId: number) => apiFetch<any>(`/api/sgc/competencias/${evalId}/crear_capacitacion/`, { method: "POST" }),
  getBrechasCompetencia: (empresa: number) => apiFetch<any>(`/api/sgc/competencias/brechas/?empresa=${empresa}`),

  // ── SGC · Colaboración multi-usuario (Pilar 1) ──
  getMiembrosSGC: (empresa?: number) =>
    apiFetch<any[]>(`/api/sgc/miembros/${empresa ? `?empresa=${empresa}` : ""}`),
  getComentariosSGC: (tipo: string, objeto: number | string) =>
    apiFetch<{ results: any[] }>(`/api/sgc/comentarios/?tipo=${tipo}&objeto=${objeto}&page_size=200`),
  crearComentarioSGC: (tipo: string, objeto: number | string, texto: string) =>
    apiFetch<any>("/api/sgc/comentarios/", { method: "POST", body: JSON.stringify({ tipo, objeto, texto }) }),
  eliminarComentarioSGC: (id: number) =>
    apiFetch<any>(`/api/sgc/comentarios/${id}/`, { method: "DELETE" }),
  getActividadSGC: (tipo: string, objeto: number | string) =>
    apiFetch<{ results: any[] }>(`/api/sgc/actividad/?tipo=${tipo}&objeto=${objeto}&page_size=200`),
  getNotificacionesSGC: (soloNoLeidas?: boolean) =>
    apiFetch<{ results: any[] }>(`/api/sgc/notificaciones/?page_size=50${soloNoLeidas ? "&no_leidas=1" : ""}`),
  getConteoNotificacionesSGC: () =>
    apiFetch<{ no_leidas: number }>("/api/sgc/notificaciones/conteo/"),
  leerNotificacionSGC: (id: number) =>
    apiFetch<any>(`/api/sgc/notificaciones/${id}/leer/`, { method: "POST" }),
  marcarTodasNotificacionesSGC: () =>
    apiFetch<any>("/api/sgc/notificaciones/marcar_todas/", { method: "POST" }),
  getMisPendientesSGC: (empresa?: number) =>
    apiFetch<any>(`/api/sgc/mis-pendientes/resumen/${empresa ? `?empresa=${empresa}` : ""}`),

  // ── SGC · Pilar 2: Tablero de Implementación (Kanban ISO) ──
  getTableroImplementacion: (empresa: number) =>
    apiFetch<any>(`/api/sgc/implementacion/tablero/?empresa=${empresa}`),
  generarTableroImplementacion: (empresa: number) =>
    apiFetch<any>("/api/sgc/implementacion/generar/", { method: "POST", body: JSON.stringify({ empresa }) }),
  crearTareaImpl: (data: object) =>
    apiFetch<any>("/api/sgc/implementacion/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTareaImpl: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/implementacion/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  moverTareaImpl: (id: number, columna: string, avance?: number) =>
    apiFetch<any>(`/api/sgc/implementacion/${id}/mover/`, { method: "POST", body: JSON.stringify({ columna, ...(avance != null ? { avance } : {}) }) }),
  eliminarTareaImpl: (id: number) =>
    apiFetch<any>(`/api/sgc/implementacion/${id}/`, { method: "DELETE" }),
  getSubtareasImpl: (tareaId: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/subtareas-implementacion/?tarea=${tareaId}&page_size=100`),
  crearSubtareaImpl: (data: object) =>
    apiFetch<any>("/api/sgc/subtareas-implementacion/", { method: "POST", body: JSON.stringify(data) }),
  actualizarSubtareaImpl: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/subtareas-implementacion/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarSubtareaImpl: (id: number) =>
    apiFetch<any>(`/api/sgc/subtareas-implementacion/${id}/`, { method: "DELETE" }),

  // ── SGC · Pilar 3: CAPA avanzado (acciones, evidencias, aprobación) ──
  getAccionesCAPA: (ncId: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/acciones-capa/?no_conformidad=${ncId}&page_size=100`),
  crearAccionCAPA: (data: object) =>
    apiFetch<any>("/api/sgc/acciones-capa/", { method: "POST", body: JSON.stringify(data) }),
  actualizarAccionCAPA: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/acciones-capa/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarAccionCAPA: (id: number) =>
    apiFetch<any>(`/api/sgc/acciones-capa/${id}/`, { method: "DELETE" }),
  aprobarNC: (id: number) =>
    apiFetch<any>(`/api/sgc/no-conformidades/${id}/aprobar/`, { method: "POST" }),
  verificarEficaciaNC: (id: number, eficaz: boolean) =>
    apiFetch<any>(`/api/sgc/no-conformidades/${id}/verificar_eficacia/`, { method: "POST", body: JSON.stringify({ eficaz }) }),
  getEvidenciasSGC: (tipo: string, objeto: number | string) =>
    apiFetch<{ results: any[] }>(`/api/sgc/evidencias/?tipo=${tipo}&objeto=${objeto}&page_size=100`),
  subirEvidenciaSGC: (tipo: string, objeto: number | string, archivo: File, nombre?: string) => {
    const fd = new FormData();
    fd.append("tipo", tipo); fd.append("objeto", String(objeto)); fd.append("archivo", archivo);
    if (nombre) fd.append("nombre", nombre);
    return apiFetch<any>("/api/sgc/evidencias/", { method: "POST", body: fd });
  },
  eliminarEvidenciaSGC: (id: number) =>
    apiFetch<any>(`/api/sgc/evidencias/${id}/`, { method: "DELETE" }),

  // ── SGC · Pilar 4: Procesos (SIPOC) + tendencias KPI ──
  // OJO: nombres con sufijo SGC para no colisionar con los procesos de
  // mantenimiento (getProcesos/crearProceso ya existen más abajo).
  getProcesosSGC: (empresa?: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/procesos/?page_size=200${empresa ? `&empresa=${empresa}` : ""}`),
  crearProcesoSGC: (data: object) =>
    apiFetch<any>("/api/sgc/procesos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarProcesoSGC: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/procesos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarProcesoSGC: (id: number) =>
    apiFetch<any>(`/api/sgc/procesos/${id}/`, { method: "DELETE" }),
  getPanoramaProceso: (id: number) =>
    apiFetch<any>(`/api/sgc/procesos/${id}/panorama/`),
  // Tareas / resultados clave de un objetivo (suman el avance del objetivo).
  getTareasObjetivo: (objId: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/tareas-objetivo/?objetivo=${objId}&page_size=100`),
  crearTareaObjetivo: (data: object) =>
    apiFetch<any>("/api/sgc/tareas-objetivo/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTareaObjetivo: (id: number, data: object) =>
    apiFetch<any>(`/api/sgc/tareas-objetivo/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarTareaObjetivo: (id: number) =>
    apiFetch<any>(`/api/sgc/tareas-objetivo/${id}/`, { method: "DELETE" }),
  getMedicionesKPI: (kpiId: number) =>
    apiFetch<{ results: any[] }>(`/api/sgc/mediciones-kpi/?kpi=${kpiId}&page_size=100`),
  crearMedicionKPI: (data: object) =>
    apiFetch<any>("/api/sgc/mediciones-kpi/", { method: "POST", body: JSON.stringify(data) }),

  // Flujos / Checklists de mantenimiento
  getFlujosMantto: () =>
    apiFetch<{ results: any[] }>("/api/mantenimiento/flujos/?page_size=200"),
  getFlujoMantto: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/flujos/${id}/`),
  crearFlujoMantto: (data: object) =>
    apiFetch<any>("/api/mantenimiento/flujos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarFlujoMantto: (id: number | string, data: object) =>
    apiFetch<any>(`/api/mantenimiento/flujos/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  eliminarFlujoMantto: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/flujos/${id}/`, { method: "DELETE" }),
  // Flujos asignados a mi (vista del tecnico)
  misFlujosMantto: () =>
    apiFetch<{ count: number; results: any[] }>("/api/mantenimiento/flujos/mis-flujos/"),
  // Enviar una respuesta (multipart con fotos)
  responderFlujoMantto: (id: number | string, fd: FormData) =>
    apiFetch<any>(`/api/mantenimiento/flujos/${id}/responder/`, { method: "POST", body: fd }),
  // Respuestas resguardadas de un flujo
  respuestasFlujoMantto: (id: number | string) =>
    apiFetch<{ count: number; results: any[] }>(`/api/mantenimiento/flujos/${id}/respuestas/`),

  // ── Procesos (flujos multi-etapa) ──
  getProcesos: () =>
    apiFetch<{ results: any[] }>("/api/mantenimiento/procesos/?page_size=200"),
  getProceso: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/procesos/${id}/`),
  crearProceso: (data: object) =>
    apiFetch<any>("/api/mantenimiento/procesos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarProceso: (id: number | string, data: object) =>
    apiFetch<any>(`/api/mantenimiento/procesos/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  eliminarProceso: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/procesos/${id}/`, { method: "DELETE" }),
  iniciarProceso: (id: number | string, etiqueta = "") =>
    apiFetch<any>(`/api/mantenimiento/procesos/${id}/iniciar/`, { method: "POST", body: JSON.stringify({ etiqueta }) }),
  // Ejecuciones
  getEjecuciones: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/mantenimiento/ejecuciones/${params ? "?" + new URLSearchParams(params) : ""}`),
  getEjecucion: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/ejecuciones/${id}/`),
  cancelarEjecucion: (id: number | string) =>
    apiFetch<any>(`/api/mantenimiento/ejecuciones/${id}/cancelar/`, { method: "POST" }),
  // Bandeja del usuario: etapas activas que le toca llenar
  misEtapasProceso: () =>
    apiFetch<{ count: number; results: any[] }>("/api/mantenimiento/ejecuciones/mis-etapas/"),

  // ── Liquidaciones ──
  getLiquidaciones: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/liquidaciones/liquidaciones/${params ? "?" + new URLSearchParams(params) : ""}`),

  // ── RH ──
  getEmpleados: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/rh/empleados/${params ? "?" + new URLSearchParams(params) : ""}`),
  getDepartamentos: () => apiFetch<{ results: any[] }>("/api/rh/departamentos/?page_size=200"),
  getPuestos: () => apiFetch<{ results: any[] }>("/api/rh/puestos/?page_size=200"),

  // ── RH compatibilidad con componentes migrados de 3rrecycling ──
  getRHDashboard: () => apiFetch<any>("/rh/api/dashboard/"),
  getRHDepartamentos: () => apiFetch<{ results: any[] }>("/api/rh/departamentos/?page_size=200"),
  getRHPuestos: () => apiFetch<{ results: any[] }>("/api/rh/puestos/?page_size=200"),
  getRHSupervisores: () =>
    apiFetch<{ results: any[] }>("/api/rh/empleados/?activo=true&page_size=200"),
  getRHExportUrl: (params?: Record<string, string>) =>
    `${getApiBase()}/api/rh/empleados/?export=excel${params ? "&" + new URLSearchParams(params) : ""}`,
  getEmpleado: (id: number | string) => apiFetch<any>(`/api/rh/empleados/${id}/`),
  crearEmpleadoRH: (data: any) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/rh/empleados/", opts);
  },
  actualizarEmpleadoRH: (id: number | string, data: any) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "PATCH", body: data }
      : { method: "PATCH", body: JSON.stringify(data) };
    return apiFetch<any>(`/api/rh/empleados/${id}/`, opts);
  },
  importarEmpleadosRH: (data: FormData) =>
    apiFetch<any>("/api/rh/empleados/importar/", { method: "POST", body: data }),

  // Departamentos / Puestos (CRUD para componentes migrados)
  getDepartamento: (id: number | string) => apiFetch<any>(`/api/rh/departamentos/${id}/`),
  crearDepartamento: (data: object) =>
    apiFetch<any>("/api/rh/departamentos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarDepartamento: (id: number | string, data: object) =>
    apiFetch<any>(`/api/rh/departamentos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarDepartamento: (id: number | string) =>
    apiFetch(`/api/rh/departamentos/${id}/`, { method: "DELETE" }),

  getPuesto: (id: number | string) => apiFetch<any>(`/api/rh/puestos/${id}/`),
  crearPuesto: (data: object) =>
    apiFetch<any>("/api/rh/puestos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarPuesto: (id: number | string, data: object) =>
    apiFetch<any>(`/api/rh/puestos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarPuesto: (id: number | string) =>
    apiFetch(`/api/rh/puestos/${id}/`, { method: "DELETE" }),

  // Vacaciones (componentes migrados)
  getVacacionesRH: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/rh/vacaciones/${params ? "?" + new URLSearchParams(params) : ""}`),
  getVacacionRH: (id: number | string) => apiFetch<any>(`/api/rh/vacaciones/${id}/`),
  crearVacacionRH: (data: any) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/rh/vacaciones/", opts);
  },
  eliminarVacacionRH: (id: number | string) =>
    apiFetch(`/api/rh/vacaciones/${id}/`, { method: "DELETE" }),
  getBalanceVacaciones: (empleadoId: number | string) =>
    apiFetch<any>(`/api/rh/empleados/${empleadoId}/balance-vacaciones/`).catch(() =>
      ({ dias_disponibles: 0, dias_tomados: 0, dias_acumulados: 0 } as any),
    ),
  setBalanceVacaciones: (empleadoId: number | string, data: object) =>
    apiFetch<any>(`/api/rh/empleados/${empleadoId}/balance-vacaciones/`, {
      method: "POST", body: JSON.stringify(data),
    }),

  // Prestamos (componentes migrados)
  getPrestamosRH: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/rh/prestamos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getPrestamoRH: (id: number | string) => apiFetch<any>(`/api/rh/prestamos/${id}/`),
  crearPrestamoRH: (data: any) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/rh/prestamos/", opts);
  },
  eliminarPrestamoRH: (id: number | string) =>
    apiFetch(`/api/rh/prestamos/${id}/`, { method: "DELETE" }),

  // ── Compatibilidad con ViajeForm migrado ──
  getOperadores: () => apiFetch<{ results: any[] }>("/api/operadores/?page_size=200"),
  getCatLugares: () => apiFetch<{ results: any[] }>("/api/cat/lugares/?page_size=500"),
  getCatUnidades: () => apiFetch<{ results: any[] }>("/api/cat/unidades/?page_size=500"),
  getCatEmpresas: () => apiFetch<{ results: any[] }>("/api/cat/empresas/?page_size=200"),
  editarCatLugar: (id: number | string, data: object) =>
    apiFetch<any>(`/api/cat/lugares/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  editarCatUnidad: (id: number | string, data: object) =>
    apiFetch<any>(`/api/cat/unidades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  // Mercancias y paradas dentro de un viaje (stubs por ahora)
  agregarMercanciaViaje: (viajeId: number | string, data: object) =>
    apiFetch<any>(`/api/viajes/viajes/${viajeId}/mercancias/`, { method: "POST", body: JSON.stringify(data) }),
  actualizarMercanciaViaje: (viajeId: number | string, id: number | string, data: object) =>
    apiFetch<any>(`/api/viajes/viajes/${viajeId}/mercancias/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarMercanciaViaje: (viajeId: number | string, id: number | string) =>
    apiFetch(`/api/viajes/viajes/${viajeId}/mercancias/${id}/`, { method: "DELETE" }),
  agregarParadaViaje: (viajeId: number | string, data: object) =>
    apiFetch<any>(`/api/viajes/viajes/${viajeId}/paradas/`, { method: "POST", body: JSON.stringify(data) }),
  actualizarParadaViaje: (viajeId: number | string, id: number | string, data: object) =>
    apiFetch<any>(`/api/viajes/viajes/${viajeId}/paradas/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarParadaViaje: (viajeId: number | string, id: number | string) =>
    apiFetch(`/api/viajes/viajes/${viajeId}/paradas/${id}/`, { method: "DELETE" }),

  // Licencia del operador
  actualizarOperadorLicencia: (id: number | string, data: object) =>
    apiFetch<any>(`/api/operadores/${id}/licencia/`, { method: "PATCH", body: JSON.stringify(data) }),

  // URLs para descargas
  getViajePdfUrl: (id: number | string) => `${getApiBase()}/api/viajes/viajes/${id}/pdf/`,
  getViajesExportExcelUrl: (params?: Record<string, string>) =>
    `${getApiBase()}/api/viajes/viajes/export-excel/${params ? "?" + new URLSearchParams(params) : ""}`,

  // Busqueda de CP del catalogo SAT
  buscarCP: (cp: string) =>
    apiFetch<any>(`/api/catalogos-sat/codigos-postales/?search=${encodeURIComponent(cp)}&page_size=20`),
  buscarCatalogoSAT: (catalogo: string, q: string) =>
    apiFetch<any>(`/api/catalogos-sat/${catalogo}/?search=${encodeURIComponent(q)}&page_size=20`),

  // ── Solicitudes RH (permisos, vacaciones, prestamos) ──
  getTiposSolicitud: (params?: Record<string, string>) => {
    const p = new URLSearchParams(params || {});
    if (!p.has("page_size")) p.set("page_size", "200");
    return apiFetch<{ results: any[] }>(`/api/rh/tipos-solicitud/?${p.toString()}`);
  },
  crearTipoSolicitud: (data: object) =>
    apiFetch<any>("/api/rh/tipos-solicitud/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTipoSolicitud: (id: number | string, data: object) =>
    apiFetch<any>(`/api/rh/tipos-solicitud/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarTipoSolicitud: (id: number | string) =>
    apiFetch(`/api/rh/tipos-solicitud/${id}/`, { method: "DELETE" }),
  cargarTiposSugeridos: (empresa: number) =>
    apiFetch<{ creados: number; total_sugeridos: number }>(
      "/api/rh/tipos-solicitud/cargar-sugeridos/",
      { method: "POST", body: JSON.stringify({ empresa }) },
    ),

  getSolicitudesRH: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/rh/solicitudes/${params ? "?" + new URLSearchParams(params) : ""}`),
  getMisSolicitudes: () => apiFetch<{ results: any[] }>("/api/rh/solicitudes/mias/"),
  getSolicitudRH: (id: number | string) => apiFetch<any>(`/api/rh/solicitudes/${id}/`),
  crearSolicitudRH: (data: any) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/rh/solicitudes/", opts);
  },
  aprobarSolicitudRH: (id: number | string, comentarios = "") =>
    apiFetch<any>(`/api/rh/solicitudes/${id}/aprobar/`, { method: "POST", body: JSON.stringify({ comentarios }) }),
  rechazarSolicitudRH: (id: number | string, comentarios = "") =>
    apiFetch<any>(`/api/rh/solicitudes/${id}/rechazar/`, { method: "POST", body: JSON.stringify({ comentarios }) }),
  cancelarSolicitudRH: (id: number | string) =>
    apiFetch<any>(`/api/rh/solicitudes/${id}/cancelar/`, { method: "POST" }),

  // ── Notificaciones ──
  getNotificaciones: (params?: Record<string, string>) =>
    apiFetch<{ count: number; results: any[] }>(
      `/api/rh/notificaciones/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  getNotificacionesNoLeidas: () =>
    apiFetch<{ count: number; results: any[] }>("/api/rh/notificaciones/no-leidas/"),
  marcarNotifLeida: (id: number | string) =>
    apiFetch<any>(`/api/rh/notificaciones/${id}/marcar-leida/`, { method: "POST" }),
  marcarTodasNotifLeidas: () =>
    apiFetch<{ actualizadas: number }>("/api/rh/notificaciones/marcar-todas-leidas/", { method: "POST" }),

  // ── Configuracion de destinatarios de notificaciones RH ──
  getConfigNotifUsuarios: (empresa: number | string) =>
    apiFetch<{ results: Array<{ user_id: number; username: string; first_name: string; last_name: string; email: string; is_staff: boolean; rol: string; notif_activo: boolean }> }>(
      `/api/rh/config-notif/usuarios-disponibles/?empresa=${empresa}`,
    ),
  setConfigNotifUsuario: (empresa: number, user: number, activo: boolean) =>
    apiFetch<any>("/api/rh/config-notif/", {
      method: "POST",
      body: JSON.stringify({ empresa, user, activo }),
    }),
  updateConfigNotifUsuario: (id: number, activo: boolean) =>
    apiFetch<any>(`/api/rh/config-notif/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }),
  listConfigNotif: (empresa: number | string) =>
    apiFetch<{ results: any[] }>(`/api/rh/config-notif/?empresa=${empresa}&page_size=200`),

  // ───────────────── Liquidaciones de Operador ─────────────────
  getLiquidaciones: (params?: Record<string, string>) =>
    apiFetch<{ count: number; results: any[] }>(
      `/api/liquidaciones/liquidaciones/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  getLiquidacion: (id: number | string) =>
    apiFetch<any>(`/api/liquidaciones/liquidaciones/${id}/`),
  crearLiquidacion: (data: any) =>
    apiFetch<any>("/api/liquidaciones/liquidaciones/", { method: "POST", body: JSON.stringify(data) }),
  actualizarLiquidacion: (id: number | string, data: any) =>
    apiFetch<any>(`/api/liquidaciones/liquidaciones/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarLiquidacion: (id: number | string) =>
    apiFetch(`/api/liquidaciones/liquidaciones/${id}/`, { method: "DELETE" }),
  agregarConceptoLiquidacion: (lid: number | string, data: any) =>
    apiFetch<any>(`/api/liquidaciones/liquidaciones/${lid}/conceptos/`, { method: "POST", body: JSON.stringify(data) }),
  actualizarConceptoLiquidacion: (cid: number | string, data: any) =>
    apiFetch<any>(`/api/liquidaciones/conceptos/${cid}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarConceptoLiquidacion: (cid: number | string) =>
    apiFetch(`/api/liquidaciones/conceptos/${cid}/`, { method: "DELETE" }),
  getViajesPendientesLiquidar: (params: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/liquidaciones/viajes-pendientes/?${new URLSearchParams(params)}`),
  getLiquidacionPdfUrl: (id: number | string) =>
    `${getApiBase()}/api/liquidaciones/liquidaciones/${id}/pdf/`,
  getLiquidacionesExportExcelUrl: (params?: Record<string, string>) =>
    `${getApiBase()}/api/liquidaciones/liquidaciones/export-excel/${params ? "?" + new URLSearchParams(params) : ""}`,
  getOperadores: () => apiFetch<{ results: any[] }>("/api/carta-porte/operadores/?page_size=200"),
  getCatLugares: () => apiFetch<any>("/api/carta-porte/ubicaciones/?page_size=200"),

  // ───────────────── Nomina (CFDI 4.0 + Nomina 1.2) ─────────────────
  // Config PAC
  getConfigNomina: (empresa: number | string) =>
    apiFetch<{ results: any[] }>(`/api/nomina/config/?empresa=${empresa}`),
  upsertConfigNomina: (data: any) =>
    apiFetch<any>(data.id ? `/api/nomina/config/${data.id}/` : "/api/nomina/config/", {
      method: data.id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    }),

  // Periodos
  getPeriodosNomina: (params?: Record<string, string>) =>
    apiFetch<{ count: number; results: any[] }>(
      `/api/nomina/periodos/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  getPeriodoNomina: (id: number | string) =>
    apiFetch<any>(`/api/nomina/periodos/${id}/`),
  crearPeriodoNomina: (data: any) =>
    apiFetch<any>("/api/nomina/periodos/", { method: "POST", body: JSON.stringify(data) }),
  cargarEmpleadosPeriodo: (id: number | string) =>
    apiFetch<{ creados: number; total: number }>(`/api/nomina/periodos/${id}/cargar-empleados/`, { method: "POST" }),
  calcularPeriodo: (id: number | string) =>
    apiFetch<{ actualizados: number }>(`/api/nomina/periodos/${id}/calcular/`, { method: "POST" }),
  cerrarPeriodo: (id: number | string) =>
    apiFetch<any>(`/api/nomina/periodos/${id}/cerrar/`, { method: "POST" }),

  // Recibos
  getRecibosPeriodo: (periodo: number | string) =>
    apiFetch<{ count: number; results: any[] }>(`/api/nomina/recibos/?periodo=${periodo}&page_size=500`),
  getRecibo: (id: number | string) =>
    apiFetch<any>(`/api/nomina/recibos/${id}/`),
  updateRecibo: (id: number | string, data: any) =>
    apiFetch<any>(`/api/nomina/recibos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  recalcularRecibo: (id: number | string) =>
    apiFetch<any>(`/api/nomina/recibos/${id}/recalcular/`, { method: "POST" }),
  xmlPreviewRecibo: (id: number | string) =>
    `${getApiBase()}/api/nomina/recibos/${id}/xml-preview/`,

  // Conceptos
  crearConcepto: (data: any) =>
    apiFetch<any>("/api/nomina/conceptos/", { method: "POST", body: JSON.stringify(data) }),
  updateConcepto: (id: number | string, data: any) =>
    apiFetch<any>(`/api/nomina/conceptos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarConcepto: (id: number | string) =>
    apiFetch(`/api/nomina/conceptos/${id}/`, { method: "DELETE" }),

  // CFDI
  getCFDINomina: (params?: Record<string, string>) =>
    apiFetch<{ count: number; results: any[] }>(
      `/api/nomina/cfdi/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  timbrarCFDI: (id: number | string) =>
    apiFetch<any>(`/api/nomina/cfdi/${id}/timbrar/`, { method: "POST" }),
  cancelarCFDI: (id: number | string, motivo: string, folio_sustituye = "") =>
    apiFetch<any>(`/api/nomina/cfdi/${id}/cancelar/`, {
      method: "POST",
      body: JSON.stringify({ motivo, folio_sustituye }),
    }),
  urlXmlCFDI: (id: number | string) => `${getApiBase()}/api/nomina/cfdi/${id}/xml/`,
  getPdfUrlCFDI: (id: number | string) =>
    apiFetch<{ url: string }>(`/api/nomina/cfdi/${id}/pdf-url/`),

  // ── Chat interno ───────────────────────────────────────────────────────────
  chatConversaciones: () =>
    apiFetch<{ results: any[]; count: number }>("/api/chat/conversaciones/"),
  chatConversacion: (id: number | string) =>
    apiFetch<any>(`/api/chat/conversaciones/${id}/`),
  chatCrearDirect: (user_id: number) =>
    apiFetch<any>("/api/chat/conversaciones/direct/", {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),
  chatCrearGrupo: (titulo: string, user_ids: number[]) =>
    apiFetch<any>("/api/chat/conversaciones/grupo/", {
      method: "POST",
      body: JSON.stringify({ titulo, user_ids }),
    }),
  chatMensajes: (conv: number | string, params?: Record<string, string>) =>
    apiFetch<{ results: any[]; next: string | null; previous: string | null; count: number }>(
      `/api/chat/conversaciones/${conv}/mensajes/${params ? "?" + new URLSearchParams(params) : ""}`,
    ),
  chatEnviarMensaje: (conv: number | string, body: string, files: File[]) => {
    const fd = new FormData();
    fd.append("body", body);
    for (const f of files) fd.append("adjuntos", f);
    return apiFetch<any>(`/api/chat/conversaciones/${conv}/mensajes/`, {
      method: "POST",
      body: fd,
    });
  },
  chatMarcarLeido: (conv: number | string) =>
    apiFetch<{ ok: boolean }>(`/api/chat/conversaciones/${conv}/leer/`, { method: "POST" }),
  chatNoLeidos: () =>
    apiFetch<{ total: number; por_conversacion: Record<string, number> }>("/api/chat/no-leidos/"),
  chatBuscarUsuarios: (q: string) =>
    apiFetch<{ results: any[] }>(`/api/chat/usuarios/?q=${encodeURIComponent(q)}`),
  chatSalir: (conv: number | string) =>
    apiFetch<{ ok: boolean }>(`/api/chat/conversaciones/${conv}/salir/`, { method: "POST" }),
  chatAgregarMiembros: (conv: number | string, user_ids: number[]) =>
    apiFetch<any>(`/api/chat/conversaciones/${conv}/agregar/`, {
      method: "POST",
      body: JSON.stringify({ user_ids }),
    }),

  // ── Diagramas (flowcharts) ─────────────────────────────────────────────────
  getDiagramas: () =>
    apiFetch<{ results: any[]; count: number }>("/api/diagramas/diagramas/?page_size=200"),
  getDiagrama: (id: number | string) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/`),
  crearDiagrama: (data: object) =>
    apiFetch<any>("/api/diagramas/diagramas/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  actualizarDiagrama: (id: number | string, data: object) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  eliminarDiagrama: (id: number | string) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/`, { method: "DELETE" }),

  // Comparticiones del diagrama
  listarCompartidos: (id: number | string) =>
    apiFetch<any[]>(`/api/diagramas/diagramas/${id}/compartidos/`),
  compartirDiagrama: (id: number | string, body: { username?: string; user_id?: number; permiso: "ver" | "editar" }) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/compartidos/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  cambiarPermisoCompartido: (id: number | string, comp_id: number, permiso: "ver" | "editar") =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/compartidos/${comp_id}/`, {
      method: "PATCH",
      body: JSON.stringify({ permiso }),
    }),
  revocarCompartido: (id: number | string, comp_id: number) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/compartidos/${comp_id}/`, {
      method: "DELETE",
    }),

  // ── Aprobacion de diagramas ────────────────────────────────────────────────
  enviarDiagramaAprobacion: (id: number | string, aprobador_id: number, comentario = "") =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/enviar-aprobacion/`, {
      method: "POST",
      body: JSON.stringify({ aprobador_id, comentario }),
    }),
  aprobarDiagrama: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/aprobar/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  rechazarDiagrama: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/rechazar/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  vincularDiagramaModulo: (id: number | string, modulo_id: number | null) =>
    apiFetch<any>(`/api/diagramas/diagramas/${id}/vincular-modulo/`, {
      method: "POST",
      body: JSON.stringify({ modulo_id }),
    }),
  pendientesAprobacionDiagramas: () =>
    apiFetch<{ count: number; results: any[] }>("/api/diagramas/diagramas/pendientes-aprobacion/"),
  // Diagramas aprobados+vinculados que pertenecen al modulo de la ruta actual.
  diagramasPorModulo: (params: { ruta?: string; codigo?: string }) =>
    apiFetch<{ count: number; results: any[] }>(
      `/api/diagramas/diagramas/por-modulo/?${new URLSearchParams(params as Record<string, string>)}`,
    ),

  // ── Gestion Documental ────────────────────────────────────────────────────
  // Tipos de documento
  getTiposDocumento: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/documentos/tipos/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearTipoDocumento: (data: object) =>
    apiFetch<any>("/api/documentos/tipos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarTipoDocumento: (id: number | string, data: object) =>
    apiFetch<any>(`/api/documentos/tipos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarTipoDocumento: (id: number | string) =>
    apiFetch(`/api/documentos/tipos/${id}/`, { method: "DELETE" }),
  cargarTiposDocumentoSugeridos: (empresa: number) =>
    apiFetch<{ creados: number; total_sugeridos: number }>(
      "/api/documentos/tipos/cargar-sugeridos/",
      { method: "POST", body: JSON.stringify({ empresa }) },
    ),

  // Flujos de aprobacion
  getFlujosAprobacion: (params?: Record<string, string>) =>
    apiFetch<{ results: any[] }>(`/api/documentos/flujos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getFlujoAprobacion: (id: number | string) =>
    apiFetch<any>(`/api/documentos/flujos/${id}/`),
  crearFlujoAprobacion: (data: object) =>
    apiFetch<any>("/api/documentos/flujos/", { method: "POST", body: JSON.stringify(data) }),
  actualizarFlujoAprobacion: (id: number | string, data: object) =>
    apiFetch<any>(`/api/documentos/flujos/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  eliminarFlujoAprobacion: (id: number | string) =>
    apiFetch(`/api/documentos/flujos/${id}/`, { method: "DELETE" }),
  setPasosFlujo: (id: number | string, pasos: Array<{ aprobador: number; orden?: number; obligatorio?: boolean; descripcion?: string }>) =>
    apiFetch<any>(`/api/documentos/flujos/${id}/set-pasos/`, {
      method: "POST",
      body: JSON.stringify({ pasos }),
    }),

  // Documentos
  getDocumentos: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count: number }>(`/api/documentos/documentos/${params ? "?" + new URLSearchParams(params) : ""}`),
  getDocumento: (id: number | string) =>
    apiFetch<any>(`/api/documentos/documentos/${id}/`),
  crearDocumento: (data: FormData | object) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/documentos/documentos/", opts);
  },
  actualizarDocumento: (id: number | string, data: FormData | object) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "PATCH", body: data }
      : { method: "PATCH", body: JSON.stringify(data) };
    return apiFetch<any>(`/api/documentos/documentos/${id}/`, opts);
  },
  eliminarDocumento: (id: number | string) =>
    apiFetch(`/api/documentos/documentos/${id}/`, { method: "DELETE" }),
  enviarDocumentoAprobacion: (id: number | string, flujo_id?: number, comentario = "") =>
    apiFetch<any>(`/api/documentos/documentos/${id}/enviar-aprobacion/`, {
      method: "POST",
      body: JSON.stringify({ flujo_id, comentario }),
    }),
  aprobarPasoDocumento: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/documentos/documentos/${id}/aprobar-paso/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  rechazarPasoDocumento: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/documentos/documentos/${id}/rechazar-paso/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  marcarDocumentoObsoleto: (id: number | string) =>
    apiFetch<any>(`/api/documentos/documentos/${id}/marcar-obsoleto/`, { method: "POST" }),
  nuevaVersionDocumento: (id: number | string, data: FormData) =>
    apiFetch<any>(`/api/documentos/documentos/${id}/nueva-version/`, { method: "POST", body: data }),
  descargarDocumentoUrl: (id: number | string) =>
    `${getApiBase()}/api/documentos/documentos/${id}/descargar/`,
  documentosPendientesMios: () =>
    apiFetch<{ count: number; results: any[] }>("/api/documentos/documentos/pendientes-mias/"),

  // Accesos
  getAccesosDocumento: (id: number | string) =>
    apiFetch<any[]>(`/api/documentos/documentos/${id}/accesos/`),
  setAccesoDocumento: (id: number | string, data: { usuario: number; puede_ver?: boolean; puede_descargar?: boolean; puede_proponer_mejora?: boolean }) =>
    apiFetch<any>(`/api/documentos/documentos/${id}/accesos/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revocarAccesoDocumento: (id: number | string, acceso_id: number) =>
    apiFetch(`/api/documentos/documentos/${id}/accesos/${acceso_id}/`, { method: "DELETE" }),

  // Propuestas de mejora
  getPropuestasMejora: (params?: Record<string, string>) =>
    apiFetch<{ results: any[]; count: number }>(`/api/documentos/propuestas/${params ? "?" + new URLSearchParams(params) : ""}`),
  crearPropuestaMejora: (data: FormData | object) => {
    const opts: RequestInit = data instanceof FormData
      ? { method: "POST", body: data }
      : { method: "POST", body: JSON.stringify(data) };
    return apiFetch<any>("/api/documentos/propuestas/", opts);
  },
  aceptarPropuestaMejora: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/documentos/propuestas/${id}/aceptar/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  rechazarPropuestaMejora: (id: number | string, comentario = "") =>
    apiFetch<any>(`/api/documentos/propuestas/${id}/rechazar/`, {
      method: "POST",
      body: JSON.stringify({ comentario }),
    }),
  retirarPropuestaMejora: (id: number | string) =>
    apiFetch<any>(`/api/documentos/propuestas/${id}/retirar/`, { method: "POST" }),

  /** URL de WebSocket para chat. Convierte http→ws / https→wss y añade ?token=. */
  chatWebSocketUrl: () => {
    // Los WebSockets NO pasan por el proxy de Next (rewrites solo cubren HTTP),
    // asi que el chat se conecta directo al backend:8000. En localhost funciona;
    // en red local requiere que el 8000 sea accesible (si no, el chat degrada).
    const token = typeof window !== "undefined" ? window.localStorage.getItem("erp.jwt.access") : "";
    let base: string;
    if (ENV_API_URL) base = ENV_API_URL;
    else if (typeof window !== "undefined") base = `${window.location.protocol}//${window.location.hostname}:8000`;
    else base = "http://localhost:8000";
    const ws = base.replace(/^https/, "wss").replace(/^http/, "ws");
    return `${ws}/ws/chat/?token=${encodeURIComponent(token || "")}`;
  },
};

export default api;
