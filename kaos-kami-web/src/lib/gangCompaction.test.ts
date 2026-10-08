import { describe, it, expect } from "vitest";
import { packGangSheet, type GangRect } from "@/lib/gangPacker";

describe("gangPacker: Advanced Mathematical 2-Phase Optimization", () => {
  it("Eliminasi Meter Sisa: backfill memindahkan item dari bin 2 ke sela kosong bin 1", () => {
    // Buat skenario di mana satu item besar mengisi setengah bin 1,
    // dan beberapa item kecil awalnya ditaruh di bin 2.
    // Algoritma lanjutan harus menyisipkan item kecil tersebut ke ruang sisa bin 1,
    // sehingga bin 2 tereliminasi total (1 bin)!
    const rects: GangRect[] = [
      {
        id: "besar",
        wMm: 500,
        hMm: 500,
        qty: 1,
        label: "Besar",
        orderNumber: "ORD-01",
        masterUrl: null,
      },
      {
        id: "kecil",
        wMm: 150,
        hMm: 150,
        qty: 2,
        label: "Kecil",
        orderNumber: "ORD-02",
        masterUrl: null,
      },
    ];

    const res = packGangSheet(rects, { binWmm: 580, binHmm: 1000, gapMm: 10, marginMm: 10 });
    
    // Semua harus masuk ke dalam 1 bin (1 meter)!
    expect(res.bins).toHaveLength(1);
    expect(res.unplaced).toHaveLength(0);
    expect(res.bins[0]).toHaveLength(3);
  });

  it("Invarian Geometris: Tidak ada tabrakan (zero collision) dan patuh margin di semua bin", () => {
    // Skenario 15 item dengan aneka ukuran bervariasi
    const rects: GangRect[] = [
      { id: "a", wMm: 260, hMm: 220, qty: 4, label: "Kucing", orderNumber: "ORD-KUCING", masterUrl: null },
      { id: "b", wMm: 200, hMm: 100, qty: 6, label: "Logo", orderNumber: "ORD-LOGO", masterUrl: null },
      { id: "c", wMm: 80, hMm: 80, qty: 5, label: "Badge", orderNumber: "ORD-BADGE", masterUrl: null },
    ];

    const binW = 580;
    const binH = 1000;
    const gap = 10;
    const margin = 10;

    const res = packGangSheet(rects, { binWmm: binW, binHmm: binH, gapMm: gap, marginMm: margin });

    expect(res.bins.length).toBeGreaterThan(0);

    for (let bi = 0; bi < res.bins.length; bi++) {
      const b = res.bins[bi]!;
      for (let i = 0; i < b.length; i++) {
        const item = b[i]!;

        // 1. Cek batas margin
        expect(item.xMm).toBeGreaterThanOrEqual(margin);
        expect(item.yMm).toBeGreaterThanOrEqual(margin);
        expect(item.xMm + item.wMm).toBeLessThanOrEqual(binW - margin);
        expect(item.yMm + item.hMm).toBeLessThanOrEqual(binH - margin);

        // 2. Cek tidak ada overlap dengan item lain di bin yang sama
        for (let j = i + 1; j < b.length; j++) {
          const other = b[j]!;
          const overlapX = !(item.xMm + item.wMm + gap <= other.xMm || other.xMm + other.wMm + gap <= item.xMm);
          const overlapY = !(item.yMm + item.hMm + gap <= other.yMm || other.yMm + other.hMm + gap <= item.yMm);
          const bertabrakan = overlapX && overlapY;
          expect(bertabrakan).toBe(false);
        }
      }
    }
  });

  it("Ukuran asli & aspek rasio 100% terjaga tanpa distorsi", () => {
    const rects: GangRect[] = [
      { id: "r1", wMm: 264, hMm: 215, qty: 2, label: "Presisi", orderNumber: "ORD-P", masterUrl: null },
    ];

    const res = packGangSheet(rects, { binWmm: 580, binHmm: 1000 });
    const p1 = res.bins[0]?.[0];
    const p2 = res.bins[0]?.[1];

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    // Jika diputar, w dan h tertukar tepat tanpa deviasi
    if (p1!.rot) {
      expect(p1!.wMm).toBe(215);
      expect(p1!.hMm).toBe(264);
    } else {
      expect(p1!.wMm).toBe(264);
      expect(p1!.hMm).toBe(215);
    }
  });
});
