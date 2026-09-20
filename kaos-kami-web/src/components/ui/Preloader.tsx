"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useProgress } from "@react-three/drei";

/** Pola eksklusif Sep 2026: loading bertahap ber-copy Indonesia */
function tahapUntuk(persen: number): { judul: string; sub: string } {
  if (persen < 30) return { judul: "Menyiapkan kanvas studio…", sub: "Tahap 1 dari 4 · Menyiapkan kain & material" };
  if (persen < 65) return { judul: "Memuat model kaos 3D…", sub: "Tahap 2 dari 4 · Menjahit geometri digital" };
  if (persen < 92) return { judul: "Menyiapkan meja sablon…", sub: "Tahap 3 dari 4 · Mengatur pencahayaan studio" };
  return { judul: "Hampir siap!", sub: "Tahap 4 dari 4 · Studio siap dibuka" };
}

// Flag tingkat modul: tandai apakah aset 3D sudah pernah sukses dimuat di sesi browser ini
let hasStudioInitiallyLoaded = false;

export const Preloader: React.FC = () => {
  const { progress, active } = useProgress();

  // Jika aset sudah berada di memori / cache dan sedang idle di 100%, jangan pernah render overlay
  const [shouldRender, setShouldRender] = useState(() => {
    if (hasStudioInitiallyLoaded && (!active || progress >= 100)) {
      return false;
    }
    return active && progress < 100;
  });

  const [keluar, setKeluar] = useState(false);
  const mountedRef = useRef(true);

  const persen = Math.max(5, Math.min(100, Math.round(progress)));
  const tahap = useMemo(() => tahapUntuk(active ? persen : 100), [active, persen]);

  useEffect(() => {
    mountedRef.current = true;

    // Jika proses unduh aset 3D baru dimulai
    if (active && progress < 100) {
      setShouldRender(true);
      setKeluar(false);
    }

    // Saat proses unduh Drei tuntas
    if (!active && progress >= 100) {
      hasStudioInitiallyLoaded = true;
      if (shouldRender) {
        // Transisi keluar halus dan cepat (200ms) tanpa jeda beku buatan
        const tExit = setTimeout(() => {
          if (mountedRef.current) setKeluar(true);
          const tDone = setTimeout(() => {
            if (mountedRef.current) setShouldRender(false);
          }, 250);
          return () => clearTimeout(tDone);
        }, 120);
        return () => clearTimeout(tExit);
      }
    }

    // Safety timeout (3500ms) hanya sebagai pengaman jaringan putus/lelet ekstrem
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) {
        setKeluar(true);
        setTimeout(() => {
          if (mountedRef.current) setShouldRender(false);
        }, 250);
      }
    }, 3500);

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
    };
  }, [active, progress, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat studio 3D"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas pointer-events-none select-none transition-all duration-300"
      style={{ opacity: keluar ? 0 : 1, transform: keluar ? "scale(1.02)" : "scale(1)" }}
    >
      <div
        className="flex flex-col items-center space-y-4 transition-all duration-300"
        style={{ opacity: keluar ? 0 : 1, transform: keluar ? "scale(0.98)" : "scale(1)" }}
      >
        {/* Logo adaptif: tampil hitam di mode terang, putih di mode gelap */}
        <div className="h-12 w-auto mb-1 flex items-center justify-center">
          <img
            src="/brand/logo-white-clean.png"
            alt="Kaos Kami"
            className="h-12 w-auto object-contain logo-dark-mode"
          />
          <img
            src="/brand/logo-black-clean.png"
            alt="Kaos Kami"
            className="h-12 w-auto object-contain logo-light-mode"
          />
        </div>

        <div className="w-56 h-[3px] bg-border-subtle overflow-hidden rounded-full">
          <div
            className="h-full bg-brand-accent transition-[width] duration-200 ease-out shadow-[0_0_12px_rgba(230,81,0,0.8)]"
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
