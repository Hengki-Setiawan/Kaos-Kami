"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

function StudioInitialLoader() {
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 80 ? prev + Math.floor(Math.random() * 8 + 3) : prev));
    }, 180);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center bg-canvas text-text-primary select-none overflow-hidden relative">
      <div className="absolute w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl pointer-events-none animate-halo" />
      <div className="relative flex flex-col items-center space-y-4 animate-in fade-in duration-300">
        <div className="h-12 w-auto mb-1 flex items-center justify-center">
          <img
            src="/brand/logo-white-clean.png"
            alt="Kaos Kami"
            className="h-12 w-auto object-contain logo-dark-mode drop-shadow-sm"
          />
          <img
            src="/brand/logo-black-clean.png"
            alt="Kaos Kami"
            className="h-12 w-auto object-contain logo-light-mode drop-shadow-sm"
          />
        </div>
        <div className="relative w-64 h-[4px] bg-border-subtle/80 overflow-hidden rounded-full shadow-inner">
          <div
            className="h-full bg-brand-accent transition-[width] duration-200 ease-out shadow-[0_0_12px_rgba(230,81,0,0.8)]"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
        </div>
        <p className="font-sans text-[11px] text-text-muted tracking-widest uppercase">
          Menyiapkan Studio 3D… <span className="text-brand-accent font-bold">{progress}%</span>
        </p>
      </div>
    </main>
  );
}

// Boundary client khusus untuk dynamic(ssr:false). page.tsx tetap Server
// Component (metadata) — pola ini yang didukung Next: ssr:false hanya
// boleh di dalam Client Component.
const StudioClient = dynamic(() => import("./StudioClient").then((m) => m.StudioClient), {
  ssr: false,
  loading: () => <StudioInitialLoader />,
});

export default function StudioClientLoader() {
  return <StudioClient />;
}
