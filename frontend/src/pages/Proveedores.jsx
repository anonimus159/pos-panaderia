import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, X, Search, Phone, Mail, User, Edit2,
  ShoppingBag, ChevronRight, Package, CheckCircle,
  Trash2, RefreshCw, Building2, FileText, Hash
} from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function ModalProveedor({ proveedor, onClose, onSaved }) {
  const isEdit = !!proveedor;
  const [form, setForm] = useState({
    nombre: proveedor?.nombre || '', contacto: proveedor?.contacto || '',
    telefono: proveedor?.telefono || '', email: proveedor?.email || '', notas: proveedor?.notas || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    try {
      const r = await fetch(isEdit ? `/api/proveedores/${proveedor.id}` : '/api/proveedores', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); } else setError(d.message || 'Error guardando');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161A] border border-amber-500/20 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light text-white">{isEdit ? 'Editar' : 'Nuevo'} Proveedor</h3>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nombre', icon: Building2, k: 'nombre', placeholder: 'Distribuidora El Trigo S.A.' },
            { label: 'Contacto', icon: User, k: 'contacto', placeholder: 'Juan García' },
            { label: 'Teléfono', icon: Phone, k: 'telefono', placeholder: '(55) 1234-5678' },
            { label: 'Email', icon: Mail, k: 'email', placeholder: 'ventas@proveedor.com', type: 'email' },
          ].map(f => (
            <div key={f.k}>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5" /> {f.label}
              </label>
              <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k)(e.target.value)} placeholder={f.placeholder}
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-700" />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Notas</label>
            <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2} placeholder="Condiciones de pago, horario de entrega..."
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder-gray-700" />
          </div>
          {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
            <CheckCircle className="w-5 h-5" />{loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Proveedor'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ModalCompra({ proveedor, onClose, onSaved }) {
  const [ingredientes, setIngredientes] = useState([]);
  const [items, setItems] = useState([{ ingredientId: '', descripcion: '', cantidad: '', unidad: 'kg', precioUnitario: '' }]);
  const [factura, setFactura] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ingredients').then(r => r.json()).then(d => { if (d.success) setIngredientes(d.ingredients); });
  }, []);

  const addItem = () => setItems(p => [...p, { ingredientId: '', descripcion: '', cantidad: '', unidad: 'kg', precioUnitario: '' }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const total = items.reduce((s, it) => s + (parseFloat(it.cantidad || 0) * parseFloat(it.precioUnitario || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`/api/proveedores/${proveedor.id}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: `Compra a ${proveedor.nombre}`, total, factura,
          items: items.map(it => ({
            ingredientId: it.ingredientId ? parseInt(it.ingredientId) : null,
            descripcion: it.descripcion, cantidad: parseFloat(it.cantidad || 0),
            unidad: it.unidad, precioUnitario: parseFloat(it.precioUnitario || 0),
            subtotal: parseFloat(it.cantidad || 0) * parseFloat(it.precioUnitario || 0)
          }))
        })
      });
      const d = await r.json();
      if (d.success) { onSaved(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#16161A] border border-blue-500/20 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden my-4">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-light text-white">Registrar Compra</h3>
            <p className="text-xs text-gray-500 mt-0.5">Proveedor: <span className="text-blue-400">{proveedor.nombre}</span></p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">N° Factura / Remisión</label>
            <input value={factura} onChange={e => setFactura(e.target.value)} placeholder="FAC-001"
              className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder-gray-700" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Items de la Compra</label>
              <button type="button" onClick={addItem} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Agregar línea</button>
            </div>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="bg-[#1E1E26] rounded-2xl p-4 border border-white/5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={it.ingredientId} onChange={e => {
                      const ing = ingredientes.find(x => x.id === parseInt(e.target.value));
                      updateItem(i, 'ingredientId', e.target.value);
                      if (ing) { updateItem(i, 'descripcion', ing.name); updateItem(i, 'unidad', ing.unit); }
                    }} className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                      <option value="">Ingrediente (opcional)</option>
                      {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                    </select>
                    <input value={it.descripcion} onChange={e => updateItem(i, 'descripcion', e.target.value)} placeholder="Descripción del ítem"
                      className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-gray-700" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="0" step="0.01" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} placeholder="Cantidad"
                      className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-gray-700" />
                    <input value={it.unidad} onChange={e => updateItem(i, 'unidad', e.target.value)} placeholder="Unidad"
                      className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-gray-700" />
                    <input type="number" min="0" step="0.01" value={it.precioUnitario} onChange={e => updateItem(i, 'precioUnitario', e.target.value)} placeholder="Precio unit."
                      className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-gray-700" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-bold">Subtotal: {fmt(parseFloat(it.cantidad || 0) * parseFloat(it.precioUnitario || 0))}</span>
                    {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400/50 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#1E1E26] rounded-2xl px-5 py-4 border border-white/5">
            <span className="text-gray-400 font-medium">TOTAL</span>
            <span className="text-2xl font-bold text-amber-400">{fmt(total)}</span>
          </div>
          <button type="submit" disabled={loading || total <= 0}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
            <CheckCircle className="w-5 h-5" />{loading ? 'Registrando...' : 'Confirmar Compra y Actualizar Inventario'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [compras, setCompras]         = useState([]);
  const [modalProv, setModalProv]     = useState(false);
  const [editProv, setEditProv]       = useState(null);
  const [modalCompra, setModalCompra] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/proveedores');
      const d = await r.json();
      if (d.success) setProveedores(d.proveedores);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const loadCompras = async (id) => {
    try {
      const r = await fetch(`/api/proveedores/${id}/compras`);
      const d = await r.json();
      if (d.success) setCompras(d.compras);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) loadCompras(selected.id); }, [selected]);

  const filtered = proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center min-h-full"><div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-blue-500/5 blur-[100px] pointer-events-none" />
      <header className="flex items-center justify-between mb-6 relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">Gestión de <span className="font-bold text-blue-400">Proveedores</span></h2>
          <p className="text-gray-500 text-sm mt-1">Registro de proveedores y compras — actualiza inventario automáticamente</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setEditProv(null); setModalProv(true); }}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        <div className="xl:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..."
              className="w-full bg-[#14141A] border border-white/5 text-white rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none" />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
            {filtered.map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                className={`bg-[#14141A] border rounded-2xl p-4 cursor-pointer transition-all ${selected?.id === p.id ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{p.nombre}</p>
                    {p.telefono && <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.telefono}</p>}
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ml-2 ${selected?.id === p.id ? 'text-blue-400' : 'text-gray-600'}`} />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin proveedores{search ? ' encontrados' : ' registrados'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          {!selected ? (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl flex flex-col items-center justify-center py-24 text-center">
              <Truck className="w-14 h-14 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Selecciona un proveedor</p>
              <p className="text-gray-600 text-sm mt-1">para ver su historial de compras</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-white text-xl font-bold">{selected.nombre}</h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {selected.contacto && <span className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{selected.contacto}</span>}
                      {selected.telefono && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{selected.telefono}</span>}
                      {selected.email   && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email}</span>}
                    </div>
                    {selected.notas && <p className="text-gray-600 text-xs mt-2 italic">{selected.notas}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditProv(selected); setModalProv(true); }} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setModalCompra(selected)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-sm font-bold">
                      <ShoppingBag className="w-4 h-4" /> Nueva Compra
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: compras.length, l: 'Compras', c: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { v: fmt(compras.reduce((s, c) => s + c.total, 0)), l: 'Total invertido', c: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { v: fmt(compras.length ? compras.reduce((s, c) => s + c.total, 0) / compras.length : 0), l: 'Promedio', c: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  ].map(k => (
                    <div key={k.l} className={`${k.bg} border rounded-2xl p-4 text-center`}>
                      <p className={`text-xl font-bold ${k.c}`}>{k.v}</p>
                      <p className="text-xs text-gray-500 mt-1">{k.l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h4 className="text-white font-semibold text-sm">Historial de Compras</h4>
                </div>
                {compras.length === 0 ? (
                  <div className="p-12 text-center text-gray-600"><Package className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin compras aún</p></div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {compras.map(c => (
                      <div key={c.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{c.descripcion}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">{fmtDate(c.createdAt)}</span>
                              {c.factura && <span className="text-xs text-gray-500 flex items-center gap-1"><Hash className="w-3 h-3" />{c.factura}</span>}
                            </div>
                            {c.items?.map((it, i) => (
                              <p key={i} className="text-xs text-gray-500 mt-1">• {it.descripcion} — {it.cantidad} {it.unidad} × {fmt(it.precioUnitario)}</p>
                            ))}
                          </div>
                          <span className="text-amber-400 font-bold text-sm ml-4 flex-shrink-0">{fmt(c.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalProv && <ModalProveedor proveedor={editProv} onClose={() => { setModalProv(false); setEditProv(null); }} onSaved={load} />}
      {modalCompra && <ModalCompra proveedor={modalCompra} onClose={() => setModalCompra(null)} onSaved={() => { loadCompras(selected.id); load(); }} />}
    </div>
  );
}
