import fs from "fs";
global.self = global;
global.window = global;
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

async function compareProportions() {
  const buf = fs.readFileSync("kaos-kami-web/public/models/tee-basic.glb");
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
  merged.center();
  merged.computeBoundingBox();
  const box = merged.boundingBox;
  const pos = merged.attributes.position;

  // Measure collar front center (lowest point of front collar curve)
  // Look at x near 0, z > 0, highest y near neck
  let collarFrontY = -Infinity;
  let collarBackY = -Infinity;
  let bottomHemY = Infinity;
  let shoulderTopY = -Infinity;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    bottomHemY = Math.min(bottomHemY, y);
    shoulderTopY = Math.max(shoulderTopY, y);

    if (Math.abs(x) < 0.03) {
      if (z > 0.05) {
        // front collar
        if (y > 0.10 && y < 0.35) {
          if (collarFrontY === -Infinity || y < collarFrontY) {
            collarFrontY = y; // lowest point of front neck curve
          }
        }
      }
      if (z < -0.05) {
        // back collar
        if (y > 0.10 && y < 0.35) {
          if (collarBackY === -Infinity || y < collarBackY) {
            collarBackY = y;
          }
        }
      }
    }
  }

  console.log("=== TEE-BASIC VERTICAL KEYPOINTS ===");
  console.log("Shoulder top Y:", shoulderTopY.toFixed(4));
  console.log("Front collar curve lowest Y:", collarFrontY.toFixed(4));
  console.log("Back collar curve lowest Y:", collarBackY.toFixed(4));
  console.log("Bottom hem Y:", bottomHemY.toFixed(4));

  const totalMeshHeight = shoulderTopY - bottomHemY;
  const bodyLengthFromCollar = collarFrontY - bottomHemY;
  const bodyLengthFromShoulder = shoulderTopY - bottomHemY;
  console.log("Total Height (shoulder to hem):", totalMeshHeight.toFixed(4));
  console.log("Body Length from front collar to hem:", bodyLengthFromCollar.toFixed(4));

  // Chest width (underarm level, y ≈ 0.02)
  const chestWidth = 0.3818;
  console.log("Chest Width (seam to seam):", chestWidth.toFixed(4));

  console.log("\n=== 3D MODEL RATIOS ===");
  console.log("Height / ChestWidth (3D):", (totalMeshHeight / chestWidth).toFixed(3));
  console.log("BodyLengthFromCollar / ChestWidth (3D):", (bodyLengthFromCollar / chestWidth).toFixed(3));

  console.log("\n=== REAL WORLD CLOTHING RATIOS (Kaos Dewasa XL) ===");
  console.log("Panjang Badan (74 cm) / Lebar Dada (56 cm):", (74 / 56).toFixed(3));
  console.log("Panjang Badan (70 cm) / Lebar Dada (50 cm) (Size M):", (70 / 50).toFixed(3));
  console.log("Panjang Badan (72 cm) / Lebar Dada (52 cm) (Size L):", (72 / 52).toFixed(3));
}

compareProportions();
