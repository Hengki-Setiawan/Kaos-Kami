import { describe, it, expect } from "vitest";
import { normalizeApparelSlug } from "@/lib/apparelSlug";
import { ApparelSlugSchema, DecalLayerSchema } from "@/lib/schemas/design";

// R5 (Bab 8): guard checkout U-034/U-035/U-036/U-037/U-039/U-045 +
// S-018–S-032 TANPA HTTP (panggil validator/Zod murni; alur uang tetap KEEP-E2E).
describe("checkoutGuards: normalizeApparelSlug", () => {
  it("8 slug kanonis lolos", () => {
    for (const s of ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"]) {
      expect(normalizeApparelSlug(s)).toBe(s);
    }
  });
  it("alias legacy dipetakan (jacket->shirt, sweater->crewneck)", () => {
    expect(normalizeApparelSlug("jacket")).toBe("shirt");
    expect(normalizeApparelSlug("sweater")).toBe("crewneck");
    expect(normalizeApparelSlug(" Jacket ")).toBe("shirt");
  });
  it("slug asing DITOLAK 400 (bukan fallback tshirt!)", () => {
    for (const s of ["topi", "dress", "", "t-shirt", null, undefined, 123]) {
      let status: number | undefined;
      try {
        normalizeApparelSlug(s);
      } catch (e) {
        status = (e as { status?: number }).status;
      }
      expect(status).toBe(400);
    }
  });
});

describe("checkoutGuards: ApparelSlugSchema (Zod)", () => {
  it("alias via preprocess lolos enum", () => {
    expect(ApparelSlugSchema.parse("jacket")).toBe("shirt");
    expect(ApparelSlugSchema.parse("sweater")).toBe("crewneck");
  });
  it("slug asing DITOLAK enum", () => {
    expect(ApparelSlugSchema.safeParse("dress").success).toBe(false);
  });
});

describe("checkoutGuards: DecalLayerSchema sisi", () => {
  const base = {
    id: "d1",
    url: "https://pub-xxx.r2.dev/x.png",
    name: "Grafis",
    x: 0,
    y: 0,
    scale: 0.1,
    rotation: 0,
    opacity: 1,
  };
  it("5 sisi server lolos (front/back/left_sleeve/right_sleeve/hood)", () => {
    for (const side of ["front", "back", "left_sleeve", "right_sleeve", "hood"]) {
      expect(DecalLayerSchema.safeParse({ ...base, targetSide: side }).success).toBe(true);
    }
  });
  it("side_* DITOLAK 400 (S-030)", () => {
    for (const side of ["side_left", "side_right", "sleeve", "depan"]) {
      expect(DecalLayerSchema.safeParse({ ...base, targetSide: side }).success).toBe(false);
    }
  });
});
