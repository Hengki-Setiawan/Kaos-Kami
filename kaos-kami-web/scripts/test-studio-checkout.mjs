import { chromium } from 'playwright';

async function run() {
  console.log('1. Launching Edge browser...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  console.log('2. Navigating to http://localhost:3000/studio ...');
  await page.goto('http://localhost:3000/studio', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('3. Waiting for Studio 3D controls to mount...');
  const pesanBtn = page.locator('#studio-btn-pesan, button:has-text("PESAN SEKARANG")').first();
  await pesanBtn.waitFor({ state: 'visible', timeout: 30000 });
  console.log('Found PESAN SEKARANG button in Studio!');
  await page.waitForTimeout(2000);

  console.log('4. Clicking PESAN SEKARANG in Studio 3D...');
  await pesanBtn.click();
  await page.waitForTimeout(1000);

  // If unsaved masters gate is present, click again
  const checkoutBtn = page.locator('button:has-text("Proses Checkout")').first();
  if (!await checkoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking PESAN SEKARANG second time if gated...');
    await pesanBtn.click();
  }

  console.log('5. Waiting for CartDrawer to open...');
  await checkoutBtn.waitFor({ state: 'visible', timeout: 20000 });
  console.log('CartDrawer is open with 3D Studio custom item!');
  await page.waitForTimeout(1000);

  console.log('6. Clicking Proses Checkout (Bayar QRIS)...');
  await checkoutBtn.click();
  await page.waitForTimeout(2000);

  console.log('7. Waiting for CheckoutModal...');
  const checkoutDialog = page.locator('div[role="dialog"][aria-label="Checkout pesanan sablon DTF"]').first();
  await checkoutDialog.waitFor({ state: 'visible', timeout: 15000 });

  console.log('8. Filling recipient details for 3D Custom Sablon DTF...');
  const nameInput = page.locator('input[placeholder*="Muhammad Fadil"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill('Hengki Setiawan (Kustom Sablon DTF 3D Studio)');

  const phoneInput = page.locator('input[placeholder="081234567890"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('081234567890');
  await page.waitForTimeout(1500);

  // 1. Screenshot Form Pembayaran 3D Studio Kustom
  console.log('9. Capturing Form Pembayaran 3D Studio Kustom...');
  await checkoutDialog.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\form_checkout_3d_studio.png' });
  console.log('Saved: form_checkout_3d_studio.png');

  // Submit via BAYAR SEKARANG (DIRECT QRIS)
  console.log('10. Clicking BAYAR SEKARANG (DIRECT QRIS)...');
  const payBtn = page.locator('button:has-text("BAYAR SEKARANG")').first();
  await payBtn.waitFor({ state: 'visible', timeout: 10000 });
  await payBtn.click();

  // 2. Screenshot Modal QRIS 3D Studio
  console.log('11. Waiting for DirectQrisModal 3D Studio...');
  const qrisModal = page.locator('[aria-label="Modal Pembayaran Direct QRIS Kaos Kami"]').first();
  await qrisModal.waitFor({ state: 'visible', timeout: 60000 });
  const qrImg = qrisModal.locator('img').first();
  await qrImg.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log('12. Capturing Modal QRIS 3D Studio...');
  await qrisModal.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\modal_qris_3d_studio.png' });
  console.log('Saved: modal_qris_3d_studio.png');

  await browser.close();
  console.log('SUCCESS: All 3D Studio checkout screenshots captured!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
