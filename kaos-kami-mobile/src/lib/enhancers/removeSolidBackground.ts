/**
 * Instant Canvas background remover (<10ms untuk foto HP, 0KB bundle).
 *
 * Metode: FLOOD-FILL dari tepi (audit #28 — chroma-key global lama MEMAKAN
 * putih interior kaos/gambar!). Hanya piksel yang TERHUBUNG ke tepi yang
 * dihapus + feather 1px di perbatasan agar tidak bergerigi.
 * Target: "white" (kertas/foto produk) atau "black" (foto malam).
 */

export const BG_MAX_SIDE = 3000;

export interface BgRemovalOptions {
  /** Cap sisi-terpanjang adaptif (mis. 2048 untuk HP). Default BG_MAX_SIDE. */
  maxSide?: number;
  /** Dipanggil tiap ~16k piksel terhapus + sekali di akhir dengan total. */
  onProgress?: (removed: number) => void;
}

export function wasBgDownscaled(srcW: number, srcH: number, maxSide: number = BG_MAX_SIDE): boolean {
  return Math.max(srcW, srcH) > maxSide;
}

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
  tolerance: number = 32,
  opts?: BgRemovalOptions
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
        const cap = opts?.maxSide ?? BG_MAX_SIDE;
        const onProgress = opts?.onProgress;
        const k = Math.min(1, cap / Math.max(w, h));
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
          if (onProgress && (removed & 0x3fff) === 0) onProgress(removed);
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }
        if (onProgress) onProgress(removed);

        if (removed === 0) {
          resolve(canvas.toDataURL("image/png"));
          return;
        }

        ctx.putImageData(imgData, 0, 0);

        // Choke 1px + decontaminate RGB + feather 1px.
        {
          const frame = ctx.getImageData(0, 0, W, H);
          const d = frame.data;
          const alphaAt = (x: number, y: number): number => {
            if (x < 0 || y < 0 || x >= W || y >= H) return 0;
            return d[(y * W + x) * 4 + 3]!;
          };
          const chokeMask = new Uint8Array(W * H);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const idx = y * W + x;
              if (d[idx * 4 + 3]! === 0) continue;
              if (
                alphaAt(x + 1, y) === 0 ||
                alphaAt(x - 1, y) === 0 ||
                alphaAt(x, y + 1) === 0 ||
                alphaAt(x, y - 1) === 0
              ) {
                chokeMask[idx] = 1;
              }
            }
          }
          const bgR = targetColor === "white" ? 255 : 0;
          const bgG = targetColor === "white" ? 255 : 0;
          const bgB = targetColor === "white" ? 255 : 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const idx = y * W + x;
              const o = idx * 4;
              if (chokeMask[idx]) {
                d[o + 3] = Math.min(d[o + 3]!, 128);
              }
              const a = d[o + 3]! / 255;
              if (a > 0.01 && a < 0.99) {
                d[o] = Math.max(0, Math.min(255, Math.round((d[o]! - bgR * (1 - a)) / Math.max(a, 0.01))));
                d[o + 1] = Math.max(0, Math.min(255, Math.round((d[o + 1]! - bgG * (1 - a)) / Math.max(a, 0.01))));
                d[o + 2] = Math.max(0, Math.min(255, Math.round((d[o + 2]! - bgB * (1 - a)) / Math.max(a, 0.01))));
              }
            }
          }
          ctx.putImageData(frame, 0, 0);
        }

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
