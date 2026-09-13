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

function drawToSize(
  img: HTMLImageElement,
  maxDimension: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let width = img.width;
  let height = img.height;
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
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak didukung');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, width: canvas.width, height: canvas.height };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memproses gambar stiker.'));
    img.src = dataUrl;
  });
}

/**
 * Kompresor khusus CHECKOUT (audit HIGH): JPEG/WebP ≤1600px agar payload
 * base64 mentah 5–8MB tak dikirim ke server. Batas skema server: url decal
 * maks 500.000 char — turunkan kualitas/dimensi bertahap bila masih besar.
 * Bukan pengganti preview 3D (optimizeDecalImageForMobile) — hanya upload.
 */
export async function compressDecalForUpload(
  dataUrl: string,
  opts?: { maxDimension?: number; onProgress?: (stage: string) => void }
): Promise<{ compressedUrl: string; width: number; height: number; mime: string }> {
  const maxDimension = opts?.maxDimension ?? 1600;
  const onProgress = opts?.onProgress;
  onProgress?.('Membaca gambar…');
  const img = await loadImage(dataUrl);
  onProgress?.('Mengompres gambar…');

  // JPEG tak dukung alfa → beri latar putih agar kaos terang tak tembus.
  const mime = 'image/jpeg';
  const paint = (c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D tidak didukung');
    const out = document.createElement('canvas');
    out.width = c.width;
    out.height = c.height;
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(c, 0, 0);
    return out;
  };

  let dim = maxDimension;
  let quality = 0.82;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { canvas, width, height } = drawToSize(img, dim);
    const flat = paint(canvas);
    const url = flat.toDataURL(mime, quality);
    // Batas aman di bawah 500k char skema server (sisakan ruang JSON lain).
    if (url.length <= 450_000 || attempt === 2) {
      return { compressedUrl: url, width, height, mime };
    }
    // Terlalu besar → kecilkan lagi.
    dim = attempt === 0 ? 1200 : 900;
    quality = 0.7;
    onProgress?.('Mengompres ulang (file besar)…');
  }
  // Tak terjangkau (loop selalu return), tapi untuk type-safety:
  const { canvas, width, height } = drawToSize(img, 900);
  return { compressedUrl: paint(canvas).toDataURL(mime, 0.7), width, height, mime };
}
