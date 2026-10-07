import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { User, Verification } from "@/lib/drizzle-schema";
import { hashOtp, randomOtp6 } from "@/lib/otp";
import { sendEmailPasswordResetOtp } from "@/lib/notifications/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const SendResetOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limiting: 3x permintaan per 5 menit per IP
    const ipLimit = await checkRateLimitAsync(`reset-otp:ip:${ip}`, 3, 300);
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan reset password. Silakan tunggu ${ipLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(ipLimit, 3) }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = SendResetOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data email tidak valid" },
        { status: 400 }
      );
    }

    const { email, turnstileToken } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // Rate limiting per email: 3x per 5 menit
    const emailLimit = await checkRateLimitAsync(`reset-otp:target:${cleanEmail}`, 3, 300);
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { error: `Email ini sudah meminta kode reset 3x. Silakan tunggu ${emailLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(emailLimit, 3) }
      );
    }

    // Verifikasi Cloudflare Turnstile jika token dikirim atau secret aktif
    if (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY && turnstileToken) {
      const turnstileRes = await verifyTurnstileToken(turnstileToken, ip);
      if (!turnstileRes.success) {
        return NextResponse.json(
          { error: "Verifikasi keamanan Turnstile gagal. Silakan muat ulang halaman dan coba lagi." },
          { status: 403 }
        );
      }
    }

    // Cek apakah akun terdaftar di database User
    const existingUser = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.email, cleanEmail),
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Email belum terdaftar di Kaos Kami. Silakan periksa kembali atau pilih tab 'DAFTAR'." },
        { status: 404 }
      );
    }

    // Generate kode OTP 6-digit (CSPRNG)
    const code = randomOtp6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Hanguskan kode lama untuk email ini & simpan OTP baru
    await db.delete(Verification).where(eq(Verification.identifier, `pwd-reset-otp:${cleanEmail}`)).catch(() => {});
    await db.insert(Verification).values({
      id: nanoid(),
      identifier: `pwd-reset-otp:${cleanEmail}`,
      value: hashOtp(code),
      expiresAt,
    });

    // Kirim email OTP reset password
    const emailResult = await sendEmailPasswordResetOtp(cleanEmail, code, existingUser.name || undefined);
    if (!emailResult.success) {
      console.warn("[Reset Password OTP] Gagal mengirim email:", emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || "Gagal mengirim email kode verifikasi. Coba beberapa saat lagi." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi 6-digit telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.`,
    });
  } catch (err: any) {
    console.error("[Send Reset OTP] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
