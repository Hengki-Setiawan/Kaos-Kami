"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { APPAREL_CATALOG } from "@/lib/constants";

/** Tahapan progres studio yang jujur dan informatif */
function tahapUntuk(persen: number, apparelName: string): { judul: string; sub: string } {
  if (persen < 35) return { judul: "Menyiapkan grafis studio WebGL…", sub: "Tahap 1 dari 4 · Menyiapkan kanvas & shader" };
  if (persen < 75) return { judul: `Mengunduh model ${apparelName} 3D…`, sub: "Tahap 2 dari 4 · Mengurai geometri & simpul kain" };
  if (persen < 95) return { judul: "Merajut tekstur & pencahayaan…", sub: "Tahap 3 dari 4 · Mengatur panggung studio" };
  return { judul: "Studio siap!", sub: "Tahap 4 dari 4 · Membuka ruang desain" };
}

export const Preloader: React.FC = () => {
  const { progress, active, total } = useProgress();
  const isStudio3DReady = useConfiguratorStore((s) => s.isStudio3DReady);
  const activeApparel = useConfiguratorStore((s) => s.activeApparel);
  const apparelName = APPAREL_CATALOG[activeApparel]?.name ?? "Baju";

  const [hasCompletedInitial, setHasCompletedInitial] = useState(false);
  const [shouldRenderInitial, setShouldRenderInitial] = useState(true);
  const [keluar, setKeluar] = useState(false);
  const [persen, setPersen] = useState(20);
  const maxPersenRef = useRef(20);
  const mountedRef = useRef(true);

  // Cek apakah preloader sudah pernah ditampilkan pada sesi browsing ini
  useEffect(() => {
    try {
      if (sessionStorage.getItem("kk_intro_shown") === "1") {
        setShouldRenderInitial(false);
        setHasCompletedInitial(true);
        return;
      }
    } catch {}

    // Batas aman maksimum: jika aset 3D / koneksi lambat, paksa buka dalam 2.8s
    const safetyTimer = setTimeout(() => {
      setKeluar(true);
      setTimeout(() => {
        setShouldRenderInitial(false);
        setHasCompletedInitial(true);
        try {
          sessionStorage.setItem("kk_intro_shown", "1");
        } catch {}
      }, 350);
    }, 2800);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Progres halus berbasis aset riil
  useEffect(() => {
    if (hasCompletedInitial) return;

    // Saat model 3D selesai dimount & dirender di WebGL
    if (isStudio3DReady) {
      maxPersenRef.current = 100;
      setPersen(100);
      return;
    }

    // Selama pengunduhan berlangsung via Drei useProgress
    if (total > 0 || active) {
      const scaledDrei = Math.min(88, Math.max(25, Math.round(progress * 0.88)));
      if (scaledDrei > maxPersenRef.current) {
        maxPersenRef.current = scaledDrei;
        setPersen(scaledDrei);
      }
    } else {
      // Indeterminate fallback trickle (20% -> 60%)
      const timer = setInterval(() => {
        if (maxPersenRef.current < 65 && !isStudio3DReady) {
          maxPersenRef.current += 3;
          setPersen(maxPersenRef.current);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [progress, active, total, isStudio3DReady, hasCompletedInitial]);

  // Transisi selesai saat 3D siap
  useEffect(() => {
    mountedRef.current = true;
    if (hasCompletedInitial) return;

    let exitTimer: ReturnType<typeof setTimeout> | null = null;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;

    if (isStudio3DReady && persen >= 100) {
      exitTimer = setTimeout(() => {
        if (mountedRef.current) setKeluar(true);
        removeTimer = setTimeout(() => {
          if (mountedRef.current) {
            setShouldRenderInitial(false);
            setHasCompletedInitial(true);
            try {
              sessionStorage.setItem("kk_intro_shown", "1");
            } catch {}
          }
        }, 350);
      }, 260);
    }

    return () => {
      mountedRef.current = false;
      if (exitTimer) clearTimeout(exitTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, [isStudio3DReady, persen, hasCompletedInitial]);

  const tahap = useMemo(() => tahapUntuk(persen, apparelName), [persen, apparelName]);

  return (
    <>
      {/* 1. Fullscreen Preloader Awal Halaman */}
      {shouldRenderInitial && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Memuat studio 3D"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas pointer-events-none select-none transition-all duration-350 ease-out"
          style={{
            opacity: keluar ? 0 : 1,
            transform: keluar ? "scale(1.03)" : "scale(1)",
          }}
        >
          {/* Ambient Glow di belakang logo */}
          <div className="absolute w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl pointer-events-none animate-halo" />

          <div
            className="relative flex flex-col items-center space-y-5 transition-all duration-350"
            style={{
              opacity: keluar ? 0 : 1,
              transform: keluar ? "scale(0.97)" : "scale(1)",
            }}
          >
            {/* Logo adaptif */}
            <div className="relative h-14 w-auto flex items-center justify-center">
              <img
                src="/brand/logo-white-clean.png"
                alt="Kaos Kami"
                className="h-14 w-auto object-contain logo-dark-mode drop-shadow-md"
              />
              <img
                src="/brand/logo-black-clean.png"
                alt="Kaos Kami"
                className="h-14 w-auto object-contain logo-light-mode drop-shadow-md"
              />
            </div>

            {/* Living Progress Bar dengan Indeterminate Shimmer GPU-accelerated */}
            <div className="relative w-64 h-[4px] bg-border-subtle/80 overflow-hidden rounded-full shadow-inner">
              {/* Bar terisi proporsional */}
              <div
                className="h-full bg-brand-accent transition-[width] duration-300 ease-out shadow-[0_0_14px_rgba(230,81,0,0.9)]"
                style={{ width: `${persen}%` }}
              />
              {/* Shimmer beam bergerak aktif (tidak pernah diam/beku) */}
              <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
            </div>

            {/* Status & Persentase */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
                {tahap.judul}
              </p>
              <p className="font-sans text-[10px] sm:text-[11px] text-text-muted tracking-widest uppercase">
                {tahap.sub} · <span className="text-brand-accent font-bold">{persen}%</span>
              </p>
            </div>

            {/* Stepper Indikator 4 Tahap */}
            <div className="flex gap-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => {
                const aktif = persen >= [15, 35, 75, 95][i]!;
                return (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      aktif ? "w-7 bg-brand-accent shadow-[0_0_8px_rgba(230,81,0,0.6)]" : "w-2 bg-border-subtle"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
