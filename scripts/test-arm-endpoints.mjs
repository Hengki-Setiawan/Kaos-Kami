import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

const SPECS = {
  tshirt: {
    armShoulder: [-0.170, 0.220, -0.020],
    armCuff: [-0.340, 0.110, -0.020],
    armEulerLeft: [1.5708, -1.3090, 1.5708],
    armEulerRight: [-1.5708, 1.3090, -1.5708],
    radius: 0.042,
  },
  longsleeve: {
    armShoulder: [-0.180, 0.180, -0.020],
    armCuff: [-0.440, -0.320, -0.010],
    armEulerLeft: [1.5708, -1.2305, 1.5708],
    armEulerRight: [-1.5708, 1.2305, -1.5708],
    radius: 0.046,
  },
  crewneck: {
    armShoulder: [-0.180, 0.200, -0.020],
    armCuff: [-0.600, -0.240, 0.040],
    armEulerLeft: [1.5708, -1.0123, 1.5708],
    armEulerRight: [-1.5708, 1.0123, -1.5708],
    radius: 0.052,
  },
  hoodie: {
    armShoulder: [-0.190, 0.100, -0.030],
    armCuff: [-0.440, -0.250, 0.010],
    armEulerLeft: [1.5708, -1.1868, 1.5708],
    armEulerRight: [-1.5708, 1.1868, -1.5708],
    radius: 0.054,
  },
  shirt: {
    armShoulder: [-0.180, 0.240, -0.030],
    armCuff: [-0.950, -0.240, 0.040],
    armEulerLeft: [1.5708, -0.9076, 1.5708],
    armEulerRight: [-1.5708, 0.9076, -1.5708],
    radius: 0.060,
  },
};

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

function getDecalPlacement(apparel, targetSide, decalX, decalY) {
  const spec = SPECS[apparel] || SPECS.tshirt;
  const isRight = targetSide === "right_sleeve";
  const shoulder = spec.armShoulder;
  const cuff = spec.armCuff;

  const armDirX = cuff[0] - shoulder[0];
  const armDirY = cuff[1] - shoulder[1];
  const armDirZ = cuff[2] - shoulder[2];
  const armLen = Math.hypot(armDirX, armDirY, armDirZ) || 1;
  const dX = armDirX / armLen;
  const dY = armDirY / armLen;
  const dZ = armDirZ / armLen;

  const midX = (shoulder[0] + cuff[0]) * 0.5;
  const midY = (shoulder[1] + cuff[1]) * 0.5;
  const midZ = (shoulder[2] + cuff[2]) * 0.5;

  let nx = dY;
  let ny = -dX;
  const nLen = Math.hypot(nx, ny) || 1;
  nx /= nLen;
  ny /= nLen;

  // Map decalY (-0.35 to +0.35) into tInArm (-0.46 to +0.46)
  // When decalY = +0.35 -> tInArm = +0.46 (Shoulder / Top)
  // When decalY = -0.35 -> tInArm = -0.46 (Cuff / Bottom)
  const normY = Math.max(-1, Math.min(1, decalY / 0.35));
  const tInArm = normY * 0.46;
  const slide = Math.max(-0.04, Math.min(0.04, decalX));

  const armRadius = spec.radius;
  const EPS = 0.004;

  const sign = isRight ? -1 : 1;
  const posX = (midX - dX * (tInArm * armLen) + nx * (armRadius + EPS - 0.008)) * sign;
  const posY = midY - dY * (tInArm * armLen) + ny * (armRadius + EPS - 0.008);
  const posZ = midZ - dZ * (tInArm * armLen) + (isRight ? -slide : slide);

  const rotation = isRight ? spec.armEulerRight : spec.armEulerLeft;

  return {
    position: [posX, posY, posZ],
    rotation: rotation,
    projectionDepth: 0.16,
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
  console.log(`\n=== Testing ${name} Sleeve Endpoints ===`);
  const steps = [
    { label: "Top (Bahu) decalY=+0.35", y: 0.35 },
    { label: "Mid Arm decalY=0.00", y: 0.00 },
    { label: "Bottom (Cuff) decalY=-0.35", y: -0.35 },
  ];

  for (const step of steps) {
    const pl = getDecalPlacement(apparelKey, "left_sleeve", 0, step.y);
    const pos = new THREE.Vector3(...pl.position);
    const euler = new THREE.Euler(...pl.rotation);
    const size = new THREE.Vector3(0.08, 0.08, pl.projectionDepth);

    const raw = new DecalGeometry(mesh, pos, euler, size);
    const pAttr = raw.attributes.position;
    if (!pAttr || pAttr.count === 0) {
      console.log(`[${step.label.padEnd(28)}] NO TRIANGLES!`);
      continue;
    }

    const clean = filterBackfaces(raw, pos, euler, 0.05);
    const cleanCount = clean.attributes.position ? clean.attributes.position.count / 3 : 0;
    const rawCount = pAttr.count / 3;

    console.log(`[${step.label.padEnd(28)}] Pos: (${pl.position[0].toFixed(3)}, ${pl.position[1].toFixed(3)}, ${pl.position[2].toFixed(3)}) | Clean: ${cleanCount} (Culled: ${rawCount - cleanCount})`);
  }
}

async function run() {
  await testApparel("Longsleeve", "kaos-kami-web/public/models/longsleeve.glb", "longsleeve");
  await testApparel("T-Shirt", "kaos-kami-web/public/models/tee-basic.glb", "tshirt");
  await testApparel("Sweater", "kaos-kami-web/public/models/sweater.glb", "crewneck");
  await testApparel("Hoodie", "kaos-kami-web/public/models/hoodie-blue.glb", "hoodie", 0.74);
  await testApparel("Jacket", "kaos-kami-web/public/models/jacket.glb", "shirt");
}

run().catch(console.error);
