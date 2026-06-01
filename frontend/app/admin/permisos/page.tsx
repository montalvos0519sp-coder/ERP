"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check, CheckCircle, ChevronDown, Lock, Save, Search, Shield, ShieldCheck,
  Sparkles, Users, X,
} from "lucide-react";

import { Combobox } from "@/components/ui";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import { useUser } from "@/lib/UserContext";
import { getIcon } from "@/lib/icons";

interface Modulo {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  color: string;
  icono: string;
  es_core: boolean;
  requiere_staff: boolean;
}

interface UsuarioListItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

const CATEGORIA_LABELS: Record<string, string> = {
  OPERATIVO: "Centro Operativo",
  LOGISTICA: "Logistica y Recursos",
  RH: "Recursos Humanos",
  FINANZAS: "Finanzas",
  ADMIN: "Administracion",
  CATALOGOS: "Catalogos",
  HERRAMIENTAS: "Herramientas",
};

const CATEGORIA_COLORS: Record<string, string> = {
  OPERATIVO: "#1A73E8",
  LOGISTICA: "#F59E0B",
  RH: "#10B981",
  FINANZAS: "#34A853",
  ADMIN: "#8B5CF6",
  CATALOGOS: "#0EA5E9",
  HERRAMIENTAS: "#EC4899",
};

