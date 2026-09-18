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

async function inspectModel(name, path) {
  console.log(`\n=== Inspecting ${name} (${path}) ===`);
  const gltf = await loadGLB(path);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  const geoms = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      const b = child.geometry.boundingBox;
      console.log(`Mesh: "${child.name}", bbox X: [${b.min.x.toFixed(3)}, ${b.max.x.toFixed(3)}], Y: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}], Z: [${b.min.z.toFixed(3)}, ${b.max.z.toFixed(3)}]`);
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      geoms.push(cloned);
    }
  });

  const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  merged.computeBoundingBox();
  console.log(`Merged bbox BEFORE center(): min=[${merged.boundingBox.min.x.toFixed(3)}, ${merged.boundingBox.min.y.toFixed(3)}, ${merged.boundingBox.min.z.toFixed(3)}], max=[${merged.boundingBox.max.x.toFixed(3)}, ${merged.boundingBox.max.y.toFixed(3)}, ${merged.boundingBox.max.z.toFixed(3)}]`);
  
  merged.center();
  console.log(`Merged bbox AFTER center(): min=[${merged.boundingBox.min.x.toFixed(3)}, ${merged.boundingBox.min.y.toFixed(3)}, ${merged.boundingBox.min.z.toFixed(3)}], max=[${merged.boundingBox.max.x.toFixed(3)}, ${merged.boundingBox.max.y.toFixed(3)}, ${merged.boundingBox.max.z.toFixed(3)}]`);
}

async function run() {
  await inspectModel("jacket", "kaos-kami-web/public/models/jacket.glb");
  await inspectModel("tee-basic", "kaos-kami-web/public/models/tee-basic.glb");
}

run();
