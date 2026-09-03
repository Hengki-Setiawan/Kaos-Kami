import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

async function generateLongsleeve() {
  console.log('Loading base t-shirt model...');
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read('public/models/tshirt-heavyweight.glb');

  const root = doc.getRoot();
  const prim = root.listMeshes()[0].listPrimitives()[0];

  const posAccessor = prim.getAttribute('POSITION');
  const normAccessor = prim.getAttribute('NORMAL');
  const uvAccessor = prim.getAttribute('TEXCOORD_0');
  const indAccessor = prim.getIndices();

  const origPositions = Array.from(posAccessor.getArray());
  const origNormals = Array.from(normAccessor.getArray());
  const origUVs = Array.from(uvAccessor.getArray());
  const origIndices = Array.from(indAccessor.getArray());

  const numOrigVertices = origPositions.length / 3;

  // Let's identify the sleeve perimeter vertices
  // Left sleeve perimeter: x < -0.16, y between -0.05 and 0.08
  // Right sleeve perimeter: x > 0.16, y between -0.05 and 0.08
  // To make a clean, continuous long sleeve, we construct procedural sleeve cylinders
  // that attach seamlessly to the left and right sleeve openings and extend down to the wrists!

  const leftArmStart = { x: -0.22, y: 0.02, z: -0.015 };
  const leftWrist = { x: -0.36, y: -0.36, z: 0.02 };

  const rightArmStart = { x: 0.22, y: 0.02, z: -0.015 };
  const rightWrist = { x: 0.36, y: -0.36, z: 0.02 };

  const newPositions = [...origPositions];
  const newNormals = [...origNormals];
  const newUVs = [...origUVs];
  const newIndices = [...origIndices];

  function addSleeve(start, end, isLeft) {
    const numRings = 14;
    const segments = 24;
    const ringVertexIndices = [];

    const dirX = end.x - start.x;
    const dirY = end.y - start.y;
    const dirZ = end.z - start.z;
    const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const ndx = dirX / length;
    const ndy = dirY / length;
    const ndz = dirZ / length;

    // Up vector roughly perpendicular to arm
    const upX = 0, upY = 0, upZ = 1;
    // Perpendicular vector 1: cross(dir, up)
    let p1x = ndy * upZ - ndz * upY;
    let p1y = ndz * upX - ndx * upZ;
    let p1z = ndx * upY - ndy * upX;
    const p1len = Math.sqrt(p1x * p1x + p1y * p1y + p1z * p1z);
    p1x /= p1len; p1y /= p1len; p1z /= p1len;

    // Perpendicular vector 2: cross(dir, p1)
    const p2x = ndy * p1z - ndz * p1y;
    const p2y = ndz * p1x - ndx * p1z;
    const p2z = ndx * p1y - ndy * p1x;

    for (let r = 0; r <= numRings; r++) {
      const t = r / numRings;
      const cx = start.x + dirX * t;
      const cy = start.y + dirY * t;
      const cz = start.z + dirZ * t;

      // Base radius tapering from upper arm (~0.055) to wrist cuff (~0.038)
      let radius = 0.058 * (1 - t * 0.35);

      // Add natural organic cloth wrinkles (folds around the elbow area t ~ 0.4 - 0.7)
      const elbowFolds = Math.sin(t * Math.PI * 6) * 0.004 * (t > 0.2 && t < 0.85 ? 1 : 0.2);
      radius += elbowFolds;

      // Ribbed cuff at the last 20% (manset rajut)
      const isCuff = t > 0.82;
      if (isCuff) {
        radius = 0.036 + (r % 2 === 0 ? 0.0015 : -0.001); // Subtle ribbed texture
      }

      const currentRing = [];
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        // Elliptical cross section for realistic arm anatomy
        const rx = radius * 1.05;
        const ry = radius * 0.95;

        const vx = cx + (p1x * cos * rx) + (p2x * sin * ry);
        const vy = cy + (p1y * cos * rx) + (p2y * sin * ry);
        const vz = cz + (p1z * cos * rx) + (p2z * sin * ry);

        // Normal pointing outwards from ring center
        const nx = (vx - cx);
        const ny = (vy - cy);
        const nz = (vz - cz);
        const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        const vIdx = newPositions.length / 3;
        newPositions.push(vx, vy, vz);
        newNormals.push(nx / nlen, ny / nlen, nz / nlen);
        newUVs.push(isLeft ? 0.15 + t * 0.2 : 0.85 - t * 0.2, s / segments);

        currentRing.push(vIdx);
      }
      ringVertexIndices.push(currentRing);
    }

    // Connect rings with quad triangles
    for (let r = 0; r < numRings; r++) {
      const ringA = ringVertexIndices[r];
      const ringB = ringVertexIndices[r + 1];

      for (let s = 0; s < segments; s++) {
        const sNext = (s + 1) % segments;
        const a1 = ringA[s];
        const a2 = ringA[sNext];
        const b1 = ringB[s];
        const b2 = ringB[sNext];

        if (isLeft) {
          newIndices.push(a1, b1, a2);
          newIndices.push(a2, b1, b2);
        } else {
          newIndices.push(a1, a2, b1);
          newIndices.push(a2, b2, b1);
        }
      }
    }
  }

  console.log('Building left and right longsleeve extensions with ribbed cuffs & elbow folds...');
  addSleeve(leftArmStart, leftWrist, true);
  addSleeve(rightArmStart, rightWrist, false);

  console.log(`Vertices: ${numOrigVertices} -> ${newPositions.length / 3}`);
  console.log(`Indices: ${origIndices.length} -> ${newIndices.length}`);

  // Update accessors
  posAccessor.setArray(new Float32Array(newPositions));
  normAccessor.setArray(new Float32Array(newNormals));
  uvAccessor.setArray(new Float32Array(newUVs));
  indAccessor.setArray(new Uint32Array(newIndices));

  // Write out longsleeve.glb
  const outPath = 'public/models/longsleeve.glb';
  await io.write(outPath, doc);
  console.log(`✅ File ${outPath} generated successfully!`);
}

generateLongsleeve().catch(console.error);
