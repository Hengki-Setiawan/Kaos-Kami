"use client";

/**
 * Watermark video tamu via kompositor-kanvas + tile pra-render (Bab 53).
 *
 * Kontrak KERAS (lihat src/lib/watermark.ts — SSOT teks/opasitas gambar):
 * - Teks/opasitas/rotasi SAMA dengan gambar: diagonal berulang
 *   "KAOS KAMI MAKASSAR · kaoskami.biz.id" (alpha 0.08, -24°) + judul tengah
 *   "KAOS KAMI MAKASSAR" / "PREVIEW MOCKUP · WWW.KAOSKAMI.BIZ.ID" (alpha 0.11).
 * - `fillText` HANYA di `createGuestWatermarkTile` (pra-render SEKALI per
 *   resolusi). Loop kompositor per-frame HANYA `drawImage` (video + tile) —
 *   JANGAN tambah fillText di loop (mahal + jank 5 detik).
 * - Gate tamu di caller (`CustomizerDrawer.handleExport360Video`): member
 *   (session ada) = stream langsung TANPA kompositor; tamu (!session) = bungkus
 *   via `wrapGuestVideoStreamWithWatermark`.
 * - Safari/mechanical blocker: kembalikan `{ supported: false, reason }` agar
 *   caller tampilkan 🟡 jujur + fallback stream asli (tanpa crash).
 */

export const GUEST_VIDEO_WATERMARK_REPEAT = "KAOS KAMI MAKASSAR · kaoskami.biz.id";
export const GUEST_VIDEO_WATERMARK_TITLE = "KAOS KAMI MAKASSAR";
export const GUEST_VIDEO_WATERMARK_SUB = "PREVIEW MOCKUP · WWW.KAOSKAMI.BIZ.ID";

export type GuestWatermarkWrapOk = {
  supported: true;
  stream: MediaStream;
  videoTrack: MediaStreamVideoTrack;
  width: number;
  height: number;
  stop: () => void;
};

export type GuestWatermarkWrapFail = {
  supported: false;
  reason: string;
};

export type GuestWatermarkWrapResult = GuestWatermarkWrapOk | GuestWatermarkWrapFail;

/** Deteksi Safari (WebKit tanpa Chrome/Chromium) — captureStream/MediaRecorder sering terbatas. */
export function isSafariBrowser(ua?: string, vendor?: string): boolean {
  try {
    const u =
      ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
    const v =
      vendor ?? (typeof navigator !== "undefined" ? (navigator as Navigator & { vendor?: string }).vendor ?? "" : "");
    const isAppleVendor = /apple/i.test(v);
    const hasSafariToken = /safari/i.test(u);
    const hasChromeToken = /chrome|chromium|crios|edg|opr\//i.test(u);
    return isAppleVendor && hasSafariToken && !hasChromeToken;
  } catch {
    return false;
  }
}

/** True bila kanvas 2D + captureStream tersedia (syarat kompositor). */
export function supportsCanvasCaptureStream(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const c = document.createElement("canvas");
    const cap = (c as HTMLCanvasElement & { captureStream?: unknown; mozCaptureStream?: unknown }).captureStream;
    const moz = (c as HTMLCanvasElement & { mozCaptureStream?: unknown }).mozCaptureStream;
    return typeof cap === "function" || typeof moz === "function";
  } catch {
    return false;
  }
}

/**
 * Pra-render SATU tile watermark seukuran frame video (W×H).
 * SATU-SATUNYA tempat `fillText` untuk jalur video — dipanggil SEKALI sebelum
 * rekam, bukan per frame. Kembalikan null bila DOM tak tersedia.
 */
