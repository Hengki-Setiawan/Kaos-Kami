/**
 * Normalisasi nomor WA Indonesia ke bentuk lolos regex backend ID.
 *
 * Backend menerima `^(\+62|62|0)8[1-9][0-9]{6,10}$` (checkout /api/checkout,
 * mobile checkout, GuestCheckoutSchema) dan `/^\+?[0-9]{9,16}$/` (OTP
 * /api/auth/send-otp). Keyboard HP umum mengetik "0812-3456 7890",
 * "+62 812-3456-7890", "(0812) 3456-7890" — semua DITOLAK regex bila
 * dikirim mentah (spasi/strip/kurung).
 *
 * Fungsi ini murni sanitasi, BUKAN validasi: kembalikan string bersih;
 * regex backend / Zod yang menolak dengan pesan rapi bila tetap invalid.
 * - Buang spasi, strip, titik, kurung (sisa digit + satu "+" depan).
 * - "+" tengah/akhir dibuang; "+08…" → "08…" (backend hanya terima +62).
 * - "8…" tanpa prefix → "0…" (kebiasaan user memotong 0 depan).
 * - Non-string / kosong → "" (validasi hilir yang menolak jujur).
 */
export function normalizePhoneId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (hadPlus) {
    if (digits.startsWith("62")) return `+${digits}`;
    if (digits.startsWith("0")) return digits.slice(0);
    if (digits.startsWith("8")) return `0${digits}`;
    return `+${digits}`;
  }
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}
