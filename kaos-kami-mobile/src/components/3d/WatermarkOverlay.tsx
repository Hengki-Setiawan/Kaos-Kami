"use client";

import React from 'react';

export function WatermarkOverlay({ isProUser = false }: { isProUser?: boolean }) {
  if (isProUser) return null;
  return (
    <div className="absolute bottom-3 right-3 z-20 pointer-events-none opacity-60">
      <span className="text-[11px] font-bold text-white bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10 font-['Syne']">
        KAOS KAMI MAKASSAR
      </span>
    </div>
  );
}
