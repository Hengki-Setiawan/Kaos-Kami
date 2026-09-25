/**
 * Template alasan preset untuk REJECT review desain — SSOT (single source of
 * truth) dipakai UI admin + POST /api/admin/orders/[id]/review.
 *
 * Kontrak alur baru (keputusan owner Sep 2026):
 * checkout → DESIGN_REVIEW (tanpa charge) → admin approve → PENDING_PAYMENT
 * (user bayar via dashboard) / admin reject → REJECTED (terminal + alasan).
 *
 * Aturan reject (ditegakkan di review route, BUKAN di sini):
 * - alasan final = teks template preset + opsional catatan custom (digabung),
 *   ATAU murni custom bila templateId "lainnya" / tanpa templateId;
 * - panjang final WAJIB ≥ 5 karakter, selain itu 400.
 *
 * JANGAN ubah id yang sudah ada tanpa koordinasi — id dipakai sebagai
 * `templateId` di body review route + disimpan di UI admin.
 */

export interface ReviewRejectTemplate {
  /** Slug stabil untuk `templateId` (mis. "resolusi-kurang"). */
  id: string;
  /** Label pendek untuk dropdown/radio UI admin. */
  label: string;
  /** Teks alasan jadi yang disimpan ke Order.reviewNote bila dipilih. */
  text: string;
}

export const REVIEW_REJECT_TEMPLATES: ReviewRejectTemplate[] = [
  {
    id: "resolusi-kurang",
    label: "Resolusi kurang",
    text: "Resolusi gambar terlalu rendah untuk cetak DTF 300 DPI — pecah saat diperbesar. Kirim ulang file beresolusi tinggi (min. 3000px sisi terpanjang) atau pilih desain lain.",
  },
  {
    id: "luar-area-cetak",
    label: "Di luar area cetak",
    text: "Desain keluar dari area cetak aman (maks lebar 30,0 cm roll DTF). Perkecil / geser desain ke dalam area cetak lalu checkout ulang.",
  },
  {
    id: "warna-tak-cetak",
    label: "Warna tak tercetak",
    text: "Warna desain tidak tercetak akurat di mesin DTF (neon/gradasi sangat tipis). Ganti ke warna solid atau konsultasi via WA workshop.",
  },
  {
    id: "font-tipis",
    label: "Font/garis terlalu tipis",
    text: "Font atau garis terlalu tipis (< 2pt) — berisiko rontok setelah press & cuci. Tebalkan elemen atau ganti font lalu checkout ulang.",
  },
  {
    id: "lainnya",
    label: "Lainnya (custom)",
    text: "",
  },
];

/** Cari template by id — undefined bila tak dikenal (route balas 400). */
export function findRejectTemplate(templateId: string | undefined | null): ReviewRejectTemplate | undefined {
  if (!templateId) return undefined;
  return REVIEW_REJECT_TEMPLATES.find((t) => t.id === templateId);
}
