import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Payment } from "@/lib/drizzle-schema";
import { withBusyRetry } from "@/lib/dbRetry";

export interface SettlePaymentInput {
  orderId: string;
  orderNumber?: string;
  amountIdr: number;
  providerRef: string;
  provider?: string;
  method?: string | null;
  rawWebhookPayload?: string | null;
}

/**
 * SATU-SATUNYA tempat menulis Payment.status = SETTLEMENT.
 *
 * WAJIB dipanggil SETELAH confirmOrderPaid sukses. Jangan pernah menulis
 * SETTLEMENT sebelum task/stok/order selesai: kalau batch gagal, retry
 * webhook akan melihat Payment sudah SETTLEMENT dan melewati order yang
 * masih PENDING_PAYMENT (bug order lunas nyangkut).
 */
export async function settlePaymentAfterConfirm(input: SettlePaymentInput): Promise<void> {
  const existing = await db.query.Payment.findFirst({
    where: (t, { eq }) => eq(t.orderId, input.orderId),
  });

  if (existing?.status === "REFUNDED") {
    console.warn(
      "settlePaymentAfterConfirm: Payment sudah REFUNDED, settlement tidak ditimpa",
      input.orderNumber || input.orderId
    );
    return;
  }

  const data = {
    status: "SETTLEMENT",
    provider: input.provider || existing?.provider || "IPAYMU",
    providerRef: input.providerRef,
    method: input.method ?? existing?.method ?? null,
    rawWebhookPayload: input.rawWebhookPayload ?? existing?.rawWebhookPayload ?? null,
    paidAt: existing?.paidAt ?? new Date(),
  };

  if (!existing) {
    await withBusyRetry(() =>
      db
        .insert(Payment)
        .values({
          id: nanoid(),
          orderId: input.orderId,
          amountIdr: input.amountIdr,
          ...data,
        })
        .onConflictDoNothing()
    );
    return;
  }

  await withBusyRetry(() =>
    db.update(Payment).set(data).where(eq(Payment.orderId, input.orderId))
  );
}
