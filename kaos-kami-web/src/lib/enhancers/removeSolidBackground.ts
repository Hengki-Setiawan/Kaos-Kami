/**
 * Instant Canvas background remover (<10ms untuk foto HP, 0KB bundle).
 *
 * Metode: FLOOD-FILL dari tepi (audit #28 — chroma-key global lama MEMAKAN
 * putih interior kaos/gambar!). Hanya piksel yang TERHUBUNG ke tepi yang
 * dihapus + feather 1px di perbatasan agar tidak bergerigi.
 * Target: "white" (kertas/foto produk) atau "black" (foto malam).
 */

/**
 * M3.3/M3.4 — BG remover jalan di MASTER penuh.
 * Cap = 3000 (samakan masterMaxDimension) — BUKAN 1600 — agar master tak
 * turun resolusi diam-diam. 3000² RGBA ≈ 36MB + visited 9MB, aman di HP
 * modern; master >3000 (tak mungkin dari compressImage, tapi mungkin dari
 * teks/import) tetap di-cap + pemanggil WAJIB tampilkan badge
 * "master turun resolusi" (lihat BG_MAX_SIDE + wasBgDownscaled).
 *
 * 13 Sep 2026 (aditif, TANPA ubah algoritma): cap jadi ADAPTIF via
 * `BgRemovalOptions.maxSide` (default tetap BG_MAX_SIDE = 3000 — perilaku lama
 * 100% sama bila argumen ke-4 tak diisi) + `onProgress` opsional untuk badge
 * progres UI. Worker/SKIP: pemindahan ke Worker SENGAJA tidak dilakukan —
 * flood-fill sinkron <10ms untuk foto HP pada cap ini, Worker menambah
 * kompleksitas + risiko transfer buffer tanpa manfaat terukur. Ukur ulang
 * bila cap default naik atau ada laporan jank di HP kentang.
 */
export const BG_MAX_SIDE = 3000;

/** Opsi aditif — semua opsional; tanpa argumen = perilaku M3.3/M3.4 persis. */
export interface BgRemovalOptions {
  /** Cap sisi-terpanjang adaptif (mis. 2048 untuk HP kentang). Default BG_MAX_SIDE. */
  maxSide?: number;
  /** Dipanggil tiap ~16k piksel terhapus + sekali di akhir dengan total. */
  onProgress?: (removed: number) => void;
}

/** True bila sumber akan di-downscale oleh cap (UI wajib badge jujur). */
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
        // M3.3: tanpa cap 1600 — olah master penuh (cap 3000 = batas master).
        // 13 Sep 2026: cap adaptif — default SAMA (BG_MAX_SIDE), turun hanya
        // bila pemanggil eksplisit mengisi opts.maxSide (mis. HP kentang).
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
          // Progres opsional — throttled tiap ~16k piksel agar tak bebani
          // loop; TIDAK mengubah hasil (hanya observasi).
          if (onProgress && (removed & 0x3fff) === 0) onProgress(removed);
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }
        if (onProgress) onProgress(removed);

        // Tak ada yang terhapus dari tepi = background bukan solid tepi;
        // JANGAN hapus apa-apa (lebih aman daripada melubangi gambar).
        if (removed === 0) {
          resolve(canvas.toDataURL("image/png"));
          return;
        }

        ctx.putImageData(imgData, 0, 0);

        // M3.4 — Tepi bersih: choke 1px + decontaminate RGB + feather 1px.
        // 1) CHOKE 1px: susutkan alpha opaque 1px ke dalam agar halo
        //    putih/hitam sisa flood-fill tak ikut tercetak (standar DTF).
        // 2) DECONTAMINATE: piksel tepi semi-transparan di-un-premultiply
        //    dari warna background (putih/hitam) agar tak ada fringe abu.
        // 3) FEATHER 1px: haluskan alpha (RGB sudah bersih).
        {
          const frame = ctx.getImageData(0, 0, W, H);
          const d = frame.data;
          const alphaAt = (x: number, y: number): number => {
            if (x < 0 || y < 0 || x >= W || y >= H) return 0;
            return d[(y * W + x) * 4 + 3]!;
          };
          // Choke: piksel opaque yang bersentuhan langsung dengan transparan
          // (4-neighbor) dibuat semi (128) — menyusutkan halo 1px.
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
                // Choke: turunkan alpha tepi luar (halo paling kotor).
                d[o + 3] = Math.min(d[o + 3]!, 128);
              }
              const a = d[o + 3]! / 255;
              // Decontaminate RGB tepi semi-transparan dari warna BG.
              if (a > 0.01 && a < 0.99) {
                d[o] = Math.max(0, Math.min(255, Math.round((d[o]! - bgR * (1 - a)) / Math.max(a, 0.01))));
                d[o + 1] = Math.max(0, Math.min(255, Math.round((d[o + 1]! - bgG * (1 - a)) / Math.max(a, 0.01))));
                d[o + 2] = Math.max(0, Math.min(255, Math.round((d[o + 2]! - bgB * (1 - a)) / Math.max(a, 0.01))));
              }
            }
          }
          ctx.putImageData(frame, 0, 0);
        }

        // Feather 1px: rata-rata alpha tajam + blur = tepi semi-transparan.
        // (RGB dibiarkan — sudah di-decontaminate di atas.)
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
