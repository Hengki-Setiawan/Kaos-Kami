import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { OrderRefund, OrderStatusEvent } from "@/lib/drizzle-schema";
import { ipaymuProvider } from "@/lib/payments/ipaymu";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { settlePaymentAfterConfirm } from "@/lib/payments/settlement";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import {
  classifyOrderForWebhook,
  isIpaymuSuccessStatus,
  mustWaitForConfirmationEvent,
} from "@/lib/payments/webhookState";

/**
 * P0.2 (23 Okt 2026, keputusan owner): WEBHOOK IPAYMU FAIL-CLOSED.
 * Kontrak docs resmi iPaymu (docs.ipaymu.com/en/docs/callback, versi 2025-11-11):
 *  - Semua callback menyertakan header X-Signature → HMAC-SHA256, secret key = Nomor VA.
 *  - Signature tidak valid → JANGAN proses transaksi.
 *  - iPaymu RETRY callback bila server tidak menjawab 200 → idempotensi wajib.
 * Guer hunt: callback tanpa signature valid → 401 (PAS, tidak fail-open lagi).
 */

const MAX_WEBHOOK_BYTES = 16 * 1024;
const LATE_PAYMENT_REASON =
  "LATE_PAYMENT: pembayaran masuk setelah order tidak lagi dapat diproses otomatis. Dana wajib dikembalikan ke pelanggan.";

/**
 * Wrapper tipis: settlement SETELAH order benar-benar dikonfirmasi. Kalau
 * tulisan ini gagal, webhook 500 dan iPaymu retry; retry akan melihat order
 * sudah PAID/PAYMENT_CONFIRMED lalu hanya menyelesaikan baris Payment.
 */
async function settlePayment(order: any, payload: Record<string, any>, trxId: unknown, via: string) {
  await settlePaymentAfterConfirm({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountIdr: order.totalIdr,
    provider: "IPAYMU",
    providerRef: String(trxId),
    method: `IPAYMU_${via.toUpperCase()}`,
    rawWebhookPayload: JSON.stringify(payload),
  });
}

async function hasPaymentConfirmedEvent(orderId: string): Promise<boolean> {
  const event = await db.query.OrderStatusEvent.findFirst({
    where: (t, { and, eq }) => and(eq(t.orderId, orderId), eq(t.status, "PAYMENT_CONFIRMED")),
    columns: { id: true },
  });
  return Boolean(event);
}

/**
 * Pembayaran telat/tak terduga: order sudah CANCELLED/REJECTED/DESIGN_REVIEW.
 * Jangan spawn task/stok. Tandai Payment SETTLEMENT, buat event + refund
 * PENDING agar admin melihat kewajiban refund. Idempoten via marker event.
 */