export function createGuestWatermarkTile(width: number, height: number): HTMLCanvasElement | null {
  try {
    if (typeof document === "undefined") return null;
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Lapisan 1 — diagonal berulang (alpha 0.08, sama dengan watermark.ts:36-58).
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSizeGrid = Math.max(14, Math.round(w * 0.02));
    ctx.font = `700 ${fontSizeGrid}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    const stepX = Math.round(w * 0.38);
    const stepY = Math.round(h * 0.22);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-24 * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    for (let x = -w * 0.6; x < w * 1.6; x += stepX) {
      for (let y = -h * 0.6; y < h * 1.6; y += stepY) {
        ctx.fillText(GUEST_VIDEO_WATERMARK_REPEAT, x, y);
      }
    }
    ctx.restore();

    // Lapisan 2 — judul tengah (alpha 0.11, sama dengan watermark.ts:60-75).
    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleSize = Math.max(20, Math.round(w * 0.032));
    const subSize = Math.max(12, Math.round(w * 0.016));
    ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    ctx.fillText(GUEST_VIDEO_WATERMARK_TITLE, w / 2, h / 2 - Math.round(titleSize * 0.6));
    ctx.font = `700 ${subSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    ctx.fillText(GUEST_VIDEO_WATERMARK_SUB, w / 2, h / 2 + Math.round(subSize * 0.9));
    ctx.restore();

    return canvas;
  } catch {
    return null;
  }
}

/**
 * Bungkus stream WebGL tamu menjadi stream kompositor ber-watermark.
 *
 * Alur: video tersembunyi (sumber) → rAF `drawImage(video)` +
 * `drawImage(tile pra-render)` ke kanvas kompositor → `captureStream(fps)`.
 * Loop TIDAK memanggil fillText (hanya drawImage) — lihat komentar modul.
 *
 * Kembalikan `{ supported: false, reason }` untuk: SSR, track hilang,
 * metadata buntu, captureStream tak ada (Safari lama), atau play() diblokir
 * (mechanical/autoplay blocker). Caller WAJIB fallback ke stream asli + 🟡.
 */
export async function wrapGuestVideoStreamWithWatermark(
  sourceStream: MediaStream,
  opts?: { fps?: number; maxWaitMs?: number }
): Promise<GuestWatermarkWrapResult> {
  const fps = opts?.fps ?? 30;
  const maxWaitMs = opts?.maxWaitMs ?? 2000;
  try {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return { supported: false, reason: "SSR: DOM tak tersedia" };
    }
    const srcTrack = sourceStream.getVideoTracks()[0];
    if (!srcTrack) {
      return { supported: false, reason: "track video sumber hilang" };
    }
    if (!supportsCanvasCaptureStream()) {
      const safari = isSafariBrowser() ? " (Safari lama)" : "";
      return { supported: false, reason: `captureStream kanvas tak didukung${safari}` };
    }

    const video = document.createElement("video");
    video.muted = true;
    (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
    video.srcObject = sourceStream;
    // Redam suara/blocker autoplay: play muted inline.
    await video.play().catch(() => {});

    const waited = Date.now();
    while (!(video.videoWidth > 0 && video.videoHeight > 0)) {
      if (Date.now() - waited > maxWaitMs) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const W = video.videoWidth > 0 ? video.videoWidth : 640;
    const H = video.videoHeight > 0 ? video.videoHeight : 640;

    const tile = createGuestWatermarkTile(W, H);
    if (!tile) {
      try {
        video.pause();
      } catch { /* abaikan */ }
      video.srcObject = null;
      return { supported: false, reason: "gagal pra-render tile watermark" };
    }

    const comp = document.createElement("canvas");
    comp.width = W;
    comp.height = H;
    const cctx = comp.getContext("2d");
    if (!cctx) {
      try {
        video.pause();
      } catch { /* abaikan */ }
      video.srcObject = null;
      return { supported: false, reason: "konteks 2D kompositor tak tersedia" };
    }

    let rafId = 0;
    let stopped = false;
    const paint = () => {
      if (stopped) return;
      try {
        // HANYA drawImage per frame — JANGAN fillText di sini.
        cctx.drawImage(video, 0, 0, W, H);
        cctx.drawImage(tile, 0, 0, W, H);
      } catch {
        // Frame sesekali gagal (video belum siap) — lewati.
      }
      rafId = requestAnimationFrame(paint);
    };
    paint();

    const captureFn = (comp as HTMLCanvasElement & {
      captureStream?: (fps: number) => MediaStream;
      mozCaptureStream?: (fps: number) => MediaStream;
    }).captureStream;
    const mozFn = (comp as HTMLCanvasElement & {
      mozCaptureStream?: (fps: number) => MediaStream;
    }).mozCaptureStream;
    let compStream: MediaStream | null = null;
    try {
      if (typeof captureFn === "function") compStream = captureFn.call(comp, fps);
      else if (typeof mozFn === "function") compStream = mozFn.call(comp, fps);
    } catch (e) {
      compStream = null;
    }
    if (!compStream) {
      stopped = true;
      try {
        cancelAnimationFrame(rafId);
      } catch { /* abaikan */ }
      try {
        video.pause();
      } catch { /* abaikan */ }
      video.srcObject = null;
      const safari = isSafariBrowser() ? " (Safari/mechanical blocker)" : "";
      return { supported: false, reason: `captureStream kompositor gagal${safari}` };
    }
    const compTrack = compStream.getVideoTracks()[0];
    if (!compTrack) {
      stopped = true;
      try {
        cancelAnimationFrame(rafId);
      } catch { /* abaikan */ }
      try {
        video.pause();
      } catch { /* abaikan */ }
      video.srcObject = null;
      try {
        compStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch { /* abaikan */ }
        });
      } catch { /* abaikan */ }
      return { supported: false, reason: "track kompositor kosong" };
    }

    const stop = () => {
      stopped = true;
      try {
        cancelAnimationFrame(rafId);
      } catch { /* abaikan */ }
      try {
        video.pause();
      } catch { /* abaikan */ }
      try {
        video.srcObject = null;
      } catch { /* abaikan */ }
      // NOTE: track kompositor dihentikan caller via cleanup stream;
      // di sini hanya hentikan loop + video sumber (JANGAN stop sourceStream).
    };

    return { supported: true, stream: compStream, videoTrack: compTrack, width: W, height: H, stop };
  } catch (err) {
    const safari = isSafariBrowser() ? " (Safari/mechanical blocker)" : "";
    const msg = err instanceof Error ? err.message : "kesalahan tak dikenal";
    return { supported: false, reason: `${msg}${safari}` };
  }
}
