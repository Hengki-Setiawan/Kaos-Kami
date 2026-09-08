"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

    lenis.on("scroll", ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
    };
  }, [pathname]);

  return <>{children}</>;
};
