// src/lib/shopHours.ts — Jam operasional workshop (SUMBER TUNGGAL, client-safe).
// Aturan owner: Asia/Makassar (WITA, UTC+8) 09.00–21.00 setiap hari.
// Dipakai: badge BUKA/TUTUP di Navbar + notice antrean checkout (TANPA blokir checkout).
//
// Catatan zona waktu: memakai Intl.DateTimeFormat(timeZone) sehingga benar di
// browser/server zona apa pun (tak mengandalkan getHours lokal / offset manual).

export const SHOP_TIMEZONE = "Asia/Makassar";
export const SHOP_OPEN_HOUR = 9; // 09.00 WITA (inklusif)
export const SHOP_CLOSE_HOUR = 21; // 21.00 WITA (eksklusif — tepat 21.00 = tutup)
export const SHOP_HOURS_LABEL = "Setiap Hari 09.00–21.00 WITA";

/** Jam-menit WITA dari sebuah Date (default: sekarang). */
export function getWitaParts(at: Date = new Date()): { hour: number; minute: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: SHOP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(at);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || "0");
    return { hour: get("hour") % 24, minute: get("minute") };
  } catch {
    // Fallback UTC+8 mentah bila Intl/timezone tak tersedia (WebView tua).
    const utc = at.getTime() + at.getTimezoneOffset() * 60000;
    const wita = new Date(utc + 8 * 3600000);
    return { hour: wita.getHours(), minute: wita.getMinutes() };
  }
}

/** true bila toko buka pada waktu `at` (09.00 ≤ t < 21.00 WITA). */
export function isShopOpen(at: Date = new Date()): boolean {
  const { hour } = getWitaParts(at);
  return hour >= SHOP_OPEN_HOUR && hour < SHOP_CLOSE_HOUR;
}

export type ShopStatus = { open: boolean; label: string };

/** Status ringkas untuk badge: { open, label: "BUKA"/"TUTUP" }. */
export function getShopStatus(at: Date = new Date()): ShopStatus {
  const open = isShopOpen(at);
  return { open, label: open ? "BUKA" : "TUTUP" };
}

/**
 * Label kapan toko buka berikutnya untuk notice antrean.
 * - Buka sekarang → "Buka sekarang • tutup 21.00 WITA".
 * - Tutup & masih hari yang sama sebelum 09.00 → "Buka pukul 09.00 WITA hari ini".
 * - Tutup sesudah 21.00 → "Buka pukul 09.00 WITA besok".
 */
export function nextOpenLabel(at: Date = new Date()): string {
  const { hour } = getWitaParts(at);
  if (hour >= SHOP_OPEN_HOUR && hour < SHOP_CLOSE_HOUR) {
    return "Buka sekarang • tutup 21.00 WITA";
  }
  if (hour < SHOP_OPEN_HOUR) {
    return "Buka pukul 09.00 WITA hari ini";
  }
  return "Buka pukul 09.00 WITA besok";
}

/**
 * Notice checkout saat toko TUTUP — JANGAN blokir checkout, hanya informatif:
 * "masuk antrean, diproses 09.00".
 * Kembalikan null bila toko buka (tak perlu notice).
 * (Helper siap pakai untuk pemilik file checkout; Navbar hanya menampilkan badge.)
 */
export function getClosedQueueNotice(at: Date = new Date()): string | null {
  if (isShopOpen(at)) return null;
  return `Workshop tutup — pesanan masuk antrean, diproses ${nextOpenLabel(at).replace("Buka pukul ", "")}. Checkout tetap bisa dilanjutkan.`;
}
