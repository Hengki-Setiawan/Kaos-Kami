import { NextRequest, NextResponse } from "next/server";
import { getR2PublicUrl, listR2Objects } from "@/lib/r2";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Publik: daftar foto lookbook R2 untuk beranda (file-nya memang publik).
// Gagal R2 → list kosong (client pakai fallback statis), bukan 500.
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`lookbook:ip:${getClientIp(req)}`, 60, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    }
    const list = await listR2Objects("lookbook/");
    if (!list.success) return NextResponse.json({ items: [] });
    return NextResponse.json(
      { items: list.keys.map((key) => ({ key, url: getR2PublicUrl(key) })) },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
