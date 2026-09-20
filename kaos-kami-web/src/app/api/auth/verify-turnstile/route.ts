import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/security/rateLimiter";

const Schema = z.object({
  token: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    // Jika Turnstile sengaja dinonaktifkan via environment variable atau secret belum diset di dev
    if (!secretKey) {
      return NextResponse.json({
        success: true,
        bypassed: true,
        message: "Turnstile secret belum dikonfigurasi, bypass untuk pengujian lokal.",
      });
    }

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Token Turnstile wajib disertakan" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const result = await verifyTurnstileToken(parsed.data.token, ip);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Verifikasi captcha keamanan gagal. Silakan coba lagi.",
          details: result.errorCodes,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
