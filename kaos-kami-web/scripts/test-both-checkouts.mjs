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

  // ==========================================
  // FLOW 1: FORM PEMBAYARAN E-COMMERCE (KATALOG)
  // ==========================================
  console.log('=== FLOW 1: E-COMMERCE CATALOG CHECKOUT ===');
  await page.goto('http://localhost:3000/catalog', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Clear cart in local storage first
  await page.evaluate(() => {
    try {
      localStorage.removeItem('kaos-kami-cart');
    } catch {}
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Adding product to cart...');
  const addBtn = page.locator('button:has-text("+ Keranjang")').first();
  await addBtn.waitFor({ state: 'visible', timeout: 20000 });
  await addBtn.click();
  await page.waitForTimeout(1500);

  console.log('Opening checkout modal from Cart Drawer...');
  const checkoutBtn = page.locator('button:has-text("Proses Checkout")').first();
  await checkoutBtn.waitFor({ state: 'visible', timeout: 15000 });
  await checkoutBtn.click();
  await page.waitForTimeout(1500);

  console.log('Filling contact details...');
  const nameInput = page.locator('input[placeholder*="Muhammad Fadil"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill('Hengki Setiawan');

  const phoneInput = page.locator('input[placeholder="081234567890"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('081234567890');
  await page.waitForTimeout(1000);

  // 1A. Screenshot Form Pembayaran E-Commerce (Modal Checkout)
  console.log('Capturing Form Pembayaran E-Commerce...');
  const checkoutDialog = page.locator('div[role="dialog"][aria-label="Checkout pesanan sablon DTF"]').first();
  await checkoutDialog.waitFor({ state: 'visible', timeout: 10000 });
  await checkoutDialog.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\form_checkout_ecommerce.png' });
  console.log('Saved: form_checkout_ecommerce.png');

  // Submit via BAYAR SEKARANG
  console.log('Submitting E-Commerce Checkout...');
  const payBtn = page.locator('button:has-text("BAYAR SEKARANG")').first();
  await payBtn.waitFor({ state: 'visible', timeout: 10000 });
  await payBtn.click();

  // 1B. Screenshot Modal QRIS E-Commerce
  console.log('Waiting for QRIS Modal E-Commerce...');
  const qrisModal = page.locator('[aria-label="Modal Pembayaran Direct QRIS Kaos Kami"]').first();
  await qrisModal.waitFor({ state: 'visible', timeout: 45000 });
  const qrImg = qrisModal.locator('img').first();
  await qrImg.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);
  await qrisModal.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\modal_qris_ecommerce.png' });
  console.log('Saved: modal_qris_ecommerce.png');

  // ==========================================
  // FLOW 2: FORM PEMBAYARAN 3D STUDIO KOSTUM
  // ==========================================
  console.log('=== FLOW 2: 3D STUDIO CUSTOM CHECKOUT ===');
  await page.goto('http://localhost:3000/studio', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Clear cart in local storage again
  await page.evaluate(() => {
    try {
      localStorage.removeItem('kaos-kami-cart');
    } catch {}
  });

  console.log('Clicking Pesan Sekarang in 3D Studio...');
  const studioPesanBtn = page.locator('#studio-btn-pesan, button:has-text("PESAN SEKARANG")').first();
  await studioPesanBtn.waitFor({ state: 'visible', timeout: 30000 });
  await studioPesanBtn.click();
  await page.waitForTimeout(2000);

  console.log('Clicking Proses Checkout in Cart Drawer for Custom Apparel...');
  const checkoutBtnStudio = page.locator('button:has-text("Proses Checkout")').first();
  await checkoutBtnStudio.waitFor({ state: 'visible', timeout: 15000 });
  await checkoutBtnStudio.click();
  await page.waitForTimeout(2000);

  console.log('Filling contact details for 3D Custom order...');
  const nameInput2 = page.locator('input[placeholder*="Muhammad Fadil"]').first();
  await nameInput2.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput2.fill('Hengki Setiawan (Custom DTF 3D)');

  const phoneInput2 = page.locator('input[placeholder="081234567890"]').first();
  await phoneInput2.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput2.fill('081234567890');
  await page.waitForTimeout(1000);

  // 2A. Screenshot Form Pembayaran 3D Studio Kustom (Modal Checkout)
  console.log('Capturing Form Pembayaran 3D Studio Kustom...');
  const checkoutDialog2 = page.locator('div[role="dialog"][aria-label="Checkout pesanan sablon DTF"]').first();
  await checkoutDialog2.waitFor({ state: 'visible', timeout: 10000 });
  await checkoutDialog2.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\form_checkout_3d_studio.png' });
  console.log('Saved: form_checkout_3d_studio.png');

  // Submit via BAYAR SEKARANG
  console.log('Submitting 3D Custom Checkout...');
  const payBtn2 = page.locator('button:has-text("BAYAR SEKARANG")').first();
  await payBtn2.waitFor({ state: 'visible', timeout: 10000 });
  await payBtn2.click();

  // 2B. Screenshot Modal QRIS 3D Studio
  console.log('Waiting for QRIS Modal 3D Studio...');
  const qrisModal2 = page.locator('[aria-label="Modal Pembayaran Direct QRIS Kaos Kami"]').first();
  await qrisModal2.waitFor({ state: 'visible', timeout: 45000 });
  const qrImg2 = qrisModal2.locator('img').first();
  await qrImg2.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);
  await qrisModal2.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\modal_qris_3d_studio.png' });
  console.log('Saved: modal_qris_3d_studio.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
