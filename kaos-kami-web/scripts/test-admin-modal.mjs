import { chromium } from 'playwright';

async function run() {
  console.log('1. Launching Edge browser...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 }
  });
  const page = await context.newPage();

  // 1. Capture E-Commerce Order Detail Modal
  console.log('2. Opening E-Commerce orders: http://localhost:3000/admin?channel=ecommerce ...');
  await page.goto('http://localhost:3000/admin?channel=ecommerce', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('3. Clicking Rincian on visible E-Commerce table row...');
  const ecommerceRincian = page.locator('table button:has-text("Rincian")').first();
  await ecommerceRincian.click();
  await page.waitForTimeout(2000);

  console.log('4. Capturing admin_detail_ecommerce_modal.png ...');
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_detail_ecommerce_modal.png' });
  console.log('Saved: admin_detail_ecommerce_modal.png');

  // Close modal
  const closeBtn = page.locator('button[title="Tutup Modal"]').first();
  if (await closeBtn.isVisible()) await closeBtn.click();
  await page.waitForTimeout(1000);

  // 2. Capture 3D Studio Order Detail Modal
  console.log('5. Opening 3D Studio orders: http://localhost:3000/admin?channel=studio ...');
  await page.goto('http://localhost:3000/admin?channel=studio', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('6. Clicking Rincian on visible 3D Studio table row...');
  const studioRincian = page.locator('table button:has-text("Rincian")').first();
  await studioRincian.click();
  await page.waitForTimeout(3000);

  console.log('7. Capturing admin_detail_studio_modal.png ...');
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_detail_studio_modal.png' });
  console.log('Saved: admin_detail_studio_modal.png');

  await browser.close();
  console.log('SUCCESS: All admin detail modal screenshots captured!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
