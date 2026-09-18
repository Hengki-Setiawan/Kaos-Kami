import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function measureOne(name, path, scaleUp = 1) {
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
  if (scaleUp !== 1) merged.scale(scaleUp, scaleUp, scaleUp);
  merged.center();
  merged.computeBoundingBox();
  const box = merged.boundingBox;
  const pos = merged.attributes.position;

  // Measure Torso width at chest (near y = 0)
  const xsChest = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(y) < 0.04 && Math.abs(z) < 0.15) {
      xsChest.push(x);
    }
  }
  xsChest.sort((a,b) => a - b);
  const chestSpan = xsChest.length ? (xsChest[xsChest.length - 1] - xsChest[0]) : (box.max.x - box.min.x);

  console.log(`\n=== ${name} ===`);
  console.log(`Total BBox Size: X=${(box.max.x - box.min.x).toFixed(4)}, Y=${(box.max.y - box.min.y).toFixed(4)}, Z=${(box.max.z - box.min.z).toFixed(4)}`);
  console.log(`Torso Chest Width (y ≈ 0): ${chestSpan.toFixed(4)} unit`);
}

async function run() {
  await measureOne("tee-basic.glb", "kaos-kami-web/public/models/tee-basic.glb");
  await measureOne("longsleeve.glb", "kaos-kami-web/public/models/longsleeve.glb");
  await measureOne("sweater.glb (crewneck)", "kaos-kami-web/public/models/sweater.glb");
  await measureOne("hoodie-blue.glb (hoodie ×26)", "kaos-kami-web/public/models/hoodie-blue.glb", 26);
  await measureOne("jacket.glb", "kaos-kami-web/public/models/jacket.glb");
}

run();
