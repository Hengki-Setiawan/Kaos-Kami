import { chromium } from "@playwright/test";
import * as path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });

  // Set cookies for test customer
  await context.addCookies([
    {
      name: "kaos_dev_role",
      value: "CUSTOMER",
      domain: "localhost",
      path: "/",
    },
    {
      name: "kaos_dev_user_id",
      value: "cmth7rezr0000us08kjfnz909",
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard/orders", { waitUntil: "domcontentloaded" });

  const tabButton = page.locator("button:has-text('KOLEKSI DESAIN')");
  if (await tabButton.count() > 0) {
    await tabButton.first().click();
  }

  // Wait for images to load
  await page.waitForSelector("img[alt*='Toraja']", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const screenshotPath = path.resolve(process.cwd(), "public", "previews", "dashboard-wardrobe-enlarged.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Customer screenshot saved:", screenshotPath);

  await browser.close();
}

main().catch(console.error);
