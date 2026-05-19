import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, X, Search, Phone, Mail, Star, History,
  ChevronRight, Edit2, RefreshCw, TrendingUp, ShoppingBag,
  CheckCircle, Gift, Award
} from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

function getInicial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase();
}

function clienteAvatar(nombre) {
  const colors = ['from-amber-400 to-orange-500', 'from-blue-400 to-cyan-500', 'from-emerald-400 to-teal-500',
    'from-purple-400 to-pink-500', 'from-rose-400 to-red-500', 'from-indigo-400 to-blue-500'];
  const idx = (nombre || '').charCodeAt(0) % colors.length;
  return colors[idx];
}

import ModalCliente from '../components/ModalCliente';

function ClienteDetail({ cliente, onEdit, onRefresh }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/clientes/${cliente.id}/historial`);
        const d = await r.json();
        if (d.success) setHistorial(d.ventas);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [cliente.id]);

  const nivel = cliente.totalGastado > 5000 ? 'VIP' : cliente.totalGastado > 1000 ? 'Frecuente' : 'Nuevo';
  const nivelColor = nivel === 'VIP' ? 'text-amber-400' : nivel === 'Frecuente' ? 'text-blue-400' : 'text-gray-400';

  return (
    <div className="space-y-5">
      {/* Perfil */}
      <div className="bg-[#14141A] border border-white/5 rounded-3xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${clienteAvatar(cliente.nombre)} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
              {getInicial(cliente.nombre)}
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">{cliente.nombre}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Award className={`w-4 h-4 ${nivelColor}`} />
                <span className={`text-xs font-bold ${nivelColor}`}>{nivel}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {cliente.telefono && <span className="text-gray-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefono}</span>}
                {cliente.email    && <span className="text-gray-500 text-xs flex items-center gap-1"><Mail  className="w-3 h-3" />{cliente.email}</span>}
              </div>
              {cliente.notas && <p className="text-gray-600 text-xs mt-1.5 italic">{cliente.notas}</p>}
            </div>
          </div>
          <button onClick={onEdit} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: fmt(cliente.totalGastado), l: 'Total gastado',  c: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
            { v: historial.length,          l: 'Compras',        c: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
            { v: cliente.puntos,            l: 'Puntos',         c: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(k => (
            <div key={k.l} className={`${k.bg} border rounded-2xl p-4 text-center`}>
              <p className={`text-xl font-bold ${k.c}`}>{k.v}</p>
              <p className="text-xs text-gray-500 mt-1">{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h4 className="text-white font-semibold text-sm flex items-center gap-2"><History className="w-4 h-4 text-gray-500" /> Historial de Compras</h4>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : historial.length === 0 ? (
          <div className="text-center py-12 text-gray-600"><ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin compras registradas</p></div>
        ) : (
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {historial.map(v => (
              <div key={v.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">{v.order?.table?.name || v.order?.type || 'Mostrador'}</p>
                  <p className="text-gray-600 text-xs">{fmtDate(v.createdAt)} {fmtTime(v.createdAt)} · {v.method}</p>
                </div>
                <span className="text-amber-400 font-bold text-sm">{fmt(v.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal]       = useState(false);
  const [editC, setEditC]       = useState(null);
  const [filtro, setFiltro]     = useState('todos'); // 'todos' | 'vip' | 'frecuente'

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/clientes');
      const d = await r.json();
      if (d.success) setClientes(d.clientes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getNivel = (c) => c.totalGastado > 5000 ? 'vip' : c.totalGastado > 1000 ? 'frecuente' : 'nuevo';

  const filtered = clientes.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono || '').includes(search) || (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'todos' ? true : getNivel(c) === filtro;
    return matchSearch && matchFiltro;
  });

  const stats = {
    total: clientes.length,
    vip: clientes.filter(c => c.totalGastado > 5000).length,
    frecuentes: clientes.filter(c => c.totalGastado > 1000 && c.totalGastado <= 5000).length,
    totalGastado: clientes.reduce((s, c) => s + c.totalGastado, 0),
  };

  if (loading) return <div className="flex items-center justify-center min-h-full"><div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-amber-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between mb-6 relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">Gestión de <span className="font-bold text-amber-400">Clientes</span></h2>
          <p className="text-gray-500 text-sm mt-1">Base de clientes, historial de compras y programa de puntos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setEditC(null); setModal(true); }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        {[
          { v: stats.total,      l: 'Clientes',       c: 'text-white',        bg: 'bg-[#14141A] border-white/5' },
          { v: stats.vip,        l: 'VIP (>$5,000)',  c: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
          { v: stats.frecuentes, l: 'Frecuentes',     c: 'text-blue-400',     bg: 'bg-blue-500/10 border-blue-500/20' },
          { v: fmt(stats.totalGastado), l: 'Total acumulado', c: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(k => (
          <div key={k.l} className={`${k.bg} border rounded-2xl p-4 text-center`}>
            <p className={`text-xl font-bold ${k.c}`}>{k.v}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        {/* Lista */}
        <div className="xl:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, tel, email..."
              className="w-full bg-[#14141A] border border-white/5 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2">
            {[['todos', 'Todos'], ['vip', '⭐ VIP'], ['frecuente', '🔵 Frecuentes']].map(([k, l]) => (
              <button key={k} onClick={() => setFiltro(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filtro === k ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-1.5 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
            {filtered.map(c => {
              const nivel = getNivel(c);
              return (
                <div key={c.id} onClick={() => setSelected(c)}
                  className={`bg-[#14141A] border rounded-2xl p-4 cursor-pointer transition-all ${selected?.id === c.id ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${clienteAvatar(c.nombre)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {getInicial(c.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm truncate">{c.nombre}</p>
                      {c.telefono && <p className="text-gray-500 text-xs">{c.telefono}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-amber-400 font-bold text-xs">{fmt(c.totalGastado)}</span>
                      {nivel === 'vip' && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin clientes{search ? ' encontrados' : ' registrados'}</p>
                {!search && <button onClick={() => { setEditC(null); setModal(true); }} className="mt-3 text-amber-400 text-xs hover:underline">Registrar primer cliente</button>}
              </div>
            )}
          </div>
        </div>

        {/* Detalle */}
        <div className="xl:col-span-2">
          {!selected ? (
            <div className="bg-[#14141A] border border-white/5 rounded-3xl flex flex-col items-center justify-center py-24 text-center">
              <Users className="w-14 h-14 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Selecciona un cliente</p>
              <p className="text-gray-600 text-sm mt-1">para ver su perfil e historial</p>
            </div>
          ) : (
            <ClienteDetail
              cliente={selected}
              onEdit={() => { setEditC(selected); setModal(true); }}
              onRefresh={load}
            />
          )}
        </div>
      </div>

      {modal && (
        <ModalCliente
          cliente={editC}
          onClose={() => { setModal(false); setEditC(null); }}
          onSaved={() => { load(); if (selected && editC?.id === selected.id) setSelected(null); }}
        />
      )}
    </div>
  );
}
