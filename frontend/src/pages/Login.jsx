import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Store, Loader2, User, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        login(data.user, data.permissions);
        useAuthStore.getState().setLoading(true);
        navigate('/');
        setTimeout(() => {
          useAuthStore.getState().setLoading(false);
        }, 1500);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans selection:bg-amber-500/30 relative overflow-hidden">
      <div className="modern-bg" />
      {/* Background Animated Particles - STABLE & VIBRANT */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              y: [0, -250, 0],
              x: [0, (i % 2 === 0 ? 50 : -50), 0],
              rotate: [0, 180, 360],
              opacity: [0, 0.15, 0]
            }}
            transition={{ 
              duration: 15 + Math.random() * 10, 
              repeat: Infinity, 
              delay: i * 1.2,
              ease: "easeInOut"
            }}
            className="absolute bg-white/5 border border-white/10 rounded-2xl"
            style={{
              width: 40 + Math.random() * 80,
              height: 40 + Math.random() * 80,
              top: `${10 + Math.random() * 80}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          />
        ))}
        
        {/* Glow Accents */}
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Left Side: Professional Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/5">
        <motion.img 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          src="/bakery_corporate_bg_1778133562100.png" 
          alt="Corporate Bakery" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0C] via-transparent to-transparent" />
        
        <div className="absolute bottom-20 left-20 z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-[2px] bg-amber-500" />
              <p className="text-amber-500 uppercase tracking-[0.3em] text-[10px] font-bold">Enterprise Management</p>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight mb-6">
              El arte de la panadería, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">gestionado con precisión.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              Sistema unificado de Punto de Venta e Inventario. Diseñado para la eficiencia operativa de Panadería Grecia.
            </p>
          </motion.div>
        </div>

        {/* HUD Decoration */}
        <div className="absolute top-10 left-10 text-[10px] text-white/20 font-mono tracking-widest flex flex-col gap-1">
          <span>SYSTEM_VERSION: 2.4.0</span>
          <span>SECURE_ENCRYPTION: ENABLED</span>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 lg:hidden pointer-events-none opacity-20">
           <img src="/bakery_corporate_bg_1778133562100.png" className="w-full h-full object-cover blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-2xl group">
              <Store className="w-10 h-10 text-amber-500 transition-transform group-hover:scale-110" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Acceso <span className="text-amber-500">Corporativo</span></h1>
            <p className="text-gray-500 mt-3 text-sm font-medium">Ingresa tus credenciales de administrador</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1">Usuario del Sistema</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-all placeholder-gray-700"
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1">Contraseña de Seguridad</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-all placeholder-gray-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-4 rounded-2xl mt-4 transition-all flex items-center justify-center gap-2 group shadow-[0_10px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_15px_30px_rgba(245,158,11,0.3)] active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar al Sistema
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Protocolo SSL-Secure Activo
            </div>
            <p className="text-gray-700 text-[10px] text-center font-medium">
              &copy; 2026 Panadería Grecia &bull; Terminal Autorizada
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
