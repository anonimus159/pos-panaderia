import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, X, Trash2, RefreshCw, DollarSign,
  TrendingDown, ChevronDown, CheckCircle, AlertTriangle
} from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const CATEGORIAS = [
  { id: 'LIMPIEZA',       label: 'Limpieza',       color: 'blue' },
  { id: 'INSUMOS',        label: 'Insumos',         color: 'amber' },
  { id: 'TRANSPORTE',     label: 'Transporte',      color: 'purple' },
  { id: 'MANTENIMIENTO',  label: 'Mantenimiento',   color: 'orange' },
  { id: 'SERVICIOS',      label: 'Servicios',       color: 'cyan' },
  { id: 'OTROS',          label: 'Otros',           color: 'gray' },
];

const CAT_COLORS = {
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function catInfo(id) { return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1]; }

export default function CajaChica() {
  const [gastos, setGastos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fondoInicial, setFondoInicial] = useState('');
  const [fontoLoaded, setFontoLoaded]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [filtroFecha, setFiltroFecha]   = useState(new Date().toISOString().split('T')[0]);

  // Formulario
  const [form, setForm] = useState({ descripcion: '', categoria: 'OTROS', monto: '', comprobante: '' });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/caja-chica?fecha=${filtroFecha}`);
      const d = await r.json();
      if (d.success) {
        setGastos(d.gastos);
        if (!fontoLoaded && d.fondoInicial !== undefined) {
          setFondoInicial(String(d.fondoInicial));
          setFontoLoaded(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtroFecha, fontoLoaded]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    try {
      const r = await fetch('/api/caja-chica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monto: parseFloat(form.monto) })
      });
      const d = await r.json();
      if (d.success) {
        setSaved(true); setTimeout(() => setSaved(false), 2000);
        setForm({ descripcion: '', categoria: 'OTROS', monto: '', comprobante: '' });
        setShowForm(false);
        load();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    await fetch(`/api/caja-chica/${id}`, { method: 'DELETE' });
    load();
  };

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const fondo       = parseFloat(fondoInicial || 0);
  const saldo       = fondo - totalGastos;
  const porCategoria = CATEGORIAS.map(c => ({
    ...c,
    total: gastos.filter(g => g.categoria === c.id).reduce((s, g) => s + g.monto, 0),
    count: gastos.filter(g => g.categoria === c.id).length,
  })).filter(c => c.total > 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-orange-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">Caja <span className="font-bold text-orange-400">Chica</span></h2>
          <p className="text-gray-500 text-sm mt-1">Registro de gastos menores en efectivo</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
            className="bg-[#14141A] border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(p => !p)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black px-5 py-2.5 rounded-2xl text-sm font-bold transition-all">
            <Plus className="w-4 h-4" /> Registrar Gasto
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Fondo Inicial</p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" step="0.01" value={fondoInicial}
              onChange={e => setFondoInicial(e.target.value)}
              className="text-2xl font-bold text-amber-400 bg-transparent border-b border-amber-500/30 focus:outline-none w-full" />
          </div>
          <p className="text-xs text-gray-600 mt-1">editable</p>
        </div>
        <div className="bg-[#14141A] border border-rose-500/20 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Total Gastos</p>
          <p className="text-2xl font-bold text-rose-400">{fmt(totalGastos)}</p>
          <p className="text-xs text-gray-600 mt-1">{gastos.length} movimientos</p>
        </div>
        <div className={`bg-[#14141A] border rounded-2xl p-5 ${saldo >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Saldo Disponible</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(saldo)}</p>
          {saldo < 0 && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fondo insuficiente</p>}
        </div>
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">% Consumido</p>
          <p className="text-2xl font-bold text-white">{fondo > 0 ? Math.round((totalGastos / fondo) * 100) : 0}%</p>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all"
              style={{ width: `${Math.min(fondo > 0 ? (totalGastos / fondo) * 100 : 0, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        {/* Formulario + Categorías */}
        <div className="space-y-5">
          {showForm && (
            <div className="bg-[#14141A] border border-orange-500/20 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 to-amber-500" />
              <h3 className="text-white font-semibold mb-4">Nuevo Gasto</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Categoría</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS.map(c => (
                      <button key={c.id} type="button" onClick={() => setForm(p => ({ ...p, categoria: c.id }))}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${form.categoria === c.id ? CAT_COLORS[c.color] : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Descripción</label>
                  <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Jabón para cocina" required
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors placeholder-gray-700" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Monto</label>
                  <input type="number" min="0.01" step="0.01" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="$0.00" required
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors placeholder-gray-700" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Comprobante / Referencia</label>
                  <input value={form.comprobante} onChange={e => setForm(p => ({ ...p, comprobante: e.target.value }))} placeholder="N° ticket, foto, etc."
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors placeholder-gray-700" />
                </div>
                <button type="submit" disabled={saving}
                  className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all ${saved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500 hover:bg-orange-400 text-black'}`}>
                  {saved ? <><CheckCircle className="w-4 h-4" /> Guardado</> : saving ? 'Guardando...' : <><Plus className="w-4 h-4" /> Registrar Gasto</>}
                </button>
              </form>
            </div>
          )}

          {/* Por categoría */}
          {porCategoria.length > 0 && (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6">
              <h4 className="text-white font-semibold text-sm mb-4">Por Categoría</h4>
              <div className="space-y-3">
                {porCategoria.map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${CAT_COLORS[c.color]}`}>{c.label}</span>
                      <span className="text-gray-600 text-xs">{c.count} gastos</span>
                    </div>
                    <span className="text-white font-bold text-sm">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de gastos */}
        <div className="xl:col-span-2">
          <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-white font-semibold text-sm">Movimientos del día</h4>
              <span className="text-xs text-gray-500">{filtroFecha}</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
            ) : gastos.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin gastos registrados este día</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {gastos.map(g => {
                  const cat = catInfo(g.categoria);
                  return (
                    <div key={g.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0 ${CAT_COLORS[cat.color]}`}>{cat.label}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{g.descripcion}</p>
                          <p className="text-gray-600 text-xs">{fmtDate(g.createdAt)} {fmtTime(g.createdAt)}{g.creadoPor ? ` · ${g.creadoPor}` : ''}</p>
                          {g.comprobante && <p className="text-gray-600 text-xs">Ref: {g.comprobante}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-rose-400 font-bold">-{fmt(g.monto)}</span>
                        <button onClick={() => eliminar(g.id)} className="w-8 h-8 text-gray-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="px-6 py-4 bg-white/[0.02] flex items-center justify-between">
                  <span className="text-gray-400 font-semibold text-sm">TOTAL GASTOS DEL DÍA</span>
                  <span className="text-rose-400 font-bold text-lg">{fmt(totalGastos)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
