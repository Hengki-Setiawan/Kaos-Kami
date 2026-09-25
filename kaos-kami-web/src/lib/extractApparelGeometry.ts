import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ensureWindAndStretchWeights, ensureBoxUV } from "./geometryPrep";

export interface ExtractGeometryOptions {
  scaleMultiplier?: number;
  crownYOffset?: number;
}

/**
 * Standardized Apparel Geometry Extractor for Kaos Kami:
 * 1. Traverses scene to collect all meshes.
 * 2. Applies child.matrixWorld to each geometry clone so Sketchfab node
 *    rotations (e.g. -90 deg X-axis) and scales are properly baked in.
 * 3. Merges multi-part meshes (e.g. Coach Jacket with 10 parts) into a single buffer geometry.
 * 4. Centers the geometry so origin is at the center of the apparel.
 * 5. Computes vertex normals, box UVs, and wind displacement weights.
 */
export function extractApparelGeometry(
  scene: THREE.Group | THREE.Object3D,
  options?: ExtractGeometryOptions
): THREE.BufferGeometry | null {
  if (!scene) return null;
  scene.updateMatrixWorld(true);

  const geoms: THREE.BufferGeometry[] = [];
  scene.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      const tang = cloned.getAttribute("tangent");
      const posAttr = cloned.getAttribute("position");
      if (tang && posAttr && tang.count !== posAttr.count) {
        cloned.deleteAttribute("tangent");
      }
      geoms.push(cloned);
    }
  });

  if (geoms.length === 0) return null;

  try {
    let merged: THREE.BufferGeometry | null = null;
    if (geoms.length === 1) {
      merged = geoms[0] ?? null;
    } else {
      merged = BufferGeometryUtils.mergeGeometries(geoms, false) ?? null;
      for (const g of geoms) {
        try {
          g.dispose();
        } catch {}
      }
    }

    if (!merged) return null;

    if (options?.scaleMultiplier && options.scaleMultiplier !== 1.0) {
      merged.scale(options.scaleMultiplier, options.scaleMultiplier, options.scaleMultiplier);
    }

    merged.center();

    if (options?.crownYOffset) {
      merged.translate(0, options.crownYOffset, 0);
    }

    merged.computeVertexNormals();
    // SATU pass: bobot wind + bobot stretch uji-tarik (geometryPrep).
    ensureWindAndStretchWeights(merged);
    ensureBoxUV(merged);

    return merged;
  } catch (err) {
    console.error("[kaos-kami] Failed to extract apparel geometry:", err);
    return null;
  }
}
