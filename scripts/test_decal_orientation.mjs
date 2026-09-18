import * as THREE from 'three';

// Let's test what Euler angles produce:
// 1. Proj Normal (+Z): pointing towards (+X, -armAngle, 0) or (-X, -armAngle, 0) for left arm
// 2. Proj Up (+Y): pointing along the arm up-direction: (+sin(angle), cos(angle), 0)
// 3. Proj Right (+X): pointing forward (0, 0, 1)

function computeArmEuler(armAngleRad, isLeft = true) {
  // armAngleRad is angle from vertical (e.g. 20 deg = 0.349 rad, 34 deg = 0.593 rad, 42 deg = 0.733 rad)
  // For left arm:
  // Arm bone goes down-and-left: dir = [-sin(angle), -cos(angle), 0]
  // Arm up-vector is opposite: up = [sin(angle), cos(angle), 0]
  // Normal perpendicular to arm pointing left (outward): norm = [-cos(angle), sin(angle), 0]
  // Forward vector: fwd = [0, 0, 1]

  // In Decal:
  // Decal projection direction is local +Z. So we want local +Z to point INTO the arm (opposite to outward normal),
  // OR local +Z pointing OUTWARD with polygon offset / depthTest.
  // Wait! In Three.js DecalGeometry:
  // DecalGeometry projects along the projector's local -Z or +Z?
  // Let's check Three.js DecalGeometry documentation or implementation!
}

console.log("Checking DecalGeometry orientation...");
