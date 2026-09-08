// Kontak & alamat toko — SUMBER TUNGGAL. Jangan hardcode nomor/alamat di file lain.
// Override via env (wrangler secret / .env.local) tanpa ubah kode.
export const SHOP_WHATSAPP =
  process.env.SHOP_CONTACT_WHATSAPP || "6281244002026";

export const SHOP_WORKSHOP_ADDRESS =
  process.env.SHOP_WORKSHOP_ADDRESS ||
  "Jl. Galangan Kapal Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan";

// Koordinat workshop (GPS pickup point): -5.106081, 119.432365.
export const SHOP_LAT = -5.106081;
export const SHOP_LON = 119.432365;

// Kode pos asal pengiriman (origin untuk API ongkir): Kaluku Bodoa, Tallo.
export const SHOP_POSTAL_CODE = process.env.SHOP_POSTAL_CODE || "90211";

export function shopWaLink(message: string): string {
  return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
