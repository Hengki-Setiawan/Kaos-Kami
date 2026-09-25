import { describe, it, expect } from "vitest";
import { packGangSheet } from "@/lib/gangPacker";
import { evaluatePrintQuality } from "@/lib/dpiAnalyzer";
import { exportScaleFactor } from "@/lib/printUV";

// R5: gang-sheet packing + DPI + skala ekspor — math murni (tanpa GLB/DOM).
const mk = (o: Partial<{ id: string; wMm: number; hMm: number; qty: number }>) => ({
  id: o.id ?? "r1",
  wMm: o.wMm ?? 100,
  hMm: o.hMm ?? 100,
  qty: o.qty ?? 1,
  label: "t",
  orderNumber: "KK-T",
  masterUrl: null,
});

describe("gangDpi: packGangSheet", () => {
  it("kosong -> 0 bin 0 util", () => {
    const r = packGangSheet([]);
    expect(r.bins).toHaveLength(0);
    expect(r.utilizationPct).toBe(0);
    expect(r.unplaced).toHaveLength(0);
  });
  it("1 rect 100x100 qty1 -> 1 bin dalam margin", () => {
    const r = packGangSheet([mk({})]);
    expect(r.bins).toHaveLength(1);
    const p = r.bins[0]?.[0];
    expect(p?.rot).toBe(false);
    expect(p!.xMm).toBeGreaterThanOrEqual(10);
    expect(p!.yMm).toBeGreaterThanOrEqual(10);
    expect(p!.xMm + p!.wMm).toBeLessThanOrEqual(1000 - 10);
  });
  it("qty3 -> 3 penempatan id sama", () => {
    const r = packGangSheet([mk({ qty: 3 })]);
    const all = r.bins.flat();
    expect(all).toHaveLength(3);
    expect(all.every((p) => p.id === "r1")).toBe(true);
  });
  it("qty 0/negatif -> 0 bin 0 unplaced; dimensi 0/negatif -> unplaced", () => {
    expect(packGangSheet([mk({ qty: 0 })]).bins).toHaveLength(0);
    expect(packGangSheet([mk({ qty: -2 })]).unplaced).toHaveLength(0);
    expect(packGangSheet([mk({ wMm: 0 })]).unplaced).toHaveLength(1);
    expect(packGangSheet([mk({ hMm: -5 })]).unplaced).toHaveLength(1);
  });
  it("2000x100 default -> unplaced (guna 980x560)", () => {
    expect(packGangSheet([mk({ wMm: 2000 })]).unplaced).toHaveLength(1);
  });
  it("500x600: terputar lolos; tanpa rotasi -> unplaced", () => {
    const r = packGangSheet([mk({ wMm: 500, hMm: 600 })]);
    expect(r.unplaced).toHaveLength(0);
    expect(r.bins[0]?.[0]?.rot).toBe(true);
    const nr = packGangSheet([{ ...mk({ wMm: 500, hMm: 600 }), allowRotation: false }]);
    expect(nr.unplaced).toHaveLength(1);
  });
  it("deterministik: urutan dibalik -> multiset sama", () => {
    const a = [mk({ id: "a", wMm: 200, hMm: 150 }), mk({ id: "b", wMm: 300, hMm: 100 }), mk({ id: "c", wMm: 120, hMm: 120 })];
    const norm = (r: ReturnType<typeof packGangSheet>) =>
      JSON.stringify(r.bins.flat().map((p) => [p.id, p.wMm, p.hMm, p.rot]).sort());
    const r1 = packGangSheet(a);
    const r2 = packGangSheet([...a].reverse());
    expect(norm(r1)).toBe(norm(r2));
    expect(r1.utilizationPct).toBe(r2.utilizationPct);
  });
});

describe("gangDpi: evaluatePrintQuality", () => {
  it("1200px/28.5cm -> ~107 POOR", () => {
    const r = evaluatePrintQuality(1200, 28.5);
    expect(r.dpi).toBe(107);
    expect(r.tier).toBe("POOR");
  });
  it("3543px/30cm -> 300 EXCELLENT (batas)", () => {
    const r = evaluatePrintQuality(3543, 30);
    expect(r.dpi).toBe(300);
    expect(r.tier).toBe("EXCELLENT");
  });
  it("dua sumbu -> min (2000/20 + 1500/20 -> 191 GOOD; 127 tetap POOR)", () => {
    const r = evaluatePrintQuality(2000, 20, 1500, 20);
    expect(r.dpi).toBe(191);
    expect(r.tier).toBe("GOOD");
    const poor = evaluatePrintQuality(2000, 20, 1000, 20);
    expect(poor.dpi).toBe(127);
    expect(poor.tier).toBe("POOR"); // <150 walau sumbu lain 254
  });
  it("px 0/NaN -> dpi 0 POOR tanpa NaN", () => {
    for (const bad of [0, NaN, -10]) {
      const r = evaluatePrintQuality(bad, 28.5);
      expect(r.dpi).toBe(0);
      expect(r.tier).toBe("POOR");
      expect(Number.isNaN(r.dpi)).toBe(false);
    }
  });
});

describe("gangDpi: exportScaleFactor", () => {
  it("kecil -> 1 (tak pernah upscale); 0 -> 1 aman", () => {
    expect(exportScaleFactor(1000, 1000)).toBe(1);
    expect(exportScaleFactor(0, 0)).toBe(1);
    expect(exportScaleFactor(-5, 100)).toBe(1);
  });
  it("8000x2000 -> 0.5 (sisi); A3 3543x4960 proporsional", () => {
    expect(exportScaleFactor(8000, 2000)).toBe(0.5);
    const k = exportScaleFactor(3543, 4960);
    expect(k).toBeLessThan(1);
    expect(3543 * k).toBeLessThanOrEqual(4000);
    expect(4960 * k).toBeLessThanOrEqual(4000 + 1);
  });
});
