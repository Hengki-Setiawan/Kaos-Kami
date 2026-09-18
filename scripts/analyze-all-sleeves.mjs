import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function analyzeApparel(name, path, scaleUp = 1) {
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

  console.log(`\n========================================`);
  console.log(`ANALYSIS: ${name}`);
  console.log(`========================================`);

  // Find left arm vertices
  const leftVerts = [];
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    if (vx < -0.15) {
      leftVerts.push({
        x: vx, y: vy, z: vz,
        nx: norm.getX(i), ny: norm.getY(i), nz: norm.getZ(i)
      });
    }
  }

  if (leftVerts.length === 0) {
    console.log("No left arm vertices found (x < -0.15).");
    return;
  }

  const ys = leftVerts.map(v => v.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  console.log(`Arm Y range: [${minY.toFixed(3)}, ${maxY.toFixed(3)}]`);

  // Test 5 slices from top to bottom
  const step = (maxY - minY) / 6;
  for (let stepIdx = 1; stepIdx <= 5; stepIdx++) {
    const yTarget = maxY - step * stepIdx;
    const sliceVerts = leftVerts.filter(v => Math.abs(v.y - yTarget) < step * 0.4);
    if (sliceVerts.length > 0) {
      const outerV = sliceVerts.reduce((prev, curr) => curr.x < prev.x ? curr : prev, sliceVerts[0]);
      const innerV = sliceVerts.reduce((prev, curr) => curr.x > prev.x ? curr : prev, sliceVerts[0]);
      const avgZ = sliceVerts.reduce((a, b) => a + b.z, 0) / sliceVerts.length;
      const armDiameter = innerV.x - outerV.x;
      console.log(`  Slice y=${yTarget.toFixed(3)} | outerX=${outerV.x.toFixed(3)} | innerX=${innerV.x.toFixed(3)} | diameter=${armDiameter.toFixed(3)} | outerNorm=(${outerV.nx.toFixed(2)}, ${outerV.ny.toFixed(2)}, ${outerV.nz.toFixed(2)})`);
    }
  }
}

async function run() {
  await analyzeApparel("T-Shirt (tee-basic.glb)", "kaos-kami-web/public/models/tee-basic.glb");
  await analyzeApparel("Longsleeve (longsleeve.glb)", "kaos-kami-web/public/models/longsleeve.glb");
  await analyzeApparel("Sweater (sweater.glb)", "kaos-kami-web/public/models/sweater.glb");
  await analyzeApparel("Hoodie (hoodie-blue.glb x26)", "kaos-kami-web/public/models/hoodie-blue.glb", 26);
  await analyzeApparel("Jacket (jacket.glb)", "kaos-kami-web/public/models/jacket.glb");
}

run().catch(console.error);
