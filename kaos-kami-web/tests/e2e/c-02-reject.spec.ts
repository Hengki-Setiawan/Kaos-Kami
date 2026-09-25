// @ts-nocheck
// DRAFT R1 — C-02 desain ditolak: invoice tampilkan reviewNote + dashboard
// stepper berhenti. L1 API via request; L3 butuh E2E_C02_ORDER_ID.
import { test, expect } from "@playwright/test";

test("C-02 invoice order REJECTED menampilkan alasan (L3)", async ({ page }) => {
  const orderId = process.env.E2E_C02_ORDER_ID || "";
  test.skip(!orderId, "butuh E2E_C02_ORDER_ID (order REJECTED + reviewNote)");
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText(/ditolak/i).first()).toBeVisible();
  await expect(page.getByText(orderId).first()).toBeVisible();
});
