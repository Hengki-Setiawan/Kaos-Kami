import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { clampDecalXY, DECAL_MOVE_LIMITS } from "@/lib/scaleCalibration";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import type { DecalLayer } from "@/lib/constants";

/**
 * Duplikat decal-layer (Bab 52/53 (2)) — TEST SAJA.
 *
 * Sumber kebenaran: src/components/ui/CustomizerDrawer.tsx:1621-1651
 * (handleDuplicateDecal — di dalam komponen "use client", tak importable di
 * node-env; preseden sama seperti checkoutSwitch.test.ts 🟡). Tak ada fungsi
 * murni yang diekspor untuk logika ini, maka jalur "else test store":
 *  - perilaku direplikasi PERSIS baris-per-baris via store asli
 *    (useConfiguratorStore.addDecal — murni, node-safe: guard localStorage
 *    di try/catch + typeof window) + clampDecalXY murni, dan
 *  - kontrak statis dikunci via isi file sumber.
 */

const ROOT = process.cwd();
const drawerSrc: string = fs.readFileSync(
  path.join(ROOT, "src/components/ui/CustomizerDrawer.tsx"),
  "utf8"
);

/**
 * Replika PERSIS CustomizerDrawer.tsx:1622-1651 (tanpa master-URL registry
 * yang butuh DOM/blob — inti duplikat: offset + copy metadata).
 */
function replicateHandleDuplicateDecal(id: string): string | null {
  const st = useConfiguratorStore.getState();
  const src = st.decals.find((d) => d.id === id);
  if (!src) return null;
  const jepit = clampDecalXY(src.targetSide, src.x + 0.05, src.y);
  const newId = st.addDecal({
    name: `${src.name} (Salinan)`,
    url: src.url,
    targetSide: src.targetSide,
    x: jepit.x,
    y: jepit.y,
    scale: src.scale,
    rotation: src.rotation,
    opacity: src.opacity,
    ...(src.printPx ? { printPx: { ...src.printPx } } : {}),
    ...(src.textMetadata ? { textMetadata: { ...src.textMetadata } } : {}),
  });
  st.setSelectedDecalId(newId);
  return newId;
}

const BASE_DECAL: Omit<DecalLayer, "id"> = {
  name: "Grafis Uji",
  url: "https://pub-xxx.r2.dev/uji.png",
  targetSide: "front",
  x: 0.1,
  y: -0.05,
  scale: 0.11,
  rotation: 15,
  opacity: 0.9,
  printPx: { w: 1800, h: 1200 },
  textMetadata: { text: "KAOS KAMI", fontId: "streetwear-bold", color: "#FFFFFF" },
};

beforeEach(() => {
  useConfiguratorStore.getState().loadDecals([]);
});

describe("duplicateDecal: kontrak statis CustomizerDrawer.tsx:1621-1651", () => {
  it("geser X+0.05 via clampDecalXY sisi sumber", () => {
    expect(drawerSrc).toContain("src.x + 0.05");
    expect(drawerSrc).toContain("clampDecalXY(src.targetSide, src.x + 0.05, src.y)");
  });

  it("copy printPx + textMetadata via spread (bukan referensi)", () => {
    expect(drawerSrc).toContain("printPx: { ...src.printPx }");
    expect(drawerSrc).toContain("textMetadata: { ...src.textMetadata }");
  });

  it('nama salinan memakai sufiks " (Salinan)" + seleksi pindah ke salinan', () => {
    expect(drawerSrc).toContain("(Salinan)");
    expect(drawerSrc).toContain("setSelectedDecalId(newId)");
  });
});

