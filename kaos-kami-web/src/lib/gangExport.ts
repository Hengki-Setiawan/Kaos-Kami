"use client";

/**
 * EKSPOR GANG-SHEET DTF KE PNG (lembar film siap print).
 *
 * - Ukuran kanvas dihitung dari milimeter + DPI: px = round(mm / 25.4 * dpi).
 * - DPI default 300 (HD maksimal; file puluhan MB wajar). Toggle 150
 *   tersedia bila browser/HP macet.
 * - Tiap desain digambar proporsional (jaga aspek rasio, letterbox transparan
 *   bila aspek gambar tak pas dengan kotaknya).
 * - Label/order TIDAK dibakar ke PNG — label hanya ada di `recapText`.
 * - Gambar yang gagal dimuat (termasuk gagal CORS) DILEWATI + dicatat jujur
 *   di `warnings`, tidak pernah gagal diam-diam.
 * - Render bertahap (await per item + yield ke UI) + kanvas offscreen
 *   (tidak ditempel ke DOM) agar tab tidak freeze.
 *
 * Berkas ini murni browser (Blob/Canvas/Image/fetch). Jangan diimpor dari
 * Server Component / route handler — panggil dari halaman admin (client).
 *
 * KONTRAK TILED-MASTER (PatternStudio ekspor A3/besar, M3.7) — BACA INI:
 * - LS `kaoskami_master_assets["<apparel>:<panel>"]` = { url (= tile0),
 *   tiles[] (set lengkap URL R2), cols, rows, tiled:true, wCm, hCm }.
 * - JANGAN bikin endpoint compose server (Workers tak bisa: tanpa DOM Canvas,
 *   batas Worker 3MB, kanvas raksasa di server = OOM). Rakit ulang
 *   SELALU di client dari `tiles[]` (grid cols×rows, contain + letterbox).
 * - KONSUMEN WAJIB baca `tiles[]` (set lengkap) + `tile0` (= `url`) untuk
 *   pembaca lama: tile0 = pratinjau/kompatibel-legacy, tiles[] = cetak penuh.
 *   buildCheckoutMasterMap() sengaja hanya membawa `url` (tile0) agar payload
 *   checkout <50KB; perakitan penuh tiled = tugas halaman admin (client).
 */

import type { GangPlacement } from "@/lib/gangPacker";

// ---------------------------------------------------------------------------
// Kontrak publik (wajib persis — halaman admin mengimpor tipe & fungsi ini)
// ---------------------------------------------------------------------------

/** Masukan ekspor: satu lembar (bin) gang-sheet beserta isinya. */
export interface GangExportInput {
  placements: GangPlacement[];
  binWmm: number;
  binHmm: number;
  dpi?: number;
  cutLines?: boolean;
  gangId?: string;
}

