import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const models = [
  { name: 'tshirt', file: 'tee-basic.glb', scaleMultiplier: 1.0 },
  { name: 'hoodie', file: 'hoodie-blue.glb', scaleMultiplier: 26.0 },
  { name: 'crewneck', file: 'sweater.glb', scaleMultiplier: 1.0 },
  { name: 'longsleeve', file: 'longsleeve.glb', scaleMultiplier: 1.0 },
  { name: 'jacket', file: 'jacket.glb', scaleMultiplier: 1.0 },
  { name: 'cap', file: 'cap.glb', scaleMultiplier: 1.0 },
  { name: 'pants', file: 'pants.glb', scaleMultiplier: 1.0 },
  { name: 'shorts', file: 'shorts.glb', scaleMultiplier: 1.0 },
];

function processModel(file, scaleMultiplier = 1.0) {
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync('kaos-kami-web/public/models/' + file);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    
    new GLTFLoader().parse(arrayBuffer, '', (gltf) => {
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
      
      if (geoms.length === 0) {
        return reject(new Error('No meshes in ' + file));
      }
      
      let merged;
      if (geoms.length === 1) {
        merged = geoms[0];
      } else {
        merged = BufferGeometryUtils.mergeGeometries(geoms, false);
      }
      
      if (scaleMultiplier !== 1.0) {
        merged.scale(scaleMultiplier, scaleMultiplier, scaleMultiplier);
      }
      
      merged.center();
      merged.computeBoundingBox();
      const bb = merged.boundingBox;
      const size = new THREE.Vector3();
      bb.getSize(size);
      
      resolve({
        file,
        meshesFound: geoms.length,
        size: { x: +size.x.toFixed(4), y: +size.y.toFixed(4), z: +size.z.toFixed(4) },
        bounds: {
          min: { x: +bb.min.x.toFixed(4), y: +bb.min.y.toFixed(4), z: +bb.min.z.toFixed(4) },
          max: { x: +bb.max.x.toFixed(4), y: +bb.max.y.toFixed(4), z: +bb.max.z.toFixed(4) }
        }
      });
    }, reject);
  });
}

async function run() {
  console.log('=== TESTING ALL 8 MODELS WITH matrixWorld & center() ===');
  for (const m of models) {
    try {
      const res = await processModel(m.file, m.scaleMultiplier);
      console.log(`[${m.name}] file=${m.file}`);
      console.log(`  size: Width(X)=${res.size.x}m, Height(Y)=${res.size.y}m, Depth(Z)=${res.size.z}m`);
      console.log(`  bounds Y: [${res.bounds.min.y}, ${res.bounds.max.y}], Z: [${res.bounds.min.z}, ${res.bounds.max.z}]`);
    } catch (err) {
      console.error(`[${m.name}] FAILED:`, err.message);
    }
  }
}

run();
