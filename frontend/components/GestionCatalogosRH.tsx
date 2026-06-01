'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Briefcase, Search, RefreshCw, ChevronDown, ChevronUp,
  Database, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, X, Save, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

const d = (isDark: boolean, dk: string, lt: string) => isDark ? dk : lt;

type TabId = 'departamentos' | 'puestos';

interface TabDef {
  id: TabId; label: string; icon: React.ElementType; color: string;
  columns: { key: string; label: string }[];
  emptyForm: Record<string, any>;
  fields: { key: string; label: string; type?: 'number' | 'textarea' }[];
  loader: () => Promise<any>;
  creator: (data: Record<string, any>) => Promise<any>;
  updater: (pk: number, data: Record<string, any>) => Promise<any>;
  deleter: (pk: number) => Promise<any>;
  rowLabel: (r: any) => string;
}

const TABS: TabDef[] = [
  {
    id: 'departamentos', label: 'Departamentos', icon: Building2, color: '#14b8a6',
    columns: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }, { key: 'total_empleados', label: 'Empleados' }],
    emptyForm: { nombre: '', descripcion: '' },
    fields: [
      { key: 'nombre', label: 'Nombre *' },
      { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    ],
    loader:  () => api.getRHDepartamentos().then((r: any) => Array.isArray(r) ? r : r.results ?? []),
    creator: (data) => api.crearDepartamento(data),
    updater: (pk, data) => api.actualizarDepartamento(pk, data),
    deleter: (pk) => api.eliminarDepartamento(pk),
    rowLabel: (r) => r.nombre,
  },
  {
    id: 'puestos', label: 'Puestos', icon: Briefcase, color: '#8b5cf6',
    columns: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }, { key: 'salario_base', label: 'Salario Base' }],
    emptyForm: { nombre: '', descripcion: '', salario_base: '' },
    fields: [
      { key: 'nombre', label: 'Nombre *' },
      { key: 'descripcion', label: 'Descripción', type: 'textarea' },
      { key: 'salario_base', label: 'Salario Base', type: 'number' },
    ],
    loader:  () => api.getRHPuestos().then((r: any) => Array.isArray(r) ? r : r.results ?? []),
    creator: (data) => api.crearPuesto(data),
    updater: (pk, data) => api.actualizarPuesto(pk, data),
    deleter: (pk) => api.eliminarPuesto(pk),
    rowLabel: (r) => r.nombre,
  },
];

