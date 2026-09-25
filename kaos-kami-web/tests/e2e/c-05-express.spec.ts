// @ts-nocheck
// DRAFT R1 — C-05 EXPRESS: badge konsisten di invoice + kanban.
import { test, expect } from "@playwright/test";

test("C-05 invoice EXPRESS menampilkan badge 24H (L3)", async ({ page }) => {
  const orderId = process.env.E2E_C05_ORDER_ID || "";
  test.skip(!orderId, "butuh E2E_C05_ORDER_ID (order EXPRESS_24H)");
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText(/express|24\s?jam/i).first()).toBeVisible();
});
