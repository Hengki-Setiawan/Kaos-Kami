import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Order, OrderStatusEvent } from "@/lib/drizzle-schema";

// Batas kedaluwarsa order tanpa bayar: 24 jam (sama dengan expiry Duitku).
const STALE_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;

/**
 * GET /api/cron/sweep — Penyapu order PENDING basi → CANCELLED.
 * Dijadwalkan dari LUAR (mis. cron-job.org tiap jam) dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * Tanpa CRON_SECRET = 503 (tidak fail-open). Kupon yang terpakai order basi
 * TIDAK dikembalikan (pakai maxUses longgar) & stok tak tersentuh (stok hanya
 * berkurang saat lunas).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - STALE_MS);
    const stale = await db.query.Order.findMany({
      where: (t, { and, eq, lt }) =>
        and(eq(t.status, "PENDING_PAYMENT"), lt(t.createdAt, cutoff)),
      columns: { id: true, orderNumber: true },
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
      cancelled++;
    }
    return NextResponse.json({ success: true, checked: stale.length, cancelled });
  } catch (e: any) {
    console.error("Sweep error:", e?.message);
    return NextResponse.json({ error: e?.message || "Sweep gagal" }, { status: 500 });
  }
}
