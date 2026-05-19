import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Users, Plus, Pencil, Trash2, ShieldCheck, X, Check,
  Eye, EyeOff, AlertCircle, UserCog, Lock, ChevronDown
} from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ALL_ROLES = ['ADMIN', 'CAJERO', 'MESERO', 'COCINA', 'PANADERO', 'INVENTARIO'];

const ALL_MODULES = [
  { key: 'dashboard',     label: 'Dashboard',        desc: 'Resumen y estadísticas' },
  { key: 'mesas',         label: 'Mesas',             desc: 'Gestión de mesas y pedidos' },
  { key: 'pos',           label: 'Mostrador Rápido',  desc: 'Punto de venta rápido' },
  { key: 'cocina',        label: 'Cocina (KDS)',       desc: 'Pantalla de cocina' },
  { key: 'pedidos',       label: 'Pedidos Especiales', desc: 'Encargos y anticipos' },
  { key: 'productos',     label: 'Menú / Productos',  desc: 'Catálogo de productos' },
  { key: 'inventario',    label: 'Inventario',         desc: 'Insumos y movimientos' },
  { key: 'panaderia',      label: 'Panadería',          desc: 'Producción y lotes' },
  { key: 'historial',     label: 'Historial / Clientes', desc: 'Ventas y base de clientes' },
  { key: 'caja',          label: 'Caja y Turnos',      desc: 'Cierres, Turnos y Caja Chica' },
  { key: 'reportes',       label: 'Reportes',           desc: 'Estadísticas y auditoría' },
  { key: 'configuracion',  label: 'Configuración',      desc: 'Ajustes del sistema' },
  { key: 'usuarios',       label: 'Usuarios',           desc: 'Gestión de accesos' },
];

const ROLE_COLORS = {
  ADMIN:      'text-amber-400  bg-amber-500/10  border-amber-500/30',
  CAJERO:     'text-blue-400   bg-blue-500/10   border-blue-500/30',
  MESERO:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  COCINA:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  PANADERO:   'text-purple-400 bg-purple-500/10 border-purple-500/30',
  INVENTARIO: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/30',
};

const ROLE_ICONS = {
  ADMIN: '👑', CAJERO: '💰', MESERO: '🍽️', COCINA: '👨‍🍳', PANADERO: '🥖', INVENTARIO: '📦',
};

// ─── Toast simple ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-medium transition-all ${
      type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-300' : 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300'
    }`}>
      {type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── Modal de Usuario ─────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    role: user?.role || 'MESERO',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim()) { setError('El nombre de usuario es requerido'); return; }
    if (!isEdit && !form.password.trim()) { setError('La contraseña es requerida'); return; }

    setLoading(true);
    try {
      const body = { username: form.username, role: form.role };
      if (form.password) body.password = form.password;

      const res = await fetch(isEdit ? `/api/users/${user.id}` : '/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      onSaved(data.user, isEdit ? 'update' : 'create');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1E1E26] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <UserCog className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <p className="text-gray-500 text-xs">{isEdit ? `Modificando a ${user.username}` : 'Crear cuenta de acceso'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="text-xs uppercase tracking-widest text-gray-400 font-bold block mb-2">Usuario</label>
            <input
              id="modal-username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="nombre de usuario"
              className="w-full bg-[#2A2A32] border border-[#3A3A45] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:bg-[#2E2E38] transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs uppercase tracking-widest text-gray-400 font-bold block mb-2">
              Contraseña {isEdit && <span className="text-gray-500 normal-case tracking-normal font-normal">(vacío = no cambiar)</span>}
            </label>
            <div className="relative">
              <input
                id="modal-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={isEdit ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
                className="w-full bg-[#2A2A32] border border-[#3A3A45] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:bg-[#2E2E38] transition-all"
              />
              <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-400 transition-colors p-1">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="text-xs uppercase tracking-widest text-gray-500 font-bold block mb-2">Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all text-xs font-semibold ${
                    form.role === r
                      ? `${ROLE_COLORS[r]} border-current shadow-lg scale-105`
                      : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-400'
                  }`}
                >
                  <span className="text-lg">{ROLE_ICONS[r]}</span>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="modal-submit-btn"
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Estilos por rol ────────────────────────────────────────────────────────
const ROLE_TEXT = {
  CAJERO:     'text-blue-400',
  MESERO:     'text-emerald-400',
  COCINA:     'text-orange-400',
  PANADERO:   'text-purple-400',
  INVENTARIO: 'text-cyan-400',
};
const ROLE_BG = {
  CAJERO:     'bg-blue-500/5',
  MESERO:     'bg-emerald-500/5',
  COCINA:     'bg-orange-500/5',
  PANADERO:   'bg-purple-500/5',
  INVENTARIO: 'bg-cyan-500/5',
};
const ROLE_BORDERS = {
  CAJERO:     'border-blue-500/20',
  MESERO:     'border-emerald-500/20',
  COCINA:     'border-orange-500/20',
  PANADERO:   'border-purple-500/20',
  INVENTARIO: 'border-cyan-500/20',
};
const ROLE_BTN = {
  CAJERO:     'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30',
  MESERO:     'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30',
  COCINA:     'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30',
  PANADERO:   'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30',
  INVENTARIO: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30',
};

