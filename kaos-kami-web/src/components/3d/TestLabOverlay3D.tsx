"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useConfiguratorStore, type WindDirection, type StretchDirection } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { sharedStretchUniforms } from "@/lib/3d/stretchDeform";
import { U_MAX_ELONG, POISSON_EFF } from "@/lib/3d/stretchPhysics";
import { sharedWindUniforms } from "@/lib/shaders/windDisplacement";
import { windDirectionToVec, WIND_GUST } from "@/lib/3d/windDirection";
import { grazingToOffset, estimateLux, type QcSide } from "@/lib/qcLighting";
import { surfaceZForApparel, getDecal3DPlacement } from "@/lib/scaleCalibration";

/** Hormati prefers-reduced-motion: animasi diganti statis/cepat-settle. */
function useReducedMotion(): boolean {
  return useMemo(() => {
    try {
      return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);
}

/**
 * 🌪️ Partikel Garis Arus Terowongan Angin (Aerodynamic Wind Tunnel Streamlines)
 * Mengalirkan partikel aerodinamis bercahaya melintasi pakaian sesuai arah angin yang dipilih (Depan, Samping, Bawah).
 */
const WindTunnelStreamlines: React.FC<{ speed: number; direction: WindDirection }> = ({
  speed,
  direction,
}) => {
  const count = 50;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Inisialisasi posisi dan kecepatan partikel acak
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
    // Silinder ramping memanjang menyerupai jejak kabut aerodinamis wind tunnel
    const g = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 8);
    if (direction === "side") {
      g.rotateZ(Math.PI / 2); // Mengalir horizontal sumbu X
    } else if (direction === "up") {
      // Tegak lurus mengalir ke atas sumbu Y
    } else {
      g.rotateX(Math.PI / 2); // Mengalir dari depan ke belakang sumbu Z
    }
    return g;
  }, [direction]);

  // Warna dinamis bereaksi terhadap kecepatan angin
  const streakColor = useMemo(() => {
    if (speed >= 70) return new THREE.Color("#f59e0b"); // Badai amber
    if (speed >= 40) return new THREE.Color("#14b8a6"); // Kencang turquoise
    return new THREE.Color("#38bdf8"); // Sepoi sky blue
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

  const reducedMotion = useReducedMotion();

  // Inisialisasi matriks sekali (wajib: instanceMatrix tanpa tulis = sampah GPU).
  useEffect(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [meshRef, particles, dummy]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // Reduced-motion: tampil statis (tanpa gerakan).
    if (reducedMotion) return;
    // Kopling gust bersama shader kain (denyut bersamaan, deterministik).
    const gust = WIND_GUST(state.clock.elapsedTime);
    const velocity = (speed / 35) * delta * 2.4 * (0.5 + 0.5 * gust);

    particles.forEach((p, i) => {
      if (direction === "side") {
        // Aliran dari sisi kanan (+X) ke kiri (-X)
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
      } else if (direction === "up") {
        // Aliran dari bawah (-Y) ke atas (+Y)
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
        // Default front: Aliran dari depan (+Z) ke belakang (-Z)
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
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[streakGeo, streakMat, count]}
      frustumCulled={false}
    />
  );
};

/**
 * 🔦 Senter QC Pro (Interactive Inspection Spotlight v2)
 * - Target mengikuti pointer + KEDALAMAN per apparel/sisi (SSOT surfaceZ, bukan 0.15 fixed).
 * - Posisi lampu dari sudut GRAZING industri (15/30/45/90°) via qcLighting.
 * - Fisik: decay=2 (E≈I/d²), readout lux estimasi throttled 4Hz.
 * - focusAngle = setengah-cone spotlight (radian, dari slider) — konsep beda dari grazing.
 */
const InteractiveFlashlight: React.FC<{
  focusAngle: number;
  grazingDeg: number;
  azimuthDeg: number;
  side: QcSide;
}> = ({ focusAngle, grazingDeg, azimuthDeg, side }) => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { viewport } = useThree();
  const activeApparel = useConfiguratorStore((s) => s.activeApparel);
  const setQcLux = useConfiguratorStore((s) => s.setQcLux);

  const surfaceZ = surfaceZForApparel(activeApparel);
  const currentTargetPos = useRef(new THREE.Vector3(0, 0, surfaceZ));
  const frameRef = useRef(0);

  useFrame((state, delta) => {
    if (!spotLightRef.current || !targetRef.current) return;

    // Koordinat pointer di bidang garmen (skala viewport → unit 3D).
    const ptrX = (state.pointer.x * viewport.width) * 0.36;
    const ptrY = (state.pointer.y * viewport.height) * 0.36 - 0.05;

    currentTargetPos.current.x = THREE.MathUtils.damp(currentTargetPos.current.x, ptrX, 14, delta);
    currentTargetPos.current.y = THREE.MathUtils.damp(currentTargetPos.current.y, ptrY, 14, delta);

    // Kedalaman target per sisi: depan/belakang = surfaceZ SSOT; sisi/lengan =
    // reuse penempatan proyektor decal (kontur A-pose yg sudah terkalibrasi).
    let tz = surfaceZ + 0.004;
    if (side === "back") {
      tz = -(surfaceZ + 0.004);
    } else if (side !== "front") {
      try {
        const place = getDecal3DPlacement(activeApparel, side, currentTargetPos.current.x, currentTargetPos.current.y, surfaceZ);
        targetRef.current.position.set(place.position[0], place.position[1], place.position[2]);
      } catch {
        targetRef.current.position.set(currentTargetPos.current.x, currentTargetPos.current.y, tz);
      }
    } else {
      targetRef.current.position.set(currentTargetPos.current.x, currentTargetPos.current.y, tz);
    }
    const t = targetRef.current.position;

    // Posisi lampu = target + offset sudut grazing (dari permukaan kain).
    const off = grazingToOffset(grazingDeg, 1.6, azimuthDeg);
    spotLightRef.current.position.set(t.x + off.x, t.y + off.y, t.z + off.z);

    // Readout lux estimasi (throttle ~4Hz — hemat re-render store).
    frameRef.current += 1;
    if (frameRef.current % 15 === 0) {
      const dist = spotLightRef.current.position.distanceTo(t);
      setQcLux(estimateLux(7.2, dist));
    }
  });

  const isDiffuse = grazingDeg >= 90;

  return (
    <>
      <object3D ref={targetRef} position={[0, 0, surfaceZ]} />
      <spotLight
        ref={spotLightRef}
        target={targetRef.current || undefined}
        intensity={7.2}
        angle={focusAngle}
        penumbra={isDiffuse ? 0.9 : 0.45}
        color="#ffffff"
        distance={6}
        decay={2}
      />
      {/* Cahaya ambient redup bernuansa darkroom QC */}
      <ambientLight color="#080d1a" intensity={0.35} />
    </>
  );
};

/**
 * 🧲 Indikator Visual Vektor Tegangan Tarik Kain 3D
 */
const StretchForceIndicator3D: React.FC<{
  intensity: number;
  direction: StretchDirection;
}> = ({ intensity, direction }) => {
  if (intensity < 0.03) return null;

  const clampDist = 0.52 + intensity * 0.22;
  const opacity = Math.min(0.85, 0.25 + intensity * 0.6);

  return (
    <group position={[0, -0.05, 0.25]}>
      {direction === "horizontal" && (
        <>
          {/* Panah Gaya Tarik Kiri */}
          <mesh position={[-clampDist, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.035, 0.09, 12]} />
            <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
          </mesh>
          {/* Panah Gaya Tarik Kanan */}
          <mesh position={[clampDist, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.035, 0.09, 12]} />
            <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {direction === "vertical" && (
        <>
          {/* Panah Gaya Tarik Atas */}
          <mesh position={[0, clampDist * 0.9, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.035, 0.09, 12]} />
            <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
          </mesh>
          {/* Panah Gaya Tarik Bawah */}
          <mesh position={[0, -clampDist * 0.9, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.035, 0.09, 12]} />
            <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {direction === "biaxial" && (
        <>
          {/* 4 Panah Gaya Tarik Radial */}
          {[
            { pos: [-clampDist * 0.7, clampDist * 0.7, 0], rot: Math.PI * 0.75 },
            { pos: [clampDist * 0.7, clampDist * 0.7, 0], rot: -Math.PI * 0.75 },
            { pos: [-clampDist * 0.7, -clampDist * 0.7, 0], rot: Math.PI * 0.25 },
            { pos: [clampDist * 0.7, -clampDist * 0.7, 0], rot: -Math.PI * 0.25 },
          ].map((arrow, idx) => (
            <mesh key={idx} position={arrow.pos as [number, number, number]} rotation={[0, 0, arrow.rot]}>
              <coneGeometry args={[0.03, 0.08, 12]} />
              <meshBasicMaterial color="#f97316" transparent opacity={opacity} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

/**
 * 🧲 Pengendali Fisika Elastisitas & Tarik Kain (Pull & Stretch Physics Controller)
 * Menangani tarikan interaktif pointer pada kanvas, dengan animasi osilasi membal (spring damping recoil).
 */
/**
 * 🧲 Pengendali Fisika Elastisitas & Tarik Kain (Pull & Stretch Physics Controller)
 * - Tarikan interaktif pointer + recoil pegas (spring damping).
 * - PENULIS TUNGGAL uniforms shader bersama (kain+decal sinkron, tanpa re-render).
 * - Raycast titik grip → uStretchCenter (deformasi lokal, bukan global).
 */
const StretchPhysicsController: React.FC = () => {
  const { stretchIntensity, setStretchIntensity, stretchDirection } = useConfiguratorStore(
    useShallow((s) => ({
      stretchIntensity: s.stretchIntensity,
      setStretchIntensity: s.setStretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );
  const setStretchCenterXY = useConfiguratorStore((s) => s.setStretchCenterXY);
  const { gl, camera, scene } = useThree();
  const reducedMotion = useReducedMotion();

  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const springVelRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Hindari memicu drag jika klik di luar canvas
      const target = e.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") return;

      isDraggingRef.current = true;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };

      // Raycast titik grip di permukaan garmen → pusat deformasi lokal.
      try {
        const rect = gl.domElement.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
        raycasterRef.current.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const meshes: THREE.Object3D[] = [];
        scene.traverse((o: THREE.Object3D) => {
          const anyO = o as unknown as { isMesh?: boolean; isInstancedMesh?: boolean };
          if (anyO.isMesh && !anyO.isInstancedMesh) meshes.push(o);
        });
        const hits = raycasterRef.current.intersectObjects(meshes, false);
        if (hits.length > 0) {
          const p = hits[0]!.point;
          // World → ruang lokal garmen (kompensasi grup model; aproksimasi jujur).
          const st = useConfiguratorStore.getState();
          const gx = st.viewMode === "story" ? 0 : st.modelPosX;
          const gy = st.viewMode === "story" ? -0.05 : st.modelPosY - 0.05;
          const gs = st.viewMode === "story" ? 1.0 : st.modelScale || 1;
          const lx = Math.max(-0.5, Math.min(0.5, (p.x - gx) / gs));
          const ly = Math.max(-0.5, Math.min(0.5, (p.y - gy) / gs));
          setStretchCenterXY([lx, ly]);
        }
      } catch {
        // Grip fallback = tengah (0,0); tarikan tetap jalan.
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);

      const dirNow = useConfiguratorStore.getState().stretchDirection;
      let dist = dx;
      if (dirNow === "vertical") dist = dy;
      else if (dirNow === "biaxial") dist = Math.sqrt(dx * dx + dy * dy);

      // Konversi jarak piksel tarikan layar (0-180px) ke intensitas (0.0 - 1.0)
      const targetIntensity = Math.min(1.0, dist / 180);
      setStretchIntensity(targetIntensity);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setStretchIntensity, setStretchCenterXY, gl, camera, scene]);

  // Penulis uniforms + recoil pegas. Baca store via getState (tanpa subscribe →
  // tanpa re-render per-frame; uniform .value mutasi langsung).
  useFrame((_, delta) => {
    const st = useConfiguratorStore.getState();
    const dir = st.stretchDirection;
    // Reduced-motion: redaman kritis (settle cepat tanpa osilasi).
    const tension = reducedMotion ? 60.0 : 34.0;
    const damping = reducedMotion ? 15.5 : 7.8;
    if (!isDraggingRef.current) {
      const cur = st.stretchIntensity;
      if (cur > 0.001 || Math.abs(springVelRef.current) > 0.001) {
        const force = -tension * cur;
        springVelRef.current += (force - damping * springVelRef.current) * Math.min(0.1, delta);
        const nextVal = Math.max(0, cur + springVelRef.current * Math.min(0.1, delta));
        st.setStretchIntensity(nextVal);
      } else if (cur !== 0) {
        st.setStretchIntensity(0);
        springVelRef.current = 0;
      }
    }
    // Tulis uniforms bersama (kain + decal membaca objek yg sama).
    const intensity = useConfiguratorStore.getState().stretchIntensity;
    sharedStretchUniforms.uStretch.value = st.testLabMode === "stretch" ? intensity : 0;
    sharedStretchUniforms.uStretchDir.value.set(
      dir === "vertical" ? 0 : dir === "biaxial" ? Math.SQRT1_2 : 1,
      dir === "vertical" ? 1 : dir === "biaxial" ? Math.SQRT1_2 : 0
    );
    sharedStretchUniforms.uStretchCenter.value.set(st.stretchCenterXY[0], st.stretchCenterXY[1]);
    sharedStretchUniforms.uMaxElong.value = U_MAX_ELONG[dir] ?? 0.3;
    sharedStretchUniforms.uPoisson.value = POISSON_EFF;
  });

  return (
    <StretchForceIndicator3D
      intensity={stretchIntensity}
      direction={stretchDirection}
    />
  );
};

/** Penulis uniforms angin bersama (gust + arah) — murah, selalu mount saat overlay aktif. */
const WindUniformWriter: React.FC = () => {
  useFrame((state) => {
    const st = useConfiguratorStore.getState();
    sharedWindUniforms.uGust.value = WIND_GUST(state.clock.elapsedTime);
    sharedWindUniforms.uWindDir.value = windDirectionToVec(
      st.testLabMode === "windtunnel" ? st.windDirection : "front"
    );
  });
  return null;
};

/**
 * 🧪 TestLabOverlay3D — Root Overlay untuk Semua Fitur Test Lab 3D
 */
export const TestLabOverlay3D: React.FC = () => {
  const { testLabMode, windTunnelSpeed, windDirection, flashlightFocus, qcGrazingDeg, qcAzimuth, qcSide } =
    useConfiguratorStore(
      useShallow((s) => ({
        testLabMode: s.testLabMode,
        windTunnelSpeed: s.windTunnelSpeed,
        windDirection: s.windDirection,
        flashlightFocus: s.flashlightFocus,
        qcGrazingDeg: s.qcGrazingDeg,
        qcAzimuth: s.qcAzimuth,
        qcSide: s.qcSide,
      }))
    );

  if (testLabMode === "none") return null;

  return (
    <>
      <WindUniformWriter />
      {testLabMode === "flashlight" && (
        <InteractiveFlashlight
          focusAngle={flashlightFocus}
          grazingDeg={qcGrazingDeg}
          azimuthDeg={qcAzimuth}
          side={qcSide}
        />
      )}
      {testLabMode === "windtunnel" && (
        <WindTunnelStreamlines speed={windTunnelSpeed} direction={windDirection} />
      )}
      {testLabMode === "stretch" && <StretchPhysicsController />}
    </>
  );
};
