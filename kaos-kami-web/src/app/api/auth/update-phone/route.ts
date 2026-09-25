import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { User, Verification } from "@/lib/drizzle-schema";
import { normalizePhoneId } from "@/lib/phone";
import { hashOtp } from "@/lib/otp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const Schema = z.object({
  phoneNumber: z.string().min(9).max(20),
  otpCode: z.string().regex(/^\d{6}$/, "Kode OTP 6 digit wajib"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
    }

    const clean = normalizePhoneId(parsed.data.phoneNumber);

    // A3: ganti nomor WAJIB OTP milik nomor BARU (hash+expiry+owner-match+satu-pakai).
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`update-phone:ip:${ip}`, 10, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const { canonicalPhone } = await import("@/lib/phone");
    const canonNew = canonicalPhone(clean);
    const otpRecord = await db.query.Verification.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.identifier, `otp:${canonNew}`), eq(t.value, hashOtp(parsed.data.otpCode))),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa. Minta kode ke nomor BARU dulu." }, { status: 401 });
    }
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${canonNew}`)).catch(() => {});

    // Cek apakah nomor sudah dipakai user lain
    const existing = await db.query.User.findFirst({
      where: (t, { and, eq, ne }) => and(eq(t.phoneNumber, clean), ne(t.id, session.user.id)),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Nomor WhatsApp ini sudah digunakan oleh akun lain." },
        { status: 409 }
      );
    }

    // KEBIJAKAN OTP SEKALI SEUMUR HIDUP (owner 20 Sep 2026): ganti nomor =
    // verifikasi lama HANGUS. Nomor baru wajib OTP sekali sebelum bebas OTP.
    const current = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, session.user.id),
      columns: { id: true, phoneNumber: true },
    });
    const changed =
      (current?.phoneNumber || "").replace(/[^0-9]/g, "") !== clean.replace(/[^0-9]/g, "");
    await db
      .update(User)
      .set({
        phoneNumber: clean,
        ...(changed ? { phoneVerified: false } : {}),
        updatedAt: new Date(),
      })
      .where(eq(User.id, session.user.id));

    return NextResponse.json({
      success: true,
      phoneNumber: clean,
      needsOtp: changed,
      message: changed
        ? "Nomor diganti — verifikasi OTP sekali untuk nomor baru ini."
        : "Nomor sama — status verifikasi dipertahankan.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
