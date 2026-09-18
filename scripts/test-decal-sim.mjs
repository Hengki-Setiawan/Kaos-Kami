import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

function loadGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

async function testDecalProjection(name, glbPath, scaleMul, crownY, surfaceZ, decalX, decalY, decalScale, targetSide = "front") {
  console.log(`\n======================================================`);
  console.log(`Testing Decal on ${name} at x=${decalX}, y=${decalY}, side=${targetSide}, surfaceZ=${surfaceZ}`);
  const gltf = await loadGLB(glbPath);
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
  merged.scale(scaleMul, scaleMul, scaleMul);
  merged.center();
  if (crownY) merged.translate(0, crownY, 0);
  merged.computeVertexNormals();

  const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());

  let pos, rot, depth;
  if (targetSide === "front") {
    pos = new THREE.Vector3(decalX, decalY, surfaceZ + 0.004);
    rot = new THREE.Euler(0, 0, 0);
    depth = 0.32;
  } else if (targetSide === "side_left") {
    pos = new THREE.Vector3(-(0.185 + 0.004), decalY, decalX);
    rot = new THREE.Euler(0, -Math.PI / 2, 0);
    depth = 0.20;
  }

  const size = new THREE.Vector3(decalScale, decalScale, depth);
  const decalGeo = new DecalGeometry(mesh, pos, rot, size);
  console.log(`Decal generated! Vertex count = ${decalGeo.attributes.position ? decalGeo.attributes.position.count : 0}`);
  
  if (decalGeo.attributes.position && decalGeo.attributes.position.count > 0) {
    decalGeo.computeBoundingBox();
    const b = decalGeo.boundingBox;
    console.log(`Decal bbox X: [${b.min.x.toFixed(3)}, ${b.max.x.toFixed(3)}], Y: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}], Z: [${b.min.z.toFixed(3)}, ${b.max.z.toFixed(3)}]`);
    
    // Check center of decal vertices
    let cx = 0, cy = 0, cz = 0;
    const p = decalGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      cx += p.getX(i);
      cy += p.getY(i);
      cz += p.getZ(i);
    }
    cx /= p.count;
    cy /= p.count;
    cz /= p.count;
    console.log(`Decal vertex centroid: x=${cx.toFixed(3)}, y=${cy.toFixed(3)}, z=${cz.toFixed(3)}`);
  }
}

async function run() {
  // Test Jacket at x=0, y=-0.05
  await testDecalProjection("jacket", "kaos-kami-web/public/models/jacket.glb", 0.52, -0.075, 0.185, 0, -0.05, 0.11);
  // Test T-Shirt at x=0, y=-0.05
  await testDecalProjection("tee-basic", "kaos-kami-web/public/models/tee-basic.glb", 0.72, -0.12, 0.151, 0, -0.05, 0.11);
  // Test T-Shirt when dragged to side x=0.22 as front decal
  await testDecalProjection("tee-basic dragged to side (front)", "kaos-kami-web/public/models/tee-basic.glb", 0.72, -0.12, 0.151, 0.22, -0.05, 0.11, "front");
}

run();
