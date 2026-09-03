"use client";

import * as THREE from "three";
import { createFabricNormalMap } from "@/lib/proceduralTextures";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";

export type FabricArchetype = "tshirt" | "longsleeve" | "hoodie" | "jacket";

export interface ClothMaterialOptions {
  archetype: FabricArchetype;
  color: string;
  isWireframe?: boolean;
  isMultiPart?: boolean;
  materialFinish?: string;
  windStrength?: number;
}

let cachedNormalMap: THREE.CanvasTexture | null = null;

function getNormalMap(): THREE.CanvasTexture {
  if (!cachedNormalMap && typeof window !== "undefined") {
    cachedNormalMap = createFabricNormalMap();
  }
  return cachedNormalMap as THREE.CanvasTexture;
}

/**
 * Factory untuk menghasilkan MeshPhysicalMaterial yang meniru fisika serat kain asli:
 * - Menghilangkan efek plastik/karet kaku
 * - Menggunakan Sheen (pantulan bulu mikro peach fuzz di grazing angles)
 * - Menerapkan micro-weave normal bump map
 * - Mengatur roughness difus khas katun tebal 240/280 GSM, fleece 380 GSM, dan ripstop jacket
 */
export function createClothPhysicalMaterial(options: ClothMaterialOptions): THREE.MeshPhysicalMaterial {
  const {
    archetype,
    color,
    isWireframe = false,
    isMultiPart = false,
    materialFinish = "standard",
    windStrength = 0,
  } = options;

  const baseColor = isMultiPart ? new THREE.Color(0xffffff) : new THREE.Color(color);
  // Hitung luminance warna dasar untuk menentukan perilaku pantulan optik
  const luminance = baseColor.r * 0.299 + baseColor.g * 0.587 + baseColor.b * 0.114;
  const isDarkColor = luminance < 0.16;

  let roughness = 0.90;
  let metalness = 0.0;
  let sheen = 0.85;
  let sheenRoughness = 0.65;
  // Untuk warna hitam/gelap: gunakan pendaran velvet gelap agar hitam tetap pekat (Obsidian Black)
  // dan TIDAK tercuci menjadi abu-abu susu.
  let sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.4) : new THREE.Color(0xffe8dc);
  let clearcoat = 0.0;
  let clearcoatRoughness = 0.0;
  let normalScaleValue = 0.15; // Halus, tanpa moire

  switch (archetype) {
    case "tshirt":
    case "longsleeve":
      // Heavyweight 240 / 280 GSM Long-Staple Combed Cotton
      roughness = isDarkColor ? 0.93 : materialFinish === "acid-wash" ? 0.85 : 0.90;
      sheen = isDarkColor ? 0.20 : 0.85;
      sheenRoughness = isDarkColor ? 0.85 : 0.65;
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.35) : new THREE.Color(0xffe8dc);
      normalScaleValue = isDarkColor ? 0.12 : 0.16;
      break;

    case "hoodie":
      // Heavy French Terry & Fleece 380 GSM
      roughness = isDarkColor ? 0.95 : 0.94; // Sangat difus, menyerap cahaya
      sheen = isDarkColor ? 0.25 : 1.15;
      sheenRoughness = 0.80;
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.4) : new THREE.Color(0xf5ebe6);
      normalScaleValue = isDarkColor ? 0.14 : 0.20;
      break;

    case "jacket":
      // Tactical Streetwear Poplin / Ripstop Nylon
      roughness = isDarkColor ? 0.76 : 0.68;
      metalness = 0.02; // Kilau sintetis technical jacket
      sheen = isDarkColor ? 0.15 : 0.35;
      sheenRoughness = 0.40;
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.5) : new THREE.Color(0xd0d8e0);
      clearcoat = 0.10; // Efek lapisan water-repellent DWR
      clearcoatRoughness = 0.35;
      normalScaleValue = 0.12;
      break;
  }

  const normalMap = getNormalMap();

  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness,
    metalness,
    sheen,
    sheenRoughness,
    sheenColor,
    clearcoat,
    clearcoatRoughness,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
    vertexColors: isMultiPart,
    normalMap: normalMap || null,
    normalScale: new THREE.Vector2(normalScaleValue, normalScaleValue),
  });

  if (windStrength > 0) {
    try {
      applyWindToMaterial(mat, windStrength);
    } catch {}
  }

  return mat;
}
