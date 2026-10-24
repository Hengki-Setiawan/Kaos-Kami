import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  Design,
  Order,
  OrderStatusEvent,
  Payment,
  ProductionTask,
  Session,
  UserPresence,
  Verification,
} from "@/lib/drizzle-schema";
import { secretsEqual } from "@/lib/timingSafe";
import { safeJsonArray } from "@/lib/json";
import { isIpaymuSuccessStatus, isPaidOrFulfilledStatus } from "@/lib/payments/webhookState";

// Batas kedaluwarsa order tanpa bayar: 24 jam (sama dengan expiry QRIS iPaymu).
const STALE_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;
// Rekonsiliasi: order PENDING umur >30 menit yang punya baris Payment PENDING
// (webhook telat/hilang setelah charge sukses) dicek ke iPaymu.
const RECONCILE_MS = 30 * 60 * 1000;
const RECONCILE_BATCH = 20;
// Jendela antara race-guard PAYMENT_CONFIRMED dan commit batch. Order yang
// lebih tua dari ini tanpa event/task adalah sisa crash/error, bukan proses
// normal yang masih berjalan.
const CONFIRM_RECOVERY_MS = 15 * 60 * 1000;
const CONFIRM_RECOVERY_BATCH = 20;

type ReconcileResult = "confirmed" | "not-paid" | "error";

/**
 * Cek satu baris Payment ke iPaymu. Dipakai sweep SEBELUM membatalkan order
 * basi: order yang sudah dibayar tapi webhook-nya hilang tidak boleh
 * dibatalkan. `error` = jangan ambil keputusan destruktif; ulangi sweep
 * berikutnya.
 */
async function reconcileIpaymuPayment(input: {
  orderId: string;
  orderNumber: string;
  totalIdr: number;
  provider?: string | null;
  providerRef?: string | null;
}): Promise<ReconcileResult> {
  if ((input.provider || "").toUpperCase() !== "IPAYMU") return "not-paid";
  const ref = (input.providerRef || "").trim();
  // Ref semu belum punya transactionId iPaymu → tidak mungkin sudah dibayar.
  if (!ref || !/^\d+$/.test(ref) || /^(pending-|IPAYMU-DEV-|reconciled-)/i.test(ref)) {
    return "not-paid";
  }
  try {
    const { ipaymuProvider } = await import("@/lib/payments/ipaymu");
    if (!ipaymuProvider.isConfigured()) return "error";
    const st = await ipaymuProvider.checkTransactionStatus(ref);
    const success = isIpaymuSuccessStatus({
      status: st.status,
      statusDesc: st.statusDesc,
      paidStatus: st.paidStatus,
    });
    if (!success) return "not-paid";
    // Nominal aneh/underpayment: jangan cancel, jangan confirm. Admin/sweep
    // berikutnya yang menangani.
    if (st.amount !== undefined && st.amount !== null) {
      const remoteAmount = Number(st.amount);
      if (!Number.isFinite(remoteAmount) || Math.abs(remoteAmount - input.totalIdr) > 1) {
        console.warn("Sweep reconcile: nominal mismatch, tunda keputusan", {
          orderNumber: input.orderNumber,
          remoteAmount: st.amount,
          total: input.totalIdr,
        });
        return "error";
      }
    }
    const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
    const result = await confirmOrderPaid(input.orderId, {
      reference: ref,
      via: "sweep-reconcile-ipaymu",
    });
    if (result === "confirmed" || result === "already") {
      const { settlePaymentAfterConfirm } = await import("@/lib/payments/settlement");
      await settlePaymentAfterConfirm({
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        amountIdr: input.totalIdr,
        provider: input.provider || "IPAYMU",
        providerRef: ref,
        rawWebhookPayload: JSON.stringify({ via: "sweep-reconcile-ipaymu", status: st }),
      });
      return "confirmed";
    }
    return "error";
  } catch (e: any) {
    console.warn("Sweep reconcile gagal:", input.orderNumber, e?.message);
    return "error";
  }
}

