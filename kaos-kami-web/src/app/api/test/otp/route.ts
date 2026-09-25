import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { hashOtp, randomOtp6 } from "@/lib/otp";
import { isOtpPeekAllowed } from "@/lib/testOtpPeek";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const PeekRequestSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{9,16}$/, "Nomor WA tidak valid"),
});

// POST /api/test/otp { phoneNumber } → { success, code, expiresInSec }.
//
// INTIP-OTP OPSI-1 (keputusan owner 2026-09-24): ganti bakar-WA untuk run
// regresi. Kode dibuat + disimpan persis seperti send-otp (hash pepper,
// `otp:<kanonis>`, 5 menit, hanguskan lama) TANPA kirim Fonnte — lalu
// diverifikasi lewat /api/auth/verify-otp NORMAL (sekali-pakai + rate
// 5/300 otomatis berlaku, tanpa cabang khusus di verify!).
//
// KEAMANAN (fail-closed, PANDUAN-RUNNER §14):
// - Tanpa E2E_ALLOW_OTP_PEEK="YA" → 404 (sembunyikan keberadaan endpoint).
// - NODE_ENV/DUITKU_ENV production → 404 (tak ada bypass di prod, titik).
// - Nomor di luar E2E_OTP_PEEK_NUMBERS → 404.
// - Rate: 10/300 per IP + 5/300 per nomor (lebih longgar dari Fonnte 3/300
//   karena nol biaya, tetap anti-brute).
// - Audit: log masked (4+****+2, TANPA kode). Kode JANGAN ditulis ke file
//   oleh runner (pakai langsung <5 menit).
// - RENCANA HAPUS saat E2E 100%: hapus file ini + lib/testOtpPeek.ts +
//   testnya + env (lihat §14) → probe wajib 404.
export async function POST(req: NextRequest) {
  try {
    const parsed = PeekRequestSchema.safeParse(await req.json().catch(() => ({})));
    const gate = isOtpPeekAllowed(process.env, parsed.success ? parsed.data.phoneNumber : undefined);
    if (!gate.ok || !parsed.success) {
      // 404 sengaja (bukan 401/403): jangan beri tahu pemindai bahwa
      // endpoint ini ada. Alasan hanya di log server.
      console.warn(`[otp-peek] DITOLAK (${gate.ok ? "zod" : gate.reason})`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const clean = gate.canonical;

    const ip = getClientIp(req);
    const ipLimit = await checkRateLimitAsync(`otp-peek:ip:${ip}`, 10, 300);
    if (ipLimit.isLimited) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: rateLimitHeaders(ipLimit, 10) });
    }
    const phoneLimit = await checkRateLimitAsync(`otp-peek:phone:${clean}`, 5, 300);
    if (phoneLimit.isLimited) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: rateLimitHeaders(phoneLimit, 5) });
    }

    // Kode baru (hanguskan lama) — verifying path SAMA dengan OTP WA.
    const code = randomOtp6();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${clean}`));
    await db.insert(Verification).values({
      id: nanoid(),
      identifier: `otp:${clean}`,
      value: hashOtp(code),
      expiresAt,
    });

    console.warn(`[otp-peek] DIBERIKAN untuk ${clean.slice(0, 4)}****${clean.slice(-2)} (tanpa WA)`);
    return NextResponse.json({ success: true, code, expiresInSec: 300 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
