/**
 * Mesin transisi status Order — allow-list from → to per peran.
 *
 * Aturan integritas:
 * - Status terminal (CANCELLED / REFUNDED / COMPLETED / REJECTED) TIDAK bisa keluar
 *   ke status apa pun, untuk semua peran.
 * - Setiap perubahan status generik via API admin WAJIB lewat
 *   `assertTransition` + update optimistis `where(status = old)`.
 * - cancel/refund finansial hanya ADMIN/SUPER_ADMIN (dicek di route);
 *   di sini peta transisinya tetap didefinisikan agar konsisten.
 */

export type Role = "ADMIN" | "SUPER_ADMIN" | "PRODUCTION_STAFF" | "COURIER" | "SYSTEM";

export const ORDER_STATUSES = [
  "DESIGN_REVIEW",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "REJECTED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Status terminal: tidak ada transisi keluar yang legal. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  "CANCELLED",
  "REFUNDED",
  "COMPLETED",
  "REJECTED",
];

export function isTerminalStatus(s: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(s);
}

// Rantai maju utama (alur baru owner Sep 2026 — review desain dulu):
// DESIGN_REVIEW → PENDING_PAYMENT (via approve admin) → PAYMENT_CONFIRMED
// (via SYSTEM webhook Duitku / via request-payment + bayar user)
// → IN_PRODUCTION_QUEUE → PRINTING → QUALITY_CHECK → READY_TO_SHIP
// → SHIPPED → DELIVERED → COMPLETED
// DESIGN_REVIEW → REJECTED (via reject admin, terminal + alasan wajib).
// (PICKUP boleh READY_TO_SHIP → DELIVERED/COMPLETED langsung tanpa SHIPPED.)
// Sweep 24 jam SENGAJA tak menyentuh DESIGN_REVIEW (hanya PENDING_PAYMENT).

/** Jalur finansial yang diizinkan untuk peran admin. */
const ADMIN_CANCEL_FROM: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_CONFIRMED"];
const ADMIN_REFUND_FROM: OrderStatus[] = [
  "PAYMENT_CONFIRMED",
  "IN_PRODUCTION_QUEUE",
  "PRINTING",
  "QUALITY_CHECK",
  "READY_TO_SHIP",
  "SHIPPED",
];

/** Rantai produksi penuh untuk ADMIN/SUPER_ADMIN (termasuk jalur finansial). */
const ADMIN_CHAIN: Partial<Record<OrderStatus, OrderStatus[]>> = {
  // Alur review (owner Sep 2026): approve → PENDING_PAYMENT (user bayar via
  // dashboard /api/orders/[id]/request-payment), reject → REJECTED (terminal).
  DESIGN_REVIEW: ["PENDING_PAYMENT", "REJECTED"],
  PENDING_PAYMENT: ["PAYMENT_CONFIRMED", "CANCELLED"],
  PAYMENT_CONFIRMED: ["IN_PRODUCTION_QUEUE", "CANCELLED", "REFUNDED"],
  IN_PRODUCTION_QUEUE: ["PRINTING", "REFUNDED"],
  PRINTING: ["QUALITY_CHECK", "REFUNDED"],
  // QUALITY_CHECK boleh kembali ke PRINTING untuk kerja ulang (rework).
  QUALITY_CHECK: ["READY_TO_SHIP", "PRINTING", "REFUNDED"],
  READY_TO_SHIP: ["SHIPPED", "DELIVERED", "COMPLETED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "COMPLETED", "REFUNDED"],
  DELIVERED: ["COMPLETED"],
};

/**
 * Allow-list transisi per peran.
 * - ADMIN / SUPER_ADMIN: rantai penuh + cancel/refund finansial + review
 *   desain (DESIGN_REVIEW → PENDING_PAYMENT via approve / → REJECTED via reject).
 * - PRODUCTION_STAFF: hanya gerak produksi maju (+ rework QC→PRINTING,
 *   + COMPLETED dari READY_TO_SHIP/SHIPPED/DELIVERED). Tanpa CANCELLED/REFUNDED,
 *   tanpa konfirmasi pembayaran, tanpa review desain.
 * - SYSTEM: otomasi pembayaran & pengiriman (webhook Duitku, cron kedaluwarsa,
 *   auto-complete). Tanpa cancel/refund manual, tanpa review.
 *   (PENDING_PAYMENT kini dicapai via approve admin; path webhook SYSTEM
 *   PENDING_PAYMENT → PAYMENT_CONFIRMED tetap seperti semula.)
 */
export const ORDER_TRANSITIONS: Record<Role, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  ADMIN: ADMIN_CHAIN,
  SUPER_ADMIN: ADMIN_CHAIN,
  PRODUCTION_STAFF: {
    PAYMENT_CONFIRMED: ["IN_PRODUCTION_QUEUE"],
    IN_PRODUCTION_QUEUE: ["PRINTING"],
    PRINTING: ["QUALITY_CHECK"],
    QUALITY_CHECK: ["READY_TO_SHIP", "PRINTING"],
    READY_TO_SHIP: ["SHIPPED", "DELIVERED", "COMPLETED"],
    SHIPPED: ["DELIVERED", "COMPLETED"],
    DELIVERED: ["COMPLETED"],
  },
  COURIER: {
    READY_TO_SHIP: ["SHIPPED", "DELIVERED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
  },
  SYSTEM: {
    PENDING_PAYMENT: ["PAYMENT_CONFIRMED", "CANCELLED"],
    PAYMENT_CONFIRMED: ["IN_PRODUCTION_QUEUE"],
    READY_TO_SHIP: ["SHIPPED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
  },
};

/** Sinkron dengan guard finansial di route admin (sumber kebenaran kedua). */
export function isAdminCancelFrom(s: string): boolean {
  return (ADMIN_CANCEL_FROM as readonly string[]).includes(s);
}

export function isAdminRefundFrom(s: string): boolean {
  return (ADMIN_REFUND_FROM as readonly string[]).includes(s);
}

/**
 * Validasi transisi. Melempar `{ status: 400, message }` bila ilegal
 * (termasuk keluar dari status terminal, untuk semua peran).
 */
export function assertTransition(role: Role, from: string, to: string): void {
  if (isTerminalStatus(from)) {
    throw {
      status: 400,
      message: `Order ${from} bersifat final dan tidak bisa diubah ke ${to}.`,
    };
  }
  const allowed = ORDER_TRANSITIONS[role]?.[from as OrderStatus] ?? [];
  if (!(allowed as readonly string[]).includes(to)) {
    throw {
      status: 400,
      message: `Transisi ${from} → ${to} tidak diizinkan untuk peran ${role}.`,
    };
  }
}
