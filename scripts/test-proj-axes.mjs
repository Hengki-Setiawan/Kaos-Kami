import * as THREE from "three";

const euler = new THREE.Euler(1.5708, -1.2305, 1.5708, "XYZ");
const m = new THREE.Matrix4().makeRotationFromEuler(euler);

// In projector space, Z axis in world coordinates:
const zAxisProjInWorld = new THREE.Vector3(0, 0, 1).applyMatrix4(m);
const xAxisProjInWorld = new THREE.Vector3(1, 0, 0).applyMatrix4(m);
const yAxisProjInWorld = new THREE.Vector3(0, 1, 0).applyMatrix4(m);

console.log("Projector Z axis in World:", zAxisProjInWorld);
console.log("Projector X axis in World:", xAxisProjInWorld);
console.log("Projector Y axis in World:", yAxisProjInWorld);