// ─── CRUD MODAL ───────────────────────────────────────────────────────────────
function CrudModal({ tab, row, onClose, onSaved, isDark }: {
  tab: TabDef; row?: Record<string, any> | null; onClose: () => void;
  onSaved: (row: any) => void; isDark: boolean;
}) {
  const isEdit = !!row;
  const [form, setForm] = useState<Record<string, any>>(isEdit ? { ...row } : { ...tab.emptyForm });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const result = isEdit ? await tab.updater(row!.id, form) : await tab.creator(form);
      onSaved(result);
    } catch (ex: any) { setErr(ex.message || 'Error desconocido'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
      <div className={`rounded-3xl w-full max-w-lg border shadow-2xl ${d(isDark, 'bg-[#0F172A] border-white/10', 'bg-white border-slate-200')}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: tab.color + '30' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: tab.color + '20' }}>
              {React.createElement(tab.icon, { className: 'w-4 h-4', style: { color: tab.color } })}
            </div>
            <h3 className={`font-black text-base ${d(isDark, 'text-white', 'text-slate-800')}`}>
              {isEdit ? 'Editar' : 'Nuevo'} {tab.label.replace(/s$/, '')}
            </h3>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${d(isDark, 'hover:bg-white/10 text-slate-400', 'hover:bg-slate-100 text-slate-500')}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {err && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}
          {tab.fields.map(f => (
            <div key={f.key}>
              <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea rows={3} value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all resize-none ${d(isDark, 'bg-white/5 border-white/10 text-slate-200 focus:border-white/30', 'bg-white border-slate-200 text-slate-800 focus:border-slate-400')}`} />
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} step={f.type === 'number' ? '0.01' : undefined}
                  value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all ${d(isDark, 'bg-white/5 border-white/10 text-slate-200 focus:border-white/30', 'bg-white border-slate-200 text-slate-800 focus:border-slate-400')}`} />
              )}
            </div>
          ))}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${d(isDark, 'bg-white/5 hover:bg-white/10 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: tab.color }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────
function DeleteModal({ label, onConfirm, onClose, isDark }: { label: string; onConfirm: () => void; onClose: () => void; isDark: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
      <div className={`rounded-3xl w-full max-w-sm border shadow-2xl p-8 flex flex-col items-center text-center gap-4 ${d(isDark, 'bg-[#0F172A] border-white/10', 'bg-white border-slate-200')}`}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className={`font-black text-lg mb-1 ${d(isDark, 'text-white', 'text-slate-800')}`}>¿Eliminar?</h3>
          <p className={`text-sm ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>
            Se eliminará <strong className={d(isDark, 'text-white', 'text-slate-700')}>{label}</strong>. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${d(isDark, 'bg-white/5 hover:bg-white/10 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
            Cancelar
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm(); }} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function GestionCatalogosRH() {
  const { isDarkMode: isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('departamentos');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [crudRow, setCrudRow] = useState<Record<string, any> | null | undefined>(undefined);
  const [deleteRow, setDeleteRow] = useState<Record<string, any> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const tab = TABS.find(t => t.id === activeTab)!;

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await tab.loader()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { setSearch(''); setSortKey('id'); setSortAsc(true); loadData(); }, [activeTab]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = (saved: any) => {
    setCrudRow(undefined);
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
    showToast('Guardado correctamente', 'ok');
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await tab.deleter(deleteRow.id);
      setRows(prev => prev.filter(r => r.id !== deleteRow.id));
      setDeleteRow(null);
      showToast('Eliminado correctamente', 'ok');
    } catch (e: any) {
      setDeleteRow(null);
      showToast(e.message || 'Error al eliminar', 'err');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const f = q ? rows.filter(r => tab.columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(q))) : rows;
    return [...f].sort((a, b) => {
      const av = String(a[sortKey] ?? ''); const bv = String(b[sortKey] ?? '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, search, sortKey, sortAsc, tab]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-6 gap-5 ${d(isDark, 'text-slate-100', 'text-slate-800')}`}>

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${d(isDark, 'text-white', 'text-slate-900')}`}>Catálogos RH</h1>
          <p className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>Departamentos y Puestos</p>
        </div>
        <button onClick={() => setCrudRow(null)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-lg"
          style={{ backgroundColor: tab.color }}>
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const Icon = t.icon; const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={isActive ? { borderColor: t.color, color: t.color } : {}}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${isActive
                ? d(isDark, 'bg-white/10', 'bg-white shadow-sm')
                : d(isDark, 'border-white/10 text-slate-400 hover:bg-white/5', 'border-slate-200 text-slate-500 hover:bg-slate-50')}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${d(isDark, 'bg-white/10', 'bg-slate-100')}`}>
                {activeTab === t.id ? rows.length : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* panel */}
      <div className={`flex-1 rounded-3xl border overflow-hidden flex flex-col ${d(isDark, 'bg-white/[0.03] border-white/10', 'bg-white border-slate-200 shadow-sm')}`}>
        {/* toolbar */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${d(isDark, 'border-white/10', 'border-slate-100')}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: tab.color + '20' }}>
            {React.createElement(tab.icon, { className: 'w-3.5 h-3.5', style: { color: tab.color } })}
          </div>
          <span className={`font-black text-sm ${d(isDark, 'text-white', 'text-slate-800')}`}>{tab.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${d(isDark, 'bg-white/10 text-slate-300', 'bg-slate-100 text-slate-500')}`}>{filtered.length}</span>
          <div className={`flex items-center gap-2 flex-1 max-w-xs ml-auto px-3 py-2 rounded-xl border text-sm ${d(isDark, 'bg-white/5 border-white/10', 'bg-white border-slate-200')}`}>
            <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <input className={`flex-1 bg-transparent text-sm outline-none ${d(isDark, 'text-slate-200 placeholder:text-slate-500', 'text-slate-700 placeholder:text-slate-400')}`}
              placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
          </div>
          <button onClick={loadData} className={`p-2 rounded-xl transition-colors ${d(isDark, 'hover:bg-white/10 text-slate-400', 'hover:bg-slate-100 text-slate-400')}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: tab.color + '40', borderTopColor: tab.color }} />
            <p className={`text-xs font-bold uppercase tracking-widest ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>Cargando...</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={d(isDark, 'bg-white/5', 'bg-slate-50')}>
                  {tab.columns.map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider cursor-pointer select-none hover:opacity-70 ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                          : <ChevronDown className="w-3 h-3 opacity-20" />}
                      </span>
                    </th>
                  ))}
                  <th className={`px-4 py-3 text-xs font-black uppercase tracking-wider text-right ${d(isDark, 'text-slate-400', 'text-slate-500')}`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={tab.columns.length + 1} className={`text-center py-16 ${d(isDark, 'text-slate-500', 'text-slate-400')}`}>
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sin registros</p>
                  </td></tr>
                ) : filtered.map((row, i) => (
                  <tr key={row.id ?? i} className={`border-t transition-colors ${d(isDark, 'border-white/5 hover:bg-white/5', 'border-slate-100 hover:bg-slate-50')}`}>
                    {tab.columns.map(col => (
                      <td key={col.key} className={`px-4 py-3 ${d(isDark, 'text-slate-300', 'text-slate-700')}`}>
                        {col.key === 'id'
                          ? <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${d(isDark, 'bg-white/10 text-slate-400', 'bg-slate-100 text-slate-500')}`}>{row[col.key]}</span>
                          : col.key === 'salario_base'
                            ? row[col.key] ? `$${Number(row[col.key]).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
                            : col.key === 'total_empleados'
                              ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d(isDark, 'bg-teal-500/10 text-teal-400', 'bg-teal-50 text-teal-600')}`}>{row[col.key] ?? 0}</span>
                              : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setCrudRow(row)}
                          className={`p-1.5 rounded-lg transition-colors ${d(isDark, 'hover:bg-white/10 text-slate-400 hover:text-blue-400', 'hover:bg-blue-50 text-slate-400 hover:text-blue-600')}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteRow(row)}
                          className={`p-1.5 rounded-lg transition-colors ${d(isDark, 'hover:bg-white/10 text-slate-400 hover:text-red-400', 'hover:bg-red-50 text-slate-400 hover:text-red-600')}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {crudRow !== undefined && (
        <CrudModal tab={tab} row={crudRow} onClose={() => setCrudRow(undefined)} onSaved={handleSaved} isDark={isDark} />
      )}
      {deleteRow && (
        <DeleteModal label={tab.rowLabel(deleteRow)} onConfirm={handleDelete} onClose={() => setDeleteRow(null)} isDark={isDark} />
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[2000] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
