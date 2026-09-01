import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification } from "@/lib/notifications/whatsapp";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";

// POST { phoneNumber: "0812..." } → generate 6-digit, simpan Verification, kirim WA via Fonnte (hemat: cuma saat checkout)
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = checkRateLimit(`otp:ip:${ip}`, 3, 300); // 3x per 5 menit
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan OTP. Silakan tunggu ${ipLimit.resetSeconds} detik.` },
        { status: 429 }
      );
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber || phoneNumber.length < 9) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }
    const clean = phoneNumber.replace(/[^0-9]/g, "");

    const phoneLimit = checkRateLimit(`otp:phone:${clean}`, 3, 300);
    if (phoneLimit.isLimited) {
      return NextResponse.json(
        { error: `Nomor ini sudah meminta OTP 3x. Silakan tunggu ${phoneLimit.resetSeconds} detik.` },
        { status: 429 }
      );
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan di Verification (identifier = phone)
    await prisma.verification.create({
      data: { identifier: `otp:${clean}`, value: code, expiresAt },
    });

    // Kirim WA (fail-safe: jika Fonnte off, tetap return code untuk dev)
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      console.log(`[OTP Mock] ${clean} → ${code}`);
      return NextResponse.json({ success: true, mock: true, code, message: "OTP mock (Fonnte belum set)" });
    }

    const res = await sendWhatsAppNotification(clean, `*Kaos Kami — Kode OTP*\nKode verifikasi WA kamu: *${code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.`);
    if (!res.success) {
      console.warn("Fonnte OTP fail, fallback log", res.error);
      return NextResponse.json({ success: true, mock: true, code, warning: res.error });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WA" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
