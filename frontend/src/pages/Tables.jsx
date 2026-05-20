import React, { useState, useEffect } from 'react';
import { Plus, Users, ShoppingCart, X, Clock, Utensils, RefreshCw, CalendarDays, Barcode, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

function tiempoTranscurrido(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function Tables() {
  const [tables, setTables]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData]     = useState({ name: '', capacity: 4 });
  const [vista, setVista]           = useState('visual'); // 'visual' | 'lista'
  const [tableToDelete, setTableToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTables();
    const socket = io();
    const handleUpdate = () => {
      fetchTables();
    };
    socket.on('tableUpdated', handleUpdate);
    socket.on('table_updated', handleUpdate);
    socket.on('table_deleted', handleUpdate);
    return () => socket.disconnect();
  }, []);

  const printVintageLabel = (table) => {
    const win = window.open('', '_blank', 'width=500,height=800');
    // Aseguramos que el ID de la mesa tenga ceros a la izquierda (ej. 01)
    const tableNum = String(table.id).padStart(2, '0');
    
    win.document.write(`
      <html>
        <head>
          <title>Mesa ${tableNum}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Montserrat:wght@400;700;900&display=swap');
            body { 
              margin: 0; padding: 0; 
              display: flex; justify-content: center; align-items: center; 
              background: #f0f0f0; font-family: 'Montserrat', sans-serif;
              height: 100vh;
            }
            .card-outer {
              width: 7.5cm; height: 10cm;
              background: #4b168c;
              border-radius: 0.8cm;
              padding: 0.2cm;
              display: flex; justify-content: center; align-items: center;
              box-shadow: 0 10px 20px rgba(0,0,0,0.3);
              box-sizing: border-box;
            }
            .card-inner {
              width: 100%; height: 100%;
              background: #fdfbf7;
              border-radius: 0.6cm;
              border: 2px solid #ffd700;
              display: flex; flex-direction: column; align-items: center;
              padding: 0.2cm 0.2cm;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
            }
            /* Wheat Background watermarks scaled */
            .card-inner::before {
              content: '🌾';
              position: absolute; left: -10px; top: 40%; font-size: 60px; opacity: 0.05; transform: rotate(15deg);
            }
            .card-inner::after {
              content: '🌾';
              position: absolute; right: -10px; top: 40%; font-size: 60px; opacity: 0.05; transform: rotate(-15deg);
            }
            
            .header-spacer { height: 0.2cm; }
            
            .logo-img { width: 2.2cm; height: auto; margin-bottom: 0.1cm; z-index: 1; }
            
            .bakery-name {
              font-family: 'Cinzel', serif;
              font-size: 8px; color: #4b168c;
              font-weight: 900; letter-spacing: 1px;
              margin-bottom: 1px;
            }
            .grecia-title {
              font-family: 'Cinzel', serif;
              font-size: 18px; color: #4b168c;
              font-weight: 900; line-height: 0.8;
              margin-bottom: 0.1cm;
            }
            
            .divider { color: #ffd700; font-size: 8px; margin: 1px 0; letter-spacing: 2px; }
            
            .mesa-label {
              font-size: 10px; font-weight: 900; color: #4b168c;
              display: flex; items-center; gap: 3px;
              margin-top: 1px;
            }
            .mesa-label::before, .mesa-label::after { content: '—'; color: #ffd700; }
            
            .mesa-num {
              font-size: 42px; font-weight: 900; color: #4b168c;
              line-height: 1; margin: 0;
            }
            
            .ribbon {
              background: #4b168c;
              color: white;
              border: 1px double #ffd700;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 10px; font-weight: 900;
              text-transform: uppercase;
              margin: 0.1cm 0;
              display: flex; align-items: center; gap: 5px;
              width: 85%; justify-content: center;
              box-sizing: border-box;
            }
            
            .barcode-box {
              width: 100%;
              background: white;
              border: 1px solid #ffd700;
              border-radius: 8px;
              padding: 4px;
              box-sizing: border-box;
              display: flex; flex-direction: column; align-items: center;
              margin-top: auto;
            }
            
            @media print {
              body { background: white; padding: 0; }
              .card-outer { -webkit-print-color-adjust: exact; box-shadow: none; border: none; }
              .card-inner { -webkit-print-color-adjust: exact; }
              .ribbon { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="card-outer">
            <div class="card-inner">
              <div class="header-hole"></div>
              <img src="/logo_bakery.png" class="logo-img" alt="Logo Grecia" />
              <div class="bakery-name">PANADERÍA</div>
              <div class="grecia-title">GRECIA</div>
              <div class="divider">✧ ✦ ✧</div>
              <div class="mesa-label">MESA</div>
              <div class="mesa-num">${tableNum}</div>
              <div class="ribbon">
                <span>🛒</span> PAGAR EN CAJA
              </div>
              <div class="barcode-box">
                <svg id="barcode"></svg>
                <div style="font-size: 16px; font-weight: 900; color: #4b168c; margin-top: 5px; letter-spacing: 5px;">MESA ${tableNum}</div>
              </div>
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            function generate() {
              if (typeof JsBarcode === 'undefined') {
                setTimeout(generate, 100);
                return;
              }
              JsBarcode("#barcode", "MESA${table.id}", {
                format: "CODE128",
                width: 2.2,
                height: 60,
                displayValue: false,
                lineColor: "#4b168c"
              });
              setTimeout(() => { window.print(); }, 1500);
            }
            generate();
          </script>
        </body>
      </html>
    `);
  };

  const fetchTables = async () => {
    try {
      const res  = await fetch('/api/tables');
      const data = await res.json();
      if (data.success) setTables(data.tables);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res  = await fetch('/api/tables', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) { setIsModalOpen(false); setFormData({ name: '', capacity: 4 }); fetchTables(); }
    } catch (err) { console.error(err); }
  };

  const handleDelete = (tableId, tableName) => {
    setTableToDelete({ id: tableId, name: tableName });
  };

  const confirmDelete = async () => {
    if (!tableToDelete) return;
    try {
      const res = await fetch(`/api/tables/${tableToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setTableToDelete(null);
        fetchTables();
      } else {
        alert(data.message || 'Error al eliminar la mesa');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor');
    }
  };

  const libres   = tables.filter(t => t.status === 'LIBRE').length;
  const ocupadas = tables.filter(t => t.status === 'OCUPADA').length;

  const TableCard = ({ table }) => {
    const libre = table.status === 'LIBRE';
    const orden = table.orders?.find(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
    const elapsed = orden ? tiempoTranscurrido(orden.createdAt) : null;
    const alertTime = elapsed && parseInt(elapsed) > 60;

    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.02 }}
        onClick={() => navigate(`/mesas/${table.id}`)}
        className={`relative cursor-pointer rounded-3xl border p-5 flex flex-col items-center justify-center gap-3 overflow-hidden transition-all shadow-xl group ${
          !libre
            ? 'bg-[#854d0e] border-[#a16207] shadow-[0_4px_20px_rgba(133,77,14,0.2)] hover:bg-[#92400e]'
            : 'bg-[#14141a]/80 backdrop-blur-xl border-white/5 hover:border-white/20 hover:bg-[#1a1a22]'
        }`}
      >
        {/* Barra superior de acento */}
        {!libre && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        )}

        {/* Indicador de estado */}
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
          !libre ? 'bg-amber-200 shadow-[0_0_8px_rgba(254,243,199,0.6)] animate-pulse' : 'bg-gray-700'
        }`} />

        {/* Ícono mesa */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${
          !libre
            ? 'bg-black/10 text-amber-100 border border-white/10'
            : 'bg-[#0a0a0c] text-gray-500 border border-white/5'
        }`}>
          <Utensils className="w-8 h-8" />
        </div>

        <h3 className={`text-xl font-bold tracking-wide ${
          !libre ? 'text-white' : 'text-gray-200'
        }`}>{table.name}</h3>

        <div className="flex items-center gap-1.5">
          <Users className={`w-3.5 h-3.5 ${libre ? 'text-gray-600' : 'text-amber-100/60'}`} />
          <span className={`text-xs ${libre ? 'text-gray-600' : 'text-amber-100/60'}`}>{table.capacity} personas</span>
        </div>

        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest transition-colors ${
          !libre
            ? 'bg-white/10 text-amber-100 border border-white/10'
            : 'bg-[#0a0a0c] text-gray-600 border border-white/5'
        }`}>
          {libre ? 'LIBRE' : 'OCUPADA'}
        </span>

        {!libre && elapsed && (
          <div className={`flex items-center gap-1 text-xs font-bold ${
            alertTime ? 'text-red-300' : 'text-amber-200/40'
          }`}>
            <Clock className="w-3 h-3" /> {elapsed}
          </div>
        )}

        <div className={`mt-2 pt-2 w-full flex items-center justify-between gap-1 transition-all duration-300 border-t ${
          !libre ? 'border-white/10' : 'border-white/5'
        }`}>
          <div className="flex flex-col items-center">
            <Barcode className={`w-8 h-4 ${libre ? 'text-gray-700' : 'text-amber-100/30'}`} />
            <span className={`text-[9px] font-mono tracking-widest ${libre ? 'text-gray-700' : 'text-amber-100/40'}`}>MESA{table.id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); printVintageLabel(table); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                !libre
                  ? 'bg-white/10 hover:bg-white/20 text-amber-100 border border-white/10'
                  : 'bg-[#0a0a0c] hover:bg-amber-500 hover:text-black text-gray-600 border border-white/5'
              }`}
              title="Imprimir Etiqueta"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(table.id, table.name); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                !libre
                  ? 'bg-white/10 hover:bg-red-500 hover:text-white text-amber-100/50 border border-white/10'
                  : 'bg-[#0a0a0c] hover:bg-red-500 hover:text-white text-gray-600 border border-white/5'
              }`}
              title="Eliminar Mesa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 lg:p-8 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/2 h-96 bg-amber-600/5 blur-[120px] pointer-events-none" />

      <header className="flex justify-between items-center mb-8 relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white mb-1">Gestión de <span className="text-amber-500 font-bold">Mesas</span></h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">Toca una mesa para gestionar su pedido</p>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-gray-500">
              <Barcode className="w-3 h-3" />
              <span>Formato Barcode: <span className="text-amber-500 font-mono">MESA[ID]</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* KPIs inline */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            <div className="bg-[#2a2a35] border border-[#3a3a48] rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold text-gray-300">{libres}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Libres</p>
            </div>
            <div className="bg-[#854d0e] border border-[#a16207] rounded-xl px-4 py-2 text-center shadow-[0_2px_15px_rgba(133,77,14,0.1)]">
              <p className="text-lg font-bold text-amber-50">{ocupadas}</p>
              <p className="text-[10px] text-amber-50/60 uppercase tracking-widest font-black">Ocupadas</p>
            </div>
          </div>
          <button onClick={fetchTables} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          {/* Vista toggle */}
          <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
            <button onClick={() => setVista('visual')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${vista === 'visual' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Visual</button>
            <button onClick={() => setVista('lista')}  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${vista === 'lista'  ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Lista</button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Plus className="w-4 h-4" /> Nueva Mesa
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 relative z-10">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white/[0.03] backdrop-blur-md p-16 text-center rounded-[2.5rem] border border-white/5 shadow-2xl relative z-10">
          <Utensils className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-6 font-medium text-lg">No hay mesas registradas</p>
          <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-bold hover:bg-amber-400 transition-all">
            <Plus className="w-4 h-4 inline mr-2" /> Registrar Mesa
          </button>
        </div>
      ) : vista === 'visual' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 relative z-10">
          {tables.map(table => <TableCard key={table.id} table={table} />)}
        </div>
      ) : (
        <div className="relative z-10 bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-widest">
                <th className="px-6 py-4 text-left font-bold">Mesa</th>
                <th className="px-6 py-4 text-left font-bold">Capacidad</th>
                <th className="px-6 py-4 text-left font-bold">Estado</th>
                <th className="px-6 py-4 text-left font-bold">Tiempo</th>
                <th className="px-6 py-4 text-right font-bold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tables.map(t => {
                const orden = t.orders?.find(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
                const elapsed = orden ? tiempoTranscurrido(orden.createdAt) : null;
                return (
                  <tr key={t.id} onClick={() => navigate(`/mesas/${t.id}`)}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <td className="px-6 py-4 text-white font-bold">{t.name}</td>
                    <td className="px-6 py-4 text-gray-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{t.capacity}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${
                         t.status === 'OCUPADA'
                           ? 'bg-[#854d0e] text-amber-50 border border-[#a16207]'
                           : 'bg-white/5 text-gray-500 border border-white/10'
                       }`}>{t.status}</span>
                     </td>
                     <td className="px-6 py-4 text-gray-500 text-xs">{elapsed || '—'}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3 items-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/mesas/${t.id}`)}
                        className="text-amber-400 text-xs font-bold hover:underline bg-transparent border-none cursor-pointer animate-pulse"
                      >
                        Ver mesa →
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 rounded-lg bg-[#0a0a0c] hover:bg-red-500 hover:text-white text-gray-500 border border-white/5 transition-all"
                        title="Eliminar Mesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva mesa */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-sm border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-light text-white">Nueva Mesa</h3>
                  <p className="text-sm text-gray-400 mt-1">Ingresa los datos de la mesa</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Nombre o Número</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="Ej. Mesa 1 / Terraza" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Capacidad (personas)</label>
                  <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="4" />
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl mt-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-lg">
                  Guardar Mesa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal confirmar eliminar mesa */}
      <AnimatePresence>
        {tableToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16161A] p-8 rounded-[2rem] w-full max-w-sm border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-500" />
              
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-light text-white">¿Eliminar Mesa?</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    ¿Estás seguro de que deseas eliminar la <span className="text-red-400 font-bold">"{tableToDelete.name}"</span>? Esta acción no se puede deshacer.
                  </p>
                </div>

                <div className="flex gap-3 w-full mt-4">
                  <button
                    onClick={() => setTableToDelete(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3.5 rounded-2xl border border-white/5 transition-all text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] text-sm cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
