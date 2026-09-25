import { describe, it, expect } from "vitest";
import {
  getDecal3DPlacement,
  computePhysicalPrintDimensions,
  maxDecalScaleUnits,
  clampDecalXY,
  APPAREL_PHYSICAL_SPECS,
} from "./scaleCalibration";
import type { DecalTargetSide } from "./constants";

describe("Side and Sleeve 3D Decal Placement & Anti-Bleed", () => {
  const apparels = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"] as const;

  it("ensures unclipped front and back projection depth (>= 0.30)", () => {
    for (const app of apparels) {
      const front = getDecal3DPlacement(app, "front", 0, 0, 0.105);
      const back = getDecal3DPlacement(app, "back", 0, 0, 0.105);

      expect(front.projectionDepth).toBeGreaterThanOrEqual(0.30);
      expect(back.projectionDepth).toBeGreaterThanOrEqual(0.30);
      expect(front.rotation[0]).toBe(0);
      expect(back.rotation[1]).toBeCloseTo(Math.PI, 4);
    }
  });

  it("ensures targeted projection depth for sleeves (<= 0.20) to prevent bleed into torso", () => {
    for (const app of apparels) {
      const leftSleeve = getDecal3DPlacement(app, "left_sleeve", 0, 0, 0.105);
      const rightSleeve = getDecal3DPlacement(app, "right_sleeve", 0, 0, 0.105);

      expect(leftSleeve.projectionDepth).toBeGreaterThanOrEqual(0.06);
      expect(leftSleeve.projectionDepth).toBeLessThanOrEqual(0.15);
      expect(rightSleeve.projectionDepth).toBeGreaterThanOrEqual(0.06);
      expect(rightSleeve.projectionDepth).toBeLessThanOrEqual(0.15);

      // Verify rotation aligns with arm slope (tilted outward along arm vector)
      expect(Math.abs(leftSleeve.rotation[0])).toBeCloseTo(1.5708, 3);
      expect(Math.abs(rightSleeve.rotation[0])).toBeCloseTo(1.5708, 3);
      expect(leftSleeve.rotation[1]).toBeLessThan(0); // tilted outward to left
      expect(rightSleeve.rotation[1]).toBeGreaterThan(0); // tilted outward to right

      // Verify X is outside torso (> 0.20)
      expect(Math.abs(leftSleeve.position[0])).toBeGreaterThan(0.20);
      expect(Math.abs(rightSleeve.position[0])).toBeGreaterThan(0.20);
    }
  });

  it("ensures perpendicular 90-degree projection for side prints (side_left & side_right)", () => {
    for (const app of apparels) {
      const sideLeft = getDecal3DPlacement(app, "side_left", 0, -0.05, 0.105);
      const sideRight = getDecal3DPlacement(app, "side_right", 0, -0.05, 0.105);

      // Perpendicular to torso (eliminating grazing angle shear)
      expect(sideLeft.rotation[1]).toBeCloseTo(-Math.PI / 2, 4);
      expect(sideRight.rotation[1]).toBeCloseTo(Math.PI / 2, 4);

      // Controlled depth (<= 0.20) to avoid penetrating through to opposite waist
      expect(sideLeft.projectionDepth).toBeLessThanOrEqual(0.20);
      expect(sideRight.projectionDepth).toBeLessThanOrEqual(0.20);

      // X position is at waist edge: persis SSOT sideAnchorX + EPS per apparel
      // (shirt 0.105 pasca-SWAP 20 Sep 2026 — torso hoodie lebih ramping dari fleece T-pose).
      const expectedEdge = (APPAREL_PHYSICAL_SPECS[app]?.sideAnchorX ?? 0.185) + 0.004;
      expect(sideLeft.position[0]).toBeCloseTo(-expectedEdge, 4);
      expect(sideRight.position[0]).toBeCloseTo(expectedEdge, 4);
    }
  });

  it("tracks sleeve slope on longsleeve as Y moves down the arm", () => {
    const topPlacement = getDecal3DPlacement("longsleeve", "left_sleeve", 0, 0.20, 0.15);
    const bottomPlacement = getDecal3DPlacement("longsleeve", "left_sleeve", 0, -0.20, 0.15);

    // As arm angles outward towards wrist, |X| should increase
    expect(Math.abs(bottomPlacement.position[0])).toBeGreaterThan(Math.abs(topPlacement.position[0]));
  });

  it("clamps and supports dimensions for side_left and side_right correctly", () => {
    for (const side of ["side_left", "side_right"] as DecalTargetSide[]) {
      const dims = computePhysicalPrintDimensions("tshirt", 0.08, -0.05, 1.0, side);
      expect(dims.widthCm).toBeGreaterThan(0);
      expect(dims.heightCm).toBeGreaterThan(0);
      expect(dims.isWithinProductionLimits).toBe(true);

      const maxScale = maxDecalScaleUnits("tshirt", side);
      expect(maxScale).toBeGreaterThan(0);

      const clamped = clampDecalXY(side, 0.5, 0.8);
      expect(Math.abs(clamped.x)).toBeLessThanOrEqual(0.10);
      expect(Math.abs(clamped.y)).toBeLessThanOrEqual(0.35);
    }
  });

  it("supports all 4 sides on cap with custom crown dimensions and positions", () => {
    for (const side of ["front", "back", "side_left", "side_right"] as DecalTargetSide[]) {
      const placement = getDecal3DPlacement("cap", side, 0, 0, 0.105);
      expect(placement.position).toBeDefined();
      expect(placement.projectionDepth).toBeGreaterThanOrEqual(0.12);

      const dims = computePhysicalPrintDimensions("cap", 0.04, 0, 1.0, side);
      expect(dims.widthCm).toBeGreaterThan(0);
      expect(dims.heightCm).toBeGreaterThan(0);
      expect(dims.isWithinProductionLimits).toBe(true);
    }
  });

  it("supports front, back, and extended side seams for pants and shorts", () => {
    for (const app of ["pants", "shorts"] as const) {
      for (const side of ["front", "back", "side_left", "side_right"] as DecalTargetSide[]) {
        const placement = getDecal3DPlacement(app, side, -0.11, 0, 0.145);
        expect(placement.position).toBeDefined();
        expect(placement.projectionDepth).toBeGreaterThanOrEqual(0.16);

        const dims = computePhysicalPrintDimensions(app, 0.08, 0, 1.0, side);
        expect(dims.widthCm).toBeGreaterThan(0);
        expect(dims.heightCm).toBeGreaterThan(0);
      }
    }
  });

  it("maintains strict bilateral symmetry between left and right sleeves across all 5 apparels", () => {
    for (const app of apparels) {
      for (const y of [0.35, 0.15, 0.0, -0.15, -0.35]) {
        const left = getDecal3DPlacement(app, "left_sleeve", 0, y, 0.105);
        const right = getDecal3DPlacement(app, "right_sleeve", 0, y, 0.105);

        expect(right.position[0]).toBeCloseTo(-left.position[0], 4);
        expect(right.position[1]).toBeCloseTo(left.position[1], 4);
        expect(right.position[2]).toBeCloseTo(left.position[2], 4);
        expect(right.projectionDepth).toBeCloseTo(left.projectionDepth, 4);
      }
    }
  });

  it("ensures sleeves cleanly span shoulder to cuff without zero-division or invalid coords", () => {
    for (const app of apparels) {
      const top = getDecal3DPlacement(app, "left_sleeve", 0, 0.35, 0.105);
      const mid = getDecal3DPlacement(app, "left_sleeve", 0, 0.0, 0.105);
      const bottom = getDecal3DPlacement(app, "left_sleeve", 0, -0.35, 0.105);

      expect(top.position[1]).toBeGreaterThan(mid.position[1]);
      expect(mid.position[1]).toBeGreaterThan(bottom.position[1]);
      expect(Math.abs(bottom.position[0])).toBeGreaterThan(Math.abs(top.position[0]));
    }
  });

  it("guarantees mid-sleeve (decalY=0.0) and cuff (decalY=-0.35) are completely outside torso", () => {
    for (const app of apparels) {
      const mid = getDecal3DPlacement(app, "left_sleeve", 0, 0.0, 0.105);
      const cuff = getDecal3DPlacement(app, "left_sleeve", 0, -0.35, 0.105);

      // Mid sleeve must be well outside torso (|X| >= 0.23, away from torso |X| <= 0.16)
      expect(Math.abs(mid.position[0])).toBeGreaterThanOrEqual(0.23);
      // Cuff must reach the bottom/end of the sleeve
      expect(Math.abs(cuff.position[0])).toBeGreaterThanOrEqual(0.25);
      expect(cuff.position[1]).toBeLessThanOrEqual(-0.04);
    }
  });
});

