// src/lib/gangPacker.ts
//
// MESIN packing gang-sheet DTF: menyusun banyak desain persegi ke lembaran
// 1000 x 580 mm (dimensi roll maklon DTF meteran) dengan librari `maxrects-packer`.
//
// Cara kerja singkat:
// 1. Setiap rect di-expand `qty`-nya menjadi kopi individual.
// 2. Kopi yang tidak muat di area cetak efektif (bin - 2*margin, boleh putar
//    90 derajat kecuali rect.allowRotation === false) TIDAK dimasukkan ke
//    packer sama sekali, melainkan dikembalikan sebagai `unplaced`.
// 3. Packer dijalankan 4x (multi-start deterministik) dengan urutan input
//    berbeda: luas menurun, keliling menurun, sisi-terpanjang menurun,
//    sisi-terpendek menurun — semuanya dengan rotasi aktif — lalu diambil
//    hasil dengan utilisasi tertinggi.
// 4. Kelebihan muatan otomatis meluber ke bin ke-2/3 dst (unbounded bins).
//
// Modul ini murni (pure, tanpa I/O) sehingga aman dipakai di client maupun
// di Cloudflare Workers (server). Tidak ada randomness: input yang sama
// selalu menghasilkan output yang sama.

import {
  MaxRectsBin,
  MaxRectsPacker,
  PACKING_LOGIC,
  Rectangle,
} from "maxrects-packer";

// ─── Konstanta kontrak (JANGAN diubah: 2 modul lain mengimpor ini) ───

/** Lebar lembar gang-sheet dalam mm (integer). */
export const GANG_BIN_W_MM = 1000;
/** Tinggi lembar gang-sheet dalam mm (integer). */
export const GANG_BIN_H_MM = 580;
/** Jarak antar desain dalam mm (diteruskan sebagai padding packer). */
export const GANG_GAP_MM = 10;
/** Tepi aman dari pinggir sheet dalam mm (diteruskan sebagai border packer). */
export const GANG_MARGIN_MM = 10;

export interface CropBounds {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  naturalW: number;
  naturalH: number;
}

/** Satu desain persegi yang diminta dicetak sebanyak `qty` kopi (dimensi asli dari pesanan). */
export interface GangRect {
  id: string;
  wMm: number;
  hMm: number;
  qty: number;
  label: string;
  orderNumber: string;
  masterUrl: string | null;
  allowRotation?: boolean;
}

/** Satu kopi desain yang sudah dapat posisi di dalam bin (dimensi asli dan aspek rasio 100% terjaga). */
export interface GangPlacement {
  id: string;
  orderNumber: string;
  label: string;
  masterUrl: string | null;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  rot: boolean;
  bin: number;
  copyIndex: number;
  origWMm?: number;
  origHMm?: number;
  allowRotation?: boolean;
}

/** Hasil packing: daftar bin, rect yang tak muat, dan utilisasi. */
export interface GangPackResult {
  bins: GangPlacement[][];
  unplaced: GangRect[];
  utilizationPct: number;
  binWmm: number;
  binHmm: number;
  strategyName?: string;
  maxReachMm?: number;
}

// ─── Tipe internal (tidak diekspor) ───

/** Satu kopi individual hasil expand `qty` (satuan sudah mm integer). */
interface KopiGang {
  sumber: GangRect; // referensi rect asal (untuk metadata & unplaced)
  w: number; // lebar mm integer (sudah termasuk pra-rotasi bila perlu)
  h: number; // tinggi mm integer (sudah termasuk pra-rotasi bila perlu)
  copyIndex: number; // indeks kopi ke berapa dari rect asal (0-based)
  bolehRotasi: boolean; // false hanya bila rect.allowRotation === false
  praRotasi: boolean; // true bila dimensi ditukar di depan (lihat di bawah)
}

