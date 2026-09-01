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
        <img
          src="/brand/logo-white-clean.png"
          alt="Kaos Kami"
          className="h-12 w-auto object-contain mb-1"
        />
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
