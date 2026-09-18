import fs from "fs";

global.self = global;
global.window = global;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function loadGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

async function inspect(label, file) {
  console.log(`\n=== ${label}: ${file} ===`);
  const gltf = await loadGLB(file);
  gltf.scene.traverse(child => {
    if (child.isMesh) {
      console.log(`  Mesh: "${child.name}" | vertices: ${child.geometry.attributes.position.count} | mat: "${child.material?.name}"`);
    }
  });
}

async function main() {
  await inspect("hoodie-blue.glb", "kaos-kami-web/public/models/hoodie-blue.glb");
  await inspect("premium_eco_hoodie.glb", "Asset 3D/sketchfab/premium_eco_hoodie.glb");
  await inspect("hoodie.glb (sketchfab)", "Asset 3D/sketchfab/hoodie.glb");
  await inspect("fleece_jacket.glb", "Asset 3D/sketchfab/fleece_jacket.glb");
  await inspect("bomber_jacket.glb", "Asset 3D/sketchfab/bomber_jacket.glb");
  await inspect("wind_breaker_jacket.glb", "Asset 3D/sketchfab/wind_breaker_jacket.glb");
}

main();
