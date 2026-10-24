// src/lib/payments/confirmOrder.ts — SATU-SATUNYA jalan pengesahan lunas.
// Dipakai webhook gateway (iPaymu) DAN pengecekan ulang saat bayar-ulang (repay).
// Idempoten via race-guard (hanya PENDING_PAYMENT yang bisa menang) sehingga
// callback ganda / repay + webhook bersamaan TIDAK pernah spawn task 2x.
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, ProductionTask, ProductVariant } from "@/lib/drizzle-schema";
import { formatStockMarker } from "@/lib/orders/stockMarker";
import { computePhysicalPrintDimensions } from "@/lib/scaleCalibration";
import { isPaidOrFulfilledStatus } from "@/lib/payments/webhookState";
import { withBusyRetry } from "@/lib/dbRetry";
// Kebijakan Fonnte owner 20 Sep 2026: HANYA OTP — import WA dihapus (oversell via kanban).

export type ConfirmResult = "confirmed" | "already" | "processing" | "not-pending";

/**
 * "processing" = order PAYMENT_CONFIRMED tetapi event batch belum ada.
 * Ini adalah jendela antara race-guard dan commit batch; pemanggil WAJIB
 * menunggu/retry, bukan menulis Payment SETTLEMENT.
 */
async function hasConfirmedEvent(orderId: string): Promise<boolean> {
  const event = await db.query.OrderStatusEvent.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.orderId, orderId), eq(t.status, "PAYMENT_CONFIRMED")),
    columns: { id: true },
  });
  return Boolean(event);
}

async function classifyExistingOrder(orderId: string): Promise<ConfirmResult> {
  const fresh = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    columns: { status: true },
  });
  if (!fresh) return "not-pending";
  if (!isPaidOrFulfilledStatus(fresh.status)) return "not-pending";
  if (fresh.status === "PAYMENT_CONFIRMED" && !(await hasConfirmedEvent(orderId))) {
    return "processing";
  }
  return "already";
}

