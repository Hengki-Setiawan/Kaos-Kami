"use client";

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import {
  useMobileStudioStore,
  activeDecalOf,
  type ApparelType,
} from '@/store/useMobileStudioStore';
import {
  MOBILE_SURFACE_Z,
  clampMobileDecalXY,
  mobileMaxDecalScaleUnits,
  MOBILE_MIN_DECAL_SCALE,
} from '@/lib/3d/mobileScaleCalibration';
import { haptic } from '@/lib/bridge/haptics';

/** Kompat: tabel SSOT pindah ke lib (nilai sama, impor lama tetap jalan). */
export { MOBILE_SURFACE_Z };
/** EPS gizmo SSOT web (+0.01 target sentuh/hover; renderer +0.004, guide +0.002). */
const GIZMO_SURFACE_EPS = 0.01;

/** Batas geser = SSOT per sisi (lib clampMobileDecalXY); snap tengah x=0. */
const SNAP_X = 0.008;
/** Skala minimal selaras Zod web `DecalLayerSchema.scale` (min 0.02). */
const MIN_SCALE = MOBILE_MIN_DECAL_SCALE;

/**
 * M3.3 — Direct on-mesh decal gizmo (mobile).
 * 1 jari: geser logo di permukaan kaos (snap tengah x=0 + haptic).
 * 2 jari: cubit untuk skala (clamp 30cm + warning), putar untuk rotasi.
 * Selama drag, orbit dikunci via store.isGizmoDragging.
 * P-gizmo: visual box + 4 handle sudut + handle resize oranye + tangkai/bola
 * putar + guideline tengah (terang saat snap). Visual = raycast-null
 * (non-interaktif); interaksi TETAP cubit/geser lama sebagai fallback.
 * Culling grazing murah: null saat kamera left/right atau muka membelakangi.
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
  // F3 arbitrasi: gizmo NULL saat drag stretch (jari milik fisika tarik).
  const isStretchDragging = useMobileStudioStore((s) => s.isStretchDragging);
  // Visual: status drag (highlight box) + sudut kamera (culling murah).
  const cameraAngle = useMobileStudioStore((s) => s.cameraAngle);
  const isDragging = useMobileStudioStore((s) => s.isGizmoDragging);
  // P1: perilaku cubit/geser LAMA dipertahankan penuh sebagai fallback;
  // target tulis = decal AKTIF dan batas geser + skala maks mengikuti sisi
  // decal aktif (depan/belakang/lengan/samping/tudung).
  const activeSide = useMobileStudioStore((s) => activeDecalOf(s)?.targetSide ?? 'front');
  const maxScale = Math.max(MIN_SCALE, mobileMaxDecalScaleUnits(apparelType, activeSide));

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{ dist: number; angle: number; scale: number; rot: number } | null>(null);
  const snapped = useRef(false);
  // Cermin state untuk guideline tengah (ref tak memicu render).
  const [snapOn, setSnapOn] = useState(false);
  const warnedMax = useRef(false);
  const group = useRef<THREE.Group>(null);

  // Culling grazing MURAH (tanpa dot-product per-frame): gizmo 2D depan/
  // belakang tak bermakna saat kamera menyamping (left/right = grazing 90°)
  // atau saat muka aktif membelakangi kamera. Perspective = selalu tampil.
  const grazingCulled =
    cameraAngle === 'left' ||
    cameraAngle === 'right' ||
    (cameraAngle === 'front' && activeFace === 'back') ||
    (cameraAngle === 'back' && activeFace === 'front');
  if (!decalUrl || isStretchDragging || grazingCulled) return null;

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
      // Geser: pakai titik interseksi 3D → koordinat lokal grup, dijepit ke
      // batas SSOT sisi decal aktif (lib clampMobileDecalXY).
      const local = toLocal(e.point);
      const c = clampMobileDecalXY(activeSide, local.x, local.y);
      let nx = c.x;
      const ny = c.y;
      if (Math.abs(nx) < SNAP_X) {
        nx = 0;
        if (!snapped.current) {
          snapped.current = true;
          setSnapOn(true);
          haptic.selection();
        }
      } else {
        if (snapped.current) setSnapOn(false);
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
      setSnapOn(false);
      setGizmoDragging(false);
    }
  };

  // ---- Visual gizmo (non-interaktif; cubit/geser = bidang sentuh di bawah)
  // Box = skala decal aktif; handle sudut = affordance cubit; tangkai+bola
  // atas = affordance putar; garis tengah = guideline snap x=0.
  // Semua visual raycast-null agar JANGAN mencuri sentuhan dari bidang cubit.
  const boxW = Math.max(0.02, decalScale[0]);
  const boxH = Math.max(0.02, decalScale[1] ?? decalScale[0]);
  const rotZ = (-decalRotation * Math.PI) / 180;
  const visualZ = z + 0.002;
  const lineColor = isDragging ? '#ffb020' : '#FF6B35';
  const t = 0.004; // tebal garis box (unit 3D, terlihat di HP 6")
  const hs = 0.02; // sisi handle sudut
  const hx = boxW / 2;
  const hy = boxH / 2;
  const rotHandleY = hy + 0.05;
  const noRaycast = () => null;

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

      {/* Guideline tengah dunia (x=0): redup biasa, oranye terang saat snap. */}
      <mesh position={[0, 0, z + 0.001]} raycast={noRaycast}>
        <planeGeometry args={[snapOn ? 0.006 : 0.0025, 1.3]} />
        <meshBasicMaterial
          color={snapOn ? '#FF6B35' : '#ffffff'}
          transparent
          opacity={snapOn ? 0.9 : 0.22}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Box + handle mengikuti decal aktif (belakang = cermin Y-PI). */}
      <group
        position={[decalPosition[0], decalPosition[1], visualZ]}
        rotation={[0, activeFace === 'front' ? 0 : Math.PI, rotZ]}
      >
        {/* Sisi box: atas/bawah/kiri/kanan */}
        <mesh position={[0, hy, 0]} raycast={noRaycast}>
          <planeGeometry args={[boxW + t, t]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, -hy, 0]} raycast={noRaycast}>
          <planeGeometry args={[boxW + t, t]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[-hx, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[t, boxH]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[hx, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[t, boxH]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* 4 handle sudut (affordance cubit/resize) */}
        {([[-hx, hy], [hx, hy], [-hx, -hy], [hx, -hy]] as const).map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]} raycast={noRaycast}>
            <planeGeometry args={[hs, hs]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
        {/* Handle resize kanan-bawah: lebih besar + oranye (isyarat cubit). */}
        <mesh position={[hx, -hy, 0]} raycast={noRaycast}>
          <planeGeometry args={[hs * 1.4, hs * 1.4]} />
          <meshBasicMaterial color="#FF6B35" transparent opacity={1} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* Tangkai + bola putar di atas tengah (affordance rotate). */}
        <mesh position={[0, hy + 0.025, 0]} raycast={noRaycast}>
          <planeGeometry args={[t, 0.05]} />
          <meshBasicMaterial color={lineColor} transparent opacity={0.9} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, rotHandleY, 0]} raycast={noRaycast}>
          <circleGeometry args={[0.016, 20]} />
          <meshBasicMaterial color="#FF6B35" transparent opacity={1} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
