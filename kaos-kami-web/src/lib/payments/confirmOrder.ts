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
  opts: { paymentCode?: string; reference?: string; via: string; express?: boolean }
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

  // Prioritas antrean dari tier TERSTRUKTUR (audit: substring "EXPRESS" di
  // notes bisa ditulis pembeli untuk nyerobot tanpa bayar surcharge).
  // Sumber: opts eksplisit > marker server [TIER:EXPRESS_24H] (user tak bisa
  // tulis pola ini — checkout menghapusnya dari notes).
  const isExpress =
    opts.express === true || order.courierNotes?.includes("[TIER:EXPRESS_24H]") === true;
  // Spawn ProductionTask PER DECAL (bukan per item — audit lengan/hood:
  // sebelumnya hanya decal pertama yang masuk produksi, sablon lengan/hood
  // tak terlihat admin). Item katalog tanpa desain = 1 task default.
  for (const item of order.items) {
    const spawnOne = async (opts: {
      side: string;
      widthCm: number;
      heightCm: number;
      offsetCm: number;
      masterUrl: string | null;
      label: string;
    }) => {
      await db.insert(ProductionTask).values({
        id: nanoid(),
        orderId: order.id,
        orderItemId: item.id,
        stage: "DESIGN_PREP",
        priority: isExpress ? 10 : 0,
        notes: `Item: ${item.snapshotName} (${item.snapshotSize}, ${item.snapshotColorName}) — ${opts.label}`,
        printWidthCm: opts.widthCm,
        printHeightCm: opts.heightCm,
        placementSide: opts.side,
        offsetFromCollarCm: opts.offsetCm,
        printFileUrl: opts.masterUrl,
      });
    };

    let spawned = 0;
    try {
      if ((item as any).designId) {
        const design = await db.query.Design.findFirst({
          where: (t, { eq }) => eq(t.id, (item as any).designId),
          columns: { decals: true, categoryId: true, masterAssetUrl: true },
        });
        if (design?.decals) {
          const decals = JSON.parse(design.decals as unknown as string);
          const cat = await db.query.ApparelCategory.findFirst({
            where: (t, { eq }) => eq(t.id, design.categoryId),
            columns: { slug: true },
          });
          const rawMaster = (design as any)?.masterAssetUrl as string | null;
          let masterMap: Record<string, string> = {};
          if (rawMaster) {
            try {
              const parsed = JSON.parse(rawMaster);
              if (typeof parsed === "object" && parsed !== null) masterMap = parsed;
              else if (typeof rawMaster === "string") masterMap = { front: rawMaster };
            } catch {
              masterMap = { front: rawMaster };
            }
          }
          if (Array.isArray(decals)) {
            // Cap 10 decal/item (selaras validasi checkout).
            for (const d of decals.slice(0, 10)) {
              const side = typeof d?.targetSide === "string" ? d.targetSide : "front";
              let widthCm = 28.5;
              let heightCm = 16.0;
              let offsetCm = 7.5;
              try {
                const pw = Number((d as any)?.printPx?.w);
                const ph = Number((d as any)?.printPx?.h);
                const aspect = pw > 0 && ph > 0 ? pw / ph : 1.0;
                const dims = computePhysicalPrintDimensions(
                  cat?.slug || "tshirt",
                  d?.scale ?? 0.11,
                  d?.y ?? -0.05,
                  aspect,
                  side as any
                );
                widthCm = dims.widthCm;
                heightCm = dims.heightCm;
                offsetCm = dims.offsetFromCollarCm;
              } catch (e) {
                console.warn("Failed to compute dims for decal, using default", e);
              }
              await spawnOne({
                side,
                widthCm,
                heightCm,
                offsetCm,
                // TANPA fallback front (audit: artwork dada pernah ke-press di hood).
                masterUrl: masterMap[side] || null,
                label: `${side} — ${d?.name || "sablon"}`,
              });
              spawned++;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to spawn decal tasks, fallback single", e);
    }
    if (spawned === 0) {
      // Fallback lama: 1 task default (item katalog / desain tanpa decal).
      await spawnOne({
        side: "front",
        widthCm: 28.5,
        heightCm: 16.0,
        offsetCm: 7.5,
        masterUrl: null,
        label: "default",
      });
    }
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
