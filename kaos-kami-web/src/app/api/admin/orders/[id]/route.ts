import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, Payment } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const PatchSchema = z.object({
  trackingNumber: z.string().max(64).nullable().optional(),
  cancel: z.boolean().optional(),
  // Tandai refund: uang dikembalikan MANUAL via dashboard Duitku (tidak ada
  // API refund publik) — tombol ini hanya mencatat status + riwayat.
  refund: z.boolean().optional(),
});

async function requireWorkshop(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`admin-order:ip:${ip}`, 30, 60);
  if (rl.isLimited) return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) }) };
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {};
}

/**
 * PATCH /api/admin/orders/:id — aksi workshop: isi nomor resi / batalkan order.
 * Batal hanya untuk status awal (PENDING_PAYMENT/PAYMENT_CONFIRMED) — order yang
 * sudah masuk produksi tidak bisa dibatalkan dari sini (hubungi supervisor).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireWorkshop(req);
  if (gate.error) return gate.error;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  const { trackingNumber, cancel, refund } = parsed.data;

  const { id: orderId } = await params;
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    columns: { id: true, status: true, orderNumber: true },
  });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  if (trackingNumber !== undefined) {
    await db.update(Order).set({ trackingNumber }).where(eq(Order.id, order.id));
  }
  if (cancel) {
    if (!["PENDING_PAYMENT", "PAYMENT_CONFIRMED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Hanya order PENDING/PAYMENT_CONFIRMED yang bisa dibatalkan" },
        { status: 400 }
      );
    }
    const race = await db
      .update(Order)
      .set({ status: "CANCELLED" })
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "CANCELLED",
      note: "Dibatalkan oleh workshop via admin.",
    });
  }
  if (refund) {
    const refundable = [
      "PAYMENT_CONFIRMED",
      "IN_PRODUCTION_QUEUE",
      "PRINTING",
      "QUALITY_CHECK",
      "READY_TO_SHIP",
      "SHIPPED",
    ];
    if (!refundable.includes(order.status)) {
      return NextResponse.json(
        { error: "Refund hanya untuk order yang sudah dibayar & belum selesai" },
        { status: 400 }
      );
    }
    const race = await db
      .update(Order)
      .set({ status: "REFUNDED" })
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.update(Payment).set({ status: "REFUNDED" }).where(eq(Payment.orderId, order.id));
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "REFUNDED",
      note: "Dana dikembalikan manual via dashboard Duitku; status dicatat admin.",
    });
  }
  return NextResponse.json({ success: true });
}
