/**
 * SSOT normalisasi slug apparel (K-B, Sep 2026).
 *
 * Kontrak slug web: HANYA 8 slug ini yang valid —
 * "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt" | "cap" | "pants" | "shorts".
 * Fase 13: "cap"/"pants"/"shorts" (mockup ya, order tidak) DITERIMA di
 * sini agar DITOLAK dengan pesan JUJUR di hilir (guard orderable checkout
 * 400), bukan pesan generik "tak dikenal". Keterpesanan diatur flag
 * orderable APPAREL_CATALOG, bukan daftar ini.
 *
 * Alias legacy: "jacket" → "shirt" (APK lama + nama file model
 * jacket.glb + mapping lama di catalog/page.tsx mengirim "jacket") dan
 * "sweater" → "crewneck" (mesh crewneck = sweater.glb; slug "sweater"
 * warisan mobile MOBILE_APPAREL_META + MOBILE_UNITS_TO_CM).
 * Selain 5 slug + alias di atas → DITOLAK (throw 400, fail-closed),
 * bukan fallback diam-diam ke tshirt agar harga tak salah.
 *
 * Modul ini SENGAJA tanpa runtime-import (hanya `import type`) agar
 * aman diimpor dari skema Zod, route server, maupun komponen client
 * tanpa risiko circular-import.
 */

import type { ApparelType } from "./constants";

export const WEB_APPAREL_SLUGS = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"] as const;

/** Alias slug legacy → slug web kanonis. */
const LEGACY_APPAREL_ALIASES: Record<string, ApparelType> = {
  jacket: "shirt",
  sweater: "crewneck",
};

/**
 * Normalisasi input tak-terpercaya menjadi ApparelType kanonis.
 * Trim + lowercase; alias legacy dipetakan; sisanya ditolak.
 * @throws Error(status=400) bila slug tak dikenal.
 */
export function normalizeApparelSlug(input: unknown): ApparelType {
  const raw = String(input ?? "").trim().toLowerCase();
  if ((WEB_APPAREL_SLUGS as readonly string[]).includes(raw)) return raw as ApparelType;
  const aliased = LEGACY_APPAREL_ALIASES[raw];
  if (aliased) return aliased;
  const err: unknown = new Error(
    `Apparel tidak dikenal: ${String(input)}. Pilihan: ${WEB_APPAREL_SLUGS.join(", ")} (legacy: jacket→shirt, sweater→crewneck).`
  );
  (err as { status?: number }).status = 400;
  throw err;
}
