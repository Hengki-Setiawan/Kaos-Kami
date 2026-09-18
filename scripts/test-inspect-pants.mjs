global.self = global;
import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buffer = fs.readFileSync("kaos-kami-web/public/models/mannequin-pants.glb");
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, "", (gltf) => {
  console.log("=== MANNEQUIN-PANTS LOADED ===");
  console.log("Animations count:", gltf.animations.length);
  const meshes = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      meshes.push({
        name: o.name,
        type: o.type,
        isSkinned: o.isSkinnedMesh,
        bones: o.skeleton ? o.skeleton.bones.length : 0,
        materials: Array.isArray(o.material) ? o.material.map((m) => m.name) : o.material?.name,
        vertexCount: o.geometry.attributes.position.count,
      });
    }
  });
  console.log(JSON.stringify(meshes, null, 2));
});
