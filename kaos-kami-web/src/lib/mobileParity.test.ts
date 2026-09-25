import { describe, it, expect } from "vitest";
import spec from "@/lib/mobileParitySpec.json";
import {
  APPAREL_PHYSICAL_SPECS,
  SURFACE_Z_PER_APPAREL,
  REAL_WORLD_PRINT_LIMITS,
} from "@/lib/scaleCalibration";
import { MAKASSAR_SUBDISTRICTS } from "@/lib/shipping/deliveryOptions";
import { ACTIVE_FILES, BACKUP_FILES, STAGED_FILES } from "@/lib/assetManifest";

/**
 * P7 — PARITAS MOBILE (SSOT web; file BARU saja, tanpa ubah scaleCalibration).
 *
 * Mengapa JSON snapshot + bukan import konstanta mobile?
 * web ≠ mobile bundle: alias `@/` dan deps R3F mobile tak resolvable di sini
 * (lihat surfaceZParity.test.ts yang parse source mobile sebagai teks).
 * Jadi web menyimpan SNAPSHOT angka SSOT di mobileParitySpec.json; test ini
 * memastikan snapshot = kode SSOT web. Sinkron ke mobile TETAP manual:
 *
 * PANDUAN SINKRON MANUAL (mobile):
 * 1. surfaceZ     → kaos-kami-mobile/src/components/3d/DecalGizmoMobile.tsx
 *                   (MOBILE_SURFACE_Z; sweater ikut crewneck)
 * 2. unitsToCm    → kaos-kami-mobile/src/store/useMobileStudioStore.ts
 *                   (MOBILE_UNITS_TO_CM)
 * 3. maxWidth     → file yang sama (MOBILE_MAX_WIDTH_CM; depan saja;
 *                   hoodie/shirt 28 khusus saku-kangaroo/pullover)
 * 4. kecamatan    → kaos-kami-mobile/src/lib/shipping/deliveryOptionsMobile.ts
 *                   (MAKASSAR_SUBDISTRICTS)
 * 5. model        → kaos-kami-mobile/src/components/3d/MobileApparelMeshRenderer.tsx
 *                   (MOBILE_MODEL_CANDIDATES; primer = models.<apparel>.file)
 * 6. Jalankan `npm test` di kaos-kami-web (test ini) + typecheck mobile.
 *    Drift mobile yang diketahui: cap unitsToCm 50 vs SSOT 100 & maxWidth
 *    12 vs SSOT 10 (ASUMSI+TODO lama mobile) — samakan manual bila final.
 */

const S = spec as unknown as {
  surfaceZ: Record<string, number>;
  unitsToCm: Record<string, number>;
  maxWidthCm: Record<string, any>;
  makassarSubdistricts: string[];
  models: Record<string, { file: string; bytes: number | null; tris: number | null; manifest: string | null }>;
};

describe("mobileParitySpec: snapshot = SSOT web", () => {
  it("surfaceZ per apparel sama dengan SURFACE_Z_PER_APPAREL", () => {
    for (const [slug, z] of Object.entries(S.surfaceZ)) {
      if (slug.startsWith("_")) continue;
      expect(z, `surfaceZ.${slug}`).toBe(SURFACE_Z_PER_APPAREL[slug]);
    }
    expect(S.surfaceZ["_fallbackUnknownApparel"]).toBe(0.176);
  });

  it("unitsToCm per apparel sama dengan meshMultiplier SSOT", () => {
    for (const [slug, mult] of Object.entries(S.unitsToCm)) {
      expect(mult, `unitsToCm.${slug}`).toBe(APPAREL_PHYSICAL_SPECS[slug]!.meshMultiplier);
    }
  });

  it("maxWidth depan per apparel sama dengan maxFrontWidthCm + dalam batas printhead", () => {
    const g = S.maxWidthCm["_globalPrintheadMax"];
    expect(g).toBe(REAL_WORLD_PRINT_LIMITS.maxPrintWidthCm);
    expect(g).toBe(30.0);
    expect(S.maxWidthCm["_globalMaxHeight"]).toBe(REAL_WORLD_PRINT_LIMITS.maxPrintHeightCm);
    expect(S.maxWidthCm["_minDecalScaleUnits"]).toBe(REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits);
    for (const [slug, box] of Object.entries(S.maxWidthCm)) {
      if (slug.startsWith("_")) continue;
      const specRow = APPAREL_PHYSICAL_SPECS[slug]!;
      expect(box.front, `maxWidth.${slug}.front`).toBe(specRow.maxFrontWidthCm);
      expect(box.back, `maxWidth.${slug}.back`).toBe(specRow.maxBackWidthCm);
      expect(box.sleeve, `maxWidth.${slug}.sleeve`).toBe(specRow.maxSleeveWidthCm);
      expect(box.front).toBeLessThanOrEqual(30.0);
    }
    // Kasus khusus yang disengaja (bukan drift): kantong kangaroo & pullover.
    expect(S.maxWidthCm["hoodie"].front).toBe(28.0);
    expect(S.maxWidthCm["shirt"].front).toBe(28.0);
  });

  it("whitelist kecamatan sama dengan MAKASSAR_SUBDISTRICTS web", () => {
    expect([...S.makassarSubdistricts].sort()).toEqual([...MAKASSAR_SUBDISTRICTS].sort());
    expect(S.makassarSubdistricts).toContain("Tallo");
    expect(S.makassarSubdistricts.length).toBeGreaterThan(0);
  });

  it("ukuran model cocok dengan assetManifest (null jujur bila belum masuk manifest)", () => {
    const all = [...ACTIVE_FILES, ...BACKUP_FILES, ...STAGED_FILES];
    const byFile = new Map(all.map((e) => [e.file, e]));
    for (const [slug, m] of Object.entries(S.models)) {
      if (slug.startsWith("_")) continue;
      const mm = m!;
      expect(typeof mm.file, `models.${slug}.file`).toBe("string");
      expect(mm.file.endsWith(".glb")).toBe(true);
      if (mm.manifest === null) {
        // Jujur null (pants/shorts menunggu owner) — BUKAN 0 palsu.
        expect(mm.bytes).toBeNull();
        expect(mm.tris).toBeNull();
      } else {
        const entry = byFile.get(mm.file);
        expect(entry, `models.${slug} terdaftar di ${mm.manifest}`).toBeDefined();
        expect(mm.bytes).toBe(entry!.bytes);
        expect(mm.tris).toBe(entry!.tris);
      }
    }
    // Alias: sweater = mesh crewneck yang sama.
    expect(S.models["sweater"]!.file).toBe(S.models["crewneck"]!.file);
  });

  it("konsistensi internal: skala maks waras untuk semua apparel", () => {
    for (const slug of Object.keys(S.unitsToCm)) {
      const z = S.surfaceZ[slug]!;
      const mult = S.unitsToCm[slug]!;
      const front = (S.maxWidthCm[slug] as any)?.front;
      expect(z).toBeGreaterThan(0.05);
      expect(z).toBeLessThan(0.25);
      expect(mult).toBeGreaterThanOrEqual(50);
      expect(mult).toBeLessThanOrEqual(200);
      // maxScaleUnits = maxFront / multiplier — harus dalam rentang
      // clamp Zod mobile (0.02…1.5) agar klaim cm tercapai tanpa pecah.
      const maxScale = front / mult;
      expect(maxScale, `maxScaleUnits.${slug}`).toBeGreaterThanOrEqual(0.02);
      expect(maxScale, `maxScaleUnits.${slug}`).toBeLessThanOrEqual(1.5);
    }
  });
});
