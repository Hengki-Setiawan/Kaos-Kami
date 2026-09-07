export async function optimizeDecalImageForMobile(
  dataUrl: string,
  maxDimension: number = 2048,
  printWidthCm?: number
): Promise<{ optimizedUrl: string; width: number; height: number; dpi: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ optimizedUrl: dataUrl, width: img.width, height: img.height, dpi: 300 });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // DPI JUJUR: piksel ÷ inci cetak. Lebar cetak = ukuran decal AKTUAL (cm),
      // bukan asumsi 28cm tetap. Tanpa data → null (pemanggil tampilkan "ukur dulu").
      const widthInch = printWidthCm && printWidthCm > 0 ? printWidthCm / 2.54 : 0;
      const estimatedDpi = widthInch > 0 ? Math.round(width / widthInch) : 0;

      const optimizedUrl = canvas.toDataURL('image/png', 0.92);
      resolve({
        optimizedUrl,
        width,
        height,
        dpi: Math.max(0, Math.min(2400, estimatedDpi)),
      });
    };

    img.onerror = () => {
      reject(new Error('Gagal memproses gambar stiker.'));
    };

    img.src = dataUrl;
  });
}
