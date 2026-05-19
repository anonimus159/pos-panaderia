import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Store, PieChart, LogOut, Package, Archive, ChefHat, Grid, ShoppingCart,
  MonitorPlay, Users, ShieldAlert, Wallet, BarChart2, History, Settings,
  Cake, Clock, Truck, AlertTriangle, Tag, Banknote, CalendarDays,
  Menu, X as CloseIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/useAuthStore';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Products       from './pages/Products';
import Inventory      from './pages/Inventory';
import Bakery         from './pages/Bakery';
import Tables         from './pages/Tables';
import POS            from './pages/POS';
import Kitchen        from './pages/Kitchen';
import TableSession   from './pages/TableSession';
import UsersPage      from './pages/UsersPage';
import CajaCuadre     from './pages/CajaCuadre';
import Historial      from './pages/Historial';
import Reportes       from './pages/Reportes';
import Configuracion  from './pages/Configuracion';
import PedidosEspeciales from './pages/PedidosEspeciales';
import Turnos         from './pages/Turnos';
import Proveedores    from './pages/Proveedores';
import CajaChica      from './pages/CajaChica';
import Descuentos     from './pages/Descuentos';
import AuditLog       from './pages/AuditLog';
import Clientes       from './pages/Clientes';
import Reservaciones  from './pages/Reservaciones';

