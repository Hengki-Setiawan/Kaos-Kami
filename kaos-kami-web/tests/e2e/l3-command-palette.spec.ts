// @ts-nocheck
// L3 — Command palette admin Ctrl+K (AdminCommandBar, Blueprint Bab 12/32).
// Sesi: storageState admin di tests/e2e/.auth/admin.json (hasil auth.setup.ts).
//   SKIP-jujur bila file tak ada (pola l3-admin.spec.ts).
// Run: npx playwright test --project=l3 l3-command-palette
// Aturan keras: user-facing locators, web-first assertions, LARANGAN waitForTimeout.
// Mock HANYA pihak ketiga; DILARANG mock /api/* milik sendiri + Duitku.
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const ADMIN_AUTH = path.join(__dirname, ".auth", "admin.json");
const HAS_ADMIN_AUTH = fs.existsSync(ADMIN_AUTH);

test.use({ storageState: HAS_ADMIN_AUTH ? ADMIN_AUTH : undefined });

test.beforeEach(async ({ page }) => {
  test.skip(!HAS_ADMIN_AUTH, "butuh tests/e2e/.auth/admin.json — jalankan auth.setup.ts dulu");
  await page.route(/api\.agenwebsite\.com|api-sandbox\.agenwebsite\.com/, (r) =>
    r.fulfill({ status: 200, body: JSON.stringify({ data: [] }) }),
  );
  await page.route(/api\.fonnte\.com/, (r) => r.fulfill({ status: 200, body: "{}" }));
  await page.route(/google-analytics\.com|googletagmanager\.com/, (r) => r.abort());
});

test("P-01 palet perintah: pemicu Ctrl+K tampil + klik membuka dialog", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /buka palet perintah/i });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: /palet perintah admin/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("combobox", { name: /cari menu atau nomor order/i })).toBeVisible();
  await expect(page.getByText(/ketik untuk mencari 14 aksi/i)).toBeVisible();
});

test("P-02 palet perintah: ketik 'kupon' menyaring ke aksi Kupon & Promo", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /buka palet perintah/i }).click();
  const box = page.getByRole("combobox", { name: /cari menu atau nomor order/i });
  await expect(box).toBeVisible();
  await box.fill("kupon");
  // Hasil, bukan sekadar terbuka: opsi kupon tampil sebagai option terpilih.
  await expect(page.getByRole("option", { name: /kupon/i }).first()).toBeVisible();
  await expect(page.getByText(/tidak ada menu yang cocok/i)).toBeHidden();
});

test("P-03 palet perintah: Ctrl+K buka-tutup + Esc menutup", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: /palet perintah admin/i });
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
