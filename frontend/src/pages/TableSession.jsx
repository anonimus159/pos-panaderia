import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, ArrowRight, DollarSign, CreditCard, Banknote, Landmark, X, Users, ArrowLeft, Printer, AlertTriangle, Barcode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { printComanda } from '../utils/printComanda';
import { formatCurrency } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';

export default function TableSession() {
  const { id: tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ticket para ítems nuevos que aún no se envían a cocina
  const [newTicket, setNewTicket] = useState([]);
  const [search, setSearch] = useState('');
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    paymentMethod: 'CASH'
  });
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Propina
  const [tipValue, setTipValue] = useState('');

  // División de cuenta
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { amount: '', tip: '', method: 'CASH' },
    { amount: '', tip: '', method: 'CASH' },
  ]);

  // Descuento
  const [discountValue, setDiscountValue] = useState('');
  const [discountType,  setDiscountType]  = useState('FIXED');
  const [discountAuth,  setDiscountAuth]  = useState('');

  // Nota activa
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText,      setNoteText]      = useState('');

  // Admin Auth States
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Config para pagos electrónicos
  const [config, setConfig] = useState({});
  const [isScannerCheckout, setIsScannerCheckout] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price-asc', 'price-desc'

  // Confirm Modal State
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // --- CÁLCULOS DE TICKET ---
  let activeTicketItems = [];
  if (table?.orders) {
    table.orders
      .filter(order => !['COMPLETED', 'CANCELLED'].includes(order.status))
      .forEach(order => {
        order.items?.forEach(item => {
          if (!item.product) return;
          activeTicketItems.push({ ...item });
        });
      });
  }
  const newTotal    = (newTicket || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const activeTotal = (activeTicketItems || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const subtotalBruto = newTotal + activeTotal;

  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'PERCENT'
    ? (subtotalBruto * discountNum) / 100
    : Math.min(discountNum, subtotalBruto);
  const grandTotal = Math.max(subtotalBruto - discountAmount, 0);
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchData();
    loadConfig();

    const socket = io();

    // Recarga completa en cualquier cambio relevante de esta mesa o sus órdenes
    const handleRefresh = (data) => {
      // Si el evento incluye tableId, solo recargar si es esta mesa
      if (data && data.tableId !== undefined) {
        if (data.tableId === parseInt(tableId)) fetchData();
      } else {
        // Eventos sin tableId (tableUpdated, table_updated, etc.) siempre recargan
        fetchData();
      }
    };

    socket.on('new_order',            handleRefresh);
    socket.on('orderCreated',         handleRefresh);
    socket.on('orderUpdated',         handleRefresh);
    socket.on('order_status_updated', handleRefresh);
    socket.on('tableUpdated',         handleRefresh);
    socket.on('table_updated',        handleRefresh);
    socket.on('product_updated',      handleRefresh);

    return () => socket.disconnect();
  }, [tableId]);

  // Lógica de Escáner de Código de Barras
  useEffect(() => {
    let lastKeyTime = Date.now();
    let buffer = '';

    const handleKeyDown = (e) => {
      if (isPaymentModalOpen || isAdminAuthOpen) return;
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = '';

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const product = products.find(p => p.barcode === buffer);
          if (product) addToNewTicket(product);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, isPaymentModalOpen, isAdminAuthOpen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'true') {
      setIsScannerCheckout(true);
      setIsPaymentModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tableRes, prodRes, catRes] = await Promise.all([
        fetch(`/api/tables/${tableId}`),
        fetch('/api/products'),
        fetch('/api/products/categories')
      ]);

      if (!tableRes.ok) {
        const text = await tableRes.text();
        console.error('Respuesta no válida del servidor:', text.substring(0, 100));
        throw new Error(`Error ${tableRes.status}: El servidor no respondió con datos válidos.`);
      }
      
      const tableData = await tableRes.json();
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      
      if (tableData.success) {
        setTable(tableData.table);
      } else {
        throw new Error(tableData.message || 'La mesa no pudo ser cargada');
      }

      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
    } catch (err) {
      console.error('Error fetching data from:', `/api/tables/${tableId}`, err);
      setError(`${err.message} (URL: /api/tables/${tableId})`);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      if (d.success) setConfig(d.config);
    } catch(e) { console.error(e); }
  };

  const addToNewTicket = (product) => {
    setNewTicket(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
        );
      }
      return [...prev, { ...product, quantity: 1, subtotal: product.price, notes: '' }];
    });
  };

  const saveNote = (id) => {
    setNewTicket(prev => prev.map(i => i.id === id ? { ...i, notes: noteText } : i));
    setEditingNoteId(null);
    setNoteText('');
  };

  const openNote = (item) => {
    setEditingNoteId(item.id);
    setNoteText(item.notes || '');
  };

  const updateQuantity = (id, change) => {
    setNewTicket(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + change;
        return newQ > 0 ? { ...item, quantity: newQ, subtotal: newQ * item.price } : item;
      }
      return item;
    }));
  };

  const removeFromTicket = (id) => {
    setNewTicket(prev => prev.filter(item => item.id !== id));
  };

  const removeOrderedItem = (itemId) => {
    setConfirmData({
      isOpen: true,
      title: '¿Eliminar producto?',
      message: 'Se eliminará este ítem de la orden y se restaurará el stock del producto y sus ingredientes automáticamente.',
      confirmText: 'Sí, eliminar',
      onConfirm: () => {
        requestAdminAuth(async () => {
          try {
            const res = await fetch(`/api/orders/items/${itemId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              fetchData();
            } else {
              alert(data.message || 'Error al eliminar el ítem');
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


  const sendComanda = async () => {
    if (newTicket.length === 0) return;
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          type: 'DINE_IN',
          total: newTotal,
          items: newTicket.map(item => ({
            productId: item.id,
            quantity:  item.quantity,
            price:     item.price,
            subtotal:  item.subtotal,
            notes:     item.notes || null
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        const kitchenItems = newTicket;
        if (kitchenItems.length > 0) {
          printComanda({
            tableName: table?.name || `Mesa ${tableId}`,
            items: kitchenItems.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal, notes: i.notes })),
            type: 'COCINA',
            orderNumber: data.order?.id
          });
        }
        setNewTicket([]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckoutClick = () => {
    if (grandTotal === 0) return;
    loadConfig();
    setIsPaymentModalOpen(true);
  };

  const processPayment = async () => {
    try {
      const tipNum = parseFloat(tipValue) || 0;
      // Construir payload: split o pago único
      const paymentsPayload = splitMode
        ? splitPayments.filter(p => parseFloat(p.amount) > 0).map(p => ({
            amount: parseFloat(p.amount),
            tip:    parseFloat(p.tip || 0),
            method: p.method
          }))
        : null;

      const res = await fetch(`/api/tables/${tableId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method:       paymentMethod,
          totalNew:     newTotal,
          tip:          tipNum,
          discount:     discountAmount,
          discountType: discountAmount > 0 ? discountType : null,
          discountAuth: discountAuth || null,
          payments:     paymentsPayload,
          autoFree:     config['ops.autoFreeTable'] === 'true',
          items: newTicket.map(item => ({
            productId: item.id,
            quantity:  item.quantity,
            price:     item.price,
            subtotal:  item.subtotal,
            notes:     item.notes || null
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        printComanda({
          tableName: table?.name || `Mesa ${tableId}`,
          items: [...activeTicketItems.map(i => ({
            name: i.product?.name || i.name, quantity: i.quantity, subtotal: i.subtotal
          })), ...newTicket.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal }))],
          type:      'TICKET',
          total:     grandTotal + tipNum,
          payMethod: splitMode ? 'DIVIDIDA' : paymentMethod,
          discount:  discountAmount > 0 ? discountAmount : null,
          tip:       tipNum > 0 ? tipNum : null
        });
        setIsPaymentModalOpen(false);
        setNewTicket([]);
        if (config['ops.autoFreeTable'] === 'true') {
          navigate('/mesas');
        } else {
          fetchData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };


  const filteredProducts = products
    .filter(p => 
      (activeCategory === 'ALL' || p.categoryId === activeCategory) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0A0A0C]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mb-4" />
      <p className="text-gray-500 text-sm animate-pulse uppercase tracking-widest font-bold">Cargando mesa...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0A0A0C] p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-light text-white mb-2">Error de Carga</h2>
      <p className="text-gray-400 mb-8 max-w-xs">{error}</p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/mesas')} className="bg-white/5 text-white px-6 py-3 rounded-2xl font-bold border border-white/10">Volver</button>
        <button onClick={fetchData} className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-bold">Reintentar</button>
      </div>
    </div>
  );

  if (!table) return null;

  return (
    <div className="flex h-screen bg-[#0A0A0C] text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* Columna Izquierda: Menú y Agregar */}
      <div className={`flex-1 flex flex-col min-w-0 relative ${isMobileTicketOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Decorative Background Glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-amber-600/5 blur-[120px] pointer-events-none" />

        <div className="p-8 pb-4 relative z-10">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/mesas')} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-amber-500 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-light tracking-tight flex items-center gap-3 text-white">
                  {table.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${table.status === 'OCUPADA' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-gray-600'}`} />
                  <span className="text-sm font-medium text-gray-400">
                    {table.status === 'OCUPADA' ? 'Servicio Activo' : 'Mesa Disponible'}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative w-full md:w-72 mt-4 md:mt-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all backdrop-blur-md"
              />
            </div>
          </header>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide flex-1">
              <button 
                onClick={() => setActiveCategory('ALL')}
                className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'ALL' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                Menú Completo
              </button>
              {categories.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    activeCategory === c.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md ml-4">
              <button 
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${sortBy === 'name' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                A-Z
              </button>
              <button 
                onClick={() => setSortBy('price-asc')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${sortBy === 'price-asc' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                $↑
              </button>
              <button 
                onClick={() => setSortBy('price-desc')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${sortBy === 'price-desc' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                $↓
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 z-10 hide-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                key={p.id}
                onClick={() => addToNewTicket(p)}
                className="bg-white/[0.03] backdrop-blur-md p-5 rounded-3xl border border-white/5 text-left hover:bg-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col justify-between min-h-[140px] group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <div>
                  <h3 className="font-medium text-gray-100 line-clamp-2 text-lg mb-1">{p.name}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{p.isWeight ? 'Por Peso' : 'Unidad'}</p>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-amber-400 font-bold text-lg">{formatCurrency(p.price)}</span>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors text-white">
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Ticket (Check) */}
      <div className={`fixed inset-0 z-50 md:relative md:inset-auto md:flex md:w-[420px] bg-[#16161A] border-l border-white/5 flex-col shadow-2xl transition-all duration-300 ${
        isMobileTicketOpen ? 'flex' : 'hidden'
      }`}>
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent shrink-0">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">Cuenta Actual</h3>
            <div className="text-xl md:text-2xl font-light text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Detalle de Mesa
            </div>
          </div>
          <button 
            onClick={() => setIsMobileTicketOpen(false)}
            className="md:hidden w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {/* Consumo Confirmado */}
          {activeTicketItems.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Consumido</span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>
              <div className="space-y-4">
                {activeTicketItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400">
                      {item.quantity}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-300">{item.product?.name || 'Producto Eliminado'}</h4>
                      <div className="text-gray-500 text-xs">{formatCurrency(item.price)} c/u</div>
                    </div>
                    <div className="font-medium text-gray-300 text-sm">
                      {formatCurrency(item.subtotal)}
                    </div>
                    <button 
                      onClick={() => removeOrderedItem(item.id)}
                      className="text-gray-600 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Eliminar de la orden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por Enviar */}
          {newTicket.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-amber-500/20" />
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Nuevos Pedidos</span>
                <div className="h-[1px] flex-1 bg-amber-500/20" />
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {newTicket.map(item => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="flex flex-col bg-amber-500/5 rounded-2xl border border-amber-500/10 overflow-hidden">
                      <div className="flex gap-3 items-center p-3">
                        <div className="flex items-center gap-1 bg-[#121214] rounded-lg p-1 border border-white/5">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate text-sm">{item.name}</h4>
                          <div className="text-amber-500 font-bold text-sm">{formatCurrency(item.subtotal)}</div>
                        </div>
                        <button onClick={() => openNote(item)} title="Agregar nota"
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-xs font-bold ${
                            item.notes ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-500 hover:text-gray-300'
                          }`}>
                          📝
                        </button>
                        <button onClick={() => removeFromTicket(item.id)} className="w-8 h-8 flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Nota inline */}
                      {editingNoteId === item.id ? (
                        <div className="px-3 pb-3 flex gap-2">
                          <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(item.id); if (e.key === 'Escape') { setEditingNoteId(null); } }}
                            placeholder="Ej: sin cebolla, término medio..."
                            className="flex-1 bg-[#121214] border border-blue-500/30 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
                          />
                          <button onClick={() => saveNote(item.id)} className="text-xs bg-blue-500 text-white px-3 py-2 rounded-xl font-bold">OK</button>
                        </div>
                      ) : item.notes ? (
                        <p className="px-3 pb-2 text-xs text-blue-300 italic">📝 {item.notes}</p>
                      ) : null}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeTicketItems.length === 0 && newTicket.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 mt-20">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <ShoppingCart className="w-10 h-10 opacity-50" />
              </div>
              <p className="font-medium tracking-wide">Mesa sin consumo</p>

              {/* Botón para liberar mesa atascada */}
              {table.status === 'OCUPADA' && (
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/tables/${tableId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'LIBRE' })
                      });
                      fetchData();
                    } catch(e) { console.error(e); }
                  }}
                  className="mt-6 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Liberar Mesa
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-[#1A1A1F] border-t border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <span className="text-gray-400 text-sm font-medium">Subtotal</span>
            <span className="text-white font-semibold">{formatCurrency(subtotalBruto)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-end">
              <span className="text-rose-400 text-sm font-medium">Descuento</span>
              <span className="text-rose-400 font-semibold">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-end border-t border-white/10 pt-2">
            <span className="text-gray-300 font-semibold">Total Mesa</span>
            <span className="text-3xl font-light text-white">{formatCurrency(grandTotal)}</span>
          </div>
          
          <div className="flex flex-col gap-3">
            {newTicket.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={sendComanda}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  Enviar {newTicket.length} a cocina <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const kitchenItems = newTicket;
                    if (kitchenItems.length === 0) return;
                    printComanda({
                      tableName: table?.name || `Mesa ${tableId}`,
                      items: kitchenItems.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
                      type: 'COCINA'
                    });
                  }}
                  title="Imprimir comanda sin enviar"
                  className="w-14 bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400 rounded-2xl flex items-center justify-center transition-all"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Reimprimir cuenta completa */}
            {activeTicketItems.length > 0 && (
              <button
                onClick={() => printComanda({
                  tableName: table?.name || `Mesa ${tableId}`,
                  items: activeTicketItems.map(i => ({ name: i.product?.name || i.name, quantity: i.quantity, subtotal: i.subtotal })),
                  type: 'TICKET',
                  total: activeTotal
                })}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir cuenta actual
              </button>
            )}

            <button 
              onClick={handleCheckoutClick}
              disabled={grandTotal === 0}
              className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all backdrop-blur-md"
            >
              <DollarSign className="w-5 h-5 text-emerald-400" /> Procesar Cobro
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pago (Estilizado) */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Cerrar Mesa</h3>
                  <p className="text-sm text-gray-400 mt-1">Selecciona el método de pago</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 flex-1">
                <div className="mb-6 bg-white/5 border border-white/10 p-5 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg leading-none">{table?.name || 'Mesa'}</h4>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Cobrando cuenta actual</p>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                  <div className="flex text-[8px] uppercase tracking-[0.2em] text-gray-500 font-black mb-1 px-3">
                    <span className="w-8">Cant</span>
                    <span className="flex-1">Descripción</span>
                    <span className="w-24 text-right">Monto</span>
                  </div>
                  {Object.values(
                    (table?.orders || [])
                      .filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status))
                      .flatMap(o => o.items)
                      .reduce((acc, item) => {
                        const key = item.product?.id || item.productId;
                        if (!acc[key]) {
                          acc[key] = { ...item };
                        } else {
                          acc[key].quantity += item.quantity;
                          acc[key].subtotal += item.subtotal;
                        }
                        return acc;
                      }, {})
                  ).map((item, idx) => (
                    <div key={idx} className="flex items-center text-xs bg-white/[0.02] hover:bg-white/[0.05] p-3 rounded-2xl border border-white/5 transition-colors">
                      <div className="w-8">
                        <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {item.quantity}x
                        </span>
                      </div>
                      <span className="flex-1 text-gray-300 font-medium truncate pr-4">{item.product?.name || 'Producto Eliminado'}</span>
                      <span className="w-24 text-right text-white font-bold tracking-tight whitespace-nowrap text-[10px]">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#121214] rounded-3xl p-6 border border-white/5 mb-6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Subtotal</span>
                  <span className="text-white">{formatCurrency(subtotalBruto)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-rose-400 text-sm uppercase tracking-widest font-bold">Descuento</span>
                    <span className="text-rose-400">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-2">
                  <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Total a Pagar</span>
                  <span className="text-2xl font-light text-white">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Descuento */}
              <div className="mb-6 bg-rose-500/5 border border-rose-500/15 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3">Descuento / Cortesía</p>
                <div className="flex gap-2">
                  <div className="flex rounded-xl overflow-hidden border border-white/10">
                    <button onClick={() => setDiscountType('FIXED')} className={`px-3 py-2 text-xs font-bold transition-colors ${ discountType === 'FIXED' ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400' }`}>$</button>
                    <button onClick={() => setDiscountType('PERCENT')} className={`px-3 py-2 text-xs font-bold transition-colors ${ discountType === 'PERCENT' ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400' }`}>%</button>
                  </div>
                  <input type="number" min="0" step="0.01" placeholder="0" value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="flex-1 bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                  <input type="text" placeholder="PIN admin" value={discountAuth}
                    onChange={e => setDiscountAuth(e.target.value)}
                    className="w-28 bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Propina */}
              <div className="mb-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Propina</p>
                </div>
                <input type="number" min="0" step="0.01" placeholder="$0.00" value={tipValue}
                  onChange={e => setTipValue(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
                {parseFloat(tipValue) > 0 && (
                  <p className="text-xs text-emerald-400 mt-2 font-medium">
                    Total con propina: ${(grandTotal + parseFloat(tipValue)).toFixed(2)}
                  </p>
                )}
              </div>

              {/* División de cuenta toggle */}
              <div className="mb-5">
                <button onClick={() => setSplitMode(v => !v)}
                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all border ${
                    splitMode ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}>
                  ✂️ {splitMode ? 'Cancelar división de cuenta' : 'Dividir cuenta entre personas'}
                </button>
              </div>

              {/* Split payments */}
              {splitMode ? (
                <div className="mb-6 space-y-3">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="bg-[#121214] border border-blue-500/20 rounded-2xl p-3 space-y-2">
                      <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Persona {idx + 1}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="Monto $" value={sp.amount}
                          onChange={e => setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))}
                          className="bg-[#1E1E26] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none" />
                        <input type="number" placeholder="Propina $" value={sp.tip}
                          onChange={e => setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, tip: e.target.value } : p))}
                          className="bg-[#1E1E26] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none" />
                        <select value={sp.method}
                          onChange={e => setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}
                          className="bg-[#1E1E26] border border-white/10 text-white rounded-xl px-2 py-2 text-sm focus:outline-none">
                          <option value="CASH">💵 Efectivo</option>
                          <option value="CARD">💳 Tarjeta</option>
                          <option value="TRANSFER">🏦 Transfer</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSplitPayments(prev => [...prev, { amount: '', tip: '', method: 'CASH' }])}
                    className="w-full py-2 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-blue-500/30 rounded-xl transition-colors">
                    + Agregar persona
                  </button>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-500">Asignado:</span>
                    <span className={`font-bold ${
                      Math.abs(splitPayments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0) - grandTotal) < 0.01
                        ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      ${splitPayments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0).toFixed(2)} / ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {[
                    ['CASH',     '💵', 'Efec.'],
                    ['CARD',     '💳', 'Tarj.'],
                    ['NEQUI',    '🟣', 'Nequi'],
                    ['DAVIPLATA','🔴', 'Davi.'],
                    ['TRANSFER', '🏦', 'Trans.'],
                  ].map(([m, icon, label]) => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`py-3 px-1 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[10px] font-bold border ${
                        paymentMethod === m ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                      }`}>
                      <span className="text-xl">{icon}</span>
                      <span className="uppercase tracking-wider truncate w-full text-center">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* QR Display for Nequi/Daviplata */}
              {(paymentMethod === 'NEQUI' || paymentMethod === 'DAVIPLATA') && !splitMode && (
                <div className="mb-6 p-5 bg-white/5 rounded-[2rem] border border-white/10 animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-3 ${paymentMethod === 'NEQUI' ? 'bg-[#700AD4]' : 'bg-[#E30613]'}`}>
                      {paymentMethod === 'NEQUI' ? 'N' : 'D'}
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">
                      Escanea para pagar con {paymentMethod === 'NEQUI' ? 'Nequi' : 'Daviplata'}
                    </p>
                    
                    <div className="bg-white p-3 rounded-3xl mb-4 shadow-2xl">
                      {config[`payments.${paymentMethod.toLowerCase()}.qr`] ? (
                        <img 
                          src={config[`payments.${paymentMethod.toLowerCase()}.qr`]} 
                          alt="QR Pago" 
                          className="w-40 h-40 object-contain"
                          onError={(e) => { e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=TRANSFERENCIA"; }}
                        />
                      ) : (
                        <div className="w-40 h-40 flex flex-col items-center justify-center text-gray-400 text-[10px] text-center p-4">
                          <AlertTriangle className="w-8 h-8 mb-2 text-amber-500" />
                          QR no configurado en ajustes
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-white font-medium text-sm">
                        Enviar a: <span className="text-amber-400 font-bold">{config[`payments.${paymentMethod.toLowerCase()}.phone`] || 'No configurado'}</span>
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        Verifica el nombre del negocio antes de enviar
                      </p>
                    </div>
                  </div>
                </div>
              )}

              </div>

              <button
                onClick={processPayment}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] text-lg"
              >
                <DollarSign className="w-6 h-6" /> Confirmar Pago
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Modal Autenticación Admin */}
      <AnimatePresence>
        {isAdminAuthOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
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
                  <p className="text-xs text-gray-400 mt-1">Borrar un producto requiere PIN</p>
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

      {/* Floating Button para Móvil */}
      {!isMobileTicketOpen && (newTicket.length > 0 || activeTicketItems.length > 0) && (
        <motion.button
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setIsMobileTicketOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-amber-500 text-black rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] z-40 flex items-center justify-center"
        >
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            {(newTicket.length + activeTicketItems.length) > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-amber-500">
                {newTicket.length + activeTicketItems.length}
              </span>
            )}
          </div>
        </motion.button>
      )}

      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={confirmData.confirmText}
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        type="warning"
      />
    </div>
  );
}
