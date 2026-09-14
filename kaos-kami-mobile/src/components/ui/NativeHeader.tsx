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
      className={`sticky top-0 z-40 bg-canvas/85 backdrop-blur-2xl border-b border-border-subtle px-4 pt-[env(safe-area-inset-top)] min-h-14 flex items-center justify-between transition-colors ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Kembali"
            className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-primary active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-text-primary font-['Syne'] truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-text-muted truncate leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}
