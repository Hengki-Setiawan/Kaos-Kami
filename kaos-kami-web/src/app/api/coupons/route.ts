import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * U16: etalase voucher publik — kode + syarat + kedaluwarsa.
 * By-design publik (promo disebar); validasi kuota/expiry tetap di checkout.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`coupons:pub:${ip}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    const now = new Date();
    const rows = await db.query.Coupon.findMany({
      where: (t, { and, eq, or, gt, isNull }: any) =>
        and(
          eq(t.isActive, true),
          or(isNull(t.expiresAt), gt(t.expiresAt, now)),
          or(isNull(t.maxUses), gt(t.maxUses, t.usedCount))
        ),
      orderBy: (t, { asc }: any) => asc(t.code),
      limit: 20,
      columns: {
        code: true,
        discountType: true,
        discountValue: true,
        minSpendIdr: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
      },
    });
    return NextResponse.json({ success: true, coupons: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
