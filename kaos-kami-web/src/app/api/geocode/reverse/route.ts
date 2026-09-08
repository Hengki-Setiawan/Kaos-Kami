import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Proxy reverse-geocode via server (bukan direct dari browser): Nominatim
// mewajibkan User-Agent + usage policy; direct-call dari client rawan diblok
// dan membocorkan pola trafik. Timeout 8s, fail-soft (null, bukan 500).
const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`geocode:ip:${ip}`, 10, 60);
  if (rl.isLimited) {
    return NextResponse.json(
      { error: "Terlalu sering pakai GPS. Tunggu sebentar." },
      { status: 429, headers: rateLimitHeaders(rl, 10) }
    );
  }
  const sp = new URL(req.url).searchParams;
  const parsed = QuerySchema.safeParse({ lat: sp.get("lat"), lon: sp.get("lon") });
  if (!parsed.success) return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsed.data.lat}&lon=${parsed.data.lon}&zoom=16&addressdetails=1&accept-language=id`,
      {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "KaosKami-Makassar/1.0 (UMKM apparel Makassar; kontak via aplikasi)",
          Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://kaos-kami-3d.hengkisetiawan461.workers.dev",
        },
      }
    );
    clearTimeout(t);
    if (!res.ok) return NextResponse.json({ result: null, error: "Layanan peta sibuk" });
    const j: any = await res.json();
    const a = j?.address || {};
    return NextResponse.json({
      result: {
        district: a.suburb || a.village || a.town || a.city_district || "",
        city: a.city || a.regency || a.county || "",
        province: a.state || "",
        displayName: j?.display_name || "",
      },
    });
  } catch {
    return NextResponse.json({ result: null, error: "Layanan peta tidak merespons" });
  }
}
