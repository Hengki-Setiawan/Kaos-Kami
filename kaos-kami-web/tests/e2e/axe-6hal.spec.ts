// @ts-nocheck
// DRAFT R1/R6 — axe 6 halaman (X-001: tags wcag22aa, nol critical/serious).
// AMAN: dynamic import + SKIP bila dep/sesi/fixture tak ada. BUTUH: npm i -D @axe-core/playwright.
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

let AxeBuilder: new (opts: { page: unknown }) => {
  withTags: (t: string[]) => unknown;
  analyze: () => Promise<{ violations: { id: string; impact?: string }[] }>;
} | null = null;

test.beforeAll(async () => {
  try {
    ({ AxeBuilder } = (await import("@axe-core/playwright")) as typeof import("@axe-core/playwright"));
  } catch {
    AxeBuilder = null;
  }
});

const needAxe = () => test.skip(!AxeBuilder, "SKIP: npm i -D @axe-core/playwright dulu");
const USER_STATE = "tests/e2e/.auth/user.json";
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

async function scan(page: { goto: (u: string, o?: unknown) => Promise<unknown>; url: () => string; waitForLoadState: (s: string, o?: unknown) => Promise<unknown>; getByRole: (r: string, o?: unknown) => { first: () => { isVisible: (o?: unknown) => Promise<boolean>; click: (o?: unknown) => Promise<unknown> } } }, label: string, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (/\/login|\/masuk|\/auth/i.test(page.url())) {
    test.skip(true, `SKIP: ${label} butuh sesi (redirect ${page.url()})`);
  }
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const res = await new AxeBuilder!({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  const blocking = res.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  await test.info().attach(`axe-${label}.json`, { body: JSON.stringify(res.violations, null, 2), contentType: "application/json" });
  expect(blocking, `${label}: ${blocking.map((v) => v.id).join(",")}`).toHaveLength(0);
}

test("axe / (publik)", async ({ page }) => {
  needAxe();
  await scan(page, "home", "/");
});
test("axe /catalog", async ({ page }) => {
  needAxe();
  await scan(page, "catalog", "/catalog");
});
test("axe /studio", async ({ page }) => {
  needAxe();
  await scan(page, "studio", "/studio");
});
test("axe /orders/[id] (butuh E2E_ORDER_ID)", async ({ page }) => {
  needAxe();
  const id = process.env.E2E_ORDER_ID;
  test.skip(!id, "SKIP: set E2E_ORDER_ID");
  await scan(page, "order", `/orders/${id}`);
});
test("axe /dashboard/orders (butuh sesi)", async ({ page }) => {
  needAxe();
  test.skip(!fs.existsSync(path.resolve(USER_STATE)), "SKIP: storageState user tak ada");
  await scan(page, "dashboard", "/dashboard/orders");
});
test("axe /admin/production (butuh sesi admin)", async ({ browser }) => {
  needAxe();
  test.skip(!fs.existsSync(path.resolve(ADMIN_STATE)), "SKIP: storageState admin tak ada");
  const ctx = await browser.newContext({ storageState: ADMIN_STATE });
  const page = await ctx.newPage();
  try {
    await scan(page, "admin", "/admin/production");
  } finally {
    await ctx.close();
  }
});
