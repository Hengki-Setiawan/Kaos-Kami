import * as THREE from 'three';
import { getProceduralWeaveTexture, getMobileRoughnessMap, type MobileWeaveProfile } from './clothMaterialMobile';

export type FabricArchetype = 'HEAVYWEIGHT_TEE' | 'FRENCH_TERRY' | 'TECH_CANVAS' | 'RIBBED_KNIT';

interface ArchetypeSpec {
  roughness: number;
  roughnessDark: number;
  sheen: number;
  sheenDark: number;
  sheenRoughness: number;
  sheenRoughnessDark: number;
  normalScale: number;
  normalScaleDark: number;
  bumpScale: number;
  metalness: number;
  weave: MobileWeaveProfile;
}

/**
 * M-fabric mobile §4.5 — CERMIN WEB (kaos-kami-web/src/lib/materials/
 * clothPhysicalMaterial.ts, switch archetype tshirt/hoodie/jacket).
 * Setiap angka di bawah = salinan nilai web-terang/gelap per 11 Sep 2026;
 * bila web berubah, ubah sini juga (sumber kebenaran = web). Fisis tiap
 * arketipe lihat komentar web — diringkas: jersey tipis halus-lemas,
 * fleece tebal kasar-berbulu (sheen maks 1.0 + bump 1.5×), kanvas kaku
 * kalis (relief minimal + metalness 0.02 sintetis).
 * Perbedaan SADAR vs web (bukan drift): anisotropy peta 4 (web 8, hemat
 * sampler HP) dan tak ada lapisan foto cotton-jersey (hemat VRAM/download
 * HP) — prosedural per-profil satu-satunya pembawa rasa di mobile.
 * BATAS/REVERT/UJI per angka: lihat komentar web (normalScale ≤0.60,
 * bump ≤0.005; uji zoom 50%/100%/200% + putar miring di HP DPR 1;
 * revert = nilai M3 lama di bawah tiap baris bila shimmer).
 */
const ARCHETYPES: Record<FabricArchetype, ArchetypeSpec> = {
  // CERMIN WEB tshirt-terang/gelap (lama: rough 0.9 / sheen 0.6 / sheenR 0.55 / ns 0.12).
  HEAVYWEIGHT_TEE: {
    roughness: 0.9, roughnessDark: 0.93,
    sheen: 0.85, sheenDark: 0.2, // lama 0.6: terlalu matte, peach-fuzz hilang → plastik
    sheenRoughness: 0.65, sheenRoughnessDark: 0.85,
    normalScale: 0.46, normalScaleDark: 0.38, // lama 0.12: anyaman tenggelam total
    bumpScale: 0.0022, metalness: 0.0, weave: 'tshirt',
  },
  // CERMIN WEB hoodie (lama: rough 0.95 / sheen 1.0 / sheenR 0.7 / ns 0.18).
  FRENCH_TERRY: {
    roughness: 0.94, roughnessDark: 0.95,
    sheen: 1.0, sheenDark: 0.25, // fisik maks (clamp ≤1 seperti web A2)
    sheenRoughness: 0.85, sheenRoughnessDark: 0.85, // lama 0.7: bulu fleece sebar lebar
    normalScale: 0.52, normalScaleDark: 0.4, // lipatan besar amp-18 butuh penguat ini
    bumpScale: 0.0032, metalness: 0.0, weave: 'hoodie', // butir SAMA terbaca kasar
  },
  // CERMIN WEB jacket (lama: rough 0.7 / sheen 0.25 / sheenR 0.4 / ns 0.08).
  TECH_CANVAS: {
    roughness: 0.68, roughnessDark: 0.76,
    sheen: 0.35, sheenDark: 0.15,
    sheenRoughness: 0.4, sheenRoughnessDark: 0.4,
    normalScale: 0.38, normalScaleDark: 0.34, // SENGAJA terkecil: tekukan sharpen sudah kuat
    bumpScale: 0.0015, metalness: 0.02, weave: 'jacket', // kilau sintetis (CERMIN WEB)
  },
  // CERMIN WEB longsleeve = jersey seperti kaos (lama: rough 0.88 / sheen 0.8 / ns 0.15).
  RIBBED_KNIT: {
    roughness: 0.9, roughnessDark: 0.93,
    sheen: 0.85, sheenDark: 0.2,
    sheenRoughness: 0.65, sheenRoughnessDark: 0.85,
    normalScale: 0.46, normalScaleDark: 0.38,
    bumpScale: 0.0022, metalness: 0.0, weave: 'tshirt',
  },
};

