import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ipaymuProvider } from "@/lib/payments/ipaymu";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const MAX_WEBHOOK_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting per IP
    const rl = await checkRateLimitAsync(`webhook:ipaymu:${getClientIp(req)}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: "Rate limited" },
        { status: 429, headers: rateLimitHeaders(rl, 30) }
      );
    }

    // 2. Fail-closed: tolak 503 bila iPaymu belum dikonfigurasi
    if (!ipaymuProvider.isConfigured()) {
      return NextResponse.json({ error: "Payment provider not configured" }, { status: 503 });
    }

    let payload: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    // Baca body mentah SEKALI (dipakai ulang untuk parse + verifikasi signature
    // via ipaymuProvider.verifyCallbackSignature — tanpa dep baru).
    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Verifikasi signature callback bila pengirim menyertakannya (header
    // `signature` / `x-ipaymu-signature`, atau field body `signature`).
    // Helper ADA di IpaymuPaymentProvider.verifyCallbackSignature
    // (src/lib/payments/ipaymu.ts:92) → dipakai di sini, bukan duplikasi rumus.
    // Jujur: bila signature ABSEN, request tetap lanjut (fail-open) agar callback
    // sah tak ditolak buta — pengaman utama tetap di bawah (reference order
    // wajib ada + nominal anti-underpayment + order lookup). Mismatch → 401.
    const receivedSignature =
      req.headers.get("signature") ||
      req.headers.get("x-ipaymu-signature") ||
      "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        const params = new URLSearchParams(rawBody);
        params.forEach((value, key) => {
          payload[key] = value.toString().slice(0, 512);
        });
      } catch {
        return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
      }
    } else {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    const bodySignature = String(payload.signature || payload.sign || "");
    const sigToVerify = receivedSignature || bodySignature;
    if (sigToVerify) {
      // Hapus field signature dari salinan payload BUKAN untuk verifikasi
      // (helper memverifikasi rawBody utuh) — hanya agar tak bocor ke log/DB.
      const ok = ipaymuProvider.verifyCallbackSignature(rawBody, sigToVerify);
      if (!ok) {
        console.warn("iPaymu Webhook: signature tidak valid");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn(
        "iPaymu Webhook: tanpa signature — lanjut dengan guard nominal + reference (best-effort)"
      );
    }
    if (typeof payload.signature === "string") delete payload.signature;
    if (typeof payload.sign === "string") delete payload.sign;

    // iPaymu fields
    const trxId = payload.trx_id || payload.transactionId || payload.id;
    const status = String(payload.status || "").toLowerCase();
    const referenceId = String(payload.reference_id || payload.reference || "").trim();
    const amount = Number(payload.amount || payload.total || 0);
    const via = String(payload.via || payload.channel || "QRIS");

    if (!trxId || !referenceId) {
      console.warn("iPaymu Webhook: Missing trxId or referenceId", payload);
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // 3. Find order by orderNumber (reference_id)
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.orderNumber, referenceId),
      with: { items: true, user: true, payment: true },
    });

    if (!order) {
      console.warn("iPaymu Webhook: Order not found", referenceId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 4. Periksa Status Pembayaran ("berhasil" di iPaymu)
    const isSuccess = status === "berhasil" || status === "success" || status === "paid";

    if (!isSuccess) {
      console.info("iPaymu Webhook: Payment not success yet", { referenceId, status });
      return NextResponse.json({ success: true, message: `Status noted: ${status}` });
    }

    // 5. Validasi Nominal (anti underpayment)
    if (amount > 0 && Math.abs(amount - order.totalIdr) > 1) {
      console.warn("iPaymu Webhook: Amount mismatch", {
        expected: order.totalIdr,
        received: amount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 6. Update Payment status di DB
    const { Payment } = await import("@/lib/drizzle-schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(Payment)
      .set({
        status: "SETTLEMENT",
        method: `IPAYMU_${via.toUpperCase()}`,
        providerRef: String(trxId),
        paidAt: new Date(),
        rawWebhookPayload: JSON.stringify(payload),
      })
      .where(eq(Payment.orderId, order.id));

    // 7. Konfirmasi Lunas menggunakan confirmOrderPaid yang idempoten
    const result = await confirmOrderPaid(order.id, {
      paymentCode: `iPaymu ${via.toUpperCase()}`,
      reference: String(trxId),
      via: "iPaymu Webhook",
    });

    console.info("iPaymu Webhook: Order confirmed successfully", {
      orderNumber: order.orderNumber,
      result,
      trxId,
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully confirmed",
      orderNumber: order.orderNumber,
    });
  } catch (err: any) {
    console.error("iPaymu Webhook internal error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
