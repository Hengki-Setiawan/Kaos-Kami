// Kontak & alamat toko — SUMBER TUNGGAL. Jangan hardcode nomor/alamat di file lain.
// Override via env (wrangler secret / .env.local) tanpa ubah kode.
export const SHOP_WHATSAPP =
  process.env.SHOP_CONTACT_WHATSAPP || "62882020685076";

// Alias nama-env (kompatibilitas impor lama).
export const SHOP_CONTACT_WHATSAPP = SHOP_WHATSAPP;

export const SHOP_WORKSHOP_ADDRESS =
  process.env.SHOP_WORKSHOP_ADDRESS ||
  "Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211";

// Email kontak & support — Wajib Duitku Payment Gateway & CS.
export const SHOP_EMAIL =
  process.env.SHOP_EMAIL || "hengkisetiawan461@gmail.com";
export const SHOP_SUPPORT_EMAIL =
  process.env.SHOP_SUPPORT_EMAIL || "support@kaoskami.biz.id";

export const SHOP_PHONE_DISPLAY = "+62 882-0206-85076";
export const SHOP_HOURS = "Senin – Sabtu: 09:00 – 21:00 WITA";

// Koordinat workshop (GPS pickup point, default: -5.106018313739206, 119.43239633333334).
// Override via env SHOP_LAT / SHOP_LON (wrangler secret / .env.local) tanpa ubah kode —
// mis. SHOP_LAT=-5.14 SHOP_LON=119.42. Nilai tak-angka/NaN kembali ke default (fail-safe).
function numEnv(key: string, fallback: number): number {
  const raw = (process.env[key] || "").trim().replace(",", ".");
  const n = Number(raw);
  return raw !== "" && Number.isFinite(n) ? n : fallback;
}
export const SHOP_LAT = numEnv("SHOP_LAT", -5.106018313739206);
export const SHOP_LON = numEnv("SHOP_LON", 119.43239633333334);

// Kode pos asal pengiriman (origin untuk API ongkir): Kaluku Bodoa, Tallo (90211).
export const SHOP_POSTAL_CODE = process.env.SHOP_POSTAL_CODE || "90211";

// I7: URL unduh APK Android — SUMBER TUNGGAL (dulu hardcode di invoice).
// Override via env NEXT_PUBLIC_APK_URL tanpa ubah kode.
export const APK_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_APK_URL ||
  "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/aplikasi/kaos-kami.apk";

export function shopWaLink(message: string): string {
  return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
