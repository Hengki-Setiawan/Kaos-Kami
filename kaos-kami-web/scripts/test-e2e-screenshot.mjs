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

  console.log('2. Navigating to http://localhost:3000/catalog ...');
  await page.goto('http://localhost:3000/catalog', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('3. Clicking + Keranjang on first product...');
  const addBtn = page.locator('button:has-text("+ Keranjang")').first();
  await addBtn.waitFor({ state: 'visible', timeout: 15000 });
  await addBtn.click();
  console.log('Clicked + Keranjang!');
  await page.waitForTimeout(1500);

  console.log('4. Clicking Proses Checkout (Bayar QRIS)...');
  const checkoutBtn = page.locator('button:has-text("Proses Checkout")').first();
  await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 });
  await checkoutBtn.click();
  console.log('Clicked Checkout button!');
  await page.waitForTimeout(1500);

  console.log('5. Filling recipient details in CheckoutModal...');
  const nameInput = page.locator('input[placeholder*="Muhammad Fadil"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill('Budi Santoso');

  const phoneInput = page.locator('input[placeholder="081234567890"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('081234567890');
  await page.waitForTimeout(1000);

  console.log('6. Clicking BAYAR SEKARANG (DIRECT QRIS)...');
  const payBtn = page.locator('button:has-text("BAYAR SEKARANG")').first();
  await payBtn.waitFor({ state: 'visible', timeout: 15000 });
  await payBtn.click();
  console.log('Clicked BAYAR SEKARANG!');

  console.log('7. Waiting for DirectQrisModal to appear...');
  const qrisModal = page.locator('[aria-label="Modal Pembayaran Direct QRIS Kaos Kami"]').first();
  await qrisModal.waitFor({ state: 'visible', timeout: 60000 });
  console.log('DirectQrisModal is VISIBLE on screen!');

  // Wait for QR code image to render
  const qrImg = qrisModal.locator('img').first();
  await qrImg.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(3000);

  const screenshotPath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\b8c14141-74f9-4163-9b58-57511a94d651\\real_qris_live.png';
  await qrisModal.screenshot({ path: screenshotPath });
  console.log('8. Screenshot of REAL QRIS saved to:', screenshotPath);

  const fullPagePath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\b8c14141-74f9-4163-9b58-57511a94d651\\real_checkout_fullpage.png';
  await page.screenshot({ path: fullPagePath });
  console.log('9. Full page screenshot saved to:', fullPagePath);

  await browser.close();
  console.log('SUCCESS! Real QRIS screenshots captured.');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
