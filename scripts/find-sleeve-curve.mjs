import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function findOuterSleeve(name, path, scaleUp = 1) {
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

  const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
  if (scaleUp !== 1) merged.scale(scaleUp, scaleUp, scaleUp);
  merged.center();
  merged.computeVertexNormals();

  const pos = merged.attributes.position;
  const norm = merged.attributes.normal;

  console.log(`\n=== Finding Outer Sleeve for ${name} ===`);
  // Scan 10 Y-levels from +0.25 down to -0.35
  for (let y = 0.25; y >= -0.35; y -= 0.05) {
    const verts = [];
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      if (vx < -0.15 && Math.abs(vy - y) < 0.025) {
        verts.push({ x: vx, y: vy, z: vz, nx: norm.getX(i), ny: norm.getY(i), nz: norm.getZ(i) });
      }
    }
    if (verts.length > 0) {
      // Find most negative X
      const outer = verts.reduce((prev, curr) => curr.x < prev.x ? curr : prev, verts[0]);
      console.log(`y=${y.toFixed(2).padStart(5)} | outerX=${outer.x.toFixed(3)} | z=${outer.z.toFixed(3)} | norm=(${outer.nx.toFixed(2)}, ${outer.ny.toFixed(2)}, ${outer.nz.toFixed(2)})`);
    }
  }
}

async function run() {
  await findOuterSleeve("Sweater", "kaos-kami-web/public/models/sweater.glb");
  await findOuterSleeve("Hoodie", "kaos-kami-web/public/models/hoodie-blue.glb", 26);
}

run().catch(console.error);
