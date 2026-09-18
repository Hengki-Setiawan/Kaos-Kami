console.log("=== COLLAR OFFSET TEST ===");
// If decal is at y = 0.02 (standard chest position)
// With current multiplier:
// normalizedDistance = 0.165 - 0.02 = 0.145
// offsetFromCollarCm = 0.145 * 78.4 = 11.36 cm
console.log("Current: (0.165 - 0.02) * 78.4 =", (0.145 * 78.4).toFixed(1), "cm");

// With 145.5:
// If collarBaselineY = 0.11 (the actual 3D front collar):
// normalizedDistance = 0.11 - 0.02 = 0.09
// offsetFromCollarCm = 0.09 * 145.5 = 13.09 cm
console.log("Proposed: (0.11 - 0.02) * 145.5 =", (0.09 * 145.5).toFixed(1), "cm");
console.log("Real world standard distance from collar to mid chest print:", "5 to 8 cm for top edge, 12 to 15 cm for center");
