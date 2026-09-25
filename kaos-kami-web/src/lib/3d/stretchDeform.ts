"use client";

/**
 * Stretch deform (uji tarik kain) — injeksi vertex-shader via onBeforeCompile.
 *
 * BUKTI POLA (wajib tiru):
 * - `src/lib/shaders/windDisplacement.ts` → pola onBeforeCompile: tambah
 *   uniforms + deklarasi di `#include <common>`, deformasi SETELAH
 *   `#include <begin_vertex>`, simpan shader ke `material.userData`.
 * - `src/components/3d/DecalLayerRenderer.tsx:213-224` → pola alpha-feather
 *   + `customProgramCacheKey`. `applyStretchToMaterial` di sini SENGAJA
 *   merantai (chain) `onBeforeCompile` & `customProgramCacheKey` yang sudah
 *   ada agar nantinya bisa digabung dengan alpha-feather decal tanpa
 *   saling menimpa (satu menimpa = feather hilang / deform hilang).
 *
 * BUKTI FISIKA (SSOT tidak langsung — CATATAN AUDIT):
 * - `src/lib/3d/stretchPhysics.ts` TIDAK mengekspor `U_MAX_ELONG` /
 *   `POISSON_EFF` (hanya `getStretchFactors`, diverifikasi Sep 2026).
 *   Default di sini DITURUNKAN dari angka fungsi tersebut:
 *   - regangan aksial maks horizontal = 0.38 → STRETCH_MAX_ELONG_DEFAULT.
 *   - kontraksi lateral 0.12 / aksial 0.38 ≈ 0.316 → POISSON_EFF_DEFAULT.
 *   Bila SSOT diekspor kelak, ganti kedua konstanta dengan import.
 *
 * BUKTI AMBANG MASK (unit 3D ruang mesh ternormalisasi):
 * - kerah/bahu y > 0.12 → dijepit (collarBaselineY apparel 0.155–0.31 di
 *   `scaleCalibration.ts`; 0.12 konservatif = di bawah kerah semua apparel).
 * - lengan |x| > 0.165 → 0 pada mode dada (≈ jahitan bahu `sleeveAnchorX`
 *   0.17 tshirt / 0.175 hoodie di `APPAREL_PHYSICAL_SPECS` — bukti ukur).
 */

import * as THREE from "three";
import { useMemo, useRef } from "react";

/** Regangan aksial maksimum (turunan `getStretchFactors` horizontal 0.38). */
export const STRETCH_MAX_ELONG_DEFAULT = 0.38;
/** Rasio Poisson efektif kain (0.12/0.38 ≈ 0.316 — turunan SSOT sama). */
export const STRETCH_POISSON_DEFAULT = 0.32;

/** Uniforms deformasi stretch — objek `{ value }` dibagi by-reference. */
export interface StretchUniforms {
  /** 0..1 intensitas tarikan (0 = tak ada deformasi). */
  uStretch: { value: number };
  /** Arah tarikan di bidang kain (XY lokal). */
  uStretchDir: { value: THREE.Vector2 };
  /** Pusat genggaman tarikan (XY lokal). */
  uStretchCenter: { value: THREE.Vector2 };
  /** Radius genggaman (normalisasi grip falloff). */
  uStretchRadius: { value: number };
  /** Regangan aksial maks (default turunan SSOT). */
  uMaxElong: { value: number };
  /** Rasio Poisson efektif (default turunan SSOT). */
  uPoisson: { value: number };
}

