import { NextRequest, NextResponse } from "next/server";
import { awLocationsSearch } from "@/lib/shipping/agenwebsite";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Proxy autocomplete kecamatan → kode pos (key tetap di server).
// Tanpa key → 503 dengan pesan jelas (client pakai input manual).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`ship-loc:ip:${ip}`, 20, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 20) });
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 3) return NextResponse.json({ locations: [] });
  const list = await awLocationsSearch(q);
  if (!list) {
    return NextResponse.json(
      { error: "Layanan lokasi belum aktif. Ketik kota manual." },
      { status: 503 }
    );
  }
  return NextResponse.json({ locations: list });
}