export default function AdminPermisosPage() {
  const { isDarkMode: isDark, theme } = useTheme();
  const { empresaActivaId } = useUser();

  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [usuarioSel, setUsuarioSel] = useState<number | null>(null);
  const [asignados, setAsignados] = useState<Set<number>>(new Set());
  const [originalAsignados, setOriginalAsignados] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api.getUsuarios().then((r) => setUsuarios(r.results || [])).catch(() => {});
    api.getModulos().then((r) => setModulos(r.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuarioSel || !empresaActivaId) {
      setAsignados(new Set());
      setOriginalAsignados(new Set());
      return;
    }
    api.getAsignaciones({
      user: String(usuarioSel),
      empresa: String(empresaActivaId),
      activo: "true",
      page_size: "200",
    } as any)
      .then((r: any) => {
        const s = new Set<number>(r.results.map((a: any) => a.modulo));
        setAsignados(s);
        setOriginalAsignados(new Set(s));
      })
      .catch(() => {});
  }, [usuarioSel, empresaActivaId]);

  const toggle = (moduloId: number) => {
    const next = new Set(asignados);
    if (next.has(moduloId)) next.delete(moduloId);
    else next.add(moduloId);
    setAsignados(next);
  };

  const toggleCategoria = (cat: string, allSelected: boolean) => {
    const mods = modulos.filter((m) => m.categoria === cat);
    const next = new Set(asignados);
    mods.forEach((m) => {
      if (allSelected) next.delete(m.id);
      else next.add(m.id);
    });
    setAsignados(next);
  };

  const seleccionarTodos = () => setAsignados(new Set(modulos.map((m) => m.id)));
  const limpiarTodos = () => setAsignados(new Set());

  const guardar = async () => {
    if (!usuarioSel || !empresaActivaId) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.setAsignaciones(usuarioSel, empresaActivaId, [...asignados]);
      setOriginalAsignados(new Set(asignados));
      setMsg({ type: "ok", text: "Asignaciones guardadas correctamente." });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const hayCambios = useMemo(() => {
    if (asignados.size !== originalAsignados.size) return true;
    for (const id of asignados) if (!originalAsignados.has(id)) return true;
    return false;
  }, [asignados, originalAsignados]);

  const usuarioObj = usuarios.find((u) => u.id === usuarioSel);

  // Filtrado por busqueda
  const modulosFiltrados = useMemo(() => {
    if (!search) return modulos;
    const q = search.toLowerCase();
    return modulos.filter((m) =>
      m.codigo.toLowerCase().includes(q) ||
      m.nombre.toLowerCase().includes(q) ||
      m.categoria.toLowerCase().includes(q),
    );
  }, [modulos, search]);

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const map: Record<string, Modulo[]> = {};
    modulosFiltrados.forEach((m) => {
      (map[m.categoria] = map[m.categoria] || []).push(m);
    });
    return map;
  }, [modulosFiltrados]);

  const totalSeleccionados = asignados.size;
  const totalModulos = modulos.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HERO */}
      <div className="relative rounded-3xl border overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.10),rgba(20,184,166,0.08))"
            : "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.05))",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: 200 + i * 50, height: 200 + i * 50,
                left: `${10 + i * 20}%`, top: `${-30 + (i % 2) * 30}%`,
                background: ["#8B5CF6", "#6366F1", "#14B8A6", "#EC4899"][i],
                animationDelay: `${i * 0.5}s`, filter: "blur(50px)",
              }}
            />
          ))}
        </div>
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.2em] text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>SEGURIDAD</span>
              </div>
              <h1 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>Permisos de Usuario</h1>
              <p className={`text-sm ${theme.textSecondary}`}>
                Decide que modulos puede ver y operar cada usuario en el sistema.
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="grid grid-cols-3 gap-2">
            <KPI label="Usuarios" value={usuarios.length} color="#8B5CF6" />
            <KPI label="Modulos" value={totalModulos} color="#6366F1" />
            <KPI label="Asignados" value={totalSeleccionados} color="#10B981" />
          </div>
        </div>
      </div>

      {/* Selector de usuario */}
      <div className={`rounded-3xl border p-6`}
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-black text-base uppercase tracking-tight ${theme.textPrimary}`}>Paso 1 · Selecciona el usuario</h3>
            <p className={`text-xs ${theme.textSecondary}`}>Escribe el nombre o username para encontrarlo rapido.</p>
          </div>
        </div>
        <Combobox
          value={usuarioObj ? `${usuarioObj.first_name} ${usuarioObj.last_name} (@${usuarioObj.username})`.trim() : ""}
          onChange={(_v, opt) => setUsuarioSel(opt?.raw?.id || null)}
          search={async (q) => {
            const matches = !q ? usuarios : usuarios.filter((u) =>
              u.username.toLowerCase().includes(q.toLowerCase()) ||
              `${u.first_name} ${u.last_name}`.toLowerCase().includes(q.toLowerCase()),
            );
            return matches.slice(0, 30).map((u) => ({
              id: u.id,
              label: `${u.first_name} ${u.last_name}`.trim() || u.username,
              description: `@${u.username}${u.is_superuser ? " · Super Admin" : u.is_staff ? " · Staff" : ""}`,
              raw: u,
            }));
          }}
          placeholder="Buscar usuario por nombre, apellido o username..."
          showAllOnOpen
          minChars={0}
        />

        {usuarioObj && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl border"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)" }}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
              {(usuarioObj.first_name?.[0] || usuarioObj.username[0]).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${theme.textPrimary}`}>
                {usuarioObj.first_name} {usuarioObj.last_name}
              </p>
              <p className={`text-[11px] ${theme.textTertiary}`}>
                @{usuarioObj.username}{usuarioObj.is_superuser && " · Super Admin (acceso total)"}
              </p>
            </div>
            <div className={`text-right`}>
              <p className="text-2xl font-black" style={{ color: "#8B5CF6" }}>{totalSeleccionados}<span className={`text-sm ${theme.textTertiary}`}>/{totalModulos}</span></p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>modulos</p>
            </div>
          </div>
        )}
      </div>

      {usuarioSel && (
        <>
          {/* Barra de acciones rapidas */}
          <div className={`rounded-3xl border p-4 flex flex-wrap items-center gap-3`}
            style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.divider}`}
              style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)" }}>
              <Search className="w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar modulos..."
                className="bg-transparent outline-none text-sm w-48" />
            </div>
            <div className="flex-1" />
            <button onClick={seleccionarTodos}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${theme.surfaceElevated}`}>
              <Check className="w-3.5 h-3.5" /> Seleccionar todos
            </button>
            <button onClick={limpiarTodos}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all ${theme.divider}`}>
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>

          {/* Mensaje */}
          {msg && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${
              msg.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}>
              <CheckCircle className="w-4 h-4" />
              {msg.text}
            </div>
          )}

          {/* Grid por categoria */}
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-black text-base uppercase tracking-tight ${theme.textPrimary}`}>Paso 2 · Elige los modulos</h3>
                <p className={`text-xs ${theme.textSecondary}`}>Activa el switch de cada modulo que el usuario podra ver y operar.</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, mods]) => {
                const allSelected = mods.every((m) => asignados.has(m.id));
                const someSelected = mods.some((m) => asignados.has(m.id));
                const catColor = CATEGORIA_COLORS[cat] || "#94A3B8";
                return (
                  <div key={cat} className="rounded-3xl border overflow-hidden"
                    style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                    {/* Header categoria */}
                    <div className="flex items-center justify-between gap-3 p-4 border-b"
                      style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", background: catColor + "08" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: catColor + "22", color: catColor }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: catColor, boxShadow: `0 0 8px ${catColor}` }} />
                        </div>
                        <div>
                          <p className={`font-black text-xs uppercase tracking-[0.2em]`} style={{ color: catColor }}>
                            {CATEGORIA_LABELS[cat] || cat}
                          </p>
                          <p className={`text-[10px] ${theme.textTertiary}`}>
                            {mods.filter((m) => asignados.has(m.id)).length} / {mods.length} modulos asignados
                          </p>
                        </div>
                      </div>
                      <button onClick={() => toggleCategoria(cat, allSelected)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                        style={{ background: allSelected ? catColor + "20" : "transparent", color: catColor, border: `1px solid ${catColor}40` }}>
                        {allSelected ? "Quitar todos" : someSelected ? "Marcar todos" : "Marcar categoria"}
                      </button>
                    </div>

                    {/* Modulos de la categoria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                      {mods.map((m) => {
                        const Icon = getIcon(m.icono);
                        const sel = asignados.has(m.id);
                        const cambio = sel !== originalAsignados.has(m.id);
                        return (
                          <button key={m.id} onClick={() => toggle(m.id)}
                            className="text-left p-3 rounded-xl border transition-all hover:scale-[1.02] flex items-center gap-3"
                            style={{
                              background: sel
                                ? catColor + "15"
                                : isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)",
                              borderColor: sel ? catColor : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                              boxShadow: sel ? `0 4px 12px ${catColor}20` : "none",
                            }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: sel ? catColor : catColor + "22", color: sel ? "#fff" : catColor }}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-sm font-bold truncate ${theme.textPrimary}`}>{m.nombre}</p>
                                {cambio && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Cambio sin guardar" />}
                              </div>
                              <p className={`text-[10px] truncate ${theme.textTertiary}`}>
                                {m.codigo}{m.es_core && " · core"}{m.requiere_staff && " · staff"}
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all`}
                              style={{
                                background: sel ? catColor : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                              }}>
                              {sel && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer sticky con boton guardar */}
          <div className={`sticky bottom-4 z-30 rounded-3xl border p-4 flex items-center gap-3 backdrop-blur-xl`}
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              background: isDark ? "rgba(8,12,24,0.92)" : "rgba(255,255,255,0.92)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            }}>
            <div className="flex items-center gap-2">
              {hayCambios ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className={`text-xs font-bold ${theme.textPrimary}`}>Tienes cambios sin guardar</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className={`text-xs font-bold ${theme.textSecondary}`}>Todo sincronizado</span>
                </>
              )}
            </div>
            <div className="flex-1" />
            <span className={`text-xs ${theme.textTertiary}`}>
              {totalSeleccionados} modulo{totalSeleccionados !== 1 && "s"} seleccionado{totalSeleccionados !== 1 && "s"}
            </span>
            <button onClick={guardar} disabled={saving || !hayCambios}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg flex items-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar asignaciones"}
            </button>
          </div>
        </>
      )}

      {!usuarioSel && (
        <div className={`rounded-3xl border p-12 text-center ${theme.divider}`}
          style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)" }}>
          <Lock className={`w-12 h-12 mx-auto mb-3 ${theme.textTertiary}`} />
          <p className={`text-sm font-bold ${theme.textPrimary}`}>Selecciona un usuario para continuar</p>
          <p className={`text-xs mt-1 ${theme.textTertiary}`}>Una vez elijas a alguien, podras activar/desactivar los modulos que vera en su menu.</p>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  const { isDarkMode: isDark, theme } = useTheme();
  return (
    <div className="w-24 h-20 rounded-2xl border flex flex-col items-center justify-center"
      style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", borderColor: color + "30" }}>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className={`text-[9px] font-bold uppercase tracking-wider ${theme.textTertiary}`}>{label}</p>
    </div>
  );
}
