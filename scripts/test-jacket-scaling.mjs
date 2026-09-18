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

function extractApparelGeometry(scene, options) {
  if (!scene) return null;
  scene.updateMatrixWorld(true);

  const geoms = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      geoms.push(cloned);
    }
  });

  if (geoms.length === 0) return null;

  let merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  if (!merged) return null;

  if (options?.scaleMultiplier && options.scaleMultiplier !== 1.0) {
    merged.scale(options.scaleMultiplier, options.scaleMultiplier, options.scaleMultiplier);
  }

  merged.center();

  if (options?.crownYOffset) {
    merged.translate(0, options.crownYOffset, 0);
  }

  merged.computeVertexNormals();
  return merged;
}

async function testJacket(name, file, scale) {
  console.log(`\n=== Testing: ${name} ===`);
  const gltf = await loadGLB(file);
  const geom = extractApparelGeometry(gltf.scene, { scaleMultiplier: scale });
  if (!geom) {
    console.log("Failed to extract!");
    return;
  }
  geom.computeBoundingBox();
  const b = geom.boundingBox;
  console.log(`Scale: ${scale}`);
  console.log(`Vertices: ${geom.attributes.position.count}`);
  console.log(`BoundingBox X: [${b.min.x.toFixed(3)}, ${b.max.x.toFixed(3)}] size = ${(b.max.x - b.min.x).toFixed(3)}m`);
  console.log(`BoundingBox Y: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}] size = ${(b.max.y - b.min.y).toFixed(3)}m`);
  console.log(`BoundingBox Z: [${b.min.z.toFixed(3)}, ${b.max.z.toFixed(3)}] size = ${(b.max.z - b.min.z).toFixed(3)}m`);
}

async function main() {
  // 1. Windbreaker jacket (kaos-kami-web/public/models/jacket.glb)
  // original size: 0.055m, so scale by 14.5 gives ~0.80m width
  await testJacket("Windbreaker (jacket.glb)", "kaos-kami-web/public/models/jacket.glb", 14.5);

  // 2. Bomber jacket (Asset 3D/sketchfab/bomber_jacket.glb)
  // original size: 712.5mm, so scale by 0.0011 gives ~0.78m width
  await testJacket("Bomber Jacket", "Asset 3D/sketchfab/bomber_jacket.glb", 0.0011);

  // 3. Varsity Jacket (Asset 3D/sketchfab/jacket_varsity.glb)
  await testJacket("Varsity Jacket", "Asset 3D/sketchfab/jacket_varsity.glb", 0.0006);

  // 4. Fleece Jacket (Asset 3D/sketchfab/fleece_jacket.glb)
  await testJacket("Fleece Jacket", "Asset 3D/sketchfab/fleece_jacket.glb", 0.4);
}

main();
