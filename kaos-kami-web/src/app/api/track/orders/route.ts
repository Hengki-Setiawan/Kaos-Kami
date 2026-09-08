import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const TrackSchema = z.object({
  phoneNumber: z.string().min(9).max(20),
  code: z.string().min(4).max(10),
});

/**
 * POST /api/track/orders — Lacak pesanan TANPA daftar: verifikasi OTP WA,
 * lalu kembalikan order milik nomor itu (lean, tanpa PII penuh).
 * OTP satu-pakai (dihapus seperti verify-otp) + rate-limit ganda.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`track:ip:${ip}`, 10, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const parsed = TrackSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "WA & kode wajib" }, { status: 400 });
    const clean = parsed.data.phoneNumber.replace(/[^0-9]/g, "");
    const phoneRl = await checkRateLimitAsync(`track:phone:${clean}`, 5, 300);
    if (phoneRl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak percobaan." }, { status: 429, headers: rateLimitHeaders(phoneRl, 5) });
    }

    const record = await db.query.Verification.findFirst({
      where: (t, { and, eq }) => and(eq(t.identifier, `otp:${clean}`), eq(t.value, hashOtp(parsed.data.code))),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    if (!record || new Date() > record.expiresAt) {
      return NextResponse.json({ error: "Kode salah atau kadaluarsa" }, { status: 400 });
    }
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${clean}`)).catch(() => {});

    const user = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.phoneNumber, clean),
      columns: { id: true },
    });
    if (!user) return NextResponse.json({ success: true, orders: [] });
    const orders = await db.query.Order.findMany({
      where: (t, { eq }) => eq(t.userId, user.id),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 10,
      columns: { id: true, orderNumber: true, status: true, totalIdr: true, createdAt: true, deliveryMethod: true },
      with: { items: { columns: { quantity: true, snapshotName: true } } },
    });
    return NextResponse.json({ success: true, orders });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
