import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Clock, CreditCard, Banknote, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

export default function Caja() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, TRANSFER

  useEffect(() => {
    fetchOrders();

    const socket = io();

    // Recargar órdenes ante cualquier cambio de otro dispositivo
    const refresh = () => fetchOrders();
    socket.on('new_order',            refresh);
    socket.on('orderCreated',         refresh);
    socket.on('orderUpdated',         refresh);
    socket.on('order_status_updated', refresh);
    socket.on('tableUpdated',         refresh);
    socket.on('table_updated',        refresh);

    return () => socket.disconnect();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        // Mostrar órdenes activas que NO hayan sido pagadas (sales.length === 0)
        const activeOrders = data.orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status) && (!o.sales || o.sales.length === 0));
        setOrders(activeOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: paymentMethod })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(null);
        // Socket orderUpdated event will handle removing it from the list
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-[var(--text-primary)]">
      {/* Listado de Órdenes */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <header className="mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-3 text-amber-600">
            <DollarSign className="w-8 h-8" />
            Caja y Cobros
          </h2>
          <p className="text-amber-500/80 mt-1">Selecciona una orden para registrar su pago</p>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-amber-500">Cargando órdenes...</div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-amber-200/30">
            <CheckCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl">No hay cuentas pendientes por cobrar</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-2 content-start">
            {orders.map(order => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`glass-panel p-5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all shadow-lg ${
                  selectedOrder?.id === order.id 
                    ? 'border-amber-500 bg-amber-600/20 shadow-amber-900/40' 
                    : 'border-amber-500/20 hover:border-amber-500/50 hover:bg-black/20 shadow-black/20'
                }`}
              >
                <div className="flex justify-between items-start mb-4 border-b border-amber-500/10 pb-3">
                  <div>
                    <h3 className="font-bold text-amber-50 text-lg">Orden #{order.id}</h3>
                    <p className="text-sm text-amber-200/70">
                      {order.table ? `Mesa: ${order.table.name}` : 'Para Llevar'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${
                    order.status === 'SERVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    order.status === 'READY' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-auto flex justify-between items-end">
                  <div className="text-xs text-amber-200/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="text-amber-500 font-black text-xl">${order.total.toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Panel de Cobro */}
      <div className="w-96 glass-panel border-l border-amber-500/20 flex flex-col h-full rounded-none">
        <div className="p-6 border-b border-amber-500/20 bg-amber-900/10">
          <h3 className="text-xl font-bold mb-1 text-amber-50">Detalle de Cuenta</h3>
          <p className="text-sm text-amber-500 font-medium">
            {selectedOrder 
              ? (selectedOrder.table ? `Mesa: ${selectedOrder.table.name}` : 'Para Llevar')
              : 'Seleccione una orden'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {!selectedOrder ? (
            <div className="h-full flex flex-col items-center justify-center text-amber-200/30 text-center">
              <DollarSign className="w-12 h-12 mb-4 opacity-50" />
              <p>Selecciona una orden de la izquierda<br/>para procesar el cobro</p>
            </div>
          ) : (
            selectedOrder.items.map(item => (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={item.id} className="flex justify-between items-center border-b border-amber-500/10 pb-3">
                <div>
                  <h4 className="font-semibold text-sm text-amber-50 flex items-center gap-2">
                    <span className="text-amber-500 font-bold">{item.quantity}x</span> {item.product.name}
                  </h4>
                  <span className="text-xs text-amber-200/50">
                    {item.product.requiresPrep ? 'Cocina' : 'Vitrina'}
                  </span>
                </div>
                <div className="text-amber-500 font-bold text-sm">${item.subtotal.toFixed(2)}</div>
              </motion.div>
            ))
          )}
        </div>

        {selectedOrder && (
          <div className="p-6 border-t border-amber-500/20 bg-amber-900/20">
            <h4 className="text-amber-200/70 mb-3 font-medium text-sm">Método de Pago</h4>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                  paymentMethod === 'CASH' ? 'bg-amber-600 text-amber-50 border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-black/20 text-amber-200/70 border-amber-500/20 hover:bg-black/40'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-bold">Efectivo</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                  paymentMethod === 'CARD' ? 'bg-amber-600 text-amber-50 border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-black/20 text-amber-200/70 border-amber-500/20 hover:bg-black/40'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-bold">Tarjeta</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                  paymentMethod === 'TRANSFER' ? 'bg-amber-600 text-amber-50 border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-black/20 text-amber-200/70 border-amber-500/20 hover:bg-black/40'
                }`}
              >
                <Landmark className="w-5 h-5" />
                <span className="text-xs font-bold">Transf.</span>
              </button>
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-amber-200/70 font-medium text-lg">Total a cobrar</span>
              <span className="text-4xl font-black text-amber-500">${selectedOrder.total.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={handlePay}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 border border-emerald-500"
            >
              <DollarSign className="w-6 h-6" /> Procesar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
