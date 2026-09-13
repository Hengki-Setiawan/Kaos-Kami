/**
 * CLIENT-SIDE IMAGE COMPRESSION UTILITY FOR 3D DECALS (FASE C1)
 * - `dataUrl`       = PREVIEW hemat (sisi panjang max 1200px) untuk tekstur 3D
 *   + simpan JSON/DB (≤~350KB).
 * - `masterDataUrl` = MASTER produksi (file asli, downscale aman max 3000px
 *   sisi panjang) untuk produksi 300 DPI / `printFileUrl`.
 *
 * KEJUJURAN (audit #27): preview 1200px @30cm ≈ 101 DPI (kategori POOR untuk
 * cetak). Badge DPI dihitung dari MASTER (`masterDpiAt30cm`); jangan klaim
 * "print-ready" dari preview. Agen drawer: pakai `masterDataUrl` untuk badge
 * + arsip produksi, `dataUrl` untuk `DecalLayer.url` (3D).
 */

export interface CompressImageOptions {
  /** Sisi panjang max preview 3D/DB. Default 1200. */
  maxDimension?: number;
  /** Sisi panjang max master produksi. Default 3000. */
  masterMaxDimension?: number;
  /** Quality 0.5–1 untuk format lossy (JPEG/WebP). Default 0.9. */
  quality?: number;
}

export type AdaptiveImageFormat = "jpeg" | "webp" | "png";

export interface CompressImageResult {
  /** Preview hemat untuk 3D/DB. */
  dataUrl: string;
  /** Master produksi untuk cetak 300 DPI. */
  masterDataUrl: string;
  /** DPI preview @30cm (sumbu terkecil — jujur untuk portrait). */
  previewDpiAt30cm: number;
  /** DPI master @30cm (untuk badge + arsip produksi). */
  masterDpiAt30cm: number;
  /** Format adaptif yang dipakai KEDUA output (transparan → webp/png). */
  format: AdaptiveImageFormat;
  /** Dimensi preview px (backward-compat). */
  width: number;
  height: number;
  /** Dimensi master px. */
  masterWidth: number;
  masterHeight: number;
}

const IN_PER_30CM = 30 / 2.54;

function dpiAt30cm(w: number, h: number): number {
  return Math.round(Math.min(w, h) / IN_PER_30CM);
}

function fitInside(w: number, h: number, maxSide: number): { w: number; h: number } {
  if (w <= maxSide && h <= maxSide) return { w, h };
  const k = maxSide / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

let webpSupportCache: boolean | null = null;
/** Deteksi dukungan WebP (sekali, murah — tanpa dependensi baru). */
function supportsWebP(): boolean {
  if (webpSupportCache !== null) return webpSupportCache;
  try {
    const c = document.createElement("canvas");
    webpSupportCache = c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    webpSupportCache = false;
  }
  return webpSupportCache;
}

/**
 * Decode File → bitmap dengan koreksi orientasi EXIF bila didukung browser
 * (`createImageBitmap` + `imageOrientation: "from-image"`; fallback `<img>`
 * untuk Safari lama — foto portrait HP tidak lagi miring, audit #27).
 */
async function decodeFile(file: File): Promise<
  | { kind: "bitmap"; bmp: ImageBitmap; w: number; h: number; close: () => void }
  | { kind: "img"; el: HTMLImageElement; w: number; h: number; close: () => void }
> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { kind: "bitmap", bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // Jatuh ke <img> di bawah.
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const el = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal membaca file gambar"));
      img.src = objectUrl;
    });
    return {
      kind: "img",
      el,
      w: el.naturalWidth || el.width,
      h: el.naturalHeight || el.height,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw e;
  }
}

/** Sampel alpha murah di kanvas preview (stride 4px — cukup untuk putusan format). */
function canvasHasAlpha(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true; // Aman: bila tak bisa cek, anggap ber-alpha (PNG/WebP).
    const { width, height } = canvas;
    const step = 4;
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (data[(y * width + x) * 4 + 3]! < 250) return true;
      }
    }
    return false;
  } catch {
    return true; // Kanvas tainted (CORS) → jangan buang alpha via JPEG.
  }
}

function encode(canvas: HTMLCanvasElement, format: AdaptiveImageFormat, q: number): string {
  if (format === "webp") return canvas.toDataURL("image/webp", q);
  if (format === "jpeg") return canvas.toDataURL("image/jpeg", q);
  return canvas.toDataURL("image/png"); // PNG abaikan quality (audit #27).
}

function drawCover(src: CanvasImageSource, sw: number, sh: number, dw: number, dh: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak didukung");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, dw, dh);
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, dw, dh);
  return canvas;
}

export function compressImageClient(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressImageResult> {
  const { maxDimension = 1200, masterMaxDimension = 3000, quality = 0.9 } = options;
  const q = Math.min(1, Math.max(0.5, quality));

  return (async (): Promise<CompressImageResult> => {
    const decoded = await decodeFile(file);
    try {
      const sw = Math.max(1, decoded.w);
      const sh = Math.max(1, decoded.h);
      const pixels = decoded.kind === "bitmap" ? decoded.bmp : decoded.el;

      // 1. Preview dulu (kanvas kecil) → deteksi alpha di sini (murah).
      const pv = fitInside(sw, sh, Math.max(64, maxDimension));
      const previewCanvas = drawCover(pixels, sw, sh, pv.w, pv.h);

      // JPEG sumber pasti opaque; selain itu cek piksel (aman untuk PNG/WebP
      // ber-alpha maupun foto yang di-save .png tanpa transparansi).
      const needsAlpha = file.type !== "image/jpeg" && canvasHasAlpha(previewCanvas);

      // 2. Format adaptif: transparan → WebP (alpha+lossy, ~30% < PNG) / PNG
      // fallback; opaque → WebP / JPEG. Bukan selalu PNG (audit #27).
      const format: AdaptiveImageFormat = needsAlpha
        ? supportsWebP()
          ? "webp"
          : "png"
        : supportsWebP()
          ? "webp"
          : "jpeg";

      const dataUrl = encode(previewCanvas, format, q);

      // 3. Master produksi: file ASLI, downscale aman max 3000px sisi panjang
      // (3000px @30cm ≈ 254 DPI — di bawah 300 ideal tapi jujur + hemat RAM HP;
      // badge memakai angka riil ini, bukan klaim 300).
      const ms = fitInside(sw, sh, Math.max(pv.w, masterMaxDimension));
      let masterDataUrl: string;
      let masterWidth = ms.w;
      let masterHeight = ms.h;
      if (ms.w === pv.w && ms.h === pv.h) {
        // File kecil: master = preview (hindari upscale + kerja ganda).
        masterDataUrl = dataUrl;
      } else {
        const masterCanvas = drawCover(pixels, sw, sh, ms.w, ms.h);
        masterDataUrl = encode(masterCanvas, format, Math.max(q, 0.92));
      }

      return {
        dataUrl,
        masterDataUrl,
        previewDpiAt30cm: dpiAt30cm(pv.w, pv.h),
        masterDpiAt30cm: dpiAt30cm(masterWidth, masterHeight),
        format,
        width: pv.w,
        height: pv.h,
        masterWidth,
        masterHeight,
      };
    } finally {
      decoded.close();
    }
  })();
}
