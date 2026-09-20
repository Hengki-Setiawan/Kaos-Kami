import { packGangSheet } from "../kaos-kami-web/src/lib/gangPacker";

const rects = [
  { id: "1", wMm: 280, hMm: 350, qty: 2, label: "Kaos Depan", orderNumber: "KK-001", masterUrl: null },
  { id: "2", wMm: 100, hMm: 100, qty: 4, label: "Logo Saku", orderNumber: "KK-002", masterUrl: null },
  { id: "3", wMm: 200, hMm: 200, qty: 1, label: "Punggung", orderNumber: "KK-003", masterUrl: null },
];

const res = packGangSheet(rects, { binWmm: 580, binHmm: 1000 });
console.log("=== HASIL PENGUJIAN GANG PACKER TOURNAMENT ===");
console.log("Jumlah Lembar (Bins):", res.bins.length);
console.log("Total Artwork Tersusun:", res.bins.reduce((s, b) => s + b.length, 0));
console.log("Utilisasi Luas:", res.utilizationPct.toFixed(1) + "%");
console.log("Strategi Pemenang Turnamen:", res.strategyName);
console.log("Jangkauan Roll Terpakai:", res.maxReachMm + " mm (" + ((res.maxReachMm || 0) / 10).toFixed(1) + " cm)");
console.log("Semua Item Muat?:", res.unplaced.length === 0 ? "YA (100%)" : "TIDAK");
