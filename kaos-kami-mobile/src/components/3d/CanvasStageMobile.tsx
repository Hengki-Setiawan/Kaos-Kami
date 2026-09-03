"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { enableScreenKeepAwake, disableScreenKeepAwake } from '@/lib/bridge/keepAwake';
import { TouchOrbitControls } from './TouchOrbitControls';
import { AnimationController } from './AnimationController';
import { MobileApparelMeshRenderer } from './MobileApparelMeshRenderer';
import { MobileStudioLighting } from './MobileStudioLighting';

function StudioLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E0E10] z-20">
      <div className="w-10 h-10 border-3 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-zinc-400 font-['Syne']">Memuat Model 3D...</p>
    </div>
  );
}

export function CanvasStageMobile() {
  const { dpr, antialias, tier } = useMobileDeviceTier();
  const activeAnimation = useMobileStudioStore((s) => s.activeAnimation);
  const [contextLost, setContextLost] = useState(false);

  // Keep screen awake while user is designing in 3D studio
  useEffect(() => {
    enableScreenKeepAwake();
    return () => {
      disableScreenKeepAwake();
    };
  }, []);

  if (tier === 'no-webgl') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 rounded-3xl border border-zinc-800">
        <p className="text-sm font-bold text-white mb-1">WebGL Tidak Didukung</p>
        <p className="text-xs text-zinc-400">Gunakan perangkat dengan dukungan akselerasi grafis 3D.</p>
      </div>
    );
  }

  if (contextLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 rounded-3xl border border-zinc-800">
        <p className="text-sm font-bold text-amber-400 mb-2">Sesi Grafis 3D Terputus</p>
        <button
          onClick={() => setContextLost(false)}
          className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-bold"
        >
          Muat Ulang Studio 3D
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none touch-none overflow-hidden rounded-3xl bg-[#0E0E10]">
      <Suspense fallback={<StudioLoader />}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          dpr={dpr}
          gl={{
            antialias,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          frameloop={activeAnimation !== 'none' ? 'always' : 'demand'}
          onCreated={({ gl }) => {
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
          <MobileStudioLighting />
          <TouchOrbitControls />
          <AnimationController>
            <MobileApparelMeshRenderer />
          </AnimationController>
        </Canvas>
      </Suspense>
    </div>
  );
}
