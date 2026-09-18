import { describe, it, expect } from "vitest";
import {
  getPanelGeometry,
  getPanelOrigin,
  getPrintBounds,
  unitsToCm,
  cmToUnits,
  EDITOR_PX_PER_CM,
} from "./patternGeometry";
import { decalToFabric, fabricToDecal } from "./patternSync";
import { APPAREL_PHYSICAL_SPECS, computePhysicalPrintDimensions } from "./scaleCalibration";
import type { ApparelType, DecalLayer } from "./constants";

describe("3D <-> 2D Pattern Studio Mathematical Parity", () => {
  const APPARELS: ApparelType[] = ["tshirt", "longsleeve", "hoodie", "crewneck", "shirt"];

  it("calculates accurate chest origins across all apparels", () => {
    for (const apparel of APPARELS) {
      const originFront = getPanelOrigin(apparel, "front");
      const geoFront = getPanelGeometry(apparel, "front");
      const spec = APPAREL_PHYSICAL_SPECS[apparel]!;

      // X origin must be exactly at horizontal center
      expect(originFront.xCm).toBeCloseTo(geoFront.wCm / 2, 4);
      expect(originFront.xPx).toBe(Math.round((geoFront.wCm / 2) * EDITOR_PX_PER_CM));

      // Y origin must be placed at collar + collarBaseline
      const expectedDistCollar = spec.collarBaselineY * spec.meshMultiplier;
      expect(originFront.yCm - originFront.collarYCm).toBeCloseTo(expectedDistCollar, 4);

      // Y origin must be within upper half of torso (chest area, not belly)
      expect(originFront.yCm).toBeLessThan(geoFront.hCm * 0.58);
      expect(originFront.yCm).toBeGreaterThan(15.0);
    }
  });

  it("maintains 1:1 distance from collar parity between 3D and 2D", () => {
    const apparel: ApparelType = "tshirt";
    const spec = APPAREL_PHYSICAL_SPECS[apparel]!;
    const origin = getPanelOrigin(apparel, "front");

    // Standard chest decal: x=0, y=0.02, scale=0.12 (A4-ish)
    const d3d: DecalLayer = {
      id: "test-decal-1",
      url: "https://example.com/art.png",
      name: "Chest Art",
      targetSide: "front",
      x: 0,
      y: 0.02,
      scale: 0.12,
      rotation: 0,
      opacity: 1,
    };

    // 1. Distance in 3D (from scaleCalibration)
    const dims3D = computePhysicalPrintDimensions(apparel, d3d.scale, d3d.y, 1.0, "front");
    const distCenter3D = (spec.collarBaselineY - d3d.y) * spec.meshMultiplier;
    expect(dims3D.offsetFromCollarCm).toBeCloseTo(distCenter3D, 1);

    // 2. Position in 2D Fabric (exact floating point)
    const exactCyCm = origin.yCm - unitsToCm(apparel, d3d.y);
    const distCenterExact2D = exactCyCm - origin.collarYCm;
    expect(distCenterExact2D).toBeCloseTo(distCenter3D, 4);

    // 3. Position in 2D Fabric editor pixel grid (8 px/cm grid snap <= 0.6 mm)
    const p = decalToFabric(apparel, d3d, 1.0);
    const fabricLeft = origin.xPx + p.cxPx;
    const fabricTop = origin.yPx + p.cyPx;
    const cyCm = fabricTop / EDITOR_PX_PER_CM;
    const distCenter2D = cyCm - origin.collarYCm;
    expect(distCenter2D).toBeCloseTo(distCenter3D, 1);
  });

  it("performs lossless round-trip 3D -> 2D -> 3D conversion", () => {
    const apparel: ApparelType = "tshirt";
    const origin = getPanelOrigin(apparel, "front");

    // Test multiple positions: center chest, pocket crest, lower chest
    const testCases = [
      { x: 0, y: 0.02, scale: 0.14, rot: 0 },
      { x: -0.12, y: -0.05, scale: 0.08, rot: 15 },
      { x: 0.10, y: 0.04, scale: 0.11, rot: -45 },
    ];

    for (const tc of testCases) {
      const d: DecalLayer = {
        id: "roundtrip-test",
        url: "https://example.com/logo.png",
        name: "Test",
        targetSide: "front",
        x: tc.x,
        y: tc.y,
        scale: tc.scale,
        rotation: tc.rot,
        opacity: 0.9,
      };

      // 3D -> 2D
      const p = decalToFabric(apparel, d, 1.5);
      const fabricLeft = origin.xPx + p.cxPx;
      const fabricTop = origin.yPx + p.cyPx;

      // 2D -> 3D
      const backCxPx = fabricLeft - origin.xPx;
      const backCyPx = fabricTop - origin.yPx;
      const patch = fabricToDecal(apparel, backCxPx, backCyPx, p.wPx, p.hPx, p.rotation, {
        aspectWoverH: 1.5,
        opacity: p.opacity,
      });

      expect(patch.x).toBeCloseTo(tc.x, 5);
      expect(patch.y).toBeCloseTo(tc.y, 5);
      expect(patch.scale).toBeCloseTo(tc.scale, 5);
      expect(patch.rotation).toBeCloseTo(tc.rot, 5);
      expect(patch.opacity).toBeCloseTo(0.9, 5);
    }
  });

  it("positions print bounds safely on the garment", () => {
    for (const apparel of APPARELS) {
      const pb = getPrintBounds(apparel, "front");
      const geo = getPanelGeometry(apparel, "front");

      // Print bounds must fit horizontally
      const halfW = pb.widthPx / 2;
      expect(pb.leftPx - halfW).toBeGreaterThanOrEqual(0);
      expect(pb.leftPx + halfW).toBeLessThanOrEqual(geo.wCm * EDITOR_PX_PER_CM);

      // Print bounds must fit vertically
      const halfH = pb.heightPx / 2;
      expect(pb.topPx - halfH).toBeGreaterThanOrEqual(0);
      expect(pb.topPx + halfH).toBeLessThanOrEqual(geo.hCm * EDITOR_PX_PER_CM);
    }
  });
});
