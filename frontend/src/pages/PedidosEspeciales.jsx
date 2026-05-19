import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle, Clock, Truck, Package, ChevronDown, Phone, User, FileText, Calendar, DollarSign, Edit2, AlertTriangle } from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const isUrgent = (d) => {
  const diff = new Date(d) - new Date();
  return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000; // dentro de 2 días
};
const isPast = (d) => new Date(d) < new Date();

const STATUS = {
  PENDIENTE:   { label: 'Pendiente',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: Clock },
  EN_PROCESO:  { label: 'En proceso',   cls: 'bg-blue-500/15  text-blue-400  border-blue-500/30',     icon: Package },
  LISTO:       { label: 'Listo ✓',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  ENTREGADO:   { label: 'Entregado',    cls: 'bg-gray-500/15  text-gray-400  border-gray-500/30',     icon: Truck },
  CANCELADO:   { label: 'Cancelado',    cls: 'bg-rose-500/15  text-rose-400  border-rose-500/30',     icon: X },
};

const STATUS_FLOW = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];

function PedidoModal({ pedido, onClose, onSave }) {
  const blank = {
    clienteNombre: '', clienteTelefono: '', descripcion: '',
    fechaEntrega: '', anticipo: '', total: '', notas: ''
  };
  const [form, setForm] = useState(pedido ? {
    ...pedido,
    fechaEntrega: pedido.fechaEntrega?.split('T')[0] || '',
    anticipo: String(pedido.anticipo),
    total: String(pedido.total)
  } : blank);
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.clienteNombre || !form.descripcion || !form.fechaEntrega) return;
    setSaving(true);
    try {
      const url    = pedido ? `/api/pedidos-especiales/${pedido.id}` : '/api/pedidos-especiales';
      const method = pedido ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { onSave(d.pedido); onClose(); }
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#16161A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-white font-semibold text-lg">{pedido ? 'Editar Encargo' : '🎂 Nuevo Pedido Especial'}</h3>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Nombre cliente *</label>
              <input value={form.clienteNombre} onChange={e => set('clienteNombre')(e.target.value)}
                placeholder="María García" className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Teléfono</label>
              <input value={form.clienteTelefono} onChange={e => set('clienteTelefono')(e.target.value)}
                placeholder="(55) 1234-5678" className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>
          {/* Descripción */}
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Descripción del encargo *</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion')(e.target.value)}
              placeholder="Pastel de 3 pisos, cobertura de chocolate, escribe 'Feliz Cumpleaños Ana'..."
              rows={3} className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>
          {/* Fecha y precios */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Fecha entrega *</label>
              <input type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Anticipo $</label>
              <input type="number" min="0" step="0.01" value={form.anticipo} onChange={e => set('anticipo')(e.target.value)}
                placeholder="0.00" className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Total $</label>
              <input type="number" min="0" step="0.01" value={form.total} onChange={e => set('total')(e.target.value)}
                placeholder="0.00" className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>
          {/* Notas */}
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">Notas adicionales</label>
            <textarea value={form.notas} onChange={e => set('notas')(e.target.value)}
              placeholder="Alergias, preferencias, instrucciones de entrega..."
              rows={2} className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-2xl text-sm font-medium transition-all">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !form.clienteNombre || !form.descripcion || !form.fechaEntrega}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold py-3 rounded-2xl text-sm transition-all">
            {saving ? 'Guardando...' : pedido ? 'Actualizar' : 'Crear Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PedidoCard({ pedido, onUpdate, onEdit }) {
  const s = STATUS[pedido.status] || STATUS.PENDIENTE;
  const urgent = isUrgent(pedido.fechaEntrega) && !['ENTREGADO','CANCELADO'].includes(pedido.status);
  const past   = isPast(pedido.fechaEntrega)   && !['ENTREGADO','CANCELADO'].includes(pedido.status);
  const saldo  = pedido.total - pedido.anticipo;
  const [changing, setChanging] = useState(false);

  const nextStatus = async (newStatus) => {
    setChanging(true);
    try {
      const r = await fetch(`/api/pedidos-especiales/${pedido.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const d = await r.json();
      if (d.success) onUpdate(d.pedido);
    } catch(e) { console.error(e); }
    finally { setChanging(false); }
  };

  return (
    <div className={`bg-[#14141A] border rounded-3xl p-5 flex flex-col gap-4 transition-all hover:scale-[1.01] ${
      past ? 'border-rose-500/30' : urgent ? 'border-amber-500/30' : 'border-white/5'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold">{pedido.clienteNombre}</h3>
            {pedido.clienteTelefono && (
              <a href={`tel:${pedido.clienteTelefono}`} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                <Phone className="w-3 h-3" /> {pedido.clienteTelefono}
              </a>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{pedido.descripcion}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>
          <button onClick={() => onEdit(pedido)} className="w-7 h-7 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fecha */}
      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
        past ? 'bg-rose-500/10 text-rose-400' : urgent ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.03] text-gray-400'
      }`}>
        {past ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <Calendar className="w-4 h-4 flex-shrink-0" />}
        <span className="font-medium">{fmtDate(pedido.fechaEntrega)}</span>
        {urgent && !past && <span className="text-xs ml-auto">¡Próximo!</span>}
        {past && <span className="text-xs ml-auto font-bold">¡VENCIDO!</span>}
      </div>

      {/* Precios */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/[0.03] rounded-2xl p-2">
          <p className="text-xs text-gray-600 mb-0.5">Total</p>
          <p className="text-white font-bold text-sm">{fmt(pedido.total)}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-2">
          <p className="text-xs text-gray-600 mb-0.5">Anticipo</p>
          <p className="text-emerald-400 font-bold text-sm">{fmt(pedido.anticipo)}</p>
        </div>
        <div className={`rounded-2xl p-2 ${saldo > 0 ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-white/[0.03]'}`}>
          <p className="text-xs text-gray-600 mb-0.5">Saldo</p>
          <p className={`font-bold text-sm ${saldo > 0 ? 'text-amber-400' : 'text-gray-500'}`}>{fmt(saldo)}</p>
        </div>
      </div>

      {pedido.notas && (
        <p className="text-xs text-gray-500 italic border-t border-white/5 pt-3">📝 {pedido.notas}</p>
      )}

      {/* Acciones de estado */}
      {!['ENTREGADO','CANCELADO'].includes(pedido.status) && (
        <div className="flex gap-2 pt-1">
          {STATUS_FLOW.indexOf(pedido.status) < STATUS_FLOW.length - 1 && (
            <button onClick={() => nextStatus(STATUS_FLOW[STATUS_FLOW.indexOf(pedido.status) + 1])}
              disabled={changing}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-2xl text-xs transition-all">
              → {STATUS[STATUS_FLOW[STATUS_FLOW.indexOf(pedido.status) + 1]]?.label}
            </button>
          )}
          <button onClick={() => nextStatus('CANCELADO')} disabled={changing}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-3 py-2.5 rounded-2xl text-xs transition-all">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export default function PedidosEspeciales() {
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [filter,   setFilter]   = useState('ALL');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/pedidos-especiales');
      const d = await r.json();
      if (d.success) setPedidos(d.pedidos);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = (pedido) => {
    setPedidos(prev => {
      const exists = prev.find(p => p.id === pedido.id);
      return exists ? prev.map(p => p.id === pedido.id ? pedido : p) : [pedido, ...prev];
    });
  };

  const handleUpdate = (pedido) => {
    setPedidos(prev => prev.map(p => p.id === pedido.id ? pedido : p));
  };

  const filtered = filter === 'ALL' ? pedidos : pedidos.filter(p => p.status === filter);

  // Stats
  const pendientes = pedidos.filter(p => !['ENTREGADO','CANCELADO'].includes(p.status)).length;
  const hoyCount   = pedidos.filter(p => {
    const d = new Date(p.fechaEntrega); const hoy = new Date();
    return d.toDateString() === hoy.toDateString() && !['ENTREGADO','CANCELADO'].includes(p.status);
  }).length;
  const totalSaldo = pedidos
    .filter(p => !['ENTREGADO','CANCELADO'].includes(p.status))
    .reduce((a, p) => a + (p.total - p.anticipo), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-purple-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">
            Pedidos <span className="font-bold text-purple-400">Especiales</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Encargos, pasteles y reservas con fecha de entrega</p>
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white font-bold px-5 py-2.5 rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 relative z-10">
        {[
          { label: 'Activos', value: pendientes, cls: 'text-white' },
          { label: 'Entregar Hoy', value: hoyCount, cls: 'text-amber-400' },
          { label: 'Saldo por Cobrar', value: fmt(totalSaldo), cls: 'text-purple-400' },
        ].map(k => (
          <div key={k.label} className="bg-[#14141A] border border-white/5 rounded-3xl p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600 font-bold mb-2">{k.label}</p>
            <p className={`text-3xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 relative z-10">
        {[['ALL','Todos'], ['PENDIENTE','Pendientes'], ['EN_PROCESO','En proceso'], ['LISTO','Listos'], ['ENTREGADO','Entregados'], ['CANCELADO','Cancelados']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${filter === k ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid de pedidos */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">No hay pedidos {filter !== 'ALL' ? 'con este estado' : ''}</p>
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="text-purple-400 text-sm hover:underline">Crear el primero →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
          {filtered.map(p => (
            <PedidoCard key={p.id} pedido={p}
              onUpdate={handleUpdate}
              onEdit={(p) => { setEditing(p); setModal(true); }} />
          ))}
        </div>
      )}

      {modal && (
        <PedidoModal
          pedido={editing}
          onClose={() => { setModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
