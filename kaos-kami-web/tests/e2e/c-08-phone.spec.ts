// @ts-nocheck
// DRAFT R1 — C-08 ganti nomor: profil tampil nomor baru, invoice pakai nomor
// baru. L3 penuh butuh akun cadangan + OTP (peek). L1: update-phone tanpa OTP = 401.
import { test, expect } from "@playwright/test";

test("C-08 update-phone tanpa OTP DITOLAK 401 (L1)", async ({ request }) => {
  const res = await request.post("/api/auth/update-phone", { data: { phoneNumber: "081234567890" } });
  expect([400, 401]).toContain(res.status());
});
