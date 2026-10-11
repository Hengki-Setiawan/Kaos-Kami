import { chromium } from "@playwright/test";
import * as path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addCookies([
    { name: "kaos_dev_role", value: "CUSTOMER", domain: "localhost", path: "/" },
    { name: "kaos_dev_user_id", value: "cmth7rezr0000us08kjfnz909", domain: "localhost", path: "/" },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard/orders", { waitUntil: "networkidle" });
  await page.locator("button:has-text('Koleksi Desain')").first().click();

  // Scroll down slightly so the cards are fully in view
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(1500);

  const screenshotPath = path.resolve(process.cwd(), "public", "previews", "dashboard-wardrobe-enlarged.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Customer screenshot saved:", screenshotPath);

  await browser.close();
}

main().catch(console.error);
