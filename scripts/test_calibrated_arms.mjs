import * as THREE from 'three';

// Let's verify our new Euler formulas and positions:
function getEuler(thetaDeg, isLeft = true) {
  const theta = (thetaDeg * Math.PI) / 180;
  const sign = isLeft ? 1 : -1;
  const Right = new THREE.Vector3(0, 0, sign);
  const Up = new THREE.Vector3(-sign * Math.sin(theta), Math.cos(theta), 0);
  const Normal = new THREE.Vector3(-sign * Math.cos(theta), -sign * Math.sin(theta), 0);

  const mat = new THREE.Matrix4().makeBasis(Right, Up, Normal);
  const e = new THREE.Euler().setFromRotationMatrix(mat, 'XYZ');
  return [Number(e.x.toFixed(4)), Number(e.y.toFixed(4)), Number(e.z.toFixed(4))];
}

const apparels = {
  tshirt: { theta: 15, shoulder: [-0.170, 0.100, -0.020], cuff: [-0.245, 0.000, -0.020], outerX: 0.23, anchorX: 0.17 },
  longsleeve: { theta: 19.5, shoulder: [-0.170, 0.100, -0.020], cuff: [-0.290, -0.300, -0.010], outerX: 0.29, anchorX: 0.17 },
  hoodie: { theta: 22, shoulder: [-0.175, 0.100, -0.030], cuff: [-0.300, -0.250, 0.004], outerX: 0.32, anchorX: 0.18 },
  crewneck: { theta: 32, shoulder: [-0.170, 0.100, -0.020], cuff: [-0.360, -0.250, 0.015], outerX: 0.34, anchorX: 0.18 },
  shirt: { theta: 38, shoulder: [-0.180, 0.100, -0.035], cuff: [-0.400, -0.220, 0.025], outerX: 0.38, anchorX: 0.20 },
};

console.log("=== CALIBRATED ARM SPECS ===");
for (const [name, cfg] of Object.entries(apparels)) {
  const eulerLeft = getEuler(cfg.theta, true);
  const eulerRight = getEuler(cfg.theta, false);
  console.log(`${name}:`);
  console.log(`  armEulerLeft: [${eulerLeft.join(', ')}],`);
  console.log(`  armEulerRight: [${eulerRight.join(', ')}],`);
}
