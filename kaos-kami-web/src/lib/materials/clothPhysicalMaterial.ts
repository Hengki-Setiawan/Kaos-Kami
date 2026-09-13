"use client";

import * as THREE from "three";
import { getSharedFabricNormalMap, getFabricNormalMapForArchetype, getSharedFabricRoughnessMap } from "@/lib/proceduralTextures";
import { applyWindToMaterial } from "@/lib/shaders/windDisplacement";

export type FabricArchetype = "tshirt" | "longsleeve" | "hoodie" | "jacket";

export interface ClothMaterialOptions {
  archetype: FabricArchetype;
  color: string;
  isWireframe?: boolean;
  isMultiPart?: boolean;
  materialFinish?: string;
  windStrength?: number;
  // Tier-low HP: MeshStandardMaterial tanpa sheen/clearcoat (audit #25 —
  // physical penuh + sheen>1 bikin HP kentang ngos-ngosan).
  lowTier?: boolean;
}

let cachedNormalMap: THREE.CanvasTexture | null = null;

function getNormalMap(): THREE.CanvasTexture {
  // Singleton bersama (satu upload GPU untuk decal + tier-low hemat sampler).
  if (!cachedNormalMap && typeof window !== "undefined") {
    cachedNormalMap = getSharedFabricNormalMap();
  }
  return cachedNormalMap as THREE.CanvasTexture;
}

function getNormalMapForArchetype(archetype: FabricArchetype): THREE.CanvasTexture {
  // M-fabric: peta lipatan per-arketipe (kaos halus-rapat / hoodie besar-
  // lembut / jaket tegas-jarang — lihat FOLD_SPECS di proceduralTextures).
  // Cache per-profil (maks 3 upload, lazy). Tier-low SENGAJA tak lewat sini
  // (pakai singleton tshirt — hemat VRAM/sampler HP kentang).
  if (typeof window === "undefined") return getNormalMap();
  return getFabricNormalMapForArchetype(archetype);
}

// M2.7: mean peta noise ≈0.92 (lihat proceduralTextures) — bagi target agar
// nilai TENGAH efektif tetap = target meski roughnessMap terpasang.
const ROUGH_MAP_MEAN = 0.92;

// M-sisa (11 Sep 2026): lapisan FOTO cotton-jersey CC0 (Poly Haven,
// cotton_jersey — Rico Cilliers/colormass, CC0; 1K→512px q85-90, ±62KB)
// DI ATAS prosedural, bukan ganti total: foto menyumbang normal makro-knit +
// roughness; weave/bump mikro prosedural TETAP (bumpMap) + tetap jadi fallback
// bila foto belum terkonfirmasi/gagal + satu-satunya peta di tier-low (hemat
// sampler/VRAM HP). Repeat foto 3 (makro) vs weave 9 (mikro) agar tak moire
// ganda. Mean roughness foto TERUKUR 0.80 (sharp stats) → kompensasi
// PHOTO_ROUGH_MEAN agar tengah efektif ≈ target (clamp 1).
const PHOTO_NORMAL_URL = "/textures/cotton-jersey-nor_gl_512.jpg";
const PHOTO_ROUGH_URL = "/textures/cotton-jersey-rough_512.jpg";
const PHOTO_ROUGH_MEAN = 0.8;
const PHOTO_REPEAT = 3;

let photoNormalTex: THREE.Texture | null = null;
let photoRoughTex: THREE.Texture | null = null;
let photoMapsConfirmed = false;

function stylePhotoTexture(tex: THREE.Texture): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PHOTO_REPEAT, PHOTO_REPEAT);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace; // data-map linear (seperti prosedural)
  tex.anisotropy = 4;
  return tex;
}

// PERF #9: TANPA HEAD probe (hemat 2 round-trip + kebal HEAD diblokir CDN).
// Preload PRIORITAS via TextureLoader langsung saat modul dimuat; foto dipakai
// HANYA setelah KEDUA onLoad sukses — gagal/404/offline = DIAM prosedural
// murni (tanpa console error, tanpa peta blank, tanpa mesh gelap).
if (typeof window !== "undefined") {
  try {
    const loader = new THREE.TextureLoader();
    let normalOk = false;
    let roughOk = false;
    const tryConfirm = () => {
      if (normalOk && roughOk && photoNormalTex && photoRoughTex) photoMapsConfirmed = true;
    };
    photoNormalTex = stylePhotoTexture(
      loader.load(
        PHOTO_NORMAL_URL,
        () => {
          normalOk = true;
          tryConfirm();
        },
        undefined,
        () => {
          /* diam — prosedural tetap tampil */
        }
      )
    );
    photoRoughTex = stylePhotoTexture(
      loader.load(
        PHOTO_ROUGH_URL,
        () => {
          roughOk = true;
          tryConfirm();
        },
        undefined,
        () => {
          /* diam — prosedural tetap tampil */
        }
      )
    );
  } catch {
    // Abaikan — prosedural tetap tampil (fail-safe IBL-style).
  }
}

