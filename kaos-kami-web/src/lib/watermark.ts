/**
 * Utility untuk menambahkan watermark resmi Kaos Kami pada gambar ekspor mockup pengguna tamu (Guest).
 *
 * Sesuai Bab 53 Cetak Biru (Keputusan Owner 04 Okt 2026):
 * 1. Opasitas sangat rendah (ultra-low opacity ~0.08–0.12) agar tekstur kain, lekukan lipatan,
 *    dan detail sablon DTF tetap 100% jelas, tajam, dan tidak terganggu.
 * 2. Posisi: Pola watermark diagonal berulang dan watermark logo/nama di area tengah.
 * 3. Teks: "KAOS KAMI MAKASSAR · kaoskami.biz.id"
 * 4. Pengguna member yang telah login (session) 100% bebas watermark (Clean 2K Ultra HD).
 */
export async function applyGuestWatermarkToDataUrl(dataUrl: string): Promise<string> {
  if (typeof window === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 1920;
        const h = img.naturalHeight || img.height || 1080;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // 1. Gambar mockup asli
        ctx.drawImage(img, 0, 0, w, h);

        // 2. Watermark Diagonal Berulang (Ultra-low opacity 0.08)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fontSizeGrid = Math.max(14, Math.round(w * 0.02));
        ctx.font = `700 ${fontSizeGrid}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;

        const textRepeat = "KAOS KAMI MAKASSAR · kaoskami.biz.id";
        const stepX = Math.round(w * 0.38);
        const stepY = Math.round(h * 0.22);

        ctx.translate(w / 2, h / 2);
        ctx.rotate((-24 * Math.PI) / 180);
        ctx.translate(-w / 2, -h / 2);

        for (let x = -w * 0.6; x < w * 1.6; x += stepX) {
          for (let y = -h * 0.6; y < h * 1.6; y += stepY) {
            ctx.fillText(textRepeat, x, y);
          }
        }
        ctx.restore();

        // 3. Watermark Utama Tengah (Proporsional, Ultra-low opacity 0.11)
        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const titleSize = Math.max(20, Math.round(w * 0.032));
        const subSize = Math.max(12, Math.round(w * 0.016));

        ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
        ctx.fillText("KAOS KAMI MAKASSAR", w / 2, h / 2 - Math.round(titleSize * 0.6));

        ctx.font = `700 ${subSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
        ctx.fillText("PREVIEW MOCKUP · WWW.KAOSKAMI.BIZ.ID", w / 2, h / 2 + Math.round(subSize * 0.9));
        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("Gagal menambahkan watermark tamu:", err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
