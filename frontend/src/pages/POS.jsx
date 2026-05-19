import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, ArrowRight, DollarSign, CreditCard, Banknote, Landmark, X, Printer, CheckCircle, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { printComanda } from '../utils/printComanda';
import ConfirmModal from '../components/ConfirmModal';

import ModalCliente from '../components/ModalCliente';

export default function POS() {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [ticket, setTicket] = useState([]);
  const [search, setSearch] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tipValue, setTipValue] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [shouldInvoive, setShouldInvoice] = useState(false);
  const [clients, setClients] = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState({ loading: false, success: null, msg: '' });
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [config, setConfig] = useState({});

  // Admin Auth States
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  
  // Confirm Modal State
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // Note active
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText,      setNoteText]      = useState('');

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

  // Lógica de Escáner de Código de Barras
  useEffect(() => {
    let lastKeyTime = Date.now();
    let buffer = '';

    const handleKeyDown = (e) => {
      // Ignorar si hay modales abiertos o si el foco está en un input
      if (isPaymentModalOpen || isAdminAuthOpen || isAddingClient) return;
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // Si el tiempo entre teclas es > 50ms, probablemente es manual, resetear buffer
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const product = products.find(p => p.barcode === buffer);
          if (product) {
            addToTicket(product);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, isPaymentModalOpen, isAdminAuthOpen, isAddingClient]);

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
      
      const cliRes = await fetch('/api/clientes');
      const cliData = await cliRes.json();
      if (cliData.success) setClients(cliData.clientes);
    } catch (err) {
      console.error(err);
    }
  };

  // Sincronización en tiempo real
  useEffect(() => {
    const socket = io();
    
    socket.on('product_updated', () => fetchData());
    socket.on('category_updated', () => fetchData());
    socket.on('stock_updated', () => fetchData());
    socket.on('config_updated', () => loadConfig());

    return () => socket.disconnect();
  }, []);

  const addToTicket = (product) => {
    setTicket(prev => {
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
    setTicket(prev => prev.map(i => i.id === id ? { ...i, notes: noteText } : i));
    setEditingNoteId(null);
    setNoteText('');
  };

  const openNote = (item) => {
    setEditingNoteId(item.id);
    setNoteText(item.notes || '');
  };

  const updateQuantity = (id, change) => {
    setTicket(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + change;
        return newQ > 0 ? { ...item, quantity: newQ, subtotal: newQ * item.price } : item;
      }
      return item;
    }));
  };

  const removeFromTicket = (id) => {
    setConfirmData({
      isOpen: true,
      title: '¿Quitar del ticket?',
      message: '¿Estás seguro de que deseas eliminar este ítem de la venta actual?',
      confirmText: 'Quitar ítem',
      type: 'warning',
      onConfirm: () => {
        requestAdminAuth(() => {
          setTicket(prev => prev.filter(item => item.id !== id));
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

  const total           = ticket.reduce((sum, item) => sum + item.subtotal, 0);
  const tipNum          = parseFloat(tipValue) || 0;
  const totalConPropina = total + tipNum;

  const handleCheckoutClick = () => {
    if (ticket.length === 0) return;
    loadConfig();
    // Sugerir propina si está configurada y el campo está vacío
    if (!tipValue && config['ops.suggestedTip']) {
      const suggested = (total * parseFloat(config['ops.suggestedTip'])) / 100;
      setTipValue(suggested.toFixed(2));
    }
    setIsPaymentModalOpen(true);
  };

  const [lastInvoice, setLastInvoice] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);

  const resetPOS = () => {
    setTicket([]);
    setTipValue('');
    setSelectedClient(null);
    setShouldInvoice(false);
    setIsSuccess(false);
    setIsPaymentModalOpen(false);
    setInvoiceStatus({ loading: false, success: null, msg: '' });
    setLastInvoice(null);
  };

  const handlePrintFactura = (factData) => {
    printComanda({
      tableName:   'MOSTRADOR',
      items:       ticket.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
      type:        'TICKET',
      total:       totalConPropina,
      payMethod:   paymentMethod,
      tip:         tipNum > 0 ? tipNum : null,
      orderNumber: lastOrderId,
      factura:     factData
    });
  };

  const sendOrder = async () => {
    if (ticket.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TAKEAWAY',
          total,
          tip:           tipNum,
          paymentMethod,
          items: ticket.map(item => ({
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
        setLastOrderId(data.order?.id);
        
        // Imprimir Ticket de Venta (Resumen para el cliente)
        await printComanda({
          tableName:   'MOSTRADOR',
          items:       ticket.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
          type:        'TICKET',
          total:       totalConPropina,
          payMethod:   paymentMethod,
          tip:         tipNum > 0 ? tipNum : null,
          orderNumber: data.order?.id
        });

        // Imprimir Comanda de Cocina si hay productos que requieren preparación
        const kitchenItems = ticket;
        if (kitchenItems.length > 0) {
          await printComanda({
            tableName:   'MOSTRADOR',
            items:       kitchenItems.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
            type:        'COCINA',
            orderNumber: data.order?.id
          });
        }

        setIsSuccess(true);

        // Si se pidió factura electrónica DIAN
        if (shouldInvoive && selectedClient?.nit) {
          setInvoiceStatus({ loading: true, success: null, msg: 'Generando factura DIAN...' });
          try {
            const factRes = await fetch('/api/facturacion/generar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.order.id })
            });
            const factData = await factRes.json();
            if (factData.success) {
              setInvoiceStatus({ loading: false, success: true, msg: `Factura ${factData.factura.numeroFactura} generada y enviada al correo!` });
              setLastInvoice(factData.factura);
              // Re-imprimir automáticamente con formato factura
              handlePrintFactura(factData.factura);
              
              if (factData.factura.pdfUrl) window.open(factData.factura.pdfUrl, '_blank');
            } else {
              setInvoiceStatus({ loading: false, success: false, msg: factData.message || 'Error en DIAN' });
            }
          } catch (e) {
            setInvoiceStatus({ loading: false, success: false, msg: 'Error de conexión con servicio DIAN' });
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    (activeCategory === 'ALL' || p.categoryId === activeCategory) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const [clientToEdit, setClientToEdit] = useState(null);

  return (
    <div className="flex h-screen bg-transparent text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* Columna Izquierda: Menú y Agregar */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="p-8 pb-4 relative z-10">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-white/5 text-amber-500 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-light tracking-tight flex items-center gap-3 text-white">
                  Mostrador Rápido
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-medium text-gray-300">
                    Venta Directa / Para Llevar
                  </span>
                </div>
              </div>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar platillo..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all backdrop-blur-md"
              />
            </div>
          </header>
          
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            <button 
              onClick={() => setActiveCategory('ALL')}
              className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'ALL' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              Menú Completo
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCategory === c.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 z-10 hide-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                key={p.id}
                onClick={() => addToTicket(p)}
                className="bg-white/[0.03] backdrop-blur-md p-5 rounded-3xl border border-white/5 text-left hover:bg-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col justify-between min-h-[140px] group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-100 line-clamp-1 text-lg">{p.name}</h3>
                    {p.stock <= (parseFloat(config['ops.lowStockThreshold']) || 5) && (
                      <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">STOCK BAJO</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{p.isWeight ? 'Por Peso' : 'Unidad'} • Stock: {p.stock}</p>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-amber-400 font-bold text-xl">${p.price.toFixed(2)}</span>
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
      <div className="w-[420px] bg-[#16161A] border-l border-white/5 flex flex-col shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-1">Orden Actual</h3>
            <div className="text-2xl font-light text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Ticket de Venta
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {ticket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 mt-20">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <ShoppingCart className="w-10 h-10 opacity-50" />
              </div>
              <p className="font-medium tracking-wide">Ticket vacío</p>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-amber-500/20" />
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Consumo</span>
                <div className="h-[1px] flex-1 bg-amber-500/20" />
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {ticket.map(item => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={item.id} className="flex flex-col bg-amber-500/5 rounded-2xl border border-amber-500/10 overflow-hidden">
                      <div className="flex gap-3 items-center p-3">
                        <div className="flex items-center gap-1 bg-[#121214] rounded-lg p-1 border border-white/5">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate text-sm">{item.name}</h4>
                          <div className="text-amber-500 font-bold text-sm">${item.subtotal.toFixed(2)}</div>
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
                            placeholder="Ej: sin azúcar, leche deslactosada..."
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
        </div>

        <div className="p-8 bg-[#1A1A1F] border-t border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-400 font-medium tracking-wide">Total</span>
            <span className="text-4xl font-light text-white">${total.toFixed(2)}</span>
          </div>
          
          {ticket.length > 0 && (
            <button
              onClick={() => printComanda({
                tableName: 'MOSTRADOR',
                items: ticket.map(i => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
                type: 'COCINA'
              })}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-amber-400 hover:text-amber-300 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              <Printer className="w-4 h-4" /> Imprimir Comanda Cocina
            </button>
          )}

          <button 
            onClick={handleCheckoutClick}
            disabled={ticket.length === 0}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all backdrop-blur-md"
          >
            <DollarSign className="w-5 h-5 text-emerald-400" /> Procesar Cobro
          </button>
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
                  <h3 className="text-2xl font-light text-white">Cerrar Venta</h3>
                  <p className="text-sm text-gray-400 mt-1">Selecciona el método de pago</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 flex-1">
                <div className="bg-[#121214] rounded-3xl p-6 border border-white/5 mb-5">
                  <div className="max-h-52 overflow-y-auto pr-2 space-y-1.5 mb-6 scrollbar-thin scrollbar-thumb-white/10 border-b border-white/10 pb-4">
                    <div className="flex text-[8px] uppercase tracking-[0.2em] text-gray-500 font-black mb-3 px-3">
                      <span className="w-8">Cant</span>
                      <span className="flex-1">Descripción</span>
                      <span className="w-20 text-right">Monto</span>
                    </div>
                    {ticket.map(item => (
                      <div key={item.id} className="flex items-center text-[11px] bg-white/[0.02] hover:bg-white/[0.05] p-2.5 rounded-2xl border border-white/5 transition-colors">
                        <div className="w-8 text-amber-500 font-bold">{item.quantity}x</div>
                        <span className="flex-1 text-gray-300 truncate pr-2 font-medium">{item.name}</span>
                        <span className="w-20 text-right text-white font-bold tracking-tight">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Subtotal</span>
                    <span className="text-white">${total.toFixed(2)}</span>
                  </div>
                  {tipNum > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-emerald-400 text-sm uppercase tracking-widest font-bold">Propina</span>
                      <span className="text-emerald-400">+${tipNum.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-2">
                    <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Total a Pagar</span>
                    <span className="text-4xl font-light text-white">${totalConPropina.toFixed(2)}</span>
                  </div>
                </div>

                {!isSuccess ? (
                  <>
                    {/* Propina */}
                    <div className="mb-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Propina</p>
                      <input type="number" min="0" step="0.01" placeholder="$0.00" value={tipValue}
                        onChange={e => setTipValue(e.target.value)}
                        className="w-full bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-8">
                      {[
                        { m: 'CASH', icon: Banknote, label: 'Efect.' },
                        { m: 'CARD', icon: CreditCard, label: 'Tarj.' },
                        { m: 'NEQUI', icon: () => <span className="text-xl">🟣</span>, label: 'Nequi' },
                        { m: 'DAVIPLATA', icon: () => <span className="text-xl">🔴</span>, label: 'Davi.' },
                        { m: 'TRANSFER', icon: Landmark, label: 'Trans.' },
                      ].map(({ m, icon: Icon, label }) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-3 px-1 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[10px] font-bold border ${
                            paymentMethod === m ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="uppercase tracking-wider truncate w-full text-center">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* QR Display */}
                    {(paymentMethod === 'NEQUI' || paymentMethod === 'DAVIPLATA') && (
                      <div className="mb-6 p-5 bg-white/5 rounded-[2rem] border border-white/10 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-3 ${paymentMethod === 'NEQUI' ? 'bg-[#700AD4]' : 'bg-[#E30613]'}`}>
                            {paymentMethod === 'NEQUI' ? 'N' : 'D'}
                          </div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4">
                            Escanea para pagar con {paymentMethod === 'NEQUI' ? 'Nequi' : 'Daviplata'}
                          </p>
                          
                          <div className="bg-white p-2 rounded-2xl mb-4 shadow-2xl">
                            {config[`payments.${paymentMethod.toLowerCase()}.qr`] ? (
                              <img 
                                src={config[`payments.${paymentMethod.toLowerCase()}.qr`]} 
                                alt="QR Pago" 
                                className="w-32 h-32 object-contain"
                              />
                            ) : (
                              <div className="w-32 h-32 flex flex-col items-center justify-center text-gray-400 text-[8px] text-center p-2">
                                QR no configurado en ajustes
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-white font-medium text-xs">
                              Enviar a: <span className="text-amber-400 font-bold">{config[`payments.${paymentMethod.toLowerCase()}.phone`] || 'No configurado'}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cliente y Factura Electrónica */}
                    <div className="mb-8 space-y-4">
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Cliente / Receptor</p>
                          {shouldInvoive && !selectedClient?.nit && (
                            <span className="text-[10px] text-rose-400 font-bold animate-pulse">! REQUIERE NIT</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select 
                            value={selectedClient?.id || ''} 
                            onChange={e => {
                              const c = clients.find(cl => cl.id === parseInt(e.target.value));
                              setSelectedClient(c);
                            }}
                            className="flex-1 bg-[#121214] border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                          >
                            <option value="">Cliente Ocasional / Sin Cliente</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} {c.nit ? `(${c.nit})` : ''}</option>
                            ))}
                          </select>
                          {selectedClient && (
                            <button 
                              onClick={() => {
                                setClientToEdit(selectedClient);
                                setIsAddingClient(true);
                              }}
                              className="w-10 h-10 bg-white/5 hover:bg-white/10 text-amber-500 rounded-xl flex items-center justify-center transition-all border border-white/10"
                              title="Editar información del cliente"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setClientToEdit(null);
                              setIsAddingClient(true);
                            }}
                            className="w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/20"
                            title="Registrar nuevo cliente"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group mt-3">
                          <div className="relative">
                            <input type="checkbox" checked={shouldInvoive} onChange={e => setShouldInvoice(e.target.checked)} className="sr-only" />
                            <div className={`w-10 h-6 rounded-full transition-colors ${shouldInvoive ? 'bg-blue-500' : 'bg-white/10'}`} />
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${shouldInvoive ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${shouldInvoive ? 'text-blue-400' : 'text-gray-500'}`}>
                            Solicitar Factura Electrónica DIAN
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2">¡Venta Exitosa!</h4>
                    <p className="text-gray-400 mb-8">El ticket ha sido enviado a la impresora.</p>
                    
                    {invoiceStatus.msg && (
                      <div className={`mb-8 p-4 rounded-2xl text-sm font-bold border ${
                        invoiceStatus.success === true ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        invoiceStatus.success === false ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {invoiceStatus.msg}
                      </div>
                    )}

                    {lastInvoice && (
                      <button 
                        onClick={() => handlePrintFactura(lastInvoice)}
                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all mb-3 shadow-lg shadow-blue-500/20"
                      >
                        <Printer className="w-5 h-5" /> Re-imprimir Factura
                      </button>
                    )}
                    
                    <button 
                      onClick={resetPOS}
                      className="w-full bg-white text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-gray-200 text-lg shadow-xl"
                    >
                      <Plus className="w-6 h-6" /> Nueva Venta
                    </button>
                  </div>
                )}
              </div>

              {!isSuccess && (
                <button 
                  onClick={sendOrder}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] text-lg"
                >
                  <DollarSign className="w-6 h-6" /> Confirmar Pago y Enviar
                </button>
              )}
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
      {isAddingClient && (
        <ModalCliente 
          cliente={clientToEdit}
          onClose={() => { setIsAddingClient(false); setClientToEdit(null); }}
          onSaved={(newClient) => {
            if (clientToEdit) {
              setClients(prev => prev.map(c => c.id === newClient.id ? newClient : c));
            } else {
              setClients(prev => [newClient, ...prev]);
            }
            setSelectedClient(newClient);
            if (newClient.nit) setShouldInvoice(true);
            setClientToEdit(null);
          }}
        />
      )}

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

