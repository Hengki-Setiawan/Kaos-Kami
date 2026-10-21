import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const OrderIdParam = z.string().min(5).max(64);

/**
 * GET /api/orders/:id
 * Endpoint publik ringan non-PII untuk polling status pesanan & pembayaran
 * Digunakan oleh DirectQrisModal, Invoice Poller, dan status checker.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`order-status:ip:${ip}`, 60, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan." },
        { status: 429, headers: rateLimitHeaders(rl, 60) }
      );
    }

    const { id } = await params;
    const parsed = OrderIdParam.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, parsed.data),
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        totalIdr: true,
        updatedAt: true,
      },
      with: {
        payment: {
          columns: {
            status: true,
            method: true,
            provider: true,
            providerRef: true,
            paidAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let finalStatus = order.status;
    let finalPayment = order.payment;

    // Active Reconciliation: jika status masih PENDING_PAYMENT, cek langsung ke iPaymu API
    if (
      order.status === "PENDING_PAYMENT" &&
      order.payment?.provider === "IPAYMU" &&
      order.payment?.providerRef &&
      /^\d+$/.test(order.payment.providerRef)
    ) {
      try {
        const { ipaymuProvider } = await import("@/lib/payments/ipaymu");
        if (ipaymuProvider.isConfigured()) {
          const check = await ipaymuProvider.checkTransactionStatus(order.payment.providerRef);
          const isSuccess =
            check.status === "1" ||
            check.status.toLowerCase() === "berhasil" ||
            check.statusDesc.toLowerCase().includes("berhasil") ||
            check.statusDesc.toLowerCase().includes("success");

          if (isSuccess) {
            const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
            const { Payment } = await import("@/lib/drizzle-schema");
            const { eq } = await import("drizzle-orm");

            await db
              .update(Payment)
              .set({
                status: "SETTLEMENT",
                paidAt: new Date(),
              })
              .where(eq(Payment.orderId, order.id));

            await confirmOrderPaid(order.id, {
              paymentCode: "iPaymu QRIS",
              reference: order.payment.providerRef,
              via: "iPaymu Active Status Check",
            });

            finalStatus = "PAYMENT_CONFIRMED";
            finalPayment = {
              ...order.payment,
              status: "SETTLEMENT",
              paidAt: new Date(),
            };
          }
        }
      } catch {
        // Fail-soft: jika API iPaymu lambat/error, tetap kembalikan data DB
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: finalStatus,
        totalIdr: order.totalIdr,
        payment: finalPayment,
      },
      status: finalStatus,
      payment: finalPayment,
    });
  } catch (err: any) {
    console.error("[api/orders/:id] Error fetching order status:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
