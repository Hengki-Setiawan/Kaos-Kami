import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SURFACE_Z_PER_APPAREL } from "@/lib/scaleCalibration";

// Lokasi cermin mobile relatif terhadap CWD workspace web (npm test dijalankan
// dari kaos-kami-web): ../kaos-kami-mobile/...
const MOBILE_FILE = resolve(
  process.cwd(),
  "../kaos-kami-mobile/src/components/3d/DecalGizmoMobile.tsx"
);

/**
 * Baca MOBILE_SURFACE_Z dari source mobile TANPA import cross-workspace
 * (web ≠ mobile bundle: alias `@/` dan deps R3F mobile tak resolvable di sini).
 * Parse blok `MOBILE_SURFACE_Z = { ... };` → { slug: angka }.
 */
function readMobileSurfaceZ(): Record<string, number> {
  const src = readFileSync(MOBILE_FILE, "utf8");
  const afterDecl = src.split("MOBILE_SURFACE_Z")[1] ?? "";
  const block = afterDecl.split("};")[0] ?? "";
  const out: Record<string, number> = {};
  for (const m of block.matchAll(/(\w+)\s*:\s*([0-9]+\.[0-9]+)/g)) {
    out[m[1] as string] = Number(m[2]);
  }
  return out;
}

describe("paritas surfaceZ mobile vs SSOT web", () => {
  it("nilai KRITIS tugas: tshirt 0.151 & hoodie 0.177 sama persis", () => {
    const mobile = readMobileSurfaceZ();
    expect(mobile["tshirt"]).toBe(SURFACE_Z_PER_APPAREL["tshirt"]);
    expect(mobile["tshirt"]).toBe(0.151);
    expect(mobile["hoodie"]).toBe(SURFACE_Z_PER_APPAREL["hoodie"]);
    expect(mobile["hoodie"]).toBe(0.177);
  });

  it("seluruh SSOT web ada cerminnya di mobile (longsleeve/shirt/cap/crewneck/pants/shorts)", () => {
    const mobile = readMobileSurfaceZ();
    for (const slug of ["longsleeve", "shirt", "cap", "crewneck", "pants", "shorts"] as const) {
      expect(
        mobile[slug],
        `MOBILE_SURFACE_Z.${slug} drift vs SSOT web ${SURFACE_Z_PER_APPAREL[slug]}`
      ).toBe(SURFACE_Z_PER_APPAREL[slug]);
    }
  });

  it("alias mobile: sweater ikut SSOT crewneck", () => {
    const mobile = readMobileSurfaceZ();
    expect(mobile["sweater"]).toBe(SURFACE_Z_PER_APPAREL["crewneck"]);
  });
});
