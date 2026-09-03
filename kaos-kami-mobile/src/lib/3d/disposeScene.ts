import * as THREE from 'three';

/**
 * M3 — VRAM-safe disposal. Dipanggil saat studio unmount / ganti tab
 * agar geometri, material, dan tekstur keluar dari memori GPU HP.
 */
export function disposeSceneHierarchy(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      if (mesh.geometry) geometries.add(mesh.geometry as THREE.BufferGeometry);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        materials.add(m as THREE.Material);
        const rec = m as unknown as Record<string, unknown>;
        for (const key of Object.keys(rec)) {
          const v = rec[key];
          if (v instanceof THREE.Texture) textures.add(v);
        }
      }
    }
  });

  textures.forEach((t) => t.dispose());
  materials.forEach((m) => (m as THREE.Material).dispose());
  geometries.forEach((g) => g.dispose());
}
