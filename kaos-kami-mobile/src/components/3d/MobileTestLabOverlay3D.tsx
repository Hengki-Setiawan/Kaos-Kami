"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  useMobileStudioStore,
  type StretchDirection,
  type WindDirection,
} from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { getStretchFactors } from '@/lib/3d/stretchPhysics';
import { writeMobileStretchScale } from '@/lib/3d/mobileStretchRegistry';

// GATING angin: high 50 / mid 50 / low 30 (hemat baterai HP kentang).
function windCountForTier(tier: string): number {
  return tier === 'low' || tier === 'no-webgl' ? 30 : 50;
}

/**
 * F1 Test Lab — salinan web WindTunnelStreamlines (TestLabOverlay3D.tsx).
 * Partikel garis arus aerodinamis bercahaya sesuai arah angin (depan/samping/bawah).
 * frustumCulled={false} WAJIB (instanced matrix di-update per-frame; culling
 * default membuat streaks hilang saat kamera bergerak).
 */
export const MobileWindStreamlines: React.FC<{
  speed: number;
  direction: WindDirection;
  count: number;
}> = ({ speed, direction, count }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 1.8,
      y: (Math.random() - 0.5) * 1.4 - 0.05,
      z: 1.2 + Math.random() * 0.8,
      length: 0.16 + Math.random() * 0.28,
      speedMult: 0.85 + Math.random() * 0.45,
      lateralDrift: (Math.random() - 0.5) * 0.12,
    }));
  }, [count]);

  const streakGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 8);
    if (direction === 'side') {
      g.rotateZ(Math.PI / 2);
    } else if (direction === 'up') {
      // Tegak lurus mengalir ke atas sumbu Y
    } else {
      g.rotateX(Math.PI / 2);
    }
    return g;
  }, [direction]);

  const streakColor = useMemo(() => {
    if (speed >= 70) return new THREE.Color('#f59e0b');
    if (speed >= 40) return new THREE.Color('#14b8a6');
    return new THREE.Color('#38bdf8');
  }, [speed]);

  const streakMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: streakColor,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [streakColor]);

  useEffect(() => {
    return () => {
      try {
        streakGeo.dispose();
      } catch {}
      try {
        streakMat.dispose();
      } catch {}
    };
  }, [streakGeo, streakMat]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const velocity = (speed / 35) * delta * 2.4;

    particles.forEach((p, i) => {
      if (direction === 'side') {
        p.x -= velocity * p.speedMult;
        p.z += p.lateralDrift * delta;
        if (p.x < -1.3) {
          p.x = 1.3 + Math.random() * 0.4;
          p.y = (Math.random() - 0.5) * 1.3 - 0.05;
          p.z = (Math.random() - 0.5) * 0.8;
        }
        dummy.position.set(p.x, p.y, p.z);
        const stretchX = p.length * (1 + speed * 0.016);
        dummy.scale.set(stretchX, 1, 1);
      } else if (direction === 'up') {
        p.y += velocity * p.speedMult;
        p.x += p.lateralDrift * delta;
        if (p.y > 1.2) {
          p.y = -1.2 - Math.random() * 0.4;
          p.x = (Math.random() - 0.5) * 1.4;
          p.z = (Math.random() - 0.5) * 0.8;
        }
        dummy.position.set(p.x, p.y, p.z);
        const stretchY = p.length * (1 + speed * 0.016);
        dummy.scale.set(1, stretchY, 1);
      } else {
        p.z -= velocity * p.speedMult;
        p.x += p.lateralDrift * delta;
        if (p.z < -0.8) {
          p.z = 1.4 + Math.random() * 0.5;
          p.x = (Math.random() - 0.5) * 1.6;
          p.y = (Math.random() - 0.5) * 1.3 - 0.05;
        }
        dummy.position.set(p.x, p.y, p.z);
        const stretchZ = p.length * (1 + speed * 0.016);
        dummy.scale.set(1, 1, stretchZ);
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[streakGeo, streakMat, count]} frustumCulled={false} />
  );
};

/**
 * F2 Test Lab — salinan web InteractiveFlashlight (TestLabOverlay3D.tsx).
 * Spot 7.2 mengikuti pointer dengan redaman; R3F menormalisasi sentuh
 * otomatis (state.pointer valid untuk touch), jadi tanpa cabang touch khusus.
 */
export const MobileFlashlight: React.FC<{ focusAngle: number }> = ({ focusAngle }) => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { viewport } = useThree();

  const currentTargetPos = useRef(new THREE.Vector3(0, 0, 0.15));

  useFrame((state, delta) => {
    if (!spotLightRef.current || !targetRef.current) return;

    // Pastikan spotlight membidik object target yang bergerak (R3F hanya
    // menerapkan prop target sekali; penetapan idempoten per-frame aman).
    try {
      if (spotLightRef.current.target !== targetRef.current) {
        spotLightRef.current.target = targetRef.current;
      }
    } catch {}

    const destX = state.pointer.x * viewport.width * 0.36;
    const destY = state.pointer.y * viewport.height * 0.36 - 0.05;

    currentTargetPos.current.x = THREE.MathUtils.damp(
      currentTargetPos.current.x,
      destX,
      14,
      delta
    );
    currentTargetPos.current.y = THREE.MathUtils.damp(
      currentTargetPos.current.y,
      destY,
      14,
      delta
    );

    targetRef.current.position.set(
      currentTargetPos.current.x,
      currentTargetPos.current.y,
      0.15
    );

    spotLightRef.current.position.set(
      currentTargetPos.current.x * 0.65,
      currentTargetPos.current.y * 0.65,
      1.75
    );
  });

  return (
    <>
      <object3D ref={targetRef} position={[0, 0, 0.15]} />
      <spotLight
        ref={spotLightRef}
        intensity={7.2}
        angle={focusAngle}
        penumbra={0.62}
        color="#ffffff"
        distance={5.5}
        decay={1.1}
      />
      {/* Cahaya ambient redup bernuansa darkroom QC */}
      <ambientLight color="#080d1a" intensity={0.35} />
    </>
  );
};

