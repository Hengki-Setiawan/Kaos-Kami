import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Creates a clean decal geometry with strict backface culling.
 * Discards any face whose normal in projector space does not face towards the projector.
 */
function createCleanDecalGeometry(mesh, pos, euler, size, minDot = 0.08) {
  const rawDecal = new DecalGeometry(mesh, pos, euler, size);
  const pAttr = rawDecal.attributes.position;
  const nAttr = rawDecal.attributes.normal;
  const uvAttr = rawDecal.attributes.uv;
  if (!pAttr || pAttr.count === 0) return null;

  const projMatrix = new THREE.Matrix4().makeRotationFromEuler(euler).setPosition(pos);
  const projInv = projMatrix.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

  const keptPos = [];
  const keptNorm = [];
  const keptUv = [];

  for (let i = 0; i < pAttr.count; i += 3) {
    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i+1), nAttr.getY(i+1), nAttr.getZ(i+1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i+2), nAttr.getY(i+2), nAttr.getZ(i+2)).applyMatrix3(normalMatrix).normalize();
    const avgNormZ = (n0.z + n1.z + n2.z) / 3;

    // Normal in projector space must point towards +Z (towards projector)
    if (avgNormZ > minDot) {
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        keptPos.push(pAttr.getX(idx), pAttr.getY(idx), pAttr.getZ(idx));
        keptNorm.push(nAttr.getX(idx), nAttr.getY(idx), nAttr.getZ(idx));
        keptUv.push(uvAttr.getX(idx), uvAttr.getY(idx));
      }
    }
  }

  if (keptPos.length === 0) return null;

  const cleanGeom = new THREE.BufferGeometry();
  cleanGeom.setAttribute("position", new THREE.Float32BufferAttribute(keptPos, 3));
  cleanGeom.setAttribute("normal", new THREE.Float32BufferAttribute(keptNorm, 3));
  cleanGeom.setAttribute("uv", new THREE.Float32BufferAttribute(keptUv, 2));

  return {
    rawCount: pAttr.count / 3,
    cleanCount: keptPos.length / 9,
    backfacesCulled: (pAttr.count / 3) - (keptPos.length / 9),
    geometry: cleanGeom,
  };
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

  const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  if (scaleUp !== 1) merged.scale(scaleUp, scaleUp, scaleUp);
  merged.center();
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);
  return mesh;
}

// Empirical arm calibration table
const APPAREL_ARMS = {
  longsleeve: {
    shoulder: new THREE.Vector3(-0.183, 0.194, -0.035),
    cuff: new THREE.Vector3(-0.435, -0.320, -0.010),
    radius: 0.046,
    depth: 0.065,
  },
  tshirt: {
    shoulder: new THREE.Vector3(-0.183, 0.196, -0.036),
    cuff: new THREE.Vector3(-0.340, 0.120, -0.020),
    radius: 0.042,
    depth: 0.060,
  },
  sweater: {
    shoulder: new THREE.Vector3(-0.181, 0.164, -0.023),
    cuff: new THREE.Vector3(-0.585, -0.225, 0.030),
    radius: 0.052,
    depth: 0.070,
  },
  hoodie: {
    shoulder: new THREE.Vector3(-0.183, 0.220, -0.015),
    cuff: new THREE.Vector3(-0.588, -0.331, 0.010),
    radius: 0.054,
    depth: 0.070,
  },
  jacket: {
    shoulder: new THREE.Vector3(-0.179, 0.271, -0.068),
    cuff: new THREE.Vector3(-0.950, -0.230, 0.070),
    radius: 0.060,
    depth: 0.080,
  },
};

function getCalibratedSleevePlacement(apparel, side, tNorm, decalSlide = 0) {
  const arm = APPAREL_ARMS[apparel] || APPAREL_ARMS["tshirt"];
  const sign = side === "right_sleeve" ? -1 : 1;

  const shoulder = new THREE.Vector3(arm.shoulder.x * sign, arm.shoulder.y, arm.shoulder.z);
  const cuff = new THREE.Vector3(arm.cuff.x * sign, arm.cuff.y, arm.cuff.z);

  const armVec = cuff.clone().sub(shoulder);
  const armLen = armVec.length();
  const armDir = armVec.clone().normalize();

  // Outward normal in XY plane
  let outwardNorm = new THREE.Vector3(armDir.y, -armDir.x, 0).normalize();
  if (side === "left_sleeve" && outwardNorm.x > 0) outwardNorm.negate();
  if (side === "right_sleeve" && outwardNorm.x < 0) outwardNorm.negate();

  // Position along the sleeve
  const pos = shoulder.clone().addScaledVector(armDir, armLen * tNorm);
  pos.addScaledVector(outwardNorm, arm.radius);
  pos.z += decalSlide;

  // Projector orientation:
  // Z points outward along outwardNorm
  // Y points up along sleeve (-armDir)
  const projZ = outwardNorm.clone();
  const projY = armDir.clone().negate();
  const projX = new THREE.Vector3().crossVectors(projY, projZ).normalize();
  projY.crossVectors(projZ, projX).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(projX, projY, projZ);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

  return {
    position: pos,
    euler: euler,
    depth: arm.depth,
  };
}

