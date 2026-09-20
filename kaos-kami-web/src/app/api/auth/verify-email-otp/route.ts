import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const VerifyEmailOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  code: z.string().regex(/^\d{6}$/, "Kode verifikasi harus 6 digit angka"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => null);
    const parsed = VerifyEmailOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // Anti brute-force 6-digit: maks 5x percobaan per 5 menit per email & IP
    const emailLimit = await checkRateLimitAsync(`verify-email-otp:target:${cleanEmail}`, 5, 300);
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan salah. Tunggu ${emailLimit.resetSeconds} detik lalu minta kode baru.` },
        { status: 429, headers: rateLimitHeaders(emailLimit, 5) }
      );
    }

    const ipLimit = await checkRateLimitAsync(`verify-email-otp:ip:${ip}`, 10, 300);
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan dari jaringan ini." },
        { status: 429, headers: rateLimitHeaders(ipLimit, 10) }
      );
    }

    // Cari record OTP di tabel Verification
    const hashedCode = hashOtp(code);
    const record = await db.query.Verification.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.identifier, `email-otp:${cleanEmail}`), eq(t.value, hashedCode)),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    if (!record || new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Kode verifikasi salah atau sudah kadaluarsa. Silakan minta kode baru." },
        { status: 400 }
      );
    }

    // Hapus OTP yang sudah dipakai
    await db.delete(Verification).where(eq(Verification.identifier, `email-otp:${cleanEmail}`)).catch(() => {});

    // Buat token sementara kepemilikan terverifikasi untuk pendaftaran (berlaku 15 menit)
    const verificationTicket = hashOtp(`verified:${cleanEmail}:${Date.now()}`);
    await db.delete(Verification).where(eq(Verification.identifier, `email-verified:${cleanEmail}`)).catch(() => {});
    await db.insert(Verification).values({
      id: crypto.randomUUID(),
      identifier: `email-verified:${cleanEmail}`,
      value: verificationTicket,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      verified: true,
      email: cleanEmail,
      verificationTicket,
      message: "Email berhasil diverifikasi!",
    });
  } catch (err: any) {
    console.error("[Verify Email OTP] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
