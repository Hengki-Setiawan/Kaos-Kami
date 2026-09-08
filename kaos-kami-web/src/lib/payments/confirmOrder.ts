// src/lib/payments/confirmOrder.ts — SATU-SATUNYA jalan pengesahan lunas.
// Dipakai webhook Duitku DAN pengecekan ulang saat bayar-ulang (repay).
// Idempoten via race-guard (hanya PENDING_PAYMENT yang bisa menang) sehingga
// callback ganda / repay + webhook bersamaan TIDAK pernah spawn task 2x.
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Order, OrderStatusEvent, ProductionTask, ProductVariant } from "@/lib/drizzle-schema";
import { computePhysicalPrintDimensions } from "@/lib/scaleCalibration";
import { sendWhatsAppNotification, buildProductionStatusMessage } from "@/lib/notifications/whatsapp";

export type ConfirmResult = "confirmed" | "already" | "not-pending";

export async function confirmOrderPaid(
  orderId: string,
  opts: { paymentCode?: string; reference?: string; via: string }
): Promise<ConfirmResult> {
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    with: { items: true, user: true },
  });
  if (!order) return "not-pending";
  if (order.status !== "PENDING_PAYMENT") return "already";

  const race = await db
    .update(Order)
    .set({ status: "PAYMENT_CONFIRMED" })
    .where(and(eq(Order.id, order.id), eq(Order.status, "PENDING_PAYMENT")));
  // Kalah race (sudah dikonfirmasi proses lain) → berhenti, tanpa efek ganda.
  if ((race.rowsAffected ?? 0) === 0) return "already";

  const { paymentCode, reference, via } = opts;
  await db.insert(OrderStatusEvent).values({
    id: nanoid(),
    orderId: order.id,
    status: "PAYMENT_CONFIRMED",
    note: `Pembayaran Duitku lunas via ${paymentCode || "Duitku"} (Ref: ${reference || "-"}, via ${via}).`,
  });

  // Spawn ProductionTask per item (dimensi terkalibrasi 30cm + master 300DPI).
  for (const item of order.items) {
    let widthCm = 28.5;
    let heightCm = 16.0;
    let placementSide = "front";
    let offsetCm = 7.5;
    let masterUrl: string | null = null;

    try {
      if ((item as any).designId) {
        const design = await db.query.Design.findFirst({
          where: (t, { eq }) => eq(t.id, (item as any).designId),
          columns: { decals: true, categoryId: true, masterAssetUrl: true },
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
        const rawMaster = (design as any)?.masterAssetUrl as string | null;
        if (rawMaster) {
          try {
            const parsed = JSON.parse(rawMaster);
            if (typeof parsed === "object" && parsed !== null) {
              masterUrl = (parsed[placementSide] as string) || (parsed.front as string) || null;
            } else {
              masterUrl = rawMaster;
            }
          } catch {
            masterUrl = rawMaster;
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
      printFileUrl: masterUrl,
    });
  }

  // Kurangi stok varian katalog HANYA bila cukup (anti oversell diam-diam).
  // Bila kurang → biarkan (order sudah lunas!) + peringatkan admin via log.
  for (const item of order.items) {
    const variantId = (item as any).productVariantId as string | null;
    const qty = (item as any).quantity as number;
    if (variantId && qty > 0) {
      const res = await db
        .update(ProductVariant)
        .set({ stockQty: sql`${ProductVariant.stockQty} - ${qty}` })
        .where(and(eq(ProductVariant.id, variantId), sql`${ProductVariant.stockQty} >= ${qty}`))
        .catch((e) => {
          console.warn("Stok decrement gagal:", variantId, e?.message);
          return null;
        });
      if (res && (res.rowsAffected ?? 0) === 0) {
        console.warn(`OVERSELL: stok ${variantId} kurang untuk qty ${qty} (order ${order.orderNumber}) — cek manual!`);
      }
    }
  }

  // Notify customer via WhatsApp (fail-safe).
  const invoiceUrl = `${siteUrl()}/orders/${order.id}`;
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
    ).catch((err) => console.warn("Confirm WA notify error:", err));
  }
  return "confirmed";
}
