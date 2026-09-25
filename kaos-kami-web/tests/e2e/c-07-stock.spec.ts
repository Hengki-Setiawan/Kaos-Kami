// @ts-nocheck
// DRAFT R1 — C-07 stok: varian stok 0 tak bisa dibeli kedua kali (L1 katalog
// jujur; L3 penuh butuh 2 akun + fixture stok-1).
import { test, expect } from "@playwright/test";

test("C-07 katalog variants shape jujur stok (L1)", async ({ request }) => {
  const res = await request.get("/api/catalog/variants");
  expect(res.status()).toBe(200);
  const j = await res.json();
  expect(j.success).toBe(true);
  expect(Array.isArray(j.variants)).toBe(true);
});
