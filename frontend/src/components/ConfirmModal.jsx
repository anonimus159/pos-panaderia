import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) {
  if (!isOpen) return null;

  const colors = {
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-red-500 to-rose-600',
    info: 'from-blue-500 to-indigo-600'
  };

  const icons = {
    warning: <AlertTriangle className="w-10 h-10 text-amber-500" />,
    danger: <AlertTriangle className="w-10 h-10 text-red-500" />,
    info: <AlertTriangle className="w-10 h-10 text-blue-500" />
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#16161A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          {/* Top Gradient Bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${colors[type]}`} />

          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner`}>
                {icons[type]}
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-2xl font-light text-white mb-2 leading-tight">
              {title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-gray-300 font-bold hover:bg-white/10 transition-all border border-white/5"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r ${colors[type]} text-black font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
