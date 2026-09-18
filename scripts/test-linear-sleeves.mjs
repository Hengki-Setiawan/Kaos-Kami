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

function getLinearSleevePlacement(apparel, targetSide, decalX, decalY) {
  const isRight = targetSide === "right_sleeve";
  const sign = isRight ? -1 : 1;
  const progress = Math.max(0, Math.min(1, (0.35 - decalY) / 0.70));

  let outerX = 0, y = 0, z = 0, normX = -1, normY = 0, depth = 0.07;

  if (apparel === "crewneck") {
    y = 0.20 - progress * 0.44;
    outerX = -0.28 - 0.32 * progress;
    z = -0.025 + progress * 0.065;
    normX = -0.80;
    normY = 0.58;
    depth = 0.075;
  } else if (apparel === "hoodie") {
    y = 0.10 - progress * 0.35;
    outerX = -0.19 - 0.245 * progress;
    z = -0.030 + progress * 0.035;
    normX = -0.78;
    normY = 0.60;
    depth = 0.075;
  }

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
  console.log(`\n=== Testing ${name} Sleeve Trajectory (Linear) ===`);
  const steps = [
    { label: "Top (Bahu)", y: 0.35 },
    { label: "Upper Arm", y: 0.175 },
    { label: "Mid Arm (Tengah)", y: 0.0 },
    { label: "Forearm", y: -0.175 },
    { label: "Bottom (Manset/Cuff)", y: -0.35 },
  ];

  for (const step of steps) {
    const pl = getLinearSleevePlacement(apparelKey, "left_sleeve", 0, step.y);
    const pos = new THREE.Vector3(...pl.position);
    const euler = new THREE.Euler(...pl.rotation);
    const size = new THREE.Vector3(0.08, 0.08, pl.projectionDepth);

    const raw = new DecalGeometry(mesh, pos, euler, size);
    const pAttr = raw.attributes.position;
    if (!pAttr || pAttr.count === 0) {
      console.log(`[${step.label.padEnd(20)}] decalY=${step.y.toFixed(2)} | NO TRIANGLES GENERATED!`);
      continue;
    }

    const clean = filterBackfaces(raw, pos, euler, 0.05);
    const cleanCount = clean.attributes.position ? clean.attributes.position.count / 3 : 0;
    const rawCount = pAttr.count / 3;

    console.log(`[${step.label.padEnd(20)}] decalY=${step.y.toFixed(2)} | Pos: (${pl.position[0].toFixed(3)}, ${pl.position[1].toFixed(3)}) | Clean: ${cleanCount} tris (Culled: ${rawCount - cleanCount})`);
  }
}

async function run() {
  await testApparel("Sweater", "kaos-kami-web/public/models/sweater.glb", "crewneck");
  await testApparel("Hoodie", "kaos-kami-web/public/models/hoodie-blue.glb", "hoodie", 0.74);
}

run().catch(console.error);
