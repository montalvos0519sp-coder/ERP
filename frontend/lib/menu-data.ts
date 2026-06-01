// Estructura de menu del ERP - replica el patron de 3rrecycling.
//
// IMPORTANTE: el `id` de cada item DEBE coincidir con el `codigo` del Modulo
// en el backend (apps/modulos/seed.py). Asi el filtrado por permisos funciona
// automaticamente: el backend devuelve los codigos asignados al usuario y
// useAllowedMenuIds los filtra contra esta lista.
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Bell, Boxes,
  Building2, Calculator, CalendarDays, CreditCard, Database, FileText,
  FolderCog, FolderOpen, Fuel, LayoutDashboard, Lock, MessageCircle, Package,
  QrCode, Receipt, ScrollText, Settings, ShieldCheck, ShoppingCart, Truck, UserCheck,
  Users, Wallet, Warehouse, Workflow, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SubItem {
  id: string;
  label: string;
  href?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  pulse?: boolean;
  subItems?: SubItem[];
}

export interface MenuSection {
  section: string;
  color: string;
  items: MenuItem[];
}

export const MAIN_MENU: MenuSection[] = [
  {
    section: "CENTRO OPERATIVO",
    color: "#1A73E8",
    items: [
      { id: "dashboard", label: "Mando Central", icon: LayoutDashboard, href: "/" },
      { id: "chat", label: "Mensajes", icon: MessageCircle, href: "/chat" },
      { id: "mis-solicitudes", label: "Mis Solicitudes", icon: FileText, href: "/mis-solicitudes" },
    ],
  },
  {
    section: "LOGISTICA Y RECURSOS",
    color: "#F59E0B",
    items: [
      { id: "viajes", label: "Viajes & Carta Porte", icon: Truck, href: "/viajes" },
      { id: "mantenimiento", label: "Mantenimiento", icon: Wrench, href: "/mantenimiento" },
      { id: "almacen", label: "Almacen", icon: Warehouse, href: "/almacen", subItems: [
        { id: "almacen_productos", label: "Productos", href: "/almacen/productos" },
        { id: "almacen_almacenes", label: "Almacenes y Ubicaciones", href: "/almacen/almacenes" },
        { id: "almacen_movimientos", label: "Movimientos de Inventario", href: "/almacen/movimientos" },
        { id: "almacen_transferencias", label: "Transferencias", href: "/almacen/transferencias" },
        { id: "almacen_kardex", label: "Kardex", href: "/almacen/kardex" },
        { id: "almacen_existencias", label: "Existencias", href: "/almacen/existencias" },
        { id: "almacen_lotes", label: "Lotes y Series", href: "/almacen/lotes" },
        { id: "almacen_alertas", label: "Alertas de Inventario", href: "/almacen/alertas" },
        { id: "almacen_reportes", label: "Reportes de Almacen", href: "/almacen/reportes" },
        { id: "almacen_etiquetas", label: "Etiquetas (codigo/QR)", href: "/almacen/etiquetas" },
      ]},
      { id: "liquidaciones", label: "Liquidaciones Operador", icon: Wallet, href: "/liquidaciones" },
    ],
  },
  {
    section: "RECURSOS HUMANOS",
    color: "#10B981",
    items: [
      { id: "rh-dashboard", label: "Dashboard RH", icon: UserCheck, href: "/rh" },
      { id: "rh-empleados", label: "Empleados", icon: Users, href: "/rh/empleados" },
      { id: "rh-permisos", label: "Permisos", icon: FileText, href: "/rh/permisos" },
      { id: "rh-vacaciones", label: "Vacaciones", icon: CalendarDays, href: "/rh/vacaciones" },
      { id: "rh-prestamos", label: "Prestamos", icon: CreditCard, href: "/rh/prestamos" },
    ],
  },
  {
    section: "INTELIGENCIA Y FINANZAS",
    color: "#34A853",
    items: [
      { id: "facturacion", label: "Facturacion CFDI 4.0", icon: FileText, href: "/facturacion" },
      { id: "nomina", label: "Nomina (CFDI 4.0)", icon: Calculator, href: "/nomina", subItems: [
        { id: "nomina-dashboard", label: "Panel", href: "/nomina" },
        { id: "nomina-periodos", label: "Periodos", href: "/nomina/periodos" },
        { id: "nomina-cfdi", label: "CFDI emitidos", href: "/nomina/cfdi" },
        { id: "nomina-config", label: "Configuracion PAC", href: "/nomina/config" },
      ]},
      { id: "cxp", label: "Cuentas por Pagar", icon: Wallet, href: "/cxp" },
      { id: "ordenes-compra", label: "Ordenes de Compra", icon: ShoppingCart, href: "/ordenes-compra" },
    ],
  },
  {
    section: "ADMINISTRACION",
    color: "#8B5CF6",
    items: [
      { id: "admin-empresas", label: "Empresas", icon: Building2, href: "/admin/empresas" },
      { id: "admin-usuarios", label: "Usuarios", icon: Users, href: "/admin/usuarios" },
      { id: "admin-modulos", label: "Modulos", icon: Boxes, href: "/admin/modulos" },
      { id: "admin-permisos", label: "Permisos", icon: Lock, href: "/admin/permisos" },
      { id: "admin-catalogos-rh", label: "Catalogos RH (tipos solicitud)", icon: FileText, href: "/admin/catalogos-rh" },
      { id: "admin-documentos", label: "Documentos (tipos y flujos)", icon: FolderCog, href: "/admin/documentos" },
      { id: "admin-configuracion", label: "Configuracion (PAC, RFC, Logo)", icon: Settings, href: "/admin/configuracion" },
      { id: "admin-bitacora", label: "Bitacora", icon: Activity, href: "/admin/bitacora" },
    ],
  },
  {
    section: "CALIDAD (SGC)",
    color: "#0EA5E9",
    items: [
      { id: "sgc", label: "Sistema de Calidad (ISO)", icon: ShieldCheck, href: "/sgc" },
      { id: "sgc-diagnostico", label: "Diagnóstico ISO (Gap)", icon: ScrollText, href: "/sgc/diagnostico" },
      { id: "documentos", label: "Gestión Documental", icon: FolderOpen, href: "/documentos" },
      { id: "diagramas", label: "Diagramas de Flujo", icon: Workflow, href: "/diagramas" },
      { id: "sgc-riesgos", label: "Riesgos", icon: AlertTriangle, href: "/sgc/riesgos" },
      { id: "sgc-nc", label: "No conformidades (CAPA)", icon: AlertTriangle, href: "/sgc/no-conformidades" },
    ],
  },
  {
    section: "CATALOGOS",
    color: "#0EA5E9",
    items: [
      { id: "flota", label: "Flota de Unidades", icon: Truck, href: "/flota" },
      { id: "catalogos-proveedores", label: "Proveedores", icon: Truck, href: "/cxp/proveedores" },
      { id: "catalogos-clientes", label: "Clientes", icon: Users, href: "/facturacion/clientes" },
      { id: "catalogos-sat", label: "Catalogos SAT", icon: Database, href: "/catalogos/sat" },
    ],
  },
];

export function getActiveIdFromPath(pathname: string): string {
  return getModuleIdFromPath(pathname) ?? "dashboard";
}

/**
 * Devuelve el id de módulo que cubre la ruta o `null` si la ruta no pertenece
 * al menú (por ejemplo `/perfil`). A diferencia de `getActiveIdFromPath`, no
 * tiene fallback a "dashboard", para que el guard pueda distinguir "ruta libre"
 * de "dashboard sin permiso".
 */
export function getModuleIdFromPath(pathname: string): string | null {
  for (const section of MAIN_MENU) {
    for (const item of section.items) {
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (sub.href && sub.href === pathname) return sub.id;
        }
      }
      if (item.href && (item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href)))) {
        return item.id;
      }
    }
  }
  return null;
}

/**
 * Rutas que NUNCA se gatean por módulo (settings personales, perfil…).
 * `/admin/configuracion` se mantiene libre porque la pestaña "Apariencia" la
 * puede ver cualquier usuario; las pestañas admin ya se filtran dentro.
 */
export const RUTAS_LIBRES: ReadonlySet<string> = new Set([
  "/",
  "/perfil",
  "/chat",
  "/admin/configuracion",
]);