// ─── Acordeón de Permisos por Rol ────────────────────────────────────────────
function RoleAccordion({ role, modules, onChange, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const hasAll = ALL_MODULES.every(m => modules.includes(m.key));
  const activeCount = modules.length;

  const toggleAll = (e) => {
    e.stopPropagation();
    onChange(role, hasAll ? [] : ALL_MODULES.map(m => m.key));
  };

  const toggle = (key) => {
    const has = modules.includes(key);
    onChange(role, has ? modules.filter(k => k !== key) : [...modules, key]);
  };

  // Color sólido del checkbox según rol
  const checkboxActive = {
    CAJERO:     'bg-blue-500 border-blue-500',
    MESERO:     'bg-emerald-500 border-emerald-500',
    COCINA:     'bg-orange-500 border-orange-500',
    PANADERO:   'bg-purple-500 border-purple-500',
    INVENTARIO: 'bg-cyan-500 border-cyan-500',
  }[role];

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? ROLE_BORDERS[role] : 'border-white/5'}`}>
      {/* ── Cabecera clickeable ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${
          open ? `${ROLE_BG[role]}` : 'bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        {/* Emoji + nombre */}
        <span className="text-xl flex-shrink-0">{ROLE_ICONS[role]}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm uppercase tracking-widest ${ROLE_TEXT[role]}`}>{role}</p>
          <p className="text-gray-500 text-xs">{activeCount} de {ALL_MODULES.length} módulos activos</p>
        </div>

        {/* Badges de módulos activos (resumen compacto) */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap max-w-[280px]">
          {modules.slice(0, 4).map(m => {
            const mod = ALL_MODULES.find(x => x.key === m);
            return mod ? (
              <span key={m} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BG[role]} ${ROLE_TEXT[role]} border ${ROLE_BORDERS[role]}`}>
                {mod.label}
              </span>
            ) : null;
          })}
          {modules.length > 4 && (
            <span className="text-[10px] text-gray-500">+{modules.length - 4}</span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 flex-shrink-0 ${ROLE_TEXT[role]} transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Panel desplegable ── */}
      {open && (
        <div className={`border-t border-white/5 ${ROLE_BG[role]}`}>
          {/* Acción masiva */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <p className="text-xs text-gray-500">Selecciona los módulos a los que puede acceder</p>
            <button
              type="button"
              onClick={toggleAll}
              className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-all ${
                hasAll
                  ? `${ROLE_TEXT[role]} border-current/40 bg-white/5 hover:bg-white/10`
                  : 'text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20'
              }`}
            >
              {hasAll ? '✗ Quitar todo' : '✓ Dar todo'}
            </button>
          </div>

          {/* Lista de módulos */}
          <div className="px-4 pb-3 space-y-1">
            {ALL_MODULES.map(mod => {
              const checked = modules.includes(mod.key);
              return (
                <label
                  key={mod.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer select-none group transition-all ${
                    checked
                      ? `bg-white/5 border ${ROLE_BORDERS[role]}`
                      : 'border border-transparent hover:bg-black/20 hover:border-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    checked ? checkboxActive : 'border-white/25 bg-[#1A1A22] group-hover:border-white/40'
                  }`}>
                    {checked && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    id={`perm-${role}-${mod.key}`}
                    checked={checked}
                    onChange={() => toggle(mod.key)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                      {mod.label}
                    </p>
                    <p className="text-xs text-gray-600">{mod.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Botón guardar */}
          <div className="px-4 pb-4">
            <button
              id={`save-perm-${role}`}
              onClick={() => onSave(role)}
              disabled={saving === role}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${ROLE_BTN[role]}`}
            >
              {saving === role ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Check className="w-4 h-4" /> Guardar permisos de {role}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Matriz de Permisos ───────────────────────────────────────────────────────
function PermissionsMatrix() {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchPermissions(); }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles/permissions');
      const data = await res.json();
      if (data.success) setPermissions(data.permissions);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (role, newModules) => {
    setPermissions(prev => ({ ...prev, [role]: newModules }));
  };

  const saveRole = async (role) => {
    setSaving(role);
    try {
      const res = await fetch('/api/roles/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, modules: permissions[role] || [] }),
      });
      const data = await res.json();
      setToast({ msg: data.success ? `✅ Permisos de ${role} guardados` : data.message, type: data.success ? 'ok' : 'error' });
    } catch {
      setToast({ msg: 'Error de red', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const EDITABLE_ROLES = ALL_ROLES.filter(r => r !== 'ADMIN');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Nota ADMIN */}
      <div className="mb-6 flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-4">
        <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <p className="text-amber-300/80 text-sm">
          El rol <strong>ADMIN</strong> tiene acceso completo y no puede modificarse.
          Marca los módulos en cada tarjeta y pulsa <strong>Guardar permisos</strong> para aplicar.
        </p>
      </div>

      {/* Acordeón por rol */}
      <div className="space-y-2">
        {EDITABLE_ROLES.map(role => (
          <RoleAccordion
            key={role}
            role={role}
            modules={permissions[role] || []}
            onChange={handleChange}
            onSave={saveRole}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function UsersPage() {
  const [tab, setTab] = useState('users'); // 'users' | 'permisos'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | user-object
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user-object
  const [toast, setToast] = useState(null);

  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (user, action) => {
    if (action === 'create') setUsers(prev => [...prev, user]);
    else setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    setModal(null);
    setToast({ msg: action === 'create' ? `Usuario "${user.username}" creado` : 'Usuario actualizado', type: 'ok' });
  };

  const handleDelete = async (user) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setToast({ msg: `Usuario "${user.username}" eliminado`, type: 'ok' });
      } else {
        setToast({ msg: data.message, type: 'error' });
      }
    } catch {
      setToast({ msg: 'Error de red', type: 'error' });
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="p-8 relative min-h-full">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-1/3 h-80 bg-purple-600/5 blur-[100px] pointer-events-none" />

      {/* Portal: Toast */}
      {toast && ReactDOM.createPortal(
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />,
        document.body
      )}

      {/* Portal: Modal de usuario */}
      {modal !== null && ReactDOM.createPortal(
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />,
        document.body
      )}

      {/* Portal: Confirmar eliminación */}
      {deleteConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1E1E26] border border-white/15 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">¿Eliminar usuario?</h3>
            <p className="text-gray-400 text-sm mb-6">Se eliminará permanentemente la cuenta de <strong className="text-white">{deleteConfirm.username}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all font-medium">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} id="confirm-delete-btn" className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold transition-all">Eliminar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white mb-1">Usuarios & Permisos</h2>
          <p className="text-gray-500 text-sm">Gestiona el acceso al sistema de panadería</p>
        </div>
        {tab === 'users' && (
          <button
            id="new-user-btn"
            onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-3 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]"
          >
            <Plus className="w-5 h-5" /> Nuevo Usuario
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 w-fit relative z-10">
        <button
          id="tab-users"
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'users' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Usuarios
        </button>
        <button
          id="tab-permisos"
          onClick={() => setTab('permisos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'permisos' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Matriz de Permisos
        </button>
      </div>

      {/* TAB: Usuarios */}
      {tab === 'users' && (
        <div className="relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {users.map(u => (
                <div key={u.id} id={`user-card-${u.id}`} className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-white/[0.02] rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${ROLE_COLORS[u.role]}`}>
                        {ROLE_ICONS[u.role] || '👤'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">{u.username}</p>
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role]}`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs mb-5">
                    Creado el {new Date(u.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="flex gap-2">
                    <button
                      id={`edit-user-${u.id}`}
                      onClick={() => setModal(u)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all text-sm font-medium"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      id={`delete-user-${u.id}`}
                      onClick={() => setDeleteConfirm(u)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/30 text-red-400/60 hover:text-red-400 transition-all text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Permisos */}
      {tab === 'permisos' && (
        <div className="relative z-10">
          <PermissionsMatrix />
        </div>
      )}
    </div>
  );
}
