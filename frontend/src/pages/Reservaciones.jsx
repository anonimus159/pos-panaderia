import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, X, Clock, Users, Table2,
  CheckCircle, Trash2, RefreshCw, ChevronLeft, ChevronRight, Phone
} from 'lucide-react';

const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
const ESTADOS = { CONFIRMADA: 'emerald', CANCELADA: 'rose', COMPLETADA: 'blue', PENDIENTE: 'amber' };

function ModalReservacion({ mesas, onClose, onSaved }) {
  const [form, setForm] = useState({
    tableId: '', clienteNombre: '', clienteTel: '', fecha: new Date().toISOString().split('T')[0],
    hora: '13:00', personas: '2', notas: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clienteNombre.trim()) { setError('El nombre del cliente es requerido'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/reservaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, personas: parseInt(form.personas), tableId: form.tableId ? parseInt(form.tableId) : null })
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); } else setError(d.message || 'Error');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161A] border border-cyan-500/20 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light text-white">Nueva Reservación</h3>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Nombre del cliente *</label>
            <input value={form.clienteNombre} onChange={e => set('clienteNombre')(e.target.value)} placeholder="María García" required
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Teléfono</label>
              <input value={form.clienteTel} onChange={e => set('clienteTel')(e.target.value)} placeholder="(55) 1234-5678"
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-700" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Personas</label>
              <input type="number" min="1" max="20" value={form.personas} onChange={e => set('personas')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Fecha</label>
              <input type="date" value={form.fecha} min={new Date().toISOString().split('T')[0]} onChange={e => set('fecha')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Hora</label>
              <input type="time" value={form.hora} onChange={e => set('hora')(e.target.value)}
                className="w-full bg-[#1E1E26] border border-white/10 text-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Mesa (opcional)</label>
            <select value={form.tableId} onChange={e => set('tableId')(e.target.value)}
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none">
              <option value="">Sin asignar</option>
              {mesas.map(m => <option key={m.id} value={m.id}>{m.name} ({m.capacity} personas)</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2} placeholder="Ocasión especial, preferencias, alergias..."
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none transition-colors placeholder-gray-700" />
          </div>
          {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
            <CheckCircle className="w-5 h-5" />{loading ? 'Guardando...' : 'Confirmar Reservación'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Reservaciones() {
  const [reservaciones, setReservaciones] = useState([]);
  const [mesas, setMesas]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [modal, setModal]                 = useState(false);
  const [fecha, setFecha]                 = useState(new Date().toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, mRes] = await Promise.all([
        fetch(`/api/reservaciones?fecha=${fecha}`),
        fetch('/api/tables')
      ]);
      const [rd, md] = await Promise.all([rRes.json(), mRes.json()]);
      if (rd.success) setReservaciones(rd.reservaciones);
      if (md.success) setMesas(md.tables);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [fecha]);

  const cambiarEstado = async (id, estado) => {
    try {
      await fetch(`/api/reservaciones/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      load();
    } catch (e) { console.error(e); }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta reservación?')) return;
    await fetch(`/api/reservaciones/${id}`, { method: 'DELETE' });
    load();
  };

  const navFecha = (dias) => {
    const d = new Date(fecha + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().split('T')[0]);
  };

  const por_hora = reservaciones.reduce((acc, r) => {
    const h = r.hora?.substring(0, 2) + ':00' || '12:00';
    if (!acc[h]) acc[h] = [];
    acc[h].push(r);
    return acc;
  }, {});

  const horas = Object.keys(por_hora).sort();

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-cyan-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">Reservaciones <span className="font-bold text-cyan-400">de Mesas</span></h2>
          <p className="text-gray-500 text-sm mt-1">Agenda del restaurante por día</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Plus className="w-4 h-4" /> Nueva Reservación
          </button>
        </div>
      </header>

      {/* Navegador de fecha */}
      <div className="flex items-center gap-4 relative z-10">
        <button onClick={() => navFecha(-1)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 transition-all"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex-1 bg-[#14141A] border border-white/5 rounded-2xl px-6 py-3 text-center">
          <p className="text-white font-semibold">{new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-cyan-400 mt-0.5">{reservaciones.length} reservación{reservaciones.length !== 1 ? 'es' : ''}</p>
        </div>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="bg-[#14141A] border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        <button onClick={() => navFecha(1)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 transition-all"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16 relative z-10"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
      ) : reservaciones.length === 0 ? (
        <div className="bg-[#14141A] border border-white/5 rounded-3xl p-16 text-center relative z-10">
          <CalendarDays className="w-14 h-14 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Sin reservaciones para este día</p>
          <button onClick={() => setModal(true)} className="mt-4 bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-2xl font-bold text-sm">Crear Reservación</button>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {horas.map(hora => (
            <div key={hora} className="flex gap-4">
              <div className="w-16 text-right flex-shrink-0 pt-3">
                <span className="text-xs text-gray-600 font-bold">{hora}</span>
              </div>
              <div className="flex-1 space-y-2">
                {por_hora[hora].map(r => {
                  const color = ESTADOS[r.estado] || 'gray';
                  return (
                    <div key={r.id} className={`bg-[#14141A] border border-${color}-500/20 rounded-2xl p-4 flex items-center justify-between gap-4`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
                          <Clock className={`w-5 h-5 text-${color}-400`} />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{r.clienteNombre}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-gray-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{r.personas} pers.</span>
                            {r.clienteTel && <span className="text-gray-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{r.clienteTel}</span>}
                            {r.table && <span className="text-gray-500 text-xs">{r.table.name}</span>}
                            {r.hora && <span className="text-cyan-400 text-xs font-bold">{r.hora}</span>}
                          </div>
                          {r.notas && <p className="text-gray-600 text-xs mt-1 italic">{r.notas}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>{r.estado}</span>
                        {r.estado === 'CONFIRMADA' && (
                          <button onClick={() => cambiarEstado(r.id, 'COMPLETADA')} className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl transition-all border border-emerald-500/20">✓ Llegó</button>
                        )}
                        {r.estado !== 'CANCELADA' && r.estado !== 'COMPLETADA' && (
                          <button onClick={() => cambiarEstado(r.id, 'CANCELADA')} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl transition-all border border-rose-500/20">✗ Cancelar</button>
                        )}
                        <button onClick={() => eliminar(r.id)} className="w-8 h-8 text-gray-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <ModalReservacion mesas={mesas} onClose={() => setModal(false)} onSaved={load} />}
    </div>
  );
}
