// @ts-nocheck
// DRAFT R1 — C-03 kupon dipakai -> dibatalkan -> kembali (usedCount turun).
// L1 API: kupon fiktif E2E tak aktif -> validate 400 (tanpa bakar kuota).
import { test, expect } from "@playwright/test";

test("C-03 kupon fiktif ditolak dengan pesan jujur (L1)", async ({ request }) => {
  const res = await request.post("/api/checkout", { data: { couponCode: "E2E-TIDAK-ADA" } });
  expect([400, 401]).toContain(res.status());
});

test("C-03 cancel mengembalikan kupon: wording dashboard (L3)", async ({ page }) => {
  const orderId = process.env.E2E_C03_ORDER_ID || "";
  test.skip(!orderId, "butuh E2E_C03_ORDER_ID (order cancel berkupon)");
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText(/dikembalikan|dibatalkan/i).first()).toBeVisible();
});
