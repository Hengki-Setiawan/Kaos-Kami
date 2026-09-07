// src/lib/coupons.ts — Validasi & pemakaian kupon diskon.
// Dipakai checkout web + mobile. Increment dipakai saat order dibuat
// (reservasi; hangus jika order tak dibayar — catat maxUses longgar).
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "./db";
import { Coupon } from "./drizzle-schema";

export interface CouponResult {
  couponId: string;
  code: string;
  discountIdr: number;
}

/** Validasi kode kupon terhadap subtotal. Throw Error dengan pesan user-friendly jika tak valid. */
export async function validateCoupon(rawCode: string, subtotalIdr: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Kode kupon kosong");
  const coupon = await db.query.Coupon.findFirst({
    where: (t, { eq }) => eq(t.code, code),
  });
  if (!coupon || !coupon.isActive) throw new Error("Kupon tidak valid / tidak aktif");
  if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new Error("Kupon sudah kadaluarsa");
  if (subtotalIdr < coupon.minSpendIdr)
    throw new Error(`Belanja minimal Rp ${coupon.minSpendIdr.toLocaleString("id-ID")} untuk kupon ini`);
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    throw new Error("Kuota kupon habis");
  const discountIdr =
    coupon.discountType === "PERCENT"
      ? Math.floor((subtotalIdr * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, subtotalIdr);
  return { couponId: coupon.id, code: coupon.code, discountIdr };
}

/** Tambah usedCount atomik (gagal false jika kuota habis tepat bersamaan). */
export async function consumeCoupon(code: string): Promise<boolean> {
  const res = await db
    .update(Coupon)
    .set({ usedCount: sql`${Coupon.usedCount} + 1` })
    .where(
      and(
        eq(Coupon.code, code),
        or(isNull(Coupon.maxUses), lt(Coupon.usedCount, Coupon.maxUses))
      )
    );
  return (res.rowsAffected ?? 0) > 0;
}
