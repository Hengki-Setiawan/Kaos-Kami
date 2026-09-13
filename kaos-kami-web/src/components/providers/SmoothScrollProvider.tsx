"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
// P0 bundle: gsap/ScrollTrigger TIDAK diimpor statis (dulunya menambah ±70KB
// ke setiap halaman via provider global). Di-dynamic-import hanya saat story
// mode butuh (rute tak dikecualikan + tanpa prefers-reduced-motion).

// Rute yang TIDAK boleh di-smooth-scroll (audit #34): studio (rebut orbit 3D),
// halaman cetak (gang-sheet/job-ticket), dan admin kanban (gangguan DnD).
const EXCLUDED_PREFIXES = ["/studio", "/admin/orders", "/admin/production"];

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.95,
    });

    // gsap lazy: ScrollTrigger.update + ticker hanya dipasang setelah modul tiba.
    // Cleanup aman bila unmount sebelum import selesai (flag cancelled).
    let cancelled = false;
    let gsapMod: { ticker: { add: (fn: (t: number) => void) => void; remove: (fn: (t: number) => void) => void; lagSmoothing: (v: number) => void } } | null = null;
    let raf: ((time: number) => void) | null = null;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      gsapMod = gsap;
      lenis.on("scroll", ScrollTrigger.update);

      raf = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    })();

    return () => {
      cancelled = true;
      if (gsapMod && raf) gsapMod.ticker.remove(raf);
      lenis.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
};
