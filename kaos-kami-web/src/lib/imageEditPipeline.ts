/**
 * FASE F — Image Edit Pipeline IN-MOCKUP (client-only, 0 dependensi baru).
 *
 * Alur: edit di kanvas 2D offscreen per-decal aktif → toDataURL →
 * `updateDecal` (di modal) → refresh badge DPI via `evaluateEditedQuality`.
 *
 * CATATAN implementasi (disengaja, didokumentasikan untuk verifikasi sentral):
 * - Operasi Sesuaikan diimplementasikan dengan Canvas2D (`ctx.filter` untuk
 *   brightness/contrast/saturate/hue/blur/grayscale/sepia + pass piksel manual
 *   untuk gamma/vibrance/sharpen + preset sablon). Semantik slider SAMA seperti
 *   `fabric.Image.filters`, tanpa menarik runtime fabric ke modal (fabric tetap
 *   dipakai FabricEditor; tidak ada dependensi baru di kedua jalur).
 * - Flip-X dikerjakan di ruang piksel SEBELUM simpan, sehingga tekstur 3D
 *   back-print teks langsung terbaca benar tanpa mengandalkan mirror material.
 */

import { evaluatePrintQuality, type QualityReport } from "@/lib/dpiAnalyzer";

/* ------------------------------------------------------------------ */
/* Tipe parameter                                                      */
/* ------------------------------------------------------------------ */

/** Satuan praktis UI: -1..1 kecuali hue (derajat), gamma, blur (px), sharpen (0..1). */
export interface AdjustParams {
  brightness: number; // -1..1 (0 = normal)
  contrast: number; // -1..1
  saturation: number; // -1..1
  vibrance: number; // -1..1 (jenuh selektif — menaikkan warna pudar saja)
  hue: number; // -180..180 derajat
  gamma: number; // 0.2..3 (1 = normal)
  blur: number; // 0..5 px
  sharpen: number; // 0..1
  grayscale: boolean;
  sepia: boolean;
}

export const DEFAULT_ADJUST: AdjustParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  hue: 0,
  gamma: 1,
  blur: 0,
  sharpen: 0,
  grayscale: false,
  sepia: false,
};

/** Crop relatif 0..1 terhadap gambar sumber. null = tanpa crop. */
export interface CropState {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SablonPresetId = "none" | "duotone-hitam" | "stencil" | "vintage";

export const SABLON_PRESETS: Array<{ id: SablonPresetId; nama: string; deskripsi: string }> = [
  { id: "none", nama: "Tanpa Efek", deskripsi: "Warna asli gambar." },
  {
    id: "duotone-hitam",
    nama: "Duotone Kaos Hitam",
    deskripsi: "Gelap→oranye Kaos Kami, terang→putih. Dirancang agar menyala di kaos hitam.",
  },
  {
    id: "stencil",
    nama: "Stencil Threshold",
    deskripsi: "Hitam-putih tegas 2 warna. Khas sablon manual & potong sticker.",
  },
  {
    id: "vintage",
    nama: "Vintage / Distressed",
    deskripsi: "Sepia pudar + bintik aus ala kaos distro lama.",
  },
];

export interface EditJob {
  adjust: AdjustParams;
  crop: CropState | null;
  rotateDeg: number; // -180..180
  flipX: boolean; // WAJIB untuk teks back-print agar terbaca
  preset: SablonPresetId;
}

export const DEFAULT_EDIT_JOB: EditJob = {
  adjust: { ...DEFAULT_ADJUST },
  crop: null,
  rotateDeg: 0,
  flipX: false,
  preset: "none",
};

/**
 * Batas sisi-panjang saat olah (M3.3: 3000 = samakan masterMaxDimension
 * compressImage agar editor TAK PERNAH menurunkan 3000→2400 diam-diam.
 * Memori: 3000² RGBA ≈ 36MB transient + 1 buffer sharpen (~36MB) ≈ 72MB
 * puncak — aman di HP modern (Chrome Android heap ≥256MB); OOM tetap
 * ditangkap pemanggil (try/catch → pesan, bukan crash). Bila OOM nyata di
 * HP kentang, turunkan kembali ke 2400 + tampilkan badge eksplisit —
 * JANGAN silent-downscale.
 */
export const EDIT_MAX_SIDE = 3000;

/* ------------------------------------------------------------------ */
/* Helper gambar                                                       */
/* ------------------------------------------------------------------ */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar untuk diedit"));
    img.src = src;
  });
}

