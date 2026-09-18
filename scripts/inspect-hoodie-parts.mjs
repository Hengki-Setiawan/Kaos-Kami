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

async function inspectHoodieParts() {
  const gltf = await loadGLB("kaos-kami-web/public/models/hoodie-blue.glb");
  gltf.scene.updateMatrixWorld(true);

  console.log("=== HOODIE-BLUE SUB-MESHES ===");
  gltf.scene.traverse(child => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      const b = child.geometry.boundingBox;
      const sizeX = b.max.x - b.min.x;
      const sizeY = b.max.y - b.min.y;
      const sizeZ = b.max.z - b.min.z;
      const centerY = (b.max.y + b.min.y) / 2;
      const centerZ = (b.max.z + b.min.z) / 2;
      console.log(`Mesh: "${child.name}" | vertices=${child.geometry.attributes.position.count} | bounds Y=[${b.min.y.toFixed(2)}, ${b.max.y.toFixed(2)}] Z=[${b.min.z.toFixed(2)}, ${b.max.z.toFixed(2)}] centerY=${centerY.toFixed(2)} centerZ=${centerZ.toFixed(2)}`);
    }
  });
}

inspectHoodieParts();