// Página 403 - Acceso Denegado
function AccessDenied() {
  return (
    <div className="min-h-full flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-3xl font-light text-white mb-3">Acceso Denegado</h2>
        <p className="text-gray-400 leading-relaxed mb-8">No tienes permiso para acceder a este módulo. Contacta al administrador para solicitar acceso.</p>
        <Link to="/" className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-semibold hover:bg-amber-400 transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// Items principales del nav
const ALL_NAV_ITEMS = [
  { path: '/',                  icon: PieChart,     label: 'Dashboard',          module: 'dashboard' },
  { path: '/mesas',             icon: Grid,         label: 'Mesas',              module: 'mesas' },
  { path: '/pos',               icon: ShoppingCart, label: 'Mostrador Rápido',   module: 'pos' },
  { path: '/cocina',            icon: MonitorPlay,  label: 'Cocina (KDS)',        module: 'cocina' },
  { path: '/pedidos-especiales',icon: Cake,         label: 'Pedidos Especiales', module: 'pedidos' },
  { path: '/productos',         icon: Package,      label: 'Menú / Productos',   module: 'productos' },
  { path: '/inventario',        icon: Archive,      label: 'Inventario',         module: 'inventario' },
  { path: '/panaderia',         icon: ChefHat,      label: 'Panadería',          module: 'panaderia' },
  { path: '/turnos',            icon: Clock,        label: 'Turnos',             module: 'caja' },
  { path: '/caja',              icon: Wallet,       label: 'Cuadre de Caja',     module: 'caja' },
  { path: '/caja-chica',        icon: Banknote,     label: 'Caja Chica',         module: 'caja' },
  { path: '/historial',         icon: History,      label: 'Historial Ventas',   module: 'historial' },
  { path: '/reportes',          icon: BarChart2,    label: 'Reportes',           module: 'reportes' },
  { path: '/proveedores',       icon: Truck,        label: 'Proveedores',        module: 'inventario' },
  { path: '/descuentos',        icon: Tag,          label: 'Descuentos',         module: 'pos' },
  { path: '/clientes',          icon: Users,         label: 'Clientes',           module: 'historial' },
  { path: '/reservaciones',     icon: CalendarDays,  label: 'Reservaciones',      module: 'mesas' },
];

// Items de administración — siempre al fondo, sin scroll
const ALL_ADMIN_ITEMS = [
  { path: '/usuarios',      icon: Users,       label: 'Usuarios',      module: 'usuarios' },
  { path: '/auditoria',     icon: ShieldAlert, label: 'Auditoría',     module: 'configuracion' },
  { path: '/configuracion', icon: Settings,    label: 'Configuración', module: 'configuracion' },
];

// Layout Principal con Sidebar
function Layout({ children }) {
  const logoutAction = useAuthStore((state) => state.logout);
  const user         = useAuthStore((state) => state.user);
  const permissions  = useAuthStore((state) => state.permissions);
  const location     = useLocation();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [turnoActivo, setTurnoActivo]     = useState(null);
  
  // Estados para el Sidebar
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logoutAction();
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const r = await fetch('/api/dashboard/low-stock');
        const d = await r.json();
        if (d.success) setLowStockCount(d.data?.length || 0);
      } catch {}
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchTurno = async () => {
      try {
        const r = await fetch('/api/turnos/activo');
        const d = await r.json();
        if (d.success) setTurnoActivo(d.turno);
      } catch {}
    };
    fetchTurno();
    const iv = setInterval(fetchTurno, 60000);
    return () => clearInterval(iv);
  }, []);

  // Socket Listener para notificaciones en tiempo real
  useEffect(() => {
    const socket = io();
    
    socket.on('config_updated', ({ user: updatedBy }) => {
      if (updatedBy !== user?.username) {
        // Podríamos disparar un toast aquí si tuviéramos un sistema de toast global
        console.log('Configuración actualizada por:', updatedBy);
      }
    });

    socket.on('stock_updated', () => {
      // Recargar alertas de stock bajo
      const fetchAlerts = async () => {
        const r = await fetch('/api/dashboard/low-stock');
        const d = await r.json();
        if (d.success) setLowStockCount(d.data?.length || 0);
      };
      fetchAlerts();
    });

    return () => socket.disconnect();
  }, [user]);

  const navItems = user?.role === 'ADMIN'
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter(item => permissions.includes(item.module));

  const adminItems = user?.role === 'ADMIN'
    ? ALL_ADMIN_ITEMS
    : ALL_ADMIN_ITEMS.filter(item => permissions.includes(item.module));

  return (
    <div className="min-h-screen text-amber-500 flex font-sans relative overflow-hidden" style={{height:'100vh'}}>
      {/* High-Luminosity Living Background */}
      <div className="modern-bg" />
      
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Orbs - MAX VIBRANCY */}
        <motion.div 
          animate={{ 
            x: [-100, 200, -100], 
            y: [-100, 100, -100],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-amber-500/20 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            x: [100, -100, 100], 
            y: [200, -50, 200],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[80%] rounded-full bg-emerald-500/15 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px]" 
        />

        {/* Dynamic HUD Grid - Using inline styles for complex gradients to avoid PostCSS parsing errors */}
        <div 
          className="absolute inset-0 opacity-40" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} 
        />
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '128px 100%'
          }} 
        />
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '100% 128px'
          }} 
        />
      </div>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed && !isMobile ? 80 : 260,
          x: isMobile ? (isMobileOpen ? 0 : -260) : 0
        }}
        className={`fixed lg:relative h-full bg-[#16161A]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col z-[101] shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out`}
      >
        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-12 w-6 h-6 bg-amber-500 rounded-full items-center justify-center text-black shadow-lg hover:scale-110 transition-transform z-[110]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Area */}
        <div className={`px-6 py-6 flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-2xl">
            <Store className="w-6 h-6 text-black" />
          </div>
          {!isCollapsed && (
            <motion.h1 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xl font-bold tracking-tight text-white"
            >
              POS <span className="text-amber-500">Grecia</span>
            </motion.h1>
          )}
        </div>

        {/* User Info */}
        <div className={`px-4 mb-6 flex-shrink-0`}>
          <div className={`flex items-center gap-3 bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all ${isCollapsed ? 'p-2 justify-center' : 'p-3'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center font-bold text-black text-xs uppercase flex-shrink-0">
              {user?.username?.charAt(0)}
            </div>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
                <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">{user?.role}</p>
              </motion.div>
            )}
            {turnoActivo && !isCollapsed && (
              <div className="ml-auto flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" title={`Turno activo: ${turnoActivo.nombre}`} />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto px-3 scrollbar-hide scrollbar-none min-h-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const hasAlert = (item.module === 'inventario' && lowStockCount > 0) || 
                             (item.module === 'caja' && item.path === '/turnos' && turnoActivo);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsMobileOpen(false)}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all font-medium group relative ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'hover:bg-white/5 text-gray-300 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-amber-500 transition-colors'}`} />
                {!isCollapsed && <span className="flex-1 truncate text-sm">{item.label}</span>}
                
                {hasAlert && (
                  <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-3'} flex h-2 w-2`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto px-3 py-4 border-t border-white/5 space-y-1">
          {!isCollapsed && adminItems.length > 0 && (
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold px-3 pb-1">Administración</p>
          )}
          {adminItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && setIsMobileOpen(false)}
              className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all font-medium group ${
                location.pathname === item.path
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'hover:bg-white/5 text-gray-500 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${location.pathname === item.path ? 'text-amber-500' : 'group-hover:text-amber-500 transition-colors'}`} />
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 py-2.5 px-3 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl transition-all group mt-2 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm">Salir</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-[#16161A]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-40">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-bold text-white">
            POS <span className="text-amber-500">Grecia</span>
          </h2>
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-black text-xs">
            {user?.username?.charAt(0)}
          </div>
        </header>

        <main className="flex-1 overflow-auto relative z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

// Protected Route — verifica autenticación Y módulo requerido
const ProtectedRoute = ({ children, requiredModule }) => {
  const { isAuthenticated, user, permissions } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredModule && user?.role !== 'ADMIN' && !permissions.includes(requiredModule)) {
    // Si intenta entrar al home y no tiene permiso de dashboard, buscar el primer módulo permitido
    if (requiredModule === 'dashboard' && permissions.length > 0) {
      const firstModule = ALL_NAV_ITEMS.find(item => permissions.includes(item.module));
      if (firstModule) return <Navigate to={firstModule.path} replace />;
    }
    return <Layout><AccessDenied /></Layout>;
  }

  return <Layout>{children}</Layout>;
};