export async function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  const img = await loadImage(dataUrl);
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/* ------------------------------------------------------------------ */
/* Pipeline utama: source → kanvas offscreen → dataURL PNG             */
/* ------------------------------------------------------------------ */

export async function applyImageEdits(sourceDataUrl: string, job: EditJob): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) throw new Error("Dimensi gambar tidak valid");

  // 1) Crop (relatif → px, di-clamp agar tak pernah keluar gambar).
  const c = job.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const cx = clamp(c.x, 0, 0.99) * srcW;
  const cy = clamp(c.y, 0, 0.99) * srcH;
  const cw = clamp(c.w, 0.02, 1) * srcW;
  const ch = clamp(c.h, 0.02, 1) * srcH;
  const sx = clamp(cx, 0, srcW - 1);
  const sy = clamp(cy, 0, srcH - 1);
  const sw = clamp(cw, 1, srcW - sx);
  const sh = clamp(ch, 1, srcH - sy);

  // Cap resolusi olah agar HP tidak OOM; skala <1 hanya bila perlu.
  const k = Math.min(1, EDIT_MAX_SIDE / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * k));
  const dh = Math.max(1, Math.round(sh * k));

  const base = document.createElement("canvas");
  base.width = dw;
  base.height = dh;
  const ctx = base.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Kanvas 2D tidak tersedia di browser ini");

  // 2) Filter cepat via ctx.filter (setara fabric Brightness/Contrast/
  // Saturation/HueRotation/Blur/Grayscale/Sepia).
  const a = job.adjust;
  const filterParts: string[] = [];
  if (a.brightness !== 0) filterParts.push(`brightness(${(1 + a.brightness).toFixed(3)})`);
  if (a.contrast !== 0) filterParts.push(`contrast(${(1 + a.contrast).toFixed(3)})`);
  if (a.saturation !== 0) filterParts.push(`saturate(${(1 + a.saturation).toFixed(3)})`);
  if (a.hue !== 0) filterParts.push(`hue-rotate(${a.hue}deg)`);
  if (a.grayscale) filterParts.push("grayscale(1)");
  if (a.sepia) filterParts.push("sepia(1)");
  if (a.blur > 0) filterParts.push(`blur(${clamp(a.blur, 0, 5).toFixed(2)}px)`);
  ctx.filter = filterParts.length > 0 ? filterParts.join(" ") : "none";
  ctx.clearRect(0, 0, dw, dh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.filter = "none";

  // 3) Pass piksel manual: gamma + vibrance + sharpen + preset sablon.
  const needPixelPass =
    a.gamma !== 1 || a.vibrance !== 0 || a.sharpen > 0 || job.preset !== "none";
  if (needPixelPass) {
    const frame = ctx.getImageData(0, 0, dw, dh);
    applyPixelPass(frame.data, dw, dh, a, job.preset);
    ctx.putImageData(frame, 0, 0);
  }

  // 4) Putar + balik horizontal di ruang piksel (hasil akhir yang disimpan).
  const rot = ((job.rotateDeg % 360) + 360) % 360;
  if (rot === 0 && !job.flipX) {
    return base.toDataURL("image/png");
  }
  const rad = (rot * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const ow = Math.max(1, Math.round(dw * cos + dh * sin));
  const oh = Math.max(1, Math.round(dw * sin + dh * cos));
  const out = document.createElement("canvas");
  out.width = ow;
  out.height = oh;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Kanvas 2D tidak tersedia di browser ini");
  octx.translate(ow / 2, oh / 2);
  octx.rotate(rad);
  octx.scale(job.flipX ? -1 : 1, 1);
  octx.drawImage(base, -dw / 2, -dh / 2);
  return out.toDataURL("image/png");
}

/** Pass piksel tunggal: gamma → vibrance → sharpen → preset (mutasi `data`). */
function applyPixelPass(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  a: AdjustParams,
  preset: SablonPresetId
): void {
  const n = w * h;

  // Gamma via LUT.
  let gammaLut: Uint8ClampedArray | null = null;
  if (a.gamma !== 1) {
    const g = clamp(a.gamma, 0.2, 3);
    gammaLut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      gammaLut[i] = clamp(Math.round(255 * Math.pow(i / 255, 1 / g)), 0, 255);
    }
  }

  const vib = clamp(a.vibrance, -1, 1);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = data[o]!;
    let g = data[o + 1]!;
    let b = data[o + 2]!;
    const alpha = data[o + 3]!;

    if (gammaLut) {
      r = gammaLut[r]!;
      g = gammaLut[g]!;
      b = gammaLut[b]!;
    }

    if (vib !== 0) {
      // Vibrance: dorong piksel pudar (saturasi rendah) lebih kuat.
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const amt = vib * (1 - sat) * 0.6;
      if (amt !== 0) {
        const avg = (r + g + b) / 3;
        r = clamp(Math.round(r + (r - avg) * amt), 0, 255);
        g = clamp(Math.round(g + (g - avg) * amt), 0, 255);
        b = clamp(Math.round(b + (b - avg) * amt), 0, 255);
      }
    }

    if (preset !== "none") {
      const p = applySablonPreset(r, g, b, alpha, i, w, preset);
      r = p[0]!;
      g = p[1]!;
      b = p[2]!;
      data[o + 3] = p[3]!;
    }

    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
  }

  // Sharpen (unsharp-mask sederhana): butuh tetangga → dua buffer.
  if (a.sharpen > 0) {
    const amt = clamp(a.sharpen, 0, 1) * 0.9;
    const src = Uint8ClampedArray.from(data);
    const idx = (x: number, y: number) => (clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)) * 4;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const blurAvg =
            (src[idx(x - 1, y) + ch]! +
              src[idx(x + 1, y) + ch]! +
              src[idx(x, y - 1) + ch]! +
              src[idx(x, y + 1) + ch]!) /
            4;
          data[o + ch] = clamp(Math.round(src[o + ch]! + (src[o + ch]! - blurAvg) * amt), 0, 255);
        }
      }
    }
  }
}

