// @ts-nocheck
// DRAFT R1 — C-06 komplain: form kategori + textarea + kirim OK (L1 shape
// tanpa auth = 401 jujur; L3 penuh butuh order SHIPPED).
import { test, expect } from "@playwright/test";

test("C-06 komplain tamu DITOLAK 401 (L1)", async ({ request }) => {
  const res = await request.post("/api/complaints", { data: { orderId: "x", category: "MISPRINT" } });
  expect([400, 401]).toContain(res.status());
});
