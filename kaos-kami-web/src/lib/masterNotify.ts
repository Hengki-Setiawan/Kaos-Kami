/**
 * Master-attach / master-notify — helper MURNI (node-safe, testable).
 *
 * Kontrak endpoint POST /api/admin/production-tasks/master-notify:
 * - printFileUrl: https R2 (wajib https://, maks 2048, tolak data:/blob:).
 * - printWidthCm: clamp ≤30.0 (heat press + anatomi dada A3).
 * - placementSide: string ≤40 opsional; offsetFromCollarCm: 0…30 opsional.
 * - resi (trackingNumber): trim ≤40 opsional.
 * - notifyWa: default FALSE; WA HANYA bila true eksplisit + try/catch caller.
 */

export const MASTER_NOTIFY_MAX_WIDTH_CM = 30.0;
export const MASTER_NOTIFY_MAX_URL_LEN = 2048;
export const MASTER_NOTIFY_MAX_RESI_LEN = 40;

/** Clamp lebar cetak ke batas fisik DTF (≤30.0). NaN → undefined. */
export function clampMasterPrintWidthCm(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 0) return undefined;
  return Math.min(n, MASTER_NOTIFY_MAX_WIDTH_CM);
}

/** True bila URL master valid https (tolak base64/data:/blob:/http:). */
export function isHttpsR2MasterUrl(u: unknown): boolean {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (s.length === 0 || s.length > MASTER_NOTIFY_MAX_URL_LEN) return false;
  if (s.startsWith("data:")) return false;
  if (s.startsWith("blob:")) return false;
  return /^https:\/\//.test(s);
}

/** Normalisasi resi: trim + potong 40 char; kosong → undefined. */
export function normalizeResi(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, MASTER_NOTIFY_MAX_RESI_LEN);
  return t.length > 0 ? t : undefined;
}

/** Normalisasi placementSide: trim ≤40; kosong → undefined. */
export function normalizePlacementSide(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, 40);
  return t.length > 0 ? t : undefined;
}

/** Normalisasi offset kerah: 0…30; di luar → undefined. */
export function normalizeOffsetFromCollarCm(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0 || n > 30) return undefined;
  return n;
}

/** Catatan OrderStatusEvent untuk lampiran master (jujur + ringkas). */
export function buildMasterNotifyNote(parts: {
  printWidthCm?: number;
  placementSide?: string;
  offsetFromCollarCm?: number;
  resi?: string;
  hasFile: boolean;
}): string {
  const bits: string[] = [];
  bits.push(parts.hasFile ? "Master film DTF 300 DPI dilampirkan operator." : "Data master diperbarui operator.");
  if (parts.printWidthCm !== undefined) bits.push(`Lebar ${parts.printWidthCm.toFixed(1)} cm (maks 30.0).`);
  if (parts.placementSide) bits.push(`Posisi: ${parts.placementSide}.`);
  if (parts.offsetFromCollarCm !== undefined) bits.push(`Kerah ↓${parts.offsetFromCollarCm} cm.`);
  if (parts.resi) bits.push(`Resi: ${parts.resi}.`);
  return bits.join(" ").slice(0, 500);
}
