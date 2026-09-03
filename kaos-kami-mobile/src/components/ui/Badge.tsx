import React from 'react';

export type BadgeVariant =
  | 'pending'
  | 'production'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  pulse = false,
  children,
  className = '',
}: BadgeProps) {
  const styles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    pending: {
      bg: 'bg-amber-500/10 border-amber-500/25',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    production: {
      bg: 'bg-orange-500/10 border-orange-500/25',
      text: 'text-[#FF6B35]',
      dot: 'bg-[#FF6B35]',
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/25',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/25',
      text: 'text-yellow-400',
      dot: 'bg-yellow-400',
    },
    danger: {
      bg: 'bg-red-500/10 border-red-500/25',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
    neutral: {
      bg: 'bg-zinc-800 border-zinc-700/60',
      text: 'text-zinc-300',
      dot: 'bg-zinc-400',
    },
  };

  const style = styles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${style.dot} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <span>{children}</span>
    </span>
  );
}
