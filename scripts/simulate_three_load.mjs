import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buffer = fs.readFileSync('kaos-kami-web/public/models/tee-basic.glb');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();

loader.parse(arrayBuffer, '', (gltf) => {
  console.log('GLTF keys:', Object.keys(gltf));
  const { scene } = gltf;
  
  scene.traverse((child) => {
    console.log('Object:', child.type, child.name, 'isMesh:', !!child.isMesh);
    if (child.isMesh) {
      console.log('  parent:', child.parent?.name);
      console.log('  pos:', child.position);
      console.log('  rot:', child.rotation);
      console.log('  scale:', child.scale);
      child.geometry.computeBoundingBox();
      console.log('  geometry bbox:', child.geometry.boundingBox);
    }
  });
}, (err) => {
  console.error('Error parsing GLTF:', err);
});
