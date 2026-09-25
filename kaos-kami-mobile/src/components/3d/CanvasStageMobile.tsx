"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor, useGLTF } from '@react-three/drei';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import {
  useMobileStudioStore,
} from '@/store/useMobileStudioStore';
import { disposeSceneHierarchy } from '@/lib/3d/disposeScene';
import { registerStudioSnapshot } from '@/lib/3d/exportStudio';
import { TouchOrbitControls } from './TouchOrbitControls';
import { AnimationController } from './AnimationController';
import { MobileApparelMeshRenderer, mobilePriorityFor } from './MobileApparelMeshRenderer';
import { MobileStudioLighting, MobileStudioTheme } from './MobileStudioLighting';
import { MobileTestLabOverlay3D } from './MobileTestLabOverlay3D';
import { PrintZoneGuideMobile } from './PrintZoneGuideMobile';

// SOFT-DISABLE DRACO 14 Sep 2026 (keputusan owner, paritas web non-Draco):
// setDecoderPath dibiarkan (harmless bila tak ada mesh Draco) — nonaktif
// sementara, arsip di backups/draco-archive/. Guard window agar SSR/export
// statis aman.
if (typeof window !== 'undefined') {
  try {
    (useGLTF as any).setDecoderPath?.('/decoders/draco/');
  } catch {}
}

// PerformanceMonitor (turun ke DPR 1 setelah 3x flip-flop, satu arah agar
// tidak flip-flop naik-turun) + AdaptiveDpr (modulasi DPR kontinu dalam batas
// prop dpr Canvas). Cermin web PerfAdaptive; tier-low praktis no-op (DPR 1).
function PerfAdaptive() {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <>
      <PerformanceMonitor flipflops={3} onFallback={() => setDpr(1)} />
      <AdaptiveDpr />
    </>
  );
}

function StudioLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-canvas transition-colors z-20">
      <div className="w-10 h-10 border-3 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-text-muted font-['Syne']">Memuat Model 3D...</p>
    </div>
  );
}

/** Melepas VRAM (geometri/material/tekstur) saat studio unmount/ganti tab. */
function SceneDisposer() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    return () => {
      try {
        disposeSceneHierarchy(scene);
      } catch {}
      try {
        registerStudioSnapshot(null);
      } catch {}
    };
  }, [scene]);
  return null;
}

