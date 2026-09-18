import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

  const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  if (scaleUp !== 1) merged.scale(scaleUp, scaleUp, scaleUp);
  merged.center();
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);
  return mesh;
}

function testDecal(name, mesh, pos, euler, size) {
  const decalGeom = new DecalGeometry(mesh, pos, euler, size);
  const pAttr = decalGeom.attributes.position;
  const nAttr = decalGeom.attributes.normal;
  if (!pAttr) {
    console.log(`[${name}] No decal geometry generated.`);
    return;
  }

  const projMatrix = new THREE.Matrix4().makeRotationFromEuler(euler).setPosition(pos);
  const projInv = projMatrix.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

  let frontCount = 0;
  let backCount = 0;

  for (let i = 0; i < pAttr.count; i += 3) {
    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i+1), nAttr.getY(i+1), nAttr.getZ(i+1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i+2), nAttr.getY(i+2), nAttr.getZ(i+2)).applyMatrix3(normalMatrix).normalize();
    const avgNormZ = (n0.z + n1.z + n2.z) / 3;

    if (avgNormZ > 0) {
      frontCount++;
    } else {
      backCount++;
    }
  }

  const total = pAttr.count / 3;
  const backPercent = ((backCount / total) * 100).toFixed(1);
  console.log(`[${name}] Total: ${total} tris | Front: ${frontCount} | Back (BLEED): ${backCount} (${backPercent}%)`);
}

async function run() {
  const tee = await loadMesh("kaos-kami-web/public/models/tee-basic.glb");
  const longsleeve = await loadMesh("kaos-kami-web/public/models/longsleeve.glb");
  const hoodie = await loadMesh("kaos-kami-web/public/models/hoodie-blue.glb", 26);

  console.log("\n=== 1. TEE-BASIC ===");
  testDecal("Tee Front Center", tee, new THREE.Vector3(0, 0, 0.109), new THREE.Euler(0, 0, 0), new THREE.Vector3(0.18, 0.18, 0.40));
  testDecal("Tee Front Left Chest (x=-0.10)", tee, new THREE.Vector3(-0.10, 0.05, 0.109), new THREE.Euler(0, 0, 0), new THREE.Vector3(0.12, 0.12, 0.40));
  testDecal("Tee Left Sleeve", tee, new THREE.Vector3(-0.25, 0.035, 0), new THREE.Euler(1.5708, -1.2305, 1.5708), new THREE.Vector3(0.08, 0.08, 0.225));

  console.log("\n=== 2. LONGSLEEVE ===");
  testDecal("Longsleeve Front Center", longsleeve, new THREE.Vector3(0, 0, 0.109), new THREE.Euler(0, 0, 0), new THREE.Vector3(0.18, 0.18, 0.40));
  testDecal("Longsleeve Front Near Sleeve (x=-0.12)", longsleeve, new THREE.Vector3(-0.12, 0, 0.109), new THREE.Euler(0, 0, 0), new THREE.Vector3(0.14, 0.14, 0.40));
  testDecal("Longsleeve Left Sleeve Mid", longsleeve, new THREE.Vector3(-0.25, 0.035, 0), new THREE.Euler(1.5708, -1.2305, 1.5708), new THREE.Vector3(0.08, 0.08, 0.225));
  testDecal("Longsleeve Left Sleeve Cuff", longsleeve, new THREE.Vector3(-0.257, -0.03, -0.02), new THREE.Euler(1.5708, -1.2305, 1.5708), new THREE.Vector3(0.08, 0.08, 0.225));

  console.log("\n=== 3. HOODIE ===");
  testDecal("Hoodie Front Center", hoodie, new THREE.Vector3(0, 0, 0.13), new THREE.Euler(0, 0, 0), new THREE.Vector3(0.18, 0.18, 0.40));
  testDecal("Hoodie Left Sleeve", hoodie, new THREE.Vector3(-0.25, 0.035, 0), new THREE.Euler(1.5708, -1.2305, 1.5708), new THREE.Vector3(0.08, 0.08, 0.225));
}

run().catch(console.error);
