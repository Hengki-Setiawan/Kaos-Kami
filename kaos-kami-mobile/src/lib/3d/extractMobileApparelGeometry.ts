import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ensureWindWeights } from './windShader';

export interface ExtractMobileGeometryOptions {
  scaleMultiplier?: number;
  crownYOffset?: number;
}

/**
 * Memastikan mesh memiliki atribut UV box projection bila belum ada UV.
 */
export function ensureBoxUV(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute('uv')) return geo;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!pos || !nor) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const maxSide = Math.max(size.x, size.y, size.z, 1e-5);
  const uv = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    let u = 0;
    let v = 0;
    if (ax >= ay && ax >= az) {
      u = (p.z - bb.min.z) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    } else if (ay >= ax && ay >= az) {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.z - bb.min.z) / maxSide;
    } else {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * Standardized Apparel Geometry Extractor untuk Kaos Kami Mobile:
 * 1. Menjelajahi (traverse) scene untuk mengumpulkan seluruh mesh.
 * 2. Mengaplikasikan child.matrixWorld pada setiap geometry clone agar rotasi
 *    node Sketchfab (mis. -90° sumbu X) dan skala root terbakar (baked) secara tepat.
 * 3. Menggabungkan (merge) multi-part mesh menjadi single buffer geometry.
 * 4. Mengalikan scaleMultiplier bila didefinisikan (mis. 0.0125 untuk shorts.glb agar tidak meledak 32.5m).
 * 5. Menempatkan geometry tepat di origin (geo.center()).
 * 6. Menghitung vertex normals, box UV, dan wind displacement weights.
 */
export function extractMobileApparelGeometry(
  scene: THREE.Group | THREE.Object3D,
  options?: ExtractMobileGeometryOptions
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
    ensureWindWeights(merged);
    ensureBoxUV(merged);

    return merged;
  } catch (err) {
    console.error('[kaos-kami-mobile] Gagal mengekstrak geometri apparel:', err);
    return null;
  }
}
