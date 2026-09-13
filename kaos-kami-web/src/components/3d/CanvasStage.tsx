"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { AdaptiveDpr, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { StudioLighting } from "./StudioLighting";
import { ApparelMeshRenderer } from "./ApparelMeshRenderer";
import { CameraRig } from "./CameraRig";
import { Preloader } from "@/components/ui/Preloader";
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
  } catch {}
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
    import("@react-three/postprocessing").then(({ EffectComposer, Bloom, Vignette, SMAA }) => {
      const HighTierEffectsInner: React.FC = () => {
        const accurate = useConfiguratorStore((s) => s.isAccurateColor);
        return (
          <EffectComposer multisampling={0}>
            {!accurate && (
              <>
                <Bloom mipmapBlur intensity={0.15} luminanceThreshold={1} luminanceSmoothing={0.25} />
                <Vignette offset={0.25} darkness={0.28} />
              </>
            )}
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
//   return): DevPerfInCanvas memuatnya opsional (catch → null) sehingga panel
//   leva tetap jalan walau r3f-perf belum terinstal; <Perf/> hanya muncul bila
//   modulnya ada.
const DevControlsInner: React.FC<{
  useControls: (...args: any[]) => any;
  baseMaxDpr: number;
}> = ({ useControls, baseMaxDpr }) => {
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  const vals = useControls({
    dpr: { value: baseMaxDpr, min: 0.5, max: 2, step: 0.25 },
    exposure: { value: 1.0, min: 0, max: 2, step: 0.05 },
  }) as { dpr: number; exposure: number };
  useEffect(() => {
    try {
      if (typeof vals?.dpr === "number") setDpr(vals.dpr);
    } catch {}
  }, [vals?.dpr, setDpr]);
  useEffect(() => {
    try {
      if (typeof vals?.exposure === "number") gl.toneMappingExposure = vals.exposure;
    } catch {}
    return () => {
      try {
        gl.toneMappingExposure = 1.0;
      } catch {}
    };
  }, [vals?.exposure, gl]);
  return null;
};

const DevPerfInCanvas: React.FC<{ baseMaxDpr: number }> = ({ baseMaxDpr }) => {
  const [mods, setMods] = useState<{ Perf: any; useControls: any } | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      let cancelled = false;
      Promise.all([
        // @ts-ignore — dev-only opsional; r3f-perf tidak di package.json (R3F9 belum teruji)
        import("r3f-perf")
          .then((m: any) => m.Perf ?? m.default ?? null)
          .catch(() => null),
        // @ts-ignore — dev-only; leva ada di devDependencies setelah `npm install`
        import("leva")
          .then((m: any) => m.useControls ?? null)
          .catch(() => null),
      ]).then(([Perf, useControls]) => {
        if (!cancelled && (Perf || useControls)) setMods({ Perf, useControls });
      });
      return () => {
        cancelled = true;
      };
    }
  }, []);
  if (process.env.NODE_ENV !== "production") {
    if (!mods) return null;
    return (
      <>
        {mods.Perf ? React.createElement(mods.Perf, { position: "top-left" }) : null}
        {mods.useControls ? (
          <DevControlsInner useControls={mods.useControls} baseMaxDpr={baseMaxDpr} />
        ) : null}
      </>
    );
  }
  return null;
};

const DevLevaPanel: React.FC = () => {
  const [LevaComp, setLevaComp] = useState<any>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      let cancelled = false;
      // @ts-ignore — dev-only; leva ada di devDependencies setelah `npm install`
      import("leva")
        .then((m: any) => m.Leva ?? m.default ?? null)
        .catch(() => null)
        .then((Leva) => {
          if (!cancelled && Leva) setLevaComp(() => Leva);
        });
      return () => {
        cancelled = true;
      };
    }
  }, []);
  if (process.env.NODE_ENV !== "production") {
    if (!LevaComp) return null;
    return React.createElement(LevaComp, { collapsed: true });
  }
  return null;
};

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
    modelMode,
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
      modelMode: s.modelMode,
    }))
  );
  const deviceTier = useDeviceTier();

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
  const [transientMotion, setTransientMotion] = useState(false);
  useEffect(() => {
    setTransientMotion(true);
    const t = setTimeout(() => setTransientMotion(false), 800);
    return () => clearTimeout(t);
  }, [selectedColor, materialFinish, activeApparel, partColors, activeColorMode, isWireframe]);
  // PERF: dengar status idle manekin (>2s, dari MannequinModel) agar mode
  // manekin ikut turun ke frameloop demand saat diam (mixer dibekukan di
  // sana via mixer.timeScale=0 — tanpa edit biner GLB).
  const [mannequinIdle, setMannequinIdle] = useState(false);
  useEffect(() => {
    if (modelMode !== "mannequin") {
      setMannequinIdle(false);
      return;
    }
    const onIdle = (e: Event) => {
      try {
        setMannequinIdle(!!(e as CustomEvent).detail);
      } catch {}
    };
    window.addEventListener("kaos-mannequin-idle", onIdle);
    return () => window.removeEventListener("kaos-mannequin-idle", onIdle);
  }, [modelMode]);
  // B-06: cameraPreset !== null WAJIB di sini — CameraRig menunda
  // setCameraPreset(null) sampai animasi 0.6s tuntas, sehingga transisi preset
  // selalu dapat frame (sebelumnya clear instan = animasi mati di demand).
  // MODE MANEKIN: skeletal animation butuh frame kontinu HANYA saat gerak —
  // saat idle >2s (mannequinIdle) frameloop demand (mixer sudah =0 di sana).
  const needsContinuous =
    viewMode === "story" ||
    isRotating ||
    animationPreset !== "static" ||
    cameraPreset !== null ||
    isGizmoDragging ||
    transientMotion ||
    (modelMode === "mannequin" && !mannequinIdle);

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
      const origToDataURL = canvas.toDataURL.bind(canvas) as (...a: any[]) => string;
      (canvas as any).toDataURL = (...args: any[]) => {
        // M2.10: DPR ekspor PNG KUNCI 2 — mockup tajam di semua HP walau
        // tier-low jalan di DPR 1. Naikkan sementara → render sinkron → baca
        // piksel → kembalikan DPR (jank sesaat saat ekspor = wajar/transien).
        // CustomizerDrawer.handleExportPNG tak perlu diubah (file terlarang).
        let prevDpr = 0;
        try {
          prevDpr = gl.getPixelRatio();
          if (prevDpr !== 2) state.setDpr(2);
          gl.render(scene, camera);
          const url = origToDataURL(...args);
          if (prevDpr !== 0 && prevDpr !== 2) {
            state.setDpr(prevDpr);
            try {
              gl.render(scene, camera);
            } catch {}
          }
          return url;
        } catch {
          return origToDataURL(...args);
        }
      };
    } catch {}
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
    if (modelMode === "mannequin") urls.push("/models/mannequin.glb");
    let handle: number | null = null;
    const run = () => {
      for (const url of urls) {
        try {
          useGLTF.preload(url);
        } catch {}
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
      } catch {}
    };
  }, [deviceTier.isResolved, deviceTier.tier, activeApparel, modelMode]);

  // D1: gate ganda — tier high DAN deteksi selesai (nilai awal "high" adalah
  // placeholder SSR; tanpa isResolved, HP low ikut unduh chunk effects).
  const showEffects = deviceTier.isResolved && deviceTier.tier === "high";
  // PERF: high maxDpr 2→1.5 (piksel 2.25×→1.5² = −44% fill-rate; beda visual
  // di mockup kain nyaris nol, SMAA composer menutup tepi). Ekspor PNG tetap
  // KUNCI 2 via handleCreated di bawah — tak tersentuh.
  const cappedMaxDpr = deviceTier.tier === "high" ? 1.5 : deviceTier.maxDpr;

  const themeBgHex =
    studioTheme === "gallery"
      ? "#F5F4F0"
      : studioTheme === "concrete"
      ? "#222326"
      : "#121214";
  // M2.6: gradient gelap bawah via CSS (nol biaya GPU, semua tier — ganti
  // plane gradient 3D yang butuh draw call + depth tuning). Lantai 3D
  // (lingkaran matte + reflektor high-tier) ada di StudioLighting.
  const themeGradientTo =
    studioTheme === "gallery" ? "#DDDAD2" : studioTheme === "concrete" ? "#131415" : "#080809";

  const isInteractive = viewMode === "studio" || isHideWebsiteUI;

  return (
    <>
      {process.env.NODE_ENV !== "production" ? <DevLevaPanel /> : null}
      <Preloader />
      <div
        className={`webgl-canvas-container transition-colors duration-500 ${
          isInteractive ? "interactive cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ backgroundColor: themeBgHex, backgroundImage: `linear-gradient(180deg, ${themeBgHex} 0%, ${themeGradientTo} 100%)` }}
      >
        <Canvas
          // PERF: key = antialias WebGL hanya berlaku saat konteks dibuat;
          // remount sekali saat composer on/off agar nilai di bawah mengikat.
          key={showEffects ? "fx" : "no-fx"}
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
            <CameraRig targetPosition={camPos} targetLookAt={lookAtPos} />
          </Suspense>
          {showEffects && <HighTierEffects />}
        </Canvas>
      </div>
    </>
  );
};
