/**
 * CUSTOM TYPOGRAPHY ENGINE FOR 3D APPAREL (FASE C4)
 * Generates high-resolution transparent PNG decals from user-typed text.
 * Instant (<15ms) Canvas-based rendering with streetwear and vintage font presets.
 *
 * - Kanvas AUTO-FIT ke teks (bukan 3:1 fix — teks panjang tak kepotong,
 *   teks pendek tak menyisakan strip transparan raksasa yang mengecilkan
 *   skala efektif decal di 3D).
 * - Menunggu `document.fonts.ready` (+ load family preset) sebelum raster.
 * - Alpha DIPERTAHANKAN (clearRect + PNG; tidak ada fill opaque).
 */

export interface TextDecalOptions {
  text: string;
  fontFamily: "streetwear-bold" | "varsity-college" | "modern-sans" | "vintage-serif" | "cyber-mono";
  textColor: string;
  isCurved?: boolean;
  letterSpacing?: number;
  /** Ukuran font awal px (auto-shrink bila melebihi maxWidthPx). Default 96. */
  fontSizePx?: number;
  /** Lebar kanvas max px (anti-OOM). Default 2048. */
  maxWidthPx?: number;
  /**
   * M3.4 — Shadow teks OPSIONAL, default MATI (false).
   * Shadow lama selalu ON (hitam 40% blur 4) menipu preview vs cetak DTF
   * (DTF tak mencetak drop-shadow lembut dengan benar + menambah halo).
   * Nyalakan hanya bila user centang eksplisit.
   */
  enableShadow?: boolean;
}

export const FONT_PRESETS: { id: TextDecalOptions["fontFamily"]; name: string; cssFont: string }[] = [
  {
    id: "streetwear-bold",
    name: "STREETWEAR BOLD",
    cssFont: "900 72px 'Syne', Impact, sans-serif",
  },
  {
    id: "varsity-college",
    name: "VARSITY ATHLETIC",
    cssFont: "bold 64px 'JetBrains Mono', 'Courier New', monospace",
  },
  {
    id: "modern-sans",
    name: "MINIMALIST SANS",
    cssFont: "800 60px 'Plus Jakarta Sans', sans-serif",
  },
  {
    id: "vintage-serif",
    name: "VINTAGE CLASSIC",
    cssFont: "italic bold 64px Georgia, serif",
  },
  {
    id: "cyber-mono",
    name: "CYBER TECHNO",
    cssFont: "700 56px 'JetBrains Mono', monospace",
  },
];

/** Guard letter-spacing (audit #29): deteksi fitur, JANGAN try/catch buta —
 * Safari lama tak punya `ctx.letterSpacing` dan assignment expando TIDAK
 * throw (gagal diam-diam → spasi hilang). False = wajib fallback manual. */
function supportsNativeLetterSpacing(ctx: CanvasRenderingContext2D): boolean {
  return typeof (ctx as unknown as Record<string, unknown>).letterSpacing === "string";
}

export async function generateTextDecalDataUrl(options: TextDecalOptions): Promise<string> {
  const {
    text,
    fontFamily = "streetwear-bold",
    textColor = "#FFFFFF",
    letterSpacing = 2,
    fontSizePx = 96,
    maxWidthPx = 2048,
    enableShadow = false,
  } = options;

  const upperText = text.trim().slice(0, 24);
  if (!upperText) return "";

  const preset = FONT_PRESETS.find((p) => p.id === fontFamily) ?? FONT_PRESETS[0]!;
  const baseFont = (px: number) => preset.cssFont.replace(/\d+px/, `${px}px`);

  // Tunggu font web selesai dimuat (audit #29 — sebelumnya fallback font
  // diam-diam bila Syne/JetBrains belum siap). Timeout 1,5 dtk agar HP
  // offline tak menggantung UI; family preset di-load eksplisit.
  try {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    await Promise.race([
      (async () => {
        try {
          await fonts?.load(baseFont(fontSizePx));
        } catch {}
        await fonts?.ready;
      })(),
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  } catch {}

  // ── Ukur dulu di kanvas sekali-pakai (resize nanti me-reset ctx state) ──
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return "";
  const spacing = Number.isFinite(letterSpacing) ? Math.max(0, letterSpacing) : 0;
  const padX = 48;
  const padY = 32;
  const maxW = Math.max(256, maxWidthPx) - padX * 2;

  let fontPx = Math.max(20, Math.min(256, fontSizePx));
  const spacedWidth = (ctx: CanvasRenderingContext2D, s: string): number => {
    // Ukur TANPA spacing native lalu tambah manual — deterministik di semua
    // browser (Chrome baru mengikutkan letterSpacing ke measureText, Safari
    // tidak — mengandalkan measure mentah bikin kanvas kepotong di Safari).
    if (supportsNativeLetterSpacing(ctx)) {
      return ctx.measureText(s).width + spacing * Math.max(0, s.length - 1);
    }
    let total = 0;
    for (const ch of s) total += ctx.measureText(ch).width;
    return total + spacing * Math.max(0, s.length - 1);
  };

  measure.font = baseFont(fontPx);
  while (fontPx > 20 && spacedWidth(measure, upperText) > maxW) {
    fontPx -= 4;
    measure.font = baseFont(fontPx);
  }
  const textW = Math.ceil(spacedWidth(measure, upperText));
  // Tinggi dari metrik riil bila ada (akurat untuk descender/italic serif),
  // fallback 1.5× fontPx.
  const metrics = measure.measureText(upperText);
  const asc = metrics.actualBoundingBoxAscent ?? fontPx * 0.8;
  const desc = metrics.actualBoundingBoxDescent ?? fontPx * 0.25;
  const textH = Math.ceil(asc + desc);

  // ── AUTO-FIT: kanvas seukuran teks + padding (ganti 1200×400 fix) ──
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(8, textW + padX * 2);
  canvas.height = Math.max(8, textH + padY * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Alpha dipertahankan: clear (transparan), tanpa fill background apa pun.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = baseFont(fontPx);
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // M3.4: shadow default MATI — hanya bila enableShadow eksplisit.
  if (enableShadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (supportsNativeLetterSpacing(ctx)) {
    (ctx as unknown as Record<string, unknown>).letterSpacing = `${spacing}px`;
    ctx.fillText(upperText, cx, cy);
    (ctx as unknown as Record<string, unknown>).letterSpacing = "0px";
  } else {
    // Fallback manual Safari: gambar per huruf (textAlign left, terpusat manual).
    const widths = Array.from(upperText).map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (upperText.length - 1);
    let x = cx - total / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    Array.from(upperText).forEach((ch, i) => {
      ctx.fillText(ch, x, cy);
      x += (widths[i] || 0) + spacing;
    });
    ctx.textAlign = prevAlign;
  }

  return canvas.toDataURL("image/png");
}
