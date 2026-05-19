import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, Download, RefreshCw, FileText, Table } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/format';

const fmt = (n) => formatCurrency(n);


const COLORS = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#F43F5E','#06B6D4','#84CC16','#F97316'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E1E26] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-gray-400 mb-1 text-xs font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{fmt(p.value)}</p>
      ))}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6">
      <div className="mb-5">
        <h3 className="text-white font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  const cls = { amber: 'text-amber-400', emerald: 'text-emerald-400', blue: 'text-blue-400' };
  return (
    <div className="bg-[#14141A] border border-white/5 rounded-3xl p-5 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-300">
      <p className="text-xs uppercase tracking-widest text-gray-600 font-bold">{label}</p>
      <p className={`text-3xl font-bold ${cls[color] || 'text-white'}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs">{sub}</p>}
    </div>
  );
}

export default function Reportes() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const hoy  = new Date().toISOString().split('T')[0];
  const mes  = new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split('T')[0];
  const [desde, setDesde] = useState(mes);
  const [hasta, setHasta] = useState(hoy);

  useEffect(() => { load(); }, [desde, hasta]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/reportes/resumen?desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Fecha','Total'],
      ...data.ventasPorDia.map(d => [d.date, d.total.toFixed(2)])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ventas_${desde}_${hasta}.csv`; a.click();
  };

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    // Hoja 1: Ventas por día
    const ws1 = XLSX.utils.json_to_sheet(data.ventasPorDia.map(d => ({ 'Fecha': d.date, 'Total': d.total })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Ventas por Día');
    // Hoja 2: Métodos de pago
    const ws2 = XLSX.utils.json_to_sheet([
      { 'Método': 'Efectivo',      'Total': data.ventasPorMetodo.CASH },
      { 'Método': 'Tarjeta',       'Total': data.ventasPorMetodo.CARD },
      { 'Método': 'Transferencia', 'Total': data.ventasPorMetodo.TRANSFER },
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Métodos de Pago');
    // Hoja 3: Top productos
    const ws3 = XLSX.utils.json_to_sheet(data.topProductos.map((p, i) => ({ '#': i+1, 'Producto': p.name, 'Cantidad': p.cantidad, 'Ingresos': p.ingresos })));
    XLSX.utils.book_append_sheet(wb, ws3, 'Top Productos');
    // Hoja 4: Categorías
    const ws4 = XLSX.utils.json_to_sheet(data.ventasPorCategoria.map(c => ({ 'Categoría': c.name, 'Total': c.total })));
    XLSX.utils.book_append_sheet(wb, ws4, 'Categorías');
    XLSX.writeFile(wb, `reporte_ventas_${desde}_${hasta}.xlsx`);
  };

  const exportPDF = () => {
    if (!data) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte de Ventas</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box} @page{size:A4;margin:20mm}
  body{font-family:Arial,sans-serif;color:#000;font-size:12px}
  h1{font-size:20px;font-weight:bold;margin-bottom:4px}
  h2{font-size:14px;font-weight:bold;margin:16px 0 8px}
  .meta{color:#666;font-size:11px;margin-bottom:16px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
  .kpi{border:1px solid #ddd;border-radius:8px;padding:12px}
  .kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:4px}
  .kpi-value{font-size:20px;font-weight:bold}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}
  .total-row td{font-weight:bold;border-top:2px solid #000;border-bottom:none}
</style></head><body>
<h1>🥖 POS Bakery — Reporte de Ventas</h1>
<div class="meta">Período: ${desde} al ${hasta} · Generado: ${new Date().toLocaleDateString('es-MX')}</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Total Ventas</div><div class="kpi-value">${fmt(data.totalVentas)}</div></div>
  <div class="kpi"><div class="kpi-label">Transacciones</div><div class="kpi-value">${data.numTransacciones}</div></div>
  <div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-value">${data.numTransacciones > 0 ? fmt(data.totalVentas / data.numTransacciones) : '$0.00'}</div></div>
</div>
<h2>Ventas por Método de Pago</h2>
<table>
  <tr><th>Método</th><th>Total</th></tr>
  <tr><td>💵 Efectivo</td><td>${fmt(data.ventasPorMetodo.CASH)}</td></tr>
  <tr><td>💳 Tarjeta</td><td>${fmt(data.ventasPorMetodo.CARD)}</td></tr>
  <tr><td>🏦 Transferencia</td><td>${fmt(data.ventasPorMetodo.TRANSFER)}</td></tr>
  <tr class="total-row"><td>TOTAL</td><td>${fmt(data.totalVentas)}</td></tr>
</table>
<h2>Top Productos</h2>
<table>
  <tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
  ${data.topProductos.map((p,i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.cantidad}</td><td>${fmt(p.ingresos)}</td></tr>`).join('')}
</table>
<h2>Ventas por Categoría</h2>
<table>
  <tr><th>Categoría</th><th>Total</th></tr>
  ${data.ventasPorCategoria.map(c => `<tr><td>${c.name}</td><td>${fmt(c.total)}</td></tr>`).join('')}
</table>
</body></html>`;

    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) { alert('Permite ventanas emergentes para exportar.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.addEventListener('afterprint', () => win.close()); }, 500);
  };

  const ventasDia = data?.ventasPorDia?.map(d => ({
    day: d.date.slice(5), // MM-DD
    ventas: d.total
  })) || [];

  const metodoPie = data ? [
    { name: 'Efectivo',      value: data.ventasPorMetodo.CASH },
    { name: 'Tarjeta',       value: data.ventasPorMetodo.CARD },
    { name: 'Transferencia', value: data.ventasPorMetodo.TRANSFER },
  ].filter(m => m.value > 0) : [];

  const maxBar = Math.max(...(data?.topProductos?.map(p => p.ingresos) || [1]));

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-amber-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-48 bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-light text-white">Reportes de <span className="font-bold text-amber-400">Ventas</span></h2>
          <p className="text-gray-500 text-sm mt-1">Análisis de desempeño del negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={desde} max={hoy} onChange={e => setDesde(e.target.value)}
            className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none" />
          <span className="text-gray-600">—</span>
          <input type="date" value={hasta} max={hoy} onChange={e => setHasta(e.target.value)}
            className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none" />
          <button onClick={load} className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-2xl flex items-center justify-center transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all">
            <Table className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-2xl text-sm font-bold transition-all">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Ventas"    value={fmt(data?.totalVentas)}    color="emerald" />
            <KpiCard label="Transacciones"   value={data?.numTransacciones || 0} color="blue" sub="en el período" />
            <KpiCard label="Ticket Promedio" value={(data?.numTransacciones > 0) ? fmt(data.totalVentas / data.numTransacciones) : '$0.00'} color="amber" />
            <KpiCard label="Efectivo"        value={fmt(data?.ventasPorMetodo?.CASH)} color="emerald" sub="de las ventas" />
          </div>

          {/* Ventas por día */}
          <Section title="Ventas por Día" subtitle={`${desde} al ${hasta}`}>
            {ventasDia.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">Sin datos en el período</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={ventasDia} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="grad-r" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ventas" stroke="#F59E0B" strokeWidth={2.5} fill="url(#grad-r)"
                    dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: '#0A0A0C' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Métodos + Categorías */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Section title="Por Método de Pago" subtitle="Distribución de ingresos">
              {metodoPie.length === 0 ? (
                <p className="text-center text-gray-600 py-8 text-sm">Sin datos</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={metodoPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" paddingAngle={3}>
                        {metodoPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 flex-1">
                    {metodoPie.map((m, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                          <span className="text-gray-400 text-sm">{m.name}</span>
                        </div>
                        <span className="text-white font-semibold text-sm">{fmt(m.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Por Categoría" subtitle="Ingresos por tipo de producto">
              {!data?.ventasPorCategoria?.length ? (
                <p className="text-center text-gray-600 py-8 text-sm">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.ventasPorCategoria.slice(0, 6).map((c, i) => {
                    const pct = (c.total / data.totalVentas) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-white font-medium truncate">{c.name}</p>
                            <p className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: COLORS[i] }}>{fmt(c.total)}</p>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i] }} />
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* Top Productos */}
          <Section title="Top 10 Productos" subtitle="Más vendidos por ingresos generados">
            {!data?.topProductos?.length ? (
              <p className="text-center text-gray-600 py-8 text-sm">Sin datos</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.topProductos.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs font-bold w-5 text-right flex-shrink-0">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white font-medium truncate">{p.name}</p>
                        <p className="text-xs text-amber-400 font-bold ml-2 flex-shrink-0">{fmt(p.ingresos)}</p>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(p.ingresos/maxBar)*100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                    <span className="text-gray-600 text-xs w-14 text-right flex-shrink-0">{p.cantidad} uds</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
