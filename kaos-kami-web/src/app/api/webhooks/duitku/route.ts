import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    // 2. Find order by orderNumber
    const order = await prisma.order.findUnique({
      where: { orderNumber: merchantOrderId },
      include: { items: true, user: true, payment: true },
    });

    if (!order) {
      console.warn("Duitku Webhook: Order not found", merchantOrderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Check resultCode ("00" = SUCCESS)
    const isPaymentSuccess = resultCode === "00";

    // 4. Idempotency Check: if payment is already SETTLEMENT, return OK immediately
    if (order.payment?.status === "SETTLEMENT" && isPaymentSuccess) {
      return new Response("SUCCESS", { status: 200 });
    }

    // 5. Update Payment Record
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: isPaymentSuccess ? "SETTLEMENT" : "FAILED",
        method: paymentCode || "DUITKU",
        paidAt: isPaymentSuccess ? new Date() : undefined,
        rawWebhookPayload: JSON.stringify(payload),
      },
    });

    // 6. On Successful Payment: Update Order & Spawn ProductionTasks
    if (isPaymentSuccess) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_CONFIRMED",
          statusHistory: {
            create: {
              status: "PAYMENT_CONFIRMED",
              note: `Pembayaran Duitku lunas via ${paymentCode || "Duitku"} (Ref: ${reference || "-"}).`,
            },
          },
        },
      });

      // Spawn ProductionTask for each order item (Calibrated 30.0 cm DTF Sablon)
      for (const item of order.items) {
        let widthCm = 28.5;
        let heightCm = 16.0;
        let placementSide = "front";
        let offsetCm = 7.5;

        try {
          if ((item as any).designId) {
            const design = await prisma.design.findUnique({
              where: { id: (item as any).designId },
              select: { decals: true, categoryId: true },
            });
            if (design?.decals) {
              const decals = JSON.parse(design.decals as unknown as string);
              const first = Array.isArray(decals) && decals.length > 0 ? decals[0] : null;
              if (first) {
                const cat = await prisma.apparelCategory.findUnique({
                  where: { id: design.categoryId },
                  select: { slug: true },
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

        await prisma.productionTask.create({
          data: {
            orderId: order.id,
            orderItemId: item.id,
            stage: "DESIGN_PREP",
            priority: order.courierNotes?.includes("EXPRESS") ? 10 : 0,
            notes: `Item: ${item.snapshotName} (${item.snapshotSize}, ${item.snapshotColorName})`,
            printWidthCm: widthCm,
            printHeightCm: heightCm,
            placementSide,
            offsetFromCollarCm: offsetCm,
          },
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
