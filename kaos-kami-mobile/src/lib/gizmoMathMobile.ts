/**
 * Matematika MURNI gizmo mobile — port dari web `src/lib/gizmoSvgMath.ts`
 * (Bab 56 A2). TANPA React/R3F/store.
 *
 * Adaptasi mobile:
 * - clamp via `clampMobileDecalXY` (SSOT mobile, cermin web `clampDecalXY`).
 * - sisi memakai `MobileDecalSide` (nilai 7 sisi SAMA dengan web
 *   `DecalTargetSide`, sehingga `signXForSide` port 1:1).
 * - three DIPAKAI (mobile punya `three` + fiber/drei — bukan "tak punya"),
 *   sehingga `projectGizmoQuad` port penuh termasuk `vector.project(camera)`.
 * - snap: mobile MEMPERTAHANKAN semantik lama (snap sumbu X saja,
 *   tol 0.008) — web menjepit X+Y tol 0.01. Divergensi disengaja agar
 *   gestur geser vertikal HP tak "menempel" tiba-tiba; lihat
 *   `applySnapAndClampMobile`.
 */

import * as THREE from 'three';
import { clampMobileDecalXY } from './3d/mobileScaleCalibration';
import type { MobileDecalSide } from './3d/mobileScaleCalibration';

/** Toleransi snap magnetik tengah sumbu X (unit 3D) — semantik mobile lama. */
export const MOBILE_GIZMO_SNAP_X = 0.008;

/** Dot-product minimum agar gizmo dianggap menghadap kamera (port web). */
export const MOBILE_GIZMO_OCCLUSION_MIN_DOT = 0.05;

/** Radius hit-area sentuh pinpoint (px) — port web. */
export const MOBILE_GIZMO_TOUCH_HIT_R_PX = 12;

export interface MobileGizmoScreenPt {
  x: number;
  y: number;
}

/** Urutan sudut: TL, TR, BR, BL (lokal decal: -x/+y, +x/+y, +x/-y, -x/-y). */
export type MobileGizmoQuad = [
  MobileGizmoScreenPt,
  MobileGizmoScreenPt,
  MobileGizmoScreenPt,
  MobileGizmoScreenPt,
];

export interface MobileProjectedGizmo {
  center: MobileGizmoScreenPt;
  corners: MobileGizmoQuad;
  wPx: number;
  hPx: number;
  rotDeg: number;
  pxPerUnit: number;
}

/**
 * Pemetaan arah drag layar → sumbu X decal (port web `signXForSide`).
 * Sisi yang kameranya melihat dari arah +Z/+X terbalik (X layar berlawanan) → -1.
 */
export function signXForMobileSide(side: MobileDecalSide): 1 | -1 {
  return side === 'back' ||
    side === 'hood' ||
    side === 'right_sleeve' ||
    side === 'side_right'
    ? -1
    : 1;
}

/**
 * Pecah skala uniform menjadi sumbu X/Y sesuai aspek cetak (port web,
 * rumus lama tak berubah).
 */
export function splitMobileDecalScale(scale: number, aspectRatio: number): { scaleX: number; scaleY: number } {
  let scaleX = scale;
  let scaleY = scale;
  if (aspectRatio >= 1) {
    scaleY = scaleX / aspectRatio;
  } else {
    scaleX = scaleX * aspectRatio;
  }
  return { scaleX, scaleY };
}

/** Dot-product normal permukaan vs arah ke kamera (port web). */
export function mobileFacingDot(surfaceNormal: THREE.Vector3, toCamera: THREE.Vector3): number {
  return surfaceNormal.dot(toCamera);
}

/** Lolos occlusion test bila dot >= 0.05 (port web). */
export function mobileIsFacingCamera(dot: number): boolean {
  return dot >= MOBILE_GIZMO_OCCLUSION_MIN_DOT;
}

/**
 * Jepit + snap magnetik tengah — SATU-SATUNYA jalan clamp posisi
 * (delegasi penuh ke `clampMobileDecalXY`, tanpa rumus batas lokal).
 *
 * DIVERGENSI vs web (disengaja): hanya sumbu X yang di-snap (tol 0.008,
 * semantik DecalGizmoMobile lama); sumbu Y bebas agar geser vertikal
 * presisi-cm tak menempel tiba-tiba di tengah.
 */
export function applySnapAndClampMobile(
  side: MobileDecalSide,
  rawX: number,
  rawY: number,
  tolX: number = MOBILE_GIZMO_SNAP_X
): { x: number; y: number; snapX: boolean } {
  const jepit = clampMobileDecalXY(side, rawX, rawY);
  const snapX = Math.abs(jepit.x) <= tolX;
  return {
    x: snapX ? 0 : jepit.x,
    y: jepit.y,
    snapX,
  };
}

/**
 * Proyeksikan pusat + 4 sudut decal ke piksel layar via `vector.project(camera)`
 * (port web `projectGizmoQuad` 1:1 — mobile punya three).
 */
export function projectMobileGizmoQuad(
  center3D: THREE.Vector3,
  totalQuat: THREE.Quaternion,
  halfX: number,
  halfY: number,
  localSpanX: number,
  camera: THREE.Camera,
  viewWidth: number,
  viewHeight: number
): MobileProjectedGizmo {
  const toPx = (v: THREE.Vector3): MobileGizmoScreenPt => {
    const p = v.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * viewWidth,
      y: (-(p.y * 0.5) + 0.5) * viewHeight,
    };
  };

  const offsets: Array<[number, number]> = [
    [-halfX, halfY], // TL
    [halfX, halfY], // TR
    [halfX, -halfY], // BR
    [-halfX, -halfY], // BL
  ];
  const center = toPx(center3D);
  const corners = offsets.map(([ox, oy]) => {
    const w = center3D.clone().add(new THREE.Vector3(ox, oy, 0).applyQuaternion(totalQuat));
    return toPx(w);
  }) as MobileGizmoQuad;

  const [tl, tr, bl] = [corners[0]!, corners[1]!, corners[3]!];
  const wPx = Math.max(32, Math.round(Math.hypot(tr.x - tl.x, tr.y - tl.y)));
  const hPx = Math.max(32, Math.round(Math.hypot(bl.x - tl.x, bl.y - tl.y)));
  const rotDeg = Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * (180 / Math.PI));
  const pxPerUnit = Math.max(10, wPx / Math.max(0.01, localSpanX));

  return { center, corners, wPx, hPx, rotDeg, pxPerUnit };
}

/**
 * Skala berikutnya dari gestur cubit (rasio jarak jari ke pusat).
 * Batas atas/bawah DISUNTIK (`mobileMaxDecalScaleUnits` +
 * `MOBILE_MIN_DECAL_SCALE`) — helper ini hanya menghitung rasio
 * (port web `nextScaleFromDragRatio` 1:1).
 */
export function nextMobileScaleFromDragRatio(
  startDistPx: number,
  curDistPx: number,
  initialScale: number,
  minScale: number,
  maxScale: number
): number {
  const ratio = curDistPx / Math.max(10, startDistPx);
  return Math.max(minScale, Math.min(maxScale, initialScale * ratio));
}
