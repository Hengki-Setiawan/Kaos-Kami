import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderItem, OrderRefund, OrderStatusEvent, Payment, ProductVariant } from "@/lib/drizzle-schema";
import { hasOversellFlag, parseStockMarker } from "@/lib/orders/stockMarker";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { assertTransition, type Role } from "@/lib/orders/machine";
import { isIpaymuSuccessStatus } from "@/lib/payments/webhookState";

// Resi Indonesia: alfanumerik + beberapa tanda, 5–64 karakter.
// (disalin persis dari OrderAdminActions client agar validasi server == client)
const RESI_RE = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{3,62}[A-Za-z0-9]$/;

const PatchSchema = z.object({
  trackingNumber: z.string().max(64).nullable().optional(),
  cancel: z.boolean().optional(),
  cancelReason: z.string().max(500).optional(),
  // Tandai refund: dana dikembalikan manual via dashboard provider / transfer
  refund: z.boolean().optional(),
  refundReason: z.string().max(500).optional(),
  // Aksi Review Desain Workshop (APPROVE, REQUEST_REVISION, REJECT)
  reviewAction: z.enum(["APPROVE", "REQUEST_REVISION", "REJECT"]).optional(),
  reviewNote: z.string().max(1000).optional(),
  status: z
    .enum([
      "DESIGN_REVIEW",
      "PENDING_PAYMENT",
      "PAYMENT_CONFIRMED",
      "IN_PRODUCTION_QUEUE",
      "PRINTING",
      "QUALITY_CHECK",
      "READY_TO_SHIP",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
  syncPayment: z.boolean().optional(),
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
    if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF", "COURIER"].includes(role)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { role: role as Role, userId: session.user.id as string };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

/**
 * PATCH /api/admin/orders/:id — aksi workshop: isi nomor resi / batalkan order.
 * Batal hanya untuk status awal (PENDING_PAYMENT/PAYMENT_CONFIRMED) — order yang
 * sudah masuk produksi tidak bisa dibatalkan dari sini (hubungi supervisor).
 *
 * Integritas: SATU aksi per permintaan. Perubahan `status` generik wajib lewat
 * mesin transisi + update optimistis where(status = old) → 409 bila balapan.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireWorkshop(req);
  if (gate.error) return gate.error;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  const { trackingNumber, cancel, refund, status, syncPayment } = parsed.data;

  // Otorisasi per aksi (bukan sekadar lolos gerbang workshop):
  // - cancel/refund = dampak finansial (status final CANCELLED/REFUNDED +
  //   restore kuota kupon + catatan refund manual via dashboard iPaymu) → HANYA
  //   ADMIN/SUPER_ADMIN. PRODUCTION_STAFF tak boleh membatalkan uang pelanggan.
  // - trackingNumber/resi = operasional harian kirim paket → boleh
  //   PRODUCTION_STAFF (tanpa dampak finansial).
  const actorRole = (gate as { role?: Role }).role as Role;
  const actorUserId = (gate as { userId?: string }).userId;
  const isAdmin = actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";
  if ((cancel || refund) && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: cancel/refund khusus ADMIN" }, { status: 403 });
  }
  // Sinkronisasi pembayaran bisa menulis Payment SETTLEMENT (uang masuk) —
  // jangan izinkan staf produksi/kurir memicunya.
  if (syncPayment && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: sinkronisasi pembayaran khusus ADMIN" }, { status: 403 });
  }

  // Tolak multi-aksi per permintaan: cegah status + cancel/refund tercampur
  // dalam satu request (hasil akhir tak tentu + riwayat ganda).
  // Catatan: status === "SHIPPED" + trackingNumber diizinkan bersama sebagai 1 aksi dispatch pengiriman.
  const isShipWithTracking = status === "SHIPPED" && trackingNumber !== undefined;
  const actionCount =
    (cancel === true ? 1 : 0) +
    (refund === true ? 1 : 0) +
    (status !== undefined ? 1 : 0) +
    (syncPayment === true ? 1 : 0) +
    (parsed.data.reviewAction !== undefined ? 1 : 0) +
    (trackingNumber !== undefined ? 1 : 0) -
    (isShipWithTracking ? 1 : 0);
  if (actionCount === 0) {
    return NextResponse.json({ error: "Tidak ada aksi yang diminta" }, { status: 400 });
  }
  if (actionCount > 1) {
    return NextResponse.json(
      { error: "Satu aksi per permintaan: kirim cancel, refund, status, reviewAction, syncPayment, atau resi secara terpisah." },
      { status: 400 }
    );
  }

  const { id: orderId } = await params;
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, orderId),
    columns: {
      id: true,
      status: true,
      orderNumber: true,
      notes: true,
      discountIdr: true,
      deliveryMethod: true,
      totalIdr: true,
      courierNotes: true,
      reviewNote: true,
      reviewedBy: true,
      reviewedAt: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  // Sinkronisasi status pembayaran langsung dari gateway iPaymu (server-to-server).
  // Cek via transactionId iPaymu.
  if (syncPayment) {
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({
        success: true,
        synced: false,
        message: `Order berstatus ${order.status}, tidak perlu disinkronkan.`,
      });
    }

    try {
      const payRow = await db.query.Payment.findFirst({
        where: (t, { eq }) => eq(t.orderId, order.id),
        columns: { provider: true, providerRef: true },
      });
      const ref = payRow?.providerRef || "";
      // Hanya baris IPAYMU dengan transactionId angka yang bisa dicek;
      // ref semu dilewati ke sweep 24 jam.
      if (payRow?.provider !== "IPAYMU" || !/^\d+$/.test(ref)) {
        return NextResponse.json({
          success: true,
          synced: false,
          message: "Baris payment bukan IPAYMU valid — sinkronisasi manual dilewati.",
        });
      }
      const { ipaymuProvider } = await import("@/lib/payments/ipaymu");
      const remote = await ipaymuProvider.checkTransactionStatus(ref);
      const ok = isIpaymuSuccessStatus({
        status: remote.status,
        statusDesc: remote.statusDesc,
        paidStatus: remote.paidStatus,
      });
      if (!ok) {
        return NextResponse.json({
          success: true,
          synced: false,
          message: `Status remote iPaymu: ${remote.status} ${remote.statusDesc}`.trim(),
        });
      }
      if (
        remote.amount !== undefined &&
        remote.amount !== null &&
        String(remote.amount) !== "" &&
        Math.abs(Number(remote.amount) - order.totalIdr) > 1
      ) {
        return NextResponse.json({
          success: false,
          error: `Nominal iPaymu (Rp ${remote.amount}) tidak cocok dengan total pesanan (Rp ${order.totalIdr}).`,
        }, { status: 400 });
      }

        // Konfirmasi order DULU; Payment SETTLEMENT hanya setelah batch
        // task/stok sukses. Kalau gagal, baris Payment tetap PENDING dan admin
        // bisa menekan sync lagi tanpa order nyangkut setengah jadi.
        const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
        const { settlePaymentAfterConfirm } = await import("@/lib/payments/settlement");
        const confirmResult = await confirmOrderPaid(order.id, {
          paymentCode: "IPAYMU",
          reference: ref,
          via: "admin-manual-sync",
        });
        if (confirmResult === "not-pending" || confirmResult === "processing") {
          return NextResponse.json(
            { success: false, error: "Status order berubah/sedang diproses saat sinkronisasi. Muat ulang lalu coba lagi." },
            { status: 409 }
          );
        }
        await settlePaymentAfterConfirm({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountIdr: order.totalIdr,
          provider: payRow.provider,
          providerRef: ref,
          rawWebhookPayload: JSON.stringify({ via: "admin-manual-sync", remote }),
        });

        return NextResponse.json({
          success: true,
          synced: true,
          status: "PAYMENT_CONFIRMED",
          message: "Pembayaran terverifikasi lunas di iPaymu! Status pesanan kini PAYMENT_CONFIRMED.",
        });
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: `Gagal menghubungi iPaymu: ${e?.message || "error tidak diketahui"}`,
      }, { status: 502 });
    }
  }

  // Kembalikan kuota kupon bila order tercatat memakainya. Dipanggil sekali
  // bila cancel dan/atau refund berhasil (best-effort, tak menggagalkan aksi).
  let couponRestored = false;
  const restoreOrderCoupon = async () => {
    if (couponRestored) return;
    couponRestored = true;
    try {
      const { restoreCoupon, getOrderCouponCode } = await import("@/lib/coupons");
      const code = getOrderCouponCode(order);
      if (code) await restoreCoupon(code);
    } catch (e: any) {
      console.warn("Admin restore kupon gagal:", order.id, e?.message);
    }
  };

  if (trackingNumber !== undefined) {
    // I4: resi prematur ditolak — belum lunas (PENDING) tak butuh resi, dan
    // order PICKUP tak memakai resi ekspedisi sama sekali.
    if (order.status === "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Order belum lunas — resi hanya bisa diisi setelah pembayaran." },
        { status: 400 }
      );
    }
    if (order.deliveryMethod === "PICKUP") {
      return NextResponse.json(
        { error: "Order PICKUP diambil di workshop — tidak memakai nomor resi." },
        { status: 400 }
      );
    }
    // Validasi server-side, cermin dari client: resi kosong/terlalu pendek /
    // format salah → 400 (fail-closed, tak ada resi setengah jadi tersimpan).
    const v = typeof trackingNumber === "string" ? trackingNumber.trim() : trackingNumber;
    if (typeof v !== "string" || !v || !RESI_RE.test(v)) {
      return NextResponse.json(
        { error: "Nomor resi tidak valid (5–64 karakter alfanumerik)." },
        { status: 400 }
      );
    }
    const updateObj: Record<string, any> = { trackingNumber: v };
    let finalStatus = order.status;
    if (status === "SHIPPED") {
      try {
        assertTransition(actorRole, order.status, "SHIPPED");
        updateObj.status = "SHIPPED";
        finalStatus = "SHIPPED";
      } catch (e: any) {
        return NextResponse.json(
          { error: e?.message || "Transisi status ke SHIPPED tidak diizinkan" },
          { status: 400 }
        );
      }
    }
    const race = await db
      .update(Order)
      .set(updateObj)
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: finalStatus,
      note: status === "SHIPPED"
        ? `Nomor resi ${v} diinput dan paket dikirim ke ekspedisi oleh tim workshop (${actorRole}).`
        : `Nomor resi diisi/diubah menjadi ${v} oleh tim workshop (${actorRole}).`,
      actorUserId,
    });
  }
  if (cancel) {
    // Order yang sudah dibayar WAJIB lewat refund (mengembalikan stok +
    // menandai Payment REFUNDED). Cancel hanya untuk yang belum dibayar.
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        {
          error:
            "Cancel hanya untuk order PENDING_PAYMENT. Order yang sudah dibayar harus lewat aksi refund.",
        },
        { status: 400 }
      );
    }
    const cancelPay = await db.query.Payment.findFirst({
      where: (t, { eq }) => eq(t.orderId, order.id),
      columns: { status: true },
    });
    if (cancelPay?.status === "SETTLEMENT") {
      return NextResponse.json(
        {
          error:
            "Payment sudah SETTLEMENT. Jalankan sinkronisasi pembayaran dulu agar task/stok terbentuk, lalu refund — jangan cancel.",
        },
        { status: 400 }
      );
    }
    const finalCancelReason = parsed.data.cancelReason?.trim() || "Dibatalkan oleh workshop via admin.";
    const race = await db
      .update(Order)
      .set({ 
        status: "CANCELLED",
        reviewNote: finalCancelReason,
        reviewedBy: actorUserId,
        reviewedAt: new Date(),
      })
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "CANCELLED",
      note: `Dibatalkan oleh workshop: ${finalCancelReason}`,
      actorUserId,
    });
    await restoreOrderCoupon();
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
    // Late payment: uang masuk SETELAH order dibatalkan/ditolak. Webhook
    // membuat OrderRefund PENDING bertanda LATE_PAYMENT. Refund ini wajib
    // bisa diselesaikan admin, tetapi stok TIDAK boleh di-restore karena
    // order ini tidak pernah memotong stok.
    const [pay, lateRefund] = await Promise.all([
      db.query.Payment.findFirst({
        where: (t, { eq }) => eq(t.orderId, order.id),
        columns: { status: true, providerRef: true },
      }),
      db.query.OrderRefund.findFirst({
        where: (t, { and, eq, like }) =>
          and(
            eq(t.orderId, order.id),
            eq(t.status, "PENDING"),
            like(t.reason, "LATE_PAYMENT%")
          ),
        columns: { id: true, reason: true },
      }),
    ]);
    // Refund hanya untuk uang yang BENAR-BENAR sudah SETTLEMENT. Status order
    // saja tidak cukup: order PAYMENT_CONFIRMED bisa saja Payment-nya PENDING
    // (mis. bypass/sync gagal), dan me-refund-nya akan memulihkan stok tanpa
    // dana masuk.
    if (pay?.status !== "SETTLEMENT") {
      return NextResponse.json(
        {
          error:
            "Refund hanya bisa setelah Payment berstatus SETTLEMENT (dana benar-benar masuk).",
        },
        { status: 400 }
      );
    }
    const isLatePaymentRefund =
      ["CANCELLED", "REJECTED", "DESIGN_REVIEW"].includes(order.status) &&
      Boolean(lateRefund);
    if (!refundable.includes(order.status) && !isLatePaymentRefund) {
      return NextResponse.json(
        { error: "Refund hanya untuk order yang sudah dibayar & belum selesai" },
        { status: 400 }
      );
    }
    const finalRefundReason =
      parsed.data.refundReason?.trim() ||
      lateRefund?.reason ||
      "Dana dikembalikan via transfer manual/QRIS oleh admin.";
    const race = await db
      .update(Order)
      .set({ 
        status: "REFUNDED",
        reviewNote: finalRefundReason,
        reviewedBy: actorUserId,
        reviewedAt: new Date(),
      })
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    // P0.5 C3 (keputusan owner #4): stok varian katalog dikembalikan OTOMATIS
    // saat REFUNDED. Sumber kebenaran = marker [STOCK_OK ...] yang ditulis
    // confirmOrderPaid HANYA untuk varian yang BENAR-BENAR terpotong.
    // Order lama tanpa marker: restore semua varian KECUALI order bertanda
    // [REVIEW:OVERSELL] (decrement-nya memang gagal → jangan tambah stok).
    const refundItems = await db.query.OrderItem.findMany({
      where: (t, { eq }) => eq(t.orderId, order.id),
      columns: { productVariantId: true, quantity: true },
    });
    const refundNotes = order.courierNotes || "";
    const parsedMarker = parseStockMarker(refundNotes);
    const oversellFlag = hasOversellFlag(refundNotes);
    const restoreMap = new Map<string, number>(parsedMarker.map((e) => [e.variantId, e.qty]));
    if (!isLatePaymentRefund && parsedMarker.length === 0 && !oversellFlag) {
      for (const it of refundItems) {
        const variantId = it.productVariantId;
        const qty = Number(it.quantity) || 0;
        if (variantId && qty > 0) {
          restoreMap.set(variantId, (restoreMap.get(variantId) || 0) + qty);
        }
      }
    }
    const restoreNote = isLatePaymentRefund
      ? "Stok TIDAK di-restore: order sudah batal sebelum stok dipotong (late payment)."
      : restoreMap.size > 0
        ? `Stok dikembalikan otomatis: ${[...restoreMap.entries()]
            .map(([variantId, qty]) => `${variantId} +${qty}`)
            .join(", ")}.`
        : oversellFlag
          ? "Stok TIDAK dikembalikan otomatis (order bertanda oversell; triase manual)."
          : "Tidak ada varian katalog yang perlu di-restore.";

    // Satu batch transaksional: Payment REFUNDED + OrderRefund + event +
    // increment stok. Gagal di tengah tidak lagi meninggalkan refund setengah.
    const refundWrites: any[] = [
      db.update(Payment).set({ status: "REFUNDED" }).where(eq(Payment.orderId, order.id)),
      lateRefund
        ? db
            .update(OrderRefund)
            .set({
              status: "COMPLETED",
              processedByUserId: actorUserId,
              refundedAt: new Date(),
            })
            .where(eq(OrderRefund.id, lateRefund.id))
        : db.insert(OrderRefund).values({
            id: nanoid(),
            orderId: order.id,
            amountIdr: order.totalIdr,
            reason: finalRefundReason,
            status: "COMPLETED",
            processedByUserId: actorUserId,
            refundedAt: new Date(),
          }),
      db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "REFUNDED",
        note: `Dana dikembalikan (Refund): ${finalRefundReason}. ${restoreNote}`,
        actorUserId,
      }),
      ...[...restoreMap.entries()].map(([variantId, qty]) =>
        db
          .update(ProductVariant)
          .set({ stockQty: sql`${ProductVariant.stockQty} + ${qty}` })
          .where(eq(ProductVariant.id, variantId))
      ),
    ];
    let refundResults: any[];
    try {
      refundResults = await db.batch(refundWrites as [any, ...any[]]);
    } catch (e: any) {
      // Batch refund gagal total: kembalikan status order agar tidak ada
      // order REFUNDED tanpa Payment REFUNDED / stok kembali.
      await db
        .update(Order)
        .set({
          status: order.status,
          reviewNote: order.reviewNote ?? null,
          reviewedBy: order.reviewedBy ?? null,
          reviewedAt: order.reviewedAt ?? null,
        })
        .where(and(eq(Order.id, order.id), eq(Order.status, "REFUNDED")))
        .catch(() => {});
      console.error("[refund] Batch refund gagal, status order dikembalikan:", e?.message);
      return NextResponse.json(
        { error: "Refund gagal total; tidak ada perubahan stok/payment yang disimpan." },
        { status: 500 }
      );
    }
    const stockBase = refundResults.length - restoreMap.size;
    [...restoreMap.entries()].forEach(([variantId, qty], i) => {
      const res = refundResults[stockBase + i] as any;
      if (!res || (res.rowsAffected ?? 0) === 0) {
        console.warn(`[refund] Varian ${variantId} tidak ditemukan — stok +${qty} GAGAL dipulihkan (order ${order.orderNumber}).`);
      }
    });
    // Kupon order late-payment sudah dikembalikan saat sweep membatalkan
    // order; restore kedua kali akan menggandakan kuota.
    if (!isLatePaymentRefund) await restoreOrderCoupon();
  }

  // Aksi Review Desain Workshop (APPROVE / REQUEST_REVISION / REJECT)
  if (parsed.data.reviewAction) {
    // Kontrak review desain: HANYA ADMIN/SUPER_ADMIN. requireWorkshop juga
    // mengizinkan PRODUCTION_STAFF/COURIER untuk aksi operasional lain.
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      return NextResponse.json(
        { error: "Review desain hanya untuk ADMIN/SUPER_ADMIN." },
        { status: 403 }
      );
    }
    const action = parsed.data.reviewAction;
    const noteText = parsed.data.reviewNote?.trim();

    // DESIGN_REVIEW tidak pernah punya tagihan resmi (charge baru dibuat
    // setelah APPROVE → PENDING_PAYMENT). Payment SETTLEMENT di status ini
    // berarti late payment: jangan lanjutkan desain, selesaikan refund dulu.
    const reviewPay = await db.query.Payment.findFirst({
      where: (t, { eq }) => eq(t.orderId, order.id),
      columns: { status: true },
    });
    if (reviewPay?.status === "SETTLEMENT") {
      return NextResponse.json(
        {
          error:
            "Pembayaran sudah masuk saat order masih DESIGN_REVIEW (late payment). Selesaikan refund PENDING terlebih dahulu; desain tidak boleh dilanjutkan.",
        },
        { status: 400 }
      );
    }
    if (reviewPay?.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Order sudah direfund — aksi review desain tidak berlaku." },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      const nextStatus = "PENDING_PAYMENT";

      const race = await db
        .update(Order)
        .set({
          status: nextStatus,
          reviewNote: noteText || "Desain telah disetujui workshop.",
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
        })
        .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));

      if ((race.rowsAffected ?? 0) === 0) {
        return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
      }

      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: nextStatus,
        note: `Desain disetujui oleh tim workshop (${actorRole}). Status dialihkan ke ${nextStatus}.`,
        actorUserId,
      });

      return NextResponse.json({ success: true, status: nextStatus, message: "Desain berhasil disetujui!" });
    }

    if (action === "REQUEST_REVISION") {
      const reason = noteText || "Mohon periksa dan unggah ulang file desain beresolusi tinggi.";
      const race = await db
        .update(Order)
        .set({
          reviewNote: reason,
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
        })
        .where(eq(Order.id, order.id));

      if ((race.rowsAffected ?? 0) === 0) {
        return NextResponse.json({ error: "Order tidak dapat diperbarui" }, { status: 409 });
      }

      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: order.status,
        note: `[REVISI_DESAIN] ${reason}`,
        actorUserId,
      });

      return NextResponse.json({ success: true, message: "Permintaan revisi berhasil dikirim ke pelanggan." });
    }

    if (action === "REJECT") {
      const reason = noteText || "Desain ditolak oleh workshop (tidak memenuhi standar produksi).";
      const race = await db
        .update(Order)
        .set({
          status: "REJECTED",
          reviewNote: reason,
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
        })
        .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));

      if ((race.rowsAffected ?? 0) === 0) {
        return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
      }

      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: "REJECTED",
        note: `Pesanan ditolak: ${reason}`,
        actorUserId,
      });

      await restoreOrderCoupon();
      return NextResponse.json({ success: true, status: "REJECTED", message: "Pesanan ditolak." });
    }
  }

  // SHIPPED tanpa resi tidak boleh lewat jalur generik (dulu lolos karena
  // kondisi hanya mengarahkan SHIPPED+resi ke blok validasi resi).
  if (status === "SHIPPED" && trackingNumber === undefined) {
    return NextResponse.json(
      { error: "Status SHIPPED wajib disertai nomor resi yang valid." },
      { status: 400 }
    );
  }

  if (status && !(status === "SHIPPED" && trackingNumber !== undefined)) {
    // Status finansial/terminal TIDAK boleh diubah lewat jalur generik:
    // PAYMENT_CONFIRMED wajib lewat webhook/sync (spawn task + stok),
    // CANCELLED wajib lewat aksi cancel (restore kupon + alasan),
    // REJECTED wajib lewat review (alasan penolakan).
    if (order.status === "DESIGN_REVIEW" && status === "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Gunakan aksi review desain (APPROVE) untuk membuka pembayaran." },
        { status: 400 }
      );
    }
    if (["PAYMENT_CONFIRMED", "CANCELLED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        {
          error:
            status === "PAYMENT_CONFIRMED"
              ? "PAYMENT_CONFIRMED tidak boleh di-set manual. Gunakan sinkronisasi pembayaran / bypass admin."
              : status === "CANCELLED"
                ? "Gunakan aksi cancel (bukan status generik) agar kupon & alasan tercatat."
                : "Gunakan aksi review desain (bukan status generik) agar alasan penolakan tercatat.",
        },
        { status: 400 }
      );
    }
    // WAJIB lewat mesin transisi per peran (terminal tak bisa keluar).
    try {
      assertTransition(actorRole, order.status, status);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message || "Transisi status tidak diizinkan" },
        { status: 400 }
      );
    }
    // COMPLETED hanya bila SEMUA task produksi sudah PACKAGING/DONE.
    // (Dulu: task dipaksa DONE otomatis — dihapus karena memalsukan progres.)
    if (status === "COMPLETED") {
      const tasks = await db.query.ProductionTask.findMany({
        where: (t, { eq }) => eq(t.orderId, order.id),
        columns: { id: true, stage: true },
      });
      const open = tasks.filter((t) => t.stage !== "PACKAGING" && t.stage !== "DONE");
      if (open.length > 0) {
        return NextResponse.json(
          {
            error: `Belum bisa COMPLETED: ${open.length} task produksi belum PACKAGING/DONE. Selesaikan di kanban produksi dulu.`,
          },
          { status: 400 }
        );
      }
    }
    // Update optimistis: gagal (0 baris) = status berubah di tengah jalan.
    const race = await db
      .update(Order)
      .set({ status })
      .where(and(eq(Order.id, order.id), eq(Order.status, order.status)));
    if ((race.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: "Status berubah, muat ulang dulu" }, { status: 409 });
    }
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status,
      note: `Status diubah menjadi ${status} oleh tim workshop (${actorRole || "STAFF"}).`,
      actorUserId,
    });
  }
  return NextResponse.json({ success: true });
}
