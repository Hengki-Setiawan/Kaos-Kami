import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function run() {
  const buf = fs.readFileSync("kaos-kami-web/public/models/longsleeve.glb");
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
  merged.center();
  merged.computeVertexNormals();

  const pos = merged.attributes.position;
  const norm = merged.attributes.normal;

  console.log("Inspecting vertices on the left arm (x < -0.16):");
  const armVerts = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (x < -0.16) {
      armVerts.push({
        x, y, z,
        nx: norm.getX(i),
        ny: norm.getY(i),
        nz: norm.getZ(i),
      });
    }
  }

  console.log(`Found ${armVerts.length} vertices on left arm.`);
  // Find min/max X, Y, Z
  const xs = armVerts.map(v => v.x);
  const ys = armVerts.map(v => v.y);
  const zs = armVerts.map(v => v.z);
  console.log(`Left arm range: X=[${Math.min(...xs).toFixed(3)}, ${Math.max(...xs).toFixed(3)}], Y=[${Math.min(...ys).toFixed(3)}, ${Math.max(...ys).toFixed(3)}], Z=[${Math.min(...zs).toFixed(3)}, ${Math.max(...zs).toFixed(3)}]`);

  // Print a few sample vertices and normals around the outer side of the arm
  const outerVerts = armVerts.filter(v => v.x < -0.22).slice(0, 10);
  console.log("\nSample outer sleeve vertices & normals:");
  for (const v of outerVerts) {
    console.log(`pos: (${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})  norm: (${v.nx.toFixed(3)}, ${v.ny.toFixed(3)}, ${v.nz.toFixed(3)})`);
  }
}

run().catch(console.error);
