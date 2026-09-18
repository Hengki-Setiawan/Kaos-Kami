import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function measureApparel(name, path, crownYOffset = -0.12) {
  const buf = fs.readFileSync(path);
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
  if (crownYOffset) merged.translate(0, crownYOffset, 0);
  merged.computeBoundingBox();

  const box = merged.boundingBox;
  console.log(`\n=== ${name} ===`);
  console.log(`BBox Min: [${box.min.x.toFixed(4)}, ${box.min.y.toFixed(4)}, ${box.min.z.toFixed(4)}]`);
  console.log(`BBox Max: [${box.max.x.toFixed(4)}, ${box.max.y.toFixed(4)}, ${box.max.z.toFixed(4)}]`);
  console.log(`BBox Size: X(width)=${(box.max.x - box.min.x).toFixed(4)}, Y(height)=${(box.max.y - box.min.y).toFixed(4)}, Z(depth)=${(box.max.z - box.min.z).toFixed(4)}`);

  // Measure Torso width at chest (Y between 0.0 and 0.10)
  const pos = merged.attributes.position;
  let minXChest = Infinity, maxXChest = -Infinity;
  let minXWaist = Infinity, maxXWaist = -Infinity;
  let minXHem = Infinity, maxXHem = -Infinity;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Front surface (z > 0.05)
    if (z > 0.05) {
      if (Math.abs(y - 0.02) < 0.03) {
        minXChest = Math.min(minXChest, x);
        maxXChest = Math.max(maxXChest, x);
      }
      if (Math.abs(y - (-0.15)) < 0.03) {
        minXWaist = Math.min(minXWaist, x);
        maxXWaist = Math.max(maxXWaist, x);
      }
      if (y < -0.40) {
        minXHem = Math.min(minXHem, x);
        maxXHem = Math.max(maxXHem, x);
      }
    }
  }

  console.log(`Front surface chest width (Y ≈ 0.02): ${(maxXChest - minXChest).toFixed(4)} unit [${minXChest.toFixed(4)}, ${maxXChest.toFixed(4)}]`);
  console.log(`Front surface waist width (Y ≈ -0.15): ${(maxXWaist - minXWaist).toFixed(4)} unit [${minXWaist.toFixed(4)}, ${maxXWaist.toFixed(4)}]`);
  console.log(`Front surface hem width   (Y < -0.40): ${(maxXHem - minXHem).toFixed(4)} unit [${minXHem.toFixed(4)}, ${maxXHem.toFixed(4)}]`);
}

async function run() {
  await measureApparel("tee-basic.glb", "kaos-kami-web/public/models/tee-basic.glb", -0.12);
  await measureApparel("longsleeve.glb", "kaos-kami-web/public/models/longsleeve.glb", -0.12);
}

run();
