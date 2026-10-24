import { describe, it, expect } from "vitest";
import { formatStockMarker, hasOversellFlag, parseStockMarker } from "./stockMarker";

describe("stockMarker", () => {
  it("format mengabaikan entri tak valid dan mengembalikan null bila kosong", () => {
    expect(formatStockMarker([])).toBeNull();
    expect(formatStockMarker([{ variantId: "", qty: 2 }])).toBeNull();
    expect(formatStockMarker([{ variantId: "v1", qty: 0 }])).toBeNull();
    expect(formatStockMarker([{ variantId: "v1", qty: -3 }])).toBeNull();
    expect(formatStockMarker([{ variantId: "v1", qty: Number.NaN }])).toBeNull();
  });

  it("round-trip format → parse mempertahankan varian dan qty", () => {
    const marker = formatStockMarker([
      { variantId: "variant_a", qty: 2 },
      { variantId: "variant_b", qty: 1 },
    ]);
    expect(marker).toBe("[STOCK_OK variant_a:2,variant_b:1]");
    expect(parseStockMarker(`catatan | ${marker}`)).toEqual([
      { variantId: "variant_a", qty: 2 },
      { variantId: "variant_b", qty: 1 },
    ]);
  });

  it("parse menjumlahkan qty duplikat untuk varian yang sama", () => {
    expect(parseStockMarker("[STOCK_OK v1:2,v1:3]")).toEqual([{ variantId: "v1", qty: 5 }]);
  });

  it("parse mengabaikan pasangan rusak tanpa melempar", () => {
    expect(parseStockMarker("[STOCK_OK abc,v2:, :4, v3:-1, v4:0, v5:NaN, v6:2]")).toEqual([
      { variantId: "v6", qty: 2 },
    ]);
  });

  it("parse membaca marker walau ada penanda oversell setelahnya", () => {
    const notes = "[STOCK_OK v1:1] [REVIEW:OVERSELL v2]";
    expect(parseStockMarker(notes)).toEqual([{ variantId: "v1", qty: 1 }]);
    expect(hasOversellFlag(notes)).toBe(true);
  });

  it("tanpa marker / notes null → array kosong dan oversell false", () => {
    expect(parseStockMarker(null)).toEqual([]);
    expect(parseStockMarker("")).toEqual([]);
    expect(parseStockMarker("Catatan biasa").length).toBe(0);
    expect(hasOversellFlag(null)).toBe(false);
    expect(hasOversellFlag("")).toBe(false);
  });
});
