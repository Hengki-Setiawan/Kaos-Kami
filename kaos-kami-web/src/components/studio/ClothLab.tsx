"use client";

import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { createClothParticleGrid, gsmPreset, type VerletCloth } from "@/lib/verletCloth";

const NX = 22;
const NY = 16;
const SPACING = 0.038;

function ClothMesh({
  cloth,
  color,
  windRef,
}: {
  cloth: VerletCloth;
  color: string;
  windRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  const lastCursor = useRef(new THREE.Vector3());
  const drag = useRef<{
    ids: number[];
    offs: Float32Array;
    plane: THREE.Plane;
    vel: THREE.Vector3;
    last: number;
  } | null>(null);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  material.color.set(color);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    cloth.step(dt, performance.now() / 1000, { x: 0, y: 0, z: windRef.current });
    const pos = geoRef.current?.attributes.position as THREE.BufferAttribute | undefined;
    if (pos) {
      (pos.array as Float32Array).set(cloth.positions);
      pos.needsUpdate = true;
      geoRef.current?.computeVertexNormals();
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const ids = cloth.pickNearest(p.x, p.y, p.z, 6);
    if (ids.length === 0) return;
    const offs = new Float32Array(ids.length * 3);
    ids.forEach((id, k) => {
      offs[k * 3]! = cloth.positions[id * 3]! - p.x;
      offs[k * 3 + 1]! = cloth.positions[id * 3 + 1]! - p.y;
      offs[k * 3 + 2]! = cloth.positions[id * 3 + 2]! - p.z;
    });
    const n = new THREE.Vector3();
    camera.getWorldDirection(n);
    lastCursor.current.copy(p);
    drag.current = {
      ids,
      offs,
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, p),
      vel: new THREE.Vector3(),
      last: performance.now(),
    };
    (e.target as any).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(d.plane, hit)) return;
    const now = performance.now();
    const dt = Math.max((now - d.last) / 1000, 1 / 240);
    d.vel.lerp(hit.clone().sub(lastCursor.current).divideScalar(dt), 0.35);
    lastCursor.current.copy(hit);
    d.last = now;
    d.ids.forEach((id, k) => {
      cloth.forcePosition(id, hit.x + d.offs[k * 3]!, hit.y + d.offs[k * 3 + 1]!, hit.z + d.offs[k * 3 + 2]!);
    });
  };

  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const sp = d.vel.length();
    if (sp > 0.05) {
      const f = d.vel.multiplyScalar(0.12);
      d.ids.forEach((id, k) => {
        const w = 1 - (k / d.ids.length) * 0.7;
        cloth.addVelocity(id, f.x * w, f.y * w, f.z * w);
      });
    }
    drag.current = null;
  };

  return (
    <mesh
      material={material}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <planeGeometry ref={geoRef} args={[NX * SPACING, NY * SPACING, NX, NY]} />
    </mesh>
  );
}

/**
 * LAB KAIN — swatch verlet interaktif: cubit & tarik kainnya, rasakan beda
 * GSM + angin. Fisika JS murni (tanpa WASM/native) — aman di HP & Workers.
 */
export const ClothLab: React.FC = () => {
  const { selectedColor, materialFinish } = useConfiguratorStore();
  const [wind, setWind] = useState(0.6);
  const [open, setOpen] = useState(false);
  const windRef = useRef(0.6);
  const preset = gsmPreset(materialFinish || "combed-cotton");
  const cloth = useMemo(
    () =>
      createClothParticleGrid({
        nx: NX,
        ny: NY,
        spacing: SPACING,
        mass: 1,
        damping: preset.damping,
        iterations: preset.iterations,
        pinTopRow: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materialFinish]
  );

  windRef.current = wind * preset.windGain * 2.2;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary transition-all"
      >
        🧪 BUKA LAB KAIN (cubit & tarik)
      </button>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-surface border border-border-subtle space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-text-primary">🧪 LAB KAIN — cubit & tarik!</span>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] font-mono text-text-muted hover:text-white"
          aria-label="Tutup lab kain"
        >
          TUTUP
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 h-56">
        <Canvas camera={{ position: [0, -0.25, 1.1], fov: 42 }} dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} />
          <ClothMesh cloth={cloth} color={selectedColor} windRef={windRef} />
        </Canvas>
      </div>
      <p className="font-mono text-[10px] text-text-muted">
        {preset.label} · tahan & seret kainnya, lepas untuk sentakan.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-text-muted">ANGIN</span>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.05}
          value={wind}
          onChange={(e) => setWind(parseFloat(e.target.value))}
          className="flex-1 accent-brand-accent"
          aria-label="Kekuatan angin"
        />
        <button
          onClick={() => cloth.reset()}
          className="px-2.5 py-1 rounded-lg bg-canvas border border-white/10 text-[10px] font-mono font-bold text-text-muted hover:text-white"
        >
          RESET
        </button>
      </div>
    </div>
  );
};