export function CanvasStageMobile({ theme = 'obsidian' }: { theme?: MobileStudioTheme }) {
  const { dpr, antialias, tier, isResolved } = useMobileDeviceTier();
  const activeAnimation = useMobileStudioStore((s) => s.activeAnimation);
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const color = useMobileStudioStore((s) => s.color);
  const sleeveColor = useMobileStudioStore((s) => s.sleeveColor);
  const collarColor = useMobileStudioStore((s) => s.collarColor);
  // P1: tanda tangan lapis (tambah/hapus/ganti sisi memicu transien walau
  // URL cermin tak berubah). Kompat decalUrl dipertahankan untuk pembaca lain.
  const decalSig = useMobileStudioStore((s) => s.decals.map((d) => `${d.id}:${d.targetSide}:${d.url}`).join('|'));
  const cameraAngle = useMobileStudioStore((s) => s.cameraAngle);
  const isGizmoDragging = useMobileStudioStore((s) => s.isGizmoDragging);
  // F0 Test Lab: overlay angin/senter/stretch butuh frame kontinu (partikel,
  // damping senter, spring). Idle standar tetap demand = 0fps hemat baterai.
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const isStretchDragging = useMobileStudioStore((s) => s.isStretchDragging);
  const [contextLost, setContextLost] = useState(false);

  // Transien 800ms tiru web transientMotion (CanvasStage.tsx): 'always' hanya
  // saat animasi berjalan / drag gizmo / jendela transien tiap ganti warna/
  // apparel/decal/sudut-kamera/preset-animasi agar easing/lerp sempat konvergen
  // mulus (demand hanya render 1 frame per commit React). Idle = demand = 0fps.
  // Tanpa ini, ganti warna & transisi kamera hanya dapat 1 frame = loncatan
  // kasar; OrbitControls drei memanggil invalidate() sendiri tiap interaksi.
  const [transientMotion, setTransientMotion] = useState(false);
  useEffect(() => {
    setTransientMotion(true);
    const t = setTimeout(() => setTransientMotion(false), 800);
    return () => clearTimeout(t);
  }, [color, sleeveColor, collarColor, apparelType, decalSig, cameraAngle, activeAnimation]);
  const needsContinuous =
    activeAnimation !== 'none' ||
    transientMotion ||
    isGizmoDragging ||
    isStretchDragging ||
    testLabMode !== 'none';

  // F2 Test Lab: darkroom QC 0.05 saat senter (cermin web StudioLighting testLabDim).
  const studioDimFactor = testLabMode === 'flashlight' ? 0.05 : 1.0;

  // PERF (tiru web CanvasStage): preload PRIORITAS non-Draco (kandidat
  // pertama = master non-Draco paritas web, tanpa HEAD probe = hemat
  // round-trip) — HANYA setelah isResolved agar HP low tak ikut unduh model
  // high. Aktif segera, tetangga katalog prefetch via requestIdleCallback
  // agar tak berebut first paint.
  // Urutan = urutan picker; tipe terkunci (crewneck) dilewati (tak ada file —
  // preload-nya jatuh ke fallback tshirt = unduhan sia-sia).
  // sweater/cap mockup-saja ikut diprefetch sebagai tetangga (cap.glb,
  // sweater.glb master non-Draco — hanya tetangga langsung, bukan eager semua).
  // pants/shorts mockup-saja ikut diprefetch sebagai tetangga (murah: 1 file each).
  useEffect(() => {
    if (!isResolved || tier === 'no-webgl') return;
    const order = ['tshirt', 'hoodie', 'shirt', 'longsleeve', 'sweater', 'cap', 'pants', 'shorts'];
    const idx = order.indexOf(apparelType);
    const active = mobilePriorityFor(apparelType, tier);
    // Aktif: preload SEGERA (dibutuhkan frame pertama).
    try {
      if (active) useGLTF.preload(active);
    } catch {}
    // Tetangga: prefetch idle (hemat bandwidth first paint).
    const neighbors = [order[idx - 1], order[idx + 1]]
      .filter(Boolean)
      .map((a) => mobilePriorityFor(a as string, tier))
      .filter((u): u is string => !!u && u !== active);
    if (neighbors.length === 0) return;
    let handle: number | null = null;
    const run = () => {
      for (const url of neighbors) {
        try {
          useGLTF.preload(url);
        } catch {}
      }
    };
    try {
      if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
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
        if (typeof window !== 'undefined' && typeof (window as any).cancelIdleCallback === 'function') {
          (window as any).cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      } catch {}
    };
  }, [isResolved, tier, apparelType]);

  // PERF KeepAwake: SENGAJA tak di studio (hemat baterai). Layar dijaga
  // menyala hanya saat AR aktif / perekaman 360° (lihat ARPreviewStage +
  // recordTurntable360 di exportStudio).

  if (tier === 'no-webgl') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-surface rounded-3xl border border-border-subtle transition-colors">
        <p className="text-sm font-bold text-text-primary mb-1">WebGL Tidak Didukung</p>
        <p className="text-xs text-text-muted">Gunakan perangkat dengan dukungan akselerasi grafis 3D.</p>
      </div>
    );
  }

  if (contextLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-surface rounded-3xl border border-border-subtle transition-colors">
        <p className="text-sm font-bold text-amber-400 mb-2">Sesi Grafis 3D Terputus</p>
        <button
          onClick={() => setContextLost(false)}
          className="px-4 py-2 rounded-xl bg-brand-accent text-white text-xs font-bold transition-colors"
        >
          Muat Ulang Studio 3D
        </button>
      </div>
    );
  }

  // P0-3: bg default #0E0E10 (obsidian/concrete gelap); gallery → #EFECE6
  // cermin web CanvasStage themeBgHex.
  const themeBgHex = theme === 'gallery' ? '#EFECE6' : theme === 'concrete' ? '#222326' : '#0E0E10';

  // Q7: PrintZoneGuide ringan — overlay HTML (nol biaya WebGL), batas cetak
  // SSOT dari lib mobileScaleCalibration + toggle via store. Komponen:
  // ./PrintZoneGuideMobile (mount di file ini SAJA).
  return (
    <div id="kk-studio" className="relative w-full h-full select-none touch-none overflow-hidden rounded-3xl bg-canvas transition-colors" style={{ backgroundColor: themeBgHex }}>
      <PrintZoneGuideMobile />
      <Suspense fallback={<StudioLoader />}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          dpr={dpr}
          gl={{
            antialias,
            // Per-tier: high-performance HANYA tier high; mid/low/no-webgl hemat baterai.
            powerPreference: tier === 'high' ? 'high-performance' : 'low-power',
            // On-demand: false hemat VRAM; ekspor/snapshot via exportStudio
            // renderStudioNow() (render sinkron di task yang sama agar tak blank).
            preserveDrawingBuffer: false,
          }}
          frameloop={needsContinuous ? 'always' : 'demand'}
          onCreated={({ gl, scene, camera }) => {
            // Daftarkan bus snapshot on-demand (pasangan preserveDrawingBuffer:false).
            try {
              registerStudioSnapshot({ gl: gl as any, scene: scene as any, camera: camera as any });
            } catch {}
            const canvas = gl.domElement;
            const handleContextLost = (e: Event) => {
              e.preventDefault();
              setContextLost(true);
            };
            const handleContextRestored = () => {
              setContextLost(false);
            };

            canvas.addEventListener('webglcontextlost', handleContextLost, false);
            canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
          }}
        >
          <SceneDisposer />
          <PerfAdaptive />
          <MobileStudioLighting theme={theme} dimFactor={studioDimFactor} />
          <TouchOrbitControls />
          <AnimationController>
            <MobileApparelMeshRenderer />
          </AnimationController>
          <MobileTestLabOverlay3D />
        </Canvas>
      </Suspense>
    </div>
  );
}
