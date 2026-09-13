"use client";

import React, { useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useMobileStudioStore, mobileMaxScaleUnits, type ApparelType } from '@/store/useMobileStudioStore';
import { haptic } from '@/lib/bridge/haptics';

/**
 * Cermin SSOT web `kaos-kami-web/src/lib/scaleCalibration.ts` (SURFACE_Z_PER_APPAREL,
 * FASE 13 terukur pita dada pct 30–70): tshirt 0.151 (tee-basic.glb) &
 * crewneck 0.151 (sweater.glb) · hoodie 0.177 (hoodie-blue.glb world ×26) ·
 * longsleeve 0.176 (warisan) · shirt 0.24 (warisan) · cap 0.091 (crown depan) ·
 * pants 0.122 (depth 0.244/2 TERUKUR) · shorts 0.120 (depth 0.240/2 TERUKUR
 * 12 Sep 2026).
 * Cross-workspace import tidak ada (web ≠ mobile bundle) → diduplikasi lokal.
 * Ukur ulang bila mesh GLB diganti. Paritas dijaga test vitest web
 * `kaos-kami-web/src/lib/surfaceZParity.test.ts` — drift ketahuan saat SSOT berubah.
 */
export const MOBILE_SURFACE_Z: Record<ApparelType, number> = {
  tshirt: 0.151,
  longsleeve: 0.176,
  hoodie: 0.177,
  shirt: 0.24,
  crewneck: 0.151,
  sweater: 0.151, // alias crewneck (mesh sweater.glb sama) → ikut SSOT crewneck
  cap: 0.091, // cermin web (crown-front Z terukur)
  // PANTS/SHORTS cermin web SSOT (depth/2 TERUKUR 12 Sep 2026):
  // pants 0.122 (0.244/2), shorts 0.120 (0.240/2). Celah antar-kaki bisa
  // menyesatkan di area selangkangan — ukur panel paha + cek visual menyusul
  // (orderable false → mockup saja).
  pants: 0.122,
  shorts: 0.12,
};
/** EPS gizmo SSOT web (+0.01 target sentuh/hover; renderer +0.004, guide +0.002). */
const GIZMO_SURFACE_EPS = 0.01;

/** SSOT batas geser web `DECAL_MOVE_LIMITS` (scaleCalibration.ts): depan/
 * belakang ±0.35. Mobile front-only → X & Y disamakan ±0.35 (Y dulu -0.3…
 * 0.3, kini selaras penuh; tak ada perbedaan sengaja yang perlu didokumentasikan). */
const X_BOUND = 0.35;
const Y_MIN = -0.35;
const Y_MAX = 0.35;
const SNAP_X = 0.008;
/** Skala minimal selaras Zod web `DecalLayerSchema.scale` (min 0.02). */
const MIN_SCALE = 0.02;

/**
 * M3.3 — Direct on-mesh decal gizmo (mobile).
 * 1 jari: geser logo di permukaan kaos (snap tengah x=0 + haptic).
 * 2 jari: cubit untuk skala (clamp 30cm + warning), putar untuk rotasi.
 * Selama drag, orbit dikunci via store.isGizmoDragging.
 */
export function DecalGizmoMobile() {
  const decalUrl = useMobileStudioStore((s) => s.decalUrl);
  const decalPosition = useMobileStudioStore((s) => s.decalPosition);
  const decalScale = useMobileStudioStore((s) => s.decalScale);
  const decalRotation = useMobileStudioStore((s) => s.decalRotation);
  const activeFace = useMobileStudioStore((s) => s.activeFace);
  const setDecalTransform = useMobileStudioStore((s) => s.setDecalTransform);
  const setGizmoDragging = useMobileStudioStore((s) => s.setGizmoDragging);
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const maxScale = mobileMaxScaleUnits(apparelType);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{ dist: number; angle: number; scale: number; rot: number } | null>(null);
  const snapped = useRef(false);
  const warnedMax = useRef(false);
  const group = useRef<THREE.Group>(null);

  if (!decalUrl) return null;

  // Bidang sentuh di permukaan dada SSOT per apparel + EPS gizmo web (+0.01).
  const zBase = MOBILE_SURFACE_Z[apparelType] ?? 0.176;
  const z = activeFace === 'front' ? zBase + GIZMO_SURFACE_EPS : -(zBase + GIZMO_SURFACE_EPS);

  const toLocal = (world: THREE.Vector3): THREE.Vector3 => {
    if (!group.current) return world;
    group.current.updateWorldMatrix(true, false);
    return group.current.worldToLocal(world.clone());
  };

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGizmoDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      gestureStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        scale: decalScale[0],
        rot: decalRotation,
      };
    }
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      // Geser: pakai titik interseksi 3D → koordinat lokal grup.
      const local = toLocal(e.point);
      let nx = Math.max(-X_BOUND, Math.min(X_BOUND, local.x));
      const ny = Math.max(Y_MIN, Math.min(Y_MAX, local.y));
      if (Math.abs(nx) < SNAP_X) {
        nx = 0;
        if (!snapped.current) {
          snapped.current = true;
          haptic.selection();
        }
      } else {
        snapped.current = false;
      }
      setDecalTransform([nx, ny, decalPosition[2]], decalScale, decalRotation);
    } else if (pointers.current.size === 2 && gestureStart.current) {
      // Cubit + putar.
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const g = gestureStart.current;
      const raw = (g.scale * dist) / Math.max(1, g.dist);
      const ns = Math.max(MIN_SCALE, Math.min(maxScale, raw));
      if (ns >= maxScale && !warnedMax.current) {
        warnedMax.current = true;
        haptic.tapHeavy();
      } else if (ns < maxScale) {
        warnedMax.current = false;
      }
      const rotDeg = g.rot + ((angle - g.angle) * 180) / Math.PI;
      const rot = Math.max(-180, Math.min(180, rotDeg));
      setDecalTransform(decalPosition, [ns, ns, ns], rot);
    }
  };

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gestureStart.current = null;
    if (pointers.current.size === 0) {
      snapped.current = false;
      setGizmoDragging(false);
    }
  };

  return (
    <group ref={group}>
      <mesh
        position={[0, 0, z]}
        rotation={activeFace === 'front' ? [0, 0, 0] : [0, Math.PI, 0]}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
      >
        <planeGeometry args={[1.1, 1.3]} />
        {/* Tak terlihat tapi tetap bisa di-raycast */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