/** F4 — 3 preset Efek Sablon. Mengembalikan [r,g,b,a]. */
function applySablonPreset(
  r: number,
  g: number,
  b: number,
  alpha: number,
  pixelIndex: number,
  width: number,
  preset: SablonPresetId
): [number, number, number, number] {
  // Luminansi perseptual.
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  if (preset === "duotone-hitam") {
    // Gelap → oranye Kaos Kami (#E65100), terang → putih tulang (#FFF7ED).
    const t = clamp(lum, 0, 1);
    const nr = Math.round(230 * (1 - t) + 255 * t);
    const ng = Math.round(81 * (1 - t) + 247 * t);
    const nb = Math.round(0 * (1 - t) + 237 * t);
    return [nr, ng, nb, alpha];
  }

  if (preset === "stencil") {
    // Threshold tegas di tengah; piksel nyaris-transparan ikut dibuang.
    if (alpha < 24) return [0, 0, 0, 0];
    const v = lum > 0.5 ? 255 : 0;
    return [v, v, v, alpha];
  }

  // vintage: sepia hangat + pudar + bintik aus deterministik (stabil per piksel).
  const vr = clamp(Math.round(r * 0.88 + g * 0.08 + 18), 0, 255);
  const vg = clamp(Math.round(r * 0.12 + g * 0.72 + b * 0.08 + 8), 0, 255);
  const vb = clamp(Math.round(g * 0.15 + b * 0.6), 0, 255);
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  // Hash murah → bintik aus di ~7% piksel area terang-tengah.
  const hash = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  const wear = hash % 100 < 7 && lum > 0.25 && lum < 0.85;
  const va = wear ? Math.round(alpha * 0.25) : Math.round(alpha * 0.92);
  return [vr, vg, vb, va];
}

/* ------------------------------------------------------------------ */
/* F5 — DPI re-check dari piksel BARU + registry master produksi       */
/* ------------------------------------------------------------------ */

export interface EditedQuality extends QualityReport {
  pxW: number;
  pxH: number;
}

/** Hitung ulang kualitas cetak dari piksel hasil edit (JANGAN bawa DPI lama). */
export async function evaluateEditedQuality(
  editedDataUrl: string,
  printWidthCm: number,
  printHeightCm?: number
): Promise<EditedQuality> {
  const { w, h } = await getImageSize(editedDataUrl);
  const report = evaluatePrintQuality(w, printWidthCm, h, printHeightCm ?? printWidthCm);
  return { ...report, pxW: w, pxH: h };
}

const MASTER_LS_KEY = "kaoskami_master_assets";
const masterMem = new Map<string, string>();

/* ------------------------------------------------------------------ */
/* M3.3 — Original master tak tersentuh (restore "Kembalikan asli")    */
/* ------------------------------------------------------------------ */

const ORIGINAL_LS_KEY = "kaoskami_original_masters";
const originalMem = new Map<string, string>();

