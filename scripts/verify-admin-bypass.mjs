import { chromium } from "playwright";

async function run() {
  console.log("=== Verifikasi UI Studio & Dashboard Orders ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.log("1. Membuka Studio 3D...");
    await page.goto("http://localhost:3000/studio", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "scripts/screenshot-studio.png" });
    console.log("✅ Screenshot studio tersimpan di scripts/screenshot-studio.png");

    console.log("2. Membuka Dashboard Orders...");
    await page.goto("http://localhost:3000/dashboard/orders", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "scripts/screenshot-dashboard.png" });
    console.log("✅ Screenshot dashboard tersimpan di scripts/screenshot-dashboard.png");

  } catch (err) {
    console.error("Browser verification error:", err.message);
  } finally {
    await browser.close();
  }
}

run();
