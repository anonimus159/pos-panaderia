import React, { useState, useEffect } from 'react';
import { Package, Plus, X, FolderPlus, Pencil, Trash2, Barcode, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [config, setConfig] = useState({});
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price-asc', 'price-desc'
  
  // Admin Auth States
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  
  // Confirm Modal State
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    isWeight: false,
    categoryId: '',
    barcode: '',
    stock: 0
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });
  
  useEffect(() => {
    fetchData();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      if (d.success) setConfig(d.config);
    } catch(e) {}
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/categories')
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      
      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Buscar el producto original para comparar el stock
    const originalProduct = editId ? products.find(p => p.id === editId) : null;
    const stockHasChanged = originalProduct ? (parseInt(formData.stock) !== originalProduct.stock) : (parseInt(formData.stock) !== 0);

    const performSave = async () => {
      try {
        const url = editId ? `/api/products/${editId}` : '/api/products';
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...formData, 
            price: parseFloat(formData.price),
            stock: parseFloat(formData.stock) || 0,
            requiresPrep: true 
          })
        });
        const data = await res.json();
        if (data.success) {
          setIsModalOpen(false);
          setEditId(null);
          setFormData({ name: '', description: '', price: '', isWeight: false, categoryId: '', barcode: '', stock: 0 });
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (stockHasChanged) {
      requestAdminAuth(performSave);
    } else {
      performSave();
    }
  };

  const openNewModal = () => {
    setEditId(null);
    setFormData({ name: '', description: '', price: '', isWeight: false, categoryId: '', barcode: '', stock: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditId(product.id);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      isWeight: product.isWeight,
      categoryId: product.categoryId || '',
      barcode: product.barcode || '',
      stock: product.stock
    });
    setIsModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });
      const data = await res.json();
      if (data.success) {
        setIsCategoryModalOpen(false);
        setCategoryFormData({ name: '', description: '' });
        setFormData({ ...formData, categoryId: data.category.id }); // Seleccionar automáticamente la nueva categoría
        fetchData();
      } else {
        alert("Error al guardar: " + (data.message || "Error desconocido del servidor"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar categoría.");
    }
  };

  const handleReorder = async (id, direction) => {
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    const newCategories = [...categories];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    if (targetIdx < 0 || targetIdx >= newCategories.length) return;
    
    const temp = newCategories[idx];
    newCategories[idx] = newCategories[targetIdx];
    newCategories[targetIdx] = temp;
    
    const orders = newCategories.map((c, i) => ({ id: c.id, order: i }));
    
    try {
      const res = await fetch('/api/products/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
      const data = await res.json();
      if (data.success) {
        fetchData(); // Usamos fetchData para actualizar productos y categorías
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    setConfirmData({
      isOpen: true,
      title: '¿Eliminar producto?',
      message: 'Esta acción es permanente. Si el producto tiene registros asociados (ventas), es posible que el sistema impida su eliminación por integridad de datos.',
      confirmText: 'Eliminar Producto',
      type: 'danger',
      onConfirm: () => {
        requestAdminAuth(async () => {
          try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              fetchData();
            } else {
              alert(data.message || 'No se pudo eliminar el producto');
            }
          } catch (err) {
            console.error(err);
          }
        });
      }
    });
  };

  const handleDeleteCategory = (id) => {
    setConfirmData({
      isOpen: true,
      title: '¿Eliminar categoría?',
      message: 'Los productos pertenecientes a esta categoría serán reasignados automáticamente a la categoría "General". Esta acción no se puede deshacer.',
      confirmText: 'Entendido, eliminar',
      type: 'warning',
      onConfirm: () => {
        requestAdminAuth(async () => {
          try {
            const res = await fetch(`/api/products/categories/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              fetchData();
            } else {
              alert(data.message || 'No se pudo eliminar la categoría');
            }
          } catch (err) {
            console.error(err);
          }
        });
      }
    });
  };

  const requestAdminAuth = (action) => {
    setPendingAction(() => action);
    setAdminPassword('');
    setAdminAuthError('');
    setIsAdminAuthOpen(true);
  };

  const verifyAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminAuthOpen(false);
        if (pendingAction) pendingAction();
      } else {
        setAdminAuthError(data.message || 'Contraseña incorrecta');
      }
    } catch (err) {
      setAdminAuthError('Error de conexión');
    }
  };

  return (
    <div className="p-12 text-[var(--text-primary)] relative min-h-full">
      <div className="absolute top-0 right-0 w-1/2 h-96 bg-amber-600/5 blur-[120px] pointer-events-none" />
      
      <header className="flex justify-between items-center mb-12 relative z-10">
        <div>
          <h2 className="text-4xl font-light tracking-tight flex items-center gap-3 text-white mb-2">
            Productos y Menú
          </h2>
          <p className="text-gray-400 font-medium tracking-wide text-sm">Gestiona el catálogo de tu restaurante y panadería</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
            <button 
              onClick={() => setSortBy('name')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'name' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              A-Z
            </button>
            <button 
              onClick={() => setSortBy('price-asc')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'price-asc' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Precio $↑
            </button>
            <button 
              onClick={() => setSortBy('price-desc')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'price-desc' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Precio $↓
            </button>
          </div>
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <FolderPlus className="w-5 h-5" /> Nueva Categoría
          </button>
          <button 
            onClick={openNewModal}
            className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Plus className="w-5 h-5" /> Nuevo Producto
          </button>
        </div>
      </header>

      <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#121214] border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest font-bold">
              <tr>
                <th className="p-6 text-left">Producto</th>
                <th className="p-6 text-left">Código</th>
                <th className="p-6 text-left">Categoría</th>
                <th className="p-6 text-left">Precio</th>
                <th className="p-6 text-left">Tipo</th>
                <th className="p-6 text-left">Stock</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-amber-500 font-bold">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500 font-medium">No hay productos registrados</td></tr>
              ) : (
                [...products]
                .sort((a, b) => {
                  if (sortBy === 'name') return a.name.localeCompare(b.name);
                  if (sortBy === 'price-asc') return a.price - b.price;
                  if (sortBy === 'price-desc') return b.price - a.price;
                  return 0;
                })
                .map((p) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={p.id} className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-6 font-medium text-white">{p.name}</td>
                    <td className="p-6">
                      {p.barcode ? (
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-white/5 px-2.5 py-1 rounded-lg w-fit border border-white/5">
                          <Barcode className="w-3.5 h-3.5 text-gray-600" /> {p.barcode}
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-6 text-gray-400">{p.category?.name || 'N/A'}</td>
                    <td className="p-6 text-amber-500 font-bold whitespace-nowrap">{formatCurrency(p.price)}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-widest ${p.isWeight ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}>
                        {p.isWeight ? 'Peso' : 'Unid'}
                      </span>
                    </td>
                    <td className={`p-6 font-medium ${p.stock <= (parseInt(config['ops.lowStockThreshold']) || 5) ? 'text-red-500 animate-pulse' : 'text-gray-300'}`}>
                      {p.stock}
                      {p.stock <= (parseInt(config['ops.lowStockThreshold']) || 5) && (
                        <span className="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase">Bajo</span>
                      )}
                    </td>
                    <td className="p-6 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(p)}
                        className="text-gray-500 hover:text-amber-500 p-2 hover:bg-amber-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-500 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">{editId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                  <p className="text-sm text-gray-400 mt-1">Completa los datos del producto</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Nombre</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="Ej. Pan Francés" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Precio</label>
                    <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center justify-between">
                      Stock Actual
                      <span className="text-[9px] text-amber-500 font-black tracking-normal">REQUIERE PIN</span>
                    </label>
                    <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-[#121214] border border-amber-500/20 rounded-2xl p-4 text-amber-500 font-bold focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Código de Barras (Opcional)</label>
                  <div className="relative">
                    <input type="text" value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="Escanea o escribe el código" />
                    <Barcode className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold">Categoría</label>
                    <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider">
                      + Crear Nueva
                    </button>
                  </div>
                  <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none">
                    <option value="">Seleccione una categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-[#121214] p-5 rounded-2xl border border-white/5">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={formData.isWeight} onChange={e => setFormData({...formData, isWeight: e.target.checked})} className="peer sr-only" />
                      <div className="w-6 h-6 border-2 border-gray-500 rounded-md peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all"></div>
                      <svg className="absolute w-4 h-4 text-black opacity-0 peer-checked:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Se vende por peso (Ej. Kilos)</span>
                  </label>
                </div>

                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl mt-4 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-lg">
                  Guardar Producto
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-2xl border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Gestionar Categorías</h3>
                  <p className="text-sm text-gray-400 mt-1">Crea o elimina grupos de menú</p>
                </div>
                <button onClick={() => setIsCategoryModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Formulario */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-amber-500 font-black mb-4">Nueva Categoría</h4>
                  <form onSubmit={handleCategorySubmit} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Nombre</label>
                      <input required type="text" value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" placeholder="Ej. Bebidas Calientes" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Descripción (Opcional)</label>
                      <textarea value={categoryFormData.description} onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner resize-none" rows="2" placeholder="Cafés, tés, etc." />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-2xl mt-4 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-lg">
                      Guardar
                    </button>
                  </form>
                </div>

                {/* Lista */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-amber-500 font-black mb-4">Categorías Existentes</h4>
                  <div className="bg-[#121214] rounded-2xl border border-white/5 max-h-[300px] overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="p-8 text-center text-gray-500 text-sm">No hay categorías</p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {categories.map(c => {
                          const isGeneral = c.name.toLowerCase() === 'general';
                          const hasProducts = c._count?.products > 0;
                          return (
                            <div key={c.id} className="p-4 flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => handleReorder(c.id, 'up')} className="text-gray-600 hover:text-amber-500 transition-colors p-0.5">
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleReorder(c.id, 'down')} className="text-gray-600 hover:text-amber-500 transition-colors p-0.5">
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm flex items-center gap-2">
                                    {c.name}
                                    {hasProducts && (
                                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500">
                                        {c._count?.products} productos
                                      </span>
                                    )}
                                    {isGeneral && (
                                      <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-500 font-bold">
                                        Principal
                                      </span>
                                    )}
                                  </p>
                                  {c.description && <p className="text-gray-500 text-[10px]">{c.description}</p>}
                                </div>
                              </div>
                              <button 
                                onClick={() => !isGeneral && handleDeleteCategory(c.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  isGeneral 
                                    ? 'text-gray-700 cursor-not-allowed opacity-50' 
                                    : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                                }`}
                                title={isGeneral ? "La categoría principal no se puede eliminar" : (hasProducts ? "Eliminar y mover productos a General" : "Eliminar categoría")}
                                disabled={isGeneral}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Autenticación Admin */}
        {isAdminAuthOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-sm border border-red-500/20 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-light text-white">Autorización Requerida</h3>
                  <p className="text-xs text-gray-400 mt-1">Esta acción requiere PIN de administrador</p>
                </div>
                <button onClick={() => setIsAdminAuthOpen(false)} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={verifyAdmin} className="flex flex-col gap-4">
                <div>
                  <input 
                    type="password" 
                    required
                    autoFocus
                    value={adminPassword}
                    onChange={e => { setAdminPassword(e.target.value); setAdminAuthError(''); }}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-center text-2xl tracking-widest text-white focus:outline-none focus:border-red-500/50 transition-all shadow-inner" 
                    placeholder="••••" 
                  />
                  {adminAuthError && <p className="text-red-500 text-xs mt-2 text-center font-bold">{adminAuthError}</p>}
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  Confirmar Autorización
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={confirmData.confirmText}
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        type={confirmData.type || 'warning'}
      />
    </div>
  );
}