/** Titipan di Rectangle.data agar placement bisa dipetakan balik ke rect asal. */
interface DataKopi {
  id: string;
  orderNumber: string;
  label: string;
  masterUrl: string | null;
  copyIndex: number;
  origWMm: number;
  origHMm: number;
  bolehRotasi: boolean;
}

// ─── Helper kecil ───

/** Bulatkan ke mm integer; pakai `bawaan` bila input tak valid, lalu kunci di `min`. */
function bulatkanMm(
  nilai: number | undefined,
  bawaan: number,
  min: number,
): number {
  if (nilai === undefined || !Number.isFinite(nilai)) return bawaan;
  return Math.max(min, Math.round(nilai));
}

/** Pembanding string deterministik (urutan code-unit, tanpa locale). */
function bandingString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Empat urutan sortir menurun untuk multi-start. Rantai tie-break-nya
// disengaja penuh (diakhiri id + copyIndex) agar total-order: deterministik
// penuh, tidak bergantung kestabilan sort maupun urutan input.

/** Sortir utama: luas menurun. */
function pembandingArea(a: KopiGang, b: KopiGang): number {
  return (
    b.w * b.h - a.w * a.h ||
    2 * (b.w + b.h) - 2 * (a.w + a.h) ||
    Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
    Math.min(b.w, b.h) - Math.min(a.w, a.h) ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir utama: keliling (perimeter) menurun. */
function pembandingPerimeter(a: KopiGang, b: KopiGang): number {
  return (
    2 * (b.w + b.h) - 2 * (a.w + a.h) ||
    b.w * b.h - a.w * a.h ||
    Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
    Math.min(b.w, b.h) - Math.min(a.w, a.h) ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir utama: sisi terpanjang menurun. */
function pembandingSisiMax(a: KopiGang, b: KopiGang): number {
  return (
    Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
    b.w * b.h - a.w * a.h ||
    2 * (b.w + b.h) - 2 * (a.w + a.h) ||
    Math.min(b.w, b.h) - Math.min(a.w, a.h) ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir utama: sisi terpendek menurun. */
function pembandingSisiMin(a: KopiGang, b: KopiGang): number {
  return (
    Math.min(b.w, b.h) - Math.min(a.w, a.h) ||
    b.w * b.h - a.w * a.h ||
    2 * (b.w + b.h) - 2 * (a.w + a.h) ||
    Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir cluster: mengelompokkan desain per nomor pesanan (agar potongan workshop rapi berdekatan). */
function pembandingOrderClustering(a: KopiGang, b: KopiGang): number {
  return (
    bandingString(a.sumber.orderNumber, b.sumber.orderNumber) ||
    b.w * b.h - a.w * a.h ||
    Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir lebar menurun: menempatkan panel horizontal lebar di baris pertama. */
function pembandingWidth(a: KopiGang, b: KopiGang): number {
  return (
    b.w - a.w ||
    b.h - a.h ||
    b.w * b.h - a.w * a.h ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir tinggi menurun: menempatkan panel vertikal di tepi sisi. */
function pembandingHeight(a: KopiGang, b: KopiGang): number {
  return (
    b.h - a.h ||
    b.w - a.w ||
    b.w * b.h - a.w * a.h ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir aspect ratio menurun: mengelompokkan bentuk proporsional agar celah terisi rapat. */
function pembandingRatio(a: KopiGang, b: KopiGang): number {
  const rA = a.w / (a.h || 1);
  const rB = b.w / (b.h || 1);
  return (
    rB - rA ||
    b.w * b.h - a.w * a.h ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir diagonal menurun: mendahulukan desain dengan dimensi sudut terbesar. */
function pembandingDiagonal(a: KopiGang, b: KopiGang): number {
  const diagA = a.w * a.w + a.h * a.h;
  const diagB = b.w * b.w + b.h * b.h;
  return (
    diagB - diagA ||
    b.w * b.h - a.w * a.h ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/** Sortir elongation menurun: mendahulukan desain memanjang/banner agar jadi pondasi tepi. */
function pembandingElongation(a: KopiGang, b: KopiGang): number {
  const rasioA = Math.max(a.w / (a.h || 1), a.h / (a.w || 1));
  const rasioB = Math.max(b.w / (b.h || 1), b.h / (b.w || 1));
  const elongA = a.w * a.h * rasioA;
  const elongB = b.w * b.h * rasioB;
  return (
    elongB - elongA ||
    b.w * b.h - a.w * a.h ||
    bandingString(a.sumber.id, b.sumber.id) ||
    a.copyIndex - b.copyIndex
  );
}

/**
 * Ubah isi packer menjadi GangPlacement per bin.
 * Indeks array luar == field `bin` (0-based) agar bins[p.bin] selalu tepat.
 */
function petakanBin(packer: MaxRectsPacker): GangPlacement[][] {
  const hasil: GangPlacement[][] = [];
  for (const bin of packer.bins) {
    if (!(bin instanceof MaxRectsBin)) continue;
    const nomorBin = hasil.length;
    const isi: GangPlacement[] = [];
    for (const r of bin.rects) {
      const d = r.data as DataKopi;
      isi.push({
        id: d.id,
        orderNumber: d.orderNumber,
        label: d.label,
        masterUrl: d.masterUrl,
        xMm: Math.round(r.x),
        yMm: Math.round(r.y),
        wMm: Math.round(r.width),
        hMm: Math.round(r.height),
        rot: r.rot,
        bin: nomorBin,
        copyIndex: d.copyIndex,
        origWMm: d.origWMm,
        origHMm: d.origHMm,
        allowRotation: d.bolehRotasi,
      });
    }
    hasil.push(isi);
  }
  return hasil;
}

// ─── Algoritma Matematis Lanjutan (2-Phase Hybrid Optimization) ───

/** Uji tabrakan dua kotak dengan batas jarak pengaman (gap). */
function cekTabrakan(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number,
  gap: number,
): boolean {
  if (x1 + w1 + gap <= x2) return false;
  if (x2 + w2 + gap <= x1) return false;
  if (y1 + h1 + gap <= y2) return false;
  if (y2 + h2 + gap <= y1) return false;
  return true;
}

/**
 * Bottom-Left Gravity Compaction (BL-Compaction):
 * Menggeser setiap desain ke batas minimum Y (ke atas/bawah sesuai orientasi roll)
 * dan batas minimum X (ke bibir kiri sheet) sejauh mungkin tanpa bertabrakan,
 * melenyapkan rongga Tetris kosong pasca-penempatan greedy.
 */
function kompakkanBottomLeft(
  items: GangPlacement[],
  binW: number,
  binH: number,
  gap: number,
  margin: number,
): GangPlacement[] {
  if (items.length <= 1) return items;

  const res = items.map((p) => ({ ...p }));
  let adaPerubahan = true;
  let iterasi = 0;
  const maxIterasi = 4;

  while (adaPerubahan && iterasi < maxIterasi) {
    adaPerubahan = false;
    iterasi++;

    // Urutkan item dari Y terkecil lalu X terkecil secara stabil
    res.sort(
      (a, b) =>
        a.yMm - b.yMm ||
        a.xMm - b.xMm ||
        bandingString(a.id, b.id) ||
        a.copyIndex - b.copyIndex,
    );

    for (let i = 0; i < res.length; i++) {
      const cur = res[i];
      if (!cur) continue;

      // 1. Tarik ke Y minimum sejauh mungkin
      let targetY = margin;
      for (let j = 0; j < res.length; j++) {
        if (i === j) continue;
        const other = res[j];
        if (!other) continue;
        if (other.yMm + other.hMm <= cur.yMm) {
          const xOverlap = !(
            cur.xMm + cur.wMm + gap <= other.xMm ||
            other.xMm + other.wMm + gap <= cur.xMm
          );
          if (xOverlap) {
            const batasY = other.yMm + other.hMm + gap;
            if (batasY > targetY) targetY = batasY;
          }
        }
      }

      if (targetY < cur.yMm) {
        let tabrak = false;
        for (let j = 0; j < res.length; j++) {
          if (i === j) continue;
          const other = res[j];
          if (!other) continue;
          if (
            cekTabrakan(
              cur.xMm,
              targetY,
              cur.wMm,
              cur.hMm,
              other.xMm,
              other.yMm,
              other.wMm,
              other.hMm,
              gap,
            )
          ) {
            tabrak = true;
            break;
          }
        }
        if (!tabrak && targetY + cur.hMm <= binH - margin) {
          cur.yMm = targetY;
          adaPerubahan = true;
        }
      }

      // 2. Tarik ke X minimum sejauh mungkin
      let targetX = margin;
      for (let j = 0; j < res.length; j++) {
        if (i === j) continue;
        const other = res[j];
        if (!other) continue;
        if (other.xMm + other.wMm <= cur.xMm) {
          const yOverlap = !(
            cur.yMm + cur.hMm + gap <= other.yMm ||
            other.yMm + other.hMm + gap <= cur.yMm
          );
          if (yOverlap) {
            const batasX = other.xMm + other.wMm + gap;
            if (batasX > targetX) targetX = batasX;
          }
        }
      }

      if (targetX < cur.xMm) {
        let tabrak = false;
        for (let j = 0; j < res.length; j++) {
          if (i === j) continue;
          const other = res[j];
          if (!other) continue;
          if (
            cekTabrakan(
              targetX,
              cur.yMm,
              cur.wMm,
              cur.hMm,
              other.xMm,
              other.yMm,
              other.wMm,
              other.hMm,
              gap,
            )
          ) {
            tabrak = true;
            break;
          }
        }
        if (!tabrak && targetX + cur.wMm <= binW - margin) {
          cur.xMm = targetX;
          adaPerubahan = true;
        }
      }
    }
  }

  return res;
}

/** Uji penyisipan item ke ruang kosong pada bin yang sudah ada (Extreme Corner Points). */
function cobaSisipkanItem(
  item: GangPlacement,
  binItems: GangPlacement[],
  binW: number,
  binH: number,
  gap: number,
  margin: number,
): { sukses: boolean; x: number; y: number; w: number; h: number; rot: boolean } | null {
  const bolehRotasi = item.allowRotation !== false;

  const candX: number[] = [margin];
  const candY: number[] = [margin];

  for (const b of binItems) {
    candX.push(b.xMm + b.wMm + gap);
    candY.push(b.yMm + b.hMm + gap);
  }

  const unikX = Array.from(new Set(candX))
    .filter((x) => x >= margin && x < binW - margin)
    .sort((a, b) => a - b);
  const unikY = Array.from(new Set(candY))
    .filter((y) => y >= margin && y < binH - margin)
    .sort((a, b) => a - b);

  const variasi: { w: number; h: number; rot: boolean }[] = [
    { w: item.wMm, h: item.hMm, rot: item.rot },
  ];
  if (bolehRotasi) {
    variasi.push({ w: item.hMm, h: item.wMm, rot: !item.rot });
  }

  for (const v of variasi) {
    for (const cy of unikY) {
      if (cy + v.h > binH - margin) continue;
      for (const cx of unikX) {
        if (cx + v.w > binW - margin) continue;

        let tabrak = false;
        for (const exist of binItems) {
          if (
            cekTabrakan(
              cx,
              cy,
              v.w,
              v.h,
              exist.xMm,
              exist.yMm,
              exist.wMm,
              exist.hMm,
              gap,
            )
          ) {
            tabrak = true;
            break;
          }
        }

        if (!tabrak) {
          return { sukses: true, x: cx, y: cy, w: v.w, h: v.h, rot: v.rot };
        }
      }
    }
  }

  return null;
}

/**
 * Optimasi Lintas-Bin (Cross-Bin Backfill):
 * Menelusuri item pada meter terakhir (tail bin), lalu mencoba menyisipkannya
 * ke celah-celah kosong meter terdahulu. Jika seluruh item meter terakhir muat di meter
 * terdahulu, meter terakhir langsung TERELIMINASI (menghemat 1 meter roll penuh!).
 */
function optimasiLintasBin(
  bins: GangPlacement[][],
  binW: number,
  binH: number,
  gap: number,
  margin: number,
): GangPlacement[][] {
  if (bins.length <= 1) return bins;

  let hasilBins = bins.map((b) => b.map((p) => ({ ...p })));

  let adaMigrasi = true;
  let putaran = 0;
  while (adaMigrasi && hasilBins.length > 1 && putaran < 6) {
    adaMigrasi = false;
    putaran++;
    const lastBinIdx = hasilBins.length - 1;
    const lastBin = hasilBins[lastBinIdx];
    if (!lastBin || lastBin.length === 0) {
      hasilBins.pop();
      adaMigrasi = true;
      continue;
    }

    // Urutkan item di bin terakhir dari luas terkecil ke terbesar (paling mudah masuk ke sela)
    const itemDiuji = [...lastBin].sort((a, b) => a.wMm * a.hMm - b.wMm * b.hMm);

    for (const item of itemDiuji) {
      for (let targetBinIdx = 0; targetBinIdx < lastBinIdx; targetBinIdx++) {
        const targetBin = hasilBins[targetBinIdx];
        if (!targetBin) continue;
        const res = cobaSisipkanItem(item, targetBin, binW, binH, gap, margin);
        if (res && res.sukses) {
          const curLast = hasilBins[lastBinIdx];
          if (curLast) {
            hasilBins[lastBinIdx] = curLast.filter(
              (p) => !(p.id === item.id && p.copyIndex === item.copyIndex),
            );
          }
          targetBin.push({
            ...item,
            bin: targetBinIdx,
            xMm: res.x,
            yMm: res.y,
            wMm: res.w,
            hMm: res.h,
            rot: res.rot,
          });
          hasilBins[targetBinIdx] = kompakkanBottomLeft(
            targetBin,
            binW,
            binH,
            gap,
            margin,
          );
          adaMigrasi = true;
          break;
        }
      }

      const curLast = hasilBins[lastBinIdx];
      if (curLast && curLast.length === 0) {
        hasilBins.pop();
        adaMigrasi = true;
        break;
      }
    }

    const curLastBin = hasilBins[lastBinIdx];
    if (curLastBin && curLastBin.length > 0) {
      hasilBins[lastBinIdx] = kompakkanBottomLeft(
        curLastBin,
        binW,
        binH,
        gap,
        margin,
      );
    }
  }

  return hasilBins.map((b, bi) => b.map((p) => ({ ...p, bin: bi })));
}

/** Menghitung skor kualitas fisik solusi cetak roll DTF. */
interface SkorPacking {
  jumlahBin: number;
  totalPanjangRollMm: number;
  reachBinTerakhir: number;
  luasTerpakai: number;
  jumlahPutar: number;
}

function hitungSkorSolusi(
  kandidat: GangPlacement[][],
  binW: number,
  binH: number,
  margin: number,
): SkorPacking {
  const jumlahBin = kandidat.length;
  if (jumlahBin === 0) {
    return {
      jumlahBin: 0,
      totalPanjangRollMm: 0,
      reachBinTerakhir: 0,
      luasTerpakai: 0,
      jumlahPutar: 0,
    };
  }

  let luasTerpakai = 0;
  let jumlahPutar = 0;
  let reachBinTerakhir = margin;

  for (let bi = 0; bi < jumlahBin; bi++) {
    const b = kandidat[bi];
    if (!b) continue;
    let maxReachBin = margin;
    for (const p of b) {
      luasTerpakai += p.wMm * p.hMm;
      if (p.rot) jumlahPutar += 1;
      const reach = p.yMm + p.hMm + margin;
      if (reach > maxReachBin) maxReachBin = reach;
    }
    if (bi === jumlahBin - 1) {
      reachBinTerakhir = maxReachBin;
    }
  }

  const totalPanjangRollMm = (jumlahBin - 1) * binH + reachBinTerakhir;

  return {
    jumlahBin,
    totalPanjangRollMm,
    reachBinTerakhir,
    luasTerpakai,
    jumlahPutar,
  };
}

// ─── Fungsi utama (kontrak) ───

/**
 * Susun rect ke gang-sheet 1000x580 mm (atau ukuran custom via opts).
 *
 * Standar DTF Industri:
 * (1) `qty` di-expand menjadi kopi individual (copyIndex 0-based per rect).
 * (2) Multi-Heuristic Tournament: 10 urutan sortir x 2 packing logic = 20 turnamen deterministik.
 * (3) Fase 2: 2D Bottom-Left Gravity Compaction (BL-Compaction) menutup rongga Tetris.
 * (4) Fase 3: Optimasi Lintas-Bin (Cross-Bin Backfill) memangkas tail waste dan mengeliminasi meter sisa.
 * (5) Evaluasi Fisik Nyata: Pemenang dipilih berdasarkan meter terendah, jangkauan roll terpendek,
 *     dan rotasi potongan paling ergonomis.
 * (6) Semua satuan mm integer, 100% dimensi asli terjaga, 0 distorsi/stretching.
 */
export function packGangSheet(
  rects: GangRect[],
  opts?: { binWmm?: number; binHmm?: number; gapMm?: number; marginMm?: number },
): GangPackResult {
  // 1. Normalisasi opsi ke mm integer (fallback = konstanta kontrak).
  const binW = bulatkanMm(opts?.binWmm, GANG_BIN_W_MM, 1);
  const binH = bulatkanMm(opts?.binHmm, GANG_BIN_H_MM, 1);
  const gap = bulatkanMm(opts?.gapMm, GANG_GAP_MM, 0);
  const margin = bulatkanMm(opts?.marginMm, GANG_MARGIN_MM, 0);

  // 2. Expand qty menjadi kopi individual + pra-saring yang tak muat.
  const gunaW = binW - margin * 2;
  const gunaH = binH - margin * 2;
  const kopi: KopiGang[] = [];
  const takMuat = new Set<GangRect>();
  for (const r of rects ?? []) {
    if (!r) continue;
    const w = Math.round(r.wMm);
    const h = Math.round(r.hMm);
    const qty = Math.floor(r.qty);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      if (Number.isFinite(r.qty) && r.qty > 0) takMuat.add(r);
      continue;
    }
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const bolehRotasi = r.allowRotation !== false;
    const actW = w;
    const actH = h;
    const muatNormal = actW <= gunaW && actH <= gunaH;
    const muatPutar = bolehRotasi && actH <= gunaW && actW <= gunaH;
    if (!muatNormal && !muatPutar) {
      takMuat.add(r);
      continue;
    }
    const praRotasi = !muatNormal && muatPutar && (actW > binW || actH > binH);
    for (let i = 0; i < qty; i++) {
      kopi.push({
        sumber: r,
        w: praRotasi ? actH : actW,
        h: praRotasi ? actW : actH,
        copyIndex: i,
        bolehRotasi,
        praRotasi,
      });
    }
  }

  // 3. Multi-Heuristic Tournament: 10 urutan x 2 packing logic (20 turnamen deterministik)
  const urutan = [
    { nama: "Area-Descending", fn: pembandingArea },
    { nama: "Perimeter-Descending", fn: pembandingPerimeter },
    { nama: "Max-Edge-Descending", fn: pembandingSisiMax },
    { nama: "Min-Edge-Descending", fn: pembandingSisiMin },
    { nama: "Diagonal-Descending", fn: pembandingDiagonal },
    { nama: "Elongation-Descending", fn: pembandingElongation },
    { nama: "Order-Clustered", fn: pembandingOrderClustering },
    { nama: "Width-Descending", fn: pembandingWidth },
    { nama: "Height-Descending", fn: pembandingHeight },
    { nama: "Ratio-Descending", fn: pembandingRatio },
  ];
  const logikaList = [
    { nama: "MAX_EDGE", val: PACKING_LOGIC.MAX_EDGE },
    { nama: "MAX_AREA", val: PACKING_LOGIC.MAX_AREA },
  ];

  let terbaik: GangPlacement[][] | null = null;
  let terbaikSkor: SkorPacking | null = null;
  let strategiTerbaik = "";

  for (const logika of logikaList) {
    for (const itemUrutan of urutan) {
      const packer = new MaxRectsPacker(binW, binH, gap, {
        smart: false,
        pot: false,
        square: false,
        allowRotation: true,
        border: margin,
        logic: logika.val,
      });
      const antre = [...kopi].sort(itemUrutan.fn);
      for (const k of antre) {
        const rc = new Rectangle(k.w, k.h, 0, 0, k.praRotasi, k.bolehRotasi);
        const data: DataKopi = {
          id: k.sumber.id,
          orderNumber: k.sumber.orderNumber,
          label: k.sumber.label,
          masterUrl: k.sumber.masterUrl,
          copyIndex: k.copyIndex,
          origWMm: k.sumber.wMm,
          origHMm: k.sumber.hMm,
          bolehRotasi: k.bolehRotasi,
        };
        rc.data = data;
        packer.add(rc);
      }
      const dasar = petakanBin(packer);

      // Fase 2: Bottom-Left Gravity Compaction per bin
      const terkompakkan = dasar.map((b) =>
        kompakkanBottomLeft(b, binW, binH, gap, margin),
      );

      // Fase 3: Optimasi Lintas-Bin (Backfill dari tail bin ke sela bin depan)
      const kandidat = optimasiLintasBin(
        terkompakkan,
        binW,
        binH,
        gap,
        margin,
      );

      const skor = hitungSkorSolusi(kandidat, binW, binH, margin);

      // Evaluasi pemenang fisik:
      // 1. Bin paling sedikit (menghemat 1 meter penuh)
      // 2. Panjang total roll fisik terpendek (menghemat sisa film di meter terakhir)
      // 3. Rotasi paling sedikit (ergonomis untuk pemotongan workshop)
      let menang = false;
      if (terbaik === null || terbaikSkor === null) {
        menang = true;
      } else if (skor.jumlahBin < terbaikSkor.jumlahBin) {
        menang = true;
      } else if (skor.jumlahBin === terbaikSkor.jumlahBin) {
        if (skor.totalPanjangRollMm < terbaikSkor.totalPanjangRollMm - 1) {
          menang = true;
        } else if (
          Math.abs(skor.totalPanjangRollMm - terbaikSkor.totalPanjangRollMm) <= 1 &&
          skor.jumlahPutar < terbaikSkor.jumlahPutar
        ) {
          menang = true;
        }
      }

      if (menang) {
        terbaik = kandidat;
        terbaikSkor = skor;
        strategiTerbaik = `${itemUrutan.nama} (${logika.nama})`;
      }
    }
  }

  // 4. Rakit hasil (utilisasi dihitung ulang dari kandidat terbaik, TANPA gap).
  const bins = terbaik ?? [];
  let luasAkhir = 0;
  for (const b of bins) {
    for (const p of b) luasAkhir += p.wMm * p.hMm;
  }
  const utilizationPct =
    bins.length > 0 ? (luasAkhir / (bins.length * binW * binH)) * 100 : 0;

  return {
    bins,
    unplaced: (rects ?? []).filter((r) => takMuat.has(r)),
    utilizationPct,
    binWmm: binW,
    binHmm: binH,
    strategyName: strategiTerbaik,
    maxReachMm: terbaikSkor ? Math.round(terbaikSkor.reachBinTerakhir) : 0,
  };
}
