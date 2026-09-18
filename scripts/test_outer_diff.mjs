import * as THREE from 'three';

const SPECS = {
  longsleeve: {
    armShoulder: [-0.170, 0.100, -0.020],
    armCuff: [-0.290, -0.300, -0.010],
    armEulerLeft: [1.5708, -1.2305, 1.5708],
    armEulerRight: [-1.5708, 1.2305, -1.5708],
    armRadius: 0.046,
  },
  hoodie: {
    armShoulder: [-0.175, 0.100, -0.030],
    armCuff: [-0.300, -0.250, 0.004],
    armEulerLeft: [1.5708, -1.1868, 1.5708],
    armEulerRight: [-1.5708, 1.1868, -1.5708],
    armRadius: 0.052,
  },
  crewneck: {
    armShoulder: [-0.170, 0.100, -0.020],
    armCuff: [-0.360, -0.250, 0.015],
    armEulerLeft: [1.5708, -1.0123, 1.5708],
    armEulerRight: [-1.5708, 1.0123, -1.5708],
    armRadius: 0.054,
  },
  shirt: {
    armShoulder: [-0.180, 0.100, -0.035],
    armCuff: [-0.400, -0.220, 0.025],
    armEulerLeft: [1.5708, -0.9076, 1.5708],
    armEulerRight: [-1.5708, 0.9076, -1.5708],
    armRadius: 0.056,
  },
};

// Blender measured outer mesh edges:
const MESH_OUTER = {
  longsleeve: { "0.10": -0.180, "0.00": -0.251, "-0.10": -0.286, "-0.20": -0.309, "-0.30": -0.316 },
  hoodie:     { "0.10": -0.190, "0.00": -0.272, "-0.10": -0.349, "-0.20": -0.423, "-0.25": -0.435 },
  crewneck:   { "0.10": -0.179, "0.00": -0.250, "-0.10": -0.340, "-0.20": -0.414, "-0.25": -0.443 },
  shirt:      { "0.10": -0.203, "0.00": -0.312, "-0.10": -0.454, "-0.20": -0.520, "-0.25": -0.495 },
};

function testPlacement(app, decalY) {
  const spec = SPECS[app];
  const shoulder = spec.armShoulder;
  const cuff = spec.armCuff;

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
  const EPS = 0.004;
  const posX = midX - dX * (t * armLen) + nx * (spec.armRadius + EPS - 0.008);
  const posY = midY - dY * (t * armLen) + ny * (spec.armRadius + EPS - 0.008);
  const posZ = midZ - dZ * (t * armLen);

  return { posX, posY, posZ };
}

console.log("=== COMPARING PLACEMENT TO MESH OUTER ===");
for (const app of ['longsleeve', 'hoodie', 'crewneck', 'shirt']) {
  console.log(`\n${app.toUpperCase()}:`);
  for (const [yStr, targetX] of Object.entries(MESH_OUTER[app])) {
    const yVal = parseFloat(yStr);
    // Find decalY parameter that corresponds to yVal:
    // posY = midY - dY * (t * armLen) ...
    // Let's test a few decalY values:
    for (const dy of [-0.35, -0.2, 0.0, 0.2, 0.35]) {
      const res = testPlacement(app, dy);
      if (Math.abs(res.posY - yVal) < 0.06) {
        console.log(`  decalY=${dy.toFixed(2)} -> Pos=[${res.posX.toFixed(3)}, ${res.posY.toFixed(3)}, ${res.posZ.toFixed(3)}], MeshOuterX=${targetX.toFixed(3)}, Diff=${(res.posX - targetX).toFixed(3)}`);
      }
    }
  }
}
