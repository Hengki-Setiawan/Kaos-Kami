import * as THREE from "three";
import { getDecal3DPlacement, surfaceZForApparel, APPAREL_PHYSICAL_SPECS } from "../kaos-kami-web/src/lib/scaleCalibration.ts";

function testApparelSync(apparel, side, decalX, decalY) {
  const surfaceZ = surfaceZForApparel(apparel);
  const placement = getDecal3DPlacement(apparel, side, decalX, decalY, surfaceZ);

  // Decal position in mesh-local coordinates
  const decalPosLocal = new THREE.Vector3(...placement.position);

  // In Model component:
  // group position = [modelPosX, modelPosY - 0.05, 0]
  // mesh position = [0, 0, 0] (geometry vertices were translated by crownYOffset during extraction)
  // Therefore, the decal projector box in world space is centered at:
  const modelPosY = 0;
  const decalPosWorld = new THREE.Vector3(
    decalPosLocal.x,
    modelPosY - 0.05 + decalPosLocal.y,
    decalPosLocal.z
  );

  // In DecalGizmo:
  // gizmoPos = [groupPosX + localPos[0] * groupScale, groupPosY + localPos[1] * groupScale, localPos[2] * groupScale]
  // where groupPosY = modelPosY - 0.05 + capOffset
  const capOffset = apparel === "cap" ? -0.11 : 0;
  const gizmoPosWorld = new THREE.Vector3(
    decalPosLocal.x,
    modelPosY - 0.05 + capOffset + decalPosLocal.y,
    decalPosLocal.z
  );

  const diff = decalPosWorld.distanceTo(gizmoPosWorld);
  console.log(`[${apparel} - ${side}] Decal world: [${decalPosWorld.toArray().map(n => n.toFixed(3)).join(", ")}], Gizmo world: [${gizmoPosWorld.toArray().map(n => n.toFixed(3)).join(", ")}], Diff: ${diff.toFixed(4)}`);
}

console.log("=== Checking Decal Projector vs Gizmo World Center Alignment ===");
for (const app of ["tshirt", "shirt", "longsleeve", "hoodie", "crewneck"]) {
  testApparelSync(app, "front", 0, -0.05);
  testApparelSync(app, "side_left", 0, -0.05);
  testApparelSync(app, "left_sleeve", 0, 0);
}
