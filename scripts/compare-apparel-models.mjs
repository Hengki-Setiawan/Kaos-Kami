import fs from "fs";
import path from "path";

global.self = global;
global.window = global;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function loadGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

async function analyzeApparel(label, filePath) {
  console.log(`\n======================================================`);
  console.log(`ANALYZING: ${label}`);
  console.log(`Path: ${filePath}`);
  try {
    const gltf = await loadGLB(filePath);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    const meshes = [];
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        meshes.push({
          name: child.name,
          parent: child.parent?.name,
          vertexCount: child.geometry.attributes.position?.count,
          hasNormals: !!child.geometry.attributes.normal,
          hasUV: !!child.geometry.attributes.uv,
          materialName: child.material?.name,
          color: child.material?.color ? `#${child.material.color.getHexString()}` : undefined,
          map: !!child.material?.map,
        });
      }
    });

    console.log(`Mesh count: ${meshes.length}`);
    meshes.forEach((m, idx) => {
      console.log(`  [${idx}] "${m.name}" | vertices: ${m.vertexCount} | mat: "${m.materialName}" | hasUV: ${m.hasUV}`);
    });

    // Extract merged geometry with world matrix
    const geoms = [];
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        geoms.push(cloned);
      }
    });

    if (geoms.length > 0) {
      const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
      if (merged) {
        merged.center();
        merged.computeBoundingBox();
        const b = merged.boundingBox;
        const sizeX = b.max.x - b.min.x;
        const sizeY = b.max.y - b.min.y;
        const sizeZ = b.max.z - b.min.z;
        console.log(`Dimensions: width(X)=${sizeX.toFixed(3)}, height(Y)=${sizeY.toFixed(3)}, depth(Z)=${sizeZ.toFixed(3)}`);
        console.log(`Aspect ratio width/height: ${(sizeX / sizeY).toFixed(2)}`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function main() {
  await analyzeApparel("Current T-Shirt (tee-basic)", "kaos-kami-web/public/models/tee-basic.glb");
  await analyzeApparel("Current Longsleeve (broken sleeves)", "kaos-kami-web/public/models/longsleeve.glb");
  await analyzeApparel("Sweater Pack (Large_Long_Sleeve_Shirt)", "kaos-kami-web/public/models/sweater.glb");
  await analyzeApparel("Windbreaker Jacket (public/models/jacket.glb)", "kaos-kami-web/public/models/jacket.glb");
  await analyzeApparel("Bomber Jacket (Asset 3D/sketchfab)", "Asset 3D/sketchfab/bomber_jacket.glb");
  await analyzeApparel("Varsity Jacket (Asset 3D/sketchfab)", "Asset 3D/sketchfab/jacket_varsity.glb");
  await analyzeApparel("Fleece Jacket (Asset 3D/sketchfab)", "Asset 3D/sketchfab/fleece_jacket.glb");
  await analyzeApparel("Fleece Alt (Asset 3D/arsip-mobile)", "Asset 3D/arsip-mobile/fleece-alt.glb");
}

main();
