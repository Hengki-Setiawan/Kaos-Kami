/**
 * CUSTOM TYPOGRAPHY ENGINE FOR 3D APPAREL
 * Generates high-resolution transparent PNG decals from user-typed text.
 * Instant (<15ms) Canvas-based rendering with streetwear and vintage font presets.
 */

export interface TextDecalOptions {
  text: string;
  fontFamily: "streetwear-bold" | "varsity-college" | "modern-sans" | "vintage-serif" | "cyber-mono";
  textColor: string;
  isCurved?: boolean;
  letterSpacing?: number;
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

export async function generateTextDecalDataUrl(options: TextDecalOptions): Promise<string> {
  const {
    text,
    fontFamily = "streetwear-bold",
    textColor = "#FFFFFF",
    letterSpacing = 2,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Tunggu font web selesai dimuat (audit #29 — sebelumnya fallback font
  // diam-diam bila Syne/JetBrains belum siap).
  try {
    await Promise.race([
      Promise.all([
        (document as any).fonts?.load("900 72px 'Syne'"),
        (document as any).fonts?.load("700 56px 'JetBrains Mono'"),
        (document as any).fonts?.ready,
      ]),
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  } catch {}

  // Clear background for pure transparency
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const preset = FONT_PRESETS.find((p) => p.id === fontFamily) ?? FONT_PRESETS[0]!;

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const upperText = text.trim().slice(0, 24);
  if (!upperText) return "";

  // Auto-fit (audit #29 — kanvas 3:1 fix + teks panjang kepotong):
  // kecilkan font sampai muat dengan margin 60px.
  let fontPx = 72;
  const baseFont = (px: number) => preset.cssFont.replace(/\d+px/, `${px}px`);
  ctx.font = baseFont(fontPx);
  const maxW = canvas.width - 120;
  while (fontPx > 20 && ctx.measureText(upperText).width > maxW) {
    fontPx -= 4;
    ctx.font = baseFont(fontPx);
  }

  // letterSpacing: API native bila ada, manual per-huruf bila tidak.
  const drawSpaced = (text: string, cx: number, cy: number) => {
    try {
      (ctx as any).letterSpacing = `${letterSpacing}px`;
      ctx.fillText(text, cx, cy);
      (ctx as any).letterSpacing = "0px";
    } catch {
      // Fallback manual: gambar per huruf.
      const widths = Array.from(text).map((ch) => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (text.length - 1);
      let x = cx - total / 2;
      const prevAlign = ctx.textAlign;
      ctx.textAlign = "left";
      Array.from(text).forEach((ch, i) => {
        ctx.fillText(ch, x, cy);
        x += (widths[i] || 0) + letterSpacing;
      });
      ctx.textAlign = prevAlign;
    }
  };

  // Subtle stroke for extra pop on dark/light fabric
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  drawSpaced(upperText, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
}
