import fs from "fs";

global.self = global;
global.window = global;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function loadGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

async function inspect(label, file) {
  console.log(`\n========================================`);
  console.log(`[${label}] ${file}`);
  try {
    const gltf = await loadGLB(file);
    gltf.scene.updateMatrixWorld(true);

    const geoms = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        console.log(`  Mesh: "${child.name}" | vertices=${child.geometry.attributes.position?.count} | mat="${child.material?.name}"`);
        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        geoms.push(cloned);
      }
    });

    if (geoms.length > 0) {
      const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
      if (merged) {
        merged.center();
        merged.computeBoundingBox();
        const b = merged.boundingBox;
        console.log(`  Bounds: X=${(b.max.x - b.min.x).toFixed(3)}, Y=${(b.max.y - b.min.y).toFixed(3)}, Z=${(b.max.z - b.min.z).toFixed(3)}`);
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

async function main() {
  await inspect("fleece-alt", "Asset 3D/arsip-mobile/fleece-alt.glb");
  await inspect("hoodie-flat", "Asset 3D/arsip-mobile/hoodie-flat.glb");
  await inspect("hoodie.optimized", "Asset 3D/arsip-mobile/hoodie.optimized.glb");
  await inspect("tee-alt", "Asset 3D/arsip-mobile/tee-alt.glb");
  await inspect("t_shirt (funlab117)", "Asset 3D/sketchfab/t_shirt.glb");
}

main();
