import * as THREE from 'three';
import { getProceduralWeaveTexture } from './clothMaterialMobile';

export type FabricArchetype = 'HEAVYWEIGHT_TEE' | 'FRENCH_TERRY' | 'TECH_CANVAS' | 'RIBBED_KNIT';

interface ArchetypeSpec {
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: string;
  normalScale: number;
}

/**
 * M3 §4.5 — 4 arketipe bahan fisik (MeshPhysicalMaterial + sheen kain).
 * Dipetakan dari jenis apparel agar hoodie/jacket terlihat berbeda dari kaos.
 */
const ARCHETYPES: Record<FabricArchetype, ArchetypeSpec> = {
  HEAVYWEIGHT_TEE: { roughness: 0.9, sheen: 0.6, sheenRoughness: 0.55, sheenColor: '#8a8a8a', normalScale: 0.12 },
  FRENCH_TERRY: { roughness: 0.95, sheen: 1.0, sheenRoughness: 0.7, sheenColor: '#a5a5a5', normalScale: 0.18 },
  TECH_CANVAS: { roughness: 0.7, sheen: 0.25, sheenRoughness: 0.4, sheenColor: '#6f6f6f', normalScale: 0.08 },
  RIBBED_KNIT: { roughness: 0.88, sheen: 0.8, sheenRoughness: 0.6, sheenColor: '#9a9a9a', normalScale: 0.15 },
};

export function apparelToArchetype(apparel: string): FabricArchetype {
  switch (apparel) {
    case 'hoodie':
      return 'FRENCH_TERRY';
    case 'jacket':
      return 'TECH_CANVAS';
    case 'longsleeve':
      return 'RIBBED_KNIT';
    case 'tshirt':
    default:
      return 'HEAVYWEIGHT_TEE';
  }
}

export function createClothPhysicalMaterial(
  baseColor: string,
  archetype: FabricArchetype = 'HEAVYWEIGHT_TEE'
): THREE.MeshPhysicalMaterial {
  const spec = ARCHETYPES[archetype];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    roughness: spec.roughness,
    metalness: 0.0,
    sheen: spec.sheen,
    sheenRoughness: spec.sheenRoughness,
    sheenColor: new THREE.Color(spec.sheenColor),
    normalMap: getProceduralWeaveTexture(),
    normalScale: new THREE.Vector2(spec.normalScale, spec.normalScale),
    side: THREE.DoubleSide,
  });
}
