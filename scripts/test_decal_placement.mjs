import * as THREE from 'three';

// Exact logic from scaleCalibration.ts:
const APPAREL_PHYSICAL_SPECS = {
  tshirt: {
    armShoulder: [-0.17, 0.10, -0.02],
    armCuff: [-0.257, -0.03, -0.02],
    armEulerLeft: [-1.5708, -0.981, -1.5708],
    armEulerRight: [-1.5708, 0.981, 1.5708],
    outerSleeveX: 0.23,
    sleeveAnchorX: 0.18,
  },
  longsleeve: {
    armShoulder: [-0.19, 0.08, -0.02],
    armCuff: [-0.317, -0.34, -0.01],
    armEulerLeft: [-1.5708, -1.2772, -1.548],
    armEulerRight: [-1.5708, 1.2772, 1.548],
    outerSleeveX: 0.29,
    sleeveAnchorX: 0.18,
  },
  crewneck: {
    armShoulder: [-0.19, 0.08, 0.0],
    armCuff: [-0.443, -0.267, 0.02],
    armEulerLeft: [-1.5708, -0.9408, -1.5243],
    armEulerRight: [-1.5708, 0.9408, 1.5243],
    outerSleeveX: 0.34,
    sleeveAnchorX: 0.20,
  },
  hoodie: {
    armShoulder: [-0.20, 0.08, -0.01],
    armCuff: [-0.435, -0.245, 0.0],
    armEulerLeft: [-1.5708, -0.9408, -1.5243],
    armEulerRight: [-1.5708, 0.9408, 1.5243],
    outerSleeveX: 0.34,
    sleeveAnchorX: 0.20,
  },
  shirt: {
    armShoulder: [-0.20, 0.08, 0.0],
    armCuff: [-0.520, -0.196, 0.02],
    armEulerLeft: [-1.5708, -0.712, -1.5708],
    armEulerRight: [-1.5708, 0.712, 1.5708],
    outerSleeveX: 0.38,
    sleeveAnchorX: 0.22,
  },
};

function getDecal3DPlacement(apparelType, targetSide, decalX, decalY, surfaceZ) {
  const spec = APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS['tshirt'];
  const EPS = 0.004;

  if (targetSide === 'left_sleeve') {
    const shoulder = spec.armShoulder ?? [-0.17, 0.10, -0.02];
    const cuff = spec.armCuff ?? [-0.257, -0.03, -0.02];

    const armDirX = cuff[0] - shoulder[0];
    const armDirY = cuff[1] - shoulder[1];
    const armDirZ = cuff[2] - shoulder[2];
    const armLen = Math.hypot(armDirX, armDirY, armDirZ) || 1;
    const dX = armDirX / armLen;
    const dY = armDirY / armLen;
    const dZ = armDirZ / armLen;

    const midX = (shoulder[0] + cuff[0]) * 0.5;
    const midY = (shoulder[1] + cuff[1]) * 0.5;
    const midZ = (shoulder[2] + cuff[2]) * 0.5;

    let nx = dY;
    let ny = -dX;
    const nLen = Math.hypot(nx, ny) || 1;
    nx /= nLen;
    ny /= nLen;

    const t = Math.max(-0.45, Math.min(0.45, decalY));
    const slide = Math.max(-0.04, Math.min(0.04, decalX));

    const armRadius = (spec.outerSleeveX && spec.sleeveAnchorX)
      ? Math.max(0.038, (spec.outerSleeveX - spec.sleeveAnchorX) * 0.42)
      : (apparelType === 'longsleeve' ? 0.046 : 0.040);

    const posX = midX - dX * (t * armLen) + nx * (armRadius + EPS - 0.008);
    const posY = midY - dY * (t * armLen) + ny * (armRadius + EPS - 0.008);
    const posZ = midZ - dZ * (t * armLen) + slide;

    const rotation = spec.armEulerLeft ?? [-1.5708, -0.9810, -1.5708];

    return {
      position: [posX, posY, posZ],
      rotation: [rotation[0], rotation[1], rotation[2]],
      projectionDepth: 0.11,
      armDir: [dX, dY, dZ],
      normal: [nx, ny, 0],
    };
  }
}

for (const app of ['longsleeve', 'crewneck', 'hoodie', 'shirt']) {
  console.log(`\n=== ${app.toUpperCase()} ===`);
  for (const y of [0.35, 0.0, -0.35]) {
    const res = getDecal3DPlacement(app, 'left_sleeve', 0, y, 0.15);
    // Let's compute decal local axes:
    const euler = new THREE.Euler(res.rotation[0], res.rotation[1], res.rotation[2], 'XYZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);
    const forwardZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quat); // Decal projector normal
    const upY = new THREE.Vector3(0, 1, 0).applyQuaternion(quat); // Decal projector up vector
    const rightX = new THREE.Vector3(1, 0, 0).applyQuaternion(quat); // Decal projector right vector
    console.log(`  decalY=${y.toFixed(2)}: Pos=[${res.position.map(n => n.toFixed(3)).join(', ')}]`);
    console.log(`    Proj Normal Z: [${forwardZ.x.toFixed(3)}, ${forwardZ.y.toFixed(3)}, ${forwardZ.z.toFixed(3)}]`);
    console.log(`    Proj Up Y:     [${upY.x.toFixed(3)}, ${upY.y.toFixed(3)}, ${upY.z.toFixed(3)}]`);
    console.log(`    Proj Right X:  [${rightX.x.toFixed(3)}, ${rightX.y.toFixed(3)}, ${rightX.z.toFixed(3)}]`);
  }
}
