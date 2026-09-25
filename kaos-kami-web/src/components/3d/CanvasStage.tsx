"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Canvas, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { AdaptiveDpr, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { StudioLighting } from "./StudioLighting";
import { ApparelMeshRenderer } from "./ApparelMeshRenderer";
import { CameraRig } from "./CameraRig";
import { TestLabOverlay3D } from "./TestLabOverlay3D";
import { PrintZoneGuide } from "./PrintZoneGuide";

/**
 * Cermin transform grup model agar overlay kain (PrintZoneGuide) menempel 1:1
 * walau user menggeser/zoom model. Rumus SAMA dengan semua *Model.tsx
 * (story: pos tetap + scale 1; studio: modelPos + modelScale).
 */
const ModelTransformMirror: React.FC = () => {
  const { viewMode, modelPosX, modelPosY, modelScale } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
      modelScale: s.modelScale,
    }))
  );
  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;
  return (
    <group position={[posX, posY, 0]} scale={[scale, scale, scale]}>
      <PrintZoneGuide />
    </group>
  );
};
import { Preloader } from "@/components/ui/Preloader";
import { disposeSceneHierarchy } from "@/lib/3d/disposeScene";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  useDeviceTier,
  HOODIE_MODEL_CANDIDATES,
  JACKET_MODEL_CANDIDATES,
  TSHIRT_MODEL_CANDIDATES,
  LONGSLEEVE_MODEL_CANDIDATES,
  CREWNECK_MODEL_CANDIDATES,
  CAP_MODEL_CANDIDATES,
} from "@/hooks/useDeviceTier";

// Draco decoder path for KHR_draco_mesh_compression (hoodie/jacket glbs)
if (typeof window !== "undefined") {
  try {
    (useGLTF as any).setDecoderPath?.("/decoders/draco/");
  } catch { }
}

// B2: PerformanceMonitor (turun ke DPR 1 setelah 3x flip-flop, satu arah agar
// tidak flip-flop naik-turun) + AdaptiveDpr (modulasi DPR kontinu dalam batas
// prop dpr Canvas). Berjalan di semua tier; tier-low praktis no-op (DPR 1).
const PerfAdaptive: React.FC = () => {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <>
      <PerformanceMonitor flipflops={3} onFallback={() => setDpr(1)} />
      <AdaptiveDpr />
    </>
  );
};

// D1: EffectComposer + Bloom + Vignette + SMAA, HANYA tier-high, client-only
// (next/dynamic ssr:false). Tier low/mid tidak pernah mengunduh chunk
// @react-three/postprocessing → nol biaya. multisampling={0}+SMAA: MSAA bawaan
// tak berlaku di buffer composer, SMAA lebih hemat di HP.
// M2.9: Bloom 0.35→0.15, Vignette darkness 0.55→0.28 (rentang 0.25–0.3).
// Mode akurat-warna (store isAccurateColor): Bloom+Vignette MATI agar mockup
// = warna cetak; SMAA tetap karena AA tak menggeser warna.
const HighTierEffects = dynamic(
  () =>
    import("@react-three/postprocessing").then(({ EffectComposer, SMAA }) => {
      const HighTierEffectsInner: React.FC = () => {
        return (
          <EffectComposer multisampling={0}>
            <SMAA />
          </EffectComposer>
        );
      };
      return { default: HighTierEffectsInner };
    }),
  { ssr: false }
);

// D3: Dev-only tuning overlay (leva + r3f-perf opsional). NOL BYTE di build prod:
// - Tanpa top-level import "leva"/"r3f-perf".
// - import() dinamis HANYA di dalam cabang `process.env.NODE_ENV !== "production"`
//   sehingga SWC dead-code-eliminate blok dev pada build production.
// - Perilaku render prod TIDAK berubah: props Canvas (dpr/exposure) tetap;
//   overlay hanya override runtime via setDpr/toneMappingExposure di dev.
// - r3f-perf SENGAJA tidak ditambah ke package.json (R3F9 belum teruji, lihat
const DevPerfInCanvas: React.FC<{ baseMaxDpr: number }> = () => null;
const DevLevaPanel: React.FC = () => null;

