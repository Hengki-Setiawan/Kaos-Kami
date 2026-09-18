import { describe, it, expect } from "vitest";
import {
  classifyPrintTierByCm,
  classifyPrintTierByScale,
  printTierCost,
} from "@/lib/printTiers";
import { maxDecalScaleUnits } from "@/lib/scaleCalibration";

describe("printTiers SSOT", () => {
  it("batas tier by-cm sesuai standar DTF", () => {
    expect(classifyPrintTierByCm(10)).toBe("A6");
    expect(classifyPrintTierByCm(10.1)).toBe("A5");
    expect(classifyPrintTierByCm(15)).toBe("A5");
    expect(classifyPrintTierByCm(15.1)).toBe("A4");
    expect(classifyPrintTierByCm(25)).toBe("A4");
    expect(classifyPrintTierByCm(25.1)).toBe("A3");
    expect(classifyPrintTierByCm(30)).toBe("A3");
  });

  it("harga tier sesuai price list", () => {
    expect(printTierCost("A6")).toBe(10000);
    expect(printTierCost("A5")).toBe(15000);
    expect(printTierCost("A4")).toBe(25000);
    expect(printTierCost("A3")).toBe(35000);
  });

  it("by-scale konsisten dengan by-cm via multiplier terukur (Fase Kalibrasi: tshirt 145.5)", () => {
    // 0.11 × 145.5 = 16.0cm -> A4 di kedua jalur
    expect(classifyPrintTierByScale(0.11, "tshirt")).toBe(
      classifyPrintTierByCm(0.11 * 145.5)
    );
    expect(classifyPrintTierByScale(0.11, "tshirt")).toBe("A4");
  });

  it("maxDecalScaleUnits mencapai batas cetak fisik per apparel", () => {
    // tshirt 30/145.5 ≈ 0.2062; hoodie 28/105.6 ≈ 0.2652
    expect(maxDecalScaleUnits("tshirt", "front")).toBeCloseTo(30 / 145.5, 4);
    expect(maxDecalScaleUnits("hoodie", "front")).toBeCloseTo(28 / 105.6, 4);
    expect(maxDecalScaleUnits("shirt", "front")).toBeCloseTo(14 / 69.5, 4);
  });
});
