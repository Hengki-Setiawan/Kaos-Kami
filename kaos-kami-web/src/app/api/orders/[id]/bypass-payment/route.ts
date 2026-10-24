import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * POST /api/orders/[id]/bypass-payment
 * Endpoint khusus ADMIN untuk bypass pembayaran pesanan yang sudah ada di antrean
 * (baik DESIGN_REVIEW maupun PENDING_PAYMENT) langsung menjadi PAYMENT_CONFIRMED
 * dan menerbitkan tiket produksi DTF di Kanban.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const rl = await checkRateLimitAsync(`bypass:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { success: false, error: "Terlalu sering. Tunggu sebentar." },
        { status: 429, headers: rateLimitHeaders(rl, 10) }
      );
    }

    // 1. Verifikasi role ADMIN (Strict Server-Side Gate)
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });

    // HANYA role dari sesi yang dipercaya. Allowlist email lama adalah backdoor:
    // akun CUSTOMER dengan email tertentu bisa melunasi order tanpa bayar.
    const userRole = (session?.user as any)?.role;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya admin yang dapat melakukan bypass pembayaran" },
        { status: 403 }
      );
    }

    // 2. Ambil pesanan
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, orderId),
      with: { items: true, payment: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (["PAYMENT_CONFIRMED", "PRINTING", "PRESSING", "READY_TO_SHIP", "COMPLETED"].includes(order.status)) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: order.status,
        message: "Pesanan ini sudah lunas/dalam produksi.",
      });
    }

    // 3. Jika status DESIGN_REVIEW, bawa dulu ke PENDING_PAYMENT
    if (order.status === "DESIGN_REVIEW") {
      await db
        .update(Order)
        .set({
          status: "PENDING_PAYMENT",
          reviewedBy: session.user.id || "ADMIN_BYPASS",
        })
        .where(eq(Order.id, order.id));

      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "PENDING_PAYMENT",
        note: `Desain disetujui via Admin Test Bypass (${session.user.name || "ADMIN"}). Siap konfirmasi lunas.`,
      });
    }

    // 4. Hanya order yang memang bisa dibayar yang boleh di-bypass. Jangan
    //    pernah menulis Payment SETTLEMENT untuk order CANCELLED/REFUNDED.
    if (!["DESIGN_REVIEW", "PENDING_PAYMENT"].includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order berstatus ${order.status} tidak bisa di-bypass. Hanya DESIGN_REVIEW/PENDING_PAYMENT.`,
        },
        { status: 409 }
      );
    }

    // Tag note order agar tidak mencemari omzet
    const testTag = "[TEST_ORDER:ADMIN_BYPASS]";
    const currentNotes = order.notes || "";
    if (!currentNotes.includes(testTag)) {
      const updatedNotes = currentNotes ? `${currentNotes} | ${testTag}` : testTag;
      await db.update(Order).set({ notes: updatedNotes }).where(eq(Order.id, order.id));
    }

    // 5. Konfirmasi lunas & terbitkan tiket produksi DULU.
    const isExpress = order.courierNotes?.includes("[TIER:EXPRESS_24H]") === true;
    const bypassRef = `TEST-BYPASS-${nanoid(8).toUpperCase()}`;
    const confirmResult = await confirmOrderPaid(order.id, {
      via: `ADMIN_BYPASS (${session.user.name || "ADMIN"})`,
      paymentCode: "ADMIN_BYPASS",
      reference: `BYPASS-${order.orderNumber}`,
      express: isExpress,
    });
    if (confirmResult === "not-pending" || confirmResult === "processing") {
      return NextResponse.json(
        { success: false, error: "Status order berubah/sedang diproses saat bypass. Muat ulang lalu coba lagi." },
        { status: 409 }
      );
    }

    // 6. Payment SETTLEMENT hanya setelah batch task/stok sukses.
    const { settlePaymentAfterConfirm } = await import("@/lib/payments/settlement");
    await settlePaymentAfterConfirm({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountIdr: order.totalIdr,
      provider: "ADMIN_BYPASS",
      providerRef: bypassRef,
      method: "ADMIN_BYPASS",
      rawWebhookPayload: JSON.stringify({ via: "admin-bypass" }),
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "PAYMENT_CONFIRMED",
      confirmResult,
      message: "Pembayaran berhasil di-bypass. Status pesanan lunas dan tiket produksi DTF telah terbit di Kanban.",
    });
  } catch (error: any) {
    console.error("[bypass-payment] Gagal:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memproses bypass pembayaran" },
      { status: 500 }
    );
  }
}
