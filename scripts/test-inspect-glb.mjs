import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buffer = fs.readFileSync("kaos-kami-web/public/models/test-mannequin-tee.glb");
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(
  arrayBuffer,
  "",
  (gltf) => {
    console.log("=== GLTF LOADED SUCCESSFULLY ===");
    console.log("Animations count:", gltf.animations.length);
    console.log("Animation clip names (sample):", gltf.animations.slice(0, 5).map((a) => a.name));
    console.log("Scene children:", gltf.scene.children.map((c) => c.name));

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
    console.log("=== MESHES FOUND ===");
    console.log(JSON.stringify(meshes, null, 2));

    // Check bounds
    const box = new THREE.Box3().setFromObject(gltf.scene);
    console.log("Bounding box min:", box.min);
    console.log("Bounding box max:", box.max);
    console.log("Bounding box size:", box.getSize(new THREE.Vector3()));
  },
  (err) => {
    console.error("Error parsing GLTF:", err);
  }
);
