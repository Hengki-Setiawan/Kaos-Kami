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

  console.log('2. Navigating to http://localhost:3000/admin ...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('3. Capturing main Admin Orders Dashboard...');
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_dashboard_orders.png', fullPage: false });
  console.log('Saved: admin_dashboard_orders.png');

  // Channel Studio
  console.log('4. Navigating to Studio channel: http://localhost:3000/admin?channel=studio ...');
  await page.goto('http://localhost:3000/admin?channel=studio', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_dashboard_channel_studio.png', fullPage: false });
  console.log('Saved: admin_dashboard_channel_studio.png');

  // Channel E-Commerce
  console.log('5. Navigating to E-Commerce channel: http://localhost:3000/admin?channel=ecommerce ...');
  await page.goto('http://localhost:3000/admin?channel=ecommerce', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_dashboard_channel_ecommerce.png', fullPage: false });
  console.log('Saved: admin_dashboard_channel_ecommerce.png');

  await browser.close();
  console.log('SUCCESS: Admin Dashboard research screenshots captured!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
