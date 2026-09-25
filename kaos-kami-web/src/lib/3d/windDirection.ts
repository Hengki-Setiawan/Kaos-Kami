/**
 * Arah angin studio — konversi arah nominal ke vektor gerak udara.
 *
 * Konvensi (DEFINITIF, vektor = ARAH GERAK udara):
 * - 'front' → (0,0,-1): meniup dari depan ke belakang (normal dada = +Z,
 *   konsisten dengan proyektor decal depan di `scaleCalibration.ts` yang
 *   menghadap +Z).
 * - 'side' → (-1,0,0): kanan→kiri (cermin arah partikel existing).
 * - 'up' → (0,1,0): ke atas (melawan gravitasi, efek melambai).
 *
 * Modul MURNI (tanpa "use client", tanpa state).
 */

import * as THREE from "three";

export type WindDirection = "front" | "side" | "up";

/** Vektor ARAH GERAK udara ternormalisasi (selalu instance baru). */
export function windDirectionToVec(dir: WindDirection): THREE.Vector3 {
  switch (dir) {
    case "front":
      return new THREE.Vector3(0, 0, -1);
    case "side":
      return new THREE.Vector3(-1, 0, 0);
    case "up":
      return new THREE.Vector3(0, 1, 0);
  }
}

/**
 * Hembusan (gust) deterministik — 0.6 + 0.4·sin(1.7t)·sin(0.6t+1.3),
 * rentang [0.2, 1.0], TANPA random (frame yang sama → tiupan yang sama,
 * reproducible untuk uji visual & snapshot). Non-finite → 0.6 (tengah).
 */
export function WIND_GUST(t: number): number {
  if (!Number.isFinite(t)) return 0.6;
  return 0.6 + 0.4 * Math.sin(t * 1.7) * Math.sin(t * 0.6 + 1.3);
}
