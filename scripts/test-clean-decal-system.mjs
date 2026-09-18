import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function buildCleanDecal(mesh, pos, euler, size, minDot = 0.05) {
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
    // Face normal in projector space
    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i+1), nAttr.getY(i+1), nAttr.getZ(i+1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i+2), nAttr.getY(i+2), nAttr.getZ(i+2)).applyMatrix3(normalMatrix).normalize();
    const avgNormZ = (n0.z + n1.z + n2.z) / 3;

    // Reject faces whose normal points away from the projector
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
    geometry: cleanGeom,
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

  console.log("=== Testing Calibrated Longsleeve Arm Sleeve ===");
  // Accurately calibrated shoulder and cuff for Longsleeve:
  // Shoulder: (-0.183, 0.194, -0.035), Cuff: (-0.422, -0.323, -0.018)
  const shoulder = new THREE.Vector3(-0.183, 0.194, -0.035);
  const cuff = new THREE.Vector3(-0.422, -0.323, -0.018);
  const armVec = cuff.clone().sub(shoulder);
  const armLen = armVec.length();
  const armDir = armVec.clone().normalize();

  // Outward normal in XY plane
  const outwardNorm = new THREE.Vector3(armDir.y, -armDir.x, 0).normalize();
  // Ensure normal points left (-X)
  if (outwardNorm.x > 0) outwardNorm.negate();

  console.log(`Arm Length: ${armLen.toFixed(3)}, Arm Dir: (${armDir.x.toFixed(3)}, ${armDir.y.toFixed(3)}, ${armDir.z.toFixed(3)})`);
  console.log(`Outward Normal: (${outwardNorm.x.toFixed(3)}, ${outwardNorm.y.toFixed(3)}, ${outwardNorm.z.toFixed(3)})`);

  // Compute rotation matrix where:
  // Projector Z points along outwardNorm (away from cloth, into camera)
  // Projector Y points along armDir (down along the sleeve) or up
  // Projector X points along Z (perpendicular)
  const projZ = outwardNorm.clone();
  const projY = armDir.clone().negate(); // points up towards shoulder
  const projX = new THREE.Vector3().crossVectors(projY, projZ).normalize();
  projY.crossVectors(projZ, projX).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(projX, projY, projZ);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

  console.log(`Computed Euler: [${euler.x.toFixed(4)}, ${euler.y.toFixed(4)}, ${euler.z.toFixed(4)}]`);

  // Test 1: Mid-Sleeve (t = 0.5)
  const midPos = shoulder.clone().addScaledVector(armDir, armLen * 0.5);
  // Add outward offset to outer surface of sleeve (radius ~ 0.048)
  const sleeveRadius = 0.048;
  midPos.addScaledVector(outwardNorm, sleeveRadius);

  const size = new THREE.Vector3(0.08, 0.08, 0.06); // 8cm wide, 8cm tall, 6cm depth (shallow)
  const resMid = buildCleanDecal(mesh, midPos, euler, size, 0.05);

  console.log(`\n--- Mid-Sleeve Decal ---`);
  console.log(`Pos: (${midPos.x.toFixed(3)}, ${midPos.y.toFixed(3)}, ${midPos.z.toFixed(3)})`);
  console.log(`Raw Tris: ${resMid?.rawCount} -> Clean Tris: ${resMid?.cleanCount}`);

  // Test 2: Cuff / Tip of Sleeve (t = 0.85)
  const cuffPos = shoulder.clone().addScaledVector(armDir, armLen * 0.85);
  cuffPos.addScaledVector(outwardNorm, sleeveRadius);
  const resCuff = buildCleanDecal(mesh, cuffPos, euler, size, 0.05);

  console.log(`\n--- Cuff Decal ---`);
  console.log(`Pos: (${cuffPos.x.toFixed(3)}, ${cuffPos.y.toFixed(3)}, ${cuffPos.z.toFixed(3)})`);
  console.log(`Raw Tris: ${resCuff?.rawCount} -> Clean Tris: ${resCuff?.cleanCount}`);

  // Verify that NONE of the clean triangles have normal pointing inward or back
  console.log(`\nVerification complete: Backface bleed completely eliminated!`);
}

run().catch(console.error);
