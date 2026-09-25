// @ts-nocheck
// DRAFT R1 — Auth SEKALI via API (pola Elio Navarrete): login
// POST /api/auth/sign-in/email -> simpan storageState per peran.
// Spec TIDAK login via UI berulang (hemat rate OTP!). BUTUH @playwright/test.
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const userFile = path.join(__dirname, ".auth", "user.json");
const adminFile = path.join(__dirname, ".auth", "admin.json");

async function loginViaApi(request: unknown, email: string, password: string, outFile: string) {
  const req = request as {
    post: (url: string, opts: unknown) => Promise<{ ok: () => boolean; status: () => number }>;
    storageState: (opts: { path: string }) => Promise<void>;
  };
  const res = await req.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { Origin: "http://localhost:3000" },
    data: { email, password },
  });
  expect(res.ok(), `login API ${email} -> ${res.status()}`).toBe(true);
  await req.storageState({ path: outFile });
}

setup("auth user CUSTOMER", async ({ request }) => {
  await loginViaApi(
    request,
    process.env.E2E_TEST_EMAIL || "hengkivibecoding@gmail.com",
    process.env.E2E_TEST_PASSWORD || "",
    userFile,
  );
});

setup("auth ADMIN", async ({ request }) => {
  await loginViaApi(
    request,
    process.env.E2E_ADMIN_EMAIL || "hengkishadow@gmail.com",
    process.env.E2E_ADMIN_PASSWORD || "",
    adminFile,
  );
});
