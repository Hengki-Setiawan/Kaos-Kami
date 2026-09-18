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

// Master arm trajectories
const APPAREL_SLEEVE_CONFIG = {
  longsleeve: {
    shoulder: [-0.183, 0.194, -0.035],
    mid: [-0.390, -0.050, -0.015],
    cuff: [-0.438, -0.320, -0.010],
    radius: 0.046,
    depth: 0.065,
  },
  tshirt: {
    shoulder: [-0.183, 0.196, -0.036],
    mid: [-0.280, 0.150, -0.025],
    cuff: [-0.340, 0.110, -0.020],
    radius: 0.042,
    depth: 0.060,
  },
  crewneck: {
    shoulder: [-0.181, 0.164, -0.023],
    mid: [-0.450, -0.020, 0.000],
    cuff: [-0.585, -0.225, 0.030],
    radius: 0.052,
    depth: 0.070,
  },
  hoodie: {
    shoulder: [-0.183, 0.220, -0.015],
    mid: [-0.420, -0.040, 0.000],
    cuff: [-0.588, -0.331, 0.010],
    radius: 0.054,
    depth: 0.070,
  },
  shirt: {
    shoulder: [-0.179, 0.271, -0.068],
    mid: [-0.650, 0.000, 0.000],
    cuff: [-0.950, -0.230, 0.070],
    radius: 0.060,
    depth: 0.075,
  },
};

function getSleevePlacement(apparel, targetSide, decalX, decalY) {
  const cfg = APPAREL_SLEEVE_CONFIG[apparel] || APPAREL_SLEEVE_CONFIG["tshirt"];
  const isRight = targetSide === "right_sleeve";
  const sign = isRight ? -1 : 1;

  // Map decalY (-0.35 to +0.35) to u (0: shoulder to 1: cuff)
  // When decalY = +0.35 (top) -> u = 0
  // When decalY = 0 (middle)  -> u = 0.5
  // When decalY = -0.35 (bottom) -> u = 1.0
  const u = Math.max(0, Math.min(1, (0.35 - decalY) / 0.70));

  // Quadratic Bezier interpolation along arm curve
  const p0 = new THREE.Vector3(cfg.shoulder[0] * sign, cfg.shoulder[1], cfg.shoulder[2]);
  const p1 = new THREE.Vector3(cfg.mid[0] * sign, cfg.mid[1], cfg.mid[2]);
  const p2 = new THREE.Vector3(cfg.cuff[0] * sign, cfg.cuff[1], cfg.cuff[2]);

  // Point on curve: B(u) = (1-u)^2 * p0 + 2(1-u)u * p1 + u^2 * p2
  const oneMinusU = 1 - u;
  const pos = new THREE.Vector3()
    .addScaledVector(p0, oneMinusU * oneMinusU)
    .addScaledVector(p1, 2 * oneMinusU * u)
    .addScaledVector(p2, u * u);

  // Tangent vector: B'(u) = 2(1-u)(p1 - p0) + 2u(p2 - p1)
  const tangent = new THREE.Vector3()
    .addScaledVector(p1.clone().sub(p0), 2 * oneMinusU)
    .addScaledVector(p2.clone().sub(p1), 2 * u)
    .normalize();

  // Outward normal in XY plane
  let outwardNorm = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize();
  if (!isRight && outwardNorm.x > 0) outwardNorm.negate();
  if (isRight && outwardNorm.x < 0) outwardNorm.negate();

  // Push outwards onto cloth surface
  pos.addScaledVector(outwardNorm, cfg.radius + 0.003);
  pos.z += decalX; // decalX allows minor sliding around sleeve circumference

  // Projector orientation
  const projZ = outwardNorm.clone();
  const projY = tangent.clone().negate();
  const projX = new THREE.Vector3().crossVectors(projY, projZ).normalize();
  projY.crossVectors(projZ, projX).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(projX, projY, projZ);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

  return { position: pos, rotation: euler, depth: cfg.depth };
}

async function loadApparel(path, scaleUp = 1) {
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

async function run() {
  const longsleeve = await loadApparel("kaos-kami-web/public/models/longsleeve.glb");
  const tee = await loadApparel("kaos-kami-web/public/models/tee-basic.glb");

  console.log("\n=================================================");
  console.log("TESTING FULL SLEEVE TRAJECTORY ON LONGSLEEVE");
  console.log("=================================================");

  // Test 7 positions from top (+0.35) to bottom (-0.35)
  for (let y = 0.35; y >= -0.351; y -= 0.10) {
    const pl = getSleevePlacement("longsleeve", "left_sleeve", 0, y);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const raw = new DecalGeometry(longsleeve, pl.position, pl.rotation, size);
    const rawCount = raw.attributes.position ? raw.attributes.position.count / 3 : 0;
    const clean = filterBackfaces(raw, pl.position, pl.rotation, 0.05);
    const cleanCount = clean.attributes.position ? clean.attributes.position.count / 3 : 0;
    console.log(`decalY=${y.toFixed(2).padStart(5)} | Pos: (${pl.position.x.toFixed(3)}, ${pl.position.y.toFixed(3)}, ${pl.position.z.toFixed(3)}) | Raw: ${rawCount} | Clean: ${cleanCount}`);
  }

  console.log("\n=================================================");
  console.log("TESTING FULL SLEEVE TRAJECTORY ON TEE-BASIC");
  console.log("=================================================");
  for (let y = 0.30; y >= -0.301; y -= 0.15) {
    const pl = getSleevePlacement("tshirt", "left_sleeve", 0, y);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const raw = new DecalGeometry(tee, pl.position, pl.rotation, size);
    const rawCount = raw.attributes.position ? raw.attributes.position.count / 3 : 0;
    const clean = filterBackfaces(raw, pl.position, pl.rotation, 0.05);
    const cleanCount = clean.attributes.position ? clean.attributes.position.count / 3 : 0;
    console.log(`decalY=${y.toFixed(2).padStart(5)} | Pos: (${pl.position.x.toFixed(3)}, ${pl.position.y.toFixed(3)}, ${pl.position.z.toFixed(3)}) | Raw: ${rawCount} | Clean: ${cleanCount}`);
  }
}

run().catch(console.error);
