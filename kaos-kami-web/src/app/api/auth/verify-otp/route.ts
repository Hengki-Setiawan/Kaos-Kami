import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, code } = await req.json();
    if (!phoneNumber || !code) return NextResponse.json({ error: "WA & kode wajib" }, { status: 400 });
    const clean = phoneNumber.replace(/[^0-9]/g, "");
    const ip = getClientIp(req);

    // Anti brute-force 6-digit: maks 5x tebak / 5 menit per nomor & per IP.
    const phoneLimit = await checkRateLimitAsync(`otp-verify:phone:${clean}`, 5, 300);
    if (phoneLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Tunggu ${phoneLimit.resetSeconds} detik lalu minta kode baru.` },
        { status: 429, headers: rateLimitHeaders(phoneLimit, 5) }
      );
    }
    const ipLimit = await checkRateLimitAsync(`otp-verify:ip:${ip}`, 10, 300);
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan dari jaringan ini." },
        { status: 429, headers: rateLimitHeaders(ipLimit, 10) }
      );
    }

    const record = await db.query.Verification.findFirst({
      where: (t, { and, eq }) => and(eq(t.identifier, `otp:${clean}`), eq(t.value, hashOtp(code))),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    // Satu pesan untuk salah & kadaluarsa (anti-oracle brute-force).
    if (!record || new Date() > record.expiresAt) {
      return NextResponse.json({ error: "Kode salah atau kadaluarsa" }, { status: 400 });
    }

    // Hapus SEMUA kode nomor ini (satu-pakai, tanpa sisa).
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${clean}`)).catch(() => {});

    // Tandai phone terverifikasi — bisa set User.phoneNumber verified jika ada session, tapi untuk checkout cukup return success
    return NextResponse.json({ success: true, verified: true, phone: clean });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
