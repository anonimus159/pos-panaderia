import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Search, RefreshCw, User, Calendar,
  ChevronDown, Filter, Download, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const ACCION_COLORS = {
  LOGIN:             'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  LOGOUT:            'text-gray-400   bg-gray-500/10   border-gray-500/20',
  TURNO_ABIERTO:     'text-blue-400   bg-blue-500/10   border-blue-500/20',
  TURNO_CERRADO:     'text-purple-400 bg-purple-500/10 border-purple-500/20',
  VENTA:             'text-amber-400  bg-amber-500/10  border-amber-500/20',
  CANCELACION:       'text-rose-400   bg-rose-500/10   border-rose-500/20',
  COMPRA_PROVEEDOR:  'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
  CAJA_CHICA:        'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CONFIG_UPDATE:     'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  USER_CREATED:      'text-teal-400   bg-teal-500/10   border-teal-500/20',
  PASSWORD_CHANGE:   'text-pink-400   bg-pink-500/10   border-pink-500/20',
};

const ACCIONES_FILTER = [
  'Todas', 'LOGIN', 'LOGOUT', 'TURNO_ABIERTO', 'TURNO_CERRADO',
  'VENTA', 'CANCELACION', 'COMPRA_PROVEEDOR', 'CAJA_CHICA',
  'CONFIG_UPDATE', 'USER_CREATED', 'PASSWORD_CHANGE',
];

export default function AuditLog() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [accion, setAccion]     = useState('Todas');
  const [fecha, setFecha]       = useState('');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search)                 params.append('search', search);
      if (accion !== 'Todas')     params.append('accion', accion);
      if (fecha)                  params.append('fecha', fecha);
      const r = await fetch(`/api/audit?${params}`);
      const d = await r.json();
      if (d.success) { setLogs(d.logs); setTotal(d.total); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, accion, fecha]);

  useEffect(() => { setPage(1); }, [search, accion, fecha]);
  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    const rows = logs.map(l => ({
      'Fecha':    fmtDate(l.createdAt),
      'Hora':     fmtTime(l.createdAt),
      'Usuario':  l.usuario,
      'Acción':   l.accion,
      'Detalle':  l.detalle || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    XLSX.writeFile(wb, `auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8 space-y-5 min-h-full relative">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-indigo-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">
            Bitácora de <span className="font-bold text-indigo-400">Auditoría</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Registro de todas las acciones críticas del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-gray-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 relative z-10">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario, detalle..."
            className="w-full bg-[#14141A] border border-white/5 text-white rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/30 transition-colors" />
        </div>

        <div className="relative">
          <select value={accion} onChange={e => setAccion(e.target.value)}
            className="bg-[#14141A] border border-white/5 text-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none appearance-none pr-8 cursor-pointer">
            {ACCIONES_FILTER.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 pointer-events-none" />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="bg-[#14141A] border border-white/5 text-gray-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none cursor-pointer" />
        </div>

        {(search || accion !== 'Todas' || fecha) && (
          <button onClick={() => { setSearch(''); setAccion('Todas'); setFecha(''); }}
            className="px-4 py-2.5 rounded-2xl text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors border border-white/5">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xl font-bold text-white">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Registros totales</p>
        </div>
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xl font-bold text-indigo-400">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">En esta página</p>
        </div>
        <div className="bg-[#14141A] border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-xl font-bold text-amber-400">{totalPages}</p>
          <p className="text-xs text-gray-500 mt-0.5">Páginas</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#14141A] border border-white/5 rounded-3xl overflow-hidden relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ShieldAlert className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Sin registros de auditoría{search ? ' que coincidan' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 text-left font-bold w-36">Fecha/Hora</th>
                  <th className="px-6 py-4 text-left font-bold w-32">Usuario</th>
                  <th className="px-6 py-4 text-left font-bold w-40">Acción</th>
                  <th className="px-6 py-4 text-left font-bold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const colorClass = ACCION_COLORS[log.accion] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
                  return (
                    <tr key={log.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-6 py-3">
                        <p className="text-gray-300 text-xs">{fmtDate(log.createdAt)}</p>
                        <p className="text-gray-600 text-[10px] flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{fmtTime(log.createdAt)}</p>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-amber-400/30 to-amber-600/30 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
                            {log.usuario?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-white text-xs font-medium">{log.usuario}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wide ${colorClass}`}>
                          {log.accion.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 text-xs max-w-md truncate">
                        {log.detalle || <span className="text-gray-700 italic">sin detalle</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between relative z-10">
          <p className="text-xs text-gray-500">Página {page} de {totalPages} — {total} registros</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-xl text-sm bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all">Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-xl text-sm bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
