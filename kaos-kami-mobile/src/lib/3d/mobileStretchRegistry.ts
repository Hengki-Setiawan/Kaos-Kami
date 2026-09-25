"use client";

import type * as THREE from 'three';

/**
 * F3 Test Lab — registry grup apparel untuk MobileStretchController REF-BASED.
 * Renderer (generik/sweater/cap) mendaftarkan groupRef-nya di sini; controller
 * menulis group.scale LANGSUNG di useFrame (tanpa set-store per-frame = hemat
 * baterai) dan commit store hanya saat pointerup/preset/slider.
 * Selama drag, store TIDAK berubah → renderer tak re-render → tak ada fight
 * antara prop scale reaktif (slider/preset) dan tulis-langsung (drag/spring).
 */
const groups = new Set<THREE.Group>();

export function registerMobileStretchGroup(g: THREE.Group | null): void {
  try {
    if (g) groups.add(g);
  } catch {}
}

export function unregisterMobileStretchGroup(g: THREE.Group | null): void {
  try {
    if (g) groups.delete(g);
  } catch {}
}

/** Tulis skala stretch ke SEMUA grup terdaftar (dipakai controller useFrame). */
export function writeMobileStretchScale(sx: number, sy: number, sz: number): void {
  try {
    for (const g of groups) {
      try {
        // Basis renderer = 1.4 uniform (lihat Mobile*Model group scale).
        g.scale.set(1.4 * sx, 1.4 * sy, 1.4 * sz);
      } catch {}
    }
  } catch {}
}
