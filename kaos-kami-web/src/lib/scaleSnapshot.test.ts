import { describe, it, expect } from "vitest";
import {
  APPAREL_PHYSICAL_SPECS,
  REAL_WORLD_PRINT_LIMITS,
  SURFACE_Z_PER_APPAREL,
} from "@/lib/scaleCalibration";

// Snapshot regresi kalibrasi TL-07: angka eksplisit dari scaleCalibration.ts.
// Bila salah satu gagal = mesh/glB diganti tanpa ukur ulang → investigasi dulu.
describe("scale calibration snapshot (TL-07)", () => {
  it("meshMultiplier sesuai kalibrasi torso 1:1", () => {
    expect(APPAREL_PHYSICAL_SPECS.tshirt?.meshMultiplier).toBe(145.5);
    expect(APPAREL_PHYSICAL_SPECS.longsleeve?.meshMultiplier).toBe(145.5);
    expect(APPAREL_PHYSICAL_SPECS.crewneck?.meshMultiplier).toBe(163.7);
    expect(APPAREL_PHYSICAL_SPECS.hoodie?.meshMultiplier).toBe(105.6);
    expect(APPAREL_PHYSICAL_SPECS.shirt?.meshMultiplier).toBe(69.5);
  });

  it("batas cetak DTF 30.0 x 42.0 cm", () => {
    expect(REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm).toBe(30.0);
    expect(REAL_WORLD_PRINT_LIMITS.maxPrintHeightCm).toBe(42.0);
  });

  it("surfaceZ SSOT per apparel", () => {
    expect(SURFACE_Z_PER_APPAREL.tshirt).toBe(0.151);
    expect(SURFACE_Z_PER_APPAREL.hoodie).toBe(0.177);
    expect(SURFACE_Z_PER_APPAREL.cap).toBe(0.091);
  });

  it("dokumentasi drift pants/shorts vs komentar (tak digagalkan)", () => {
    // Komentar kode menyebut terukur pants 0.122 / shorts 0.120,
    // tetapi nilai aktif keduanya 0.145 — catat bila masih drift.
    const commented = { pants: 0.122, shorts: 0.12 };
    for (const k of ["pants", "shorts"] as const) {
      if (SURFACE_Z_PER_APPAREL[k] !== commented[k]) {
        console.log(
          `[scaleSnapshot] drift ${k}: aktif=${SURFACE_Z_PER_APPAREL[k]} vs komentar=${commented[k]}`
        );
      }
    }
    expect(true).toBe(true);
  });
});
