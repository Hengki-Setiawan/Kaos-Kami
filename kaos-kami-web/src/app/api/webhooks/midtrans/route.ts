import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { midtransProvider } from "@/lib/payments/midtrans";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { computePhysicalPrintDimensions } from "@/lib/scaleCalibration";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;

    // 1. Verify Midtrans Webhook Signature
    const isValid = midtransProvider.verifyWebhookSignature(rawBody, headers);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature key" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const parsedEvent = midtransProvider.parseWebhookEvent(payload);

    // 2. Find order by orderNumber (providerRef)
    const order = await prisma.order.findUnique({
      where: { orderNumber: parsedEvent.providerRef },
      include: { items: true, user: true, payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Idempotency Check: if payment is already SETTLEMENT, no-op
    if (order.payment?.status === "SETTLEMENT" && parsedEvent.status === "SETTLEMENT") {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // 4. Update Payment record
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: parsedEvent.status,
        method: parsedEvent.method,
        paidAt: parsedEvent.status === "SETTLEMENT" ? new Date() : undefined,
        rawWebhookPayload: rawBody,
      },
    });

    // 5. On SETTLEMENT: Update Order status to PAYMENT_CONFIRMED and spawn ProductionTasks
    if (parsedEvent.status === "SETTLEMENT") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_CONFIRMED",
          statusHistory: {
            create: {
              status: "PAYMENT_CONFIRMED",
              note: `Pembayaran Midtrans berhasil via ${parsedEvent.method || "Snap"}.`,
            },
          },
        },
      });

      // Spawn ProductionTask for each order item — calibrated 30cm
      for (const item of order.items) {
        // Try to derive real dimensions from linked Design decals if available
        let widthCm = 28.5;
        let heightCm = 16.0;
        let placementSide: string | null = "front";
        let offsetCm: number | null = 7.5;

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
                // category slug needed for calibration — fallback to tshirt
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
            note: "Pesanan telah masuk antrean produksi workshop Kaos Kami.",
            invoiceUrl,
          })
        ).catch((err) => console.warn("Webhook WA notify error:", err));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
