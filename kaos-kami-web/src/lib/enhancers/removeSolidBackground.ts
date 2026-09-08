/**
 * Instant Canvas background remover (<10ms untuk foto HP, 0KB bundle).
 *
 * Metode: FLOOD-FILL dari tepi (audit #28 — chroma-key global lama MEMAKAN
 * putih interior kaos/gambar!). Hanya piksel yang TERHUBUNG ke tepi yang
 * dihapus + feather 1px di perbatasan agar tidak bergerigi.
 * Target: "white" (kertas/foto produk) atau "black" (foto malam).
 */

function matchTarget(r: number, g: number, b: number, targetColor: "white" | "black", tolerance: number): boolean {
  if (targetColor === "white") {
    const t = 255 - tolerance;
    return r >= t && g >= t && b >= t;
  }
  return r <= tolerance && g <= tolerance && b <= tolerance;
}

export function removeSolidBackground(
  imageSource: string | HTMLImageElement,
  targetColor: "white" | "black" = "white",
  tolerance: number = 32
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        // Cap 1600px: flood-fill O(n) + getImageData besar bikin HP hang.
        const k = Math.min(1, 1600 / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * k));
        canvas.height = Math.max(1, Math.round(h * k));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const W = canvas.width;
        const H = canvas.height;

        // Flood-fill dari SEMUA piksel tepi (atas/bawah/kiri/kanan).
        const visited = new Uint8Array(W * H);
        const stack: number[] = [];
        const push = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= W || y >= H) return;
          const idx = y * W + x;
          if (visited[idx]) return;
          const o = idx * 4;
          if (!matchTarget(data[o]!, data[o + 1]!, data[o + 2]!, targetColor, tolerance)) return;
          visited[idx] = 1;
          stack.push(idx);
        };
        for (let x = 0; x < W; x++) {
          push(x, 0);
          push(x, H - 1);
        }
        for (let y = 0; y < H; y++) {
          push(0, y);
          push(W - 1, y);
        }
        let removed = 0;
        while (stack.length > 0) {
          const idx = stack.pop()!;
          const x = idx % W;
          const y = (idx - x) / W;
          data[idx * 4 + 3] = 0;
          removed++;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }

        // Tak ada yang terhapus dari tepi = background bukan solid tepi;
        // JANGAN hapus apa-apa (lebih aman daripada melubangi gambar).
        if (removed === 0) {
          resolve(canvas.toDataURL("image/png"));
          return;
        }

        ctx.putImageData(imgData, 0, 0);

        // Feather 1px: rata-rata alpha tajam + blur = tepi semi-transparan.
        // (RGB dibiarkan tajam — hanya alpha yang dihaluskan.)
        const mask = document.createElement("canvas");
        mask.width = W;
        mask.height = H;
        const mctx = mask.getContext("2d");
        if (mctx) {
          mctx.filter = "blur(1px)";
          mctx.drawImage(canvas, 0, 0);
          const sharp = ctx.getImageData(0, 0, W, H);
          const blurred = mctx.getImageData(0, 0, W, H);
          for (let i = 3; i < sharp.data.length; i += 4) {
            sharp.data[i] = Math.round((sharp.data[i]! + blurred.data[i]!) / 2);
          }
          ctx.putImageData(sharp, 0, 0);
        }

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error("Failed to load image for background removal"));
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}