function getPhotoMaps(): { normal: THREE.Texture | null; rough: THREE.Texture | null } {
  if (!photoMapsConfirmed) return { normal: null, rough: null };
  return { normal: photoNormalTex, rough: photoRoughTex };
}

/**
 * Factory untuk menghasilkan MeshPhysicalMaterial yang meniru fisika serat kain asli:
 * - Menghilangkan efek plastik/karet kaku
 * - Menggunakan Sheen (pantulan bulu mikro peach fuzz di grazing angles)
 * - Menerapkan micro-weave normal bump map
 * - Mengatur roughness difus khas katun tebal 240/280 GSM, fleece 380 GSM, dan ripstop jacket
 */
export function createClothPhysicalMaterial(options: ClothMaterialOptions): THREE.MeshStandardMaterial {
  const {
    archetype,
    color,
    isWireframe = false,
    isMultiPart = false,
    materialFinish = "standard",
    windStrength = 0,
    lowTier = false,
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
  // M-fabric: normalScale 0.38–0.52 terang / 0.34–0.40 gelap (dulu
  // 0.30–0.42 — anyaman tenggelam, terasa plastik). Dipasangkan dengan weave
  // repeat 10: relief ±13/255 × scale ini ≈ kemiringan semu yang terbaca di
  // grazing angle tanpa emboss kartun. BATAS AMAN: 0.60 — di atas itu tepi
  // highlight bergerigi + moire balik walau repeat aman. REVERT/UJI (manual,
  // HP DPR 1, zoom 50%/100%/200% + putar miring): turunkan per-arketipe
  // −0.05 sampai shimmer hilang; bila masih shimmer, turunkan repeat peta
  // 10→9 dulu (lihat proceduralTextures), JANGAN matikan normalMap.
  let normalScaleValue = 0.46;
  // M-fabric: bump mikro per-arketipe (satu roughnessMap, tiga cara baca).
  // Fisis: fleece hoodie berbulu tebal → relief butir harus TERBACA kasar
  // (1.5× kaos); kanvas jaket tenun rapat kalis → relief kecil halus.
  // BATAS: >0.005 relief jadi emboss kartun (bantal). REVERT: 0.002 semua.
  // UJI: zoom 200% area highlight — butir harus pasir, bukan kawah.
  let bumpScaleValue = 0.0022;
  // M2.1: pantulan IBL per kain — kaos 0.35–0.55, hitam pekat 0.25 (tak tercuci),
  // jaket sintetis 0.6–0.7. Tanpa Environment (tier-low) nilai ini no-op.
  let envMapIntensityValue = 0.45;

  switch (archetype) {
    case "tshirt":
    case "longsleeve":
      // Heavyweight 240 / 280 GSM Long-Staple Combed Cotton — jersey tipis
      // drape lemas: lipatan halus rapat datang dari peta profil "tshirt".
      roughness = isDarkColor ? 0.93 : 0.90;
      sheen = isDarkColor ? 0.20 : 0.85;
      sheenRoughness = isDarkColor ? 0.85 : 0.65;
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.35) : new THREE.Color(0xffe8dc);
      normalScaleValue = isDarkColor ? 0.38 : 0.46; // 0.32/0.38→0.38/0.46: anyaman 140 loop butuh scale ini agar terbaca (revert −0.05)
      bumpScaleValue = 0.0022; // baseline butir katun (revert 0.002)
      envMapIntensityValue = isDarkColor ? 0.25 : 0.45;
      break;

    case "hoodie":
      // Heavy French Terry & Fleece 380 GSM — tebal berbulu: relief + sheen
      // paling kuat dari semua arketipe (maksimal yang masih fisik: sheen≤1).
      roughness = isDarkColor ? 0.95 : 0.94; // Sangat difus, menyerap cahaya
      // A2: sheen sumber di-clamp ≤1 (dulu 1.15 — di luar rentang fisik sheen).
      sheen = isDarkColor ? 0.25 : 1.0;
      sheenRoughness = 0.85; // 0.80→0.85: bulu fleece menyebar pantulan grazing lebih lebar (revert 0.80)
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.4) : new THREE.Color(0xf5ebe6);
      normalScaleValue = isDarkColor ? 0.40 : 0.52; // 0.34/0.42→0.40/0.52: lipatan besar amp-18 butuh penguat ini (revert −0.05)
      bumpScaleValue = 0.0032; // 1.5× kaos: butir roughness SAMA terbaca kasar seperti bulu fleece (revert 0.002)
      envMapIntensityValue = isDarkColor ? 0.30 : 0.50;
      break;

    case "jacket":
      // Tactical Streetwear Poplin / Ripstop Nylon — kanvas kaku tenun rapat:
      // lipatan tegas jarang (profil "jacket" + sharpen), permukaan kalis.
      roughness = isDarkColor ? 0.76 : 0.68;
      metalness = 0.02; // Kilau sintetis technical jacket
      sheen = isDarkColor ? 0.15 : 0.35;
      sheenRoughness = 0.40;
      sheenColor = isDarkColor ? baseColor.clone().multiplyScalar(0.5) : new THREE.Color(0xd0d8e0);
      clearcoat = 0.10; // Efek lapisan water-repellent DWR
      clearcoatRoughness = 0.35;
      normalScaleValue = isDarkColor ? 0.34 : 0.38; // 0.30/0.32→0.34/0.38: SENGAJA paling kecil — tekukan sharpen amp-20 sudah kuat, scale besar jadi kartun (revert −0.05)
      bumpScaleValue = 0.0015; // tenun rapat kalis: relief mikro minimal (revert 0.002)
      envMapIntensityValue = isDarkColor ? 0.60 : 0.70;
      break;
  }

  const normalMap = getNormalMap();
  // M-fabric: mid/high pakai peta lipatan per-arketipe (tshirt/hoodie/jacket)
  // agar drape tiap bahan beda rasa; tier-low + decal tetap singleton tshirt
  // (hemat sampler/VRAM — matte polos + weave dasar masih terbaca).
  const foldNormalMap = !lowTier && typeof window !== "undefined" ? getNormalMapForArchetype(archetype) : normalMap;
  // M-fabric: roughnessMap noise ±0.09–0.12 + bump per-arketipe (satu
  // tekstur, dua peran). Tier-low SKIP keduanya (hemat VRAM/sampler HP
  // kentang — matte polos). UJI/REVERT: lihat proceduralTextures.
  const microDetail = !lowTier && typeof window !== "undefined" ? getSharedFabricRoughnessMap() : null;
  // M-sisa: foto cotton-jersey (normal makro + roughness) HANYA mid/high dan
  // HANYA bila preload prioritas sukses (PERF #9, tanpa HEAD); bump mikro
  // prosedural tetap dipakai bersama foto (dua skala: makro 3× + mikro 9×).
  const photo = !lowTier ? getPhotoMaps() : { normal: null, rough: null };
  const usePhoto = !!(photo.normal && photo.rough);
  // Foto cotton-jersey (bila preload sukses) menimpa normal makro — tapi
  // lipatan per-arketipe (foldNormalMap) TETAP dipakai sebagai bump kedua?
  // TIDAK: satu slot normalMap. Prioritas: foto (knit makro foto-real) >
  // prosedural per-arketipe > singleton. Bump mikro prosedural (di bawah)
  // selalu hidup sehingga rasa anyaman tak hilang saat foto aktif.
  const activeNormalMap = usePhoto ? photo.normal : foldNormalMap;
  const activeRoughMap = usePhoto ? photo.rough : microDetail;

  // Tier-low: standard material (sheen/clearcoat dimatikan total).
  if (lowTier) {
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: Math.min(1, roughness),
      metalness,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
      vertexColors: isMultiPart,
      normalMap: normalMap || null,
      normalScale: new THREE.Vector2(normalScaleValue, normalScaleValue),
    });
    // M2.1: ikut tier — tanpa IBL nilai ini no-op, tapi siap bila tier naik.
    mat.envMapIntensity = envMapIntensityValue;
    if (windStrength > 0) {
      try {
        applyWindToMaterial(mat as any, windStrength);
      } catch {}
    }
    return mat;
  }

  // Sheen tak boleh >1 (audit #25 + A2 — sumber sudah ≤1, clamp ini pertahanan lapis-dua).
  const safeSheen = Math.min(1, sheen);
  // Kompensasi mean peta roughness aktif: prosedural 0.92, foto 0.80 —
  // agar nilai TENGAH efektif tetap = target (trade-off jujur: target >0.80
  // dengan foto → tengah efektif 0.80, sedikit lebih hidup; tier-low tak
  // berubah karena prosedural murni).
  const roughMean = usePhoto ? PHOTO_ROUGH_MEAN : ROUGH_MAP_MEAN;
  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    // M2.7: kompensasi mean roughnessMap agar tengah efektif = target.
    roughness: activeRoughMap ? Math.min(1, roughness / roughMean) : roughness,
    roughnessMap: activeRoughMap,
    // M-fabric: bump mikro prosedural per-arketipe (lihat bumpScaleValue) —
    // dipertahankan walau foto aktif (lapisan ganda makro-foto + micro).
    bumpMap: microDetail,
    bumpScale: microDetail ? bumpScaleValue : 0,
    metalness,
    sheen: safeSheen,
    sheenRoughness,
    sheenColor,
    clearcoat,
    clearcoatRoughness,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
    vertexColors: isMultiPart,
    normalMap: activeNormalMap || null,
    normalScale: new THREE.Vector2(normalScaleValue, normalScaleValue),
  });
  // M2.1: pantulan IBL per kain (kaos 0.35–0.55 / hitam 0.25 / jaket 0.6–0.7).
  mat.envMapIntensity = envMapIntensityValue;

  if (windStrength > 0) {
    try {
      applyWindToMaterial(mat, windStrength);
    } catch {}
  }

  return mat;
}
