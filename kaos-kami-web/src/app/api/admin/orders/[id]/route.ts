import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderRefund, OrderStatusEvent, Payment } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { assertTransition, type Role } from "@/lib/orders/machine";

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
    columns: { id: true, status: true, orderNumber: true, notes: true, discountIdr: true, deliveryMethod: true, totalIdr: true },
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
      // Hanya baris IPAYMU dengan transactionId angka yang bisa dicek; legacy
      // DUITKU / ref semu dilewati ke sweep 24 jam.
      if (payRow?.provider !== "IPAYMU" || !/^\d+$/.test(ref)) {
        return NextResponse.json({
          success: true,
          synced: false,
          message: "Baris payment bukan IPAYMU valid — sinkronisasi manual dilewati.",
        });
      }
      const { ipaymuProvider } = await import("@/lib/payments/ipaymu");
      const remote = await ipaymuProvider.checkTransactionStatus(ref);
      const ok = /^(berhasil|success|paid|settle)/i.test(`${remote.status} ${remote.statusDesc}`);
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
        Number(remote.amount) !== order.totalIdr
      ) {
        return NextResponse.json({
          success: false,
          error: `Nominal iPaymu (Rp ${remote.amount}) tidak cocok dengan total pesanan (Rp ${order.totalIdr}).`,
        }, { status: 400 });
      }

        await db
          .update(Payment)
          .set({ status: "SETTLEMENT", paidAt: new Date() })
          .where(eq(Payment.orderId, order.id));

        const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
        await confirmOrderPaid(order.id, {
          paymentCode: "IPAYMU",
          reference: ref,
          via: "admin-manual-sync",
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
    if (!["PENDING_PAYMENT", "PAYMENT_CONFIRMED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Hanya order PENDING/PAYMENT_CONFIRMED yang bisa dibatalkan" },
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
    if (!refundable.includes(order.status)) {
      return NextResponse.json(
        { error: "Refund hanya untuk order yang sudah dibayar & belum selesai" },
        { status: 400 }
      );
    }
    const finalRefundReason = parsed.data.refundReason?.trim() || "Dana dikembalikan via transfer manual/QRIS oleh admin.";
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
    await db.update(Payment).set({ status: "REFUNDED" }).where(eq(Payment.orderId, order.id));
    await db.insert(OrderRefund).values({
      id: nanoid(),
      orderId: order.id,
      amountIdr: order.totalIdr,
      reason: finalRefundReason,
      status: "COMPLETED",
      processedByUserId: actorUserId,
      refundedAt: new Date(),
    });
    await db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: "REFUNDED",
      note: `Dana dikembalikan (Refund): ${finalRefundReason}`,
      actorUserId,
    });
    await restoreOrderCoupon();
  }

  // Aksi Review Desain Workshop (APPROVE / REQUEST_REVISION / REJECT)
  if (parsed.data.reviewAction) {
    const action = parsed.data.reviewAction;
    const noteText = parsed.data.reviewNote?.trim();

    if (action === "APPROVE") {
      const pay = await db.query.Payment.findFirst({
        where: (t, { eq }) => eq(t.orderId, order.id),
        columns: { status: true },
      });
      const isPaid = pay?.status === "SETTLEMENT" || pay?.status === "SUCCESS";
      const nextStatus = isPaid ? "PAYMENT_CONFIRMED" : "PENDING_PAYMENT";

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

  if (status && !(status === "SHIPPED" && trackingNumber !== undefined)) {
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
