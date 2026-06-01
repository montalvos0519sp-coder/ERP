"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens } from "@/lib/api";

export interface EmpresaMembership {
  id: number;
  nombre: string;
  rfc: string;
  rol: string;
  es_staff: boolean;
  color_primario?: string;
  color_secundario?: string;
  logo_url?: string | null;
}

export interface PerfilUsuario {
  telefono: string;
  puesto: string;
  empresa_activa: number | null;
  tema: "dark" | "light";
  fuente: string;
  color_acento: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  perfil: PerfilUsuario | null;
  empresas: EmpresaMembership[];
}

interface MenuItemBackend {
  id: string; codigo: string; label: string; icono: string; color: string; href: string;
  requiere_staff?: boolean;
}
interface MenuSectionBackend {
  categoria: string; label: string; color: string; items: MenuItemBackend[];
}
export interface MenuBackend {
  empresa?: { id: number; nombre: string; rfc: string };
  es_staff_empresa: boolean;
  secciones: MenuSectionBackend[];
}

interface Ctx {
  user: User | null;
  loading: boolean;
  empresaActivaId: number | null;
  setEmpresaActiva: (id: number) => void;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  /** Codigos de modulos asignados al usuario (p.ej. "viajes"). null = sin restriccion (superuser/staff). */
  allowedMenuIds: Set<string> | null;
  menuBackend: MenuBackend | null;
}

const UserCtx = createContext<Ctx | null>(null);
const EMPRESA_KEY = "erp.empresa.activa";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaActivaId, setEmpresaActivaIdState] = useState<number | null>(null);
  const [menuBackend, setMenuBackend] = useState<MenuBackend | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.me();
      // me() puede devolver:
      //  - null (apiFetch silenciosa al recibir 401 sin token)
      //  - { authenticated: false } (sin sesion)
      //  - { authenticated: true, ...datos } (con sesion)
      if (!me || me.authenticated === false || !me.username) {
        setUser(null);
      } else {
        setUser(me);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(EMPRESA_KEY) : null;
        const fromStorage = stored ? Number(stored) : null;
        const fromPerfil = me?.perfil?.empresa_activa ?? null;
        const fromMembership = me?.empresas?.[0]?.id ?? null;
        const activa = fromStorage || fromPerfil || fromMembership;
        setEmpresaActivaIdState(activa);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!user) { setMenuBackend(null); return; }
    api.getMiMenu(empresaActivaId || undefined)
      .then((data) => setMenuBackend(data as MenuBackend))
      .catch(() => setMenuBackend({ es_staff_empresa: false, secciones: [] }));
  }, [user, empresaActivaId]);

  const setEmpresaActiva = useCallback((id: number) => {
    setEmpresaActivaIdState(id);
    try { window.localStorage.setItem(EMPRESA_KEY, String(id)); } catch { /* */ }
    api.updatePerfil({ empresa_activa: id }).catch(() => { /* */ });
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* */ }
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  const allowedMenuIds = useMemo<Set<string> | null>(() => {
    if (!user) return null;
    if (user.is_superuser) return null;
    if (menuBackend?.es_staff_empresa) return null;
    if (!menuBackend) return new Set();
    const ids = new Set<string>();
    for (const sec of menuBackend.secciones) {
      for (const item of sec.items) {
        ids.add(item.codigo);
      }
    }
    return ids;
  }, [user, menuBackend]);

  return (
    <UserCtx.Provider value={{
      user, loading, empresaActivaId, setEmpresaActiva, reload, logout,
      allowedMenuIds, menuBackend,
    }}>
      {children}
    </UserCtx.Provider>
  );
}

export function useUser(): Ctx {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser debe usarse dentro de UserProvider");
  return ctx;
}

export function useAllowedMenuIds() {
  return useUser().allowedMenuIds;
}
