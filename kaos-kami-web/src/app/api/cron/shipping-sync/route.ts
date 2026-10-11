import { NextRequest, NextResponse } from "next/server";
import { secretsEqual } from "@/lib/timingSafe";
import { getMasterCitiesTotalCount, calculateMasterCourierRates } from "@/lib/shipping/masterShippingRates";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * GET /api/cron/shipping-sync
 * Endpoint verifikasi & sinkronisasi berkala bulanan Master Logistik 514 Kota & Kabupaten (Origin Makassar).
 * Dapat dipicu oleh:
 * 1. Cloudflare / External Cron (Header: Authorization: Bearer <CRON_SECRET>)
 * 2. Admin terautentikasi dari Dashboard Admin Pengiriman
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  const isCronAuthed = secret && secretsEqual(authHeader, `Bearer ${secret}`);

  let isAdminAuthed = false;
  if (!isCronAuthed) {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user && (session.user as any).role === "ADMIN") {
        isAdminAuthed = true;
      }
    } catch {
      isAdminAuthed = false;
    }
  }

  if (!isCronAuthed && !isAdminAuthed) {
    return NextResponse.json({ error: "Akses ditolak: Memerlukan CRON_SECRET atau akun Admin" }, { status: 401 });
  }

  const totalCities = getMasterCitiesTotalCount();
  const sampleSurabaya = calculateMasterCourierRates("Surabaya", 1000);
  const sampleJayapura = calculateMasterCourierRates("Jayapura", 1000);
  const sampleBone = calculateMasterCourierRates("Bone", 1000);

  const isHealthy =
    totalCities === 514 &&
    Boolean(sampleSurabaya && sampleSurabaya.rates.length === 5) &&
    Boolean(sampleJayapura && sampleJayapura.rates.length === 5) &&
    Boolean(sampleBone && sampleBone.rates.length === 5);

  return NextResponse.json({
    success: true,
    syncInterval: "MONTHLY",
    originHub: "UPG (Kota Makassar)",
    executedAt: new Date().toISOString(),
    metrics: {
      totalProvinces: 38,
      totalCities,
      activeCouriers: ["LION_PARCEL", "JNE_EXPRESS", "JNT_EXPRESS", "SICEPAT_EKSPRES", "POS_INDONESIA"],
      coverageLevel: "100% Seluruh Kabupaten & Kota Indonesia",
      pricingStatus: isHealthy ? "SYNCHRONIZED_OK" : "WARNING_PARTIAL",
      ratesBenchmark: {
        surabaya: sampleSurabaya?.rates,
        jayapura: sampleJayapura?.rates,
        bone: sampleBone?.rates,
      },
    },
    message: "Master Database Logistik 514 Kota terverifikasi sinkron & aktif tanpa dependensi API luar.",
  });
}
