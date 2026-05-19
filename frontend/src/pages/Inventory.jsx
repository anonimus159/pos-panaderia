import React, { useState, useEffect } from 'react';
import {
  Archive, ArrowRightLeft, Plus, X, AlertTriangle,
  Calendar, DollarSign, TrendingDown, PackageCheck, Edit2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

const fmt = (n) => formatCurrency(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function diasParaVencer(fecha) {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha) - new Date()) / 86400000);
  return diff;
}

function BadgeEstado({ ing }) {
  const critico = ing.stock <= ing.minStock;
  const dias = diasParaVencer(ing.fechaCaducidad);
  const venceProximo = dias !== null && dias <= 7;
  const vencido = dias !== null && dias < 0;
  if (vencido)       return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-rose-700 text-white">VENCIDO</span>;
  if (venceProximo)  return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30">Vence en {dias}d</span>;
  if (critico)       return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-red-500 text-black">Crítico</span>;
  return               <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Óptimo</span>;
}

function ModalInsumo({ insumo, onClose, onSaved }) {
  const isEdit = !!insumo;
  const [form, setForm] = useState({
    name:           insumo?.name            || '',
    unit:           insumo?.unit            || 'Kg',
    minStock:       insumo?.minStock?.toString() || '',
    costoPorUnidad: insumo?.costoPorUnidad?.toString() || '',
    fechaCaducidad: insumo?.fechaCaducidad  ? new Date(insumo.fechaCaducidad).toISOString().split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name: form.name, unit: form.unit,
        minStock:       parseFloat(form.minStock       || 0),
        costoPorUnidad: parseFloat(form.costoPorUnidad || 0),
        fechaCaducidad: form.fechaCaducidad || null,
      };
      const url = isEdit ? `/api/inventory/ingredients/${insumo.id}` : '/api/inventory/ingredients';
      const r   = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-light text-white">{isEdit ? 'Editar' : 'Nuevo'} Insumo</h3>
            <p className="text-sm text-gray-400 mt-1">Materia prima del inventario</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Nombre del Insumo</label>
            <input required type="text" value={form.name} onChange={e => set('name')(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="Ej. Harina de Trigo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Unidad</label>
              <select required value={form.unit} onChange={e => set('unit')(e.target.value)}
                className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none appearance-none">
                {['Kg', 'gr', 'L', 'ml', 'Unidad', 'Litro', 'Pieza', 'Caja', 'Bolsa'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Stock Mínimo</label>
              <input required type="number" step="0.01" value={form.minStock} onChange={e => set('minStock')(e.target.value)}
                className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Costo por Unidad ($)
            </label>
            <input type="number" step="0.01" min="0" value={form.costoPorUnidad} onChange={e => set('costoPorUnidad')(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="0.00" />
            <p className="text-xs text-gray-600 mt-1">Usado para calcular el costo de producción de las recetas</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-400" /> Fecha de Caducidad (opcional)
            </label>
            <input type="date" value={form.fechaCaducidad} onChange={e => set('fechaCaducidad')(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-gray-300 focus:outline-none focus:border-orange-500/50 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl mt-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-lg">
            {loading ? 'Guardando...' : isEdit ? 'Actualizar Insumo' : 'Guardar Insumo'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function ModalMovimiento({ ingredients, onClose, onSaved }) {
  const [form, setForm] = useState({ ingredientId: '', type: 'ENTRADA', quantity: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/inventory/movement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-light text-white">Movimiento</h3>
            <p className="text-sm text-gray-400 mt-1">Ajuste de inventario manual</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Insumo</label>
            <select required value={form.ingredientId} onChange={e => set('ingredientId')(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none appearance-none">
              <option value="">Seleccione un insumo</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit}) — Stock: {i.stock}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Tipo</label>
              <select value={form.type} onChange={e => set('type')(e.target.value)}
                className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none appearance-none">
                <option value="ENTRADA">Entrada (+)</option>
                <option value="SALIDA">Salida (−)</option>
                <option value="MERMA">Merma</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Cantidad</label>
              <input required type="number" step="0.01" value={form.quantity} onChange={e => set('quantity')(e.target.value)}
                className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Motivo (opcional)</label>
            <input type="text" value={form.reason} onChange={e => set('reason')(e.target.value)}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none" placeholder="Ej. Compra a proveedor, merma" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl mt-2 transition-all text-lg">
            {loading ? 'Registrando...' : 'Registrar Movimiento'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function Inventory() {
  const [ingredients, setIngredients]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [editInsumo, setEditInsumo]     = useState(null);
  const [filtro, setFiltro]             = useState('todos'); // 'todos' | 'critico' | 'vence'
  const [search, setSearch]             = useState('');

  const fetchData = async () => {
    try {
      const res  = await fetch('/api/inventory/ingredients');
      const data = await res.json();
      if (data.success) setIngredients(data.ingredients);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const criticos   = ingredients.filter(i => i.stock <= i.minStock).length;
  const porVencer  = ingredients.filter(i => { const d = diasParaVencer(i.fechaCaducidad); return d !== null && d <= 7 && d >= 0; }).length;
  const vencidos   = ingredients.filter(i => { const d = diasParaVencer(i.fechaCaducidad); return d !== null && d < 0; }).length;
  const valorTotal = ingredients.reduce((s, i) => s + (i.stock * (i.costoPorUnidad || 0)), 0);

  const filtered = ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'todos' ? true
      : filtro === 'critico' ? i.stock <= i.minStock
      : filtro === 'vence'   ? (diasParaVencer(i.fechaCaducidad) !== null && diasParaVencer(i.fechaCaducidad) <= 7)
      : true;
    return matchSearch && matchFiltro;
  });

  return (
    <div className="p-6 lg:p-8 text-[var(--text-primary)] relative min-h-full space-y-6">
      <div className="absolute top-0 right-0 w-1/2 h-96 bg-amber-600/5 blur-[120px] pointer-events-none" />

      <header className="flex justify-between items-center relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white mb-1">Inventario e <span className="font-bold text-amber-400">Insumos</span></h2>
          <p className="text-gray-400 text-sm">Control de materias primas con costos y caducidades</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowMovimiento(true)}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Movimiento
          </button>
          <button onClick={() => { setEditInsumo(null); setShowModal(true); }}
            className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Plus className="w-4 h-4" /> Nuevo Insumo
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Total Insumos',     value: ingredients.length,                   color: 'text-white',        bg: 'bg-[#14141A] border-white/5',            icon: PackageCheck },
          { label: 'Stock Crítico',     value: criticos,                              color: 'text-rose-400',     bg: 'bg-rose-500/10 border-rose-500/20',       icon: AlertTriangle },
          { label: 'Por Vencer ≤7d',   value: porVencer + (vencidos > 0 ? ` (+${vencidos} venc.)` : ''), color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Calendar },
          { label: 'Valor en Bodega',  value: fmt(valorTotal),                       color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20', icon: DollarSign },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border rounded-2xl p-5 relative overflow-hidden`}>
            <k.icon className={`absolute right-4 top-4 w-8 h-8 opacity-10 ${k.color}`} />
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar insumo..."
          className="bg-[#14141A] border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none w-64" />
        <div className="flex gap-2">
          {[['todos', 'Todos'], ['critico', '🔴 Críticos'], ['vence', '🟠 Por vencer']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filtro === k ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla (Escritorio) / Tarjetas (Móvil) */}
      <div className="bg-[#14141A] backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10">
        {/* Vista Escritorio */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0F0F13] border-b border-white/5 text-gray-500 text-xs uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Unidad</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Mínimo</th>
                <th className="px-6 py-4">Costo/Und</th>
                <th className="px-6 py-4">Valor Stock</th>
                <th className="px-6 py-4">Caducidad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="9" className="p-10 text-center text-amber-500 font-bold">Cargando inventario...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="p-10 text-center text-gray-500">
                  {search || filtro !== 'todos' ? 'Sin insumos que coincidan' : 'No hay insumos registrados'}
                </td></tr>
              ) : filtered.map((ing) => {
                const dias = diasParaVencer(ing.fechaCaducidad);
                const vencido = dias !== null && dias < 0;
                const venceProx = dias !== null && dias <= 7 && dias >= 0;
                const rowBg = vencido ? 'bg-rose-500/5' : venceProx ? 'bg-orange-500/5' : '';
                return (
                  <motion.tr key={ing.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`hover:bg-white/[0.02] transition-colors ${rowBg}`}>
                    <td className="px-6 py-4 font-medium text-white">{ing.name}</td>
                    <td className="px-6 py-4 text-gray-400">{ing.unit}</td>
                    <td className={`px-6 py-4 font-bold ${ing.stock <= ing.minStock ? 'text-rose-400' : 'text-amber-500'}`}>{ing.stock}</td>
                    <td className="px-6 py-4 text-gray-500">{ing.minStock}</td>
                    <td className="px-6 py-4 text-emerald-400 font-medium">{ing.costoPorUnidad > 0 ? fmt(ing.costoPorUnidad) : <span className="text-gray-700 text-xs">—</span>}</td>
                    <td className="px-6 py-4 text-amber-400 font-medium">
                      {ing.costoPorUnidad > 0 ? fmt(ing.stock * ing.costoPorUnidad) : <span className="text-gray-700 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {ing.fechaCaducidad ? (
                        <span className={`text-xs font-medium ${vencido ? 'text-rose-400' : venceProx ? 'text-orange-400' : 'text-gray-400'}`}>
                          {fmtDate(ing.fechaCaducidad)}
                        </span>
                      ) : <span className="text-gray-700 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4"><BadgeEstado ing={ing} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditInsumo(ing); setShowModal(true); }}
                        className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-400 transition-colors ml-auto">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="md:hidden divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center text-amber-500 font-bold">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Sin resultados</div>
          ) : filtered.map(ing => (
            <div key={ing.id} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-white font-bold text-lg">{ing.name}</h4>
                  <p className="text-xs text-gray-500">{ing.unit} — Min: {ing.minStock}</p>
                </div>
                <BadgeEstado ing={ing} />
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Stock Actual</p>
                  <p className={`text-xl font-bold ${ing.stock <= ing.minStock ? 'text-rose-400' : 'text-amber-500'}`}>{ing.stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Valor</p>
                  <p className="text-xl font-bold text-emerald-400">{fmt(ing.stock * (ing.costoPorUnidad || 0))}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-400">
                  {ing.fechaCaducidad && `Vence: ${fmtDate(ing.fechaCaducidad)}`}
                </div>
                <button onClick={() => { setEditInsumo(ing); setShowModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-amber-500">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ModalInsumo
            insumo={editInsumo}
            onClose={() => { setShowModal(false); setEditInsumo(null); }}
            onSaved={fetchData}
          />
        )}
        {showMovimiento && (
          <ModalMovimiento ingredients={ingredients} onClose={() => setShowMovimiento(false)} onSaved={fetchData} />
        )}
      </AnimatePresence>
    </div>
  );
}
