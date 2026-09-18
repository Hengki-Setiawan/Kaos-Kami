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

  console.log("Analyzing left sleeve (x < -0.16) along Y slices:");
  for (let y = 0.15; y >= -0.35; y -= 0.05) {
    const sliceVerts = [];
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      if (vx < -0.16 && Math.abs(vy - y) < 0.02) {
        sliceVerts.push({
          x: vx, y: vy, z: vz,
          nx: norm.getX(i), ny: norm.getY(i), nz: norm.getZ(i)
        });
      }
    }
    if (sliceVerts.length > 0) {
      const xs = sliceVerts.map(v => v.x);
      const zs = sliceVerts.map(v => v.z);
      const minX = Math.min(...xs); // most outer point on arm
      const maxX = Math.max(...xs); // most inner point near torso
      const avgZ = zs.reduce((a,b) => a + b, 0) / zs.length;
      const armCenter = (minX + maxX) / 2;
      const armRadius = (maxX - minX) / 2;

      // Find outer vertex
      const outerV = sliceVerts.reduce((prev, curr) => curr.x < prev.x ? curr : prev, sliceVerts[0]);

      console.log(`y=${y.toFixed(2)} | count=${sliceVerts.length} | armCenter=(${armCenter.toFixed(3)}, ${y.toFixed(2)}, ${avgZ.toFixed(3)}) | armRadius=${armRadius.toFixed(3)} | outerX=${minX.toFixed(3)} (norm: ${outerV.nx.toFixed(2)}, ${outerV.ny.toFixed(2)}, ${outerV.nz.toFixed(2)})`);
    }
  }
}

run().catch(console.error);
