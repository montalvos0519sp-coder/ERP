// Mapeo nombre -> icono lucide-react. Lo usa el sidebar para resolver los iconos
// que envia el backend en MAIN_MENU (campo Modulo.icono).
import {
  Activity, BarChart3, Banknote, Bell, Boxes, Building2, CalendarDays,
  CreditCard, Database, FileText, Fuel, LayoutDashboard, Lock, Package,
  ShoppingCart, Settings, Truck, UserCheck, Users, Wallet, Wrench,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Activity, BarChart3, Banknote, Bell, Boxes, Building2, CalendarDays,
  CreditCard, Database, FileText, Fuel, LayoutDashboard, Lock, Package,
  ShoppingCart, Settings, Truck, UserCheck, Users, Wallet, Wrench,
};

export function getIcon(name?: string | null): LucideIcon {
  if (!name) return LayoutDashboard;
  return ICONS[name] || LayoutDashboard;
}
