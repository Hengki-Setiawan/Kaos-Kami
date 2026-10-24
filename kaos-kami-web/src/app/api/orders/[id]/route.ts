import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { isIpaymuSuccessStatus } from "@/lib/payments/webhookState";

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
            // Dipakai internal untuk rekonsiliasi; TIDAK dikembalikan ke publik.
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
          const isSuccess = isIpaymuSuccessStatus({
            status: check.status,
            statusDesc: check.statusDesc,
            paidStatus: check.paidStatus,
          });

          // Nominal wajib cocok bila tersedia (paritas webhook/sweep).
          const remoteAmount = check.amount;
          const amountOk =
            remoteAmount === undefined ||
            remoteAmount === null ||
            (Number.isFinite(Number(remoteAmount)) &&
              Math.abs(Number(remoteAmount) - order.totalIdr) <= 1);
          if (isSuccess && amountOk) {
            const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
            const { settlePaymentAfterConfirm } = await import("@/lib/payments/settlement");

            // Konfirmasi order DULU; settlement Payment hanya setelah batch
            // task/stok sukses. Gagal di sini = baris Payment tetap PENDING.
            const confirmResult = await confirmOrderPaid(order.id, {
              paymentCode: "iPaymu QRIS",
              reference: order.payment.providerRef,
              via: "iPaymu Active Status Check",
            });

            if (confirmResult === "confirmed" || confirmResult === "already") {
              await settlePaymentAfterConfirm({
                orderId: order.id,
                orderNumber: order.orderNumber,
                amountIdr: order.totalIdr,
                provider: order.payment.provider,
                providerRef: order.payment.providerRef,
                rawWebhookPayload: JSON.stringify({ via: "iPaymu Active Status Check", check }),
              });

              // Baca ulang dari DB: jangan mengklaim SETTLEMENT bila helper
              // menolak (mis. Payment sudah REFUNDED) atau batch gagal.
              const [freshOrder, freshPayment] = await Promise.all([
                db.query.Order.findFirst({
                  where: (t, { eq }) => eq(t.id, order.id),
                  columns: { status: true },
                }),
                db.query.Payment.findFirst({
                  where: (t, { eq }) => eq(t.orderId, order.id),
                  columns: {
                    status: true,
                    method: true,
                    provider: true,
                    // Internal saja; response publik di bawah tidak memuatnya.
                    providerRef: true,
                    paidAt: true,
                  },
                }),
              ]);
              if (freshOrder) finalStatus = freshOrder.status;
              if (freshPayment) finalPayment = freshPayment;
            }
          }
        }
      } catch {
        // Fail-soft: jika API iPaymu lambat/error, tetap kembalikan data DB
      }
    }

    // Jangan bocorkan providerRef/raw payload ke endpoint publik; polling hanya
    // butuh status/metode/waktu bayar.
    const publicPayment = finalPayment
      ? {
          status: finalPayment.status,
          method: finalPayment.method,
          provider: finalPayment.provider,
          paidAt: finalPayment.paidAt,
        }
      : finalPayment;

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: finalStatus,
        totalIdr: order.totalIdr,
        payment: publicPayment,
      },
      status: finalStatus,
      payment: publicPayment,
    });
  } catch (err: any) {
    console.error("[api/orders/:id] Error fetching order status:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
