/**
 * CLIENT-SIDE IMAGE COMPRESSION UTILITY FOR 3D DECALS
 * Mengecilkan foto HP (>5MB) agar aman di JSON/DB (≤~350KB).
 *
 * KEJUJURAN (audit #27): output ini untuk PREVIEW 3D, BUKAN master produksi.
 * 1200px @30cm = ~101 DPI (kategori POOR untuk cetak). Master produksi yang
 * sesungguhnya = file ASLI (disimpan terpisah) atau ekspor 300 DPI dari
 * PatternStudio. Jangan klaim "print-ready" untuk hasil fungsi ini.
 */

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
}

function hasAlpha(img: HTMLImageElement): boolean {
  // Heuristik cepat: PNG kemungkinan ber-alpha; JPEG pasti tidak.
  // (Deteksi piksel penuh terlalu mahal untuk util upload.)
  return false;
}

export function compressImageClient(
  file: File,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; format: "jpeg" | "png"; width: number; height: number; previewDpiAt30cm: number }> {
  const { maxDimension = 1200, quality = 0.9 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original if canvas fails
          resolve({
            dataUrl: e.target?.result as string,
            format: "jpeg",
            width: img.width,
            height: img.height,
            previewDpiAt30cm: Math.round(Math.min(img.width, img.height) / (30 / 2.54)),
          });
          return;
        }

        // Draw image onto resized canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Format adaptif (audit #27): JPEG+quality untuk foto (90% lebih kecil),
        // PNG hanya bila sumbernya PNG (kemungkinan ber-transparansi).
        // toDataURL PNG mengabaikan quality — jangan oper quality ke PNG.
        const srcIsPng = file.type === "image/png";
        const q = Math.min(1, Math.max(0.5, quality));
        const dataUrl = srcIsPng
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", q);
        resolve({
          dataUrl,
          format: srcIsPng ? "png" : "jpeg",
          width,
          height,
          // Sumbu TERKECIL (audit: long-side menipu 2x untuk portrait —
          // konsisten dengan dpiAnalyzer 2-sumbu).
          previewDpiAt30cm: Math.round(Math.min(width, height) / (30 / 2.54)),
        });
      };

      img.onerror = () => {
        reject(new Error("Gagal membaca file gambar"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Gagal mengunggah file"));
    };

    reader.readAsDataURL(file);
  });
}