// Tint sheen terang per arketipe — CERMIN WEB (hangat katun / netral fleece /
// dingin sintetis). JANGAN disamakan jadi abu-abu: tint inilah yang menjual
// "katun" vs "nilon" di grazing angle. Revert: '#8a8a8a' dkk (nilai M3 lama).
const LIGHT_SHEEN_TINT: Record<FabricArchetype, string> = {
  HEAVYWEIGHT_TEE: '#ffe8dc',
  FRENCH_TERRY: '#f5ebe6',
  TECH_CANVAS: '#d0d8e0',
  RIBBED_KNIT: '#ffe8dc',
};

// Faktor sheenColor gelap per arketipe — CERMIN WEB (0.35/0.4/0.5).
// Fisis: sheen kain hitam HARUS berwarna hitam itu sendiri yang digelapkan
// (hamburan balik serat), bukan abu-abu netral — abu-abu = kabut susu yang
// "mencuci" hitam jadi charcoal. Revert: '#8a8a8a' dkk bila hitam kemerahan.
const DARK_SHEEN_FACTOR: Record<FabricArchetype, number> = {
  HEAVYWEIGHT_TEE: 0.35,
  FRENCH_TERRY: 0.4,
  TECH_CANVAS: 0.5,
  RIBBED_KNIT: 0.35,
};

export function apparelToArchetype(apparel: string): FabricArchetype {
  switch (apparel) {
    case 'hoodie':
    case 'crewneck':
    case 'sweater':
      // crewneck/sweater = fleece loopback 330/380 GSM (cermin web pricingEngine)
      // → FRENCH_TERRY sama seperti hoodie. Dipakai MobileSweaterModel
      // (mockup saja; JANGAN reuse mesh hoodie).
      return 'FRENCH_TERRY';
    case 'shirt':
      return 'TECH_CANVAS';
    case 'longsleeve':
      return 'RIBBED_KNIT';
    case 'cap':
    case 'pants':
    case 'shorts':
      // Celana coming-soon (pola pants): web tak punya arketipe celana
      // (tanpa spek fisik); denim/twill idealnya profil sendiri. Default
      // aman HEAVYWEIGHT_TEE (mockup-saja, orderable false).
      return 'HEAVYWEIGHT_TEE';
    case 'tshirt':
    default:
      return 'HEAVYWEIGHT_TEE';
  }
}

// ROUGH_MAP_MEAN mobile = 0.92 (CERMIN WEB — mean peta getMobileRoughnessMap
// ≈235/255; kompensasi identik agar tengah efektif = target).
const M_ROUGH_MAP_MEAN = 0.92;

export function createClothPhysicalMaterial(
  baseColor: string,
  archetype: FabricArchetype = 'HEAVYWEIGHT_TEE'
): THREE.MeshPhysicalMaterial {
  const spec = ARCHETYPES[archetype];
  const color = new THREE.Color(baseColor);
  // Deteksi gelap CERMIN WEB (luminance < 0.16 → jalur anti-cuci).
  const luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
  const isDark = luminance < 0.16;
  // Kain hitam: sheen = warna dasar × faktor (tetap pekat); kain terang:
  // tint hangat/dingin per bahan. UJI: varian hitam pekat di studio —
  // harus tetap pekat (Obsidian) di semua sudut, bukan abu susu.
  const sheenColor = isDark
    ? color.clone().multiplyScalar(DARK_SHEEN_FACTOR[archetype])
    : new THREE.Color(LIGHT_SHEEN_TINT[archetype]);
  const roughnessTarget = isDark ? spec.roughnessDark : spec.roughness;
  const roughMap = getMobileRoughnessMap();

  return new THREE.MeshPhysicalMaterial({
    color,
    // Kompensasi mean CERMIN WEB (tengah efektif = target; clamp 1).
    roughness: Math.min(1, roughnessTarget / M_ROUGH_MAP_MEAN),
    roughnessMap: roughMap,
    bumpMap: roughMap, // satu tekstur dua peran (CERMIN WEB)
    bumpScale: spec.bumpScale,
    metalness: spec.metalness,
    sheen: Math.min(1, isDark ? spec.sheenDark : spec.sheen), // clamp fisik (CERMIN WEB A2)
    sheenRoughness: isDark ? spec.sheenRoughnessDark : spec.sheenRoughness,
    sheenColor,
    normalMap: getProceduralWeaveTexture(spec.weave),
    normalScale: new THREE.Vector2(
      isDark ? spec.normalScaleDark : spec.normalScale,
      isDark ? spec.normalScaleDark : spec.normalScale
    ),
    side: THREE.DoubleSide,
  });
}
