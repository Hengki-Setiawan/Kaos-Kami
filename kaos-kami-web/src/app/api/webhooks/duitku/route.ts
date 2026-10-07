import { NextRequest, NextResponse } from "next/server";
import { duitkuProvider } from "@/lib/payments/duitku";

// Route webhook pembayaran (status: nonaktif, respons 410 Gone).
// - File dipertahankan sebagai jejak audit.
// - Respons 410 agar pengirim ulang lama berhenti dengan jelas.
// - Verifikasi signature MD5/HMAC dipertahankan via
//   verifyDuitkuCallbackForAudit() untuk keperluan forensik (read-only,
//   tanpa efek samping ke DB/order).
// - Order baru tidak bergantung ke route ini: checkout default
//   PAYMENT_GATEWAY_PROVIDER=ipaymu (checkout/route.ts) + callback aktif
//   di /api/webhooks/ipaymu.

const GONE_BODY = {
  error: "Gone",
  message:
    "Webhook Duitku sudah dinonaktifkan (migrasi ke iPaymu). " +
    "Callback aktif: /api/webhooks/ipaymu.",
};

export async function POST(_req: NextRequest) {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

/**
 * Audit forensik callback lama: verifikasi signature TANPA menyentuh
 * DB, order, maupun produksi. Mengembalikan true bila signature cocok
 * dengan secret server (MD5 `merchantCode+amount+orderId+apiKey` atau
 * varian HMAC-SHA256 — logika di DuitkuPaymentProvider).
 * Secret kosong → selalu false.
 */
export function verifyDuitkuCallbackForAudit(
  merchantCode: string,
  amount: string | number,
  merchantOrderId: string,
  signature: string
): boolean {
  return duitkuProvider.verifyCallbackSignature(
    merchantCode,
    amount,
    merchantOrderId,
    signature
  );
}
