import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function filterBackfaces(geometry, position, orientation, minDot = 0.05) {
  const pAttr = geometry.attributes.position;
  const nAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;
  if (!pAttr || !nAttr || !uvAttr || pAttr.count === 0) return geometry;

  const projMatrix = new THREE.Matrix4().makeRotationFromEuler(orientation).setPosition(position);
  const projInv = projMatrix.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

  const keptPos = [];
  const keptNorm = [];
  const keptUv = [];

  for (let i = 0; i < pAttr.count; i += 3) {
    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i + 1), nAttr.getY(i + 1), nAttr.getZ(i + 1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i + 2), nAttr.getY(i + 2), nAttr.getZ(i + 2)).applyMatrix3(normalMatrix).normalize();
    const avgZ = (n0.z + n1.z + n2.z) / 3;

    if (avgZ > minDot) {
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        keptPos.push(pAttr.getX(idx), pAttr.getY(idx), pAttr.getZ(idx));
        keptNorm.push(nAttr.getX(idx), nAttr.getY(idx), nAttr.getZ(idx));
        keptUv.push(uvAttr.getX(idx), uvAttr.getY(idx));
      }
    }
  }

  geometry.dispose();

  const cleanGeom = new THREE.BufferGeometry();
  cleanGeom.setAttribute("position", new THREE.Float32BufferAttribute(keptPos, 3));
  cleanGeom.setAttribute("normal", new THREE.Float32BufferAttribute(keptNorm, 3));
  cleanGeom.setAttribute("uv", new THREE.Float32BufferAttribute(keptUv, 2));
  return cleanGeom;
}

async function loadMesh(path, scaleUp = 1) {
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
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);
  return mesh;
}

async function testSide(name, path, anchorX, scaleUp = 1) {
  const mesh = await loadMesh(path, scaleUp);
  console.log(`\n=== Testing Side Decals for ${name} ===`);
  const testCases = [
    { label: "Side Left Rib (y=0, z=0)", pos: [-anchorX, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { label: "Side Left Low (y=-0.2, z=0)", pos: [-anchorX, -0.2, 0], rot: [0, -Math.PI / 2, 0] },
    { label: "Side Right Rib (y=0, z=0)", pos: [anchorX, 0, 0], rot: [0, Math.PI / 2, 0] },
    { label: "Side Right Low (y=-0.2, z=0)", pos: [anchorX, -0.2, 0], rot: [0, Math.PI / 2, 0] },
  ];

  for (const tc of testCases) {
    const pos = new THREE.Vector3(...tc.pos);
    const euler = new THREE.Euler(...tc.rot);
    const size = new THREE.Vector3(0.12, 0.12, 0.09); // 9cm shallow depth

    const raw = new DecalGeometry(mesh, pos, euler, size);
    const clean = filterBackfaces(raw, pos, euler, 0.05);
    const cleanCount = clean.attributes.position ? clean.attributes.position.count / 3 : 0;
    const rawCount = raw.attributes.position ? raw.attributes.position.count / 3 : 0;
    console.log(`[${tc.label.padEnd(30)}] Raw: ${rawCount} | Clean: ${cleanCount} | Culled: ${rawCount - cleanCount}`);
  }
}

async function run() {
  await testSide("T-Shirt", "kaos-kami-web/public/models/tee-basic.glb", 0.185);
  await testSide("Longsleeve", "kaos-kami-web/public/models/longsleeve.glb", 0.185);
  await testSide("Pants", "kaos-kami-web/public/models/pants.glb", 0.185);
}

run().catch(console.error);
