import fs from "fs";
import path from "path";

global.self = global;
global.window = global;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function loadGLBBuffer(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

async function testJacket(name, filePath) {
  console.log(`\n========================================`);
  console.log(`Testing ${name}: ${filePath}`);
  try {
    const gltf = await loadGLBBuffer(filePath);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    const geoms = [];
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        console.log(`  Found mesh: "${child.name}", vertices=${child.geometry.attributes.position.count}, hasNormal=${!!child.geometry.attributes.normal}, hasUV=${!!child.geometry.attributes.uv}`);
        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        geoms.push(cloned);
      }
    });

    const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
    if (!merged) {
      console.log(`  FAILED to merge geometries!`);
      return;
    }
    merged.center();
    merged.computeVertexNormals();
    merged.computeBoundingBox();
    const box = merged.boundingBox;
    console.log(`  Merged successfully! Vertices: ${merged.attributes.position.count}`);
    console.log(`  BoundingBox: size = [${(box.max.x - box.min.x).toFixed(3)}, ${(box.max.y - box.min.y).toFixed(3)}, ${(box.max.z - box.min.z).toFixed(3)}]`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
}

async function main() {
  await testJacket("jacket.glb (public)", "kaos-kami-web/public/models/jacket.glb");
  await testJacket("bomber_jacket.glb (sketchfab)", "Asset 3D/sketchfab/bomber_jacket.glb");
  await testJacket("wind_breaker_jacket.glb (sketchfab)", "Asset 3D/sketchfab/wind_breaker_jacket.glb");
  await testJacket("jacket_varsity.glb (sketchfab)", "Asset 3D/sketchfab/jacket_varsity.glb");
  await testJacket("fleece_jacket.glb (sketchfab)", "Asset 3D/sketchfab/fleece_jacket.glb");
  await testJacket("sweater.glb (public)", "kaos-kami-web/public/models/sweater.glb");
  await testJacket("longsleeve.glb (public)", "kaos-kami-web/public/models/longsleeve.glb");
  await testJacket("tee-basic.glb (public)", "kaos-kami-web/public/models/tee-basic.glb");
}

main();
