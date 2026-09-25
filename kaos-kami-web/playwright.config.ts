// @ts-nocheck
// DRAFT R1 (Bab 8) — BUTUH: npm i -D @playwright/test. JANGAN jadikan acuan
// hijau sebelum dep terinstal + 10 spec ditulis + 3 run beruntun.
// Angka eksplisit acuan Playwright best-practices 2026 (lihat E2E-MASTER-PLAN Bab 8 R1).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // maks 1 di CI (lebih = sembunyikan flake)
  workers: process.env.CI ? 4 : 1,
  timeout: process.env.CI ? 30_000 : 60_000,
  expect: { timeout: 8_000 }, // web-first assertions poll sampai ini
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    actionTimeout: 10_000,
    navigationTimeout: 45_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      // L1 API tanpa auth: jalan kapan pun, tanpa password/OTP/fixture.
      // Dev-sharing: timeout longgar lokal (R-U live bisa jenuhkan dev);
      // CI tetap ketat 8s agar stall cepat merah.
      name: "api",
      testMatch: /c-0[6-9].*\.spec\.ts|c-10-.*\.spec\.ts|axe-6hal.*\.spec\.ts|tl-gl-smoke.*\.spec\.ts/,
      use: { actionTimeout: process.env.CI ? 8_000 : 30_000 },
    },
    {
      name: "chromium",
      testMatch: /c-0[1-5].*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      name: "l3",
      testMatch: /l3-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
        actionTimeout: process.env.CI ? 8_000 : 30_000,
      },
    },
  ],
});