export async function confirmOrderPaid(
  orderId: string,
  opts: { paymentCode?: string; reference?: string; via: string; express?: boolean }
): Promise<ConfirmResult> {
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    with: { items: true, user: true },
  });
  if (!order) return "not-pending";
  if (order.status !== "PENDING_PAYMENT") return classifyExistingOrder(orderId);

  const race = await withBusyRetry(() =>
    db
      .update(Order)
      .set({ status: "PAYMENT_CONFIRMED" })
      .where(and(eq(Order.id, order.id), eq(Order.status, "PENDING_PAYMENT")))
  );
  // Kalah race (sudah dikonfirmasi proses lain) → berhenti, tanpa efek ganda.
  // Kalau status berubah ke CANCELLED/REJECTED, hasilnya "not-pending" agar
  // pemanggil menangani refund, bukan menulis settlement.
  if ((race.rowsAffected ?? 0) === 0) return classifyExistingOrder(orderId);

  const { paymentCode, reference, via } = opts;
  // P0.5 B6: event PAYMENT_CONFIRMED TIDAK ditulis di sini — dimasukkan ke
  // SATU `db.batch()` bersama task produksi + update stok di bawah, supaya
  // order lunas tak pernah setengah jadi bila salah satu tulisan gagal.

  // Prioritas antrean dari tier TERSTRUKTUR (audit: substring "EXPRESS" di
  // notes bisa ditulis pembeli untuk nyerobot tanpa bayar surcharge).
  // Sumber: opts eksplisit > marker server [TIER:EXPRESS_24H] (user tak bisa
  // tulis pola ini — checkout menghapusnya dari notes).
  const isExpress =
    opts.express === true || order.courierNotes?.includes("[TIER:EXPRESS_24H]") === true;
  // Spawn ProductionTask PER DECAL (bukan per item — audit lengan/hood:
  // sebelumnya hanya decal pertama yang masuk produksi, sablon lengan/hood
  // tak terlihat admin). Item katalog tanpa desain = 1 task default.
  let totalTasksSpawned = 0;
  // Kumpulkan baris task dulu (murni in-memory); INSERT-nya dijalankan sekali
  // dalam batch transaksional setelah loop — bukan N insert beruntun.
  const taskRows: Array<typeof ProductionTask.$inferInsert> = [];
  for (const item of order.items) {
    const spawnOne = (opts: {
      side: string;
      widthCm: number;
      heightCm: number;
      offsetCm: number;
      masterUrl: string | null;
      label: string;
    }) => {
      taskRows.push({
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
          // K2: masterMap nilai bisa string https ATAU {url,at} (arsip panel
          // jalur per-panel) — normalisasi via pickMasterVal di bawah.
          let masterMap: Record<string, unknown> = {};
          if (rawMaster) {
            try {
              const parsed = JSON.parse(rawMaster);
              if (typeof parsed === "object" && parsed !== null) masterMap = parsed;
              else if (typeof rawMaster === "string") masterMap = { front: rawMaster };
            } catch {
              masterMap = { front: rawMaster };
            }
          }
          const pickMasterVal = (v: unknown): string | null => {
            if (typeof v === "string" && v.length > 0) return v;
            if (v && typeof v === "object" && typeof (v as any).url === "string" && (v as any).url.length > 0) {
              return (v as any).url;
            }
            return null;
          };
          const isHttps = (u: string | null): u is string => !!u && /^https?:\/\//.test(u);
          if (Array.isArray(decals)) {
            // Cap 10 decal/item (selaras validasi checkout).
            for (const d of decals.slice(0, 10)) {
              const side = typeof d?.targetSide === "string" ? d.targetSide : "front";
              const decalId = typeof (d as any)?.id === "string" ? (d as any).id : null;
              const previewUrl = typeof (d as any)?.url === "string" ? (d as any).url : null;
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
              // K2 fallback: decal:<id> → side → preview (jangan null diam-diam
              // bila ada kandidat). TANPA fallback front→hood silang (audit:
              // artwork dada pernah ke-press di hood) — hanya side yang sama.
              // Prefer https dulu, lalu kandidat apa pun (termasuk base64
              // preview) daripada null.
              const byDecal = decalId ? pickMasterVal(masterMap[`decal:${decalId}`]) : null;
              const bySide = pickMasterVal(masterMap[side]);
              const masterUrl =
                (isHttps(byDecal) ? byDecal : null) ||
                (isHttps(bySide) ? bySide : null) ||
                (isHttps(previewUrl) ? previewUrl : null) ||
                byDecal ||
                bySide ||
                previewUrl ||
                null;
              spawnOne({
                side,
                widthCm,
                heightCm,
                offsetCm,
                masterUrl,
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
    const isReadyMadeCatalog = Boolean((item as any).productVariantId && !(item as any).designId);
    if (spawned === 0 && !isReadyMadeCatalog) {
      // Fallback lama: 1 task default (item katalog / desain tanpa decal).
      spawnOne({
        side: "front",
        widthCm: 28.5,
        heightCm: 16.0,
        offsetCm: 7.5,
        masterUrl: null,
        label: "default",
      });
      spawned++;
    }
    totalTasksSpawned += spawned;
  }

  // Jalur Cepat E-Commerce: Jika semua item produk jadi tanpa sablon kustom (totalTasksSpawned === 0),
  // pesanan bypass Kanban Workshop dan langsung siap kemas / jemput kurir (READY_TO_SHIP).
  //
  // P0.5 B6 (audit 06-DATA-LAYER C2): SELURUH tulisan pasca-race dijalankan
  // dalam SATU `db.batch()` — libsql mengeksekusinya sebagai satu transaksi.
  // Sebelumnya event + N task + N update stok beruntun: gagal di tengah
  // meninggalkan order lunas tanpa tiket / stok terpotong separuh.
  const batchQueries: any[] = [
    db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "PAYMENT_CONFIRMED",
      note: `Pembayaran iPaymu lunas via ${paymentCode || "iPaymu"} (Ref: ${reference || "-"}, via ${via}).`,
    }),
  ];
  if (taskRows.length > 0) {
    batchQueries.push(db.insert(ProductionTask).values(taskRows));
  }
  if (totalTasksSpawned === 0 && order.items.length > 0) {
    batchQueries.push(
      db.update(Order).set({ status: "READY_TO_SHIP" }).where(eq(Order.id, order.id))
    );
    batchQueries.push(
      db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "READY_TO_SHIP",
        note: "Pesanan Produk Jadi E-Commerce: Jalur cepat langsung Siap Kemas dan Kirim (tanpa antrean sablon DTF).",
      })
    );
  }

  // Kurangi stok varian katalog HANYA bila cukup (anti oversell diam-diam).
  // Update bersyarat ikut batch; rowsAffected per-statement dibaca sesudah
  // commit untuk mendeteksi oversell TANPA menggagalkan transaksi.
  const stockDecrements: Array<{ variantId: string; qty: number; name: string }> = [];
  for (const item of order.items) {
    const variantId = (item as any).productVariantId as string | null;
    const qty = (item as any).quantity as number;
    if (variantId && qty > 0) {
      stockDecrements.push({ variantId, qty, name: (item as any).snapshotName || variantId });
      batchQueries.push(
        db
          .update(ProductVariant)
          .set({ stockQty: sql`${ProductVariant.stockQty} - ${qty}` })
          .where(and(eq(ProductVariant.id, variantId), sql`${ProductVariant.stockQty} >= ${qty}`))
      );
    }
  }

  let batchResults: any[];
  try {
    batchResults = await withBusyRetry(() => db.batch(batchQueries as [any, ...any[]]));
  } catch (e: any) {
    // Batch atomik gagal total: kembalikan kunci status agar webhook/repay
    // bisa mengulang (tanpa ini order "PAYMENT_CONFIRMED" tanpa task/stok).
    await withBusyRetry(() =>
      db
        .update(Order)
        .set({ status: "PENDING_PAYMENT" })
        .where(and(eq(Order.id, order.id), eq(Order.status, "PAYMENT_CONFIRMED")))
    ).catch(() => {});
    throw e;
  }

  const stockBase = batchResults.length - stockDecrements.length;
  const decremented: Array<{ variantId: string; qty: number }> = [];
  const oversells: Array<{ variantId: string; qty: number; name: string }> = [];
  stockDecrements.forEach((entry, i) => {
    const res = batchResults[stockBase + i] as any;
    if (res && (res.rowsAffected ?? 0) > 0) {
      decremented.push({ variantId: entry.variantId, qty: entry.qty });
    } else {
      console.warn(
        `OVERSELL: stok ${entry.variantId} kurang untuk qty ${entry.qty} (order ${order.orderNumber}) — cek manual!`
      );
      oversells.push(entry);
    }
  });

  // Marker [STOCK_OK] = bukti varian BENAR-BENAR terpotong → satu-satunya
  // dasar auto-restore stok saat REFUNDED (admin/orders/[id]/route.ts).
  let nextNotes = order.courierNotes || "";
  if (decremented.length > 0 && !nextNotes.includes("[STOCK_OK")) {
    const marker = formatStockMarker(decremented);
    if (marker) nextNotes = `${nextNotes} ${marker}`.trim();
  }
  if (oversells.length > 0 && !nextNotes.includes("[REVIEW:OVERSELL")) {
    nextNotes = `${nextNotes} [REVIEW:OVERSELL ${oversells.map((o) => o.variantId).join(",")}]`.trim();
  }

  const followUps: any[] = [];
  if (oversells.length > 0) {
    const detail = oversells.map((o) => `${o.name} (qty ${o.qty})`).join(", ");
    followUps.push(
      db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        // Pakai status existing (tanpa enum baru) + note REVIEW eksplisit.
        status: "PAYMENT_CONFIRMED",
        note: `REVIEW:OVERSELL — stok kurang untuk ${detail}. Order lunas, perlu triase manual (restock/hubungi pelanggan).`,
      })
    );
  }
  if (nextNotes !== (order.courierNotes || "")) {
    followUps.push(
      db.update(Order).set({ courierNotes: nextNotes }).where(eq(Order.id, order.id))
    );
  }
  if (followUps.length > 0) {
    try {
      await db.batch(followUps as [any, ...any[]]);
    } catch (e: any) {
      console.warn("Gagal tulis penanda oversell/stok:", e?.message);
    }
  }
  // KEBIJAKAN FONNTE (owner 20 Sep 2026): Fonnte HANYA untuk OTP.
  // Alert oversell via WA DINONAKTIFKAN — flag [REVIEW:OVERSELL] di
  // courierNotes + OrderStatusEvent tetap jadi sinyal triase di kanban.

  // PENGHEMATAN KUOTA FONNTE: Notifikasi status lunas otomatis via WhatsApp dinonaktifkan.
  // Status lunas langsung ter-update di invoice web, web notification, dan aplikasi Capacitor.
  return "confirmed";
}