describe("duplicateDecal: perilaku via store (offset + copy metadata)", () => {
  it("offset X+0.05, Y tetap, nama bersufiks, seleksi pindah", () => {
    const st = useConfiguratorStore.getState();
    const srcId = st.addDecal({ ...BASE_DECAL });
    const newId = replicateHandleDuplicateDecal(srcId);
    expect(newId).not.toBeNull();
    const after = useConfiguratorStore.getState();
    const copy = after.decals.find((d) => d.id === newId);
    expect(after.decals).toHaveLength(2);
    expect(copy!.x).toBeCloseTo(BASE_DECAL.x + 0.05, 9);
    expect(copy!.y).toBe(BASE_DECAL.y);
    expect(copy!.name).toBe(`${BASE_DECAL.name} (Salinan)`);
    expect(copy!.targetSide).toBe(BASE_DECAL.targetSide);
    expect(copy!.scale).toBe(BASE_DECAL.scale);
    expect(copy!.rotation).toBe(BASE_DECAL.rotation);
    expect(copy!.opacity).toBe(BASE_DECAL.opacity);
    expect(copy!.url).toBe(BASE_DECAL.url);
    expect(after.selectedDecalId).toBe(newId);
  });

  it("printPx + textMetadata disalin NILAI (deep-equal, referensi beda)", () => {
    const st = useConfiguratorStore.getState();
    const srcId = st.addDecal({ ...BASE_DECAL });
    const newId = replicateHandleDuplicateDecal(srcId)!;
    const after = useConfiguratorStore.getState();
    const src = after.decals.find((d) => d.id === srcId)!;
    const copy = after.decals.find((d) => d.id === newId)!;
    expect(copy.printPx).toEqual(src.printPx);
    expect(copy.printPx).not.toBe(src.printPx);
    expect(copy.textMetadata).toEqual(src.textMetadata);
    expect(copy.textMetadata).not.toBe(src.textMetadata);
  });

  it("mutasi salinan tak menular ke sumber (isolasi copy)", () => {
    const st = useConfiguratorStore.getState();
    const srcId = st.addDecal({ ...BASE_DECAL });
    const newId = replicateHandleDuplicateDecal(srcId)!;
    useConfiguratorStore.getState().updateDecal(newId, { printPx: { w: 1, h: 1 } });
    const after = useConfiguratorStore.getState();
    expect(after.decals.find((d) => d.id === srcId)!.printPx).toEqual({ w: 1800, h: 1200 });
  });

  it("dekat batas: 0.33 + 0.05 dijepit ke frontBackX (0.35), bukan 0.38", () => {
    const st = useConfiguratorStore.getState();
    const srcId = st.addDecal({ ...BASE_DECAL, x: 0.33 });
    const newId = replicateHandleDuplicateDecal(srcId)!;
    const copy = useConfiguratorStore.getState().decals.find((d) => d.id === newId)!;
    expect(copy.x).toBe(DECAL_MOVE_LIMITS.frontBackX);
    expect(copy.x).toBeLessThan(0.33 + 0.05);
  });

  it("tanpa printPx/textMetadata: salinan tak punya kunci tsb (spread dilewati)", () => {
    const bare: Omit<DecalLayer, "id"> = {
      name: BASE_DECAL.name,
      url: BASE_DECAL.url,
      targetSide: BASE_DECAL.targetSide,
      x: BASE_DECAL.x,
      y: BASE_DECAL.y,
      scale: BASE_DECAL.scale,
      rotation: BASE_DECAL.rotation,
      opacity: BASE_DECAL.opacity,
    };
    const st = useConfiguratorStore.getState();
    const srcId = st.addDecal({ ...bare });
    const newId = replicateHandleDuplicateDecal(srcId)!;
    const copy = useConfiguratorStore.getState().decals.find((d) => d.id === newId)!;
    expect("printPx" in copy).toBe(false);
    expect("textMetadata" in copy).toBe(false);
  });

  it("id tak dikenal = no-op (null, jumlah tetap)", () => {
    expect(replicateHandleDuplicateDecal("tak-ada")).toBeNull();
    expect(useConfiguratorStore.getState().decals).toHaveLength(0);
  });
});