/**
 * F3 Test Lab — salinan web StretchForceIndicator3D.
 * Panah vektor tegangan; dibungkus skala ulang 1.4 agar sejajar grup renderer
 * mobile (basis 1.4 uniform).
 */
export const MobileStretchForceIndicator: React.FC<{
  intensity: number;
  direction: StretchDirection;
}> = ({ intensity, direction }) => {
  if (intensity < 0.03) return null;

  const clampDist = 0.52 + intensity * 0.22;
  const opacity = Math.min(0.85, 0.25 + intensity * 0.6);

  return (
    <group scale={[1.4, 1.4, 1.4]}>
      <group position={[0, -0.05, 0.25]}>
        {direction === 'horizontal' && (
          <>
            <mesh position={[-clampDist, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.035, 0.09, 12]} />
              <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
            </mesh>
            <mesh position={[clampDist, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.035, 0.09, 12]} />
              <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
            </mesh>
          </>
        )}

        {direction === 'vertical' && (
          <>
            <mesh position={[0, clampDist * 0.9, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[0.035, 0.09, 12]} />
              <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, -clampDist * 0.9, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.035, 0.09, 12]} />
              <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
            </mesh>
          </>
        )}

        {direction === 'biaxial' && (
          <>
            {[
              { pos: [-clampDist * 0.7, clampDist * 0.7, 0], rot: Math.PI * 0.75 },
              { pos: [clampDist * 0.7, clampDist * 0.7, 0], rot: -Math.PI * 0.75 },
              { pos: [-clampDist * 0.7, -clampDist * 0.7, 0], rot: Math.PI * 0.25 },
              { pos: [clampDist * 0.7, -clampDist * 0.7, 0], rot: -Math.PI * 0.25 },
            ].map((arrow, idx) => (
              <mesh
                key={idx}
                position={arrow.pos as [number, number, number]}
                rotation={[0, 0, arrow.rot]}
              >
                <coneGeometry args={[0.03, 0.08, 12]} />
                <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </group>
  );
};

/**
 * F3 Test Lab — pengendali fisika tarik REF-BASED (beda sadar vs web).
 * Web memanggil setStretchIntensity per-frame (pointermove + spring) → seluruh
 * subscriber store re-render tiap frame. Mobile menulis group.scale LANGSUNG
 * via registry di pointermove/useFrame dan commit store HANYA saat pointerup
 * (nilai lepas) + saat spring selesai (0) → hemat baterai & render.
 * Panah tegangan memakai state lokal (drag) + throttle 6-frame (spring) agar
 * hanya subtree overlay yang re-render, bukan studio.
 */
export const MobileStretchController: React.FC = () => {
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const storeIntensity = useMobileStudioStore((s) => s.stretchIntensity);
  const stretchDirection = useMobileStudioStore((s) => s.stretchDirection);
  const [dragIntensity, setDragIntensity] = useState<number | null>(null);

  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const springVelRef = useRef(0);
  const liveIntensityRef = useRef(0);
  const springActiveRef = useRef(false);
  const frameTickRef = useRef(0);

  // Sinkron ref saat store berubah dari luar (slider/preset) dalam keadaan idle.
  useEffect(() => {
    if (!isDraggingRef.current && !springActiveRef.current) {
      liveIntensityRef.current = storeIntensity;
    }
  }, [storeIntensity]);

  // Keluar mode stretch / unmount: kembalikan skala basis + bersihkan flag.
  useEffect(() => {
    if (testLabMode !== 'stretch') {
      isDraggingRef.current = false;
      springActiveRef.current = false;
      springVelRef.current = 0;
      liveIntensityRef.current = 0;
      setDragIntensity(null);
      writeMobileStretchScale(1, 1, 1);
      try {
        useMobileStudioStore.getState().setStretchDragging(false);
      } catch {}
    } else {
      try {
        liveIntensityRef.current = useMobileStudioStore.getState().stretchIntensity;
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testLabMode]);

  useEffect(() => {
    return () => {
      // Unmount (ganti mode/apparel): jangan tinggalkan skala drag menempel.
      try {
        if (isDraggingRef.current || springActiveRef.current) {
          writeMobileStretchScale(1, 1, 1);
        }
      } catch {}
      isDraggingRef.current = false;
      springActiveRef.current = false;
      try {
        useMobileStudioStore.getState().setStretchDragging(false);
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (testLabMode !== 'stretch') return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== 'CANVAS') return;
      isDraggingRef.current = true;
      springActiveRef.current = false;
      springVelRef.current = 0;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      try {
        liveIntensityRef.current = useMobileStudioStore.getState().stretchIntensity;
        useMobileStudioStore.getState().setStretchDragging(true);
      } catch {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      let dir: StretchDirection = 'horizontal';
      try {
        dir = useMobileStudioStore.getState().stretchDirection;
      } catch {}
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      let dist = dx;
      if (dir === 'vertical') dist = dy;
      else if (dir === 'biaxial') dist = Math.sqrt(dx * dx + dy * dy);
      // Konversi jarak piksel tarikan layar (0-180px) ke intensitas 0.0-1.0.
      const targetIntensity = Math.min(1.0, dist / 180);
      liveIntensityRef.current = targetIntensity;
      const f = getStretchFactors('stretch', targetIntensity, dir);
      writeMobileStretchScale(f.stretchX, f.stretchY, f.stretchZ);
      setDragIntensity(targetIntensity);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const final = liveIntensityRef.current;
      try {
        useMobileStudioStore.getState().setStretchDragging(false);
      } catch {}
      // Commit SATU KALI (hemat baterai); spring recoil di bawah menulis
      // langsung tanpa menyentuh store sampai benar-benar 0.
      try {
        useMobileStudioStore.getState().setStretchIntensity(final);
      } catch {}
      springVelRef.current = 0;
      springActiveRef.current = true;
      frameTickRef.current = 0;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [testLabMode]);

  // Spring recoil membal (tension 34.0 / damping 7.8 cermin web) — tulis
  // langsung ke grup; store disentuh sekali saat sudah 0.
  useFrame((_, delta) => {
    if (isDraggingRef.current) return;
    if (!springActiveRef.current) return;
    let dir: StretchDirection = 'horizontal';
    try {
      const st = useMobileStudioStore.getState();
      if (st.testLabMode !== 'stretch') {
        springActiveRef.current = false;
        return;
      }
      dir = st.stretchDirection;
    } catch {}
    const cur = liveIntensityRef.current;
    if (cur > 0.001 || Math.abs(springVelRef.current) > 0.001) {
      const dt = Math.min(0.1, delta);
      const force = -34.0 * cur;
      springVelRef.current += (force - 7.8 * springVelRef.current) * dt;
      const next = Math.max(0, cur + springVelRef.current * dt);
      liveIntensityRef.current = next;
      const f = getStretchFactors('stretch', next, dir);
      writeMobileStretchScale(f.stretchX, f.stretchY, f.stretchZ);
      frameTickRef.current += 1;
      if (frameTickRef.current % 6 === 0) setDragIntensity(next);
    } else {
      springActiveRef.current = false;
      springVelRef.current = 0;
      liveIntensityRef.current = 0;
      writeMobileStretchScale(1, 1, 1);
      setDragIntensity(null);
      try {
        useMobileStudioStore.getState().setStretchIntensity(0);
      } catch {}
    }
  });

  return (
    <MobileStretchForceIndicator
      intensity={dragIntensity ?? storeIntensity}
      direction={stretchDirection}
    />
  );
};

/**
 * Root overlay Test Lab mobile — cermin web TestLabOverlay3D.
 * Kopling angin→animasi: mode windtunnel memetakan speed/35 ke preset
 * 'waving' (cermin web setAnimationPreset('wind') + speed/35; mobile
 * AnimationController hanya punya enum idle/walking/waving/spin/none).
 */
export const MobileTestLabOverlay3D: React.FC = () => {
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const windTunnelSpeed = useMobileStudioStore((s) => s.windTunnelSpeed);
  const windDirection = useMobileStudioStore((s) => s.windDirection);
  const flashlightFocus = useMobileStudioStore((s) => s.flashlightFocus);
  const { tier } = useMobileDeviceTier();

  // Kopling speed/35 → waving saat masuk mode angin; keluar mode dikembalikan
  // ke 'none' HANYA bila masih waving (jangan rebut pilihan manual user).
  useEffect(() => {
    try {
      const st = useMobileStudioStore.getState();
      if (testLabMode === 'windtunnel') {
        if (st.activeAnimation !== 'waving') st.setActiveAnimation('waving');
      } else if (st.activeAnimation === 'waving') {
        // testLabMode di sini sudah pasti bukan 'windtunnel' (cabang else).
        st.setActiveAnimation('none');
      }
    } catch {}
  }, [testLabMode]);

  useEffect(() => {
    try {
      const st = useMobileStudioStore.getState();
      if (st.testLabMode === 'windtunnel' && st.activeAnimation !== 'waving') {
        st.setActiveAnimation('waving');
      }
    } catch {}
  }, [windTunnelSpeed]);

  if (testLabMode === 'none') return null;

  return (
    <>
      {testLabMode === 'flashlight' && <MobileFlashlight focusAngle={flashlightFocus} />}
      {testLabMode === 'windtunnel' && (
        <MobileWindStreamlines
          speed={windTunnelSpeed}
          direction={windDirection}
          count={windCountForTier(tier)}
        />
      )}
      {testLabMode === 'stretch' && <MobileStretchController />}
    </>
  );
};
