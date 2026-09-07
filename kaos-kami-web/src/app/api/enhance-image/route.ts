import { NextRequest, NextResponse } from "next/server";
// sharp DIHAPUS dari route ini (Sep 2026): modul native tidak bisa jalan di
// Workers (selalu 500). Tombol UI disembunyikan; endpoint dipertahankan agar
// mengembalikan 501 yang jujur, bukan 500 misterius.
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`enhance:ip:${getClientIp(req)}`, 5, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak enhance. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 5) });
    }
    return NextResponse.json(
      { error: "Fitur pertajam nonaktif sementara (pindah ke proses browser)." },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to process image" }, { status: 500 });
  }
}
