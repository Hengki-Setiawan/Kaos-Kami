import { describe, it, expect } from "vitest";
import {
  getApparelSizing,
  getSizeDimensions,
  formatQuickDimensions,
  APPAREL_SIZING_DATA,
} from "./apparelSizing";

describe("Apparel Sizing System (SSOT)", () => {
  const apparelSlugs = [
    "tee",
    "tshirt",
    "hoodie",
    "sweater",
    "crewneck",
    "longsleeve",
    "jacket",
    "cap",
    "pants",
    "shorts",
  ];

  it("retrieves valid sizing specifications for all apparel variants including aliases", () => {
    for (const slug of apparelSlugs) {
      const spec = getApparelSizing(slug);
      expect(spec).toBeDefined();
      expect(spec.displayName).toBeTruthy();
      expect(spec.sizeList.length).toBeGreaterThan(0);
      expect(spec.measuringGuide.length).toBeGreaterThan(0);
      expect(Object.keys(spec.dimensions).length).toBeGreaterThan(0);

      // Verify each size in sizeList has corresponding dimensions
      for (const sz of spec.sizeList) {
        const dim = getSizeDimensions(slug, sz);
        expect(dim).toBeDefined();
        expect(dim.size).toBe(sz);
        expect(dim.bodyLengthCm).toBeGreaterThan(0);
      }
    }
  });

  it("formats quick 1-line dimensions cleanly for UI display", () => {
    const teeDim = formatQuickDimensions("tee", "L");
    expect(teeDim).toContain("cm");
    expect(teeDim).toContain("Dada");

    const pantsDim = formatQuickDimensions("pants", "L");
    expect(pantsDim).toContain("cm");
    expect(pantsDim).toContain("Pinggang");

    const capDim = formatQuickDimensions("cap", "ALL SIZE");
    expect(capDim).toContain("cm");
    expect(capDim).toContain("Lingkar");
  });

  it("safely falls back to defaults for unknown apparel or size", () => {
    const unknownSpec = getApparelSizing("unknown_item");
    expect(unknownSpec).toBeDefined();
    expect(unknownSpec.apparelSlug).toBe("tshirt");

    const unknownDim = getSizeDimensions("tee", "UNKNOWN_SIZE");
    expect(unknownDim).toBeDefined();
  });
});
