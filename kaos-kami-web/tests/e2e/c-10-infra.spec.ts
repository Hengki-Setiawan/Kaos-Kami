// @ts-nocheck
// DRAFT R1 — C-10 infra: health shape + sweepBearer + CSP headers (L1 penuh,
// tanpa fixture; cermin K-001/K-004/K-005/K-014).
import { test, expect } from "@playwright/test";

test("C-10 health 200 + shape degraded-jujur (L1)", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const j = await res.json();
  expect(j.checks.db.ok).toBe(true);
});

test("C-10 sweep tanpa secret DITOLAK + CSP ada (L1)", async ({ request }) => {
  const sweep = await request.get("/api/cron/sweep");
  expect([401, 503]).toContain(sweep.status());
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toBeTruthy();
});
