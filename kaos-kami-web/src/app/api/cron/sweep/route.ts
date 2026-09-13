import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent, Payment } from "@/lib/drizzle-schema";
import { secretsEqual } from "@/lib/timingSafe";

// Batas kedaluwarsa order tanpa bayar: 24 jam (sama dengan expiry Duitku).
const STALE_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;
// Rekonsiliasi tagihan yatim: order PENDING tanpa baris Payment (insert
// PENDING gagal/crash setelah charge sukses) dicek ke Duitku setelah >30 mnt.
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
    // PENDING_PAYMENT umur >30 menit yang TIDAK punya baris Payment dicek
    // server-to-server ke Duitku. Sukses → buat baris Payment SETTLEMENT +
    // confirmOrderPaid. Gagal/kedaluarsa/masih-proses → dilewati, sweep 24
    // jam yang menangani. Batch dibatasi + try/catch per order.
    let reconciled = 0;
    let created = 0;
    try {
      const reconcileCutoff = new Date(Date.now() - RECONCILE_MS);
      const orphans = await db
        .select({ id: Order.id, orderNumber: Order.orderNumber, totalIdr: Order.totalIdr })
        .from(Order)
        .leftJoin(Payment, eq(Payment.orderId, Order.id))
        .where(
          and(
            eq(Order.status, "PENDING_PAYMENT"),
            lt(Order.createdAt, reconcileCutoff),
            isNull(Payment.id)
          )
        )
        .limit(RECONCILE_BATCH);
      if (orphans.length > 0) {
        const { duitkuProvider } = await import("@/lib/payments/duitku");
        const { confirmOrderPaid } = await import("@/lib/payments/confirmOrder");
        for (const o of orphans) {
          reconciled++;
          try {
            const st = await duitkuProvider.checkTransactionStatus(o.orderNumber);
            const code = (st.statusCode || "").trim();
            const msg = (st.statusMessage || "").toUpperCase();
            const isSuccess =
              code === "00" ||
              msg.includes("SUCCESS") ||
              msg.includes("SETTLEMENT") ||
              msg.includes("SETTLE") ||
              msg === "PAID" ||
              msg.includes(" PAID");
            // FAILED ("02") / EXPIRED / masih-proses ("01") → JANGAN cancel
            // di sini; biarkan sweep 24 jam yang menangani.
            if (!isSuccess) continue;
            // B1: nominal Duitku WAJIB sama dengan total order (paritas
            // webhook:99-104 + repay:113-122) — tolak underpayment maupun
            // sukses-tanpa-nominal (Number(undefined) = NaN → mismatch).
            // Mismatch → JANGAN auto-confirm, biarkan sweep 24 jam.
            if (Number(st.amount) !== o.totalIdr) {
              console.warn("Sweep reconcile: nominal mismatch, lewati", {
                orderNumber: o.orderNumber,
                remoteAmount: st.amount,
                total: o.totalIdr,
              });
              continue;
            }
            const ref = st.reference || `reconciled-${o.orderNumber}`;
            let inserted = false;
            try {
              await db.insert(Payment).values({
                id: nanoid(),
                orderId: o.id,
                provider: "DUITKU",
                providerRef: ref,
                amountIdr: o.totalIdr,
                status: "SETTLEMENT",
                paidAt: new Date(),
                rawWebhookPayload: JSON.stringify({ via: "sweep-reconcile", status: st }),
              });
              inserted = true;
            } catch (insErr: any) {
              // Race (webhook/repay membuat baris bersamaan, orderId UNIQUE)
              // → lanjut konfirmasi saja, jangan gugurkan order lain.
              if (!/unique|duplicate|primary/i.test(String(insErr?.message || ""))) throw insErr;
            }
            await confirmOrderPaid(o.id, { reference: ref, via: "sweep-reconcile" });
            if (inserted) created++;
          } catch (e: any) {
            console.warn("Sweep reconcile gagal:", o.orderNumber, e?.message);
          }
        }
      }
    } catch (e: any) {
      // Fase best-effort: kegagalan total (mis. Duitku belum dikonfigurasi)
      // tak boleh menggagalkan hasil sweep existing.
      console.warn("Sweep reconcile phase gagal:", e?.message);
    }
    // Marker observabilitas (best-effort, JANGAN ubah hasil sweep bila gagal):
    // cron-state/sweep.json dibaca /api/health sebagai bukti cron hidup.
    try {
      const { uploadToR2 } = await import("@/lib/r2");
      await uploadToR2(
        "cron-state/sweep.json",
        JSON.stringify({ ok: true, at: new Date().toISOString(), checked: stale.length, cancelled, reconciled, created }),
        "application/json"
      );
    } catch (e: any) {
      console.warn("Sweep marker gagal:", e?.message);
    }
    return NextResponse.json({ success: true, checked: stale.length, cancelled, reconciled, created });
  } catch (e: any) {
    console.error("Sweep error:", e?.message);
    return NextResponse.json({ error: e?.message || "Sweep gagal" }, { status: 500 });
  }
}
