import { NextRequest, NextResponse } from "next/server";
import { awLocationsSearch } from "@/lib/shipping/agenwebsite";
import { searchMasterCities } from "@/lib/shipping/masterShippingRates";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Autocomplete kota/kabupaten → kode pos se-Indonesia.
// Menggunakan AgenWebsite API jika tersedia, dan fallback otomatis ke master data 514 kota se-Indonesia.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`ship-loc:ip:${ip}`, 20, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 20) });
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ locations: [] });

  let list = await awLocationsSearch(q).catch(() => null);
  if (!list || list.length === 0) {
    const fallbackCities = searchMasterCities(q);
    list = fallbackCities.map((c) => ({
      subdistrictId: c.id,
      postalCode: c.postalCode,
      label: `${c.city}, ${c.province} (${c.postalCode})`,
    }));
  }

  return NextResponse.json({ locations: list });
}
