import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Plus, X, Edit2, Trash2, RefreshCw,
  CheckCircle, ToggleLeft, ToggleRight, Percent, DollarSign, Calendar, Lock
} from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function isVigente(desc) {
  if (!desc.activo) return false;
  const now = new Date();
  if (desc.desde && new Date(desc.desde) > now) return false;
  if (desc.hasta && new Date(desc.hasta) < now) return false;
  return true;
}

function ModalDescuento({ descuento, onClose, onSaved }) {
  const isEdit = !!descuento;
  const [form, setForm] = useState({
    nombre: descuento?.nombre || '',
    tipo: descuento?.tipo || 'PERCENT',
    valor: descuento?.valor?.toString() || '',
    descripcion: descuento?.descripcion || '',
    requiereAuth: descuento?.requiereAuth ?? false,
    activo: descuento?.activo ?? true,
    desde: descuento?.desde ? new Date(descuento.desde).toISOString().split('T')[0] : '',
    hasta: descuento?.hasta ? new Date(descuento.hasta).toISOString().split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.valor) { setError('Nombre y valor son requeridos'); return; }
    setLoading(true);
    try {
      const body = {
        ...form,
        valor: parseFloat(form.valor),
        desde: form.desde || null,
        hasta: form.hasta || null,
      };
      const r = await fetch(isEdit ? `/api/descuentos/${descuento.id}` : '/api/descuentos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); } else setError(d.message || 'Error');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161A] border border-purple-500/20 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light text-white">{isEdit ? 'Editar' : 'Nuevo'} Descuento</h3>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Nombre del descuento</label>
            <input value={form.nombre} onChange={e => set('nombre')(e.target.value)} placeholder="Ej: Descuento Cliente Frecuente"
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-700" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Tipo de descuento</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => set('tipo')('PERCENT')}
                className={`py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${form.tipo === 'PERCENT' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/5 text-gray-400'}`}>
                <Percent className="w-4 h-4" /> Porcentaje (%)
              </button>
              <button type="button" onClick={() => set('tipo')('FIXED')}
                className={`py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${form.tipo === 'FIXED' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/5 text-gray-400'}`}>
                <DollarSign className="w-4 h-4" /> Monto Fijo ($)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">
              Valor {form.tipo === 'PERCENT' ? '(porcentaje, ej: 10 = 10%)' : '(monto fijo en $)'}
            </label>
            <input type="number" min="0" step="0.01" max={form.tipo === 'PERCENT' ? '100' : undefined}
              value={form.valor} onChange={e => set('valor')(e.target.value)} placeholder={form.tipo === 'PERCENT' ? '10' : '50.00'}
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-700" />
            {form.valor && (
              <p className="text-purple-400 text-xs mt-2 font-medium">
                {form.tipo === 'PERCENT' ? `Descuento del ${form.valor}%` : `Descuento de ${fmt(form.valor)}`}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Descripción (opcional)</label>
            <input value={form.descripcion} onChange={e => set('descripcion')(e.target.value)} placeholder="Para clientes frecuentes, lunes..."
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-700" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Válido desde</label>
              <input type="date" value={form.desde} onChange={e => set('desde')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Válido hasta</label>
              <input type="date" value={form.hasta} onChange={e => set('hasta')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#1E1E26] border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-300">Requiere PIN de administrador</span>
            </div>
            <button type="button" onClick={() => set('requiereAuth')(!form.requiereAuth)}
              className={`transition-colors ${form.requiereAuth ? 'text-amber-400' : 'text-gray-600'}`}>
              {form.requiereAuth ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>

          {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <CheckCircle className="w-5 h-5" />{loading ? 'Guardando...' : isEdit ? 'Actualizar Descuento' : 'Crear Descuento'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Descuentos() {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editDesc, setEditDesc]     = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/descuentos');
      const d = await r.json();
      if (d.success) setDescuentos(d.descuentos);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActivo = async (desc) => {
    await fetch(`/api/descuentos/${desc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !desc.activo })
    });
    load();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este descuento?')) return;
    await fetch(`/api/descuentos/${id}`, { method: 'DELETE' });
    load();
  };

  const activos  = descuentos.filter(d => isVigente(d));
  const inactivos = descuentos.filter(d => !isVigente(d));

  if (loading) return <div className="flex items-center justify-center min-h-full"><div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-purple-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">Descuentos y <span className="font-bold text-purple-400">Promociones</span></h2>
          <p className="text-gray-500 text-sm mt-1">Catálogo de descuentos disponibles en POS y Mesas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setEditDesc(null); setModal(true); }}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Plus className="w-4 h-4" /> Nuevo Descuento
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="bg-[#14141A] border border-purple-500/20 rounded-2xl p-5 text-center">
          <p className="text-2xl font-bold text-purple-400">{activos.length}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Activos</p>
        </div>
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-5 text-center">
          <p className="text-2xl font-bold text-white">{descuentos.length}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Total</p>
        </div>
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-5 text-center">
          <p className="text-2xl font-bold text-gray-400">{inactivos.length}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Inactivos</p>
        </div>
      </div>

      {descuentos.length === 0 ? (
        <div className="bg-[#14141A] border border-white/5 rounded-3xl p-16 text-center relative z-10">
          <Tag className="w-14 h-14 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-1">Sin descuentos configurados</p>
          <p className="text-gray-600 text-sm mb-6">Crea descuentos para aplicar en ventas desde el POS y las mesas</p>
          <button onClick={() => setModal(true)} className="bg-purple-500 hover:bg-purple-400 text-white px-6 py-3 rounded-2xl font-bold text-sm">Crear Primer Descuento</button>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          {[{ label: '✅ Descuentos Activos', list: activos }, { label: '⏸ Inactivos / Vencidos', list: inactivos }].map(group => (
            group.list.length > 0 && (
              <div key={group.label}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{group.label}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.list.map(desc => {
                    const vigente = isVigente(desc);
                    return (
                      <div key={desc.id} className={`bg-[#14141A] border rounded-3xl p-5 transition-all ${vigente ? 'border-purple-500/25' : 'border-white/5 opacity-60'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-white font-bold">{desc.nombre}</p>
                            {desc.descripcion && <p className="text-gray-500 text-xs mt-0.5">{desc.descripcion}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <button onClick={() => { setEditDesc(desc); setModal(true); }} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => eliminar(desc.id)} className="w-8 h-8 bg-white/5 hover:bg-rose-500/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-3 ${desc.tipo === 'PERCENT' ? 'bg-purple-500/10 text-purple-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          {desc.tipo === 'PERCENT' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                          <span className="text-xl font-bold">{desc.tipo === 'PERCENT' ? `${desc.valor}%` : fmt(desc.valor)}</span>
                          <span className="text-xs opacity-60">{desc.tipo === 'PERCENT' ? 'porcentaje' : 'fijo'}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {desc.requiereAuth && (
                            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Requiere PIN
                            </span>
                          )}
                          {desc.desde && <span className="text-xs text-gray-500">Desde: {fmtDate(desc.desde)}</span>}
                          {desc.hasta && <span className="text-xs text-gray-500">Hasta: {fmtDate(desc.hasta)}</span>}
                        </div>

                        <button onClick={() => toggleActivo(desc)}
                          className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${desc.activo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}>
                          {desc.activo ? <><ToggleRight className="w-4 h-4" /> Activo</> : <><ToggleLeft className="w-4 h-4" /> Inactivo</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {modal && <ModalDescuento descuento={editDesc} onClose={() => { setModal(false); setEditDesc(null); }} onSaved={load} />}
    </div>
  );
}
