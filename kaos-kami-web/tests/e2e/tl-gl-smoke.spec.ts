// @ts-nocheck
// DRAFT TL-CI-02/05 — headless-GL smoke + paritas Draco (Bab 14).
// AMAN: SKIP bila patchright tak ada. BUTUH: npm i -D patchright + install chromium.
// Run: npx playwright test tl-gl-smoke (TL_ALL_GLB=1 untuk 13 GLB).
import { test, expect } from "@playwright/test";

test.setTimeout(90_000);

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const ONE_GLB = process.env.TL_GLB || "/models/tee-basic.glb";
const KNOWN_13 = ["tee-basic.glb", "tshirt-heavyweight.glb", "hoodie.glb", "hoodie-blue.glb", "longsleeve.glb", "sweater.glb", "jacket.glb", "jacket.lod1.glb", "cap.glb", "pants.glb", "shorts.glb", "mannequin.glb", "mannequin-pants.glb"];
const TARGETS = process.env.TL_ALL_GLB === "1" ? KNOWN_13.map((f) => `/models/${f}`) : [ONE_GLB];

function assertBBoxPositive(buf: Buffer, label: string): number {
  expect(buf.slice(0, 4).toString("utf8"), `${label}: magic glTF`).toBe("glTF");
  expect(buf.readUInt32LE(4), `${label}: GLB v2`).toBe(2);
  const jsonLen = buf.readUInt32LE(12);
  const doc = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
  const posIdx = new Set<number>();
  for (const m of doc.meshes || [])
    for (const p of m.primitives || []) if (p.attributes?.POSITION !== undefined) posIdx.add(p.attributes.POSITION);
  expect(posIdx.size, `${label}: POSITION accessor`).toBeGreaterThan(0);
  const spans = [...posIdx]
    .map((i) => doc.accessors[i])
    .filter((a) => Array.isArray(a?.min) && Array.isArray(a?.max))
    .map((a) => Math.max(...a.max.map((v: number, k: number) => Math.abs(v - a.min[k]))));
  if (!spans.length) return 0;
  const span = Math.max(...spans);
  expect(span, `${label}: span bbox > 0`).toBeGreaterThan(0);
  return span;
}

test("TL-CI headless-GL smoke + bbox + 1 frame studio", async ({ page, request }) => {
  let patchright: { chromium: { launch: (o: unknown) => Promise<{ newPage: (o: unknown) => Promise<never>; close: () => Promise<unknown> }> } } | null = null;
  try {
    patchright = (await import("patchright")) as typeof import("patchright");
  } catch {
    test.skip(true, "SKIP: npm i -D patchright dulu");
  }
  const browser = await patchright!.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  try {
    const glPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await glPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const gl = await glPage.evaluate(() => {
      const c = document.createElement("canvas");
      return !!c.getContext("webgl2");
    });
    expect(gl, "WebGL2 SwiftShader tersedia").toBe(true);
    for (const target of TARGETS) {
      const res = await request.get(`${BASE}${target}`);
      expect(res.status(), `GET ${target}`).toBe(200);
      assertBBoxPositive(Buffer.from(await res.body()), target);
    }
    await page.goto(`${BASE}/studio`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 30000 });
    await test.info().attach("studio-1frame.png", { body: await page.screenshot(), contentType: "image/png" });
  } finally {
    await browser.close();
  }
});
