const spec = {
  name: "Kaos Polos & Custom Kaos Kami",
  chestWidthCm: 56.0,
  bodyLengthCm: 74.0,
  meshMultiplier: 78.4,
};

console.log("=== SCALE CALIBRATION ANALYSIS ===");
console.log("tshirt chestWidthCm spec:", spec.chestWidthCm);
console.log("tshirt meshMultiplier:", spec.meshMultiplier);

// In 3D:
// Torso width of tee-basic.glb:
const torsoWidth3DUnits = 0.35; // from our measurement of tee-basic.glb
const totalMeshWidth3DUnits = 0.7146; // including sleeves

console.log("\n--- In 3D (World Units) ---");
console.log("Total 3D Mesh Width (with sleeves):", totalMeshWidth3DUnits);
console.log("Actual 3D Torso Width (chest seam-to-seam):", torsoWidth3DUnits);

// If a decal has scale = 0.12 (as uploaded default):
const decalScale = 0.12;
console.log("Decal 3D scale:", decalScale);
const ratioIn3D = decalScale / torsoWidth3DUnits;
console.log("Sticker width relative to 3D Torso:", (ratioIn3D * 100).toFixed(1) + "%");

// In 2D Pattern:
const geo = { wCm: 56.0, hCm: 74.0 };
console.log("\n--- In 2D (Pola Datar) ---");
console.log("2D Silhouette Width (wCm):", geo.wCm, "cm");
const decalWidthCm = decalScale * spec.meshMultiplier;
console.log("Decal Width in cm (scale * multiplier):", decalWidthCm.toFixed(2), "cm");
const ratioIn2D = decalWidthCm / geo.wCm;
console.log("Sticker width relative to 2D Torso:", (ratioIn2D * 100).toFixed(1) + "%");

console.log("\n--- DISCREPANCY FACTOR ---");
console.log("Ratio in 3D / Ratio in 2D =", (ratioIn3D / ratioIn2D).toFixed(2) + "x!");
console.log("The sticker in 3D appears", (ratioIn3D / ratioIn2D).toFixed(2) + "x BIGGER on the shirt than in 2D!");
