import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function measureAccurateTorso(name, path, scaleUp = 1) {
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

  // Let's find torso width at hem / lower waist (where arms are definitely not present)
  // For most shirts, hem is near box.min.y + 0.05
  const hemY = box.min.y + 0.05;
  const xsHem = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    if (Math.abs(y - hemY) < 0.03) {
      xsHem.push(x);
    }
  }
  xsHem.sort((a,b) => a - b);
  const hemWidth = xsHem.length ? (xsHem[xsHem.length - 1] - xsHem[0]) : 0;

  console.log(`\n=== ${name} ===`);
  console.log(`Total BBox: X=${(box.max.x - box.min.x).toFixed(4)}, Y=${(box.max.y - box.min.y).toFixed(4)}, Z=${(box.max.z - box.min.z).toFixed(4)}`);
  console.log(`Torso Width at Hem (min.y + 0.05): ${hemWidth.toFixed(4)} unit`);
}

async function run() {
  await measureAccurateTorso("tee-basic.glb", "kaos-kami-web/public/models/tee-basic.glb");
  await measureAccurateTorso("longsleeve.glb", "kaos-kami-web/public/models/longsleeve.glb");
  await measureAccurateTorso("sweater.glb (crewneck)", "kaos-kami-web/public/models/sweater.glb");
  await measureAccurateTorso("jacket.glb", "kaos-kami-web/public/models/jacket.glb");
}

run();
