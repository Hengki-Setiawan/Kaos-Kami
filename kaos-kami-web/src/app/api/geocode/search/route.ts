import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Proxy geocode search via server: Nominatim OpenStreetMap
// Membantu autocomplete alamat di seluruh Indonesia (jalan, kelurahan, kecamatan, kota)
// Timeout 8s, fail-soft (array kosong, bukan 500).

const SearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`geocode-search:ip:${ip}`, 20, 60);
  if (rl.isLimited) {
    return NextResponse.json(
      { error: "Terlalu banyak pencarian lokasi. Tunggu sebentar." },
      { status: 429, headers: rateLimitHeaders(rl, 20) }
    );
  }

  const sp = new URL(req.url).searchParams;
  const parsed = SearchSchema.safeParse({ q: sp.get("q") });
  if (!parsed.success) {
    return NextResponse.json({ results: [], error: "Kueri pencarian minimal 2 karakter" }, { status: 400 });
  }

  const query = parsed.data.q;

  // Fast-path: Kata kunci seputar Workshop Kaos Kami Tallo Makassar
  const lower = query.toLowerCase();
  if (lower.includes("kaos kami") || lower.includes("galangan kapal") || lower.includes("kaluku bodoa")) {
    return NextResponse.json({
      results: [
        {
          lat: -5.106018,
          lon: 119.432396,
          displayName: "Workshop Kaos Kami Makassar — Jl. Galangan Kapal, Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Kota Makassar",
          district: "Tallo",
          city: "Kota Makassar",
          province: "Sulawesi Selatan",
        },
      ],
    });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const upstreamUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query
    )}&countrycodes=id&limit=6&addressdetails=1&accept-language=id`;

    const res = await fetch(upstreamUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "KaosKami-Makassar/1.0 (UMKM apparel Makassar; kontak via aplikasi)",
        Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://kaoskami.biz.id",
      },
    });
    clearTimeout(t);

    if (!res.ok) {
      return NextResponse.json({ results: [], error: "Layanan pencarian peta sedang sibuk" }, { status: 502 });
    }

    const items: any[] = await res.json().catch(() => []);
    if (!Array.isArray(items)) {
      return NextResponse.json({ results: [] });
    }

    const formatted = items.map((item) => {
      const a = item.address || {};
      const district = a.suburb || a.village || a.town || a.city_district || "";
      const city = a.city || a.regency || a.county || "";
      const province = a.state || "";
      return {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name || "",
        district,
        city,
        province,
      };
    });

    return NextResponse.json({ results: formatted });
  } catch (e: any) {
    console.warn("Geocode search upstream error:", e?.message);
    return NextResponse.json({ results: [], error: "Layanan pencarian tidak merespons" }, { status: 502 });
  }
}
