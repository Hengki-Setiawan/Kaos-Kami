// src/lib/orders/stockMarker.ts
// Penanda stok di Order.courierNotes (bukan kolom baru — skema prod tidak
// boleh diubah tanpa SQL berversi, RUNBOOK §5).
//
// [STOCK_OK variantId:qty,...]  → HANYA varian yang BENAR-BENAR terpotong
//                                  saat pembayaran dikonfirmasi.
// [REVIEW:OVERSELL variantId,...] → stok kurang; JANGAN restore otomatis.
//
// Marker ini satu-satunya dasar auto-restore stok saat REFUNDED
// (keputusan owner #4). Fungsi murni + dites agar format tidak bergeser
// antara penulis (confirmOrderPaid) dan pembaca (admin refund).

export interface StockMarkerEntry {
  variantId: string;
  qty: number;
}

/** Format marker; null bila tak ada entri valid (jangan tulis marker kosong). */
export function formatStockMarker(entries: StockMarkerEntry[]): string | null {
  const parts = entries
    .filter((e) => e.variantId && Number.isFinite(e.qty) && e.qty > 0)
    .map((e) => `${e.variantId}:${e.qty}`);
  return parts.length > 0 ? `[STOCK_OK ${parts.join(",")}]` : null;
}

/** Baca marker; qty duplikat untuk varian sama dijumlahkan. */
export function parseStockMarker(notes: string | null | undefined): StockMarkerEntry[] {
  const raw = (notes || "").match(/\[STOCK_OK ([^\]]+)\]/)?.[1] || "";
  if (!raw) return [];
  const merged = new Map<string, number>();
  for (const pair of raw.split(",")) {
    const at = pair.lastIndexOf(":");
    if (at <= 0) continue;
    const variantId = pair.slice(0, at).trim();
    const qty = Number(pair.slice(at + 1));
    if (!variantId || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(variantId, (merged.get(variantId) || 0) + qty);
  }
  return [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

/** Order pernah oversell → decrement stok TIDAK boleh dianggap sukses. */
export function hasOversellFlag(notes: string | null | undefined): boolean {
  return (notes || "").includes("[REVIEW:OVERSELL");
}
