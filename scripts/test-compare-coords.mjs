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

  const teeBox = new THREE.Box3().setFromObject(tee);
  const manBox = new THREE.Box3().setFromObject(man1);

  console.log("=== TEE BOUNDS ===");
  console.log("Min:", teeBox.min);
  console.log("Max:", teeBox.max);
  console.log("Size:", teeBox.getSize(new THREE.Vector3()));
  console.log("Center:", teeBox.getCenter(new THREE.Vector3()));

  console.log("\n=== MANNEQUIN BODY BOUNDS ===");
  console.log("Min:", manBox.min);
  console.log("Max:", manBox.max);
  console.log("Size:", manBox.getSize(new THREE.Vector3()));
  console.log("Center:", manBox.getCenter(new THREE.Vector3()));
});
