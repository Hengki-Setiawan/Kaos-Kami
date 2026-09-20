import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { User, Verification } from "@/lib/drizzle-schema";
import { hashOtp, randomOtp6 } from "@/lib/otp";
import { sendEmailOtp } from "@/lib/notifications/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const SendEmailOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  name: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limiting: 3x permintaan per 5 menit per IP
    const ipLimit = await checkRateLimitAsync(`email-otp:ip:${ip}`, 3, 300);
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan OTP email. Silakan tunggu ${ipLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(ipLimit, 3) }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = SendEmailOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, name, turnstileToken } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // Rate limiting per email: 3x per 5 menit
    const emailLimit = await checkRateLimitAsync(`email-otp:target:${cleanEmail}`, 3, 300);
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { error: `Email ini sudah meminta OTP 3x. Silakan tunggu ${emailLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(emailLimit, 3) }
      );
    }

    // Verifikasi Cloudflare Turnstile Captcha jika token dikirim atau secret aktif
    if (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY && turnstileToken) {
      const turnstileRes = await verifyTurnstileToken(turnstileToken, ip);
      if (!turnstileRes.success) {
        return NextResponse.json(
          { error: "Verifikasi keamanan Turnstile gagal. Silakan muat ulang halaman dan coba lagi." },
          { status: 403 }
        );
      }
    }

    // Cek apakah email sudah terdaftar di database User
    const existingUser = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.email, cleanEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan pilih tab 'MASUK' untuk masuk ke akun Anda." },
        { status: 409 }
      );
    }

    // Generate kode OTP 6-digit (CSPRNG)
    const code = randomOtp6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Simpan ke tabel Verification (hanguskan kode lama untuk email ini)
    await db.delete(Verification).where(eq(Verification.identifier, `email-otp:${cleanEmail}`)).catch(() => {});
    await db.insert(Verification).values({
      id: nanoid(),
      identifier: `email-otp:${cleanEmail}`,
      value: hashOtp(code),
      expiresAt,
    });

    // Kirim email OTP
    const emailResult = await sendEmailOtp(cleanEmail, code, name);
    if (!emailResult.success) {
      console.warn("[Email OTP] Gagal mengirim:", emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || "Gagal mengirim email verifikasi. Coba beberapa saat lagi." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau folder spam Anda.`,
    });
  } catch (err: any) {
    console.error("[Email OTP] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
