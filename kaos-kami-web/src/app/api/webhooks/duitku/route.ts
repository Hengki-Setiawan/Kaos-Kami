import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { OrderStatusEvent, Payment } from "@/lib/drizzle-schema";
import { duitkuProvider } from "@/lib/payments/duitku";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const MAX_WEBHOOK_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Throttle + cap body (audit: callback palsu tiap hit = query DB).
    const rl = await checkRateLimitAsync(`webhook:ip:${getClientIp(req)}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    let payload: Record<string, any> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString().slice(0, 512);
      });
    } else {
      const text = await req.text();
      if (text.length > MAX_WEBHOOK_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
      try {
        payload = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature,
      resultCode,
      reference,
      paymentCode,
    } = payload;

    if (!merchantCode || !merchantOrderId || !signature) {
      return NextResponse.json({ error: "Invalid Duitku payload" }, { status: 400 });
    }

    // 1. Verify Duitku Callback Signature
    const isValid = duitkuProvider.verifyCallbackSignature(
      merchantCode,
      amount,
      merchantOrderId,
      signature
    );

    if (!isValid) {
      console.warn("Duitku Webhook: Invalid MD5 signature mismatch", { merchantOrderId, signature });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 1b. Tolak merchantCode asing (anti cross-merchant confusion).
    const myMerchant = (process.env.DUITKU_MERCHANT_CODE || "").trim();
    if (myMerchant && merchantCode !== myMerchant) {
      console.warn("Duitku Webhook: foreign merchantCode", { merchantCode });
      return NextResponse.json({ error: "Unknown merchant" }, { status: 401 });
    }

    // 2. Find order by orderNumber
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.orderNumber, merchantOrderId),
      with: { items: true, user: true, payment: true },
    });

    if (!order) {
      console.warn("Duitku Webhook: Order not found", merchantOrderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Check resultCode ("00" = SUCCESS)
    const isPaymentSuccess = resultCode === "00";

    // 3b. Nominal callback WAJIB ada & sama dengan total order — tolak
    // underpayment maupun sukses-tanpa-nominal.
    if (isPaymentSuccess && (amount === undefined || Number(amount) !== order.totalIdr)) {
      console.warn("Duitku Webhook: amount missing/mismatch", { merchantOrderId, amount, total: order.totalIdr });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 4. Idempotency: order yang sudah SETTLEMENT tidak pernah di-downgrade/di-spawn ulang.
    if (order.payment?.status === "SETTLEMENT") {
      return new Response("SUCCESS", { status: 200 });
    }
    // 4b. Reference duplikat (retry Duitku) → ack tanpa tulis ulang.
    if (reference && order.payment?.providerRef === reference && order.payment?.rawWebhookPayload) {
      return new Response("SUCCESS", { status: 200 });
    }

    // 5. Update Payment Record
    await db
      .update(Payment)
      .set({
        status: isPaymentSuccess ? "SETTLEMENT" : "FAILED",
        method: paymentCode || "DUITKU",
        ...(reference ? { providerRef: reference } : {}),
        ...(isPaymentSuccess ? { paidAt: new Date() } : {}),
        rawWebhookPayload: JSON.stringify(payload),
      })
      .where(eq(Payment.orderId, order.id));

    // 6. On Successful Payment: Update Order & Spawn ProductionTasks
    // (satu pintu via confirmOrderPaid — idempoten, anti spawn ganda).
    if (isPaymentSuccess) {
      await confirmOrderPaid(order.id, { paymentCode, reference, via: "webhook" });
    } else {
      // Catat kegagalan ke riwayat agar admin melihat (sebelumnya sunyi).
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: order.id,
        status: order.status,
        note: `Callback Duitku gagal (${resultCode || "?"} via ${paymentCode || "Duitku"}).`,
      }).catch(() => {});
    }

    return new Response("SUCCESS", { status: 200 });
  } catch (error: any) {
    console.error("Duitku Webhook Exception:", error?.message || error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
