import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Verification } from "@/lib/drizzle-schema";
import { hashOtp, randomOtp6 } from "@/lib/otp";
import { sendWhatsAppNotification } from "@/lib/notifications/whatsapp";
import { canonicalPhone } from "@/lib/phone";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const OtpRequestSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{9,16}$/, "Nomor WA tidak valid"),
});

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

    const parsed = OtpRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }
    // I3: kunci kanonis 62… agar 0812/62812/+62812 = SATU kunci & owner-match.
    const clean = canonicalPhone(parsed.data.phoneNumber);
    if (!clean) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    // KEBIJAKAN OTP SEKALI SEUMUR HIDUP (owner 20 Sep 2026): pemilik nomor yg
    // sudah phoneVerified TIDAK dikirimi WA lagi (nol kuota). Hanya berlaku
    // bila peminta = pemilik (sesi login + nomor cocok) — tamu/orang lain
    // tetap lewat OTP normal agar checkout tamu & anti-culik-nomor terjaga.
    // Varian kanonis 0.../62... dicocokkan karena histori menyimpan keduanya.
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
      const uid = (session?.user as any)?.id as string | undefined;
      if (uid) {
        const me = await db.query.User.findFirst({
          where: (t, { eq }) => eq(t.id, uid),
          columns: { id: true, phoneNumber: true, phoneVerified: true },
        });
        const myCanon = canonicalPhone(me?.phoneNumber || "");
        if (me?.phoneVerified && myCanon && myCanon === clean) {
          return NextResponse.json({
            success: true,
            alreadyVerified: true,
            message: "Nomor ini sudah terverifikasi permanen — lanjut tanpa kode OTP.",
          });
        }
      }
    } catch {}

    const phoneLimit = await checkRateLimitAsync(`otp:phone:${clean}`, 3, 300);
    if (phoneLimit.isLimited) {
      return NextResponse.json(
        { error: `Nomor ini sudah meminta OTP 3x. Silakan tunggu ${phoneLimit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(phoneLimit, 3) }
      );
    }
    // A2: KIRIM DULU, SIMPAN BELAKANGAN. Bila Fonnte 502, tak ada kode yatim
    // yg menghanguskan kuota 3x/5 mnt user. Kode hanya disimpan bila WA terkirim.
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Layanan WhatsApp OTP belum dikonfigurasi (FONNTE_TOKEN kosong). Hubungi admin." },
        { status: 503 }
      );
    }

    // CSPRNG (bukan Math.random). Satu kode aktif: hanguskan lama dulu.
    const code = randomOtp6();
    const res = await sendWhatsAppNotification(clean, `*Kaos Kami — Kode OTP*\nKode verifikasi WA kamu: *${code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.`);
    if (!res.success) {
      console.warn("Fonnte OTP fail:", res.error);
      return NextResponse.json(
        { error: res.error || "Gagal mengirim OTP ke WA. Kuota permintaan TIDAK berkurang — coba lagi sesaat." },
        { status: 502 }
      );
    }

    // WA terkirim → baru simpan kode (hanguskan kode lama nomor ini).
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${clean}`));
    await db.insert(Verification).values({
      id: nanoid(),
      identifier: `otp:${clean}`,
      value: hashOtp(code),
      expiresAt,
    });

    return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
