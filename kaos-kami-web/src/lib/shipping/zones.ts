import { asc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { ExpeditionZone } from "@/lib/drizzle-schema";

export interface ZoneQuote {
  id: string;
  city: string;
  province: string;
  courier: string;
  service: string;
  costIdr: number;
  etdLabel: string;
}

// Fallback bila tabel kosong / tidak cocok: sama dengan perilaku lama (flat).
export const DEFAULT_EXPEDITION_COST_IDR = 25000;

function toQuote(z: typeof ExpeditionZone.$inferSelect): ZoneQuote {
  return {
    id: z.id,
    city: z.city,
    province: z.province,
    courier: z.courier,
    service: z.service,
    costIdr: z.costIdr,
    etdLabel: z.etdLabel,
  };
}

export async function listActiveZones(): Promise<ZoneQuote[]> {
  const rows = await db
    .select()
    .from(ExpeditionZone)
    .where(eq(ExpeditionZone.isActive, true))
    .orderBy(asc(ExpeditionZone.sortOrder), asc(ExpeditionZone.city));
  return rows.map(toQuote);
}

/** Quote per kota (cocok substring, case-insensitive ASCII). Fallback: zona default. */
export async function quoteZones(city?: string): Promise<ZoneQuote[]> {
  const q = (city || "").trim();
  if (q.length >= 2) {
    const rows = await db
      .select()
      .from(ExpeditionZone)
      .where(like(ExpeditionZone.city, `%${q.replace(/[%_]/g, "")}%`))
      .orderBy(asc(ExpeditionZone.sortOrder), asc(ExpeditionZone.costIdr));
    const active = rows.filter((r) => r.isActive);
    if (active.length > 0) return active.map(toQuote);
  }
  return listActiveZones();
}

export interface ResolvedExpedition {
  costIdr: number;
  zone: ZoneQuote | null;
}

/**
 * Resolve ongkir ekspedisi 100% SERVER-SIDE (jangan percaya harga client).
 * Prioritas: zoneId valid+aktif → cocok kota PERSIS (case-insensitive) →
 * zona default → flat. Substring HANYA untuk tampilan daftar, BUKAN harga
 * (audit: "a" cocok puluhan zona lalu ambil termurah = undercharge Papua).
 */
export async function resolveExpeditionCost(opts: {
  zoneId?: string;
  city?: string;
}): Promise<ResolvedExpedition> {
  if (opts.zoneId) {
    const [z] = await db
      .select()
      .from(ExpeditionZone)
      .where(eq(ExpeditionZone.id, opts.zoneId));
    if (z && z.isActive) return { costIdr: z.costIdr, zone: toQuote(z) };
  }
  const q = (opts.city || "").trim().toLowerCase();
  if (q.length >= 2) {
    const rows = await db.select().from(ExpeditionZone).where(eq(ExpeditionZone.isActive, true));
    // Cocok persis dulu (nama kota sama), lalu awalan — bukan substring bebas.
    const exact =
      rows.find((r) => r.city.trim().toLowerCase() === q) ||
      rows.find((r) => r.city.trim().toLowerCase().startsWith(q) || q.startsWith(r.city.trim().toLowerCase()));
    if (exact && exact.id !== "zone_default_lainnya") {
      return { costIdr: exact.costIdr, zone: toQuote(exact) };
    }
  }
  const zones = await listActiveZones();
  const fallback = zones.find((z) => z.id === "zone_default_lainnya") || zones[0];
  if (fallback) return { costIdr: fallback.costIdr, zone: fallback };
  return { costIdr: DEFAULT_EXPEDITION_COST_IDR, zone: null };
}

// ------------------------------------------------------------------
// PROVIDER EKSPEDISI MASA DEPAN (v2): colok API ongkir real-time
// (mis. api.co.id Rp5/hit, Biteship, dsb) bila volume order justify.
// Kontrak: terima kota tujuan (+berat gram), kembalikan daftar tarif.
// Selama getExpeditionProvider() null → pakai tabel ExpeditionZone (v1).
// Lihat Blueprint/PENGIRIMAN.md § Provider.
// ------------------------------------------------------------------
export interface ExpeditionRate {
  courier: string;
  service: string;
  costIdr: number;
  etdLabel: string;
}

export interface ExpeditionProvider {
  readonly name: string;
  quote(destinationCity: string, weightGrams: number): Promise<ExpeditionRate[]>;
}

export function getExpeditionProvider(): ExpeditionProvider | null {
  // Belum ada provider terdaftar (butuh API key owner). v1 = tabel milik sendiri.
  return null;
}
