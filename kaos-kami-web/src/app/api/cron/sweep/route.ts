import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  Design,
  Order,
  OrderStatusEvent,
  Payment,
  Session,
  UserPresence,
  Verification,
} from "@/lib/drizzle-schema";
import { secretsEqual } from "@/lib/timingSafe";
import { safeJsonArray } from "@/lib/json";

// Batas kedaluwarsa order tanpa bayar: 24 jam (sama dengan expiry QRIS iPaymu).
const STALE_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;
// Rekonsiliasi: order PENDING umur >30 menit yang punya baris Payment PENDING
// (webhook telat/hilang setelah charge sukses) dicek ke iPaymu.
const RECONCILE_MS = 30 * 60 * 1000;
const RECONCILE_BATCH = 20;

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
      columns: { id: true, orderNumber: true, notes: true, discountIdr: true },
      limit: BATCH,
    });

    let cancelled = 0;
    for (const o of stale) {
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

    // Fase rekonsiliasi (setelah sweep existing, TANPA mengubahnya): order
    // PENDING_PAYMENT umur >30 menit yang punya baris Payment PENDING dicek
    // server-to-server ke iPaymu. Sukses → Payment SETTLEMENT +
    // confirmOrderPaid. Gagal/kedaluarsa/masih-proses → dilewati, sweep 24
    // jam yang menangani. Batch dibatasi + try/catch per order.
    // Catatan: API iPaymu butuh transactionId angka
    // (ipaymuProvider.checkTransactionStatus, bukan orderNumber seperti
    // provider sebelumnya), jadi yang dicek adalah baris Payment PENDING via
    // providerRef. Order yatim TANPA baris Payment tak bisa dicek
    // → dibiarkan, sweep 24 jam yang menangani. Baris provider lama
    // dilewati (gateway nonaktif, respons 410).
    let reconciled = 0;
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
      if (pending.length > 0) {
        const { ipaymuProvider } = await import("@/lib/payments/ipaymu");
        const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
        if (!ipaymuProvider.isConfigured()) {
          console.warn("Sweep reconcile dilewati: iPaymu belum dikonfigurasi");
        } else {
          for (const o of pending) {
            reconciled++;
            try {
              // Hanya baris IPAYMU yang bisa dicek ke iPaymu (legacy DUITKU
              // dilewati — gateway non-aktif).
              if ((o.provider || "").toUpperCase() !== "IPAYMU") continue;
              const ref = (o.providerRef || "").trim();
              // Ref semu (belum ada transactionId asli) tak bisa dicek ke
              // iPaymu (butuh angka) → lewati, biarkan sweep 24 jam.
              if (!ref || /^(pending-|IPAYMU-DEV-|reconciled-|DUITKU-)/i.test(ref)) continue;
              const st = await ipaymuProvider.checkTransactionStatus(ref);
              const s = (st.status || "").toLowerCase();
              const d = (st.statusDesc || "").toLowerCase();
              const isSuccess =
                s === "berhasil" ||
                s === "success" ||
                s === "paid" ||
                s.includes("berhasil") ||
                s.includes("success") ||
                s.includes("settle") ||
                d === "paid" ||
                d.includes("berhasil") ||
                d.includes("success") ||
                d.includes("settle") ||
                d.includes(" paid");
              // Gagal / kedaluarsa / masih-proses → JANGAN cancel di sini;
              // biarkan sweep 24 jam yang menangani.
              if (!isSuccess) continue;
              // B1: nominal iPaymu WAJIB cocok dengan total order (paritas
              // webhook ipaymu:79-86, toleransi Rp 1) — tolak underpayment.
              // Tanpa nominal remote yang valid → JANGAN auto-confirm,
              // biarkan sweep 24 jam.
              if (st.amount !== undefined && st.amount !== null) {
                const remoteAmount = Number(st.amount);
                if (!Number.isFinite(remoteAmount) || Math.abs(remoteAmount - o.totalIdr) > 1) {
                  console.warn("Sweep reconcile: nominal mismatch, lewati", {
                    orderNumber: o.orderNumber,
                    remoteAmount: st.amount,
                    total: o.totalIdr,
                  });
                  continue;
                }
              }
              await db
                .update(Payment)
                .set({
                  status: "SETTLEMENT",
                  paidAt: new Date(),
                  rawWebhookPayload: JSON.stringify({ via: "sweep-reconcile-ipaymu", status: st }),
                })
                .where(eq(Payment.orderId, o.id));
              await confirmOrderPaid(o.id, { reference: ref, via: "sweep-reconcile-ipaymu" });
              created++;
            } catch (e: any) {
              console.warn("Sweep reconcile gagal:", o.orderNumber, e?.message);
            }
          }
        }
      }
    } catch (e: any) {
      // Fase best-effort: kegagalan total (mis. iPaymu belum dikonfigurasi)
      // tak boleh menggagalkan hasil sweep existing.
      console.warn("Sweep reconcile phase gagal:", e?.message);
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
