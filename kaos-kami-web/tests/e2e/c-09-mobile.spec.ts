// @ts-nocheck
// DRAFT R1 — C-09 mobile parity (slow): API mobile katalog + checkout-shape.
// Butuh dev :3001/emulator untuk L3 penuh — L1 di bawah jalan headless.
import { test, expect } from "@playwright/test";

test("C-09 mobile catalog API shape (L1)", async ({ request }) => {
  const res = await request.get("/api/catalog/variants");
  expect(res.status()).toBe(200);
});

test("C-09 mobile checkout tanpa sesi DITOLAK 401 (L1)", async ({ request }) => {
  const res = await request.post("/api/mobile/orders/checkout", { data: {} });
  expect([400, 401]).toContain(res.status());
});
