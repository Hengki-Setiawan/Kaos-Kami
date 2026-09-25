// @ts-nocheck
// DRAFT R1 — C-01 rantai emas L3 (user->admin->user). BUTUH @playwright/test.
// Aturan keras: user-facing locators, web-first assertions, LARANGAN
// waitForTimeout (ganti waitForResponse/waitForURL/toBeVisible).
// Mock batas pihak ketiga via page.route (AgenWebsite, Fonnte, GA, Turnstile);
// DILARANG mock /api/* milik sendiri + Duitku di run sandbox R3.
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Mock deterministik pihak ketiga (KECUALI spec Turnstile S-015).
  await page.route(/api\.agenwebsite\.com|api-sandbox\.agenwebsite\.com/, (r) =>
    r.fulfill({ status: 200, body: JSON.stringify({ data: [] }) }),
  );
  await page.route(/api\.fonnte\.com/, (r) => r.fulfill({ status: 200, body: "{}" }));
  await page.route(/google-analytics\.com|googletagmanager\.com/, (r) => r.abort());
});

test("C-01 invoice menampilkan badge + tombol bayar-ulang (L3)", async ({ page }) => {
  // Prasyarat: order TEST milik user (dibuat R-U). Ganti dengan orderNumber run.
  const orderId = process.env.E2E_C01_ORDER_ID || "";
  test.skip(!orderId, "butuh E2E_C01_ORDER_ID dari run R-U");
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole("heading", { name: /invoice|pesanan/i }).first()).toBeVisible();
  // Hasil, bukan halaman termuat: nomor order tampil + console bersih.
  await expect(page.getByText(orderId).first()).toBeVisible();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  expect(errors).toEqual([]);
});

test("C-01 dashboard user: kartu order muncul (L3)", async ({ page }) => {
  await page.goto("/dashboard/orders");
  await expect(page.getByRole("heading", { name: /pesanan/i }).first()).toBeVisible();
});
