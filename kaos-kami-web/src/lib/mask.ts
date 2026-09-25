/**
 * Masking PII untuk invoice/log/tampilan (anti-bocor nomor HP & email).
 * - maskPhone: 4 karakter awal + **** + 2 digit akhir (mis. 0812****90).
 * - maskEmail: 2 karakter awal local-part + ***@domain (mis. he***@gmail.com).
 * - Input kosong/null/undefined → "" (tak pernah melempar).
 */

export function maskPhone(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  // Terlalu pendek untuk pola 4+2 — samarkan hampir semua agar tak bocor.
  if (s.length <= 2) return "****";
  if (s.length <= 6) return `${s.slice(0, 1)}****${s.slice(-1)}`;
  return `${s.slice(0, 4)}****${s.slice(-2)}`;
}

/**
 * Mask nama penerima untuk tamu: kata pertama + " ***" (mis. "Hengki ***").
 * Marga/inisial belakang disembunyikan; pemilik/privileged tetap lihat penuh
 * (gate canSeePII di pemanggil). Input kosong → "".
 */
export function maskName(v: string | null | undefined): string {
  if (v == null) return "";
  const first = String(v).trim().split(/\s+/)[0] || "";
  if (!first) return "";
  return `${first} ***`;
}

export function maskEmail(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  const at = s.lastIndexOf("@");
  // Tanpa "@" atau local-part kosong — jangan bocorkan isi mentah.
  if (at < 0) return s.length <= 2 ? "***" : `${s.slice(0, 2)}***`;
  if (at === 0) {
    const domain = s.slice(1);
    return domain ? `***@${domain}` : "***";
  }
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!domain) return "***";
  const head = local.length >= 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${head}***@${domain}`;
}
