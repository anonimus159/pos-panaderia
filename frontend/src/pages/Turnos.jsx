import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, X, CheckCircle, AlertTriangle, DollarSign,
  User, TrendingUp, CreditCard, Banknote, Landmark, ChevronDown,
  BarChart2, Lock, Unlock, History, RefreshCw, FileText
} from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const TURNO_NOMBRES = ['Turno Mañana', 'Turno Tarde', 'Turno Noche', 'Turno Extra'];

function StatCard({ label, value, icon: Icon, color = 'amber', sub }) {
  const colors = {
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-widest font-bold opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function ModalAbrirTurno({ onClose, onCreated }) {
  const [nombre, setNombre] = useState('Turno Mañana');
  const [cajero, setCajero] = useState('');
  const [fondo, setFondo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cajero.trim()) { setError('El nombre del cajero es requerido'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cajero, fondoInicial: parseFloat(fondo || 0) })
      });
      const d = await r.json();
      if (d.success) { onCreated(d.turno); onClose(); }
      else setError(d.message || 'Error abriendo turno');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161A] border border-emerald-500/20 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-light text-white">Abrir Nuevo Turno</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configura el turno antes de iniciar</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Nombre del turno</label>
            <div className="grid grid-cols-2 gap-2">
              {TURNO_NOMBRES.map(n => (
                <button key={n} type="button" onClick={() => setNombre(n)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${nombre === n ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Cajero responsable</label>
            <input value={cajero} onChange={e => setCajero(e.target.value)} placeholder="Nombre del cajero"
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-700" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Fondo inicial en caja</label>
            <input type="number" min="0" step="0.01" value={fondo} onChange={e => setFondo(e.target.value)} placeholder="$0.00"
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-700" />
          </div>

          {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Unlock className="w-5 h-5" />
            {loading ? 'Abriendo...' : 'Abrir Turno'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ModalCerrarTurno({ turno, onClose, onClosed }) {
  const [fondoFinal, setFondoFinal]         = useState('');
  const [observaciones, setObservaciones]   = useState('');
  const [notasTraspaso, setNotasTraspaso]   = useState('');
  const [loading, setLoading]               = useState(false);

  const handleCerrar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/turnos/${turno.id}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fondoFinal: parseFloat(fondoFinal || 0), observaciones, notasTraspaso })
      });
      const d = await r.json();
      if (d.success) { onClosed(); onClose(); }
    } catch { }
    finally { setLoading(false); }
  };

  const diferencia = (parseFloat(fondoFinal || 0)) - (turno.fondoInicial + turno.totalEfectivo);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161A] border border-rose-500/20 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-light text-white">Cerrar Turno</h3>
            <p className="text-xs text-gray-500 mt-0.5">{turno.nombre} — {turno.cajero}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Resumen del turno */}
        <div className="bg-[#0F0F13] rounded-2xl p-5 mb-5 space-y-3 border border-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Resumen del Turno</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Ventas totales</span><span className="text-emerald-400 font-bold">{fmt(turno.totalVentas)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">N° ventas</span><span className="text-white font-bold">{turno.numVentas}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Efectivo</span><span className="text-white">{fmt(turno.totalEfectivo)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tarjeta</span><span className="text-white">{fmt(turno.totalTarjeta)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Transferencia</span><span className="text-white">{fmt(turno.totalTransfer)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fondo inicial</span><span className="text-amber-400">{fmt(turno.fondoInicial)}</span></div>
          </div>
          <div className="border-t border-white/5 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Efectivo esperado en caja</span>
              <span className="text-amber-400 font-bold">{fmt(turno.fondoInicial + turno.totalEfectivo)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Efectivo contado en caja</label>
            <input type="number" min="0" step="0.01" value={fondoFinal} onChange={e => setFondoFinal(e.target.value)} placeholder="$0.00"
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50 transition-colors placeholder-gray-700" />
            {fondoFinal && (
              <p className={`text-xs mt-2 font-bold ${diferencia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diferencia >= 0 ? '✓ Sobrante:' : '✗ Faltante:'} {fmt(Math.abs(diferencia))}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Observaciones del cierre</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Notas del cierre..."
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50 transition-colors resize-none placeholder-gray-700" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="text-amber-400">📝</span> Notas para el siguiente turno
            </label>
            <textarea value={notasTraspaso} onChange={e => setNotasTraspaso(e.target.value)} rows={2} placeholder="Ej: Falta cambio en caja, revisar el café, cliente pendiente de encargo..."
              className="w-full bg-amber-500/5 border border-amber-500/20 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder-gray-700" />
          </div>

          <button onClick={handleCerrar} disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Lock className="w-5 h-5" />
            {loading ? 'Cerrando...' : 'Confirmar Cierre de Turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Turnos() {
  const [turnos, setTurnos]       = useState([]);
  const [activos, setActivos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('activos'); // 'activos' | 'historial'
  const [showAbrir, setShowAbrir] = useState(false);
  const [cerrando, setCerrando]   = useState(null);
  const [lastNotes, setLastNotes] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/turnos');
      const d = await r.json();
      if (d.success) {
        setActivos(d.turnos.filter(t => t.estado === 'ABIERTO'));
        setTurnos(d.turnos.filter(t => t.estado === 'CERRADO'));
        setLastNotes(d.lastClosedNotes);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-full">
      <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">
            Gestión de <span className="font-bold text-emerald-400">Turnos</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Control de turnos por cajero — multi-turno simultáneo</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAbrir(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Plus className="w-4 h-4" /> Abrir Turno
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 relative z-10">
        {[{ k: 'activos', label: `Turnos Activos (${activos.length})` }, { k: 'historial', label: 'Historial' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.k ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Notas del turno anterior */}
      {lastNotes && activos.length > 0 && (
        <div className="relative z-10 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Notas del Turno Anterior</p>
            <p className="text-sm text-gray-300 mt-1">{lastNotes}</p>
          </div>
        </div>
      )}

      {/* Turnos Activos */}
      {tab === 'activos' && (
        <div className="relative z-10">
          {activos.length === 0 ? (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium mb-1">No hay turnos activos</p>
              <p className="text-gray-600 text-sm mb-6">Abre un turno para comenzar a registrar ventas</p>
              <button onClick={() => setShowAbrir(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-bold text-sm transition-all">
                Abrir Primer Turno
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {activos.map(turno => (
                <div key={turno.id} className="bg-[#14141A] border border-emerald-500/20 rounded-3xl p-6 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-amber-500" />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Activo</span>
                      </div>
                      <h3 className="text-white font-bold text-lg">{turno.nombre}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400 text-sm">{turno.cajero}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Apertura</p>
                      <p className="text-sm text-gray-400 font-medium">{fmtTime(turno.aperturaAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Ventas" value={fmt(turno.totalVentas)} icon={TrendingUp} color="emerald" sub={`${turno.numVentas} transacciones`} />
                    <StatCard label="Fondo" value={fmt(turno.fondoInicial)} icon={DollarSign} color="amber" sub="inicial en caja" />
                    <StatCard label="Efectivo" value={fmt(turno.totalEfectivo)} icon={Banknote} color="blue" />
                    <StatCard label="Tarjeta" value={fmt(turno.totalTarjeta)} icon={CreditCard} color="rose" />
                  </div>

                  <button onClick={() => setCerrando(turno)}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all">
                    <Lock className="w-4 h-4" /> Cerrar Turno
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div className="relative z-10">
          {turnos.length === 0 ? (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl p-16 text-center">
              <History className="w-10 h-10 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Sin historial de turnos cerrados</p>
            </div>
          ) : (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-widest">
                    <th className="px-6 py-4 text-left font-bold">Turno</th>
                    <th className="px-6 py-4 text-left font-bold">Cajero</th>
                    <th className="px-6 py-4 text-left font-bold">Apertura</th>
                    <th className="px-6 py-4 text-left font-bold">Cierre</th>
                    <th className="px-6 py-4 text-right font-bold">Ventas</th>
                    <th className="px-6 py-4 text-right font-bold">N° Trans.</th>
                    <th className="px-6 py-4 text-right font-bold">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t, i) => {
                    const diff = t.fondoFinal - (t.fondoInicial + t.totalEfectivo);
                    return (
                      <tr key={t.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-6 py-4 text-white font-medium">{t.nombre}</td>
                        <td className="px-6 py-4 text-gray-400">{t.cajero}</td>
                        <td className="px-6 py-4 text-gray-400">{fmtDate(t.aperturaAt)} {fmtTime(t.aperturaAt)}</td>
                        <td className="px-6 py-4 text-gray-400">{t.cierreAt ? `${fmtDate(t.cierreAt)} ${fmtTime(t.cierreAt)}` : '—'}</td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-bold">{fmt(t.totalVentas)}</td>
                        <td className="px-6 py-4 text-right text-white">{t.numVentas}</td>
                        <td className={`px-6 py-4 text-right font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff >= 0 ? '+' : ''}{fmt(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAbrir && <ModalAbrirTurno onClose={() => setShowAbrir(false)} onCreated={() => load()} />}
      {cerrando && <ModalCerrarTurno turno={cerrando} onClose={() => setCerrando(null)} onClosed={load} />}
    </div>
  );
}
