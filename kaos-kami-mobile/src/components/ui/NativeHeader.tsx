"use client";

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { haptic } from '@/lib/bridge/haptics';

export interface NativeHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export function NativeHeader({
  title,
  subtitle,
  showBack = false,
  actions,
  onBack,
  className = '',
}: NativeHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    haptic.tap();
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header
      className={`sticky top-0 z-40 bg-[#0E0E10]/85 backdrop-blur-2xl border-b border-zinc-800/80 px-4 pt-[env(safe-area-inset-top)] min-h-14 flex items-center justify-between transition-colors ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Kembali"
            className="w-9 h-9 rounded-xl bg-zinc-800/70 border border-zinc-700/50 flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white font-['Syne'] truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 truncate leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}
