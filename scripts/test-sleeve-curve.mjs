import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function getLongsleeveSleevePlacement(tNorm, decalSlide = 0) {
  // tNorm: 0 (shoulder top) to 1 (cuff bottom)
  // y ranges from +0.18 down to -0.32
  const y = 0.18 - tNorm * 0.50;

  // Outer surface X curve measured from 3D mesh
  // y=0.18 -> x=-0.33; y=0.0 -> x=-0.41; y=-0.32 -> x=-0.44
  const progress = Math.max(0, Math.min(1, (0.18 - y) / 0.50));
  // Smooth ease to arm profile
  const outerX = -0.33 - (0.44 - 0.33) * Math.sin(progress * Math.PI * 0.5);

  // Normal is outward (-X) with slight upward slope near shoulder
  const slopeY = (1 - progress) * 0.35;
  const norm = new THREE.Vector3(-1, slopeY, 0).normalize();

  // Projector orientation:
  // Z points outward along normal
  // Y points up along sleeve
  const projZ = norm.clone();
  const projY = new THREE.Vector3(0, 1, 0);
  const projX = new THREE.Vector3().crossVectors(projY, projZ).normalize();
  projY.crossVectors(projZ, projX).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(projX, projY, projZ);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, "XYZ");

  // Position on outer surface, offset slightly outward (EPS=0.004)
  const pos = new THREE.Vector3(outerX - 0.004, y, -0.015 + decalSlide);

  return { pos, euler, depth: 0.07 };
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

  console.log("Testing smooth Longsleeve sleeve curve at 6 positions from shoulder to cuff:");
  for (let t = 0.0; t <= 1.0; t += 0.2) {
    const pl = getLongsleeveSleevePlacement(t, 0);
    const size = new THREE.Vector3(0.08, 0.08, pl.depth);
    const raw = new DecalGeometry(mesh, pl.pos, pl.euler, size);

    // Cull backfaces
    const pAttr = raw.attributes.position;
    const nAttr = raw.attributes.normal;
    const projMatrix = new THREE.Matrix4().makeRotationFromEuler(pl.euler).setPosition(pl.pos);
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

    console.log(`t=${t.toFixed(1)} | Pos: (${pl.pos.x.toFixed(3)}, ${pl.pos.y.toFixed(3)}, ${pl.pos.z.toFixed(3)}) | Total Tris: ${pAttr.count / 3} | Front Tris: ${frontTris} | Culled Backfaces: ${backTris}`);
  }
}

run().catch(console.error);
