import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { Account, Session, User, Verification } from "@/lib/drizzle-schema";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const ConfirmResetPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  code: z.string().regex(/^\d{6}$/, "Kode verifikasi harus 6 digit angka"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => null);
    const parsed = ConfirmResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // Anti brute-force 6-digit: maks 5x percobaan per 5 menit per email & 10x per IP
    const emailLimit = await checkRateLimitAsync(`reset-confirm:target:${cleanEmail}`, 5, 300);
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan salah. Tunggu ${emailLimit.resetSeconds} detik lalu minta kode baru.` },
        { status: 429, headers: rateLimitHeaders(emailLimit, 5) }
      );
    }

    const ipLimit = await checkRateLimitAsync(`reset-confirm:ip:${ip}`, 10, 300);
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
        and(eq(t.identifier, `pwd-reset-otp:${cleanEmail}`), eq(t.value, hashedCode)),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    if (!record || new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Kode verifikasi salah atau sudah kadaluarsa. Silakan minta kode baru." },
        { status: 400 }
      );
    }

    // Hapus OTP yang sudah dipakai
    await db.delete(Verification).where(eq(Verification.identifier, `pwd-reset-otp:${cleanEmail}`)).catch(() => {});

    // Cari user di database
    const existingUser = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.email, cleanEmail),
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Akun pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hash password baru dengan algoritma bawaan better-auth scrypt
    const hashedPassword = await hashPassword(newPassword);

    // Cek credential account
    const existingAccount = await db.query.Account.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.userId, existingUser.id), eq(t.providerId, "credential")),
    });

    const now = new Date();
    if (existingAccount) {
      await db
        .update(Account)
        .set({
          password: hashedPassword,
          updatedAt: now,
        })
        .where(
          and(eq(Account.userId, existingUser.id), eq(Account.providerId, "credential"))
        );
    } else {
      // User sebelumnya mendaftar via Social OAuth, buatkan akun credential agar bisa login via email+password
      await db.insert(Account).values({
        id: nanoid(),
        userId: existingUser.id,
        accountId: existingUser.id,
        providerId: "credential",
        issuer: "local:credential",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update passwordHash di tabel User (sinkronisasi legacy field)
    await db
      .update(User)
      .set({
        passwordHash: hashedPassword,
        updatedAt: now,
      })
      .where(eq(User.id, existingUser.id));

    // Cabut seluruh sesi aktif untuk keamanan (user harus login ulang dengan kredensial baru)
    await db.delete(Session).where(eq(Session.userId, existingUser.id)).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui! Silakan masuk menggunakan password baru Anda.",
    });
  } catch (err: any) {
    console.error("[Confirm Reset Password] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
