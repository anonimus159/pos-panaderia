import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, Package, Layers
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Tooltip personalizado ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E1E26] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-gray-400 mb-2 text-xs font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {prefix === '$' ? fmt(p.value) : p.value} {p.name !== 'ventas' ? p.name : ''}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend, trendLabel }) {
  const colors = {
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/10' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'shadow-blue-500/10' },
    purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'shadow-purple-500/10' },
    rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    glow: 'shadow-rose-500/10' },
  };
  const c = colors[color] || colors.amber;
  const isUp = trend >= 0;

  return (
    <div className={`bg-[#14141A] border ${c.border} rounded-3xl p-6 flex flex-col gap-4 shadow-lg ${c.glow} hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 ${c.bg} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-xl ${
            isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
          }`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">{label}</p>
        <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
        {trendLabel && <p className="text-gray-600 text-xs mt-1">{trendLabel}</p>}
      </div>
    </div>
  );
}

// ─── Sección con título ───────────────────────────────────────────────────────
function Section({ title, subtitle, children, action }) {
  return (
    <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Pill de estado de mesa ───────────────────────────────────────────────────
function TablePill({ table }) {
  const occupied = table.status === 'OCUPADA';
  return (
    <div className={`rounded-2xl p-3 text-center border transition-all ${
      occupied
        ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
    }`}>
      <p className="text-xs font-bold uppercase tracking-wider">{table.name}</p>
      <p className="text-[10px] text-current/60 mt-0.5 capitalize">{occupied ? 'Ocupada' : 'Libre'}</p>
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore(s => s.user);

  const [stats,     setStats]     = useState(null);
  const [salesWeek, setSalesWeek] = useState([]);
  const [salesHour, setSalesHour] = useState([]);
  const [topProds,  setTopProds]  = useState([]);
  const [lowStock,  setLowStock]  = useState([]);
  const [tables,    setTables]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, w, h, p, l, t] = await Promise.all([
          fetch('/api/dashboard/stats').then(r => r.json()),
          fetch('/api/dashboard/sales-week').then(r => r.json()),
          fetch('/api/dashboard/sales-by-hour').then(r => r.json()),
          fetch('/api/dashboard/top-products').then(r => r.json()),
          fetch('/api/dashboard/low-stock').then(r => r.json()),
          fetch('/api/tables').then(r => r.json()),
        ]);
        if (s.success)  setStats(s.stats);
        if (w.success)  setSalesWeek(w.data);
        if (h.success)  setSalesHour(h.data);
        if (p.success)  setTopProds(p.data);
        if (l.success)  setLowStock(l.data);
        if (t.success)  setTables(t.tables);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
    // Refresh cada 60s
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  const maxBar = Math.max(...topProds.map(p => p.ingresos), 1);

  const CHART_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#06B6D4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-1/3 h-64 bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white">
            Buen día, <span className="font-bold text-amber-400">{user?.username}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1 capitalize">{fecha} · {hora}</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Sistema en línea
        </div>
      </header>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <KpiCard
          label="Ventas Hoy"
          value={fmt(stats?.todaySales || 0)}
          sub={`${stats?.todayTransactions || 0} transacciones`}
          icon={TrendingUp}
          color="emerald"
        />
        <KpiCard
          label="Ticket Promedio"
          value={fmt(stats?.avgTicket || 0)}
          sub="por venta hoy"
          icon={ShoppingBag}
          color="amber"
        />
        <KpiCard
          label="Pedidos Pendientes"
          value={stats?.pendingOrders || 0}
          sub="en cocina"
          icon={Clock}
          color="blue"
        />
        <KpiCard
          label="Mesas Ocupadas"
          value={`${stats?.occupiedTables || 0} / ${stats?.totalTables || 0}`}
          sub={`${Math.round(((stats?.occupiedTables || 0) / Math.max(stats?.totalTables || 1, 1)) * 100)}% de ocupación`}
          icon={Users}
          color="purple"
        />
      </div>

      {/* ── Meta de Ventas ── */}
      {stats?.monthGoal > 0 && (
        <div className="relative z-10">
          <Section title="Meta de Ventas Mensual" subtitle="Progreso acumulado del mes">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold text-white">{fmt(stats.monthSales)}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Ventas del mes</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-400">{((stats.monthSales / stats.monthGoal) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">de {fmt(stats.monthGoal)}</p>
                </div>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.monthSales / stats.monthGoal) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    (stats.monthSales / stats.monthGoal) >= 1 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  }`}
                />
              </div>
              {(stats.monthSales / stats.monthGoal) >= 1 && (
                <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="text-lg">🎉</span> ¡Meta superada! Continúa así.
                </p>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Gráfica 1 + Estado de Mesas ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">

        {/* Ventas semanales — Area Chart */}
        <div className="xl:col-span-2">
          <Section
            title="Ventas — Últimos 7 días"
            subtitle="Ingresos acumulados por día"
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesWeek} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad-ventas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fill="url(#grad-ventas)"
                  dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#F59E0B', strokeWidth: 2, stroke: '#0A0A0C' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Estado de Mesas */}
        <Section
          title="Estado de Mesas"
          subtitle="Ocupación en tiempo real"
        >
          {tables.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-600 text-sm">Sin mesas configuradas</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {tables.map(t => <TablePill key={t.id} table={t} />)}
            </div>
          )}
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Ocupada
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Libre
            </div>
          </div>
        </Section>
      </div>

      {/* ── Gráfica 2 + Top Productos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">

        {/* Ventas por hora — Bar Chart */}
        <Section
          title="Ventas por Hora"
          subtitle="Distribución de ingresos durante el día de hoy"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesHour} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hora" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                interval={2} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ventas" radius={[6, 6, 0, 0]}>
                {salesHour.map((_, i) => (
                  <Cell key={i} fill={_.ventas > 0 ? '#F59E0B' : 'rgba(255,255,255,0.05)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Top Productos */}
        <Section
          title="Top Productos"
          subtitle="Más vendidos por ingresos generados"
        >
          {topProds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-600">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm">Sin ventas registradas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProds.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs font-bold w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white font-medium truncate">{p.name}</p>
                      <p className="text-xs text-amber-400 font-bold ml-2 flex-shrink-0">{fmt(p.ingresos)}</p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(p.ingresos / maxBar) * 100}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs w-12 text-right flex-shrink-0">{p.cantidad} uds</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── Alertas de Stock Bajo ── */}
      {lowStock.length > 0 && (
        <div className="relative z-10">
          <Section
            title="⚠️ Alertas de Inventario"
            subtitle="Ingredientes por debajo del mínimo recomendado"
            action={
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                {lowStock.length} alertas
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {lowStock.slice(0, 8).map(ing => {
                const pct = Math.min((ing.stock / Math.max(ing.minStock || 1, 1)) * 100, 100);
                const isCritical = pct <= 25;
                return (
                  <div key={ing.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${
                    isCritical
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCritical ? 'bg-rose-500/15' : 'bg-amber-500/15'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{ing.name}</p>
                      <p className={`text-[11px] font-bold ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                        {ing.stock} {ing.unit} <span className="text-gray-600 font-normal">/ mín {ing.minStock}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* ── Footer info ── */}
      <div className="flex items-center justify-center gap-2 text-gray-700 text-xs pb-2 relative z-10">
        <Layers className="w-3 h-3" />
        <span>Actualización automática cada 60 segundos</span>
      </div>
    </div>
  );
}
