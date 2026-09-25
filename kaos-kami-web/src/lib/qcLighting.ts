/**
 * QC lighting — preset cahaya raking untuk inspeksi cacat sablon DTF.
 *
 * Modul MURNI (tanpa "use client", tanpa state): matematika vektor +
 * konstanta label industri Bahasa Indonesia. Aman diimpor komponen client
 * maupun server (three hanya dipakai sebagai tipe+Vector3).
 */

import * as THREE from "three";
import type { DecalTargetSide } from "./constants";

/** Satu preset sudut grazing QC. `deg` = sudut dari PERMUKAAN kain. */
export interface QcGrazingPreset {
  id: string;
  deg: number;
  /** Label industri Bahasa Indonesia (tampil di UI QC). */
  label: string;
}

export const QC_GRAZING_PRESETS: QcGrazingPreset[] = [
  { id: "g15", deg: 15, label: "Raking 15° — kupas cacat permukaan" },
  { id: "g30", deg: 30, label: "Raking 30° — serat & cracking" },
  { id: "g45", deg: 45, label: "Raking 45° — noda & misprint" },
  { id: "diffuse", deg: 90, label: "Difus 90° — warna jujur" },
];

/**
 * Offset posisi lampu dari titik inspeksi untuk sudut grazing tertentu.
 * Konvensi: normal permukaan = +Z, sudut grazing diukur DARI permukaan
 * (0° = sejajar kain, 90° = tegak lurus = difus). `azimuthDeg` = arah
 * horizontal dari sumbu +X (default 90 = dari atas/+Y).
 */
export function grazingToOffset(
  grazingDeg: number,
  dist: number = 1.6,
  azimuthDeg: number = 90
): THREE.Vector3 {
  const g = Number.isFinite(grazingDeg) ? Math.max(0, Math.min(90, grazingDeg)) : 90;
  const d = Number.isFinite(dist) && dist > 0 ? dist : 1.6;
  const a = Number.isFinite(azimuthDeg) ? (azimuthDeg * Math.PI) / 180 : Math.PI / 2;
  const gr = (g * Math.PI) / 180;
  const horiz = Math.cos(gr) * d;
  return new THREE.Vector3(horiz * Math.cos(a), horiz * Math.sin(a), Math.sin(gr) * d);
}

/**
 * Estimasi iluminansi (lux) dari intensitas lampu titik (candela):
 * E ≈ I / d², dikalibrasi ke booth QC workshop — intensitas 7.2 pada
 * jarak 1.6 m ≈ 1500 lux (standar inspeksi cetak).
 *
 * CATATAN: "estimasi virtual" — BUKAN hasil lux-meter; hanya untuk
 * menyetarakan preset lampu 3D dengan kondisi booth nyata.
 */
export function estimateLux(intensityCd: number, distM: number = 1.6): number {
  const I = Number.isFinite(intensityCd) ? Math.max(0, intensityCd) : 0;
  const d = Number.isFinite(distM) && distM > 0 ? distM : 1.6;
  // Faktor kalibrasi booth: 1500 / (7.2 / 1.6²) ≈ 533.33.
  const BOOTH_K = 1500 / (7.2 / (1.6 * 1.6));
  return Math.round(BOOTH_K * (I / (d * d)));
}

/** Kode cacat QC sablon (nilai stabil untuk job ticket & kanban). */
export const QC_DEFECTS = ["lubang", "noda", "misprint", "cracking"] as const;

export type QcDefect = (typeof QC_DEFECTS)[number];

/** Label industri Bahasa Indonesia per kode cacat. */
export const QC_DEFECT_LABELS: Record<QcDefect, string> = {
  lubang: "Lubang / Bolong",
  noda: "Noda",
  misprint: "Sablon Miring / Geser (Misprint)",
  cracking: "Sablon Retak (Cracking)",
};

/** Sisi garmen yang diinspeksi = sisi target sablon (SSOT `constants.ts`). */
export type QcSide = DecalTargetSide;
