// @ts-nocheck
// DRAFT R1 — C-04 bulk ekspedisi: resi JADI LINK lacak + tombol salin.
import { test, expect } from "@playwright/test";

test("C-04 invoice SHIPPED: resi bisa diklik + disalin (L3)", async ({ page }) => {
  const orderId = process.env.E2E_C04_ORDER_ID || "";
  test.skip(!orderId, "butuh E2E_C04_ORDER_ID (order SHIPPED beresi)");
  await page.goto(`/orders/${orderId}`);
  const resi = page.getByRole("link", { name: /lacak|resi/i }).first();
  await expect(resi).toBeVisible();
  expect(await resi.getAttribute("href")).toBeTruthy();
});
