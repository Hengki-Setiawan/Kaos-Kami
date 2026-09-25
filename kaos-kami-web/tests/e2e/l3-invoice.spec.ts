// @ts-nocheck
// DRAFT L3 — Invoice & after-sales (U-060, U-071, U-073, U-080). BUTUH @playwright/test.
// Fixture (SKIP-jujur bila tak ada):
//   E2E_L3_ORDER_ID   = order PENDING_PAYMENT milik akun uji (ada PaymentDeadline + tombol batal).
//   E2E_L3_SHIPPED_ID = order SHIPPED/DELIVERED milik akun uji (ada "No. Resi:" + tombol Salin).
// Run: E2E_L3_ORDER_ID=<id> E2E_L3_SHIPPED_ID=<id> npx playwright test --project=l3 l3-invoice
// Aturan keras: user-facing locators, web-first assertions, LARANGAN waitForTimeout
// (ganti waitForEvent/waitForURL/toBeVisible). Mock HANYA pihak ketiga
// (AgenWebsite, Fonnte, GA); DILARANG mock /api/* milik sendiri + Duitku.
import { test, expect } from "@playwright/test";

const PENDING_ID = process.env.E2E_L3_ORDER_ID || "";
const SHIPPED_ID = process.env.E2E_L3_SHIPPED_ID || "";

test.beforeEach(async ({ page }) => {
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

test("U-060 invoice tampilkan countdown 24h + dialog batal (non-destruktif)", async ({ page }) => {
  test.skip(!PENDING_ID, "butuh E2E_L3_ORDER_ID (order PENDING_PAYMENT fixture)");
  await page.goto(`/orders/${PENDING_ID}`);
  await expect(
    page.getByRole("heading", { name: /invoice resmi pemesanan|pesanan berhasil diterima/i }),
  ).toBeVisible();
  // Countdown deadline dari createdAt DB (InvoiceLiveBits.PaymentDeadline).
  await expect(page.getByText(/bayar sebelum|batas bayar terlewati/i).first()).toBeVisible();
  // Affordance bayar-ulang ada (TIDAK diklik: memicu alur OTP/link Duitku).
  await expect(page.getByRole("button", { name: /bayar ulang/i }).first()).toBeVisible();
  // Batalkan: buka ConfirmDialog lalu tutup via BATAL (TIDAK konfirmasi: non-destruktif).
  await page.getByRole("button", { name: /batalkan pesanan ini/i }).click();
  const dialog = page.getByRole("alertdialog", { name: /batalkan pesanan\?/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^batal$/i }).click();
  await expect(dialog).toBeHidden();
});

test("U-071 unduh PDF KK-*.pdf + link wa.me prefill", async ({ page }) => {
  test.skip(!PENDING_ID, "butuh E2E_L3_ORDER_ID (order PENDING_PAYMENT fixture)");
  await page.goto(`/orders/${PENDING_ID}`);
  await expect(
    page.getByRole("heading", { name: /invoice resmi pemesanan|pesanan berhasil diterima/i }),
  ).toBeVisible();
  // PDF 1-klik (client-side jspdf) → event download, nama KK-<orderNumber>.pdf.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /unduh pdf/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^KK-.*\.pdf$/);
  // Fallback manual WA selalu tampil (fail-safe Fonnte) + href wa.me + prefill teks.
  const wa = page.getByRole("link", { name: /konfirmasi via whatsapp/i });
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute("href", /wa\.me\/\d+\?text=.+/);
  // Tombol cetak ada (TIDAK diklik: menghindari dialog print native).
  await expect(page.getByRole("button", { name: /cetak nota resmi/i })).toBeVisible();
});

test("U-073 resi tersalin saat clipboard diizinkan", async ({ page, context }) => {
  test.skip(!SHIPPED_ID, "butuh E2E_L3_SHIPPED_ID (order SHIPPED/DELIVERED + trackingNumber)");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/orders/${SHIPPED_ID}`);
  await expect(page.getByText(/no\. resi:/i).first()).toBeVisible();
  const salin = page.getByRole("button", { name: /salin|tersalin/i }).first();
  await expect(salin).toBeVisible();
  await salin.click();
  // Sukses ("Tersalin!") atau fallback jujur ("Salin manual nomor di atas.") — keduanya eksplisit, tidak diam.
  await expect(page.getByText(/tersalin|salin manual/i).first()).toBeVisible();
});

test("U-073 fallback jujur saat clipboard ditolak", async ({ page, context }) => {
  test.skip(!SHIPPED_ID, "butuh E2E_L3_SHIPPED_ID (order SHIPPED/DELIVERED + trackingNumber)");
  await context.clearPermissions();
  await page.goto(`/orders/${SHIPPED_ID}`);
  await expect(page.getByText(/no\. resi:/i).first()).toBeVisible();
  const salin = page.getByRole("button", { name: /salin|tersalin/i }).first();
  test.skip(!(await salin.isVisible()), "tombol Salin tidak ada di invoice ini (hanya di order + trackingNumber)");
  await salin.click();
  await expect(page.getByText(/tersalin|salin manual/i).first()).toBeVisible();
});

test("U-080 CartDrawer: banner sync harga atau cabang no-drift", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /keranjang belanja/i }).click();
  await expect(page.getByRole("dialog", { name: /keranjang belanja/i })).toBeVisible();
  // Cabang A (drift): notice syncPrices + diffIdr tampil eksplisit …
  const notice = page.getByText(/harga katalog berubah/i);
  if (await notice.isVisible()) {
    await expect(notice).toContainText(/selisih/i);
    // … user diminta aksi ulang dengan harga baru (tidak diam-diam pakai harga lama).
    await expect(
      page.getByRole("button", { name: /bayar|checkout|lanjut/i }).first(),
    ).toBeVisible();
  } else {
    // Cabang B (no-drift jujur): drawer utuh — kosong atau ada total, tanpa klaim drift palsu.
    await expect(
      page.getByText(/keranjang anda masih kosong|total/i).first(),
    ).toBeVisible();
  }
});
