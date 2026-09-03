"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  show: boolean;
  type?: ToastType;
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  show,
  type = 'success',
  message,
  onClose,
  durationMs = 3000,
}: ToastProps) {
  useEffect(() => {
    if (show && durationMs > 0) {
      const timer = setTimeout(onClose, durationMs);
      return () => clearTimeout(timer);
    }
  }, [show, durationMs, onClose]);

  const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  };

  const colors: Record<ToastType, { bg: string; text: string; iconColor: string }> = {
    success: { bg: 'bg-zinc-900/95 border-emerald-500/40', text: 'text-white', iconColor: 'text-emerald-400' },
    warning: { bg: 'bg-zinc-900/95 border-amber-500/40', text: 'text-white', iconColor: 'text-amber-400' },
    error: { bg: 'bg-zinc-900/95 border-red-500/40', text: 'text-white', iconColor: 'text-red-400' },
    info: { bg: 'bg-zinc-900/95 border-blue-500/40', text: 'text-white', iconColor: 'text-blue-400' },
  };

  const Icon = icons[type];
  const color = colors[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-4 inset-x-4 z-50 flex justify-center pointer-events-none"
        >
          <div
            className={`pointer-events-auto max-w-sm w-full p-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3 ${color.bg}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-5 h-5 flex-shrink-0 ${color.iconColor}`} />
              <p className={`text-xs font-medium leading-tight truncate ${color.text}`}>
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
