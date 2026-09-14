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
      className={`relative rounded-3xl bg-surface/80 backdrop-blur-2xl border border-border-subtle shadow-2xl p-4 overflow-hidden transition-colors ${
        glow ? 'ring-1 ring-brand-accent/30' : ''
      } ${interactive ? 'cursor-pointer active:bg-surface-elevated' : ''} ${className}`}
      {...props}
    >
      {glow && (
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-accent/15 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
