"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
// CWV/P0 bundle: lenis + gsap/ScrollTrigger TIDAK diimpor statis (lenis
// dulunya menambah ±30KB ke setiap halaman via provider global).
// Keduanya di-dynamic-import di dalam useEffect hanya saat rute butuh
// (tak dikecualikan + tanpa prefers-reduced-motion).

// Rute yang TIDAK boleh di-smooth-scroll: studio (rebut orbit 3D),
// seluruh panel /admin (butuh responsivitas native 0ms tanpa damping delay),
// dan /dashboard / /track / /invoices (formulir, tabel pesanan, dan checkout data).
const EXCLUDED_PREFIXES = ["/studio", "/admin", "/dashboard", "/track", "/invoices"];

/**
 * Resilient dynamic import with retry to survive transient compilation delays in dev mode.
 */
async function retryImport<T>(loader: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, delayMs));
    return retryImport(loader, retries - 1, delayMs * 1.5);
  }
}

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
      try {
        const { default: LenisDynamic } = await retryImport(() => import("lenis"));
        if (cancelled) return;

        lenis = new LenisDynamic({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 0.95,
        });

        if (typeof window !== "undefined") {
          (window as any).__lenis = lenis;
        }

        // gsap lazy: ScrollTrigger.update + ticker hanya dipasang setelah modul tiba.
        const [{ gsap }, { ScrollTrigger }] = await retryImport(() =>
          Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
        );

        if (cancelled || !lenis) {
          lenis?.destroy();
          lenis = null;
          if (typeof window !== "undefined") delete (window as any).__lenis;
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
      } catch (err) {
        // Fallback: Bila chunk lenis/gsap timeout/gagal dimuat di dev server atau jaringan lambat,
        // turun ke native smooth scroll browser tanpa merusak aplikasi (Zero ChunkLoadError crash).
        console.warn("[SmoothScrollProvider] Dynamic chunk import bypassed, fallback to native scroll:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") delete (window as any).__lenis;
      if (gsapMod && raf) gsapMod.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
    };
  }, [pathname]);

  return <>{children}</>;
};
