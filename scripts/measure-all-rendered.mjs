import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function extract(scene, options) {
  scene.updateMatrixWorld(true);
  const geoms = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      geoms.push(cloned);
    }
  });
  if (geoms.length === 0) return null;
  const merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms, false);
  if (options?.scaleMultiplier && options.scaleMultiplier !== 1.0) {
    merged.scale(options.scaleMultiplier, options.scaleMultiplier, options.scaleMultiplier);
  }
  merged.center();
  if (options?.crownYOffset) {
    merged.translate(0, options.crownYOffset, 0);
  }
  merged.computeBoundingBox();
  return merged;
}

async function loadAndExtract(path, options) {
  const buf = fs.readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
  return extract(gltf.scene, options);
}

async function analyze(name, path, options, realChestCm, realLengthCm) {
  const geo = await loadAndExtract(path, options);
  if (!geo) {
    console.log(`Failed to load ${name}`);
    return;
  }
  const box = geo.boundingBox;
  const totalW = box.max.x - box.min.x;
  const totalH = box.max.y - box.min.y;
  const pos = geo.attributes.position;

  // Let's find torso chest width around Y = -0.05 to 0.0 (where front decals are placed)
  const xsFront = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(y - (-0.05)) < 0.03 && z > 0.02) {
      xsFront.push(pos.getX(i));
    }
  }
  xsFront.sort((a,b) => a - b);
  const frontChestW = xsFront.length ? (xsFront[xsFront.length - 1] - xsFront[0]) : 0;

  // Also underarm seam to seam: find min/max x where z is close to 0 (lateral sides)
  const xsSeam = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(y - (-0.08)) < 0.03 && Math.abs(z) < 0.08) {
      xsSeam.push(pos.getX(i));
    }
  }
  xsSeam.sort((a,b) => a - b);
  const seamChestW = xsSeam.length ? (xsSeam[xsSeam.length - 1] - xsSeam[0]) : 0;

  console.log(`\n================== ${name} ==================`);
  console.log(`Total Rendered BBox: Width=${totalW.toFixed(4)}, Height=${totalH.toFixed(4)}`);
  console.log(`Torso Seam-to-Seam Width (near underarm Y=-0.08): ${seamChestW.toFixed(4)} unit`);
  console.log(`Torso Front-Face Width (Y=-0.05, Z>0.02): ${frontChestW.toFixed(4)} unit`);
  console.log(`Real Chest Spec: ${realChestCm} cm | Real Length Spec: ${realLengthCm} cm`);

  const multSeam = realChestCm / seamChestW;
  const multTotal = realChestCm / totalW;
  console.log(`Multiplier based on Seam Chest: ${multSeam.toFixed(1)} (1 unit = ${multSeam.toFixed(1)} cm)`);
  console.log(`Multiplier based on Total Span: ${multTotal.toFixed(1)} (1 unit = ${multTotal.toFixed(1)} cm)`);
}

async function run() {
  await analyze("T-Shirt (tee-basic.glb)", "kaos-kami-web/public/models/tee-basic.glb", { scaleMultiplier: 0.72, crownYOffset: -0.12 }, 56.0, 74.0);
  await analyze("Longsleeve (longsleeve.glb)", "kaos-kami-web/public/models/longsleeve.glb", { scaleMultiplier: 0.72, crownYOffset: -0.12 }, 56.0, 74.0);
  await analyze("Crewneck (sweater.glb)", "kaos-kami-web/public/models/sweater.glb", { scaleMultiplier: 0.74, crownYOffset: -0.10 }, 58.0, 72.0);
  await analyze("Hoodie (hoodie-blue.glb)", "kaos-kami-web/public/models/hoodie-blue.glb", { scaleMultiplier: 26.0 }, 60.0, 74.0);
  await analyze("Coach Jacket (jacket.glb)", "kaos-kami-web/public/models/jacket.glb", { scaleMultiplier: 0.52, crownYOffset: -0.075 }, 58.0, 74.0);
}

run();
