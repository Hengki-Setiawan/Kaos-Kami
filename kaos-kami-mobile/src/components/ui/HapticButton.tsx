"use client";

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { haptic } from '@/lib/bridge/haptics';

export interface HapticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'destructive';
  hapticStyle?: 'tap' | 'tapMedium' | 'tapHeavy' | 'success' | 'error';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function HapticButton({
  children,
  variant = 'primary',
  hapticStyle = 'tap',
  loading = false,
  icon,
  onClick,
  className = '',
  disabled,
  ...props
}: HapticButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    haptic[hapticStyle]();
    if (onClick) onClick(e);
  };

  const variants = {
    primary:
      'bg-[#FF6B35] text-white shadow-lg shadow-orange-600/30 active:bg-orange-600 font-bold border border-orange-500/40',
    secondary:
      'bg-zinc-800 text-white border border-zinc-700/60 active:bg-zinc-700 font-semibold',
    glass:
      'bg-white/10 backdrop-blur-md text-white border border-white/15 active:bg-white/15 font-semibold',
    ghost:
      'bg-transparent text-zinc-300 hover:text-white active:bg-white/5 font-medium',
    destructive:
      'bg-red-600 text-white shadow-lg shadow-red-600/30 active:bg-red-700 font-bold border border-red-500/40',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`min-h-[44px] px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
}
