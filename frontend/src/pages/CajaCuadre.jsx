import React, { useState, useEffect } from 'react';
import {
  DollarSign, Banknote, CreditCard, Landmark, Printer,
  CheckCircle, AlertTriangle, History, ChevronDown, ChevronUp,
  Calculator, RefreshCw, Lock
} from 'lucide-react';
import { printComanda } from '../utils/printComanda';
import { useAuthStore } from '../store/useAuthStore';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

// ── Tarjeta de método de pago ──────────────────────────────────────────────
function MetodoCard({ label, value, icon: Icon, color }) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue:    'bg-blue-500/10    border-blue-500/20    text-blue-400',
    purple:  'bg-purple-500/10  border-purple-500/20  text-purple-400',
  };
  return (
    <div className={`rounded-3xl border p-5 flex flex-col gap-3 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <p className="text-3xl font-bold">{fmt(value)}</p>
    </div>
  );
}

// ── Fila de transacción ────────────────────────────────────────────────────
function SaleRow({ sale }) {
  const METHOD = { CASH: { label: 'Efectivo', cls: 'text-emerald-400' }, CARD: { label: 'Tarjeta', cls: 'text-blue-400' }, TRANSFER: { label: 'Transfer.', cls: 'text-purple-400' } };
  const m = METHOD[sale.method] || { label: sale.method, cls: 'text-gray-400' };
  const origen = sale.order?.table?.name || 'Mostrador';
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-gray-500 text-xs">{fmtTime(sale.createdAt)}</td>
      <td className="py-3 px-4 text-gray-400 text-sm">{origen}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-bold ${m.cls}`}>{m.label}</span>
      </td>
      <td className="py-3 px-4 text-right text-white font-semibold">{fmt(sale.amount)}</td>
    </tr>
  );
}

