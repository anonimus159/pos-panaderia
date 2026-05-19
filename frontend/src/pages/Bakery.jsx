import React, { useState, useEffect } from 'react';
import { ChefHat, ListPlus, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Bakery() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isMermaModalOpen, setIsMermaModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

  // Form States
  const [mermaData, setMermaData] = useState({ ingredientId: '', quantity: '', reason: '' });
  const [recipeData, setRecipeData] = useState({ productId: '', ingredientId: '', quantity: '' });
  const [productionData, setProductionData] = useState({ productId: '', batches: 1 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recRes, ingRes, prodRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/ingredients'),
        fetch('/api/products')
      ]);
      const recData = await recRes.json();
      const ingData = await ingRes.json();
      const prodData = await prodRes.json();
      
      if (recData.success) {
        // Group recipes by product
        const grouped = recData.recipes.reduce((acc, curr) => {
          if (!acc[curr.productId]) {
            acc[curr.productId] = { id: curr.productId, name: curr.product.name, product: curr.product.name, cost: 0, ingredients: 0 };
          }
          acc[curr.productId].ingredients += 1;
          // Approximate cost (simplification)
          acc[curr.productId].cost += curr.quantity * 50; 
          return acc;
        }, {});
        setRecipes(Object.values(grouped));
      }
      if (ingData.success) setIngredients(ingData.ingredients);
      if (prodData.success) setProducts(prodData.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMermaSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mermaData, type: 'MERMA' })
      });
      const data = await res.json();
      if (data.success) {
        setIsMermaModalOpen(false);
        setMermaData({ ingredientId: '', quantity: '', reason: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecipeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
      });
      const data = await res.json();
      if (data.success) {
        setIsRecipeModalOpen(false);
        setRecipeData({ productId: '', ingredientId: '', quantity: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/production/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionData)
      });
      const data = await res.json();
      if (data.success) {
        setIsProductionModalOpen(false);
        setProductionData({ productId: '', batches: 1 });
        fetchData(); // reload
      } else {
        alert(data.message || 'Error en producción');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-12 text-[var(--text-primary)] relative min-h-full">
      <div className="absolute top-0 right-0 w-1/2 h-96 bg-amber-600/5 blur-[120px] pointer-events-none" />
      
      <header className="flex justify-between items-center mb-12 relative z-10">
        <div>
          <h2 className="text-4xl font-light tracking-tight flex items-center gap-3 text-white mb-2">
            Producción y Panadería
          </h2>
          <p className="text-gray-400 font-medium tracking-wide text-sm">Gestión de recetas, órdenes de producción y mermas</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsMermaModalOpen(true)}
            className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <Activity className="w-5 h-5" /> Registrar Merma
          </button>
          <button 
            onClick={() => setIsRecipeModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <ListPlus className="w-5 h-5" /> Nueva Receta
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
        <div 
          onClick={() => setIsProductionModalOpen(true)}
          className="bg-white/[0.03] backdrop-blur-md p-10 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/30 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-amber-500 shadow-inner">
            <ChefHat className="w-10 h-10 text-amber-500 group-hover:text-black transition-colors" />
          </div>
          <h3 className="text-2xl font-light text-white mb-2">Iniciar Producción</h3>
          <p className="text-gray-500 text-center font-medium">Descuenta insumos y genera producto terminado automáticamente</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-md p-10 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Productos con Receta</h3>
          <p className="text-6xl font-light text-white">{recipes.length}</p>
        </div>
      </div>

      <h3 className="text-xl font-light mb-6 text-white tracking-wide relative z-10">Recetas Configuradas</h3>
      <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#121214] border-b border-white/5 text-gray-400 text-xs uppercase tracking-widest font-bold">
              <tr>
                <th className="p-6">Producto Final</th>
                <th className="p-6">Costo Estimado</th>
                <th className="p-6">Insumos Relacionados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="3" className="p-8 text-center text-amber-500 font-bold">Cargando...</td></tr>
              ) : recipes.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-gray-500 font-medium">No hay recetas configuradas</td></tr>
              ) : (
                recipes.map((r) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={r.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="p-6 font-medium text-white">{r.product}</td>
                    <td className="p-6 font-bold text-amber-500">${r.cost.toFixed(2)}</td>
                    <td className="p-6 text-gray-400 font-medium">{r.ingredients} Insumos</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {/* Modal: Registrar Merma */}
        {isMermaModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Registrar Merma</h3>
                  <p className="text-sm text-gray-400 mt-1">Reporta pérdida de inventario</p>
                </div>
                <button onClick={() => setIsMermaModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleMermaSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Insumo a reportar</label>
                  <select required value={mermaData.ingredientId} onChange={e => setMermaData({...mermaData, ingredientId: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-red-500/50 transition-all shadow-inner appearance-none">
                    <option value="">Seleccione un insumo</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Cantidad Perdida</label>
                  <input required type="number" step="0.01" value={mermaData.quantity} onChange={e => setMermaData({...mermaData, quantity: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-red-500/50 transition-all shadow-inner" placeholder="Ej. 1.5" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Motivo</label>
                  <input required type="text" value={mermaData.reason} onChange={e => setMermaData({...mermaData, reason: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-red-500/50 transition-all shadow-inner" placeholder="Ej. Caducidad, Caída, etc." />
                </div>
                <button type="submit" className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl mt-4 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] text-lg">Guardar Merma</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Nueva Receta */}
        {isRecipeModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Añadir a Receta</h3>
                  <p className="text-sm text-gray-400 mt-1">Vincula un insumo a un producto</p>
                </div>
                <button onClick={() => setIsRecipeModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleRecipeSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Producto Final</label>
                  <select required value={recipeData.productId} onChange={e => setRecipeData({...recipeData, productId: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none">
                    <option value="">Seleccione un producto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Insumo Requerido</label>
                  <select required value={recipeData.ingredientId} onChange={e => setRecipeData({...recipeData, ingredientId: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none">
                    <option value="">Seleccione un insumo</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Cantidad Necesaria</label>
                  <input required type="number" step="0.001" value={recipeData.quantity} onChange={e => setRecipeData({...recipeData, quantity: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" placeholder="Cantidad del insumo" />
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl mt-4 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-lg">Vincular a Receta</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Producción en Lote */}
        {isProductionModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Producción</h3>
                  <p className="text-sm text-gray-400 mt-1">Generar stock final</p>
                </div>
                <button onClick={() => setIsProductionModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleProductionSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Producto a fabricar</label>
                  <select required value={productionData.productId} onChange={e => setProductionData({...productionData, productId: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner appearance-none">
                    <option value="">Seleccione el producto</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.product}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Cantidad a Producir</label>
                  <input required type="number" min="1" value={productionData.batches} onChange={e => setProductionData({...productionData, batches: e.target.value})} className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl mt-4 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] text-lg">Confirmar Producción</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
