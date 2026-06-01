"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Building2, ChevronDown, ChevronRight, Clock, Command, FileText, Globe, Lock,
  LogOut, Moon, Pin, PinOff, Search, Settings, ShieldCheck, Sun, UserCircle, X,
} from "lucide-react";

import FluidBackground from "@/components/FluidBackground";
import ModuloDiagramasBanner from "@/components/ModuloDiagramasBanner";
import NotificacionesBell from "@/components/NotificacionesBell";
import ChatBell from "@/components/ChatBell";
import Tooltip from "@/components/ui/Tooltip";
import Badge from "@/components/ui/Badge";
import { useTheme } from "@/lib/ThemeContext";
import { useUserPrefs } from "@/lib/UserPrefsContext";
import { useKeyPress } from "@/lib/hooks";
import { MAIN_MENU, RUTAS_LIBRES, getActiveIdFromPath, getModuleIdFromPath, type MenuSection } from "@/lib/menu-data";
import { useAllowedMenuIds, useUser } from "@/lib/UserContext";

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, theme, toggleTheme } = useTheme();
  const { prefs } = useUserPrefs();
  const { user, loading, empresaActivaId, setEmpresaActiva, logout } = useUser();

  // Logo de la empresa (lo puede subir el staff desde /admin/configuracion).
  const empresaActiva = user?.empresas.find((e) => e.id === empresaActivaId) || user?.empresas[0];

  const headerOnAccent = !isDarkMode || !prefs.darkOverridesAccent;

  const headerTextPrimary = headerOnAccent ? "text-white" : theme.textHeaderPrimary;
  const headerTextSecondary = headerOnAccent ? "text-white/90" : theme.textHeaderSecondary;
  const headerButton = headerOnAccent
    ? "bg-white/15 border-white/20 hover:bg-white/25 text-white shadow-sm hover:shadow-md"
    : theme.headerButton;
  const headerInput = headerOnAccent
    ? "bg-white/10 border-white/20 text-white focus:border-white/50 focus:bg-white/20 placeholder:text-white/70"
    : theme.inputHeader;

  const activeTab = getActiveIdFromPath(pathname);
  const allowedIds = useAllowedMenuIds();
  const filteredMenu: MenuSection[] = allowedIds === null
    ? MAIN_MENU
    : MAIN_MENU.map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          if (allowedIds.has(item.id)) return true;
          if (item.subItems?.some((s) => allowedIds.has(s.id))) return true;
          return false;
        }).map((item) => ({
          ...item,
          subItems: item.subItems?.filter((s) => allowedIds.has(s.id)),
        })),
      })).filter((sec) => sec.items.length > 0);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [pinnedTabs, setPinnedTabs] = useState<{ id: string; label: string; href: string }[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEmpresaPicker, setShowEmpresaPicker] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem("erp-sidebar-collapsed");
      const em = localStorage.getItem("erp-expanded-menus");
      const pt = localStorage.getItem("erp-pinned-tabs");
      if (c !== null) setCollapsed(c === "true");
      if (em) setExpandedMenus(JSON.parse(em));
      if (pt) setPinnedTabs(JSON.parse(pt));
    } catch { /* */ }
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Redirige a login solo cuando termino de cargar y NO hay usuario.
  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined" && !pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  const pinTab = useCallback((id: string, label: string, href: string) => {
    setPinnedTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      const next = [...prev, { id, label, href }];
      try { localStorage.setItem("erp-pinned-tabs", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const unpinTab = useCallback((id: string) => {
    setPinnedTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try { localStorage.setItem("erp-pinned-tabs", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const toggleSubmenu = useCallback((menuId: string) => {
    if (collapsed) {
      setCollapsed(false);
      try { localStorage.setItem("erp-sidebar-collapsed", "false"); } catch { /* */ }
    }
    setExpandedMenus((prev) => {
      const next = prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId];
      try { localStorage.setItem("erp-expanded-menus", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, [collapsed]);

  const navigate = useCallback((_id: string, href?: string, parentId?: string) => {
    if (href) router.push(href);
    setMobileOpen(false);
    if (parentId && !expandedMenus.includes(parentId)) toggleSubmenu(parentId);
  }, [router, expandedMenus, toggleSubmenu]);

  const handleMenuToggle = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setCollapsed((p) => {
        const next = !p;
        try { localStorage.setItem("erp-sidebar-collapsed", String(next)); } catch { /* */ }
        return next;
      });
    } else {
      setMobileOpen((p) => !p);
    }
  }, []);

  const getActivePath = useCallback(() => {
    for (const section of MAIN_MENU) {
      for (const item of section.items) {
        if (item.id === activeTab) return [item.label];
        if (item.subItems) {
          const sub = item.subItems.find((s) => s.id === activeTab);
          if (sub) return [item.label, sub.label];
        }
      }
    }
    return [activeTab];
  }, [activeTab]);

  const activePath = getActivePath();

  // Ctrl/Cmd+K → toggle command palette (stub: solo enfoca busqueda por ahora).
  useKeyPress("k", "ctrlKey");
  useKeyPress("k", "metaKey");

  const SIDEBAR_W = 268;
  const SIDEBAR_COL = 68;

  if (loading) {
    // Loader con colores neutros via CSS variables — sin hydration mismatch.
    return (
      <div
        suppressHydrationWarning
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: isDarkMode ? "#020617" : "#F0F4F8" }}
      >
        <div suppressHydrationWarning className="text-slate-400 text-sm animate-pulse">
          Cargando ERP...
        </div>
      </div>
    );
  }

  if (!user) {
    // Mientras se redirige a /login, no renderizamos shell.
    return null;
  }

  return (
    <div className={`h-screen ${theme.bgBase} flex flex-col overflow-hidden selection:bg-[#1A73E8]/30 relative`}>
      <FluidBackground isDark={isDarkMode} />

      {/* Mobile backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${mobileOpen ? "bg-black/55 backdrop-blur-sm" : "pointer-events-none opacity-0"}`}
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Desktop sidebar */}
        <aside
          style={{ width: collapsed ? SIDEBAR_COL : SIDEBAR_W, minWidth: collapsed ? SIDEBAR_COL : SIDEBAR_W }}
          className={`hidden lg:flex flex-col shrink-0 border-r z-40 transition-[width,min-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isDarkMode ? "bg-[#080C18] border-white/[0.05]" : "bg-white border-slate-200 shadow-[4px_0_32px_rgba(0,0,0,0.06)]"
          }`}
        >
          <SidebarInner
            collapsed={collapsed}
            mobileClose={null}
            menu={filteredMenu}
            empresaNombre={empresaActiva?.nombre || "ERP Profesional"}
            empresaLogo={empresaActiva?.logo_url || null}
            {...{ isDarkMode, activeTab, expandedMenus, pinnedTabs, pinTab, unpinTab, toggleSubmenu, navigate }}
          />
        </aside>

        {/* Mobile drawer */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${isDarkMode ? "bg-[#080C18] border-white/[0.05]" : "bg-white border-slate-200 shadow-[8px_0_40px_rgba(0,0,0,0.12)]"}`}
          style={{ width: SIDEBAR_W }}
        >
          <SidebarInner
            collapsed={false}
            mobileClose={() => setMobileOpen(false)}
            menu={filteredMenu}
            empresaNombre={empresaActiva?.nombre || "ERP Profesional"}
            empresaLogo={empresaActiva?.logo_url || null}
            {...{ isDarkMode, activeTab, expandedMenus, pinnedTabs, pinTab, unpinTab, toggleSubmenu, navigate }}
          />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className={`h-16 px-4 md:px-6 flex items-center justify-between shrink-0 z-[200] border-b transition-colors duration-700 ${theme.glassHeader}`}
            style={{ background: "var(--user-header-bg)" }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleMenuToggle}
                className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group ${headerButton}`}
                title={collapsed ? "Expandir menu" : "Colapsar menu"}
              >
                <div className="relative w-5 h-5 flex flex-col justify-center gap-[5px]">
                  <span className={`block h-0.5 bg-current rounded-full transition-all duration-400 origin-left ${collapsed ? "w-4" : "w-5"}`} />
                  <span className={`block h-0.5 bg-current rounded-full transition-all duration-400 ${collapsed ? "w-3 opacity-60" : "w-5"}`} />
                  <span className={`block h-0.5 bg-current rounded-full transition-all duration-400 origin-left ${collapsed ? "w-4" : "w-5"}`} />
                </div>
              </button>

              {/* Breadcrumb */}
              <div>
                <div className="flex items-center gap-2">
                  {activePath.map((p, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ChevronRight size={12} className={`${headerTextSecondary} opacity-70`} />}
                      <span className={`text-[13px] md:text-[17px] font-black tracking-tight uppercase truncate max-w-[120px] sm:max-w-[220px] md:max-w-[360px] transition-colors duration-500 ${i === activePath.length - 1 ? headerTextPrimary : headerTextSecondary}`}>
                        {p}
                      </span>
                    </React.Fragment>
                  ))}
                  <span className="hidden md:inline-flex px-2 py-0.5 bg-white/20 text-white text-[7px] font-black rounded-md uppercase tracking-[0.2em] border border-white/20">
                    SECURE
                  </span>
                </div>
                <div className={`hidden sm:flex items-center gap-1.5 text-[8.5px] font-bold mt-0.5 uppercase tracking-widest ${headerTextSecondary}`}>
                  <Globe size={8} className="animate-[spin_14s_linear_infinite] opacity-70" />
                  <span className="truncate max-w-[180px] md:max-w-[280px]">
                    {empresaActiva?.nombre || "ERP-PROFESIONAL"} · {empresaActiva?.rfc || "MULTI-EMPRESA"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector multi-empresa */}
              {(user.empresas?.length || 0) > 1 && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEmpresaPicker((s) => !s); setShowUserMenu(false); }}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border ${headerButton}`}
                  >
                    <Building2 size={13} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{empresaActiva?.nombre}</span>
                    <ChevronDown size={10} className={`transition-transform duration-300 ${showEmpresaPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showEmpresaPicker && (
                    <div className={`absolute top-full right-0 mt-3 w-64 rounded-2xl shadow-2xl border overflow-hidden animate-[var(--animate-slide-down)] origin-top-right z-[300] ${theme.surfaceElevated}`}>
                      {user.empresas.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => { setEmpresaActiva(emp.id); setShowEmpresaPicker(false); }}
                          className={`w-full text-left px-4 py-3 ${theme.accentHover} ${emp.id === empresaActivaId ? (isDarkMode ? "bg-emerald-500/10" : "bg-blue-500/5") : ""}`}
                        >
                          <div className={`text-sm font-bold ${theme.textPrimary}`}>{emp.nombre}</div>
                          <div className={`text-[10px] ${theme.textTertiary}`}>{emp.rfc} · {emp.rol}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ChatBell headerButton={headerButton} />
              <NotificacionesBell headerButton={headerButton} />

              <button
                onClick={toggleTheme}
                className={`w-10 h-10 flex items-center justify-center border rounded-xl relative overflow-hidden group transition-all duration-500 hover:scale-105 active:scale-95 ${headerButton}`}
              >
                {isDarkMode
                  ? <Sun size={16} className="text-amber-300 group-hover:rotate-90 transition-transform duration-500" />
                  : <Moon size={16} className="text-white group-hover:-rotate-12 transition-transform duration-500" />}
              </button>

              {/* User button */}
              {(() => {
                const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username;
                const initials = ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || user.username.slice(0, 2).toUpperCase();
                const shortName = `${user.first_name?.[0] ? user.first_name[0] + ". " : ""}${user.last_name || user.username}`;
                const role = user.is_superuser ? "Super Admin" : user.is_staff ? "Administrador" : "Usuario";
                return (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowUserMenu((s) => !s); setShowEmpresaPicker(false); }}
                      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${headerButton} ${showUserMenu ? "bg-white/25 border-white/50" : ""}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-black text-[11px]" style={{ color: isDarkMode ? "#14B8A6" : "#1A73E8" }}>
                        {initials}
                      </div>
                      <div className="hidden md:flex flex-col items-start leading-none">
                        <span className={`text-[10px] font-black uppercase tracking-wide ${headerTextPrimary}`}>{shortName}</span>
                        <span className={`text-[8px] font-semibold tracking-widest mt-0.5 ${headerTextSecondary}`}>{role}</span>
                      </div>
                      <ChevronDown size={10} className={`hidden md:block text-white/60 transition-transform duration-300 ${showUserMenu ? "rotate-180" : ""}`} />
                    </button>

                    {showUserMenu && (
                      <div className={`absolute top-full right-0 mt-3 w-56 rounded-2xl shadow-2xl border overflow-hidden animate-[var(--animate-slide-down)] origin-top-right z-[300] ${theme.surfaceElevated}`}>
                        <div className={`p-4 border-b ${theme.divider} relative overflow-hidden`}>
                          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"
                            style={{ background: isDarkMode ? "rgba(20,184,166,0.2)" : "rgba(26,115,232,0.1)" }} />
                          <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-1 z-10 relative ${theme.textSecondary}`}>SESION ACTIVA</p>
                          <p className={`text-sm font-black truncate z-10 relative ${theme.textPrimary}`}>{fullName}</p>
                          <p className={`text-[10px] truncate z-10 relative mt-0.5 ${theme.textSecondary}`}>{user.email || ""}</p>
                          {empresaActiva && (
                            <p className={`text-[10px] font-bold truncate z-10 relative mt-0.5 ${theme.textSecondary}`}>{empresaActiva.nombre}</p>
                          )}
                        </div>
                        <div className="p-2.5 space-y-0.5">
                          <button onClick={() => { setShowUserMenu(false); router.push("/perfil"); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-colors ${theme.textPrimary} ${theme.accentHover}`}>
                            <UserCircle size={14} className={theme.accentPrimary} /> Mi Perfil
                          </button>
                          <button onClick={() => { setShowUserMenu(false); router.push("/mis-solicitudes"); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-colors ${theme.textPrimary} ${theme.accentHover}`}>
                            <FileText size={14} className="text-indigo-500" /> Mis Solicitudes
                          </button>
                          <button onClick={() => { setShowUserMenu(false); router.push("/admin/configuracion"); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-colors ${theme.textPrimary} ${theme.accentHover}`}>
                            <Settings size={14} className={theme.textSecondary} /> Configuracion
                          </button>
                        </div>
                        <div className={`p-2.5 border-t ${theme.divider}`}>
                          <button onClick={logout}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors">
                            <LogOut size={14} /> Cerrar Sesion
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {/* Pinned tabs */}
            {pinnedTabs.length > 0 && (
              <div className={`flex items-center gap-1.5 px-4 py-2 border-b shrink-0 overflow-x-auto backdrop-blur-xl ${isDarkMode ? "bg-[#080C18]/70 border-white/[0.05]" : "bg-white/80 border-slate-200/80"}`}>
                {pinnedTabs.map((tab, idx) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => router.push(tab.href)}
                      className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 shrink-0 group overflow-hidden ${
                        isActive
                          ? "text-white shadow-lg shadow-blue-500/25"
                          : isDarkMode
                            ? "text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                            : "text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm"
                      }`}
                      style={{
                        animationDelay: `${idx * 40}ms`,
                        ...(isActive ? { background: "linear-gradient(135deg,#1A73E8,#34A853)", backgroundSize: "200% 100%" } : {}),
                      }}
                    >
                      <span className="relative z-10">{tab.label}</span>
                      <span
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); unpinTab(tab.id); }}
                        className="relative z-10 opacity-50 group-hover:opacity-100 hover:text-rose-400 transition-all rounded"
                      >
                        <X size={9} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ModuleAccessGuard
                pathname={pathname}
                allowedIds={allowedIds}
                isDark={isDarkMode}
              >
                <ModuloDiagramasBanner pathname={pathname} />
                {children}
              </ModuleAccessGuard>
            </div>

            <footer className={`h-10 px-5 flex items-center justify-between shrink-0 border-t z-20 text-[9px] font-black uppercase tracking-widest backdrop-blur-xl ${isDarkMode ? "bg-[#030712]/60 border-white/[0.04] text-slate-600" : "bg-white/60 border-slate-200/60 text-slate-400"}`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-[#10B981]" : "bg-[#34A853]"} shadow-[0_0_6px_currentColor] animate-pulse`} />
                  <span className={theme.textPrimary}>CORE OPS ONLINE</span>
                </span>
                <span className="opacity-20 hidden sm:inline">|</span>
                <span className="hidden sm:inline">v1.0-STABLE</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5"><ShieldCheck size={10} className={theme.accentPrimary} /><span className="hidden sm:inline">AES-512</span></span>
                <span className="opacity-20 hidden sm:inline">|</span>
                <span className="flex items-center gap-1.5"><Clock size={10} className={theme.textSecondary} />{new Date().toLocaleDateString("es-MX")}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
interface SidebarInnerProps {
  collapsed: boolean;
  mobileClose: (() => void) | null;
  isDarkMode: boolean;
  activeTab: string;
  menu: MenuSection[];
  empresaNombre: string;
  empresaId?: number;
  expandedMenus: string[];
  pinnedTabs: { id: string; label: string; href: string }[];
  pinTab: (id: string, label: string, href: string) => void;
  unpinTab: (id: string) => void;
  toggleSubmenu: (id: string) => void;
  navigate: (id: string, href?: string, parentId?: string) => void;
}

function SidebarInner({
  collapsed, mobileClose, isDarkMode, activeTab, menu, empresaNombre, empresaId,
  expandedMenus, pinnedTabs, pinTab, unpinTab, toggleSubmenu, navigate,
}: SidebarInnerProps) {
  const dk = isDarkMode;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""; // "" => mismo origen (proxy de Next)
  const logoUrl = empresaId ? `${apiBase}/api/core/empresas/${empresaId}/logo/?ts=${Date.now()}` : null;
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <>
      {/* Brand */}
      <div
        className={`flex items-center h-16 px-3 shrink-0 border-b cursor-pointer group relative overflow-hidden transition-all duration-300 ${collapsed ? "justify-center" : "gap-3"} ${dk ? "border-white/[0.05]" : "border-slate-100"}`}
        onClick={() => navigate("dashboard", "/")}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: "linear-gradient(120deg,rgba(26,115,232,0.08),rgba(52,168,83,0.06))" }} />

        <div className={`relative shrink-0 flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:rotate-6 w-10 h-10`}
          style={{ boxShadow: "0 4px 16px rgba(26,115,232,0.3)" }}>
          {logoUrl && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={empresaNombre} className="object-cover w-full h-full" onError={() => setLogoFailed(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #1A73E8 0%, #34A853 100%)" }}>
              {empresaNombre.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-400 ${collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100"}`}>
          <p className={`font-black text-[14px] tracking-tight leading-none ${dk ? "text-white" : "text-slate-900"}`}>{empresaNombre}</p>
          <p className="text-[8.5px] font-semibold mt-0.5 tracking-wide" style={{ color: dk ? "rgba(52,168,83,0.6)" : "rgba(26,115,232,0.55)" }}>
            ERP Profesional
          </p>
        </div>

        {mobileClose && (
          <button
            onClick={(e) => { e.stopPropagation(); mobileClose(); }}
            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ml-auto ${dk ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2">
        {menu.map((section, sIdx) => {
          const sc = section.color;
          return (
            <div key={sIdx} className={sIdx > 0 ? "mt-4" : ""}>
              {!collapsed ? (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <span
                    className="w-[3px] h-3 rounded-full shrink-0 animate-[var(--animate-dot-glow)]"
                    style={{ background: sc, boxShadow: `0 0 6px ${sc}80` }}
                  />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] truncate leading-none"
                    style={{ color: dk ? sc + "70" : sc + "bb" }}>
                    {section.section}
                  </span>
                </div>
              ) : sIdx > 0 && (
                <div className="mx-3 mb-3 h-px" style={{ background: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)" }} />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isExpanded = expandedMenus.includes(item.id);
                  const isActive = activeTab === item.id || item.subItems?.some((s) => s.id === activeTab);
                  const isLeaf = isActive && !item.subItems;
                  const isParentHit = isActive && !!item.subItems;
                  const ItemIcon = item.icon;

                  return (
                    <div key={item.id}>
                      <Tooltip content={collapsed ? item.label : ""} position="right">
                        <button
                          onClick={() => item.subItems ? toggleSubmenu(item.id) : navigate(item.id, item.href)}
                          className={`w-full flex items-center rounded-xl transition-all duration-200 group select-none
                            ${collapsed ? "justify-center p-2.5" : "justify-between px-2.5 py-2"}
                            ${isLeaf
                              ? "text-white"
                              : isParentHit
                                ? dk ? "text-slate-100" : "text-slate-800"
                                : dk
                                  ? "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                            }
                          `}
                          style={
                            isLeaf
                              ? {
                                  background: `linear-gradient(135deg,${sc}f0,${sc}99)`,
                                  backgroundSize: "200% 100%",
                                  boxShadow: `0 4px 14px ${sc}35`,
                                  animation: "nav-shimmer 4s ease infinite",
                                }
                              : isParentHit
                                ? { background: dk ? sc + "14" : sc + "0e" }
                                : undefined
                          }
                        >
                          <div
                            className={`flex items-center justify-center rounded-xl shrink-0 transition-all duration-200 nav-icon-box ${collapsed ? "w-10 h-10" : "w-8 h-8"}`}
                            style={{ background: isLeaf ? "rgba(255,255,255,0.22)" : dk ? sc + "1c" : sc + "14" }}
                          >
                            <ItemIcon size={collapsed ? 17 : 15} style={{ color: isLeaf ? "#fff" : sc }} />
                          </div>

                          {!collapsed && (
                            <span className="flex-1 text-left text-[12.5px] font-semibold whitespace-nowrap overflow-hidden mx-2.5 leading-snug">
                              {item.label}
                            </span>
                          )}

                          {!collapsed && (
                            <div className="flex items-center gap-1 shrink-0">
                              {item.href && (
                                <span
                                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pinnedTabs.some((t) => t.id === item.id) ? unpinTab(item.id) : pinTab(item.id, item.label, item.href!); }}
                                  className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/15 ${pinnedTabs.some((t) => t.id === item.id) ? "!opacity-100 text-blue-300" : ""}`}
                                >
                                  {pinnedTabs.some((t) => t.id === item.id) ? <PinOff size={10} /> : <Pin size={10} />}
                                </span>
                              )}
                              {item.badge && <Badge text={item.badge} type={item.badge === "Alerta" ? "alert" : "neural"} pulse={item.pulse} />}
                              {item.subItems && (
                                <div className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                                  style={{ background: isExpanded ? dk ? sc + "30" : sc + "18" : dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
                                  <ChevronDown size={11} strokeWidth={2.5}
                                    className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                    style={{ color: isExpanded ? sc : dk ? "#64748b" : "#94a3b8" }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      </Tooltip>

                      {item.subItems && (
                        <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isExpanded && !collapsed ? "grid-rows-[1fr] opacity-100 my-1" : "grid-rows-[0fr] opacity-0"
                        }`}>
                          <div className="overflow-hidden">
                            <div className="ml-5 pl-3.5 pb-0.5 space-y-0.5" style={{ borderLeft: `2px solid ${sc}28` }}>
                              {item.subItems.map((sub) => {
                                const isSub = activeTab === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => navigate(sub.id, sub.href, item.id)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-200 group min-h-[36px] ${
                                      isSub
                                        ? dk ? "text-white" : "text-slate-900"
                                        : dk ? "text-slate-500 hover:text-slate-100 hover:bg-white/[0.05]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    }`}
                                    style={isSub ? { background: dk ? sc + "18" : sc + "0d" } : undefined}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="shrink-0 rounded-full transition-all duration-300"
                                        style={{
                                          width: isSub ? 7 : 5, height: isSub ? 7 : 5,
                                          background: isSub ? sc : dk ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
                                          boxShadow: isSub ? `0 0 8px ${sc}90` : "none",
                                          transform: isSub ? "scale(1)" : "scale(0.9)",
                                        }} />
                                      <span className="text-[12px] font-medium whitespace-nowrap leading-snug"
                                        style={{ color: isSub ? (dk ? "#fff" : sc) : undefined }}>
                                        {sub.label}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard que bloquea el acceso por URL a módulos no asignados.
// Se monta en lugar de `children` cuando la ruta corresponde a un módulo que
// el usuario no tiene en su lista de permisos. Superusers/staff pasan siempre
// (allowedIds === null).
// ─────────────────────────────────────────────────────────────────────────────
function ModuleAccessGuard({
  pathname, allowedIds, isDark, children,
}: {
  pathname: string;
  allowedIds: Set<string> | null;
  isDark: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  if (allowedIds === null) return <>{children}</>;
  if (RUTAS_LIBRES.has(pathname)) return <>{children}</>;
  const moduleId = getModuleIdFromPath(pathname);
  if (moduleId === null) return <>{children}</>;
  if (allowedIds.has(moduleId)) return <>{children}</>;

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className={`relative max-w-md w-full overflow-hidden rounded-3xl border p-8 text-center ${
        isDark
          ? "bg-[#0F172A]/80 border-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
          : "bg-white/95 border-slate-200/70 shadow-[0_30px_80px_rgba(15,23,42,0.10)]"
      }`}>
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 h-48 blur-3xl opacity-50 pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(244,63,94,0.35), transparent)" }}
        />
        <div className="relative">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg,#f43f5e,#ef4444)" }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className={`text-xl font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            Sin acceso a este módulo
          </h2>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No tienes permiso para entrar a{" "}
            <code className={`px-1.5 py-0.5 rounded-md text-[12px] font-mono ${
              isDark ? "bg-white/[0.06] text-slate-200" : "bg-slate-100 text-slate-700"
            }`}>{moduleId}</code>. Solicita la asignación al administrador.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => router.replace("/")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#1A73E8,#14B8A6)" }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
