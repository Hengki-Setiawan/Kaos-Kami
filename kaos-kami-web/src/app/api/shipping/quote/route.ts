import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteZones, validateExpeditionSelection } from "@/lib/shipping/zones";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Quote ekspedisi (keputusan owner #20=A, 23 Okt 2026): TANPA live API pihak ketiga.
// Urutan tarif: master 514 kota/kabupaten → tabel zona → flat 25k (di checkout).
// Harga FINAL tetap di-resolve server saat checkout (bukan dari sini).
const QuerySchema = z.object({
  city: z.string().max(80).default(""),
  postalCode: z.string().regex(/^\d{5}$/).optional().or(z.literal("")),
  weightGrams: z.coerce.number().int().min(100).max(30000).default(1000),
  // Samakan bucket berat dengan checkout (Math.max(250, totalQty*250)):
  // kirim ?qty=N (jumlah pcs) agar quote memakai berat yang SAMA persis
  // dengan yang dipakai checkout — tanpa ini quote 1000g vs checkout
  // 250g×qty = tarif master beda bucket. Bila qty ada, ia menang atas weightGrams.
  qty: z.coerce.number().int().min(1).max(120).optional(),
  deliveryMethod: z.enum(["PICKUP", "FREE_MAKASSAR", "EXPEDITION_MANUAL"]).optional(),
  zoneId: z.string().max(64).optional(),
});

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`ship-quote:ip:${ip}`, 20, 60);
  if (rl.isLimited) {
    return NextResponse.json(
      { error: "Terlalu sering cek ongkir. Tunggu sebentar." },
      { status: 429, headers: rateLimitHeaders(rl, 20) }
    );
  }
  const sp = new URL(req.url).searchParams;
  const parsed = QuerySchema.safeParse({
    city: sp.get("city") || "",
    postalCode: sp.get("postalCode") || "",
    weightGrams: sp.get("weightGrams") || undefined,
    qty: sp.get("qty") || undefined,
    deliveryMethod: sp.get("deliveryMethod") || undefined,
    zoneId: sp.get("zoneId") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
  const { city, postalCode, deliveryMethod, zoneId } = parsed.data;
  // Berat SAMA dengan checkout: Math.max(250, totalQty*250) (±250g per pcs).
  const weightGrams =
    parsed.data.qty !== undefined ? Math.max(250, parsed.data.qty * 250) : parsed.data.weightGrams;

  // EXPEDITION_MANUAL tanpa penanda tujuan apa pun = 400 jujur (bukan
  // fallback diam-diam ke zona default yang menyesatkan).
  if (deliveryMethod === "EXPEDITION_MANUAL") {
    const sel = validateExpeditionSelection({ postalCode, zoneId, city });
    if (!sel.ok) return NextResponse.json({ error: sel.error }, { status: 400 });
  }

  // Master Database 514 Kota & Kabupaten (JNE, J&T, Lion Parcel origin Makassar)
  // — sumber tarif pertama setelah pencabutan live API (#20=A).
  const { calculateMasterCourierRates } = await import("@/lib/shipping/masterShippingRates");
  const masterQuote = calculateMasterCourierRates(city || postalCode || "", weightGrams);
  if (masterQuote && masterQuote.rates.length > 0) {
    return NextResponse.json({
      source: "master-tariff",
      rates: masterQuote.rates,
      city: masterQuote.city.city,
      province: masterQuote.city.province,
      note: "Tarif master logistik 514 kota (origin Makassar). Final dihitung server saat checkout.",
    });
  }

  // Fallback terakhir: tabel zona.
  const zones = await quoteZones(city);
  return NextResponse.json({
    source: "zone",
    zones,
    note: "Tarif estimasi tabel. Final dihitung server saat checkout.",
  });
}
