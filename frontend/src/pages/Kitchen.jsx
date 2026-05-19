import React, { useState, useEffect } from 'react';
import { MonitorPlay, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

// 🔔 Sonido de alerta usando Web Audio API
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sequence = [880, 1100, 880]; // 3 beeps
    let time = ctx.currentTime;
    sequence.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.start(time); osc.stop(time + 0.18);
      time += 0.22;
    });
  } catch (e) { }
};

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({});
  const [newAlert, setNewAlert] = useState(false);

  useEffect(() => {
    fetchOrders();
    loadConfig();

    const socket = io();

    socket.on('orderCreated', (newOrder) => {
      if (newOrder.items && newOrder.items.length > 0) {
        setOrders(prev => [newOrder, ...prev]);
        // Solo sonar si está habilitado en config
        if (config['ui.alertSound'] !== 'false') {
          playBeep();
        }
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 3000);
      }
    });

    socket.on('orderUpdated', (updatedOrder) => {
      setOrders(prev => {
        if (updatedOrder.status === 'COMPLETED' || updatedOrder.status === 'SERVED') {
          return prev.filter(o => o.id !== updatedOrder.id);
        }
        return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      });
    });

    return () => socket.disconnect();
  }, [config]); // Re-bind socket listeners when config changes to have fresh alert settings

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      if (d.success) setConfig(d.config);
    } catch (e) { }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        // Filtrar solo las que no están completadas o servidas
        const activeOrders = data.orders.filter(o =>
          !['COMPLETED', 'SERVED'].includes(o.status)
        );
        setOrders(activeOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      // El socket orderUpdated se encargará de actualizar el UI
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
            Kitchen Display <span className="font-bold text-amber-500">System</span>
          </h2>
          <p className="text-gray-400 font-medium tracking-wide text-sm">Gestión de comandas en tiempo real</p>
        </div>
        {newAlert && (
          <div className="flex items-center gap-2 bg-amber-500 text-black px-5 py-2.5 rounded-2xl font-bold text-sm animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            🔔 ¡Nueva comanda!
          </div>
        )}
      </header>

      {loading ? (
        <div className="text-amber-500 text-center relative z-10 font-bold">Cargando órdenes...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white/[0.03] backdrop-blur-md p-16 text-center rounded-[2.5rem] border border-white/5 shadow-2xl relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 opacity-50 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium text-lg tracking-wide">No hay comandas pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start relative z-10">
          {orders.map(order => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={order.id}
              className={`bg-white/[0.03] backdrop-blur-md p-8 rounded-3xl border transition-all shadow-2xl relative overflow-hidden group ${order.status === 'PREPARING' ? 'border-amber-500/30' : 'border-white/5'
                }`}
            >
              {order.status === 'PREPARING' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 pointer-events-none" />
              )}

              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6 relative z-10">
                <div>
                  <h3 className="text-2xl font-light text-white mb-1">Comanda <span className="font-bold">#{order.id}</span></h3>
                  <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">
                    {order.table ? `Mesa ${order.table.name}` : 'Para Llevar'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest ${order.status === 'PREPARING' ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-gray-400'
                    }`}>
                    {order.status}
                  </span>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8 min-h-[120px] relative z-10">
                {order.items.map(item => (
                  <div key={item.id} className="flex flex-col gap-1 bg-[#121214] p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">{item.quantity}</div>
                      <span className="flex-1 text-gray-300 font-medium">{item.product.name}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-blue-300 italic pl-12">📝 {item.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 relative z-10">
                {order.status === 'PENDING' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  >
                    Preparar Comanda
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'SERVED')}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                  >
                    Entregado
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
