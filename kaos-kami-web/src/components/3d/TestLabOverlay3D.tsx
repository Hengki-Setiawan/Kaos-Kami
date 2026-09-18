"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useConfiguratorStore, type WindDirection, type StretchDirection } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

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

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const velocity = (speed / 35) * delta * 2.4;

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
 * 🔦 Senter 3D Interaktif (Interactive Inspection Spotlight)
 * Mengikuti kursor mouse / pointer sentuhan layar dengan suspensi halus dan sudut fokus yang dapat disesuaikan.
 */
const InteractiveFlashlight: React.FC<{ focusAngle: number }> = ({ focusAngle }) => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { viewport } = useThree();

  const currentTargetPos = useRef(new THREE.Vector3(0, 0, 0.15));

  useFrame((state, delta) => {
    if (!spotLightRef.current || !targetRef.current) return;

    // Koordinat tujuan kursor di permukaan kaos
    const destX = (state.pointer.x * viewport.width) * 0.36;
    const destY = (state.pointer.y * viewport.height) * 0.36 - 0.05;

    // Tracking pointer yang halus dengan redaman (damping)
    currentTargetPos.current.x = THREE.MathUtils.damp(currentTargetPos.current.x, destX, 14, delta);
    currentTargetPos.current.y = THREE.MathUtils.damp(currentTargetPos.current.y, destY, 14, delta);

    targetRef.current.position.set(
      currentTargetPos.current.x,
      currentTargetPos.current.y,
      0.15
    );

    // Sumber senter di depan kanvas, sedikit offset dinamis
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
        target={targetRef.current || undefined}
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
const StretchPhysicsController: React.FC = () => {
  const { stretchIntensity, setStretchIntensity, stretchDirection } = useConfiguratorStore(
    useShallow((s) => ({
      stretchIntensity: s.stretchIntensity,
      setStretchIntensity: s.setStretchIntensity,
      stretchDirection: s.stretchDirection,
    }))
  );

  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const springVelRef = useRef(0);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Hindari memicu drag jika klik di luar canvas
      const target = e.target as HTMLElement;
      if (target && target.tagName !== "CANVAS") return;

      isDraggingRef.current = true;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);

      let dist = dx;
      if (stretchDirection === "vertical") dist = dy;
      else if (stretchDirection === "biaxial") dist = Math.sqrt(dx * dx + dy * dy);

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
  }, [setStretchIntensity, stretchDirection]);

  // Simulasi pegas membal (spring oscillation) saat dilepas
  useFrame((_, delta) => {
    if (isDraggingRef.current) return;
    if (stretchIntensity > 0.001 || Math.abs(springVelRef.current) > 0.001) {
      const tension = 34.0; // Kekakuan pegas
      const damping = 7.8;  // Peredam getaran
      const force = -tension * stretchIntensity;
      springVelRef.current += (force - damping * springVelRef.current) * Math.min(0.1, delta);
      const nextVal = Math.max(0, stretchIntensity + springVelRef.current * Math.min(0.1, delta));
      setStretchIntensity(nextVal);
    } else if (stretchIntensity !== 0) {
      setStretchIntensity(0);
      springVelRef.current = 0;
    }
  });

  return (
    <StretchForceIndicator3D
      intensity={stretchIntensity}
      direction={stretchDirection}
    />
  );
};

/**
 * 🧪 TestLabOverlay3D — Root Overlay untuk Semua Fitur Test Lab 3D
 */
export const TestLabOverlay3D: React.FC = () => {
  const { testLabMode, windTunnelSpeed, windDirection, flashlightFocus } = useConfiguratorStore(
    useShallow((s) => ({
      testLabMode: s.testLabMode,
      windTunnelSpeed: s.windTunnelSpeed,
      windDirection: s.windDirection,
      flashlightFocus: s.flashlightFocus,
    }))
  );

  if (testLabMode === "none") return null;

  return (
    <>
      {testLabMode === "flashlight" && (
        <InteractiveFlashlight focusAngle={flashlightFocus} />
      )}
      {testLabMode === "windtunnel" && (
        <WindTunnelStreamlines speed={windTunnelSpeed} direction={windDirection} />
      )}
      {testLabMode === "stretch" && <StretchPhysicsController />}
    </>
  );
};