function readOriginalBucket(): Record<string, { url?: string; at?: string }> {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(ORIGINAL_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Simpan original master SEKALI (first-write-wins). Panggil SEBELUM
 * menimpa master dengan hasil BG/sharp/edit — agar "Kembalikan asli"
 * selalu bisa pulihkan file upload awal. Best-effort (kuota LS).
 */
export function setOriginalMasterDataUrl(decalId: string, dataUrl: string): void {
  if (originalMem.has(decalId)) return;
  try {
    if (typeof window !== "undefined") {
      const all = readOriginalBucket();
      if (all[`original:${decalId}`]?.url) {
        originalMem.set(decalId, all[`original:${decalId}`]!.url as string);
        return;
      }
    }
  } catch {
    // abaikan — lanjut simpan memori
  }
  originalMem.set(decalId, dataUrl);
  try {
    if (typeof window === "undefined") return;
    const all = readOriginalBucket();
    if (!all[`original:${decalId}`]?.url) {
      all[`original:${decalId}`] = { url: dataUrl, at: new Date().toISOString() };
      window.localStorage.setItem(ORIGINAL_LS_KEY, JSON.stringify(all));
    }
  } catch {
    // Kuota penuh — original tetap di memori sesi ini.
  }
}

/** Ambil original master; null bila belum pernah disimpan. */
export function getOriginalMasterDataUrl(decalId: string): string | null {
  const mem = originalMem.get(decalId);
  if (mem) return mem;
  try {
    const entry = readOriginalBucket()[`original:${decalId}`];
    if (entry?.url) {
      originalMem.set(decalId, entry.url);
      return entry.url;
    }
  } catch {
    // abaikan
  }
  return null;
}

/** True bila decal ini punya original tersimpan (tombol restore tampil). */
export function hasOriginalMaster(decalId: string): boolean {
  return getOriginalMasterDataUrl(decalId) !== null;
}

export function clearOriginalMasterDataUrl(decalId: string): void {
  originalMem.delete(decalId);
  try {
    if (typeof window === "undefined") return;
    const all = readOriginalBucket();
    delete all[`original:${decalId}`];
    window.localStorage.setItem(ORIGINAL_LS_KEY, JSON.stringify(all));
  } catch {
    // abaikan
  }
}

/**
 * M3.6 — Status master per-decal untuk UI + gate checkout.
 * - `saved`: true bila master berupa https R2 (sudah ter-upload, aman checkout).
 * - base64 lokal = "belum tersimpan" — guest tetap bisa via server-hosting
 *   (POST /api/designs draft meng-hosting-kan ke R2; checkout arsipkan
 *   decals base64 via archiveDecalsToR2), tapi user WAJIB diperingatkan.
 */
export function isHttpsMasterUrl(u: unknown): boolean {
  return typeof u === "string" && /^https?:\/\//.test(u);
}

export function hasHttpsMaster(decalId: string): boolean {
  try {
    const { getMasterDataUrl: _g } = { getMasterDataUrl };
    void _g;
  } catch {}
  const mem = masterMem.get(decalId);
  if (typeof mem === "string" && mem.length > 0) return isHttpsMasterUrl(mem);
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(MASTER_LS_KEY);
      if (raw) {
        const all = JSON.parse(raw) as Record<string, { url?: string }>;
        const u = all[`decal:${decalId}`]?.url;
        if (typeof u === "string" && u.length > 0) return isHttpsMasterUrl(u);
      }
    }
  } catch {
    // abaikan
  }
  return false;
}

