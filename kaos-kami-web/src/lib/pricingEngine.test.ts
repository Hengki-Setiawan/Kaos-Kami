import { describe, it, expect } from "vitest";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";

const DECAL_A4 = [
  {
    id: "d1",
    url: "https://example.com/a.png",
    name: "Grafis",
    targetSide: "front" as const,
    x: 0,
    y: -0.05,
    scale: 0.14, // 0.14 × 145.5 = ~20.4cm di kaos -> A4 (15.1 - 25.0 cm)
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
    expect(p.basePriceIdr).toBe(79000);
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

describe("pricingEngine batas R5 (U-031/U-027/U-029)", () => {
  const base = {
    apparelSlug: "tshirt" as const,
    size: "L",
    colorHex: "#121214",
    decals: [],
  };
  // Unit acuan kaos L polos: 79000 + 10000 (default combed-24s) = 89000.
  it("qty 5 -> 0%, qty 6 -> 5% (batas bawah bulk)", () => {
    expect(calculate6VariablePrice({ ...base, quantity: 5 }).discountPercentage).toBe(0);
    const p = calculate6VariablePrice({ ...base, quantity: 6 });
    expect(p.discountPercentage).toBe(5);
    expect(p.unitPriceBeforeDiscountIdr).toBe(89000);
    expect(p.totalPriceIdr).toBe(84550 * 6);
    expect(p.discountAmountIdr).toBe(4450 * 6);
  });
  it("qty 12 -> 5%, qty 13 -> 12%, qty 50 -> 12%, qty 51 -> 20%", () => {
    expect(calculate6VariablePrice({ ...base, quantity: 12 }).discountPercentage).toBe(5);
    expect(calculate6VariablePrice({ ...base, quantity: 13 }).discountPercentage).toBe(12);
    const p50 = calculate6VariablePrice({ ...base, quantity: 50 });
    expect(p50.discountPercentage).toBe(12); // batas ATAS eksklusif: 50 tepat masih 12%
    expect(p50.totalPriceIdr).toBe(78320 * 50);
    const p51 = calculate6VariablePrice({ ...base, quantity: 51 });
    expect(p51.discountPercentage).toBe(20);
    expect(p51.totalPriceIdr).toBe(71200 * 51);
  });
  it("GSM: 30s +0, default 24s +10k, 20s +15k, 16s +25k", () => {
    const q = { ...base, quantity: 1 };
    expect(calculate6VariablePrice({ ...q, fabricThicknessSlug: "combed-30s" }).fabricThicknessSurchargeIdr).toBe(0);
    expect(calculate6VariablePrice({ ...q }).fabricThicknessSurchargeIdr).toBe(10000);
    expect(calculate6VariablePrice({ ...q, fabricThicknessSlug: "combed-20s" }).fabricThicknessSurchargeIdr).toBe(15000);
    expect(calculate6VariablePrice({ ...q, fabricThicknessSlug: "combed-16s" }).fabricThicknessSurchargeIdr).toBe(25000);
  });
  it("longsleeve +20k, tshirt +0", () => {
    const p = calculate6VariablePrice({ ...base, apparelSlug: "longsleeve", quantity: 1 });
    expect(p.isLongsleeve).toBe(true);
    expect(p.sleeveSurchargeIdr).toBe(20000);
    const t = calculate6VariablePrice({ ...base, quantity: 1 });
    expect(t.isLongsleeve).toBe(false);
    expect(t.sleeveSurchargeIdr).toBe(0);
  });
  it("size 3XL/xxxl/trim-case +20k/+20k/+10k", () => {
    const q = { ...base, quantity: 1 };
    expect(calculate6VariablePrice({ ...q, size: "3XL" }).sizeSurchargeIdr).toBe(20000);
    expect(calculate6VariablePrice({ ...q, size: " xxxl " }).sizeSurchargeIdr).toBe(20000);
    expect(calculate6VariablePrice({ ...q, size: "xxl" }).sizeSurchargeIdr).toBe(10000);
  });
  it("skala raksasa dijepit 30cm -> tier A3 35k", () => {
    const p = calculate6VariablePrice({
      ...base,
      quantity: 1,
      decals: [{ id: "d9", url: "https://example.com/b.png", name: "Raksasa", targetSide: "front" as const, x: 0, y: 0, scale: 0.5, rotation: 0, opacity: 1 }],
    });
    expect(p.decalLayers[0]?.tier).toBe("A3");
    expect(p.totalSablonCostIdr).toBe(35000);
  });
  it("multi-decal A6+A4 = 10k+25k = 35k", () => {
    const p = calculate6VariablePrice({
      ...base,
      quantity: 1,
      decals: [
        { id: "d1", url: "https://example.com/k.png", name: "Kecil", targetSide: "front" as const, x: -0.1, y: 0.05, scale: 0.05, rotation: 0, opacity: 1 },
        { id: "d2", url: "https://example.com/b.png", name: "Besar", targetSide: "back" as const, x: 0, y: -0.05, scale: 0.14, rotation: 0, opacity: 1 },
      ],
    });
    expect(p.decalLayers.map((d) => d.tier)).toEqual(["A6", "A4"]);
    expect(p.totalSablonCostIdr).toBe(35000);
  });
  it("hood non-hoodie + slug asing -> throw 400", () => {
    const hood = { id: "h", url: "https://example.com/h.png", name: "H", targetSide: "hood" as const, x: 0, y: 0, scale: 0.1, rotation: 0, opacity: 1 };
    let s1: number | undefined;
    try {
      calculate6VariablePrice({ ...base, quantity: 1, decals: [hood] });
    } catch (e) {
      s1 = (e as { status?: number }).status;
    }
    expect(s1).toBe(400);
    let s2: number | undefined;
    try {
      calculate6VariablePrice({ ...base, apparelSlug: "dress" as never, quantity: 1 });
    } catch (e) {
      s2 = (e as { status?: number }).status;
    }
    expect(s2).toBe(400);
  });
  it("pigmen false + acid-wash legacy -> +0", () => {
    expect(calculate6VariablePrice({ ...base, quantity: 1 }).colorTreatmentSurchargeIdr).toBe(0);
    expect(materialFinishToPricing("acid-wash")).toEqual({ fabricThicknessSlug: "combed-24s" });
    expect(materialFinishToPricing("french-terry")).toEqual({ fabricThicknessSlug: "french-terry-380" });
    expect(materialFinishToPricing("poplin")).toEqual({ fabricThicknessSlug: "combed-30s" });
  });
  it("hoodie: pigmen terakumulasi di atas base (unit-base = 25k)", () => {
    const p = calculate6VariablePrice({ apparelSlug: "hoodie", size: "L", colorHex: "#E65100", isSpecialPigment: true, decals: [], quantity: 1 });
    expect(p.unitPriceBeforeDiscountIdr - p.basePriceIdr).toBe(25000); // 10k kain + 15k pigmen
  });
});
