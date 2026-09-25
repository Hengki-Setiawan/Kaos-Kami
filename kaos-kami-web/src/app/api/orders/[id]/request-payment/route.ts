import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Payment } from "@/lib/drizzle-schema";
import { assertResourceOwnerOrAdmin } from "@/lib/security/authGuard";
import { duitkuProvider } from "@/lib/payments/duitku";
import { PRODUCTION_TURNAROUND_OPTIONS } from "@/lib/shipping/deliveryOptions";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * POST /api/orders/[id]/request-payment — User/owner buat charge Duitku VIA
 * DASHBOARD setelah admin ACC (alur baru owner Sep 2026).
 *
 * Kontrak FINAL (dipakai agent lain — JANGAN ubah nama):
 * - (owner/admin order — assertResourceOwnerOrAdmin) + rate-limit ketat 5/mnt.
 * - HANYA dari PENDING_PAYMENT yang `reviewedBy IS NOT NULL` (pernah di-ACC)
 *   → selain itu 400. Order DESIGN_REVIEW (belum ACC) & REJECTED ditolak di sini.
 * - Buat Duitku charge (pola createCharge warisan checkout route: rincian item
 *   dibangun ulang dari baris Order tersimpan agar paymentAmount == Σ item)
 *   → update Payment providerRef + kembalikan { paymentUrl, reference }.
 *
 * CATATAN KOMPATIBILITAS:
 * - Order PENDING_PAYMENT LEGACY (pra-alur-review, reviewedBy NULL) DITOLAK di
 *   sini — bayar ulangnya tetap via POST /api/orders/[id]/repay (milik alur lama).
 * - Klien mobile boleh kirim { returnUrlOverride } deep-link APK
 *   `kaoskami://payment/callback?orderId=` (M2, 13 Sep) — default = invoice web.
 * - Webhook Duitku tetap lookup via merchantOrderId (= orderNumber); guard
 *   SETTLEMENT di bawah mencegah charge ganda pasca-lunas.
 */

