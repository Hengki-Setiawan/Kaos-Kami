import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function measureArm(name, path, scaleUp = 1) {
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

  // Left arm vertices (x < -0.15)
  let minX = 0, minY = 0, minZ = 0;
  let maxX = -999, maxY = -999, maxZ = -999;
  let cuffVerts = [];
  let shoulderVerts = [];

  // Find extreme points
  let mostNegativeX = 0;
  let mostNegativeXVert = null;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (x < mostNegativeX) {
      mostNegativeX = x;
      mostNegativeXVert = { x, y, z };
    }
    if (x < -0.15) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  // Find cuff (vertices near minimum Y or minimum X on the left arm)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (x < -0.15) {
      // Near cuff (tip of sleeve)
      if (Math.hypot(x - mostNegativeXVert.x, y - mostNegativeXVert.y) < 0.05) {
        cuffVerts.push({ x, y, z });
      }
      // Near shoulder seam (around x = -0.17 to -0.19, y > 0.08)
      if (x > -0.20 && x < -0.16 && y > 0.08) {
        shoulderVerts.push({ x, y, z });
      }
    }
  }

  const avgCuff = {
    x: cuffVerts.reduce((s, v) => s + v.x, 0) / (cuffVerts.length || 1),
    y: cuffVerts.reduce((s, v) => s + v.y, 0) / (cuffVerts.length || 1),
    z: cuffVerts.reduce((s, v) => s + v.z, 0) / (cuffVerts.length || 1),
  };
  const avgShoulder = {
    x: shoulderVerts.reduce((s, v) => s + v.x, 0) / (shoulderVerts.length || 1),
    y: shoulderVerts.reduce((s, v) => s + v.y, 0) / (shoulderVerts.length || 1),
    z: shoulderVerts.reduce((s, v) => s + v.z, 0) / (shoulderVerts.length || 1),
  };

  // Arm vector and slope angle
  const armVec = new THREE.Vector3(avgCuff.x - avgShoulder.x, avgCuff.y - avgShoulder.y, avgCuff.z - avgShoulder.z);
  const armLength = armVec.length();
  const armAngleDeg = Math.atan2(armVec.y, armVec.x) * (180 / Math.PI);

  console.log(`\n================== ${name} ==================`);
  console.log(`Left Arm Extents: X=[${minX.toFixed(3)}, ${maxX.toFixed(3)}], Y=[${minY.toFixed(3)}, ${maxY.toFixed(3)}], Z=[${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`);
  console.log(`Shoulder Seam Center: (${avgShoulder.x.toFixed(3)}, ${avgShoulder.y.toFixed(3)}, ${avgShoulder.z.toFixed(3)})`);
  console.log(`Cuff / Sleeve Tip Center: (${avgCuff.x.toFixed(3)}, ${avgCuff.y.toFixed(3)}, ${avgCuff.z.toFixed(3)})`);
  console.log(`Arm Length: ${armLength.toFixed(3)} unit, Arm Angle: ${armAngleDeg.toFixed(1)}°`);
}

async function run() {
  await measureArm("Tee Basic (Short Sleeve)", "kaos-kami-web/public/models/tee-basic.glb");
  await measureArm("Longsleeve", "kaos-kami-web/public/models/longsleeve.glb");
  await measureArm("Sweater (Crewneck)", "kaos-kami-web/public/models/sweater.glb");
  await measureArm("Hoodie", "kaos-kami-web/public/models/hoodie-blue.glb", 26);
  await measureArm("Jacket", "kaos-kami-web/public/models/jacket.glb");
}

run().catch(console.error);
