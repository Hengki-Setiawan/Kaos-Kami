import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buffer = fs.readFileSync("kaos-kami-web/public/models/test-mannequin-tee.glb");
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, "", (gltf) => {
  let tee;
  gltf.scene.traverse((o) => {
    if (o.name === "Apparel_Tee") tee = o;
  });

  const geo = tee.geometry;
  console.log("Apparel_Tee attributes:", Object.keys(geo.attributes));
  console.log("Has UV?", !!geo.attributes.uv);
  console.log("Has Normal?", !!geo.attributes.normal);
  console.log("Has SkinIndex?", !!geo.attributes.skinIndex);
  console.log("Has SkinWeight?", !!geo.attributes.skinWeight);
  console.log("Material name:", tee.material.name);
});
