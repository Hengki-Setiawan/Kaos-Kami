export async function optimizeDecalImageForMobile(
  dataUrl: string,
  maxDimension: number = 2048
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

      // Estimate DPI based on standard DTF width (assume 28cm print area)
      const estimatedDpi = Math.round((width / 28) * 2.54);

      const optimizedUrl = canvas.toDataURL('image/png', 0.92);
      resolve({
        optimizedUrl,
        width,
        height,
        dpi: Math.max(150, Math.min(600, estimatedDpi)),
      });
    };

    img.onerror = () => {
      reject(new Error('Gagal memproses gambar stiker.'));
    };

    img.src = dataUrl;
  });
}
