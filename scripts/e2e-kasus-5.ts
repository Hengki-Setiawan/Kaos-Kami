import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), "kaos-kami-web/.env") });

import fs from "fs";
import { auth } from "../kaos-kami-web/src/lib/auth.ts";
import { db } from "../kaos-kami-web/src/lib/db.ts";
import { Order } from "../kaos-kami-web/src/lib/drizzle-schema.ts";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:3000";
// Secret WAJIB via env (JANGAN hardcode � insiden Sep 2026).
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const OUTPUT_FILE = "d:/Vibe coding Semester 7/Kaos Kami/Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-5-sad-cases-security-audit.json";

interface AuditResult {
  id: string;
  name: string;
  scenario: string;
  targetEndpoint: string;
  expectedStatus: number;
  actualStatus: number;
  responseSnippet: any;
  passed: boolean;
  notes: string;
}

async function runKasus5() {
  console.log("=================================================================");
  console.log("🚀 MEMULAI EKSEKUSI NYATA KASUS 5: SAD CASES, HACKER & KEAMANAN");
  console.log("   (Uji Penetrasi Idempotency, RBAC, Webhook Tamper, OTP, Underpay)");
  console.log("=================================================================\n");

  const results: AuditResult[] = [];

  // Login Pelanggan (Customer Role)
  console.log("1. Autentikasi Customer (hengkivibecoding@gmail.com)...");
  const custLoginRes = await auth.api.signInEmail({
    body: {
      email: "hengkivibecoding@gmail.com",
      password: requireEnv("E2E_TEST_PASSWORD")
    },
    asResponse: true
  });
  const rawCustCookie = custLoginRes.headers.get("set-cookie") || "";
  const custCookie = rawCustCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");

  const testPayloadBase = {
    recipientName: "hengki vibecoding1",
    phoneNumber: "0895803463032",
    email: "hengkivibecoding@gmail.com",
    deliveryMethod: "FREE_MAKASSAR",
    district: "Tamalanrea",
    turnaroundTier: "REGULER",
    fullAddress: "Jl. Perintis Kemerdekaan KM 10 No. 45, Tamalanrea, Makassar",
    items: [
      {
        apparelSlug: "tshirt",
        fabricThicknessSlug: "combed-24s",
        materialFinishSlug: "standard",
        colorHex: "#121214",
        colorName: "Obsidian Black",
        size: "L",
        quantity: 1,
        title: "Test Security Payload",
        decals: [
          {
            id: "sec-decal-1",
            name: "Test Logo",
            targetSide: "front",
            url: "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/mascot/logo-white.png",
            x: 0,
            y: 0.1,
            scale: 0.3,
            rotation: 0,
            opacity: 1,
            printPx: { w: 1000, h: 1000 }
          }
        ]
      }
    ]
  };

  // -------------------------------------------------------------
  // TEST 1: Double-Click Replay Protection (Idempotency-Key)
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Menguji Idempotency Double-Click Protection...");
  const idempotencyKey = `sec-key-audit-${Date.now()}`;

  // Request 1: Should succeed (200)
  const req1 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie,
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(testPayloadBase)
  });
  const data1: any = await req1.json().catch(() => ({}));
  console.log(`   - Request 1 Status: ${req1.status} (Order Number: ${data1.orderNumber || "—"})`);

  // Request 2: Replay with identical Idempotency-Key -> MUST return 409 Conflict
  const req2 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie,
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(testPayloadBase)
  });
  const data2: any = await req2.json().catch(() => ({}));
  console.log(`   - Request 2 (Replay) Status: ${req2.status} (Error: ${data2.error || "—"})`);

  const t1Passed = req1.status === 200 && req2.status === 409;
  results.push({
    id: "SEC-IDEMPOTENCY-01",
    name: "Double-Click Idempotency Collision Protection",
    scenario: "Mengirim 2 checkout request berturut-turut dengan Idempotency-Key yang identik",
    targetEndpoint: "POST /api/checkout",
    expectedStatus: 409,
    actualStatus: req2.status,
    responseSnippet: data2,
    passed: t1Passed,
    notes: t1Passed 
      ? "Sistem berhasil mencegah pembuatan order ganda dan mengembalikan HTTP 409 Conflict dengan referensi order sebelumnya."
      : `Ekspektasi 409 Conflict, diterima: ${req2.status}`
  });

  // -------------------------------------------------------------
  // TEST 2: iPaymu Webhook Unknown-Order Rejection
  // (migrasi Bab 55 — Duitku 410 Gone; iPaymu TANPA signature MD5, jadi
  // serangan tamper = callback order fiktif → wajib 404, TAK melunaskan apa pun)
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Menguji Penolakan Webhook iPaymu Order Fiktif...");
  const fakeWebhookPayload = {
    trx_id: "HACKER-FAKE-TRX-999",
    sid: "HACKER-FAKE-SID-999",
    reference_id: "KK-FAKE-9999",
    reference: "KK-FAKE-9999",
    status: "berhasil",
    status_code: "00",
    amount: 149000,
    via: "QRIS",
    channel: "qris"
  };

  const reqWebhook = await fetch(`${BASE_URL}/api/webhooks/ipaymu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakeWebhookPayload)
  });
  const dataWebhook: any = await reqWebhook.json().catch(() => ({}));
  console.log(`   - Fake Webhook Status: ${reqWebhook.status} (Response: ${JSON.stringify(dataWebhook)})`);

  const t2Passed = reqWebhook.status === 404;
  results.push({
    id: "SEC-WEBHOOK-02",
    name: "iPaymu Webhook Unknown-Order Rejection",
    scenario: "Mengirim callback pembayaran iPaymu untuk nomor order fiktif yang tak ada di DB",
    targetEndpoint: "POST /api/webhooks/ipaymu",
    expectedStatus: 404,
    actualStatus: reqWebhook.status,
    responseSnippet: dataWebhook,
    passed: t2Passed,
    notes: t2Passed
      ? "Server menolak callback order fiktif (HTTP 404 Order not found) — tidak ada order yang lunas."
      : `Ekspektasi 404 Not Found, diterima: ${reqWebhook.status}`
  });

  // -------------------------------------------------------------
  // TEST 3: Invalid / Expired OTP Rejection
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Menguji Penolakan Wrong OTP...");
  const reqOtp = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumber: "0895803463032",
      code: "000000" // Kode ngawur
    })
  });
  const dataOtp: any = await reqOtp.json().catch(() => ({}));
  console.log(`   - Wrong OTP Status: ${reqOtp.status} (Response: ${JSON.stringify(dataOtp)})`);

  const t3Passed = reqOtp.status === 400;
  results.push({
    id: "SEC-AUTH-03",
    name: "Invalid OTP Rejection & Anti-Oracle Shield",
    scenario: "Mengirim tebakan OTP 6-digit salah (000000)",
    targetEndpoint: "POST /api/auth/verify-otp",
    expectedStatus: 400,
    actualStatus: reqOtp.status,
    responseSnippet: dataOtp,
    passed: t3Passed,
    notes: t3Passed
      ? "Server menolak OTP salah dengan pesan generik anti-oracle (HTTP 400 Bad Request)."
      : `Ekspektasi 400 Bad Request, diterima: ${reqOtp.status}`
  });

  // -------------------------------------------------------------
  // TEST 4: RBAC Privilege Escalation Attack
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Menguji RBAC: Customer Mencoba Mengubah Antrean Admin...");
  const reqRbac = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie // Cookie akun customer biasa
    },
    body: JSON.stringify({
      taskId: "any-task-id",
      stage: "DONE"
    })
  });
  const dataRbac: any = await reqRbac.json().catch(() => ({}));
  console.log(`   - RBAC Violation Status: ${reqRbac.status} (Response: ${JSON.stringify(dataRbac)})`);

  const t4Passed = reqRbac.status === 403;
  results.push({
    id: "SEC-RBAC-04",
    name: "Customer Blocked from Workshop Admin Portal (RBAC)",
    scenario: "Akun role CUSTOMER mencoba mengubah stage antrean produksi via PATCH /api/admin/production-tasks",
    targetEndpoint: "PATCH /api/admin/production-tasks",
    expectedStatus: 403,
    actualStatus: reqRbac.status,
    responseSnippet: dataRbac,
    passed: t4Passed,
    notes: t4Passed
      ? "Gerbang RBAC memblokir akun non-admin secara ketat (HTTP 403 Forbidden: insufficient role)."
      : `Ekspektasi 403 Forbidden, diterima: ${reqRbac.status}`
  });

  // -------------------------------------------------------------
  // TEST 5: Underpayment Attack (iPaymu amount-mismatch → 400)
  // iPaymu TANPA signature: kirim nominal Rp 1.000 untuk order nyata TEST 1
  // → route wajib 400 Amount mismatch (guard webhooks/ipaymu:80-86).
  // Tanpa fixture order (TEST 1 gagal) → fallback order fiktif → 404.
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Menguji Underpayment Attack (Nominal Kurang)...");
  const underpayRef = (data1 as any)?.orderNumber ? (data1 as any).orderNumber : "KK-FAKE-UNDERpay";
  const underpayWant = (data1 as any)?.orderNumber ? 400 : 404;

  const reqUnderpay = await fetch(`${BASE_URL}/api/webhooks/ipaymu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trx_id: `IPAYMU-UNDERPAY-${Date.now()}`,
      sid: `SID-UNDERPAY-${Date.now()}`,
      reference_id: underpayRef,
      reference: underpayRef,
      status: "berhasil",
      status_code: "00",
      amount: 1000, // jauh di bawah total asli order nyata
      via: "QRIS",
      channel: "qris"
    })
  });
  const dataUnderpay: any = await reqUnderpay.json().catch(() => ({}));
  console.log(`   - Underpayment Status: ${reqUnderpay.status} (Response: ${JSON.stringify(dataUnderpay)})`);

  const t5Passed = reqUnderpay.status === underpayWant;
  results.push({
    id: "SEC-UNDERPAY-05",
    name: "Underpayment Callback Rejection",
    scenario: "Penyerang mengirim callback lunas iPaymu dengan nominal Rp 1.000 untuk tagihan order nyata",
    targetEndpoint: "POST /api/webhooks/ipaymu",
    expectedStatus: underpayWant,
    actualStatus: reqUnderpay.status,
    responseSnippet: dataUnderpay,
    passed: t5Passed,
    notes: t5Passed
      ? (underpayWant === 400
        ? "Server mendeteksi ketidaksesuaian nominal order dan menolak update lunas (HTTP 400 Amount mismatch)."
        : "Tanpa fixture order nyata — fallback order fiktif ditolak (HTTP 404), penyerang tetap tak bisa melunaskan apa pun.")
      : `Ekspektasi ${underpayWant}, diterima: ${reqUnderpay.status}`
  });

  // -------------------------------------------------------------
  // TEST 6: Non-Makassar District Rejected for Free Shipping
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Menguji Pelanggaran Wilayah FREE_MAKASSAR...");
  const invalidGeoPayload = {
    ...testPayloadBase,
    deliveryMethod: "FREE_MAKASSAR",
    district: "Somba Opu", // Di luar Kota Makassar (Kabupaten Gowa)
  };

  const reqGeo = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": custCookie,
      "Idempotency-Key": `geo-sec-${Date.now()}`
    },
    body: JSON.stringify(invalidGeoPayload)
  });
  const dataGeo: any = await reqGeo.json().catch(() => ({}));
  console.log(`   - Geo Restriction Status: ${reqGeo.status} (Response: ${JSON.stringify(dataGeo)})`);

  const t6Passed = reqGeo.status === 400;
  results.push({
    id: "SEC-SHIP-06",
    name: "Non-Makassar Subdistrict Rejected for Free Delivery",
    scenario: "Pengguna memilih metode FREE_MAKASSAR tetapi mengisi kecamatan 'Somba Opu' (wilayah Kab. Gowa)",
    targetEndpoint: "POST /api/checkout",
    expectedStatus: 400,
    actualStatus: reqGeo.status,
    responseSnippet: dataGeo,
    passed: t6Passed,
    notes: t6Passed
      ? "Server memvalidasi whitelist kecamatan se-Kota Makassar dan menolak wilayah di luar batas (HTTP 400 Bad Request)."
      : `Ekspektasi 400 Bad Request, diterima: ${reqGeo.status}`
  });

  // -------------------------------------------------------------
  // TEST 7: Oversized Payload Rejection (>16KB Webhook Bomb → iPaymu 413)
  // -------------------------------------------------------------
  console.log("\n[TEST 7] Menguji Penolakan Oversized Payload Bomb (>16KB)...");
  const hugePayload = JSON.stringify({
    trx_id: "IPAYMU-FAKE-TRX",
    reference_id: "KK-FAKE-9999",
    status: "berhasil",
    amount: 149000,
    via: "QRIS",
    junk: "A".repeat(25 * 1024) // 25 KB
  });

  const reqOversize = await fetch(`${BASE_URL}/api/webhooks/ipaymu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: hugePayload
  });
  const dataOversize: any = await reqOversize.json().catch(() => ({}));
  console.log(`   - Oversized Status: ${reqOversize.status} (Response: ${JSON.stringify(dataOversize)})`);

  const t7Passed = reqOversize.status === 413;
  results.push({
    id: "SEC-OVERSIZE-07",
    name: "Webhook Payload Bomb / Oversized Body Rejection",
    scenario: "Mengirim payload JSON sebesar 25KB melebihi batas MAX_WEBHOOK_BYTES (16KB)",
    targetEndpoint: "POST /api/webhooks/ipaymu",
    expectedStatus: 413,
    actualStatus: reqOversize.status,
    responseSnippet: dataOversize,
    passed: t7Passed,
    notes: t7Passed
      ? "Server langsung memutus request melebihi batas ukuran (HTTP 413 Payload too large)."
      : `Ekspektasi 413 Payload Too Large, diterima: ${reqOversize.status}`
  });

  // Simpan Seluruh Hasil Audit ke File JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");

  console.log(`\n💾 Laporan Audit Keamanan Lengkap Disimpan di:`);
  console.log(`   ${OUTPUT_FILE}`);

  console.log("\n=================================================================");
  const allPassed = results.every(r => r.passed);
  console.log(`📊 HASIL EVALUASI KASUS 5: ${results.filter(r => r.passed).length} / ${results.length} PENGUJIAN LOLOS`);
  if (allPassed) {
    console.log("✅ KASUS 5 SELESAI DENGAN STATUS 100% SUKSES! (ALL ATTACKS DEFEATED)");
  } else {
    console.log("⚠️ ADA BEBERAPA SKENARIO YANG MEMERLUKAN PERHATIAN!");
  }
  console.log("=================================================================\n");
}

runKasus5().catch(console.error);
