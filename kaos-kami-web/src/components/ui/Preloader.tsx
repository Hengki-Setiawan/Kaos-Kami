"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useProgress } from "@react-three/drei";

/** Pola eksklusif Sep 2026: loading bertahap ber-copy Indonesia + reveal
 * scale/opacity (tanpa ubah logika safety: tetap auto-hilang). */
function tahapUntuk(persen: number): { judul: string; sub: string } {
  if (persen < 30) return { judul: "Menyiapkan kanvas studio…", sub: "Tahap 1 dari 4 · Sabar ya, lagi gelar kain" };
  if (persen < 65) return { judul: "Memuat model kaos 3D…", sub: "Tahap 2 dari 4 · Menjahit model digital" };
  if (persen < 92) return { judul: "Menyiapkan meja sablon…", sub: "Tahap 3 dari 4 · Mengatur tinta & pencahayaan" };
  return { judul: "Hampir jadi — silakan utak-atik!", sub: "Tahap 4 dari 4 · Studio siap dibuka" };
}

export const Preloader: React.FC = () => {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [keluar, setKeluar] = useState(false);

  const persen = Math.max(5, Math.min(100, Math.round(progress)));
  const tahap = useMemo(() => tahapUntuk(active ? persen : 100), [active, persen]);

  useEffect(() => {
    // CWV: safety turun 3000→800ms agar overlay tak menahan FCP/LCP;
    // tetap auto-hilang tanpa menggantung bila jaringan/3D macet.
    const safetyTimer = setTimeout(() => {
      setKeluar(true);
      setTimeout(() => setVisible(false), 450);
    }, 800);

    if (!active && progress >= 100) {
      const finishTimer = setTimeout(() => {
        setKeluar(true);
        setTimeout(() => setVisible(false), 450);
      }, 350);
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
      role="status"
      aria-live="polite"
      aria-label="Memuat studio 3D"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas pointer-events-none select-none transition-all duration-500"
      style={{ opacity: keluar ? 0 : 1, transform: keluar ? "scale(1.04)" : "scale(1)" }}
    >
      <div
        className="flex flex-col items-center space-y-4 transition-all duration-500"
        style={{ opacity: keluar ? 0 : 1, transform: keluar ? "scale(0.96)" : "scale(1)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
        <img
          src="/brand/logo-white-clean.png"
          alt="Kaos Kami"
          className="h-12 w-auto object-contain mb-1"
        />
        <div className="w-56 h-[3px] bg-border-subtle overflow-hidden rounded-full">
          <div
            className="h-full bg-brand-accent transition-[width] duration-300 ease-out-expo shadow-[0_0_12px_rgba(230,81,0,0.8)]"
            style={{ width: `${persen}%` }}
          />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-bold text-text-primary">{tahap.judul}</p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">
            {tahap.sub} · {persen}%
          </p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => {
            const aktif = persen >= [5, 30, 65, 92][i]!;
            return (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${aktif ? "w-6 bg-brand-accent" : "w-1.5 bg-border-subtle"}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