async function recordLatePayment(
  order: any,
  payload: Record<string, any>,
  trxId: unknown,
  via: string
) {
  await settlePayment(order, payload, trxId, via);
  const marker = await db.query.OrderStatusEvent.findFirst({
    where: (t, { and, eq, like }) =>
      and(eq(t.orderId, order.id), like(t.note, "[LATE_PAYMENT]%")),
    columns: { id: true },
  });
  if (marker) return;

  const existingRefund = await db.query.OrderRefund.findFirst({
    where: (t, { and, eq, like }) =>
      and(eq(t.orderId, order.id), like(t.reason, "LATE_PAYMENT%")),
    columns: { id: true },
  });

  const writes: any[] = [
    db.insert(OrderStatusEvent).values({
      id: nanoid(),
      orderId: order.id,
      status: order.status,
      note: `[LATE_PAYMENT] ${LATE_PAYMENT_REASON} Status order: ${order.status}.`,
    }),
  ];
  if (!existingRefund) {
    writes.push(
      db.insert(OrderRefund).values({
        id: nanoid(),
        orderId: order.id,
        amountIdr: order.totalIdr,
        reason: `${LATE_PAYMENT_REASON} Status order: ${order.status}.`,
        status: "PENDING",
      })
    );
  }
  await db.batch(writes as [any, ...any[]]);
}

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

    // Baca body mentah SEKALI. Dashboard iPaymu bisa dikonfigurasi mengirim
    // application/x-www-form-urlencoded (DEFAULT yang direkomendasikan docs) atau JSON.
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        const params = new URLSearchParams(rawBody);
        params.forEach((value, key) => {
          // JANGAN potong value sebelum verifikasi signature: HMAC dihitung
          // atas payload asli. Body sudah dibatasi MAX_WEBHOOK_BYTES.
          payload[key] = value.toString();
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

    // 3. Verifikasi signature — WAJIB (fail-closed). Header kanonis docs: `X-Signature`.
    //    Kompat lama tetap diterima: `signature` / `x-ipaymu-signature` / field body.
    const receivedSignature =
      req.headers.get("x-signature") ||
      req.headers.get("signature") ||
      req.headers.get("x-ipaymu-signature") ||
      String(payload.signature || payload.sign || "");
    if (!receivedSignature) {
      console.warn("iPaymu Webhook: rejected — tanpa X-Signature (fail-closed)");
      return NextResponse.json(
        { error: "Missing X-Signature — callback tanpa tanda tangan ditolak" },
        { status: 401 }
      );
    }

    const signatureOk = ipaymuProvider.verifyCallbackSignature(payload, receivedSignature);
    if (!signatureOk) {
      console.warn("iPaymu Webhook: signature tidak valid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    if (typeof payload.signature === "string") delete payload.signature;
    if (typeof payload.sign === "string") delete payload.sign;

    // 4. iPaymu fields (docs: trx_id int, reference_id, status 'berhasil'|'pending'|'expired',
    //    status_code 1=sukses/0=pending/-2=expired, total STRING, via, channel)
    const trxId = payload.trx_id || payload.transactionId || payload.id;
    const status = String(payload.status || "").toLowerCase();
    const referenceId = String(
      payload.reference_id || payload.referenceId || payload.reference || ""
    ).trim();
    // Docs: field nominal callback = `total` (string). `amount` tetap diakomodasi bila ada.
    const amount = Number(payload.total ?? payload.amount ?? NaN);
    const via = String(payload.via || payload.channel || "QRIS");

    if (!trxId || !referenceId) {
      console.warn("iPaymu Webhook: Missing trxId or referenceId", payload);
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // 5. Find order by orderNumber (reference_id)
    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.orderNumber, referenceId),
      with: { items: true, user: true, payment: true },
    });

    if (!order) {
      console.warn("iPaymu Webhook: Order not found", referenceId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 6. Klasifikasi status order. Payment TIDAK lagi dijadikan sumber
    //    idempotensi: baris Payment bisa SETTLEMENT sementara order masih
    //    PENDING_PAYMENT akibat kegagalan batch lama. Sumber kebenaran = order.
    const orderState = classifyOrderForWebhook(order.status);
    // Uang benar-benar masuk? Predikat strict (bukan substring "settle" /
    // "berhasil") supaya callback "pending"/"unsettled" tidak pernah
    // menulis Payment SETTLEMENT.
    const isSuccess = isIpaymuSuccessStatus({
      status,
      statusCode: payload.status_code ?? payload.statusCode,
      statusDesc: payload.status_desc ?? payload.statusDesc,
      paidStatus: payload.paid_status ?? payload.paidStatus,
    });

    if (orderState === "already_refunded") {
      console.info("iPaymu Webhook: order sudah REFUNDED (idempotent skip)", referenceId);
      return NextResponse.json({
        success: true,
        message: "Order already refunded — idempotent skip",
        orderNumber: order.orderNumber,
      });
    }

    if (orderState === "already_paid") {
      // Callback "pending"/"expired"/"unsettled" untuk order yang sudah lunas
      // TIDAK boleh menulis settlement. Cukup idempotent skip.
      if (!isSuccess) {
        console.info("iPaymu Webhook: order sudah lunas, status non-success diabaikan", {
          referenceId,
          status,
        });
        return NextResponse.json({
          success: true,
          message: `Already paid — status noted: ${status || "unknown"}`,
          orderNumber: order.orderNumber,
        });
      }
      // Nominal callback tetap wajib cocok sebelum menulis settlement, walau
      // order sudah berstatus lunas (melindungi dari payload signed yang aneh).
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        Math.abs(amount - order.totalIdr) > 1
      ) {
        console.warn("iPaymu Webhook: nominal tidak cocok pada order lunas", {
          referenceId,
          amount,
          expected: order.totalIdr,
        });
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      // PAYMENT_CONFIRMED ditulis sebelum batch task/stok. Kalau event batch
      // belum ada, jangan settlement dulu; minta iPaymu retry.
      if (mustWaitForConfirmationEvent(order.status) && !(await hasPaymentConfirmedEvent(order.id))) {
        console.warn(
          "iPaymu Webhook: PAYMENT_CONFIRMED belum punya event batch — minta retry",
          referenceId
        );
        return NextResponse.json({ error: "Payment confirmation in progress" }, { status: 409 });
      }
      await settlePayment(order, payload, trxId, via);
      console.info("iPaymu Webhook: sudah lunas (idempotent skip)", referenceId);
      return NextResponse.json({
        success: true,
        message: "Already paid — idempotent skip",
        orderNumber: order.orderNumber,
      });
    }

    // Lanjut hanya bila transaksi BERHASIL (predikat strict di atas).
    if (!isSuccess) {
      console.info("iPaymu Webhook: Payment not success yet", { referenceId, status });
      return NextResponse.json({ success: true, message: `Status noted: ${status}` });
    }

    // 7. Guard nominal WAJIB & TOTAL (P0.2): amount NGOSONG/NaN/<=0 = 400;
    //    nominal tidak ±Rp1 dari total order = 400. TIDAK ADA jalur skip.
    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn("iPaymu Webhook: nominal tidak sah/kosong", { referenceId, amount });
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (Math.abs(amount - order.totalIdr) > 1) {
      console.warn("iPaymu Webhook: Amount mismatch", {
        expected: order.totalIdr,
        received: amount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 8. Order batal/review tapi uang masuk: jangan spawn task/stok. Tandai
    //    refund PENDING + event agar admin punya pekerjaan yang terlihat.
    if (orderState === "late_payment") {
      await recordLatePayment(order, payload, trxId, via);
      console.warn("iPaymu Webhook: LATE_PAYMENT — refund PENDING dibuat", {
        orderNumber: order.orderNumber,
        status: order.status,
        trxId,
      });
      return NextResponse.json({
        success: true,
        message: "Late payment recorded — refund required",
        latePayment: true,
        requiresRefund: true,
        orderNumber: order.orderNumber,
      });
    }

    if (orderState !== "pending") {
      console.warn("iPaymu Webhook: order state tidak bisa diproses", {
        orderNumber: order.orderNumber,
        status: order.status,
      });
      return NextResponse.json({ error: "Order state not payable" }, { status: 409 });
    }

    // 9. Konfirmasi Lunas DULU. Baru setelah batch task/stok sukses, Payment
    //    di-set SETTLEMENT. Kalau batch gagal, Payment tetap PENDING dan
    //    iPaymu retry bisa memproses ulang tanpa order nyangkut.
    const result = await confirmOrderPaid(order.id, {
      paymentCode: `iPaymu ${via.toUpperCase()}`,
      reference: String(trxId),
      via: "iPaymu Webhook",
    });

    if (result === "processing") {
      // Batch task/stok proses lain belum commit. Jangan settlement; retry.
      console.warn("iPaymu Webhook: konfirmasi masih diproses proses lain — minta retry", referenceId);
      return NextResponse.json({ error: "Payment confirmation in progress" }, { status: 409 });
    }

    if (result === "not-pending") {
      // Status berubah antara SELECT dan konfirmasi (mis. sweep membatalkan).
      // Re-fetch dan tangani sebagai late/refund, bukan sukses diam-diam.
      const fresh = await db.query.Order.findFirst({
        where: (t, { eq }) => eq(t.orderNumber, referenceId),
        with: { payment: true },
      });
      if (!fresh) {
        console.warn("iPaymu Webhook: order hilang saat konfirmasi", referenceId);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const freshState = classifyOrderForWebhook(fresh.status);
      if (freshState === "late_payment") {
        await recordLatePayment(fresh, payload, trxId, via);
        return NextResponse.json({
          success: true,
          message: "Late payment recorded — refund required",
          latePayment: true,
          requiresRefund: true,
          orderNumber: fresh.orderNumber,
        });
      }
      if (freshState === "already_paid") {
        // Jangan settlement kalau event batch belum commit: bisa jadi proses
        // lain baru menulis race-guard PAYMENT_CONFIRMED. Tunggu retry.
        if (
          mustWaitForConfirmationEvent(fresh.status) &&
          !(await hasPaymentConfirmedEvent(fresh.id))
        ) {
          console.warn(
            "iPaymu Webhook: fresh PAYMENT_CONFIRMED tanpa event batch — minta retry",
            referenceId
          );
          return NextResponse.json(
            { error: "Payment confirmation in progress" },
            { status: 409 }
          );
        }
        await settlePayment(fresh, payload, trxId, via);
        return NextResponse.json({
          success: true,
          message: "Already paid — idempotent skip",
          orderNumber: fresh.orderNumber,
        });
      }
      if (freshState === "already_refunded") {
        return NextResponse.json({
          success: true,
          message: "Order already refunded — idempotent skip",
          orderNumber: fresh.orderNumber,
        });
      }
      console.warn("iPaymu Webhook: status berubah, minta retry", {
        orderNumber: fresh.orderNumber,
        status: fresh.status,
      });
      return NextResponse.json({ error: "Order state changed, retry" }, { status: 409 });
    }

    // 10. Settlement SETELAH order + task + stok sukses (atau sudah sukses
    //     oleh proses lain). Kalau update ini gagal, retry hanya menyelesaikan
    //     Payment karena order sudah PAID/PAYMENT_CONFIRMED.
    await settlePayment(order, payload, trxId, via);

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
