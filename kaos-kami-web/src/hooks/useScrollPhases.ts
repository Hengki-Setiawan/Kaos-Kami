"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
// P0 bundle: gsap/ScrollTrigger TIDAK diimpor statis — di-dynamic-import di
// dalam effect hanya saat story mode aktif (bukan studio / hide-UI).
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

export const useScrollPhases = () => {
  const { setActivePhase, viewMode, isHideWebsiteUI } = useConfiguratorStore(
    useShallow((s) => ({
      setActivePhase: s.setActivePhase,
      viewMode: s.viewMode,
      isHideWebsiteUI: s.isHideWebsiteUI,
    }))
  );
  const camPosRef = useRef(new THREE.Vector3(0, 0, 2.7));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    // Only run scroll-driven camera choreography when in story mode
    if (viewMode === "studio" || isHideWebsiteUI) return;

    // gsap lazy (story-mode only). Cleanup aman bila unmount/change sebelum
    // import selesai: flag cancelled + ctx/onResize dibuat setelah modul tiba.
    let cancelled = false;
    let ctx: { revert: () => void } | null = null;
    let onResize: (() => void) | null = null;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scrub = prefersReducedMotion ? true : 1.2;

      ctx = gsap.context(() => {
      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-container",
          start: "top top",
          end: "bottom bottom",
          scrub,
          onUpdate: (self) => {
            const progress = self.progress;
            if (progress < 0.32) {
              setActivePhase(1);
            } else if (progress < 0.68) {
              setActivePhase(2);
            } else if (progress < 0.96) {
              setActivePhase(3);
            } else {
              setActivePhase(4);
            }
          },
        },
      });

      const ease = prefersReducedMotion ? "none" : "power2.inOut";

      // Phase 1 -> Phase 2: Kaos berada di kanan (+0.78), kamera tetap seimbang luas agar kaos tidak tertarik ke tengah
      masterTimeline.to(
        camPosRef.current,
        { x: 0.05, y: 0.04, z: 2.2, ease },
        0.32
      );
      masterTimeline.to(
        lookAtRef.current,
        { x: 0.15, y: 0.02, z: 0, ease },
        0.32
      );

      // Phase 2 -> Phase 3: Kaos berada di kiri (-0.82), kamera tetap proporsional memberi ruang luas teks A3+ di kanan
      masterTimeline.to(
        camPosRef.current,
        { x: -0.06, y: 0.02, z: 2.25, ease },
        0.68
      );
      masterTimeline.to(
        lookAtRef.current,
        { x: -0.10, y: 0.02, z: 0, ease },
        0.68
      );

      // Phase 3 -> Phase 4: Kamera kembali ke tengah untuk transisi Katalog & Studio
      masterTimeline.to(
        camPosRef.current,
        { x: 0, y: 0, z: 2.8, ease },
        0.95
      );
      masterTimeline.to(
        lookAtRef.current,
        { x: 0, y: 0, z: 0, ease },
        0.95
      );
    });

      onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);
    })();

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener("resize", onResize);
      try {
        ctx?.revert();
      } catch {}
    };
  }, [setActivePhase, viewMode, isHideWebsiteUI]);

  return { camPos: camPosRef.current, lookAtPos: lookAtRef.current };
};
