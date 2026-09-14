"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
// CWV/P0 bundle: lenis + gsap/ScrollTrigger TIDAK diimpor statis (lenis
// dulunya menambah ±30KB ke setiap halaman via provider global).
// Keduanya di-dynamic-import di dalam useEffect hanya saat rute butuh
// (tak dikecualikan + tanpa prefers-reduced-motion).

// Rute yang TIDAK boleh di-smooth-scroll (audit #34): studio (rebut orbit 3D),
// halaman cetak (gang-sheet/job-ticket), dan admin kanban (gangguan DnD).
const EXCLUDED_PREFIXES = ["/studio", "/admin/orders", "/admin/production"];

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Cleanup aman bila unmount sebelum import selesai (flag cancelled).
    let cancelled = false;
    let lenis: Lenis | null = null;
    let gsapMod: { ticker: { add: (fn: (t: number) => void) => void; remove: (fn: (t: number) => void) => void; lagSmoothing: (v: number) => void } } | null = null;
    let raf: ((time: number) => void) | null = null;
    (async () => {
      const { default: LenisDynamic } = await import("lenis");
      if (cancelled) return;
      lenis = new LenisDynamic({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.95,
      });

      // gsap lazy: ScrollTrigger.update + ticker hanya dipasang setelah modul tiba.
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !lenis) {
        lenis?.destroy();
        lenis = null;
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      gsapMod = gsap;
      lenis.on("scroll", ScrollTrigger.update);

      raf = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    })();

    return () => {
      cancelled = true;
      if (gsapMod && raf) gsapMod.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
    };
  }, [pathname]);

  return <>{children}</>;
};
