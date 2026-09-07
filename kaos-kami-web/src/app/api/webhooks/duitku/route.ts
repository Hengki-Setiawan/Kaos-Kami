import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, Payment, ProductionTask } from "@/lib/drizzle-schema";
import { duitkuProvider } from "@/lib/payments/duitku";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { computePhysicalPrintDimensions } from "@/lib/scaleCalibration";

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, any> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      payload = await req.json();
    }

    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature,
      resultCode,
      reference,
      paymentCode,
    } = payload;

    if (!merchantCode || !merchantOrderId || !signature) {
      return NextResponse.json({ error: "Invalid Duitku payload" }, { status: 400 });
    }

    // 1. Verify Duitku Callback Signature
    const isValid = duitkuProvider.verifyCallbackSignature(
      merchantCode,
      amount,
      merchantOrderId,
      signature
    );

    if (!isValid) {
      console.warn("Duitku Webhook: Invalid MD5 signature mismatch", { merchantOrderId, signature });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 1b. Tolak merchantCode asing (anti cross-merchant confusion).
    const myMerchant = (process.env.DUITKU_MERCHANT_CODE || "").trim();
    if (myMerchant && merchantCode !== myMerchant) {
      console.warn("Duitku Webhook: foreign merchantCode", { merchantCode });
      return NextResponse.json({ error: "Unknown merchant" }, { status: 401 });
    }

    // 2. Find order by orderNumber
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.orderNumber, merchantOrderId),
      with: { items: true, user: true, payment: true },
    });

    if (!order) {
      console.warn("Duitku Webhook: Order not found", merchantOrderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Check resultCode ("00" = SUCCESS)
    const isPaymentSuccess = resultCode === "00";

    // 3b. Nominal callback WAJIB sama dengan total order — tolak underpayment.
    if (isPaymentSuccess && amount !== undefined && Number(amount) !== order.totalIdr) {
      console.warn("Duitku Webhook: amount mismatch", { merchantOrderId, amount, total: order.totalIdr });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 4. Idempotency: order yang sudah SETTLEMENT tidak pernah di-downgrade/di-spawn ulang.
    if (order.payment?.status === "SETTLEMENT") {
      return new Response("SUCCESS", { status: 200 });
    }
    // 4b. Reference duplikat (retry Duitku) → ack tanpa tulis ulang.
    if (reference && order.payment?.providerRef === reference && order.payment?.rawWebhookPayload) {
      return new Response("SUCCESS", { status: 200 });
    }

    // 5. Update Payment Record
    await db
      .update(Payment)
      .set({
        status: isPaymentSuccess ? "SETTLEMENT" : "FAILED",
        method: paymentCode || "DUITKU",
        ...(reference ? { providerRef: reference } : {}),
        ...(isPaymentSuccess ? { paidAt: new Date() } : {}),
        rawWebhookPayload: JSON.stringify(payload),
      })
      .where(eq(Payment.orderId, order.id));

    // 6. On Successful Payment: Update Order & Spawn ProductionTasks
    if (isPaymentSuccess) {
      const race = await db
        .update(Order)
        .set({ status: "PAYMENT_CONFIRMED" })
        .where(and(eq(Order.id, order.id), eq(Order.status, "PENDING_PAYMENT")));
      // Hanya pemenang race yang lanjut (spawn task + WA sekali).
      if ((race.rowsAffected ?? 0) === 0) {
        return new Response("SUCCESS", { status: 200 });
      }
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "PAYMENT_CONFIRMED",
        note: `Pembayaran Duitku lunas via ${paymentCode || "Duitku"} (Ref: ${reference || "-"}).`,
      });

      // Spawn ProductionTask for each order item (Calibrated 30.0 cm DTF Sablon)
      for (const item of order.items) {
        let widthCm = 28.5;
        let heightCm = 16.0;
        let placementSide = "front";
        let offsetCm = 7.5;

        try {
          if ((item as any).designId) {
            const design = await db.query.Design.findFirst({
              where: (t, { eq }) => eq(t.id, (item as any).designId),
              columns: { decals: true, categoryId: true },
            });
            if (design?.decals) {
              const decals = JSON.parse(design.decals as unknown as string);
              const first = Array.isArray(decals) && decals.length > 0 ? decals[0] : null;
              if (first) {
                const cat = await db.query.ApparelCategory.findFirst({
                  where: (t, { eq }) => eq(t.id, design.categoryId),
                  columns: { slug: true },
                });
                const dims = computePhysicalPrintDimensions(
                  cat?.slug || "tshirt",
                  first.scale ?? 0.52,
                  first.y ?? -0.05,
                  1.0
                );
                widthCm = dims.widthCm;
                heightCm = dims.heightCm;
                offsetCm = dims.offsetFromCollarCm;
                placementSide = first.targetSide || "front";
              }
            }
          }
        } catch (e) {
          console.warn("Failed to compute dims for task, using default", e);
        }

        await db.insert(ProductionTask).values({
          id: nanoid(),
          orderId: order.id,
          orderItemId: item.id,
          stage: "DESIGN_PREP",
          priority: order.courierNotes?.includes("EXPRESS") ? 10 : 0,
          notes: `Item: ${item.snapshotName} (${item.snapshotSize}, ${item.snapshotColorName})`,
          printWidthCm: widthCm,
          printHeightCm: heightCm,
          placementSide,
          offsetFromCollarCm: offsetCm,
        });
      }

      // Notify customer via WhatsApp
      const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`;
      if (order.user?.phoneNumber) {
        sendWhatsAppNotification(
          order.user.phoneNumber,
          buildProductionStatusMessage({
            orderNumber: order.orderNumber,
            recipientName: order.user.name || "Pelanggan",
            stageName: "Pembayaran Dikonfirmasi — Antrean Sablon DTF",
            note: "Pesanan Anda telah lunas via Duitku dan masuk antrean workshop produksi sablon Kaos Kami.",
            invoiceUrl,
          })
        ).catch((err) => console.warn("Duitku Webhook WA notify error:", err));
      }
    }

    return new Response("SUCCESS", { status: 200 });
  } catch (error: any) {
    console.error("Duitku Webhook Exception:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
