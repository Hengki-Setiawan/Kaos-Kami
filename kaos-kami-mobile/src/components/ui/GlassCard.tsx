"use client";

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  interactive = false,
  glow = false,
  children,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`relative rounded-3xl bg-[#18181B]/80 backdrop-blur-2xl border border-white/[0.08] shadow-2xl p-4 overflow-hidden ${
        glow ? 'ring-1 ring-orange-500/30' : ''
      } ${interactive ? 'cursor-pointer active:bg-zinc-800/90' : ''} ${className}`}
      {...props}
    >
      {glow && (
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#FF6B35]/15 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
