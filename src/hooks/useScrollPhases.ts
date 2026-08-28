"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const useScrollPhases = () => {
  const { setActivePhase, viewMode, isHideWebsiteUI } = useConfiguratorStore();
  const camPosRef = useRef(new THREE.Vector3(0, 0, 2.7));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    // Only run scroll-driven camera choreography when in story mode
    if (viewMode === "studio" || isHideWebsiteUI) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrub = prefersReducedMotion ? true : 1.2;

    const ctx = gsap.context(() => {
      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-container",
          start: "top top",
          end: "bottom bottom",
          scrub,
          onUpdate: (self) => {
            const progress = self.progress;
            if (progress < 0.28) {
              setActivePhase(1);
            } else if (progress < 0.62) {
              setActivePhase(2);
            } else if (progress < 0.88) {
              setActivePhase(3);
            } else {
              setActivePhase(4);
            }
          },
        },
      });

      const ease = prefersReducedMotion ? "none" : "power2.inOut";

      // Phase 1 -> Phase 2 (Macro Inspection Zoom into Left Screen)
      masterTimeline.to(
        camPosRef.current,
        { x: -0.15, y: 0.12, z: 1.5, ease },
        0.32
      );
      masterTimeline.to(
        lookAtRef.current,
        { x: -0.35, y: 0.08, z: 0, ease },
        0.32
      );

      // Phase 2 -> Phase 3 (Back to Full Framing for 180° Rear Reveal on Right Screen)
      masterTimeline.to(
        camPosRef.current,
        { x: 0, y: 0, z: 2.7, ease },
        0.68
      );
      masterTimeline.to(
        lookAtRef.current,
        { x: 0, y: 0, z: 0, ease },
        0.68
      );

      // Phase 3 -> Phase 4 (Centered Stage for Lookbook & Studio Portal)
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

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [setActivePhase, viewMode, isHideWebsiteUI]);

  return { camPos: camPosRef.current, lookAtPos: lookAtRef.current };
};
