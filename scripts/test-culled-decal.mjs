import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function createCulledDecalGeometry(mesh, pos, euler, size, minDot = 0.1) {
  const rawDecal = new DecalGeometry(mesh, pos, euler, size);
  const pAttr = rawDecal.attributes.position;
  const nAttr = rawDecal.attributes.normal;
  const uvAttr = rawDecal.attributes.uv;
  if (!pAttr) return rawDecal;

  const projMatrix = new THREE.Matrix4().makeRotationFromEuler(euler).setPosition(pos);
  const projInv = projMatrix.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

  const keptPositions = [];
  const keptNormals = [];
  const keptUvs = [];

  for (let i = 0; i < pAttr.count; i += 3) {
    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i+1), nAttr.getY(i+1), nAttr.getZ(i+1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i+2), nAttr.getY(i+2), nAttr.getZ(i+2)).applyMatrix3(normalMatrix).normalize();
    const avgNormZ = (n0.z + n1.z + n2.z) / 3;

    // Only keep faces that face TOWARDS the projector (avgNormZ > minDot)
    if (avgNormZ > minDot) {
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        keptPositions.push(pAttr.getX(idx), pAttr.getY(idx), pAttr.getZ(idx));
        keptNormals.push(nAttr.getX(idx), nAttr.getY(idx), nAttr.getZ(idx));
        keptUvs.push(uvAttr.getX(idx), uvAttr.getY(idx));
      }
    }
  }

  const culled = new THREE.BufferGeometry();
  culled.setAttribute("position", new THREE.Float32BufferAttribute(keptPositions, 3));
  culled.setAttribute("normal", new THREE.Float32BufferAttribute(keptNormals, 3));
  culled.setAttribute("uv", new THREE.Float32BufferAttribute(keptUvs, 2));
  return {
    rawCount: pAttr.count / 3,
    culledCount: keptPositions.length / 9,
    geometry: culled,
  };
}

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
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);

  // Test sleeve with current size (depth=0.225) vs tuned size (depth=0.08)
  const pos = new THREE.Vector3(-0.25, 0.035, 0);
  const euler = new THREE.Euler(1.5708, -1.2305, 1.5708, "XYZ");

  console.log("=== Testing Left Sleeve with Current Size (depth=0.225) ===");
  const res1 = createCulledDecalGeometry(mesh, pos, euler, new THREE.Vector3(0.08, 0.08, 0.225), 0.1);
  console.log(`Raw Triangles: ${res1.rawCount} -> Culled Triangles: ${res1.culledCount} (Culled ${res1.rawCount - res1.culledCount} backfaces)`);

  console.log("\n=== Testing Left Sleeve with Tuned Depth (depth=0.06) + Culling ===");
  const res2 = createCulledDecalGeometry(mesh, pos, euler, new THREE.Vector3(0.08, 0.08, 0.06), 0.1);
  console.log(`Raw Triangles: ${res2.rawCount} -> Culled Triangles: ${res2.culledCount} (Culled ${res2.rawCount - res2.culledCount} backfaces)`);

  console.log("\n=== Testing Front Near Sleeve (x=-0.12) with Culling ===");
  const posFront = new THREE.Vector3(-0.12, 0, 0.109);
  const eulerFront = new THREE.Euler(0, 0, 0);
  const res3 = createCulledDecalGeometry(mesh, posFront, eulerFront, new THREE.Vector3(0.14, 0.14, 0.12), 0.1);
  console.log(`Raw Triangles: ${res3.rawCount} -> Culled Triangles: ${res3.culledCount} (Culled ${res3.rawCount - res3.culledCount} backfaces)`);
}

run().catch(console.error);
