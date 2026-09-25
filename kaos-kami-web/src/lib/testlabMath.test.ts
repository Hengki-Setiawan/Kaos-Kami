import { describe, it, expect } from "vitest";
import { windDirectionToVec, WIND_GUST } from "@/lib/3d/windDirection";
import {
  grazingToOffset,
  estimateLux,
  QC_GRAZING_PRESETS,
  QC_DEFECTS,
} from "@/lib/qcLighting";
import {
  elongationPercent,
  recoveryEstimate,
  U_MAX_ELONG,
  POISSON_EFF,
} from "@/lib/3d/stretchPhysics";

describe("TestLab math murni (tanpa GPU)", () => {
  it("vektor arah angin ternormalisasi + konvensi gerak udara", () => {
    expect(windDirectionToVec("front").toArray()).toEqual([0, 0, -1]);
    expect(windDirectionToVec("side").toArray()).toEqual([-1, 0, 0]);
    expect(windDirectionToVec("up").toArray()).toEqual([0, 1, 0]);
    for (const d of ["front", "side", "up"] as const) {
      expect(windDirectionToVec(d).length()).toBeCloseTo(1, 6);
    }
  });

  it("gust deterministik + rentang [0.2, 1.0] + guard non-finite", () => {
    expect(WIND_GUST(1.0)).toBe(WIND_GUST(1.0));
    expect(WIND_GUST(NaN)).toBe(0.6);
    for (const t of [0, 0.5, 1, 2, 10, 100]) {
      const g = WIND_GUST(t);
      expect(g).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(g).toBeLessThanOrEqual(1.0 + 1e-9);
    }
  });

  it("grazing 90° = tegak lurus (+Z), 0° = sejajar permukaan", () => {
    const d90 = grazingToOffset(90, 1.6, 90);
    expect(d90.x).toBeCloseTo(0, 6);
    expect(d90.y).toBeCloseTo(0, 6);
    expect(d90.z).toBeCloseTo(1.6, 6);
    const g0 = grazingToOffset(0, 1.6, 90);
    expect(g0.z).toBeCloseTo(0, 6);
    expect(Math.hypot(g0.x, g0.y)).toBeCloseTo(1.6, 6);
    const g30 = grazingToOffset(30, 1.6, 90);
    expect(g30.length()).toBeCloseTo(1.6, 6);
    // Input rusak → fallback aman, tak pernah NaN/throw.
    expect(grazingToOffset(NaN).length()).toBeCloseTo(1.6, 6);
    expect(grazingToOffset(-45).z).toBeGreaterThanOrEqual(0);
  });

  it("lux terkalibrasi booth: 7.2 pada 1.6m ≈ 1500", () => {
    expect(estimateLux(7.2, 1.6)).toBe(1500);
    // Fisik E≈I/d²: jarak 2× → lux ÷4.
    expect(estimateLux(7.2, 3.2)).toBe(375);
    expect(estimateLux(0, 1.6)).toBe(0);
    expect(estimateLux(NaN, NaN)).toBe(0);
  });

  it("preset grazing + defect stabil (kontrak job ticket)", () => {
    expect(QC_GRAZING_PRESETS.map((p) => p.deg)).toEqual([15, 30, 45, 90]);
    expect([...QC_DEFECTS]).toEqual(["lubang", "noda", "misprint", "cracking"]);
  });

  it("SSOT stretch: elongasi per arah + recovery D2594", () => {
    expect(U_MAX_ELONG).toEqual({ horizontal: 0.3, vertical: 0.18, biaxial: 0.2 });
    expect(POISSON_EFF).toBeGreaterThan(0.3);
    expect(POISSON_EFF).toBeLessThan(0.5);
    expect(elongationPercent("horizontal", 1)).toBeCloseTo(30, 6);
    expect(elongationPercent("vertical", 1)).toBeCloseTo(18, 6);
    expect(elongationPercent("biaxial", 0.5)).toBeCloseTo(10, 6);
    expect(recoveryEstimate(0)).toBeCloseTo(96, 6);
    expect(recoveryEstimate(1)).toBeCloseTo(82, 6);
    // Monoton turun: makin ditarik, pemulihan makin kecil.
    expect(recoveryEstimate(0.25)).toBeGreaterThan(recoveryEstimate(0.75));
  });
});