function readMasterBucket(): Record<string, { url?: string; at?: string }> {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(MASTER_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Simpan master produksi per decal. Master = file asli upload / hasil edit
 * resolusi penuh — TERPISAH dari preview 1200px yang dipakai tekstur 3D.
 * Persist localStorage bersifat best-effort (kuota ~5MB; master besar tetap
 * hidup di memori sesi ini bila kuota penuh).
 */
export function setMasterDataUrl(decalId: string, dataUrl: string): void {
  masterMem.set(decalId, dataUrl);
  try {
    if (typeof window === "undefined") return;
    const all = readMasterBucket();
    all[`decal:${decalId}`] = { url: dataUrl, at: new Date().toISOString() };
    window.localStorage.setItem(MASTER_LS_KEY, JSON.stringify(all));
  } catch {
    // Kuota penuh — master tetap tersedia di memori sesi ini.
  }
}

/** Ambil master; fallback ke URL preview bila belum ada (kontrak lama). */
export function getMasterDataUrl(decalId: string, fallbackUrl: string): string {
  const mem = masterMem.get(decalId);
  if (mem) return mem;
  try {
    const entry = readMasterBucket()[`decal:${decalId}`];
    if (entry?.url) {
      masterMem.set(decalId, entry.url);
      return entry.url;
    }
  } catch {
    // abaikan — pakai fallback
  }
  return fallbackUrl;
}

export function clearMasterDataUrl(decalId: string): void {
  masterMem.delete(decalId);
  try {
    if (typeof window === "undefined") return;
    const all = readMasterBucket();
    delete all[`decal:${decalId}`];
    window.localStorage.setItem(MASTER_LS_KEY, JSON.stringify(all));
  } catch {
    // abaikan
  }
}

/** Kumpulkan semua master per-decal (kunci `decal:<id>`) untuk wiring checkout. */
export function collectDecalMasters(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of masterMem) out[k] = v;
  try {
    const all = readMasterBucket();
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith("decal:") && v?.url && !out[k.slice("decal:".length)]) {
        out[k.slice("decal:".length)] = v.url;
      }
    }
  } catch {
    // abaikan
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* K2 — Upload master base64 → R2 https + bangun map checkout          */
/* ------------------------------------------------------------------ */

function isHttpsUrl(u: unknown): boolean {
  return typeof u === "string" && /^https?:\/\//.test(u);
}

function unwrapMasterUrl(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (v && typeof v === "object" && typeof (v as any).url === "string" && (v as any).url.length > 0) {
    return (v as any).url;
  }
  return null;
}

/**
 * Upload SATU master base64 ke R2 via endpoint login `/api/upload/r2`
 * (kind=master, maks 10MB, png/jpg/webp). Kembalikan URL https atau null.
 * Guest (401) → null (pemanggil pakai jalur draft POST /api/designs yang
 * meng-hosting-kan server-side; JANGAN kirim base64 ke checkout).
 */
export async function uploadMasterDataUrlToR2(dataUrl: string): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  if (isHttpsUrl(dataUrl)) return dataUrl;
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const res = await fetch("/api/upload/r2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl, kind: "master" }),
    });
    if (!res.ok) return null;
    const j = (await res.json().catch(() => null)) as { url?: unknown } | null;
    return isHttpsUrl(j?.url) ? (j!.url as string) : null;
  } catch {
    return null;
  }
}

/**
 * Upload semua master base64 di registry ke R2 (best-effort) + ganti isi
 * registry dengan https agar save/checkout berikutnya langsung https.
 * Kembalikan map id→https HANYA yang sudah https (base64 tak ikut —
 * payload checkout tetap <50KB, DB tak bengkak).
 */
export async function ensureDecalMastersUploaded(): Promise<Record<string, string>> {
  const all = collectDecalMasters();
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(all)) {
    if (isHttpsUrl(url)) {
      out[id] = url;
      continue;
    }
    if (typeof url === "string" && url.startsWith("data:image")) {
      const https = await uploadMasterDataUrlToR2(url);
      if (https) {
        try {
          setMasterDataUrl(id, https);
        } catch {
          // abaikan — map tetap dikembalikan
        }
        out[id] = https;
      }
      // Gagal (guest/kuota) → lewati, JANGAN kirim base64 ke checkout.
    }
  }
  return out;
}

/**
 * Bangun map checkout K2: side→https + `decal:<id>`→https (maks 20 entri).
 * Sumber: panel-master Pola 2D (`<apparel>:<panel>` di LS, sudah https R2)
 * + decal-master https dari registry. Base64 tak pernah ikut.
 */
export function buildCheckoutMasterMap(activeApparel?: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem("kaoskami_master_assets") : null;
    if (raw) {
      const all = JSON.parse(raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(all)) {
        if (Object.keys(out).length >= 20) break;
        const u = unwrapMasterUrl(v);
        if (!u || !isHttpsUrl(u)) continue;
        if (k.startsWith("decal:")) {
          out[k] = u;
        } else if (activeApparel && k.startsWith(`${activeApparel}:`)) {
          const side = k.slice(activeApparel.length + 1);
          if (side && !out[side]) out[side] = u;
        }
      }
    }
  } catch {
    // abaikan — lanjut registry
  }
  try {
    const decalMasters = collectDecalMasters();
    for (const [id, url] of Object.entries(decalMasters)) {
      if (Object.keys(out).length >= 20) break;
      if (isHttpsUrl(url) && !out[`decal:${id}`]) out[`decal:${id}`] = url;
    }
  } catch {
    // abaikan
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* C1 (owner): AI BG Pro DICABUT permanen — lisensi AGPL tak diambil.    */
/* Hapus background = flood-fill lokal via removeSolidBackground        */
/* (drawer + tombol di editor). Blok AI dihapus total 09 Sep 2026.      */
/* ------------------------------------------------------------------ */
