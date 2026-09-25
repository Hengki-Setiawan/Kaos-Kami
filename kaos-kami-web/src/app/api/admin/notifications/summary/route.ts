import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, count, eq, gte, like, lt, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";
import {
  checkRateLimitAsync,
  getClientIp,
  rateLimitHeaders,
} from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

// GET /api/admin/notifications/summary — dering kasir workshop: angka-angka
// yang butuh tindakan (review, order baru, oversell, express telat, komplain).
//
// KOMPATIBILITAS (milik sesi lain: GET /api/notifications milik customer):
// endpoint ini HANYA membaca tabel/kolom yang SUDAH ADA (Order +
// OrderStatusEvent) — tanpa migrasi, tanpa enum baru, tanpa kolom baru.
// Respons { success, summary, generatedAt } tidak mengubah kontrak
// /api/notifications ({ success, items }) dengan cara apa pun.
//
// Konvensi string yang dibaca (semua ditulis kode yang sudah ada):
// - Oversell  : confirmOrder.ts menulis marker "[REVIEW:OVERSELL ...]" di
//   Order.courierNotes + event OrderStatusEvent note "REVIEW:OVERSELL".
// - Express   : checkout menulis marker "[TIER:EXPRESS_24H]" (mengandung
//   substring "EXPRESS") di courierNotes; reports/route.ts mendefinisikan
//   SLA Express 24H (logika disalin persis di bawah).
// - Komplain  : complaints/route.ts menulis event note "[KOMPLAIN:<kategori>]".
// - DESIGN_REVIEW: status ini BELUM ADA di enum OrderStatus prisma (DRAFT/
//   SAVED/... untuk Design; Order tanpa status review). Kueri string tetap
//   valid (kolom text) → hasil 0 yang jujur hari ini, dan metrik LANGSUNG
//   hidup tanpa ubah kode bila enum ditambahkan kelak.
//
// Ketahanan: SETIAP metrik dibungkus try/catch sendiri → null bila gagal.
// Satu sumber gagal TIDAK pernah menjadikan respons 500.

const SUMMARY_LIMIT_PER_MINUTE = 30;

// "Sudah bayar" = bukan PENDING, bukan final-void. COMPLETED ikut dihitung
// (riwayat oversell tetap terlihat) — frontend boleh memfilter bila hanya
// mau antrean aktif.
const PAID_NOT_VOID = ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"];
const ACTIVE_NOT_DONE = ["COMPLETED", "CANCELLED", "REFUNDED"];

async function requireWorkshop() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: (await headers()) as any,
    });
    const role = (session?.user as any)?.role;
    if (!session?.user) {
      return {
        error: NextResponse.json(
          { success: false, error: "Unauthorized: silakan login dulu" },
          { status: 401 },
        ),
      };
    }
    if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return {
        error: NextResponse.json(
          { success: false, error: "Forbidden: khusus workshop" },
          { status: 403 },
        ),
      };
    }
    return { role: role as string };
  } catch {
    // Fail-closed: error auth = tolak, jangan lolos.
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized: silakan login dulu" },
        { status: 401 },
      ),
    };
  }
}

/** COUNT(*) yang jujur: number bila sukses (0 bila tak ada baris), null bila gagal. */
async function safeCount(
  run: () => Promise<Array<{ n: number }>>,
): Promise<number | null> {
  try {
    const rows = await run();
    return rows[0]?.n ?? 0;
  } catch (e: any) {
    console.warn("[notif-summary] metrik gagal:", e?.message || e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(
    `admin-notif-summary:ip:${ip}`,
    SUMMARY_LIMIT_PER_MINUTE,
    60,
  );
  if (rl.isLimited) {
    return NextResponse.json(
      { success: false, error: "Rate limited: coba lagi sebentar" },
      { status: 429, headers: rateLimitHeaders(rl, SUMMARY_LIMIT_PER_MINUTE) },
    );
  }

  const gate = await requireWorkshop();
  if (gate.error) return gate.error;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Paralel read-only; tiap metrik aman-sendiri (null bila sumbernya gagal).
  const [
    needsReview,
    needsReviewOverdue24h,
    newOrdersLastHour,
    oversellCount,
    expressOverdue,
    complaintsOpen,
  ] = await Promise.all([
    safeCount(() =>
      db.select({ n: count() }).from(Order).where(eq(Order.status, "DESIGN_REVIEW")),
    ),
    safeCount(() =>
      db
        .select({ n: count() })
        .from(Order)
        .where(and(eq(Order.status, "DESIGN_REVIEW"), lt(Order.createdAt, dayAgo))),
    ),
    safeCount(() =>
      db.select({ n: count() }).from(Order).where(gte(Order.createdAt, hourAgo)),
    ),
    safeCount(() =>
      db
        .select({ n: count() })
        .from(Order)
        .where(
          and(
            like(Order.courierNotes, "%REVIEW:OVERSELL%"),
            notInArray(Order.status, PAID_NOT_VOID),
          ),
        ),
    ),
    safeCount(() =>
      db
        .select({ n: count() })
        .from(Order)
        .where(
          and(
            like(Order.courierNotes, "%EXPRESS%"),
            notInArray(Order.status, ACTIVE_NOT_DONE),
            lt(Order.createdAt, dayAgo),
          ),
        ),
    ),
    safeCount(() =>
      db
        .select({ n: count() })
        .from(OrderStatusEvent)
        .where(like(OrderStatusEvent.note, "%[KOMPLAIN:%")),
    ),
  ]);

  // JANGAN 500: bahkan bila semua metrik null, tetap 200 + null jujur.
  return NextResponse.json({
    success: true,
    summary: {
      needsReview,
      needsReviewOverdue24h,
      newOrdersLastHour,
      oversellCount,
      expressOverdue,
      complaintsOpen,
    },
    generatedAt: now.toISOString(),
    notes:
      "null = metrik gagal dibaca (bukan 0). needsReview 0 wajar: status DESIGN_REVIEW belum ada di enum OrderStatus (future-proof). Sumber: Order + OrderStatusEvent — tanpa tabel/kolom baru.",
  });
}
