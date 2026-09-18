import * as THREE from 'three';

// If arm tilts by theta (in radians) from vertical:
// Arm up-vector is: Up = [-sin(theta), cos(theta), 0]
// Outer normal is: Normal = [-cos(theta), -sin(theta), 0]
// Right vector (forward in world): Right = [0, 0, 1]

function getEulerForArm(theta, isLeft = true) {
  // We want:
  // Matrix columns:
  // col 0 (local X) = Right
  // col 1 (local Y) = Up
  // col 2 (local Z) = Normal
  
  const sign = isLeft ? 1 : -1;
  const Right = new THREE.Vector3(0, 0, sign);
  const Up = new THREE.Vector3(-sign * Math.sin(theta), Math.cos(theta), 0);
  const Normal = new THREE.Vector3(-sign * Math.cos(theta), -sign * Math.sin(theta), 0);

  const mat = new THREE.Matrix4().makeBasis(Right, Up, Normal);
  const euler = new THREE.Euler().setFromRotationMatrix(mat, 'XYZ');
  return { euler, Right, Up, Normal };
}

console.log("=== Testing Arm Eulers ===");
for (const [name, thetaDeg] of [
  ['tshirt', 15],
  ['longsleeve', 19.5],
  ['hoodie', 22],
  ['crewneck', 32],
  ['shirt', 40]
]) {
  const theta = (thetaDeg * Math.PI) / 180;
  const left = getEulerForArm(theta, true);
  console.log(`${name} (${thetaDeg} deg):`);
  console.log(`  Euler: [${left.euler.x.toFixed(4)}, ${left.euler.y.toFixed(4)}, ${left.euler.z.toFixed(4)}]`);
  console.log(`  Normal (+Z): [${left.Normal.x.toFixed(3)}, ${left.Normal.y.toFixed(3)}, ${left.Normal.z.toFixed(3)}]`);
  console.log(`  Up (+Y):     [${left.Up.x.toFixed(3)}, ${left.Up.y.toFixed(3)}, ${left.Up.z.toFixed(3)}]`);
}
