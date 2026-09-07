import { describe, it, expect } from "vitest";
import { calculate6VariablePrice } from "@/lib/pricingEngine";

const DECAL_A4 = [
  {
    id: "d1",
    url: "https://example.com/a.png",
    name: "Grafis",
    targetSide: "front" as const,
    x: 0,
    y: -0.05,
    scale: 0.2, // ~20cm di kaos (101.8) -> A4
    rotation: 0,
    opacity: 1,
  },
];

describe("pricingEngine 6 variabel", () => {
  it("harga dasar kaos L + sablon A4", () => {
    const p = calculate6VariablePrice({
      apparelSlug: "tshirt",
      size: "L",
      colorHex: "#121214",
      decals: DECAL_A4,
      quantity: 1,
    });
    expect(p.basePriceIdr).toBe(149000);
    expect(p.totalSablonCostIdr).toBe(25000);
    expect(p.sizeSurchargeIdr).toBe(0);
    expect(p.discountPercentage).toBe(0);
  });

  it("surcharge selaras SSOT: XL gratis, XXL +10k, XXXL +20k", () => {
    const base = {
      apparelSlug: "tshirt" as const,
      colorHex: "#121214",
      decals: [],
      quantity: 1,
    };
    expect(calculate6VariablePrice({ ...base, size: "XL" }).sizeSurchargeIdr).toBe(0);
    expect(calculate6VariablePrice({ ...base, size: "XXL" }).sizeSurchargeIdr).toBe(10000);
    expect(calculate6VariablePrice({ ...base, size: "XXXL" }).sizeSurchargeIdr).toBe(20000);
  });

  it("pigmen +15k, diskon volume 12pcs -5%", () => {
    const p = calculate6VariablePrice({
      apparelSlug: "tshirt",
      size: "L",
      colorHex: "#E65100", // Signal Tangerine = pigmen khusus
      isSpecialPigment: true,
      decals: [],
      quantity: 12,
    });
    expect(p.colorTreatmentSurchargeIdr).toBe(15000);
    expect(p.discountPercentage).toBe(5);
    expect(p.totalPriceIdr).toBeLessThan(p.unitPriceBeforeDiscountIdr * 12);
  });
});
