import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function run() {
  const buf = fs.readFileSync("kaos-kami-web/public/models/hoodie-blue.glb");
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
  merged.scale(0.74, 0.74, 0.74);
  merged.center();
  merged.computeVertexNormals();

  const pos = merged.attributes.position;
  const norm = merged.attributes.normal;

  console.log("Hoodie with 0.74 scale:");
  for (let y = 0.35; y >= -0.35; y -= 0.05) {
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
      const outer = verts.reduce((prev, curr) => curr.x < prev.x ? curr : prev, verts[0]);
      console.log(`y=${y.toFixed(2).padStart(5)} | outerX=${outer.x.toFixed(3)} | z=${outer.z.toFixed(3)} | norm=(${outer.nx.toFixed(2)}, ${outer.ny.toFixed(2)}, ${outer.nz.toFixed(2)})`);
    }
  }
}

run().catch(console.error);
