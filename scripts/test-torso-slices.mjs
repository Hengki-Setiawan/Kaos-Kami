import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function measureExactTorso() {
  const buf = fs.readFileSync("kaos-kami-web/public/models/tee-basic.glb");
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((res, rej) => loader.parse(ab, "", res, rej));
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
  merged.center();
  merged.computeBoundingBox();

  const pos = merged.attributes.position;
  // Let's find the width of the torso at various heights Y (centered space):
  // Note: Y spans from -0.5157 (hem) to +0.2757 (shoulders/collar)
  console.log("=== TORSO SLICE MEASUREMENTS (tee-basic.glb) ===");
  console.log("Full mesh bbox: min=" + JSON.stringify(merged.boundingBox.min) + " max=" + JSON.stringify(merged.boundingBox.max));
  
  for (let yTarget = -0.35; yTarget <= 0.20; yTarget += 0.05) {
    const xs = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(y - yTarget) < 0.015 && Math.abs(z) < 0.12) {
        xs.push(x);
      }
    }
    if (xs.length > 0) {
      xs.sort((a,b) => a - b);
      const minX = xs[0];
      const maxX = xs[xs.length - 1];
      const span = maxX - minX;
      console.log(`Y = ${yTarget.toFixed(2)}: X span = ${span.toFixed(4)} [${minX.toFixed(4)}, ${maxX.toFixed(4)}]`);
    }
  }
}

measureExactTorso();
