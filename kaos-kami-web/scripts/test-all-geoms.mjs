import fs from "fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { extractApparelGeometry } from "../src/lib/extractApparelGeometry.js";

// Minimal mock for browser DOM
import { JSDOM } from "jsdom";
const dom = new JSDOM();
global.window = dom.window;
global.document = dom.window.document;
global.self = global;

const files = [
  "public/models/tee-basic.glb",
  "public/models/hoodie-blue.glb",
  "public/models/pants.glb",
  "public/models/shorts.glb",
  "public/models/cap.glb",
  "public/models/longsleeve.glb",
  "public/models/jacket.glb",
  "public/models/sweater.glb"
];

const loader = new GLTFLoader();

async function testAll() {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`Skipping missing ${file}`);
      continue;
    }
    const buf = fs.readFileSync(file);
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", resolve, reject);
    });
    const geo = extractApparelGeometry(gltf.scene);
    if (!geo) {
      console.log(`Failed to extract ${file}`);
      continue;
    }
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    console.log(`${file}:`);
    console.log(`  size: (${(bb.max.x - bb.min.x).toFixed(3)}, ${(bb.max.y - bb.min.y).toFixed(3)}, ${(bb.max.z - bb.min.z).toFixed(3)})`);
    console.log(`  center: (${((bb.max.x + bb.min.x)/2).toFixed(3)}, ${((bb.max.y + bb.min.y)/2).toFixed(3)}, ${((bb.max.z + bb.min.z)/2).toFixed(3)})`);
  }
}

testAll();