// 🛰️ Scanner Global de Códigos de Barras
function BarcodeScanner() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      
      if (now - lastKeyTimeRef.current > 100) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const fullCode = bufferRef.current.toUpperCase();
        if (fullCode.startsWith('MESA')) {
          e.preventDefault();
          e.stopPropagation();
          const tableId = fullCode.replace('MESA', '');
          if (tableId) {
            navigate(`/mesas/${tableId}?checkout=true`);
          }
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Usar capture: true
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [navigate]);

  return null;
}

function App() {
  const { login, logout, setLoading, isLoading, user } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          login(data.user, data.permissions || []);
        } else {
          logout();
        }
      } catch (err) {
        logout();
      } finally {
        // Delay para apreciar la animación futurista
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      }
    };
    checkAuth();
  }, [login, logout, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Futuristic Background HUD */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" />
          
          {/* HUD Corners */}
          <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-white/10 rounded-tl-3xl" />
          <div className="absolute top-10 right-10 w-20 h-20 border-t border-r border-white/10 rounded-tr-3xl" />
          <div className="absolute bottom-10 left-10 w-20 h-20 border-b border-l border-white/10 rounded-bl-3xl" />
          <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-white/10 rounded-br-3xl" />
          
          {/* Moving Scanline */}
          <motion.div 
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-transparent via-amber-500/5 to-transparent z-0"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Core Spinner */}
          <div className="relative w-32 h-32 mb-12">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-dashed border-amber-500/20 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border border-dashed border-amber-500/40 rounded-full"
            />
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-8 border-t-2 border-amber-500 rounded-full shadow-2xl"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.h2 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl font-black text-white tracking-[0.4em] uppercase mb-2"
            >
              {user ? 'Bienvenido' : 'POS Grecia'}
            </motion.h2>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
              <p className="text-amber-500 text-[10px] uppercase tracking-[0.5em] font-bold">
                {user ? user.username : 'Iniciando Core'}
              </p>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ backgroundColor: ['#4B5563', '#F59E0B', '#4B5563'] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 h-1 rounded-full"
                  />
                ))}
              </div>
              <p className="text-gray-600 text-[8px] uppercase tracking-widest mt-2">
                Encriptación AES-256 Activa
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <BarcodeScanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas */}
        <Route path="/"                   element={<ProtectedRoute requiredModule="dashboard">    <Dashboard />          </ProtectedRoute>} />
        <Route path="/productos"          element={<ProtectedRoute requiredModule="productos">    <Products />           </ProtectedRoute>} />
        <Route path="/inventario"         element={<ProtectedRoute requiredModule="inventario">   <Inventory />          </ProtectedRoute>} />
        <Route path="/panaderia"          element={<ProtectedRoute requiredModule="panaderia">    <Bakery />             </ProtectedRoute>} />
        <Route path="/mesas"              element={<ProtectedRoute requiredModule="mesas">        <Tables />             </ProtectedRoute>} />
        <Route path="/mesas/:id"          element={<ProtectedRoute requiredModule="mesas">        <TableSession />       </ProtectedRoute>} />
        <Route path="/pos"                element={<ProtectedRoute requiredModule="pos">          <POS />                </ProtectedRoute>} />
        <Route path="/cocina"             element={<ProtectedRoute requiredModule="cocina">       <Kitchen />            </ProtectedRoute>} />
        <Route path="/usuarios"           element={<ProtectedRoute requiredModule="usuarios">     <UsersPage />          </ProtectedRoute>} />
        <Route path="/caja"               element={<ProtectedRoute requiredModule="caja">         <CajaCuadre />         </ProtectedRoute>} />
        <Route path="/historial"          element={<ProtectedRoute requiredModule="historial">    <Historial />          </ProtectedRoute>} />
        <Route path="/reportes"           element={<ProtectedRoute requiredModule="reportes">     <Reportes />           </ProtectedRoute>} />
        <Route path="/configuracion"      element={<ProtectedRoute requiredModule="configuracion"><Configuracion />      </ProtectedRoute>} />
        <Route path="/pedidos-especiales" element={<ProtectedRoute requiredModule="pedidos">      <PedidosEspeciales />  </ProtectedRoute>} />
        <Route path="/turnos"             element={<ProtectedRoute requiredModule="caja">         <Turnos />             </ProtectedRoute>} />
        <Route path="/proveedores"        element={<ProtectedRoute requiredModule="inventario">   <Proveedores />        </ProtectedRoute>} />
        <Route path="/caja-chica"         element={<ProtectedRoute requiredModule="caja">         <CajaChica />          </ProtectedRoute>} />
        <Route path="/descuentos"         element={<ProtectedRoute requiredModule="pos">          <Descuentos />         </ProtectedRoute>} />
        <Route path="/clientes"           element={<ProtectedRoute requiredModule="historial">    <Clientes />           </ProtectedRoute>} />
        <Route path="/reservaciones"      element={<ProtectedRoute requiredModule="mesas">        <Reservaciones />      </ProtectedRoute>} />
        <Route path="/auditoria"          element={<ProtectedRoute requiredModule="configuracion"><AuditLog />           </ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
