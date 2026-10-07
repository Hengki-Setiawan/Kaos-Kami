import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { clampDecalXY, DECAL_MOVE_LIMITS } from "@/lib/scaleCalibration";
import type { DecalTargetSide } from "@/lib/constants";

/**
 * Smart Zone trigger (Bab 52/53 (4)) — TEST SAJA.
 *
 * Sumber kebenaran: src/components/studio/SablonTabContent.tsx
 *  - flashSmartZone(): set hint "Maksimal Lebar Sablon A3 (30 cm)", auto-hilang
 *    2500ms (:143-147) — state React + timer, tak testable di node-env 🟡.
 *  - trigger X (:655-662): jepit=clamp(rawX); bila sisi front/back DAN
 *    jepit.x !== rawX → flash.
 *  - trigger Y (:691-698): analog untuk sumbu Y.
 *
 * Yang diuji: replika murni kondisi trigger (jepit vs raw + guard sisi) di atas
 * clampDecalXY SSOT + kontrak statis pesan/timer/guard di file sumber.
 */

/** Replika murni kondisi trigger SablonTabContent.tsx:656-660 & :692-696. */
function shouldFlashSmartZone(
  side: DecalTargetSide,
  raw: number,
  clamped: number
): boolean {
  return (side === "front" || side === "back") && clamped !== raw;
}

const ROOT = process.cwd();
const sablonSrc: string = fs.readFileSync(
  path.join(ROOT, "src/components/studio/SablonTabContent.tsx"),
  "utf8"
);

describe("smartZoneTrigger: kontrak statis SablonTabContent", () => {
  it('pesan hint = "Maksimal Lebar Sablon A3 (30 cm)"', () => {
    expect(sablonSrc).toContain("Maksimal Lebar Sablon A3 (30 cm)");
  });

  it("hint auto-hilang 2500ms", () => {
    expect(sablonSrc).toContain("setTimeout(() => setSmartZoneHint(null), 2500)");
  });

  it("trigger X & Y: guard front/back + banding jepit !== raw", () => {
    expect(sablonSrc).toContain("jepit.x !== rawX");
    expect(sablonSrc).toContain("jepit.y !== rawY");
    expect(sablonSrc).toContain("flashSmartZone()");
  });
});

describe("smartZoneTrigger: jepit vs raw sumbu X (front/back)", () => {
  for (const side of ["front", "back"] as const) {
    it(`${side}: raw di dalam batas → jepit == raw → TAK flash`, () => {
      const raw = 0.1;
      const jepit = clampDecalXY(side, raw, 0);
      expect(jepit.x).toBe(raw);
      expect(shouldFlashSmartZone(side, raw, jepit.x)).toBe(false);
    });

    it(`${side}: raw jauh lewat batas → jepit != raw → FLASH`, () => {
      const raw = 10;
      const jepit = clampDecalXY(side, raw, 0);
      expect(jepit.x).toBe(DECAL_MOVE_LIMITS.frontBackX);
      expect(jepit.x).not.toBe(raw);
      expect(shouldFlashSmartZone(side, raw, jepit.x)).toBe(true);
    });

    it(`${side}: tepat di batas (0.35) → TAK flash; 0.36 → FLASH`, () => {
      const pas = clampDecalXY(side, DECAL_MOVE_LIMITS.frontBackX, 0);
      expect(shouldFlashSmartZone(side, DECAL_MOVE_LIMITS.frontBackX, pas.x)).toBe(false);
      const lebih = clampDecalXY(side, DECAL_MOVE_LIMITS.frontBackX + 0.01, 0);
      expect(
        shouldFlashSmartZone(side, DECAL_MOVE_LIMITS.frontBackX + 0.01, lebih.x)
      ).toBe(true);
    });
  }
});

describe("smartZoneTrigger: jepit vs raw sumbu Y (front/back)", () => {
  it("front: rawY lewat batas → FLASH; di dalam → TAK flash", () => {
    const lewat = clampDecalXY("front", 0, 10);
    expect(shouldFlashSmartZone("front", 10, lewat.y)).toBe(true);
    const dalam = clampDecalXY("front", 0, -0.2);
    expect(shouldFlashSmartZone("front", -0.2, dalam.y)).toBe(false);
  });
});

describe("smartZoneTrigger: sisi non-dada TAK pernah flash (walau dijepit)", () => {
  it("lengan/tudung/samping: clamped != raw tapi guard sisi menolak", () => {
    const cases: Array<{ side: DecalTargetSide; rawX: number; rawY: number }> = [
      { side: "left_sleeve", rawX: 10, rawY: 0 },
      { side: "right_sleeve", rawX: -10, rawY: 0 },
      { side: "hood", rawX: 10, rawY: 10 },
      { side: "side_left", rawX: 10, rawY: 0 },
      { side: "side_right", rawX: 0, rawY: 10 },
    ];
    for (const c of cases) {
      const jepit = clampDecalXY(c.side, c.rawX, c.rawY);
      // Pastikan skenario memang menjepit (kalau tak menjepit, uji ini vacuous).
      expect(jepit.x !== c.rawX || jepit.y !== c.rawY).toBe(true);
      expect(shouldFlashSmartZone(c.side, c.rawX, jepit.x)).toBe(false);
      expect(shouldFlashSmartZone(c.side, c.rawY, jepit.y)).toBe(false);
    }
  });
});
