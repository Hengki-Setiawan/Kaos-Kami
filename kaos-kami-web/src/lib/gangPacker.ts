// src/lib/gangPacker.ts
//
// MESIN packing gang-sheet DTF: menyusun banyak desain persegi ke lembaran
// 1000 x 580 mm (batas fisik printhead) dengan librari `maxrects-packer`.
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

/** Satu desain persegi yang diminta dicetak sebanyak `qty` kopi. */
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

/** Satu kopi desain yang sudah dapat posisi di dalam bin. */
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

/**
 * Ubah isi packer menjadi GangPlacement per bin.
 * Indeks array luar == field `bin` (0-based) agar bins[p.bin] selalu tepat.
 */
function petakanBin(packer: MaxRectsPacker): GangPlacement[][] {
  const hasil: GangPlacement[][] = [];
  for (const bin of packer.bins) {
    // Defensif: pra-saring menjamin tiap kopi muat di bin kosong, sehingga
    // librari tak pernah membuat OversizedElementBin. Cabang ini tak terjangkau.
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
      });
    }
    hasil.push(isi);
  }
  return hasil;
}

// ─── Fungsi utama (kontrak) ───

/**
 * Susun rect ke gang-sheet 1000x580 mm (atau ukuran custom via opts).
 *
 * Aturan yang diterapkan:
 * (1) `qty` di-expand menjadi kopi individual (copyIndex 0-based per rect).
 * (2) Packer: smart:false, pot:false, square:false, allowRotation:true,
 *     border=margin, padding=gap.
 * (3) Multi-Heuristic Tournament: 5 urutan sortir (luas, keliling, sisi-terpanjang,
 *     sisi-terpendek, order-cluster) x 2 packing logic (MAX_EDGE & MAX_AREA) = 10 turnamen.
 *     Pemenang dipilih berdasarkan: bin paling sedikit, utilisasi luas tertinggi,
 *     jangkauan fisik roll terpendek (hemat film), dan rotasi paling sedikit.
 * (4) Overflow meluber ke bin berikutnya (bin 0, 1, 2, ...).
 * (5) Semua satuan mm integer (input dibulatkan, output dibulatkan).
 * (6) utilizationPct = total(w*h) / (jumlahBin*binW*binH) * 100 TANPA gap.
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
  //    Area cetak efektif = bin dikurangi margin di semua sisi.
  const gunaW = binW - margin * 2;
  const gunaH = binH - margin * 2;
  const kopi: KopiGang[] = [];
  const takMuat = new Set<GangRect>();
  for (const r of rects ?? []) {
    if (!r) continue; // lewati entri null (defensif untuk pemanggil JS)
    const w = Math.round(r.wMm);
    const h = Math.round(r.hMm);
    const qty = Math.floor(r.qty);
    // Dimensi tak valid (NaN/nol/negatif): tak ada satu kopi pun yang bisa dicetak.
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      if (Number.isFinite(r.qty) && r.qty > 0) takMuat.add(r);
      continue;
    }
    // qty nol/negatif/tak valid: tidak ada yang diminta, jadi bukan unplaced.
    if (!Number.isFinite(qty) || qty <= 0) continue;
    // allowRotation undefined = boleh diputar (default); hanya false eksplisit yang mengunci.
    const bolehRotasi = r.allowRotation !== false;
    const muatNormal = w <= gunaW && h <= gunaH;
    const muatPutar = bolehRotasi && h <= gunaW && w <= gunaH;
    if (!muatNormal && !muatPutar) {
      takMuat.add(r); // bahkan 1 kopi pun tak muat di bin kosong
      continue;
    }
    // Kasus khusus: hanya muat bila diputar, TAPI dimensi mentah melebihi bin
    // penuh (mis. 500x600 di bin 1000x580). Cek oversize librari buta-rotasi dan
    // akan membuangnya ke OversizedElementBin, jadi tukar dimensi di depan.
    // Flag rot awal = true membuat field `rot` hasil akhir tetap benar relatif
    // ke input (putar-balik oleh packer akan men-toggle-nya kembali ke false).
    const praRotasi = !muatNormal && muatPutar && (w > binW || h > binH);
    for (let i = 0; i < qty; i++) {
      kopi.push({
        sumber: r,
        w: praRotasi ? h : w,
        h: praRotasi ? w : h,
        copyIndex: i,
        bolehRotasi,
        praRotasi,
      });
    }
  }

  // 3. Multi-Heuristic Tournament: 5 urutan x 2 packing logic (10 turnamen deterministik)
  const urutan = [
    { nama: "Area-Descending", fn: pembandingArea },
    { nama: "Perimeter-Descending", fn: pembandingPerimeter },
    { nama: "Max-Edge-Descending", fn: pembandingSisiMax },
    { nama: "Min-Edge-Descending", fn: pembandingSisiMin },
    { nama: "Order-Clustered", fn: pembandingOrderClustering },
  ];
  const logikaList = [
    { nama: "MAX_EDGE", val: PACKING_LOGIC.MAX_EDGE },
    { nama: "MAX_AREA", val: PACKING_LOGIC.MAX_AREA },
  ];

  let terbaik: GangPlacement[][] | null = null;
  let utilTerbaik = -1;
  let jangkauanTerbaik = Infinity;
  let rotTerbaik = Infinity;
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
        };
        rc.data = data;
        packer.add(rc);
      }
      const kandidat = petakanBin(packer);
      let luas = 0;
      let putar = 0;
      let maxReach = 0;

      for (const b of kandidat) {
        for (const p of b) {
          luas += p.wMm * p.hMm;
          if (p.rot) putar += 1;
          const reach = p.xMm + p.wMm;
          if (reach > maxReach) maxReach = reach;
        }
      }

      const util =
        kandidat.length > 0 ? (luas / (kandidat.length * binW * binH)) * 100 : 0;

      // Evaluasi pemenang:
      // 1. Bin paling sedikit (paling hemat roll)
      // 2. Utilisasi luas tertinggi
      // 3. Jangkauan fisik X terpendek (panjang film terpakai paling minim)
      // 4. Rotasi paling sedikit
      let menang = false;
      if (terbaik === null) {
        menang = true;
      } else if (kandidat.length < terbaik.length) {
        menang = true;
      } else if (kandidat.length === terbaik.length) {
        if (util > utilTerbaik + 0.05) {
          menang = true;
        } else if (Math.abs(util - utilTerbaik) <= 0.05) {
          if (maxReach < jangkauanTerbaik) {
            menang = true;
          } else if (maxReach === jangkauanTerbaik && putar < rotTerbaik) {
            menang = true;
          }
        }
      }

      if (menang) {
        terbaik = kandidat;
        utilTerbaik = util;
        jangkauanTerbaik = maxReach;
        rotTerbaik = putar;
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
    unplaced: (rects ?? []).filter((r) => takMuat.has(r)), // urutan input, duplikat dipertahankan
    utilizationPct,
    binWmm: binW,
    binHmm: binH,
    strategyName: strategiTerbaik,
    maxReachMm: Number.isFinite(jangkauanTerbaik) ? jangkauanTerbaik : 0,
  };
}
