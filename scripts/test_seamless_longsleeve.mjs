import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';

async function main() {
  console.log('Loading tee-basic.glb for seamless longsleeve remake...');
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read('kaos-kami-web/public/models/tee-basic.glb');
  const root = doc.getRoot();
  const prim = root.listMeshes()[0].listPrimitives()[0];

  const origPos = Array.from(prim.getAttribute('POSITION').getArray());
  const origNorm = Array.from(prim.getAttribute('NORMAL').getArray());
  const origUvs = Array.from(prim.getAttribute('TEXCOORD_0').getArray());
  const origIndices = Array.from(prim.getIndices().getArray());

  console.log(`Original tee vertices: ${origPos.length / 3}, triangles: ${origIndices.length / 3}`);

  // 1. Build mesh adjacency to find connected components
  const adj = new Map();
  for (let i = 0; i < origIndices.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const u = origIndices[i + j];
      const v = origIndices[i + ((j + 1) % 3)];
      if (!adj.has(u)) adj.set(u, new Set());
      if (!adj.has(v)) adj.set(v, new Set());
      adj.get(u).add(v);
      adj.get(v).add(u);
    }
  }

  const comp = new Array(origPos.length / 3).fill(-1);
  let compCount = 0;
  for (let i = 0; i < origPos.length / 3; i++) {
    if (comp[i] !== -1) continue;
    const q = [i];
    comp[i] = compCount;
    while (q.length > 0) {
      const u = q.pop();
      for (const v of adj.get(u) || []) {
        if (comp[v] === -1) {
          comp[v] = compCount;
          q.push(v);
        }
      }
    }
    compCount++;
  }
  console.log(`Identified ${compCount} connected components in tee-basic.glb`);

  // Components identified:
  // Comp 3: Left upper sleeve (256 verts)
  // Comp 5: Left short-sleeve folded cuff band (160 verts) -> REMOVE
  // Comp 2: Right upper sleeve (272 verts)
  // Comp 6: Right short-sleeve folded cuff band (170 verts) -> REMOVE

  // 2. Identify the boundary vertices between sleeve and cuff BEFORE discarding cuff
  function getBoundaryVertices(sleeveCompId, cuffCompId) {
    const sleeveVerts = [];
    for (let i = 0; i < origPos.length / 3; i++) {
      if (comp[i] === sleeveCompId) sleeveVerts.push(i);
    }
    const cuffVerts = [];
    for (let i = 0; i < origPos.length / 3; i++) {
      if (comp[i] === cuffCompId) cuffVerts.push(i);
    }

    const boundary = [];
    for (const vs of sleeveVerts) {
      const ps = [origPos[vs * 3], origPos[vs * 3 + 1], origPos[vs * 3 + 2]];
      for (const vc of cuffVerts) {
        if (Math.hypot(ps[0] - origPos[vc * 3], ps[1] - origPos[vc * 3 + 1], ps[2] - origPos[vc * 3 + 2]) < 0.001) {
          boundary.push(vs);
          break;
        }
      }
    }

    const bSet = new Set(boundary);
    const bAdj = new Map();
    for (const u of boundary) {
      bAdj.set(u, []);
      for (const v of adj.get(u) || []) {
        if (bSet.has(v)) bAdj.get(u).push(v);
      }
    }

    const endPoints = [...bAdj.keys()].filter((u) => bAdj.get(u).length === 1);
    if (endPoints.length !== 2) {
      throw new Error(`Expected 2 endpoints for sleeve boundary, found ${endPoints.length}`);
    }

    const path = [endPoints[0]];
    let curr = endPoints[0], prev = null;
    while (curr !== endPoints[1]) {
      const next = bAdj.get(curr).find((n) => n !== prev);
      if (!next) break;
      path.push(next);
      prev = curr;
      curr = next;
    }
    return path;
  }

  const leftBoundaryPath = getBoundaryVertices(3, 5);
  const rightBoundaryPath = getBoundaryVertices(2, 6);
  console.log(`Left sleeve boundary path: ${leftBoundaryPath.length} vertices (endpoints: ${leftBoundaryPath[0]}, ${leftBoundaryPath[leftBoundaryPath.length - 1]})`);
  console.log(`Right sleeve boundary path: ${rightBoundaryPath.length} vertices (endpoints: ${rightBoundaryPath[0]}, ${rightBoundaryPath[rightBoundaryPath.length - 1]})`);

  // 3. Filter out Component 5 and Component 6 triangles and build clean new mesh
  const keptTriangles = [];
  const referencedVerts = new Set();

  for (let i = 0; i < origIndices.length; i += 3) {
    const i0 = origIndices[i];
    const i1 = origIndices[i + 1];
    const i2 = origIndices[i + 2];
    const c0 = comp[i0];
    // Skip triangles belonging to Component 5 or 6 (the short-sleeve cuffs)
    if (c0 === 5 || c0 === 6) continue;

    keptTriangles.push(i0, i1, i2);
    referencedVerts.add(i0);
    referencedVerts.add(i1);
    referencedVerts.add(i2);
  }

  console.log(`Kept triangles: ${keptTriangles.length / 3}, referencing ${referencedVerts.size} unique vertices`);

  // Remap old vertex indices to new sequential indices
  const oldToNew = new Map();
  const pos = [];
  const norm = [];
  const uvs = [];

  for (const oldIdx of referencedVerts) {
    const newIdx = pos.length / 3;
    oldToNew.set(oldIdx, newIdx);
    pos.push(origPos[oldIdx * 3], origPos[oldIdx * 3 + 1], origPos[oldIdx * 3 + 2]);
    norm.push(origNorm[oldIdx * 3], origNorm[oldIdx * 3 + 1], origNorm[oldIdx * 3 + 2]);
    uvs.push(origUvs[oldIdx * 2], origUvs[oldIdx * 2 + 1]);
  }

  const indices = [];
  for (let i = 0; i < keptTriangles.length; i++) {
    indices.push(oldToNew.get(keptTriangles[i]));
  }

  const mappedLeftBoundary = leftBoundaryPath.map((oldIdx) => oldToNew.get(oldIdx));
  const mappedRightBoundary = rightBoundaryPath.map((oldIdx) => oldToNew.get(oldIdx));

  // 4. Extrude long sleeves smoothly from the clean boundaries to the wrists
  function extrudeSleeve(boundaryPath, isLeft) {
    const N = boundaryPath.length;
    let c0x = 0, c0y = 0, c0z = 0;
    for (const v of boundaryPath) {
      c0x += pos[v * 3];
      c0y += pos[v * 3 + 1];
      c0z += pos[v * 3 + 2];
    }
    c0x /= N; c0y /= N; c0z /= N;

    const offsets = boundaryPath.map((v) => ({
      x: pos[v * 3] - c0x,
      y: pos[v * 3 + 1] - c0y,
      z: pos[v * 3 + 2] - c0z,
      uvU: uvs[v * 2],
      uvV: uvs[v * 2 + 1],
    }));

    const sign = isLeft ? -1 : 1;
    // Anatomical A-pose arm spine keypoints
    const p0 = { x: c0x, y: c0y, z: c0z };
    const p1 = { x: sign * 0.340, y: c0y - 0.005, z: 1.250 };
    const p2 = { x: sign * 0.380, y: c0y - 0.010, z: 1.130 };
    const p3 = { x: sign * 0.398, y: c0y - 0.008, z: 1.000 };
    const p4 = { x: sign * 0.405, y: c0y - 0.005, z: 0.880 };

    function evalSpine(t) {
      const pts = [p0, p1, p2, p3, p4];
      const nSegments = pts.length - 1;
      const scaledT = t * nSegments;
      const idx = Math.min(Math.floor(scaledT), nSegments - 1);
      const segT = scaledT - idx;

      const curr = pts[idx];
      const next = pts[idx + 1];
      const prev = idx > 0 ? pts[idx - 1] : { x: 2 * curr.x - next.x, y: 2 * curr.y - next.y, z: 2 * curr.z - next.z };
      const after = idx + 2 < pts.length ? pts[idx + 2] : { x: 2 * next.x - curr.x, y: 2 * next.y - curr.y, z: 2 * next.z - curr.z };

      const m0x = (next.x - prev.x) * 0.5;
      const m0y = (next.y - prev.y) * 0.5;
      const m0z = (next.z - prev.z) * 0.5;

      const m1x = (after.x - curr.x) * 0.5;
      const m1y = (after.y - curr.y) * 0.5;
      const m1z = (after.z - curr.z) * 0.5;

      const t2 = segT * segT;
      const t3 = t2 * segT;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + segT;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      return {
        x: h00 * curr.x + h10 * m0x + h01 * next.x + h11 * m1x,
        y: h00 * curr.y + h10 * m0y + h01 * next.y + h11 * m1y,
        z: h00 * curr.z + h10 * m0z + h01 * next.z + h11 * m1z,
      };
    }

    const numRings = 24;
    const ringIndices = [];
    ringIndices.push(boundaryPath);

    for (let r = 1; r <= numRings; r++) {
      const t = r / numRings;
      const center = evalSpine(t);

      // Smooth anatomical tapering: 1.0 down to 0.72 at wrist
      let taper = 1.0 - t * 0.28;
      // Soft natural fabric folds around the elbow zone
      if (t > 0.35 && t < 0.8) {
        taper += Math.sin(t * Math.PI * 5) * 0.012;
      }
      // Ribbed wrist cuff finish
      if (t > 0.88) {
        taper = 0.72 + (r % 2 === 0 ? 0.005 : -0.004);
      }

      const currentRing = [];
      for (let j = 0; j < N; j++) {
        const off = offsets[j];
        const vx = center.x + off.x * taper;
        const vy = center.y + off.y * taper;
        const vz = center.z + off.z * taper;

        const vIdx = pos.length / 3;
        pos.push(vx, vy, vz);
        norm.push(off.x * sign, off.y, 0);
        // Extend UV along U (down the sleeve)
        uvs.push(off.uvU - t * 0.35, off.uvV);

        currentRing.push(vIdx);
      }
      ringIndices.push(currentRing);
    }

    // Connect rings with quad triangles (oriented outward)
    for (let r = 0; r < numRings; r++) {
      const rA = ringIndices[r];
      const rB = ringIndices[r + 1];

      for (let j = 0; j < N - 1; j++) {
        const a1 = rA[j];
        const a2 = rA[j + 1];
        const b1 = rB[j];
        const b2 = rB[j + 1];

        // Triangle winding counter-directed to upper triangle edge
        indices.push(a1, a2, b2);
        indices.push(a1, b2, b1);
      }
    }
  }

  console.log('Extruding seamless sleeves from clean boundaries...');
  extrudeSleeve(mappedLeftBoundary, true);
  extrudeSleeve(mappedRightBoundary, false);

  console.log(`Generated mesh vertices: ${pos.length / 3}, triangles: ${indices.length / 3}`);

  // 5. Recompute smooth area-weighted vertex normals
  console.log('Computing smooth vertex normals across entire garment...');
  const vNormals = new Array(pos.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];

    const ax = pos[i1 * 3], ay = pos[i1 * 3 + 1], az = pos[i1 * 3 + 2];
    const bx = pos[i2 * 3], by = pos[i2 * 3 + 1], bz = pos[i2 * 3 + 2];
    const cx = pos[i3 * 3], cy = pos[i3 * 3 + 1], cz = pos[i3 * 3 + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    vNormals[i1 * 3] += nx; vNormals[i1 * 3 + 1] += ny; vNormals[i1 * 3 + 2] += nz;
    vNormals[i2 * 3] += nx; vNormals[i2 * 3 + 1] += ny; vNormals[i2 * 3 + 2] += nz;
    vNormals[i3 * 3] += nx; vNormals[i3 * 3 + 1] += ny; vNormals[i3 * 3 + 2] += nz;
  }

  // 6. Pool normals across coincident vertices (shoulder armhole, UV seams)
  console.log('Unifying normals across coincident seam vertices (shoulder/armhole/UV seam)...');
  const posMap = new Map();
  for (let i = 0; i < pos.length / 3; i++) {
    const k = Math.round(pos[i * 3] * 2000) + '_' + Math.round(pos[i * 3 + 1] * 2000) + '_' + Math.round(pos[i * 3 + 2] * 2000);
    if (!posMap.has(k)) posMap.set(k, []);
    posMap.get(k).push(i);
  }

  let unifiedCount = 0;
  for (const arr of posMap.values()) {
    if (arr.length > 1) {
      let sumNx = 0, sumNy = 0, sumNz = 0;
      for (const idx of arr) {
        sumNx += vNormals[idx * 3];
        sumNy += vNormals[idx * 3 + 1];
        sumNz += vNormals[idx * 3 + 2];
      }
      for (const idx of arr) {
        vNormals[idx * 3] = sumNx;
        vNormals[idx * 3 + 1] = sumNy;
        vNormals[idx * 3 + 2] = sumNz;
      }
      unifiedCount++;
    }
  }
  console.log(`Unified normals across ${unifiedCount} seam clusters!`);

  for (let i = 0; i < vNormals.length; i += 3) {
    const nx = vNormals[i], ny = vNormals[i + 1], nz = vNormals[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    norm[i] = nx / len;
    norm[i + 1] = ny / len;
    norm[i + 2] = nz / len;
  }

  // 7. Update GLTF accessors
  prim.getAttribute('POSITION').setArray(new Float32Array(pos));
  prim.getAttribute('NORMAL').setArray(new Float32Array(norm));
  prim.getAttribute('TEXCOORD_0').setArray(new Float32Array(uvs));
  prim.getIndices().setArray(new Uint32Array(indices));

  // Remove outdated TANGENT attribute
  const tangAccessor = prim.getAttribute('TANGENT');
  if (tangAccessor) {
    prim.setAttribute('TANGENT', null);
    tangAccessor.dispose();
  }

  const outPathWeb = 'kaos-kami-web/public/models/longsleeve.glb';
  const outPathMobile = 'kaos-kami-mobile/public/models/longsleeve.glb';

  await io.write(outPathWeb, doc);
  console.log(`✅ Perfectly seamless longsleeve exported to ${outPathWeb}!`);

  fs.copyFileSync(outPathWeb, outPathMobile);
  console.log(`✅ Synced to mobile: ${outPathMobile}!`);
}

main().catch(console.error);
