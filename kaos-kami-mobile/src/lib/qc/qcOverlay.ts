/**
 * Overlay QC mobile (P3) — cermin web QcChecklistPanel langkah 2.
 * Foto kamera → canvas 2D: gambar + bar info QC + teks graffiti opsional.
 * Murni browser (tanpa native), tanpa kanvas Fabric.
 */

export interface QcOverlayInput {
  /** Baris info QC (order, sisi, grazing, lux, cek, catatan, waktu). */
  lines: string[];
  /** Teks graffiti/teks bebas digambar di atas foto (1–2 baris). Kosong = lewati. */
  graffiti?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca foto kamera'));
    img.src = src;
  });
}

/** Tempel info QC ke foto → Blob PNG. Throw dengan pesan Bahasa Indonesia. */
export async function overlayQcInfo(photoDataUrl: string, input: QcOverlayInput): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Overlay QC hanya di browser/HP.');
  const img = await loadImage(photoDataUrl);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width || 1080;
  c.height = img.naturalHeight || img.height || 1080;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung canvas 2D.');
  ctx.drawImage(img, 0, 0, c.width, c.height);

  // Graffiti/teks bebas (opsional): tengah-atas, putih + outline hitam.
  const graffiti = (input.graffiti || '').trim().slice(0, 120);
  if (graffiti) {
    const gPx = Math.max(28, Math.round(c.width / 28));
    ctx.font = `bold ${gPx}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = Math.max(3, Math.round(gPx / 8));
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    const gx = c.width / 2;
    const gy = Math.round(c.height * 0.06);
    ctx.strokeText(graffiti, gx, gy);
    ctx.fillStyle = '#FFD60A';
    ctx.fillText(graffiti, gx, gy);
    ctx.textAlign = 'left';
  }

  // Bar info bawah (pola web: monospace putih di atas hitam 65%).
  const lines = input.lines.filter(Boolean).slice(0, 5);
  const fontPx = Math.max(22, Math.round(c.width / 60));
  ctx.font = `bold ${fontPx}px monospace`;
  const lineH = fontPx * 1.5;
  const pad = fontPx * 0.8;
  const barH = lines.length * lineH + pad * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, c.height - barH, c.width, barH);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  lines.forEach((ln, i) => ctx.fillText(ln, pad, c.height - barH + pad + i * lineH));

  const blob = await new Promise<Blob>((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal mengompres foto QC ke PNG'))), 'image/png');
  });
  return blob;
}
