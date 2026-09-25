// @ts-nocheck
// DRAFT L3 — Dashboard user (U-072, U-074, U-075, U-076). BUTUH @playwright/test.
// Sesi: storageState user di tests/e2e/.auth/user.json (hasil auth.setup.ts).
//   SKIP-jujur bila file tak ada — JANGAN login via UI berulang (hemat rate OTP).
// Fixture opsional: E2E_L3_DESIGN_ID = desain tersimpan milik akun uji (untuk U-076 valid).
// Run: npx playwright test --project=l3 l3-dashboard
// Aturan keras: user-facing locators, web-first assertions, LARANGAN waitForTimeout.
// Mock HANYA pihak ketiga; DILARANG mock /api/* milik sendiri + Duitku.
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const USER_AUTH = path.join(__dirname, ".auth", "user.json");
const HAS_USER_AUTH = fs.existsSync(USER_AUTH);
const DESIGN_ID = process.env.E2E_L3_DESIGN_ID || "";

test.use({ storageState: HAS_USER_AUTH ? USER_AUTH : undefined });

test.beforeEach(async ({ page }) => {
  test.skip(!HAS_USER_AUTH, "butuh tests/e2e/.auth/user.json — jalankan auth.setup.ts dulu");
  await page.addInitScript(() => {
    try {
      localStorage.setItem("kk-prompt-permissions-v1", (Date.now() + 86400000).toString());
      localStorage.setItem("kk-app-banner-dismissed-v1", "1");
    } catch {}
  });
  await page.route(/api\.agenwebsite\.com|api-sandbox\.agenwebsite\.com/, (r) =>
    r.fulfill({ status: 200, body: JSON.stringify({ data: [] }) }),
  );
  await page.route(/api\.fonnte\.com/, (r) => r.fulfill({ status: 200, body: "{}" }));
  await page.route(/google-analytics\.com|googletagmanager\.com/, (r) => r.abort());
});

test("U-072 PESAN LAGI → batch → dialog BUKA KERANJANG", async ({ page }) => {
  await page.goto("/dashboard/orders", { waitUntil: "domcontentloaded" });
  const pesanLagi = page.getByRole("button", { name: /pesan lagi/i }).first();
  if (!(await pesanLagi.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip(true, "butuh order di akun uji (tak ada tombol PESAN LAGI)");
  }
  await pesanLagi.click();
  await expect(page.getByText(/masuk|tersedia|gagal|keranjang/i).first()).toBeVisible({ timeout: 10000 });
});

test("U-074 tab Voucher: kode + syarat + salin", async ({ page }) => {
  await page.goto("/dashboard/orders", { waitUntil: "domcontentloaded" });
  const voucherTab = page.getByRole("button", { name: /^voucher$/i }).first();
  await expect(voucherTab).toBeVisible();
  await expect(async () => {
    await voucherTab.click();
    await expect(voucherTab).toHaveClass(/border-brand-accent/, { timeout: 1000 });
  }).toPass({ timeout: 10000 });

  // Cabang A (ada kupon aktif): kode + syarat + tombol salin per kupon …
  const salin = page.getByRole("button", { name: /salin|tersalin/i }).first();
  if (await salin.isVisible({ timeout: 5000 }).catch(() => false)) {
    await expect(page.getByText(/potongan/i).first()).toBeVisible();
    await salin.click();
    await expect(page.getByRole("button", { name: /tersalin/i }).first()).toBeVisible();
  } else {
    // … cabang B (tak ada kupon): empty-state jujur, bukan daftar karangan.
    await expect(page.getByText(/belum ada voucher aktif|memuat voucher/i).first()).toBeVisible();
  }
});

test("U-075 tab Notifikasi: baca semua → badge hilang", async ({ page }) => {
  await page.goto("/dashboard/orders", { waitUntil: "domcontentloaded" });
  const notifTab = page.getByRole("button", { name: /^notifikasi$/i }).first();
  await expect(notifTab).toBeVisible();
  await expect(async () => {
    await notifTab.click();
    await expect(notifTab).toHaveClass(/border-brand-accent/, { timeout: 1000 });
  }).toPass({ timeout: 10000 });

  // Daftar dari OrderStatusEvent ATAU empty-state jujur.
  await expect(
    page.getByText(/belum dibaca|semua sudah dibaca|belum ada notifikasi|memuat notifikasi/i).first(),
  ).toBeVisible({ timeout: 8000 });
  const tandai = page.getByRole("button", { name: /tandai dibaca/i });
  if (await tandai.isVisible().catch(() => false)) {
    await tandai.click();
    await expect(page.getByText(/semua sudah dibaca/i)).toBeVisible();
  }
});

test("U-076 deep-link valid /studio?designId= termuat utuh", async ({ page }) => {
  test.skip(!DESIGN_ID, "butuh E2E_L3_DESIGN_ID (desain tersimpan milik akun uji)");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`/studio?designId=${encodeURIComponent(DESIGN_ID)}`);
  // Studio chrome tampil + tanpa crash (presisi posisi/scale/rotasi ±0.35 diassert visual manual).
  await expect(page.getByText(/studio|desain/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("U-076 designId ngawur: gagal anggun, tanpa crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/studio?designId=E2E-NGAWUR-000");
  // Tetap di studio (atau pesan tidak-ditemukan jujur) — halaman tidak blank/crash.
  await expect(page.getByText(/studio|tidak ditemukan|tidak valid/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});
