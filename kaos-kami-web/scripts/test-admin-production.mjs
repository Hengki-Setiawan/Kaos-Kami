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

  // 1. Production Kanban
  console.log('2. Navigating to Workshop Production: http://localhost:3000/admin/production ...');
  await page.goto('http://localhost:3000/admin/production', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_workshop_production.png' });
  console.log('Saved: admin_workshop_production.png');

  // 2. Gang Sheet DTF
  console.log('3. Navigating to Gang Sheet: http://localhost:3000/admin/gang-sheet ...');
  await page.goto('http://localhost:3000/admin/gang-sheet', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'd:\\Vibe coding Semester 7\\Kaos Kami\\kaos-kami-web\\public\\admin_gang_sheet.png' });
  console.log('Saved: admin_gang_sheet.png');

  await browser.close();
  console.log('SUCCESS: Production & Gang Sheet screenshots captured!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
