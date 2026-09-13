// src/lib/coupons.ts — Validasi & pemakaian kupon diskon.
// Dipakai checkout web + mobile. Increment dipakai saat order dibuat
// (reservasi); kuota DIKEMBALIKAN via restoreCoupon saat order dibatalkan /
// refund (sweep, cancel pelanggan, cancel/refund admin). Order tanpa marker
// kupon (order lama sebelum persistensi notes) TIDAK di-restore asal.
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
      ? Math.min(subtotalIdr, Math.floor((subtotalIdr * coupon.discountValue) / 100))
      : Math.min(coupon.discountValue, subtotalIdr);
  return { couponId: coupon.id, code: coupon.code, discountIdr };
}

/** Tambah usedCount atomik (gagal false jika kuota habis tepat bersamaan). */
export async function consumeCoupon(code: string): Promise<boolean> {
  // Normalisasi SAMA seperti validate (audit: lowercase lolos kuota selamanya).
  const norm = code.trim().toUpperCase();
  if (!norm) return false;
  const res = await db
    .update(Coupon)
    .set({ usedCount: sql`${Coupon.usedCount} + 1` })
    .where(
      and(
        eq(Coupon.code, norm),
        or(isNull(Coupon.maxUses), lt(Coupon.usedCount, Coupon.maxUses))
      )
    );
  return (res.rowsAffected ?? 0) > 0;
}

/** Kembalikan kuota kupon (decrement aman, clamp ≥0). Dipanggil HANYA bila
 * order tercatat memakai kupon itu (lihat getOrderCouponCode). Best-effort:
 * caller wajib try/catch agar pembatalan tetap sukses bila restore gagal. */
export async function restoreCoupon(rawCode: string): Promise<boolean> {
  const norm = rawCode.trim().toUpperCase();
  if (!norm) return false;
  const res = await db
    .update(Coupon)
    .set({
      usedCount: sql`CASE WHEN ${Coupon.usedCount} > 0 THEN ${Coupon.usedCount} - 1 ELSE 0 END`,
    })
    .where(eq(Coupon.code, norm));
  return (res.rowsAffected ?? 0) > 0;
}

/** Ambil kode kupon yang tercatat di order — atau null bila order tidak
 * memakai kupon. Marker ditulis checkout sebagai Order.notes = "COUPON:<CODE>"
 * (kolom notes Order selama ini selalu NULL & tak ditampilkan UI manapun).
 * JANGAN restore asal bila null (order lama / tanpa kupon). */
export function getOrderCouponCode(order: {
  notes?: string | null;
  discountIdr?: number | null;
}): string | null {
  const raw = (order.notes || "").trim();
  if (!raw) return null;
  const marked = raw.match(/^COUPON:([A-Za-z0-9_-]{1,32})$/);
  if (marked?.[1]) return marked[1].toUpperCase();
  // Legacy: notes berisi kode mentah — hanya bila order memang diskon.
  if (/^[A-Za-z0-9_-]{1,32}$/.test(raw) && (order.discountIdr ?? 0) > 0) {
    return raw.toUpperCase();
  }
  return null;
}
