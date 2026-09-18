import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const buffer = fs.readFileSync("kaos-kami-web/public/models/test-mannequin-tee.glb");
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, "", (gltf) => {
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const walkClip = gltf.animations.find((a) => a.name.includes("Walk"));
  console.log("Testing clip:", walkClip.name, "duration:", walkClip.duration);

  const action = mixer.clipAction(walkClip);
  action.play();

  // Find a bone
  let spine3;
  gltf.scene.traverse((o) => {
    if (o.name === "DEF-spine003") spine3 = o;
  });

  const posBefore = spine3.position.clone();
  const rotBefore = spine3.quaternion.clone();

  // Update mixer by 0.5s
  mixer.update(0.5);

  const posAfter = spine3.position.clone();
  const rotAfter = spine3.quaternion.clone();

  console.log("Bone DEF-spine003 before rot:", rotBefore);
  console.log("Bone DEF-spine003 after rot:", rotAfter);
  console.log("Did bone rotate?", !rotBefore.equals(rotAfter));

  let tee;
  gltf.scene.traverse((o) => {
    if (o.name === "Apparel_Tee") tee = o;
  });
  console.log("Tee mesh skeleton bone count:", tee.skeleton.bones.length);
  console.log("Tee mesh skeleton bone 0:", tee.skeleton.bones[0].name);
});
