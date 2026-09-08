import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Payment } from "@/lib/drizzle-schema";
import { duitkuProvider } from "@/lib/payments/duitku";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * POST /api/orders/:id/repay — Buat link bayar BARU untuk order PENDING.
 * Pengaman anti tagih-ganda:
 * 1. Tolak jika order sudah lunas (payment SETTLEMENT ada).
 * 2. Payment PENDING lama ditandai EXPIRED sebelum bikin baru.
 * 3. Webhook idempoten: callback pertama yang menang (sudah ada).
 * 4. Rate-limit ketat: spam inquiry = spam dashboard merchant.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`repay:ip:${ip}`, 3, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 3) });
    }
    const orl = await checkRateLimitAsync(`repay:order:${params.id}`, 3, 3600);
    if (orl.isLimited) {
      return NextResponse.json(
        { error: "Link baru sudah dibuat 3x. Hubungi admin via WA." },
        { status: 429, headers: rateLimitHeaders(orl, 3) }
      );
    }

    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, params.id),
      with: { items: true, payment: true, user: true },
    });
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: `Order sudah ${order.status}, tidak perlu bayar ulang` }, { status: 400 });
    }
    if (order.payment?.status === "SETTLEMENT") {
      return NextResponse.json({ error: "Order ini sudah lunas" }, { status: 400 });
    }

    // Tanya Duitku langsung: kalau ternyata SUDAH lunas (webhook telat/hilang),
    // sahkan di sini, JANGAN bikin tagihan baru (anti tagih ganda).
    // Gagal tanya (jaringan) → lanjut hati-hati seperti biasa.
    try {
      const remote = await duitkuProvider.checkTransactionStatus(order.orderNumber);
      if (remote.statusCode === "00") {
        await db
          .update(Payment)
          .set({ status: "SETTLEMENT", paidAt: new Date() })
          .where(eq(Payment.orderId, order.id));
        await confirmOrderPaid(order.id, {
          paymentCode: order.payment?.method || "DUITKU",
          reference: remote.reference || order.payment?.providerRef,
          via: "repay-check",
        });
        return NextResponse.json({ success: true, alreadyPaid: true });
      }
    } catch (e: any) {
      console.warn("Repay status-check gagal, lanjut bikin charge baru:", e?.message);
    }

    // Kedaluwarsakan payment PENDING lama (catatan lokal; link lama di Duitku
    // ikut mati saat expiry 24 jam. Bayar SATU link saja — tertera di UI).
    if (order.payment) {
      await db
        .update(Payment)
        .set({ status: "EXPIRED" })
        .where(eq(Payment.id, order.payment.id));
    }

    // Susun ulang rincian agar balance dengan total (syarat Duitku).
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

    let charge;
    try {
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: order.totalIdr,
        customer: {
          name: order.user?.name || "Pelanggan",
          phone: order.user?.phoneNumber || "-",
          email: order.user?.email || "customer@kaoskami.com",
        },
        itemDetails: itemLines,
      });
    } catch (chargeErr: any) {
      return NextResponse.json(
        { error: "Gagal buat link baru. Coba lagi / hubungi admin.", detail: chargeErr?.message },
        { status: 502 }
      );
    }

    await db.insert(Payment).values({
      id: nanoid(),
      orderId: order.id,
      provider: "DUITKU",
      providerRef: charge.reference,
      method: "RETRY",
      amountIdr: order.totalIdr,
      status: "PENDING",
    });

    return NextResponse.json({ success: true, paymentUrl: charge.paymentUrl, reference: charge.reference });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
