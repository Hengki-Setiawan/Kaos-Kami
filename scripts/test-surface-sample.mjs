import fs from "fs";
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

async function sampleSurface(name, path, scaleMul, crownY) {
  console.log(`\n=== Sampling Surface for ${name} ===`);
  const gltf = await loadGLB(path);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  const geoms = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      geoms.push(cloned);
    }
  });

  const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  merged.scale(scaleMul, scaleMul, scaleMul);
  merged.center();
  if (crownY) merged.translate(0, crownY, 0);

  const pos = merged.attributes.position;
  // Sample front vertices (z > 0) near chest: y in [-0.05, 0.10]
  // at different X positions: x ~ 0 (center), x ~ 0.08 (left/right chest), x ~ 0.18 (near rib)
  const xBands = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
  for (const xb of xBands) {
    let maxZ = -999;
    let minZ = 999;
    let count = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = Math.abs(pos.getX(i));
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(x - xb) < 0.025 && y >= -0.05 && y <= 0.05) {
        if (z > 0 && z > maxZ) maxZ = z;
        if (z < 0 && z < minZ) minZ = z;
        count++;
      }
    }
    console.log(`X ~ ${xb.toFixed(2)}: front maxZ = ${maxZ.toFixed(3)}, back minZ = ${minZ.toFixed(3)}, thickness = ${(maxZ - minZ).toFixed(3)}, points=${count}`);
  }
}

async function run() {
  await sampleSurface("jacket", "kaos-kami-web/public/models/jacket.glb", 0.52, -0.075);
  await sampleSurface("tee-basic", "kaos-kami-web/public/models/tee-basic.glb", 0.72, -0.12);
}

run();