const RequestPaymentSchema = z.object({
  // Opsional: override returnUrl charge (mobile deep-link APK). Default =
  // halaman invoice web. Skema kustom http(s):// atau kaoskami:// wajib.
  returnUrlOverride: z
    .string()
    .max(512)
    .refine((v) => /^(https?:\/\/|kaoskami:\/\/)/.test(v), "returnUrlOverride tidak valid")
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;

    // Rate-limit KETAT (kontrak: 5/mnt) — per order + per IP.
    const ip = getClientIp(req);
    const ipl = await checkRateLimitAsync(`request-payment:ip:${ip}`, 5, 60);
    if (ipl.isLimited) {
      return NextResponse.json(
        { error: `Terlalu sering. Tunggu ${ipl.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(ipl, 5) }
      );
    }
    const orl = await checkRateLimitAsync(`request-payment:order:${orderId}`, 5, 60);
    if (orl.isLimited) {
      return NextResponse.json(
        { error: "Terlalu sering minta link bayar. Tunggu sebentar / hubungi admin via WA." },
        { status: 429, headers: rateLimitHeaders(orl, 5) }
      );
    }

    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, orderId),
      with: { items: true, payment: true, user: true },
    });
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Owner order ATAU admin — tanpa sesi yang cocok → 401/403.
    try {
      await assertResourceOwnerOrAdmin(order.userId);
    } catch (e: any) {
      const msg = e?.message || "Forbidden";
      return NextResponse.json({ error: msg }, { status: msg.startsWith("Unauthorized") ? 401 : 403 });
    }

    // KONTRAK: hanya dari PENDING_PAYMENT yang pernah di-ACC (reviewedBy terisi).
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        {
          error:
            order.status === "DESIGN_REVIEW"
              ? "Desain masih menunggu review admin — link bayar tersedia setelah admin ACC."
              : order.status === "REJECTED"
                ? "Desain ditolak admin — perbaiki desain lalu checkout ulang."
                : `Order sudah ${order.status}, tidak bisa minta link bayar baru.`,
        },
        { status: 400 }
      );
    }
    // Baca defensif: kolom reviewedBy BUTUH `db push` (Turso) — sebelum push,
    // properti ini undefined di baris lama; cast any agar .ts tetap kompil.
    const reviewedBy = (order as any).reviewedBy as string | null | undefined;
    if (!reviewedBy) {
      return NextResponse.json(
        { error: "Order belum di-ACC admin — tunggu review desain (atau bayar via link lama / hubungi admin)." },
        { status: 400 }
      );
    }
    if (order.payment?.status === "SETTLEMENT") {
      return NextResponse.json({ error: "Order ini sudah lunas" }, { status: 400 });
    }

    const body = RequestPaymentSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
    }

    // Fail-closed: tolak 503 bila secret Duitku kosong (paritas checkout lama).
    try {
      duitkuProvider.assertDuitkuConfigured();
    } catch {
      return NextResponse.json(
        { error: "Pembayaran belum dikonfigurasi. Coba lagi nanti / hubungi admin." },
        { status: 503 }
      );
    }

    // Susun ulang rincian agar balance dengan total (syarat Duitku
    // paymentAmount == Σ item — pola warisan checkout route + repay/route.ts):
    // snapshot item + ongkir + diskon (negatif) + surcharge EXPRESS.
    const itemLines = order.items.map((it) => ({
      name: it.snapshotName.slice(0, 60),
      price: it.unitPriceIdr,
      quantity: it.quantity,
    }));
    if (order.shippingCostIdr > 0) {
      itemLines.push({ name: "Ongkos kirim", price: order.shippingCostIdr, quantity: 1 });
    }
    if (order.discountIdr > 0) {
      itemLines.push({ name: "Diskon kupon", price: -order.discountIdr, quantity: 1 });
    }
    if (order.courierNotes?.includes("[TIER:EXPRESS_24H]")) {
      const expressSurcharge =
        PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === "EXPRESS_24H")?.surchargeIdr ?? 25000;
      if (expressSurcharge > 0) {
        itemLines.push({ name: "Surcharge EXPRESS 24H", price: expressSurcharge, quantity: 1 });
      }
    }

    let charge;
    try {
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: order.totalIdr,
        customer: {
          name: order.user?.name || "Pelanggan",
          phone: order.user?.phoneNumber || "-",
          email: order.user?.email || "customer@kaoskami.biz.id",
        },
        itemDetails: itemLines,
        ...(body.data.returnUrlOverride ? { returnUrlOverride: body.data.returnUrlOverride } : {}),
      });
    } catch (chargeErr: any) {
      console.error("request-payment Duitku charge gagal:", order.id, chargeErr?.message);
      try {
        const { captureException } = await import("@sentry/nextjs").catch(() => ({ captureException: null as any }));
        captureException?.(chargeErr, { extra: { orderId: order.id, orderNumber: order.orderNumber } });
      } catch {}
      return NextResponse.json(
        { error: "Gagal buat link bayar. Coba lagi / hubungi admin.", detail: chargeErr?.message },
        { status: 502 }
      );
    }

    // Update-in-place (Payment.orderId UNIQUE — pola repay): timpa ref
    // `pending-*` dengan reference Duitku asli. Baris belum ada (order lama)
    // → insert. Method TAK disentuh (mobile menyimpan "QRIS").
    if (order.payment) {
      await db
        .update(Payment)
        .set({
          providerRef: charge.reference,
          amountIdr: order.totalIdr,
          status: "PENDING",
          paidAt: null,
          rawWebhookPayload: null,
        })
        .where(eq(Payment.id, order.payment.id));
    } else {
      await db.insert(Payment).values({
        id: nanoid(),
        orderId: order.id,
        provider: "DUITKU",
        providerRef: charge.reference,
        amountIdr: order.totalIdr,
        status: "PENDING",
      });
    }

    return NextResponse.json({ success: true, paymentUrl: charge.paymentUrl, reference: charge.reference });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
