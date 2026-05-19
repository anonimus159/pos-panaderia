import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X, Banknote, CreditCard, Landmark, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const METHOD = {
  CASH:     { label: 'Efectivo',      icon: Banknote,  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CARD:     { label: 'Tarjeta',       icon: CreditCard, cls: 'bg-blue-500/10    text-blue-400    border-blue-500/20' },
  TRANSFER: { label: 'Transferencia', icon: Landmark,  cls: 'bg-purple-500/10  text-purple-400  border-purple-500/20' },
  NEQUI:    { label: 'Nequi',         icon: Landmark,  cls: 'bg-[#700AD4]/10   text-[#700AD4]   border-[#700AD4]/20' },
  DAVIPLATA:{ label: 'Daviplata',     icon: Landmark,  cls: 'bg-[#E30613]/10   text-[#E30613]   border-[#E30613]/20' },
};

function DetailModal({ venta, onClose }) {
  if (!venta) return null;
  const m = METHOD[venta.method] || { label: venta.method, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
  const origen = venta.order?.table?.name || 'Mostrador';
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#16161A] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h3 className="text-white font-semibold text-lg">Venta #{venta.id}</h3>
            <p className="text-gray-500 text-sm">{fmtDate(venta.createdAt)} · {fmtTime(venta.createdAt)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Origen</span>
            <span className="text-white font-medium">{origen}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Método</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${m.cls}`}>{m.label}</span>
          </div>
          <div className="border-t border-white/5 pt-3">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-3">Ítems</p>
            <div className="space-y-2">
              {venta.order?.items?.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <span className="text-white text-sm">{item.quantity}x {item.product?.name}</span>
                    {item.notes && <p className="text-blue-400 text-xs italic">📝 {item.notes}</p>}
                  </div>
                  <span className="text-gray-400 text-sm">{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
          {venta.order?.discount > 0 && (
            <div className="flex justify-between border-t border-white/5 pt-3">
              <span className="text-rose-400 text-sm">Descuento</span>
              <span className="text-rose-400 font-semibold">-{fmt(venta.order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-3">
            <span className="text-gray-300 font-semibold">Total</span>
            <span className="text-2xl font-bold text-white">{fmt(venta.amount)}</span>
          </div>

          {/* Sección de Factura Electrónica */}
          <div className="border-t border-white/5 pt-4 mt-4">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-3">Facturación Electrónica (DIAN)</p>
            {venta.order?.factura ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-white font-bold text-sm">Factura {venta.order.factura.numeroFactura}</span>
                </div>
                <p className="text-[10px] text-gray-500 break-all mb-3">CUFE: {venta.order.factura.cufe}</p>
                <div className="flex gap-2">
                  <a href={venta.order.factura.pdfUrl} target="_blank" rel="noreferrer" className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs py-2 rounded-xl text-center transition-all">Ver PDF</a>
                  <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs py-2 rounded-xl transition-all">Ver XML</button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">Sin factura generada</span>
                </div>
                {venta.cliente?.nit ? (
                  <button onClick={() => onFacturar(venta)} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl text-xs transition-all">
                    Generar Factura Electrónica Directa
                  </button>
                ) : (
                  <p className="text-[10px] text-gray-500 text-center italic">Configure NIT del cliente para facturar</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Historial() {
  const [ventas,  setVentas]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const hoy = new Date().toISOString().split('T')[0];
  const [desde,  setDesde]  = useState(hoy);
  const [hasta,  setHasta]  = useState(hoy);
  const [metodo, setMetodo] = useState('ALL');
  const [tipo,   setTipo]   = useState('ALL');
  const [page,   setPage]   = useState(1);

  useEffect(() => { load(); }, [desde, hasta, metodo, tipo, page]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ desde, hasta, metodo, tipo, page, limit: 50 });
      const r = await fetch(`/api/ventas/historial?${params}`);
      const d = await r.json();
      if (d.success) { setVentas(d.ventas); setTotal(d.total); setPages(d.pages); }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalMonto = ventas.reduce((a, v) => a + v.amount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-blue-500/5 blur-[100px] pointer-events-none" />

      <header className="relative z-10">
        <h2 className="text-3xl font-light text-white">Historial de <span className="font-bold text-blue-400">Ventas</span></h2>
        <p className="text-gray-500 text-sm mt-1">Registro completo de transacciones</p>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <input type="date" value={desde} max={hoy} onChange={e => { setDesde(e.target.value); setPage(1); }}
          className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50" />
        <span className="text-gray-600">—</span>
        <input type="date" value={hasta} max={hoy} onChange={e => { setHasta(e.target.value); setPage(1); }}
          className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50" />

        <select value={metodo} onChange={e => { setMetodo(e.target.value); setPage(1); }}
          className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
          <option value="ALL">Todos los métodos</option>
          <option value="CASH">Efectivo</option>
          <option value="CARD">Tarjeta</option>
          <option value="TRANSFER">Transferencia</option>
        </select>

        <select value={tipo} onChange={e => { setTipo(e.target.value); setPage(1); }}
          className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
          <option value="ALL">Todos los tipos</option>
          <option value="DINE_IN">Mesa</option>
          <option value="TAKEAWAY">Mostrador</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-gray-500 text-sm">{total} transacciones</span>
          <span className="text-white font-bold text-lg">{fmt(totalMonto)}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
            <Filter className="w-8 h-8 opacity-30" />
            <p className="text-sm">Sin transacciones en el período seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="py-3 px-5 text-left text-xs text-gray-600 uppercase tracking-widest">#</th>
                  <th className="py-3 px-5 text-left text-xs text-gray-600 uppercase tracking-widest">Fecha</th>
                  <th className="py-3 px-5 text-left text-xs text-gray-600 uppercase tracking-widest">Hora</th>
                  <th className="py-3 px-5 text-left text-xs text-gray-600 uppercase tracking-widest">Origen</th>
                  <th className="py-3 px-5 text-left text-xs text-gray-600 uppercase tracking-widest">Método</th>
                  <th className="py-3 px-5 text-right text-xs text-gray-600 uppercase tracking-widest">Monto</th>
                  <th className="py-3 px-5 text-center text-xs text-gray-600 uppercase tracking-widest">DIAN</th>
                  <th className="py-3 px-5 text-center text-xs text-gray-600 uppercase tracking-widest">Ver</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => {
                  const m = METHOD[v.method] || { label: v.method, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
                  const origen = v.order?.table?.name || 'Mostrador';
                  return (
                    <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-5 text-gray-600 text-xs">#{v.id}</td>
                      <td className="py-3 px-5 text-gray-400 text-sm">{fmtDate(v.createdAt)}</td>
                      <td className="py-3 px-5 text-gray-500 text-sm">{fmtTime(v.createdAt)}</td>
                      <td className="py-3 px-5 text-white text-sm">{origen}</td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${m.cls}`}>{m.label}</span>
                      </td>
                      <td className="py-3 px-5 text-right text-white font-semibold">{fmt(v.amount)}</td>
                      <td className="py-3 px-5 text-center">
                        {v.order?.factura ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : v.cliente?.nit ? (
                          <FileText className="w-4 h-4 text-blue-500/40 mx-auto" title="Pendiente" />
                        ) : (
                          <span className="text-[10px] text-gray-800">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button onClick={() => setSelected(v)}
                          className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors mx-auto">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.03] border-t border-white/10">
                  <td colSpan={5} className="py-3 px-5 text-right text-sm font-bold text-gray-400">Total página</td>
                  <td className="py-3 px-5 text-right font-black text-white text-lg">{fmt(totalMonto)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 relative z-10">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-400 text-sm">Página {page} de {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
            className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selected && <DetailModal venta={selected} onClose={() => setSelected(null)} onFacturar={async (v) => {
        if (!confirm('¿Deseas generar la Factura Electrónica DIAN ahora?')) return;
        try {
          const r = await fetch('/api/facturacion/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: v.orderId })
          });
          const d = await r.json();
          if (d.success) {
            alert('Factura generada con éxito');
            load();
            setSelected(null);
          } else alert(d.message || 'Error');
        } catch(e) { alert('Error de conexión'); }
      }} />}
    </div>
  );
}
