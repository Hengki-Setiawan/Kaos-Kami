"use client";

import React, { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

export const Preloader: React.FC = () => {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Unbreakable safety timer: Preloader auto-fades after max 1.2s regardless of network or 3D status
    const safetyTimer = setTimeout(() => {
      setVisible(false);
    }, 1200);

    if (!active && progress >= 100) {
      const finishTimer = setTimeout(() => setVisible(false), 300);
      return () => {
        clearTimeout(finishTimer);
        clearTimeout(safetyTimer);
      };
    }

    return () => clearTimeout(safetyTimer);
  }, [active, progress]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas transition-opacity duration-500 pointer-events-none select-none"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-brand-accent/40 bg-black/60 shadow-[0_0_24px_rgba(230,81,0,0.4)] animate-pulse">
          <img
            src="/brand/mascot-cool.png"
            alt="Kaos Kami Mascot"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="font-display font-black text-3xl uppercase tracking-tighter text-text-primary">
          kaos kami<span className="text-brand-accent">.</span>
        </span>
        <div className="w-56 h-[3px] bg-border-subtle overflow-hidden rounded-full">
          <div
            className="h-full bg-brand-accent transition-[width] duration-300 ease-out-expo shadow-[0_0_12px_rgba(230,81,0,0.8)]"
            style={{ width: `${Math.max(15, Math.min(100, Math.round(progress)))}%` }}
          />
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px] text-text-muted tracking-widest uppercase">
          <span>INITIALIZING 3D STUDIO</span>
          <span>·</span>
          <span>{Math.max(15, Math.min(100, Math.round(progress)))}%</span>
        </div>
      </div>
    </div>
  );
};
