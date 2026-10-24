import { NextRequest, NextResponse } from "next/server";
import { searchMasterCities } from "@/lib/shipping/masterShippingRates";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Autocomplete kota/kabupaten → kode pos se-Indonesia.
// Sumber: master data 514 kota (keputusan owner #20=A — API lokasi pihak ketiga dicabut).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`ship-loc:ip:${ip}`, 20, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 20) });
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ locations: [] });

  const list = searchMasterCities(q).map((c) => ({
    subdistrictId: c.id,
    postalCode: c.postalCode,
    label: `${c.city}, ${c.province} (${c.postalCode})`,
  }));

  return NextResponse.json({ locations: list });
}