// ── Fila de historial ──────────────────────────────────────────────────────
function HistorialRow({ c }) {
  const dif = c.diferencia;
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm">
      <td className="py-3 px-4 text-gray-400">{fmtDate(c.fecha)}</td>
      <td className="py-3 px-4 text-white font-semibold">{fmt(c.totalVentas)}</td>
      <td className="py-3 px-4 text-gray-400">{c.numTransacciones}</td>
      <td className="py-3 px-4">
        <span className={`font-bold ${dif >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {dif >= 0 ? '+' : ''}{fmt(dif)}
        </span>
      </td>
      <td className="py-3 px-4 text-gray-500 text-xs">{c.creadoPor}</td>
    </tr>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function CajaCuadre() {
  const user = useAuthStore(s => s.user);

  const [tab, setTab]           = useState('cuadre'); // 'cuadre' | 'historial'
  const [resumen, setResumen]   = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);

  const [fondoInicial,     setFondoInicial]     = useState('');
  const [efectivoContado,  setEfectivoContado]  = useState('');
  const [observaciones,    setObservaciones]    = useState('');

  // Fecha seleccionada (hoy por defecto)
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);

  useEffect(() => { cargarResumen(); }, [fecha]);
  useEffect(() => { if (tab === 'historial') cargarHistorial(); }, [tab]);

  const cargarResumen = async () => {
    setLoading(true); setSaved(false);
    try {
      const r = await fetch(`/api/caja/resumen?fecha=${fecha}`);
      const d = await r.json();
      if (d.success) setResumen(d.resumen);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const cargarHistorial = async () => {
    try {
      const r = await fetch('/api/caja/historial');
      const d = await r.json();
      if (d.success) setHistorial(d.cierres);
    } catch(e) { console.error(e); }
  };

  // Cálculos derivados
  const fondo      = parseFloat(fondoInicial)    || 0;
  const contado    = parseFloat(efectivoContado) || 0;
  const esperado   = fondo + (resumen?.ventasEfectivo || 0);
  const diferencia = contado - esperado;
  const hayConteo  = efectivoContado !== '';

  const handleGuardar = async () => {
    if (!resumen) return;
    setSaving(true);
    try {
      await fetch('/api/caja/cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fondoInicial:     fondo,
          ventasEfectivo:  resumen.ventasEfectivo,
          ventasTarjeta:   resumen.ventasTarjeta,
          ventasTransfer:  resumen.ventasTransfer,
          totalVentas:     resumen.totalVentas,
          efectivoEsperado: esperado,
          efectivoContado: contado,
          diferencia,
          numTransacciones: resumen.numTransacciones,
          observaciones
        })
      });
      setSaved(true);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleImprimir = () => {
    if (!resumen) return;
    const now   = new Date();
    const fecha = now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const hora  = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cuadre de Caja</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:80mm auto;margin:0}
  body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;width:80mm;padding:4mm 4mm 10mm 4mm}
  .center{text-align:center}.bold{font-weight:900}.sep{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px}
  .row.big{font-size:16px;font-weight:900;border-top:2px solid #000;padding-top:4px;margin-top:4px}
  .badge{text-align:center;font-size:18px;font-weight:900;border:2px solid #000;padding:3px 8px;margin:6px auto;display:inline-block}
  .obs{font-size:10px;font-style:italic;color:#555;margin-top:4px}
  .dif-pos{font-weight:900}.dif-neg{font-weight:900}
</style></head><body>
<div class="center"><div style="font-size:16px;font-weight:900;letter-spacing:2px">🥖 POS BAKERY</div>
<div class="badge">CUADRE DE CAJA</div>
<div style="font-size:10px;color:#555">${fecha}<br>${hora}</div>
<div style="font-size:10px;margin-top:2px">Realizado por: <b>${user?.username || 'admin'}</b></div></div>
<div class="sep"></div>
<div class="row"><span>Fondo inicial:</span><span>${fmt(fondo)}</span></div>
<div class="sep"></div>
<div style="font-weight:900;font-size:11px;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">VENTAS DEL DÍA</div>
<div class="row"><span>💵 Efectivo:</span><span>${fmt(resumen?.ventasEfectivo)}</span></div>
<div class="row"><span>💳 Tarjeta:</span><span>${fmt(resumen?.ventasTarjeta)}</span></div>
<div class="row"><span>🏦 Transferencia:</span><span>${fmt(resumen?.ventasTransfer)}</span></div>
<div class="row"><span>Transacciones:</span><span>${resumen?.numTransacciones || 0}</span></div>
<div class="row big"><span>TOTAL VENTAS</span><span>${fmt(resumen?.totalVentas)}</span></div>
<div class="sep"></div>
<div style="font-weight:900;font-size:11px;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">ARQUEO DE CAJA</div>
<div class="row"><span>Efectivo esperado:</span><span>${fmt(esperado)}</span></div>
<div class="row"><span>Efectivo contado:</span><span>${fmt(contado)}</span></div>
<div class="row big ${diferencia >= 0 ? 'dif-pos' : 'dif-neg'}">
  <span>DIFERENCIA</span><span>${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}</span>
</div>
${observaciones ? `<div class="sep"></div><div class="obs">Obs: ${observaciones}</div>` : ''}
<div class="sep"></div>
<div class="center" style="font-size:10px;color:#555">— Fin del Corte de Caja —<br>Impreso: ${hora}</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=320,height=700,toolbar=0');
    if (!win) { alert('Permite ventanas emergentes para imprimir.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.addEventListener('afterprint', () => win.close()); setTimeout(() => { try { win.close(); } catch(e){} }, 3000); }, 350);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      {/* Ambient */}
      <div className="absolute top-0 right-0 w-1/3 h-64 bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-64 bg-amber-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white">
            Cuadre de <span className="font-bold text-emerald-400">Caja</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Corte y arqueo de caja diario</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date" value={fecha} max={hoy}
            onChange={e => setFecha(e.target.value)}
            className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <button onClick={cargarResumen} className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-2xl flex items-center justify-center transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 relative z-10">
        {[['cuadre','Cuadre del Día'],['historial','Historial']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${tab === k ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TAB: CUADRE ── */}
      {tab === 'cuadre' && (
        <div className="space-y-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Ventas por método */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetodoCard label="Efectivo"      value={resumen?.ventasEfectivo} icon={Banknote}  color="emerald" />
                <MetodoCard label="Tarjeta"       value={resumen?.ventasTarjeta}  icon={CreditCard} color="blue" />
                <MetodoCard label="Transferencia" value={resumen?.ventasTransfer} icon={Landmark}  color="purple" />
              </div>

              {/* Resumen + Arqueo */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Panel izquierdo: totales */}
                <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6 space-y-4">
                  <h3 className="text-white font-semibold">Resumen del Día</h3>
                  <div className="space-y-3">
                    {[
                      ['Transacciones', resumen?.numTransacciones || 0, false],
                      ['Órdenes canceladas', resumen?.canceladas || 0, false],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-400 text-sm">{l}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 border-t border-white/10 mt-2">
                      <span className="text-gray-300 font-semibold">Total Ventas</span>
                      <span className="text-3xl font-bold text-emerald-400">{fmt(resumen?.totalVentas)}</span>
                    </div>
                  </div>
                </div>

                {/* Panel derecho: arqueo */}
                <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6 space-y-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-400" /> Arqueo de Caja
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 block">Fondo Inicial</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00" value={fondoInicial}
                          onChange={e => setFondoInicial(e.target.value)}
                          className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl pl-8 pr-4 py-3 text-lg font-semibold focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="bg-white/[0.03] rounded-2xl p-4 flex justify-between items-center border border-white/5">
                      <span className="text-gray-400 text-sm">+ Ventas en efectivo</span>
                      <span className="text-emerald-400 font-semibold">{fmt(resumen?.ventasEfectivo)}</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl p-4 flex justify-between items-center border border-white/5">
                      <span className="text-gray-400 text-sm">= Efectivo esperado en caja</span>
                      <span className="text-white font-bold text-lg">{fmt(esperado)}</span>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 block">Efectivo Contado</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00" value={efectivoContado}
                          onChange={e => setEfectivoContado(e.target.value)}
                          className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl pl-8 pr-4 py-3 text-lg font-semibold focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Diferencia */}
                  {hayConteo && (
                    <div className={`rounded-2xl p-4 flex justify-between items-center border ${
                      diferencia === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      diferencia > 0  ? 'bg-blue-500/10    border-blue-500/20    text-blue-400'    :
                                        'bg-rose-500/10    border-rose-500/20    text-rose-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        {diferencia === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-bold">
                          {diferencia === 0 ? 'Caja cuadrada ✓' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                        </span>
                      </div>
                      <span className="text-2xl font-black">
                        {diferencia >= 0 ? '+' : ''}{fmt(diferencia)}
                      </span>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 block">Observaciones</label>
                    <textarea
                      rows={2} placeholder="Notas del corte..."
                      value={observaciones} onChange={e => setObservaciones(e.target.value)}
                      className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleImprimir}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm">
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    <button onClick={handleGuardar} disabled={saving || saved}
                      className={`flex-1 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm ${
                        saved   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' :
                        saving  ? 'bg-emerald-500/20 text-emerald-300 cursor-wait' :
                                  'bg-emerald-500 hover:bg-emerald-400 text-black'
                      }`}>
                      {saved ? <><CheckCircle className="w-4 h-4" /> Guardado</> :
                       saving ? 'Guardando...' :
                       <><Lock className="w-4 h-4" /> Cerrar Caja</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalle de transacciones */}
              <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
                <button
                  onClick={() => setShowDetalle(v => !v)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-white font-semibold">Detalle de transacciones ({resumen?.numTransacciones || 0})</span>
                  {showDetalle ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>
                {showDetalle && (
                  <div className="overflow-x-auto border-t border-white/5">
                    {!resumen?.detalle?.length ? (
                      <p className="text-center text-gray-600 py-8 text-sm">Sin transacciones en esta fecha</p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Hora</th>
                            <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Origen</th>
                            <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Método</th>
                            <th className="py-3 px-4 text-right text-xs text-gray-600 uppercase tracking-widest">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.detalle.map(s => <SaleRow key={s.id} sale={s} />)}
                        </tbody>
                        <tfoot>
                          <tr className="bg-white/[0.03]">
                            <td colSpan={3} className="py-3 px-4 text-right text-sm font-bold text-gray-400">TOTAL</td>
                            <td className="py-3 px-4 text-right font-black text-emerald-400 text-lg">{fmt(resumen?.totalVentas)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden relative z-10">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" /> Historial de Cierres
            </h3>
          </div>
          {historial.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
              <History className="w-8 h-8 opacity-30" />
              <p className="text-sm">Sin cierres registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Fecha</th>
                    <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Total</th>
                    <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Tx</th>
                    <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Diferencia</th>
                    <th className="py-3 px-4 text-left text-xs text-gray-600 uppercase tracking-widest">Cajero</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(c => <HistorialRow key={c.id} c={c} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
