// Kontak workshop TUNGGAL (ganti data pribadi hardcode yang bocor ke semua user).
// Nilai dari .env.local (NEXT_PUBLIC_*), fallback nomor workshop resmi.
export const SHOP_WHATSAPP =
  process.env.NEXT_PUBLIC_SHOP_CONTACT_WHATSAPP || '6281244002026';

export const SHOP_ADDRESS =
  process.env.NEXT_PUBLIC_SHOP_WORKSHOP_ADDRESS ||
  'Workshop Kaos Kami, Makassar';

export function shopWaLink(message: string): string {
  return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
