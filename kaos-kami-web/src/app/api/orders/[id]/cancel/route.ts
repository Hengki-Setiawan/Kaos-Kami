import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";
import { assertResourceOwnerOrAdmin } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * POST /api/orders/:id/cancel — Pelanggan batalkan order MILIKNYA yang masih
 * PENDING (belum bayar). Tanpa sesi login yang cocok → 401/403.
 * Order lunas TIDAK bisa batal sendiri (hubungi workshop — uang sudah jalan).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const rl = await checkRateLimitAsync(`cancel:ip:${getClientIp(req)}`, 5, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 5) });
    }
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, orderId),
      columns: { id: true, userId: true, status: true, orderNumber: true },
    });
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    try {
      await assertResourceOwnerOrAdmin(order.userId);
    } catch (e: any) {
      const msg = e?.message || "Forbidden";
      return NextResponse.json({ error: msg }, { status: msg.startsWith("Unauthorized") ? 401 : 403 });
    }
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Hanya order belum bayar yang bisa dibatalkan. Hubungi workshop." },
        { status: 400 }
      );
    }
    const race = await db
      .update(Order)
      .set({ status: "CANCELLED" })
      .where(and(eq(Order.id, order.id), eq(Order.status, "PENDING_PAYMENT")));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "CANCELLED",
      note: "Dibatalkan pelanggan dari invoice.",
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
