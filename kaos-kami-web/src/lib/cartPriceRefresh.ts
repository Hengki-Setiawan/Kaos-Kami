"use client";

import { fetchJson } from "@/lib/fetchJson";

export type ServerPriceMap = Record<string, { priceIdr?: number; stockQty?: number }>;

/**
 * Ambil harga/stok varian segar dari /api/catalog/variants (anti harga basi).
 * Tak pernah throw: gagal jaringan/server → kembalikan {} agar checkout tak
 * diblokir (server tetap otoritatif saat POST /api/checkout).
 */
export async function fetchServerPriceMap(timeoutMs = 10000): Promise<ServerPriceMap> {
  try {
    const data = await fetchJson<{ success?: boolean; variants?: any[] }>(
      "/api/catalog/variants",
      undefined,
      timeoutMs
    );
    const list = Array.isArray(data?.variants) ? data.variants : [];
    const map: ServerPriceMap = {};
    for (const v of list) {
      if (!v || typeof v.id !== "string") continue;
      const entry: { priceIdr?: number; stockQty?: number } = {};
      if (typeof v.priceIdr === "number" && Number.isFinite(v.priceIdr)) {
        entry.priceIdr = Math.floor(v.priceIdr);
      }
      if (typeof v.stockQty === "number" && Number.isFinite(v.stockQty)) {
        entry.stockQty = Math.floor(v.stockQty);
      }
      map[v.id] = entry;
    }
    return map;
  } catch {
    return {};
  }
}

export function formatIdr(n: number): string {
  const sign = n < 0 ? "−" : n > 0 ? "+" : "";
  return `${sign}Rp ${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}
