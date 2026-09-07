import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { sendWhatsAppNotification } from "@/lib/notifications/whatsapp";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// POST { phoneNumber: "0812..." } → generate 6-digit, simpan Verification, kirim WA via Fonnte (hemat: cuma saat checkout)
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimitAsync(`otp:ip:${ip}`, 3, 300); // 3x per 5 menit
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan OTP. Silakan tunggu ${ipLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(ipLimit, 3) }
      );
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber || phoneNumber.length < 9) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }
    const clean = phoneNumber.replace(/[^0-9]/g, "");

    const phoneLimit = await checkRateLimitAsync(`otp:phone:${clean}`, 3, 300);
    if (phoneLimit.isLimited) {
      return NextResponse.json(
        { error: `Nomor ini sudah meminta OTP 3x. Silakan tunggu ${phoneLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(phoneLimit, 3) }
      );
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan di Verification (identifier = phone)
    await db.insert(Verification).values({
      id: nanoid(),
      identifier: `otp:${clean}`,
      value: code,
      expiresAt,
    });

    // Kirim WA. Kode OTP TIDAK PERNAH dikembalikan ke client di production —
    // mock code hanya untuk development lokal tanpa Fonnte.
    const token = process.env.FONNTE_TOKEN;
    const isProd = process.env.NODE_ENV === "production";
    if (!token) {
      console.log(`[OTP Mock] ${clean} → ${code}`);
      if (isProd) {
        return NextResponse.json(
          { error: "Layanan OTP belum dikonfigurasi. Hubungi admin." },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: true, mock: true, code, message: "OTP mock (Fonnte belum set)" });
    }

    const res = await sendWhatsAppNotification(clean, `*Kaos Kami — Kode OTP*\nKode verifikasi WA kamu: *${code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.`);
    if (!res.success) {
      console.warn("Fonnte OTP fail, fallback log", res.error);
      if (isProd) {
        return NextResponse.json(
          { error: "Gagal mengirim OTP ke WA. Coba lagi sesaat." },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: true, mock: true, code, warning: res.error });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WA" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