export interface StretchWeightOpts {
  /** 'chest' (default): mask lengan |x|>sleeveX → 0. 'full': seluruh mesh. */
  mode?: "chest" | "full";
  /** Batas jepit kerah/bahu (default 0.12 — bukti di header). */
  collarY?: number;
  /** Batas mask lengan (default 0.165 ≈ sleeveAnchorX — bukti di header). */
  sleeveX?: number;
  /** Lebar feather smoothstep di tiap batas (default 0.02). */
  feather?: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Tulis atribut float `aStretchW` per-vertex: 0 di kerah/bahu (y>collarY)
 * dan (mode dada) di lengan (|x|>sleeveX), 1 di area tarik, smoothstep
 * feather di perbatasan. Idempoten (bila atribut sudah ada → kembalikan).
 */
export function ensureStretchWeights(
  geo: THREE.BufferGeometry,
  opts: StretchWeightOpts = {}
): THREE.BufferGeometry {
  if (geo.getAttribute("aStretchW")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  const { mode = "chest", collarY = 0.12, sleeveX = 0.165, feather = 0.02 } = opts;
  const weights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 1 di bawah kerah → 0 di atas kerah (feather selebar `feather`).
    const collarFree = 1 - smoothstep(collarY, collarY + feather, y);
    // Mode dada: 1 di torso → 0 di lengan; mode full: seluruh mesh bebas.
    const sleeveFree =
      mode === "full" ? 1 : 1 - smoothstep(sleeveX, sleeveX + feather, Math.abs(x));
    weights[i] = collarFree * sleeveFree;
  }
  geo.setAttribute("aStretchW", new THREE.BufferAttribute(weights, 1));
  return geo;
}

/**
 * Injeksi deformasi stretch ke material standar/fisik via onBeforeCompile
 * SETELAH `#include <begin_vertex>` (pola `windDisplacement.ts`):
 * grip falloff `exp(-r²·1.5)` dari `uStretchCenter` (r ternormalisasi
 * `uStretchRadius`), elongasi aksial sepanjang `uStretchDir`, kontraksi
 * Poisson tegak lurus, dan penipisan Z (aproksimasi linier orde-1).
 *
 * Integrasi (pola `DecalLayerRenderer.tsx:213-224`): handler
 * `onBeforeCompile` / `customProgramCacheKey` yang sudah ada DIRANTAI
 * (bukan ditimpa) — suffix cache key: `stretch-v1`.
 * Uniforms dibagi by-reference sehingga update per-frame tanpa recompile.
 * Shader disimpan ke `mat.userData.stretchShader` (cermin
 * `userData.shader` pola wind).
 *
 * DEFENSIF: bila geometri TANPA atribut `aStretchW` (pemanggil lupa
 * `ensureStretchWeights`), WebGL membaca atribut tak-terikat sebagai 0 =
 * terjepit total (deform hilang diam-diam). Cegah dengan meneruskan `geo`
 * (opsional): otomatis di-ensure di sini. Tanpa `geo`, shader memakai
 * `aStretchW` apa adanya — selalu panggil `ensureStretchWeights` dulu
 * (atau `ensureWindAndStretchWeights` di `geometryPrep.ts`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShaderLike = any;

export function applyStretchToMaterial(
  mat: THREE.Material,
  uniforms: StretchUniforms,
  geo?: THREE.BufferGeometry
): THREE.Material {
  // Guard StrictMode/dev: effect setup ganda pada material yg sama = inject
  // ganda = deformasi 2×. Material baru (useMemo recreate) = objek baru Tanpa flag.
  if ((mat.userData as Record<string, unknown>).stretchInjected) return mat;
  (mat.userData as Record<string, unknown>).stretchInjected = true;
  if (geo && !geo.getAttribute("aStretchW")) ensureStretchWeights(geo);
  const prevOnBeforeCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = function (shader: ShaderLike, renderer: ShaderLike) {
    if (typeof prevOnBeforeCompile === "function") {
      prevOnBeforeCompile.call(mat, shader, renderer);
    }
    shader.uniforms.uStretch = uniforms.uStretch;
    shader.uniforms.uStretchDir = uniforms.uStretchDir;
    shader.uniforms.uStretchCenter = uniforms.uStretchCenter;
    shader.uniforms.uStretchRadius = uniforms.uStretchRadius;
    shader.uniforms.uMaxElong = uniforms.uMaxElong;
    shader.uniforms.uPoisson = uniforms.uPoisson;
    shader.vertexShader = String(shader.vertexShader).replace(
      "#include <common>",
      `#include <common>
uniform float uStretch;
uniform vec2 uStretchDir;
uniform vec2 uStretchCenter;
uniform float uStretchRadius;
uniform float uMaxElong;
uniform float uPoisson;
attribute float aStretchW;`
    );
    shader.vertexShader = String(shader.vertexShader).replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
{
  vec2 sDir = uStretchDir / max(length(uStretchDir), 1e-4);
  vec2 sRel = position.xy - uStretchCenter;
  float sDist = length(sRel);
  float sR = max(uStretchRadius, 1e-4);
  float sGrip = exp(-pow(sDist / sR, 2.0) * 1.5);
  float sW = aStretchW;
  float sAmp = uStretch * uMaxElong * sGrip * sW;
  float sAxial = dot(sRel, sDir);
  vec2 sPerp = vec2(-sDir.y, sDir.x);
  float sPerpCoord = dot(sRel, sPerp);
  transformed.xy += sDir * (sAxial * sAmp);
  transformed.xy -= sPerp * (sPerpCoord * sAmp * uPoisson);
  transformed.z *= (1.0 - sAmp * uPoisson * 0.25);
}`
    );
    (mat.userData as Record<string, unknown>).stretchShader = shader;
  };
  const prevCacheKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = function (this: THREE.Material) {
    const base =
      typeof prevCacheKey === "function" ? prevCacheKey.call(this) : "default";
    return `${base}-stretch-v1`;
  };
  mat.needsUpdate = true;
  return mat;
}

/**
 * Singleton uniforms BERSAMA kain+decal (satu objek untuk seluruh garmen aktif).
 * Kain dan decal WAJIB memakai objek ini (bukan hook per-komponen) agar deformasi
 * sinkron per-frame tanpa re-render: penulis tunggal = StretchPhysicsController.
 */
export const sharedStretchUniforms: StretchUniforms = {
  uStretch: { value: 0 },
  uStretchDir: { value: new THREE.Vector2(1, 0) },
  uStretchCenter: { value: new THREE.Vector2(0, 0) },
  uStretchRadius: { value: 0.25 },
  uMaxElong: { value: STRETCH_MAX_ELONG_DEFAULT },
  uPoisson: { value: STRETCH_POISSON_DEFAULT },
};

export interface StretchUniformsInit {
  stretch?: number;
  dir?: [number, number];
  center?: [number, number];
  radius?: number;
  maxElong?: number;
  poisson?: number;
}

/**
 * Hook uniforms stretch: dibuat SEKALI via `useMemo`, dipegang via `useRef`
 * (stabil antar render — mutasi `.value` per-frame tanpa re-render).
 */
export function useStretchUniforms(init: StretchUniformsInit = {}): StretchUniforms {
  const uniforms = useMemo<StretchUniforms>(
    () => ({
      uStretch: { value: init.stretch ?? 0 },
      uStretchDir: { value: new THREE.Vector2(init.dir?.[0] ?? 1, init.dir?.[1] ?? 0) },
      uStretchCenter: { value: new THREE.Vector2(init.center?.[0] ?? 0, init.center?.[1] ?? 0) },
      uStretchRadius: { value: init.radius ?? 0.25 },
      uMaxElong: { value: init.maxElong ?? STRETCH_MAX_ELONG_DEFAULT },
      uPoisson: { value: init.poisson ?? STRETCH_POISSON_DEFAULT },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const ref = useRef<StretchUniforms>(uniforms);
  return ref.current;
}
