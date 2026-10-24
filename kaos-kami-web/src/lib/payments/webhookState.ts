/**
 * Klasifikasi status order untuk callback iPaymu.
 *
 * Dipisah dari route agar bisa diuji tanpa DB/HTTP. Aturan:
 * - Order yang sudah dibayar/diproses = idempoten, jangan spawn task lagi.
 * - Order yang sudah refund = idempoten, jangan set settlement lagi.
 * - Order yang batal/ditolak/masih review = pembayaran telat/tak terduga,
 *   WAJIB ditandai untuk refund, bukan dianggap lunas.
 * - PENDING_PAYMENT = satu-satunya status yang boleh dikonfirmasi.
 */
export type WebhookOrderState =
  | "already_paid"
  | "already_refunded"
  | "late_payment"
  | "pending"
  | "unknown";

const PAID_OR_FULFILLED = new Set([
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
]);

const LATE_OR_UNPAYABLE = new Set(["CANCELLED", "REJECTED", "DESIGN_REVIEW"]);

export function isPaidOrFulfilledStatus(status: string): boolean {
  return PAID_OR_FULFILLED.has(status);
}

export function classifyOrderForWebhook(status: string): WebhookOrderState {
  if (status === "PENDING_PAYMENT") return "pending";
  if (status === "REFUNDED") return "already_refunded";
  if (LATE_OR_UNPAYABLE.has(status)) return "late_payment";
  if (PAID_OR_FULFILLED.has(status)) return "already_paid";
  return "unknown";
}

/**
 * PAYMENT_CONFIRMED adalah status sementara yang ditulis confirmOrderPaid
 * SEBELUM batch task/stok selesai. Callback kedua yang melihat status ini
 * belum boleh menganggap order benar-benar selesai; tunggu event
 * PAYMENT_CONFIRMED dari batch yang sama.
 */
export function mustWaitForConfirmationEvent(status: string): boolean {
  return status === "PAYMENT_CONFIRMED";
}

/**
 * Satu-satunya predikat "uang benar-benar masuk" untuk iPaymu.
 *
 * JANGAN memakai substring "settle": status "unsettled" justru berarti BELUM
 * selesai. JANGAN memakai substring "berhasil": "belum berhasil" mengandung
 * kata itu. Docs resmi Check Transaction:
 *   0 pending, 1 success, 2 cancelled, 3 refund, 4 error, 5 failed,
 *   6 success-unsettled, 7 escrow, -2 expired.
 * `PaidStatus: "paid"` juga bukti kuat. Selain itu hanya frasa exact.
 */
const SUCCESS_WORDS = new Set([
  "paid",
  "berhasil",
  "success",
  "settled",
  "success - unsettled",
  "success-unsettled",
]);

export function isIpaymuSuccessStatus(input: {
  status?: unknown;
  statusCode?: unknown;
  statusDesc?: unknown;
  paidStatus?: unknown;
}): boolean {
  const rawCode = input.statusCode ?? input.status;
  const code = String(rawCode ?? "").trim().toLowerCase();
  if (/^-?\d+$/.test(code)) {
    return code === "1" || code === "6";
  }
  const paid = String(input.paidStatus ?? "").trim().toLowerCase();
  if (paid === "paid") return true;
  const status = String(input.status ?? "").trim().toLowerCase();
  if (SUCCESS_WORDS.has(status)) return true;
  const desc = String(input.statusDesc ?? "").trim().toLowerCase();
  return SUCCESS_WORDS.has(desc);
}
