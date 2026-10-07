import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  GUEST_VIDEO_WATERMARK_REPEAT,
  GUEST_VIDEO_WATERMARK_TITLE,
  GUEST_VIDEO_WATERMARK_SUB,
  createGuestWatermarkTile,
  isSafariBrowser,
  supportsCanvasCaptureStream,
  wrapGuestVideoStreamWithWatermark,
} from "@/lib/watermarkVideo";

/**
 * Watermark video tamu (Bab 53) — TEST node-safe.
 * DOM tak ada di vitest node-env → helper DOM me-return null/false secara
 * jujur (bukan throw). Kontrak kompositor (tanpa fillText per frame) dicek
 * statis seperti pola smartZoneTrigger.test.ts.
 */

const ROOT = process.cwd();
const helperSrc: string = fs.readFileSync(
  path.join(ROOT, "src/lib/watermarkVideo.ts"),
  "utf8"
);
const drawerSrc: string = fs.readFileSync(
  path.join(ROOT, "src/components/ui/CustomizerDrawer.tsx"),
  "utf8"
);

describe("watermarkVideo: konstanta = SSOT watermark.ts", () => {
  it("teks diagonal + judul tengah sama dengan watermark gambar", () => {
    expect(GUEST_VIDEO_WATERMARK_REPEAT).toBe("KAOS KAMI MAKASSAR · kaoskami.biz.id");
    expect(GUEST_VIDEO_WATERMARK_TITLE).toBe("KAOS KAMI MAKASSAR");
    expect(GUEST_VIDEO_WATERMARK_SUB).toBe("PREVIEW MOCKUP · WWW.KAOSKAMI.BIZ.ID");
    const wmSrc = fs.readFileSync(path.join(ROOT, "src/lib/watermark.ts"), "utf8");
    expect(wmSrc).toContain(GUEST_VIDEO_WATERMARK_REPEAT);
    expect(wmSrc).toContain(GUEST_VIDEO_WATERMARK_TITLE);
  });
});

describe("watermarkVideo: aman di node (tanpa DOM)", () => {
  it("supportsCanvasCaptureStream = false (jujur, bukan throw)", () => {
    expect(supportsCanvasCaptureStream()).toBe(false);
  });

  it("createGuestWatermarkTile = null (SSR guard)", () => {
    expect(createGuestWatermarkTile(640, 640)).toBeNull();
  });

  it("wrapGuestVideoStreamWithWatermark = unsupported (SSR, bukan throw)", async () => {
    const r = await wrapGuestVideoStreamWithWatermark({} as MediaStream);
    expect(r.supported).toBe(false);
    if (!r.supported) expect(typeof r.reason).toBe("string");
  });
});

describe("watermarkVideo: deteksi Safari", () => {
  it("Safari asli → true; Chrome/Edge → false", () => {
    const safariUa =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
    expect(isSafariBrowser(safariUa, "Apple Computer, Inc.")).toBe(true);
    const chromeUa =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    expect(isSafariBrowser(chromeUa, "Google Inc.")).toBe(false);
  });
});

describe("watermarkVideo: kontrak kompositor (statis)", () => {
  it("fillText HANYA di createGuestWatermarkTile (pra-render sekali)", () => {
    expect(helperSrc).toContain("createGuestWatermarkTile");
    expect(helperSrc).toContain("fillText");
    // Loop paint wajib drawImage ganda + komentar larangan fillText.
    expect(helperSrc).toContain("drawImage(video");
    expect(helperSrc).toContain("drawImage(tile");
    expect(helperSrc).toMatch(/JANGAN fillText/i);
  });

  it("CustomizerDrawer: gate !session + bungkus dinamis + fallback 🟡", () => {
    expect(drawerSrc).toContain("wrapGuestVideoStreamWithWatermark");
    expect(drawerSrc).toContain("if (!session)");
    // Member = stream langsung (activeStream default = stream).
    expect(drawerSrc).toContain("activeStream = stream");
    // Safari/mechanical blocker dilaporkan jujur.
    expect(drawerSrc).toMatch(/Watermark.*dilewati|watermark.*gagal/i);
  });
});