/**
 * GET /api/cron/sweep — Penyapu order PENDING basi → CANCELLED.
 * Dijadwalkan dari LUAR (mis. cron-job.org tiap jam) dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * Tanpa CRON_SECRET = 503 (tidak fail-open). Kupon order basi DIKEMBALIKAN
 * via restoreCoupon (hanya bila order tercatat memakai kupon itu) & stok tak
 * tersentuh (stok hanya berkurang saat lunas).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (!secretsEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - STALE_MS);
    const stale = await db.query.Order.findMany({
      where: (t, { and, eq, lt }) =>
        and(eq(t.status, "PENDING_PAYMENT"), lt(t.createdAt, cutoff)),
      columns: { id: true, orderNumber: true, totalIdr: true, notes: true, discountIdr: true },
      limit: BATCH,
    });

    let cancelled = 0;
    let reconciled = 0;
    for (const o of stale) {
      // Jangan pernah membatalkan order yang mungkin sudah dibayar. Cek baris
      // Payment dulu; webhook yang hilang adalah skenario nyata.
      const pay = await db.query.Payment.findFirst({
        where: (t, { eq }) => eq(t.orderId, o.id),
        columns: { status: true, provider: true, providerRef: true },
      });
      if (pay?.status === "SETTLEMENT") {
        console.warn("Sweep: order basi tapi Payment SETTLEMENT — TIDAK dibatalkan", o.orderNumber);
        continue;
      }
      if (pay?.status === "REFUNDED") {
        console.warn("Sweep: order basi dengan Payment REFUNDED — TIDAK dibatalkan", o.orderNumber);
        continue;
      }
      if (pay?.status === "PENDING") {
        const rec = await reconcileIpaymuPayment({
          orderId: o.id,
          orderNumber: o.orderNumber,
          totalIdr: o.totalIdr,
          provider: pay.provider,
          providerRef: pay.providerRef,
        });
        if (rec === "confirmed") {
          reconciled++;
          continue;
        }
        if (rec === "error") {
          // Status tidak pasti (API down / nominal aneh). Tunda pembatalan.
          continue;
        }
      }

      const race = await db
        .update(Order)
        .set({ status: "CANCELLED" })
        .where(and(eq(Order.id, o.id), eq(Order.status, "PENDING_PAYMENT")));
      if ((race.rowsAffected ?? 0) === 0) continue; // kalah race (sudah lunas) → lewati
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: o.id,
        status: "CANCELLED",
        note: "Otomatis dibatalkan: tidak ada pembayaran 24 jam.",
      });
      // Kembalikan kuota kupon bila order ini tercatat memakainya.
      // Best-effort: kegagalan restore tak menggagalkan sweep.
      try {
        const { restoreCoupon, getOrderCouponCode } = await import("@/lib/coupons");
        const code = getOrderCouponCode(o);
        if (code) await restoreCoupon(code);
      } catch (e: any) {
        console.warn("Sweep restore kupon gagal:", o.id, e?.message);
      }
      cancelled++;
    }

    // Fase rekonsiliasi order umur 30 menit–24 jam (order >24 jam sudah dicek
    // di loop pembatalan di atas): baris Payment PENDING dicek server-to-server
    // ke iPaymu. Sukses → Payment SETTLEMENT + confirmOrderPaid. Gagal/
    // kedaluarsa/masih-proses → dilewati. Batch dibatasi + try/catch per order.
    // Catatan: API iPaymu butuh transactionId angka
    // (ipaymuProvider.checkTransactionStatus, bukan orderNumber seperti
    // provider sebelumnya), jadi yang dicek adalah baris Payment PENDING via
    // providerRef. Order yatim TANPA baris Payment tak bisa dicek
    // → dibiarkan, sweep 24 jam yang menangani. Baris provider lama
    // dilewati (gateway nonaktif, respons 410).
    let created = 0;
    try {
      const reconcileCutoff = new Date(Date.now() - RECONCILE_MS);
      const pending = await db
        .select({
          id: Order.id,
          orderNumber: Order.orderNumber,
          totalIdr: Order.totalIdr,
          provider: Payment.provider,
          providerRef: Payment.providerRef,
        })
        .from(Order)
        .innerJoin(Payment, eq(Payment.orderId, Order.id))
        .where(
          and(
            eq(Order.status, "PENDING_PAYMENT"),
            eq(Payment.status, "PENDING"),
            lt(Order.createdAt, reconcileCutoff)
          )
        )
        .limit(RECONCILE_BATCH);
      for (const o of pending) {
        reconciled++;
        const rec = await reconcileIpaymuPayment({
          orderId: o.id,
          orderNumber: o.orderNumber,
          totalIdr: o.totalIdr,
          provider: o.provider,
          providerRef: o.providerRef,
        });
        if (rec === "confirmed") created++;
      }
    } catch (e: any) {
      // Fase best-effort: kegagalan total (mis. iPaymu belum dikonfigurasi)
      // tak boleh menggagalkan hasil sweep existing.
      console.warn("Sweep reconcile phase gagal:", e?.message);
    }
    // Fase 2b: Pemulihan order yang nyangkut di PAYMENT_CONFIRMED tanpa event
    // batch (crash/error antara race-guard dan commit task+stok). Order yang
    // belum punya Payment SETTLEMENT dikembalikan ke PENDING_PAYMENT agar bisa
    // dibayar/di-cancel normal. Yang Payment-nya sudah SETTLEMENT TIDAK
    // direset diam-diam (uang sudah masuk) — ditandai untuk tindakan admin.
    let recoveredConfirm = 0;
    let stuckPaid = 0;
    try {
      const recoveryCutoff = new Date(Date.now() - CONFIRM_RECOVERY_MS);
      const stuckOrders = await db.query.Order.findMany({
        where: (t, { and, eq, lt }) =>
          and(eq(t.status, "PAYMENT_CONFIRMED"), lt(t.updatedAt, recoveryCutoff)),
        columns: { id: true, orderNumber: true },
        limit: CONFIRM_RECOVERY_BATCH,
      });
      for (const o of stuckOrders) {
        const [event, task, pay] = await Promise.all([
          db.query.OrderStatusEvent.findFirst({
            where: (t, { and, eq }) =>
              and(eq(t.orderId, o.id), eq(t.status, "PAYMENT_CONFIRMED")),
            columns: { id: true },
          }),
          db.query.ProductionTask.findFirst({
            where: (t, { eq }) => eq(t.orderId, o.id),
            columns: { id: true },
          }),
          db.query.Payment.findFirst({
            where: (t, { eq }) => eq(t.orderId, o.id),
            columns: { status: true },
          }),
        ]);
        if (event || task) continue;
        if (pay?.status === "SETTLEMENT" || pay?.status === "REFUNDED") {
          stuckPaid++;
          // Jangan hanya log: buat penanda yang terlihat di riwayat order admin.
          // Event ini juga mencegah fase 2b mengulang pemeriksaan yang sama.
          const marker = await db.query.OrderStatusEvent.findFirst({
            where: (t, { and, eq, like }) =>
              and(
                eq(t.orderId, o.id),
                like(t.note, "[REVIEW:STUCK_PAID]%")
              ),
            columns: { id: true },
          });
          if (!marker) {
            await db
              .insert(OrderStatusEvent)
              .values({
                id: nanoid(),
                orderId: o.id,
                status: "PAYMENT_CONFIRMED",
                note: `[REVIEW:STUCK_PAID] Payment ${pay.status} tetapi event/task konfirmasi tidak ada. Jangan reset/cancel otomatis — periksa manual lalu selesaikan atau refund.`,
              })
              .catch((e: any) =>
                console.warn("Sweep stuckPaid marker gagal:", o.orderNumber, e?.message)
              );
          }
          console.warn(
            "Sweep recovery: order PAYMENT_CONFIRMED tanpa event/task tetapi Payment",
            pay.status,
            "— butuh tindakan admin:",
            o.orderNumber
          );
          continue;
        }
        const race = await db
          .update(Order)
          .set({ status: "PENDING_PAYMENT" })
          .where(and(eq(Order.id, o.id), eq(Order.status, "PAYMENT_CONFIRMED")));
        if ((race.rowsAffected ?? 0) === 0) continue;
        await db.insert(OrderStatusEvent).values({
          id: nanoid(),
          orderId: o.id,
          status: "PENDING_PAYMENT",
          note: "[RECOVERY] Dikembalikan ke PENDING_PAYMENT: konfirmasi sebelumnya tidak pernah commit task/stok.",
        });
        recoveredConfirm++;
      }
    } catch (e: any) {
      console.warn("Sweep recovery phase gagal:", e?.message);
    }

    // Fase 2c: order sudah dikonfirmasi (event PAYMENT_CONFIRMED ada) tetapi
    // baris Payment masih PENDING karena settlement gagal setelah batch.
    // Ini kebalikan dari fase 2b: task/stok sudah benar, hanya payment yang
    // tertinggal. Jangan biarkan order lunas selamanya berstatus PENDING.
    let settledOrphan = 0;
    try {
      const orphanRows = await db
        .select({
          orderId: Order.id,
          orderNumber: Order.orderNumber,
          totalIdr: Order.totalIdr,
          status: Order.status,
          provider: Payment.provider,
          providerRef: Payment.providerRef,
        })
        .from(Payment)
        .innerJoin(Order, eq(Order.id, Payment.orderId))
        .where(
          and(
            eq(Payment.status, "PENDING"),
            inArray(Order.status, [
              "PAYMENT_CONFIRMED",
              "IN_PRODUCTION_QUEUE",
              "PRINTING",
              "QUALITY_CHECK",
              "READY_TO_SHIP",
              "SHIPPED",
              "DELIVERED",
              "COMPLETED",
            ])
          )
        )
        .limit(20);
      for (const row of orphanRows) {
        if (!isPaidOrFulfilledStatus(row.status)) continue;
        const event = await db.query.OrderStatusEvent.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.orderId, row.orderId), eq(t.status, "PAYMENT_CONFIRMED")),
          columns: { id: true },
        });
        // PAYMENT_CONFIRMED tanpa event = jendela processing; fase 2b yang
        // menangani. Jangan settlement sebelum event commit.
        if (!event) continue;
        try {
          const { settlePaymentAfterConfirm } = await import("@/lib/payments/settlement");
          await settlePaymentAfterConfirm({
            orderId: row.orderId,
            orderNumber: row.orderNumber,
            amountIdr: row.totalIdr,
            provider: row.provider || "IPAYMU",
            providerRef: row.providerRef || "sweep-orphan-settlement",
            rawWebhookPayload: JSON.stringify({ via: "sweep-orphan-settlement" }),
          });
          settledOrphan++;
        } catch (e: any) {
          console.warn("Sweep orphan settlement gagal:", row.orderNumber, e?.message);
        }
      }
    } catch (e: any) {
      console.warn("Sweep orphan settlement phase gagal:", e?.message);
    }

    // Fase 3: Pembersihan otomatis data sementara non-esensial (Retention Policy)
    // agar database Turso dan memori tidak penuh dengan data kadaluarsa / sampah.
    let cleanedVerification = 0;
    let cleanedSessions = 0;
    let cleanedPresences = 0;
    let cleanedGuestDrafts = 0;
    try {
      // 1. Bersihkan token OTP & Idempotensi kadaluarsa (>24 jam)
      const resVerif = await db
        .delete(Verification)
        .where(lt(Verification.expiresAt, new Date()));
      cleanedVerification = resVerif.rowsAffected ?? 0;

      // 2. Bersihkan sesi login kadaluarsa
      const resSess = await db
        .delete(Session)
        .where(lt(Session.expiresAt, new Date()));
      cleanedSessions = resSess.rowsAffected ?? 0;

      // 3. Bersihkan presensi chat user yang tidak aktif (>7 hari)
      const presenceCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const resPres = await db
        .delete(UserPresence)
        .where(lt(UserPresence.lastSeenAt, presenceCutoff));
      cleanedPresences = resPres.rowsAffected ?? 0;

      // 4. Bersihkan draft 3D studio tamu tanpa akun yang telantar >14 hari (DB + file R2)
      const guestDraftCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const staleDrafts = await db.query.Design.findMany({
        where: (t, { and, isNull, eq, lt }) =>
          and(
            isNull(t.userId),
            eq(t.status, "DRAFT"),
            lt(t.createdAt, guestDraftCutoff)
          ),
        limit: 50,
      });

      if (staleDrafts.length > 0) {
        const { deleteFromR2 } = await import("@/lib/r2");
        for (const draft of staleDrafts) {
          // Bersihkan decals jika ada r2Key
          try {
            const decals = safeJsonArray(draft.decals);
            for (const d of decals) {
              const r2Key = (d as any)?.r2Key || (typeof (d as any)?.url === "string" && (d as any).url.includes(".r2.dev/") ? (d as any).url.split(".r2.dev/")[1] : null);
              if (r2Key) await deleteFromR2(r2Key).catch(() => null);
            }
          } catch {}
          // Bersihkan preview front/back/master jika tersimpan di R2
          for (const u of [draft.previewImageFrontUrl, draft.previewImageBackUrl, draft.masterAssetUrl]) {
            if (typeof u === "string" && u.includes(".r2.dev/")) {
              const key = u.split(".r2.dev/")[1];
              if (key) await deleteFromR2(key).catch(() => null);
            }
          }
        }

        const resDraft = await db
          .delete(Design)
          .where(
            and(
              isNull(Design.userId),
              eq(Design.status, "DRAFT"),
              lt(Design.createdAt, guestDraftCutoff)
            )
          );
        cleanedGuestDrafts = resDraft.rowsAffected ?? staleDrafts.length;
      }
    } catch (cleanupErr: any) {
      console.warn("Retention cleanup error (non-fatal):", cleanupErr?.message);
    }

    // Marker observabilitas (best-effort, JANGAN ubah hasil sweep bila gagal):
    // cron-state/sweep.json dibaca /api/health sebagai bukti cron hidup.
    try {
      const { uploadToR2 } = await import("@/lib/r2");
      await uploadToR2(
        "cron-state/sweep.json",
        JSON.stringify({
          ok: true,
          at: new Date().toISOString(),
          checked: stale.length,
          cancelled,
          reconciled,
          created,
          recoveredConfirm,
          stuckPaid,
          settledOrphan,
          cleaned: {
            verification: cleanedVerification,
            sessions: cleanedSessions,
            presences: cleanedPresences,
            guestDrafts: cleanedGuestDrafts,
          },
        }),
        "application/json"
      );
    } catch (e: any) {
      console.warn("Sweep marker gagal:", e?.message);
    }
    return NextResponse.json({
      success: true,
      checked: stale.length,
      cancelled,
      reconciled,
      created,
      recoveredConfirm,
      stuckPaid,
      settledOrphan,
      cleaned: {
        expiredVerification: cleanedVerification,
        expiredSessions: cleanedSessions,
        stalePresences: cleanedPresences,
        abandonedGuestDrafts: cleanedGuestDrafts,
      },
    });
  } catch (e: any) {
    console.error("Sweep error:", e?.message);
    return NextResponse.json({ error: e?.message || "Sweep gagal" }, { status: 500 });
  }
}
