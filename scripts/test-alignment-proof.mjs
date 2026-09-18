import * as THREE from "three";
import { APPAREL_PHYSICAL_SPECS, surfaceZForApparel, getDecal3DPlacement } from "../kaos-kami-web/src/lib/scaleCalibration.ts";

const apparels = ["tshirt", "shirt", "longsleeve", "hoodie", "crewneck"];

console.log("=== Checking Alignment between Decal and DecalGizmo ===");

for (const app of apparels) {
  const surfaceZ = surfaceZForApparel(app);
  const decalX = -0.075; // Saku kiri
  const decalY = 0.05;

  const placement = getDecal3DPlacement(app, "front", decalX, decalY, surfaceZ);
  console.log(`\nApparel: ${app}`);
  console.log(`  Placement position: [${placement.position.map(n => n.toFixed(4)).join(", ")}]`);
  console.log(`  Placement depth: ${placement.projectionDepth}`);
}
