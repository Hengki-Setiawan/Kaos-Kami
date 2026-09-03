import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read('public/models/tshirt-heavyweight.glb');
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const indices = prim.getIndices().getArray();

const edgeMap = new Map();
function addEdge(a, b) {
  const k = a < b ? a + '_' + b : b + '_' + a;
  edgeMap.set(k, (edgeMap.get(k) || 0) + 1);
}

for (let i = 0; i < indices.length; i += 3) {
  addEdge(indices[i], indices[i + 1]);
  addEdge(indices[i + 1], indices[i + 2]);
  addEdge(indices[i + 2], indices[i]);
}

const boundaryEdges = [];
for (const [k, count] of edgeMap.entries()) {
  if (count === 1) {
    const [a, b] = k.split('_').map(Number);
    boundaryEdges.push([a, b]);
  }
}

console.log('Total boundary edges:', boundaryEdges.length);

const adj = new Map();
for (const [a, b] of boundaryEdges) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
  adj.get(b).push(a);
}

const visited = new Set();
const loops = [];
for (const start of adj.keys()) {
  if (visited.has(start)) continue;
  const loop = [];
  let curr = start;
  while (curr !== undefined && !visited.has(curr)) {
    visited.add(curr);
    loop.push(curr);
    const next = adj.get(curr)?.find((n) => !visited.has(n));
    curr = next;
  }
  loops.push(loop);
}

console.log('Found loops count:', loops.length);
loops.forEach((l, idx) => {
  let avgX = 0, avgY = 0, avgZ = 0;
  for (const v of l) {
    avgX += pos[v * 3];
    avgY += pos[v * 3 + 1];
    avgZ += pos[v * 3 + 2];
  }
  avgX /= l.length;
  avgY /= l.length;
  avgZ /= l.length;
  console.log(`Loop ${idx}: ${l.length} vertices, Center: x=${avgX.toFixed(3)}, y=${avgY.toFixed(3)}, z=${avgZ.toFixed(3)}`);
});