async function run() {
  const longsleeve = await loadMesh("kaos-kami-web/public/models/longsleeve.glb");
  const tee = await loadMesh("kaos-kami-web/public/models/tee-basic.glb");
  const sweater = await loadMesh("kaos-kami-web/public/models/sweater.glb");

  console.log("=================================================");
  console.log("TESTING CALIBRATED CLEAN DECAL SYSTEM");
  console.log("=================================================");

  // 1. Longsleeve Sleeve Placement Tests
  const testPoints = [
    { name: "Top / Shoulder (t=0.2)", t: 0.2 },
    { name: "Mid-Sleeve (t=0.5)", t: 0.5 },
    { name: "Cuff / Tip of Sleeve (t=0.85)", t: 0.85 },
  ];

  console.log("\n--- LONGSLEEVE SLEEVE TESTS ---");
  for (const pt of testPoints) {
    const pl = getCalibratedSleevePlacement("longsleeve", "left_sleeve", pt.t, 0);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const res = createCleanDecalGeometry(longsleeve, pl.position, pl.euler, size, 0.08);
    console.log(`[${pt.name}] Pos: (${pl.position.x.toFixed(3)}, ${pl.position.y.toFixed(3)}, ${pl.position.z.toFixed(3)}) | Raw: ${res?.rawCount ?? 0} | Clean: ${res?.cleanCount ?? 0} | Culled Backfaces: ${res?.backfacesCulled ?? 0}`);
  }

  console.log("\n--- T-SHIRT SLEEVE TESTS ---");
  for (const pt of [{ name: "T-Shirt Mid Sleeve (t=0.5)", t: 0.5 }]) {
    const pl = getCalibratedSleevePlacement("tshirt", "left_sleeve", pt.t, 0);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const res = createCleanDecalGeometry(tee, pl.position, pl.euler, size, 0.08);
    console.log(`[${pt.name}] Pos: (${pl.position.x.toFixed(3)}, ${pl.position.y.toFixed(3)}, ${pl.position.z.toFixed(3)}) | Raw: ${res?.rawCount ?? 0} | Clean: ${res?.cleanCount ?? 0} | Culled Backfaces: ${res?.backfacesCulled ?? 0}`);
  }

  console.log("\n--- SWEATER SLEEVE TESTS ---");
  for (const pt of [{ name: "Sweater Mid Sleeve (t=0.5)", t: 0.5 }, { name: "Sweater Cuff (t=0.85)", t: 0.85 }]) {
    const pl = getCalibratedSleevePlacement("sweater", "left_sleeve", pt.t, 0);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const res = createCleanDecalGeometry(sweater, pl.position, pl.euler, size, 0.08);
    console.log(`[${pt.name}] Pos: (${pl.position.x.toFixed(3)}, ${pl.position.y.toFixed(3)}, ${pl.position.z.toFixed(3)}) | Raw: ${res?.rawCount ?? 0} | Clean: ${res?.cleanCount ?? 0} | Culled Backfaces: ${res?.backfacesCulled ?? 0}`);
  }

  console.log("\n--- FRONT DECALS WITH SHALLOW DEPTH (NO PENETRATION TO BACK/SLEEVE) ---");
  const frontPos = new THREE.Vector3(-0.11, 0, 0.109);
  const frontEuler = new THREE.Euler(0, 0, 0);
  const frontSize = new THREE.Vector3(0.14, 0.14, 0.08); // 8cm shallow depth instead of 40cm!
  const resFront = createCleanDecalGeometry(longsleeve, frontPos, frontEuler, frontSize, 0.08);
  console.log(`[Front Chest Near Sleeve] Raw: ${resFront?.rawCount ?? 0} | Clean: ${resFront?.cleanCount ?? 0} | Culled Backfaces: ${resFront?.backfacesCulled ?? 0}`);
}

run().catch(console.error);