/** Melepas VRAM (geometri/material/tekstur) & context WebGL saat canvas unmount/remount */
function SceneDisposer() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    return () => {
      try {
        disposeSceneHierarchy(scene);
      } catch { }
      try {
        if (typeof gl.forceContextLoss === "function") {
          gl.forceContextLoss();
        } else {
          const rawGl = gl.getContext?.();
          const loseExt = rawGl?.getExtension?.("WEBGL_lose_context");
          loseExt?.loseContext?.();
        }
      } catch { }
    };
  }, [scene, gl]);
  return null;
}

interface CanvasStageProps {
  camPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ camPos, lookAtPos }) => {
  const {
    viewMode,
    studioTheme,
    isHideWebsiteUI,
    isRotating,
    animationPreset,
    cameraPreset,
    isGizmoDragging,
    selectedColor,
    materialFinish,
    activeApparel,
    partColors,
    activeColorMode,
    isWireframe,
    testLabMode,
  } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      studioTheme: s.studioTheme,
      isHideWebsiteUI: s.isHideWebsiteUI,
      isRotating: s.isRotating,
      animationPreset: s.animationPreset,
      cameraPreset: s.cameraPreset,
      isGizmoDragging: s.isGizmoDragging,
      selectedColor: s.selectedColor,
      materialFinish: s.materialFinish,
      activeApparel: s.activeApparel,
      partColors: s.partColors,
      activeColorMode: s.activeColorMode,
      isWireframe: s.isWireframe,
      testLabMode: s.testLabMode,
    }))
  );
  const deviceTier = useDeviceTier();

  // PERF 14 Sep 2026 cermin CanvasStageMobile: dengar webglcontextlost/
  // restored di kanvas R3F. Hilang → tampilkan tombol reload (remount Canvas
  // = konteks baru); pulih → tutup fallback. Tanpa ini kanvas mati diam.
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!contextLost) {
      retryCountRef.current = 0;
      return;
    }
    // Auto-recovery 1x setelah 1.5 detik jika GPU hanya mengalami reset transien
    if (retryCountRef.current < 1) {
      retryCountRef.current += 1;
      const timer = setTimeout(() => {
        setCanvasKey((k) => k + 1);
        setContextLost(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  // B1: frameloop="demand" saat idle — tiru pola TERBUKTI mobile
  // (CanvasStageMobile.tsx:83). 'always' hanya saat animasi berjalan:
  // story-float, putar otomatis, preset wind/walking/knit, transisi preset
  // kamera, drag gizmo, + jendela transien 800ms tiap ganti warna/finish/
  // apparel/mode-warna-part/wireframe agar easing.dampC sempat konvergen mulus
  // (demand hanya render 1 frame per commit React). Tanpa partColors/
  // activeColorMode/isWireframe di deps, ganti warna part & toggle wireframe
  // hanya dapat 1 frame demand = loncatan warna kasar (audit). OrbitControls
  // drei memanggil invalidate() sendiri tiap interaksi, jadi orbit/zoom
  // idle-demand tetap responsif.
  const [transientMotion, setTransientMotion] = useState(true);
  useEffect(() => {
    setTransientMotion(true);
    // PERF 14 Sep 2026: 3000→800ms cermin mobile (CanvasStageMobile) — cukup
    // untuk easing.dampC konvergen; idle lebih cepat turun ke demand (0fps).
    const t = setTimeout(() => setTransientMotion(false), 800);
    return () => clearTimeout(t);
  }, [selectedColor, materialFinish, activeApparel, partColors, activeColorMode, isWireframe]);
  const needsContinuous =
    viewMode === "story" ||
    isRotating ||
    animationPreset !== "static" ||
    testLabMode !== "none" ||
    cameraPreset !== null ||
    isGizmoDragging ||
    transientMotion;

  // B1: preserveDrawingBuffer:false permanen (hemat VRAM, hindari slow-path
  // WebGL). Ekspor PNG tetap TIDAK blank: onCreated menambal toDataURL kanvas
  // ini agar render sinkron sekali sebelum baca piksel — buffer masih valid
  // dalam task yang sama. CustomizerDrawer.handleExportPNG tak perlu diubah.
  // Trade-off jujur: (1) PNG ekspor melewati EffectComposer, jadi tanpa
  // bloom/vignette di tier-high (mockup bersih untuk produksi — justru pas);
  // (2) video 360 via captureStream aman karena saat rekam isRotating=true
  // sehingga frameloop otomatis 'always'.
  const handleCreated = (state: RootState) => {
    try {
      const { gl, scene, camera } = state;
      const canvas = gl.domElement;
      // Cermin CanvasStageMobile: context hilang → fallback + tombol reload.
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
      };
      canvas.addEventListener("webglcontextlost", handleContextLost, false);
      canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
      const origToDataURL = canvas.toDataURL.bind(canvas) as (...a: any[]) => string;
      (canvas as any).toDataURL = (...args: any[]) => {
        // DPR ekspor PNG KUNCI 3 — mockup ultra tajam di semua resolusi
        let prevDpr = 0;
        try {
          prevDpr = gl.getPixelRatio();
          if (prevDpr !== 3) state.setDpr(3);
          gl.render(scene, camera);
          const url = origToDataURL(...args);
          if (prevDpr !== 0 && prevDpr !== 3) {
            state.setDpr(prevDpr);
            try {
              gl.render(scene, camera);
            } catch { }
          }
          return url;
        } catch {
          return origToDataURL(...args);
        }
      };

      // Engine Ekspor Resolusi Tinggi (2K/HD) & Latar Transparan (PNG Alpha)
      (canvas as any).exportMockup = async (options?: {
        resolution?: "standard" | "hd" | "2k";
        transparent?: boolean;
      }): Promise<string> => {
        const res = options?.resolution || "2k";
        const isTransparent = !!options?.transparent;
        const targetDim = res === "standard" ? 1280 : res === "hd" ? 1920 : 2048;

        const rect = canvas.getBoundingClientRect();
        const aspect = rect.width && rect.height ? rect.width / rect.height : 1;
        let w = targetDim;
        let h = Math.round(targetDim / aspect);
        if (aspect < 1) {
          h = targetDim;
          w = Math.round(targetDim * aspect);
        }

        const prevClearAlpha = gl.getClearAlpha();
        const prevClearColor = new THREE.Color();
        gl.getClearColor(prevClearColor);
        const prevAspect = (camera as any).aspect;
        const hiddenObjects: THREE.Object3D[] = [];

        if (isTransparent) {
          gl.setClearColor(0x000000, 0);
          scene.traverse((obj) => {
            if (
              obj.name === "studio-floor" ||
              (obj as any).isMesh && (obj as any).receiveShadow && !(obj as any).castShadow && obj.position.y < -1
            ) {
              if (obj.visible) {
                obj.visible = false;
                hiddenObjects.push(obj);
              }
            }
          });
        }

        try {
          gl.setSize(w, h, false);
          if ((camera as any).aspect !== undefined) {
            (camera as any).aspect = w / h;
            camera.updateProjectionMatrix();
          }
          gl.render(scene, camera);
          return origToDataURL("image/png");
        } finally {
          for (const obj of hiddenObjects) {
            obj.visible = true;
          }
          if (isTransparent) {
            gl.setClearColor(prevClearColor, prevClearAlpha);
          }
          gl.setSize(rect.width || 800, rect.height || 600, false);
          if ((camera as any).aspect !== undefined && prevAspect !== undefined) {
            (camera as any).aspect = prevAspect;
            camera.updateProjectionMatrix();
          }
          try {
            gl.render(scene, camera);
          } catch { }
        }
      };
    } catch { }
  };

  // PERF (ganti E1 lama): preload PRIORITAS (kandidat pertama = draco/
  // master, tanpa HEAD probe = hemat 6 round-trip + kebal HEAD diblokir) —
  // HANYA apparel aktif + tetangga katalog, dijadwalkan saat idle agar tak
  // berebut bandwidth first paint. Fallback DIAM: rantai draco→master→legacy
  // di tiap model via SilentModelFallback (404 = turun rantai, tanpa error).
  // Urutan = urutan picker katalog. Celana coming-soon (pants/shorts):
  // file tunggal non-Draco, ikut diprefetch sebagai tetangga (murah).
  useEffect(() => {
    if (!deviceTier.isResolved) return;
    const set = deviceTier.tier === "low" || deviceTier.tier === "no-webgl" ? "low" : "high";
    const firstOf = (c: { high: string[]; low: string[] }) => c[set][0] as string | undefined;
    const priorityFor = (apparel: string): string | undefined => {
      switch (apparel) {
        case "hoodie":
          return firstOf(HOODIE_MODEL_CANDIDATES);
        case "shirt":
          return firstOf(JACKET_MODEL_CANDIDATES);
        case "longsleeve":
          return firstOf(LONGSLEEVE_MODEL_CANDIDATES);
        case "crewneck":
          return firstOf(CREWNECK_MODEL_CANDIDATES);
        case "cap":
          return firstOf(CAP_MODEL_CANDIDATES);
        case "pants":
          // F2-fix: varian draco tak ada di disk (Draco soft-disable) — non-Draco.
          return "/models/pants.glb";
        case "shorts":
          return "/models/shorts.glb";
        case "tshirt":
        default:
          return firstOf(TSHIRT_MODEL_CANDIDATES);
      }
    };
    const order = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"];
    const idx = order.indexOf(activeApparel);
    const wanted = [activeApparel, order[idx - 1], order[idx + 1]].filter(Boolean) as string[];
    const urls = wanted
      .map((a) => priorityFor(a))
      .filter((u): u is string => !!u);
    let handle: number | null = null;
    const run = () => {
      for (const url of urls) {
        try {
          useGLTF.preload(url);
        } catch { }
      }
    };
    try {
      if (typeof window !== "undefined" && typeof (window as any).requestIdleCallback === "function") {
        handle = (window as any).requestIdleCallback(run, { timeout: 2000 });
      } else {
        handle = setTimeout(run, 1200) as unknown as number;
      }
    } catch {
      handle = null;
    }
    return () => {
      try {
        if (handle === null) return;
        if (typeof window !== "undefined" && typeof (window as any).cancelIdleCallback === "function") {
          (window as any).cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      } catch { }
    };
  }, [deviceTier.isResolved, deviceTier.tier, activeApparel]);

  // D1: gate ganda — tier high DAN deteksi selesai (nilai awal "high" adalah
  // placeholder SSR; tanpa isResolved, HP low ikut unduh chunk effects).
  const showEffects = deviceTier.isResolved && deviceTier.tier === "high";
  // PERF: high maxDpr 2→1.5 (piksel 2.25×→1.5² = −44% fill-rate; beda visual
  // di mockup kain nyaris nol, SMAA composer menutup tepi). Ekspor PNG tetap
  // KUNCI 2 via handleCreated di bawah — tak tersentuh.
  const cappedMaxDpr = deviceTier.tier === "high" ? 1.5 : deviceTier.maxDpr;

  const themeBgHex =
    studioTheme === "gallery"
      ? "#EFECE6"
      : studioTheme === "concrete"
        ? "#222326"
        : "#121214";
  // M2.6: gradient gelap bawah via CSS (nol biaya GPU, semua tier — ganti
  // plane gradient 3D yang butuh draw call + depth tuning). Lantai 3D
  // (lingkaran matte + reflektor high-tier) ada di StudioLighting.
  const themeGradientTo =
    studioTheme === "gallery" ? "#DDD9D0" : studioTheme === "concrete" ? "#131415" : "#080809";

  const isInteractive = viewMode === "studio" || isHideWebsiteUI;

  return (
    <>
      {process.env.NODE_ENV !== "production" ? <DevLevaPanel /> : null}
      <Preloader />
      {contextLost ? (
        <div className="webgl-canvas-container w-full h-full flex flex-col items-center justify-center p-6 text-center rounded-3xl border border-border-subtle transition-colors">
          <p className="text-sm font-bold text-amber-400 mb-1">Akselerasi Grafis 3D Terputus</p>
          <p className="text-xs text-text-muted max-w-sm mb-3">
            Driver GPU browser sempat mereset WebGL (biasa terjadi saat memori GPU penuh atau banyak tab aktif di localhost).
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => {
                setCanvasKey((k) => k + 1);
                setContextLost(false);
              }}
              className="px-4 py-2 rounded-xl bg-brand-accent text-white text-xs font-bold transition-all shadow-md hover:brightness-110 active:scale-95"
            >
              Muat Ulang Studio 3D
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-xs font-mono transition-all active:scale-95"
            >
              Segarkan Halaman (F5)
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`webgl-canvas-container transition-colors duration-500 ${isInteractive ? "interactive cursor-grab active:cursor-grabbing" : ""
            }`}
          // TOUCH: pan-y agar 1-jari horizontal = rotate 3D, swipe vertikal =
          // scroll halaman (cermin perilaku mobile TouchOrbitControls).
          style={{ backgroundColor: themeBgHex, backgroundImage: `linear-gradient(180deg, ${themeBgHex} 0%, ${themeGradientTo} 100%)`, touchAction: "pan-y" }}
        >
          <Canvas
            // PERF: key = antialias WebGL hanya berlaku saat konteks dibuat;
            // remount sekali saat composer on/off agar nilai di bawah mengikat.
            // TOUCH: pan-y selaras container (swipe vertikal = scroll halaman).
            style={{ touchAction: "pan-y" }}
            key={`${showEffects ? "fx" : "no-fx"}-k${canvasKey}`}
            shadows={deviceTier.enableShadows}
            dpr={[1, cappedMaxDpr]}
            frameloop={needsContinuous ? "always" : "demand"}
            // M2.10: fov 40 TETAP (klaim skala cm/DPI tak boleh drift).
            camera={{ position: [0, 0, 2.9], fov: 40 }}
            gl={{
              // PERF: antialias:false saat composer aktif — MSAA bawaan tak
              // berlaku di buffer EffectComposer (mubazir penuh), SMAA di
              // dalam composer yang menangani tepi. Composer mati = MSAA on.
              antialias: !showEffects,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              // M2.9: exposure KUNCI 1.0 semua tema (dulu 1.05/1.15 = hitam
              // jadi abu susu). Sinkron dengan ReactiveExposure StudioLighting.
              toneMappingExposure: 1.0,
              preserveDrawingBuffer: false,
            }}
            onCreated={handleCreated}
          >
            <PerfAdaptive />
            {process.env.NODE_ENV !== "production" ? (
              <DevPerfInCanvas baseMaxDpr={cappedMaxDpr} />
            ) : null}
            <Suspense fallback={null}>
              <StudioLighting />
              <ApparelMeshRenderer />
              <TestLabOverlay3D />
              <ModelTransformMirror />
              <CameraRig targetPosition={camPos} targetLookAt={lookAtPos} />
            </Suspense>
            {showEffects && <HighTierEffects />}
          </Canvas>
        </div>
      )}
    </>
  );
};
