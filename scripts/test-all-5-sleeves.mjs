import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function getModelSleevePlacement(apparel, targetSide, decalX, decalY) {
  const isRight = targetSide === "right_sleeve";
  const sign = isRight ? -1 : 1;

  // Normalized progress along arm:
  // decalY in [-0.35, +0.35]
  // progress = 0 (shoulder) to 1 (cuff)
  const progress = Math.max(0, Math.min(1, (0.35 - decalY) / 0.70));

  let outerX = 0;
  let y = 0;
  let z = -0.015;
  let normX = -1;
  let normY = 0;
  let depth = 0.065;

  if (apparel === "longsleeve") {
    y = 0.18 - progress * 0.50; // +0.18 to -0.32
    outerX = -0.33 - 0.11 * Math.sin(progress * Math.PI * 0.5);
    normX = -1;
    normY = (1 - progress) * 0.35;
    depth = 0.065;
  } else if (apparel === "tshirt") {
    y = 0.22 - progress * 0.14; // +0.22 to +0.08
    outerX = -0.31 - 0.05 * progress;
    normX = -0.85;
    normY = 0.52;
    depth = 0.060;
  } else if (apparel === "crewneck") {
    y = 0.20 - progress * 0.44; // +0.20 to -0.24
    outerX = -0.30 - 0.30 * Math.sin(progress * Math.PI * 0.5);
    normX = -0.80;
    normY = 0.58;
    z = 0.005;
    depth = 0.070;
  } else if (apparel === "hoodie") {
    y = 0.20 - progress * 0.50; // +0.20 to -0.30
    outerX = -0.26 - 0.33 * Math.sin(progress * Math.PI * 0.5);
    normX = -0.78;
    normY = 0.62;
    z = 0.005;
    depth = 0.070;
  } else if (apparel === "shirt") {
    y = 0.24 - progress * 0.56; // +0.24 to -0.32
    outerX = -0.50 - 0.45 * Math.sin(progress * Math.PI * 0.5);
    normX = -0.70;
    normY = 0.70;
    z = 0.010;
    depth = 0.080;
  } else {
    // default
    y = 0.18 - progress * 0.30;
    outerX = -0.32 - 0.10 * progress;
    normX = -0.90;
    normY = 0.40;
    depth = 0.065;
  }

  // Adjust for left/right
  const posX = (outerX - 0.003) * sign;
  const posY = y;
  const posZ = z + decalX;

  const outwardNorm = new THREE.Vector3(normX * sign, normY, 0).normalize();
  const projZ = outwardNorm.clone();
  const projY = new THREE.Vector3(0, 1, 0);
  const projX = new THREE.Vector3().crossVectors(projY, projZ).normalize();
  projY.crossVectors(projZ, projX).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(projX, projY, projZ);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

  return {
    position: [posX, posY, posZ],
    rotation: [euler.x, euler.y, euler.z],
    projectionDepth: depth,
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

  const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
  if (scaleUp !== 1) merged.scale(scaleUp, scaleUp, scaleUp);
  merged.center();
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);
  return mesh;
}

async function testApparel(name, path, apparelKey, scaleUp = 1) {
  const mesh = await loadMesh(path, scaleUp);
  console.log(`\n=== Testing ${name} Sleeve Trajectory (Top to Bottom) ===`);
  const steps = [
    { label: "Top (Bahu)", y: 0.35 },
    { label: "Upper Arm", y: 0.175 },
    { label: "Mid Arm (Tengah)", y: 0.0 },
    { label: "Forearm", y: -0.175 },
    { label: "Bottom (Manset/Cuff)", y: -0.35 },
  ];

  for (const step of steps) {
    const pl = getModelSleevePlacement(apparelKey, "left_sleeve", 0, step.y);
    const pos = new THREE.Vector3(...pl.position);
    const euler = new THREE.Euler(...pl.rotation);
    const size = new THREE.Vector3(0.08, 0.08, pl.projectionDepth);

    const raw = new DecalGeometry(mesh, pos, euler, size);
    const pAttr = raw.attributes.position;
    const nAttr = raw.attributes.normal;
    if (!pAttr || pAttr.count === 0) {
      console.log(`[${step.label.padEnd(20)}] decalY=${step.y.toFixed(2)} | NO TRIANGLES GENERATED!`);
      continue;
    }

    const projMatrix = new THREE.Matrix4().makeRotationFromEuler(euler).setPosition(pos);
    const projInv = projMatrix.clone().invert();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

    let frontTris = 0;
    let backTris = 0;
    for (let i = 0; i < pAttr.count; i += 3) {
      const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
      const n1 = new THREE.Vector3(nAttr.getX(i+1), nAttr.getY(i+1), nAttr.getZ(i+1)).applyMatrix3(normalMatrix).normalize();
      const n2 = new THREE.Vector3(nAttr.getX(i+2), nAttr.getY(i+2), nAttr.getZ(i+2)).applyMatrix3(normalMatrix).normalize();
      const avgZ = (n0.z + n1.z + n2.z) / 3;
      if (avgZ > 0.05) frontTris++;
      else backTris++;
    }

    console.log(`[${step.label.padEnd(20)}] decalY=${step.y.toFixed(2)} | Pos: (${pl.position[0].toFixed(3)}, ${pl.position[1].toFixed(3)}) | Front: ${frontTris} tris | Back: ${backTris} tris`);
  }
}

async function run() {
  await testApparel("Longsleeve", "kaos-kami-web/public/models/longsleeve.glb", "longsleeve");
  await testApparel("T-Shirt", "kaos-kami-web/public/models/tee-basic.glb", "tshirt");
  await testApparel("Sweater", "kaos-kami-web/public/models/sweater.glb", "crewneck");
  await testApparel("Hoodie", "kaos-kami-web/public/models/hoodie-blue.glb", "hoodie", 26);
  await testApparel("Jacket", "kaos-kami-web/public/models/jacket.glb", "shirt");
}

run().catch(console.error);
