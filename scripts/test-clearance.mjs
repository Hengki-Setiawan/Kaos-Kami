import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buffer = fs.readFileSync("kaos-kami-web/public/models/test-mannequin-tee.glb");
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, "", (gltf) => {
  let tee, man1;
  gltf.scene.traverse((o) => {
    if (o.name === "Apparel_Tee") tee = o;
    if (o.name === "Mannequin_1") man1 = o;
  });

  const teePos = tee.geometry.attributes.position;
  const manPos = man1.geometry.attributes.position;

  // Let's check front chest (y between 1.15 and 1.35, z > 0)
  let maxTeeZ = -999;
  let maxManZ = -999;

  for (let i = 0; i < teePos.count; i++) {
    const y = teePos.getY(i);
    const x = Math.abs(teePos.getX(i));
    const z = teePos.getZ(i);
    if (y >= 1.15 && y <= 1.35 && x < 0.15) {
      if (z > maxTeeZ) maxTeeZ = z;
    }
  }

  for (let i = 0; i < manPos.count; i++) {
    const y = manPos.getY(i);
    const x = Math.abs(manPos.getX(i));
    const z = manPos.getZ(i);
    if (y >= 1.15 && y <= 1.35 && x < 0.15) {
      if (z > maxManZ) maxManZ = z;
    }
  }

  console.log("Chest level (Y = 1.15 - 1.35):");
  console.log("Max front Z for Mannequin body:", maxManZ);
  console.log("Max front Z for Shirt:", maxTeeZ);
  console.log("Difference (Shirt Z - Mannequin Z):", maxTeeZ - maxManZ);
});