/** Hasil ekspor: blob PNG lokal + rekap Bahasa Indonesia + peringatan jujur. */
export interface GangExportResult {
  blob: Blob;
  filename: string;
  recapText: string;
  widthPx: number;
  heightPx: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Konstanta & konversi satuan
// ---------------------------------------------------------------------------

/** DPI default (hemat memori, cukup untuk powder/press DTF). */
const DEFAULT_DPI = 300;

/** Batas atas kewarasan DPI agar kanvas tak meledak (disanitasi, bukan error). */
const MAX_DPI = 600;

/** Batas bawah kewarasan DPI. */
const MIN_DPI = 72;

/** Batas upload route /api/upload/r2 (multipart menolak file > 10MB). */
const R2_MAX_BYTES = 10 * 1024 * 1024;

/** Milimeter per inci (definisi). */
const MM_PER_INCH = 25.4;

/** Jeda yield antar item agar main thread bisa bernapas (anti-freeze). */
const YIELD_MS = 0;

/** Konversi milimeter ke piksel pada DPI tertentu, selalu dibulatkan. */
function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/** Tanggal lokal YYYY-MM-DD untuk nama file (tanpa ketergantungan locale). */
function todayLocalYYYYMMDD(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sanitasi DPI: default 300 (HD maksimal), 150 bila diminta hemat, nilai ngawur dijepit jujur. */
function sanitizeDpi(dpi: number | undefined): number {
  if (dpi === undefined || dpi === null) return DEFAULT_DPI;
  const n = Math.round(Number(dpi));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DPI;
  return Math.min(MAX_DPI, Math.max(MIN_DPI, n));
}

// ---------------------------------------------------------------------------
// Pembaca defensif untuk GangPlacement
// ---------------------------------------------------------------------------
// Bentuk pasti GangPlacement didefinisikan di "@/lib/gangPacker" (milik modul
// packer, bukan berkas ini). Agar pengekspor tetap jalan walau packer memakai
// nama kunci sedikit berbeda, tiap kolom dibaca lewat daftar alias — yang
// penting `masterUrl` (sumber gambar) + kotak mm + identitas order.

/** Ambil objek sebagai kamus string agar bisa dibaca per alias tanpa `any` liar. */
function asRecord(p: GangPlacement): Record<string, unknown> {
  return p as unknown as Record<string, unknown>;
}

/** Ambil angka finite pertama dari daftar kunci alias (dukungan cm → mm). */
function readMm(obj: Record<string, unknown>, mmKeys: string[], cmKeys: string[]): number | undefined {
  for (const k of mmKeys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v as number;
  }
  for (const k of cmKeys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return (v as number) * 10;
  }
  return undefined;
}

/** Ambil string tak-kosong pertama dari daftar kunci alias. */
function readStr(obj: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return fallback;
}

/** Ambil qty (bilangan bulat >= 1) dari alias umum; fallback 1. */
function readQty(obj: Record<string, unknown>): number {
  for (const k of ["qty", "quantity", "count", "copies", "jumlah"]) {
    const v = Number(obj[k]);
    if (Number.isFinite(v) && (v as number) >= 1) return Math.round(v as number);
  }
  return 1;
}

/** Tebak nomor bin/lembar (M<bin>) dari placement atau gangId; fallback 1. */
function inferBinNumber(placements: GangPlacement[], gangId: string | undefined): number {
  // 1. Cari kolom eksplisit di placement pertama (nama umum packer).
  if (placements.length > 0) {
    const first = asRecord(placements[0] as GangPlacement);
    for (const k of ["bin", "binIndex", "binNo", "sheet", "sheetIndex", "page", "m"]) {
      const v = Number(first[k]);
      // Packer 0-based (binIndex 0) → tampilkan 1-based (M1) agar ramah operator.
      if (k === "binIndex" || k === "sheetIndex") {
        if (Number.isInteger(v) && (v as number) >= 0) return (v as number) + 1;
      } else if (Number.isInteger(v) && (v as number) >= 1) {
        return v as number;
      }
    }
  }
  // 2. Parse dari gangId bila mengandung pola M<angka> (mis. "GANG-2026-09-09-M2").
  if (gangId) {
    const m = gangId.match(/M(\d{1,3})\b/i);
    if (m?.[1]) {
      const v = Number(m[1]);
      if (Number.isInteger(v) && v >= 1) return v;
    }
  }
  // 3. Fallback jujur: lembar pertama.
  return 1;
}

// ---------------------------------------------------------------------------
// Util browser: gambar CORS + yield + blob
// ---------------------------------------------------------------------------

/**
 * Muat satu gambar dengan CORS anonim.
 * - `crossOrigin="anonymous"` dipasang SEBELUM `src` agar kanvas tidak
 *   ter-taint oleh gambar R2/CDN tanpa header CORS.
 * - URL data:/blob: tidak butuh CORS (tetap dimuat normal).
 * - Gagal load (termasuk ditolak CORS) → reject dengan pesan jelas, pemanggil
 *   WAJIB mencatatnya ke `warnings` (jangan diam).
 */
function loadImageCORS(url: string, timeoutMs = 30_000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Atribut decoding async: decode tak memblokir render (best-effort).
    try {
      (img as HTMLImageElement & { decoding?: string }).decoding = "async";
    } catch {
      /* abaikan — browser lama */
    }
    if (/^https?:\/\//i.test(url)) {
      img.crossOrigin = "anonymous";
    }
    const timer = window.setTimeout(() => {
      img.src = "";
      reject(new Error(`timeout ${timeoutMs}ms saat memuat gambar`));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      // Gambar 0px = korup — perlakukan sebagai gagal, bukan gambar valid.
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error("gambar 0px (file korup atau decode gagal)"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(
        new Error(
          "gagal memuat (URL salah/hapus, jaringan, atau server gambar menolak CORS — " +
            "pastikan R2 mengirim Access-Control-Allow-Origin)"
        )
      );
    };
    img.src = url;
  });
}

/** Serahkan kendali sebentar ke event loop agar UI tak freeze antar item. */
function yieldToUI(): Promise<void> {
  return new Promise((r) => window.setTimeout(r, YIELD_MS));
}

/** Bungkus canvas.toBlob (callback) menjadi Promise; null = gagal encode. */
function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("gagal encode PNG (memori penuh atau kanvas ter-taint CORS)"));
            return;
          }
          resolve(b);
        },
        type
      );
    } catch (e) {
      // Kanvas ter-taint melempar SecurityError di sebagian browser.
      reject(
        new Error(
          `kanvas terkunci CORS (${e instanceof Error ? e.message : String(e)}). ` +
            "Seharusnya tak terjadi karena tiap gambar dimuat anonim — laporkan bug ini."
        )
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Ekspor utama
// ---------------------------------------------------------------------------

/**
 * Render satu lembar gang-sheet menjadi PNG transparan (tanpa label bakar).
 *
 * @param input.placements Isi lembar dari packer (sumber gambar: `masterUrl`).
 * @param input.binWmm Lebar lembar (mm), mis. 580 untuk roll 58cm.
 * @param input.binHmm Tinggi lembar (mm), mis. 1000 untuk potongan 100cm.
 * @param input.dpi Resolusi cetak (default 300 HD maksimal; 150 bila hemat, dijepit 72–600).
 * @param input.cutLines Bila true: garis potong putus-putus hitam 2px di
 *   sekeliling tiap kotak (digeser ke area gap, BUKAN di atas artwork).
 * @param input.gangId Id gang untuk nama file, rekap, dan catatan.
 */
export async function exportGangSheetPNG(input: GangExportInput): Promise<GangExportResult> {
  // Guard lingkungan: API DOM hanya ada di browser (halaman admin = client).
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("exportGangSheetPNG hanya bisa berjalan di browser (halaman admin).");
  }

  const warnings: string[] = [];
  const dpi = sanitizeDpi(input.dpi);
  if (input.dpi !== undefined && dpi !== Math.round(Number(input.dpi))) {
    warnings.push(`DPI ${String(input.dpi)} di luar nalar — dipakai ${dpi} DPI.`);
  }

  // Validasi dimensi lembar (mm). Nol/negatif/NaN = tolak cepat dengan jelas.
  const binWmm = Number(input.binWmm);
  const binHmm = Number(input.binHmm);
  if (!Number.isFinite(binWmm) || !Number.isFinite(binHmm) || binWmm <= 0 || binHmm <= 0) {
    throw new Error(`Dimensi lembar tidak valid (binWmm=${String(input.binWmm)}, binHmm=${String(input.binHmm)}).`);
  }

  // 1px = mm/25.4*dpi, dibulatkan — rumus tunggal untuk kanvas & tiap kotak.
  const widthPx = mmToPx(binWmm, dpi);
  const heightPx = mmToPx(binHmm, dpi);
  if (widthPx <= 0 || heightPx <= 0) {
    throw new Error(`Hasil konversi px tidak valid (${widthPx}x${heightPx}px dari ${binWmm}x${binHmm}mm @${dpi}DPI).`);
  }
  // Peringatan memori jujur: 300 DPI di lembar besar bisa >80MP (~320MB RGBA).
  const megaPx = (widthPx * heightPx) / 1_000_000;
  if (megaPx > 80) {
    warnings.push(
      `Kanvas sangat besar (${widthPx}x${heightPx}px ≈ ${megaPx.toFixed(0)}MP @${dpi}DPI) — ` +
        "bila browser macet, ulangi dengan 150 DPI."
    );
  }

  // Kanvas offscreen: dibuat di memori, TIDAK ditempel ke DOM (tidak
  // mengganggu layout, tidak memicu reflow). Latar dibiarkan transparan
  // (film DTF tidak butuh background putih — area kosong = tak tercetak).
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Browser tidak menyediakan konteks canvas 2d.");
  ctx.clearRect(0, 0, widthPx, heightPx);

  const placements = Array.isArray(input.placements) ? input.placements : [];
  if (placements.length === 0) {
    warnings.push("Tidak ada placement — PNG yang dihasilkan lembar kosong transparan.");
  }

  // Akumulator rekap (dibangun sambil render agar yang dilewati tetap tercatat).
  let usedAreaMm2 = 0;
  let drawnCount = 0;
  // DPI efektif terendah antar desain (dari piksel ASLI file vs ukuran cetak —
  // jujur: sheet 300 DPI tak menambah detail file yang cuma 100 DPI).
  let minEffDpi = Number.POSITIVE_INFINITY;
  const recapLines: string[] = [];

  // Render SEQUENTIAL (await per item): hemat memori puncak + memberi celah
  // yield tiap iterasi sehingga spinner/progress admin tetap hidup.
  for (let i = 0; i < placements.length; i++) {
    const raw = placements[i] as GangPlacement;
    const obj = asRecord(raw);
    const label = readStr(obj, ["orderNumber", "orderNo", "orderId", "order", "notes", "name", "label", "id"], `#${i + 1}`);

    // Kotak placement dalam mm (dukungan alias cm → otomatis ×10).
    const xMm = readMm(obj, ["xMm", "x", "leftMm", "posXMm"], ["xCm", "leftCm"]);
    const yMm = readMm(obj, ["yMm", "y", "topMm", "posYMm"], ["yCm", "topCm"]);
    const wMm = readMm(obj, ["wMm", "widthMm", "w", "width", "printWidthMm"], ["wCm", "widthCm", "printWidthCm"]);
    const hMm = readMm(obj, ["hMm", "heightMm", "h", "height", "printHeightMm"], ["hCm", "heightCm", "printHeightCm"]);
    const qty = readQty(obj);
    const masterUrl = readStr(obj, ["masterUrl", "printFileUrl", "masterDataUrl", "url", "src", "imageUrl"], "");

    // Teks ukuran untuk rekap (selalu cm 1 desimal, mis. 20.0×25.0cm).
    const sizeCmText =
      wMm !== undefined && hMm !== undefined && Number.isFinite(wMm) && Number.isFinite(hMm)
        ? `${(wMm / 10).toFixed(1)}×${(hMm / 10).toFixed(1)}cm`
        : "ukuran tak terbaca";
    const posText =
      xMm !== undefined && yMm !== undefined && Number.isFinite(xMm) && Number.isFinite(yMm)
        ? `posisi ${xMm},${yMm}mm`
        : "posisi tak terbaca";
    recapLines.push(`${i + 1}. Order ${label} — ${sizeCmText} — qty ${qty} — ${posText}`);

    // Validasi kotak sebelum menggambar (kotak rusak = lewati + catat, bukan crash).
    if (xMm === undefined || yMm === undefined || wMm === undefined || hMm === undefined) {
      warnings.push(`Desain #${i + 1} (Order ${label}) dilewati: koordinat/ukuran tak lengkap di data packer.`);
      await yieldToUI();
      continue;
    }
    if (!(wMm > 0 && hMm > 0)) {
      warnings.push(`Desain #${i + 1} (Order ${label}) dilewati: ukuran ${wMm}x${hMm}mm tidak valid.`);
      await yieldToUI();
      continue;
    }
    if (masterUrl === "") {
      warnings.push(`Desain #${i + 1} (Order ${label}) dilewati: masterUrl kosong (master 300 DPI belum ada?).`);
      await yieldToUI();
      continue;
    }

    // Akumulasi utilisasi dari luas kotak packer (bukan piksel gambar).
    usedAreaMm2 += wMm * hMm * qty;

    // Muat gambar. Gagal (termasuk CORS) = lewati item + warning JUJUR.
    let img: HTMLImageElement;
    try {
      img = await loadImageCORS(masterUrl);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      warnings.push(`Desain #${i + 1} (Order ${label}) dilewati: ${why}. [sumber: ${masterUrl.slice(0, 80)}]`);
      await yieldToUI();
      continue;
    }

    // Kotak dalam px (rumus yang sama dengan kanvas).
    const xPx = mmToPx(xMm, dpi);
    const yPx = mmToPx(yMm, dpi);
    const boxWPx = mmToPx(wMm, dpi);
    const boxHPx = mmToPx(hMm, dpi);
    if (boxWPx <= 0 || boxHPx <= 0) {
      warnings.push(`Desain #${i + 1} (Order ${label}) dilewati: kotak ${boxWPx}x${boxHPx}px terlalu kecil @${dpi}DPI.`);
      await yieldToUI();
      continue;
    }

    // Skala proporsional (contain): jaga aspek rasio gambar; sisa ruang
    // dibiarkan transparan (letterbox) — gambar tak pernah digepengkan.
    const scale = Math.min(boxWPx / img.naturalWidth, boxHPx / img.naturalHeight);
    const drawW = Math.max(1, Math.round(img.naturalWidth * scale));
    const drawH = Math.max(1, Math.round(img.naturalHeight * scale));
    const drawX = Math.round(xPx + (boxWPx - drawW) / 2);
    const drawY = Math.round(yPx + (boxHPx - drawH) / 2);
    try {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } catch (e) {
      // Seharusnya tak terjadi (gambar anonim), tapi jujur bila terjadi.
      warnings.push(
        `Desain #${i + 1} (Order ${label}) dilewati saat menggambar: ${e instanceof Error ? e.message : String(e)}.`
      );
      await yieldToUI();
      continue;
    }

    // DPI efektif desain ini = piksel asli ÷ inci cetak (bukan DPI sheet).
    // Di bawah 150 = berisiko pecah walau sheet-nya 300 DPI.
    const effDpi = Math.min(img.naturalWidth / (wMm / 25.4), img.naturalHeight / (hMm / 25.4));
    if (Number.isFinite(effDpi)) {
      if (effDpi < minEffDpi) minEffDpi = effDpi;
      if (effDpi < 150) {
        warnings.push(
          `Desain #${i + 1} (Order ${label}) hanya ~${Math.round(effDpi)} DPI efektif (file asli kurang piksel untuk ${sizeCmText}) — berisiko pecah, minta file HD ke user.`
        );
      }
    }

    // Garis potong: putus-putus hitam 2px DI AREA GAP (kotak digeser +3px ke
    // luar) sehingga garis tak menutupi artwork. Label SENGAJA tak digambar.
    if (input.cutLines === true) {
      ctx.save();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(xPx - 3, yPx - 3, boxWPx + 6, boxHPx + 6);
      ctx.restore();
    }

    drawnCount += 1;
    // Bebaskan referensi + beri napas ke UI sebelum item berikut (anti-freeze).
    try {
      img.src = "";
    } catch {
      /* abaikan */
    }
    await yieldToUI();
  }

  // Encode PNG (transparan). Gagal di sini = lempar error jelas (bukan blob rusak).
  const blob = await canvasToBlob(canvas, "image/png");

  // Nama file: GANG_YYYY-MM-DD_M<bin>_<L>x<T>cm_<dpi>DPI_<n>desain.png
  // (L/T = cm bulat dari bin; default 580x1000mm → 58x100cm sesuai pola roll).
  const bin = inferBinNumber(placements, input.gangId);
  const datePart = todayLocalYYYYMMDD();
  const sheetCmText = `${Math.round(binWmm / 10)}x${Math.round(binHmm / 10)}cm`;
  const filename = `GANG_${datePart}_M${bin}_${sheetCmText}_${dpi}DPI_${placements.length}desain.png`;

  // Utilisasi = luas placement / luas lembar (persen 1 desimal).
  const totalAreaMm2 = binWmm * binHmm;
  const utilizationPct = totalAreaMm2 > 0 ? (usedAreaMm2 / totalAreaMm2) * 100 : 0;

  // Rekap Bahasa Indonesia (satu-satunya tempat label/order ditulis —
  // PNG-nya sendiri tanpa teks bakar).
  const gangLabel = input.gangId && input.gangId.trim() !== "" ? input.gangId.trim() : "tanpa-ID";
  const head = [
    `GANG SHEET ${gangLabel} — ${datePart}`,
    `Lembar: ${sheetCmText} (${widthPx}x${heightPx}px, ${dpi} DPI) — ${placements.length} desain`,
    `File: ${filename}`,
    ``,
    `Isi:`,
    ...recapLines,
    ``,
    // Kata "utilisasi" ditulis huruf kecil agar cocok dengan pencarian
    // teks-sensitif; baris Utilisasi kapital untuk keterbacaan operator.
    `Utilisasi: ${utilizationPct.toFixed(1)}% (nilai utilisasi = ${Math.round(usedAreaMm2)}mm2 terpakai dari ${Math.round(totalAreaMm2)}mm2)`,
    `Dimensi px: ${widthPx}x${heightPx}px pada ${dpi} DPI`,
    ...(Number.isFinite(minEffDpi)
      ? [`DPI efektif terendah: ~${Math.round(minEffDpi)} DPI (dari file asli tiap desain)`]
      : []),
    `Berhasil digambar: ${drawnCount} dari ${placements.length} desain. Label tidak dibakar ke PNG (hanya di rekap ini).`,
  ];
  if (warnings.length > 0) {
    head.push(`Dilewati/peringatan (${warnings.length}):`);
    for (const w of warnings) head.push(`- ${w}`);
  }
  const recapText = head.join("\n");

  return { blob, filename, recapText, widthPx, heightPx, warnings };
}

/**
 * Catatan mesin untuk ditempel di akhir `notes` ProductionTask, mis.
 * `" [GANG:abc123:M1:12,34]"`. Format diawali SPASI agar aman digabung.
 */
export function buildGangNote(gangId: string, bin: number, xMm: number, yMm: number): string {
  return ` [GANG:${gangId}:M${bin}:${xMm},${yMm}]`;
}

// ---------------------------------------------------------------------------
// Helper opsional: upload hasil ke R2 (best-effort)
// ---------------------------------------------------------------------------
// Route POST /api/upload/r2: wajib login admin (cookie sesi ikut via
// credentials:"include"), field multipart `file` (png/jpg/webp, maks 10MB),
// key ditentukan server. Gagal (belum login / >10MB / offline) → kembalikan
// null; BLOB LOKAL TETAP MILIK PEMANGGIL (jangan dibuang).

/** Hasil upload gang-sheet ke R2 (null = gagal, pakai blob lokal saja). */
export interface GangUploadResult {
  url: string;
  key: string;
}

/**
 * Unggah PNG gang-sheet ke R2 secara best-effort.
 * Panggil SETELAH exportGangSheetPNG bila operator ingin arsip cloud.
 */
export async function uploadGangSheetToR2(blob: Blob, filename: string): Promise<GangUploadResult | null> {
  try {
    if (typeof fetch === "undefined" || typeof FormData === "undefined") return null;
    if (!blob || blob.size <= 0) return null;
    // Route menolak >10MB — jangan buang request yang pasti ditolak.
    if (blob.size > R2_MAX_BYTES) return null;
    const file = new File([blob], filename, { type: "image/png" });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload/r2", { method: "POST", body: form, credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      success?: unknown;
      url?: unknown;
      key?: unknown;
    } | null;
    if (!json || json.success !== true || typeof json.url !== "string" || json.url === "") return null;
    return { url: json.url, key: typeof json.key === "string" ? json.key : "" };
  } catch {
    // Best-effort: semua error (offline/401/500) = null, blob lokal tetap ada.
    return null;
  }
}
