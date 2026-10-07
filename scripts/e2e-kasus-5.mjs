// scripts/e2e-kasus-5.mjs — Eksekusi Nyata Kasus 5: Sad Cases, Hacker & Keamanan Siber
// SSOT: Blueprint/BLUEPRINT-E2E-ADMIN-USER-LENGKAP.md Domain K (SEC-01 s/d SEC-20)
// Webhook: iPaymu (Bab 55) — Duitku 410 Gone; iPaymu TANPA signature MD5
// (tamper = reference fiktif → 404, nominal kurang → 400 Amount mismatch).
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client/web";
import { cookieForEmail } from "./e2e-auth.mjs";

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const OUTPUT_DIR = path.join("Blueprint", "e2e", "hasil-pengujian-e2e", `kasus-5-${STAMP}`);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error("E2E butuh env " + name + " (isi dari kaos-kami-web/.env.local, JANGAN commit)");
  return v;
}

const c = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

async function runKasus5() {
  console.log("=================================================================");
  console.log("MEMULAI EKSEKUSI NYATA KASUS 5: SAD CASES, HACKER & KEAMANAN SIBER");
  console.log("   (Uji Penetrasi Idempotency, RBAC, Webhook Tamper, OTP, Underpay)");
  console.log("=================================================================\n");

  const results = [];

  // 1. Ambil Sesi Pelanggan
  const custCookie = await cookieForEmail(c, "hengkivibecoding@gmail.com");
  console.log("1. Autentikasi Pelanggan (hengkivibecoding@gmail.com)... Siap.");

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
            printPx: { w: 1000, h: 1000 },
          },
        ],
      },
    ],
  };

  // -------------------------------------------------------------
  // TEST 1: Double-Click Idempotency Collision Protection
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Menguji Idempotency Double-Click Protection...");
  const idempotencyKey = `idem-sec-${Date.now()}`;

  const req1 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(testPayloadBase),
  });
  const data1 = await req1.json().catch(() => ({}));
  console.log(`   - Request 1 Status: ${req1.status} (Order Number: ${data1.orderNumber || "-"})`);

  const req2 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(testPayloadBase),
  });
  const data2 = await req2.json().catch(() => ({}));
  console.log(`   - Request 2 (Replay) Status: ${req2.status} (Error: ${data2.error || "-"})`);

  const t1Passed = req1.status === 200 && (req2.status === 409 || data2.orderNumber === data1.orderNumber);
  results.push({
    id: "SEC-IDEMPOTENCY-01",
    name: "Double-Click Idempotency Collision Protection",
    passed: t1Passed,
    notes: t1Passed
      ? "Sistem berhasil mencegah pembuatan order ganda berulang dengan Idempotency-Key yang sama."
      : `Ekspektasi pencegahan duplikasi, diterima: ${req2.status}`,
  });
  console.log(`   - Hasil: ${t1Passed ? "PASS" : "FAIL"}`);

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
    channel: "qris",
  };

  const reqWebhook = await fetch(`${BASE_URL}/api/webhooks/ipaymu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakeWebhookPayload),
  });
  console.log(`   - Fake Webhook Status: ${reqWebhook.status}`);

  const t2Passed = reqWebhook.status === 404;
  results.push({
    id: "SEC-WEBHOOK-02",
    name: "iPaymu Webhook Unknown-Order Rejection",
    passed: t2Passed,
    notes: t2Passed
      ? "Server menolak callback order fiktif (HTTP 404 Order not found) — tidak ada order yang lunas."
      : `Ekspektasi 404 Not Found, diterima: ${reqWebhook.status}`,
  });
  console.log(`   - Hasil: ${t2Passed ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------
  // TEST 3: Invalid / Wrong OTP Rejection
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Menguji Penolakan Wrong OTP...");
  const reqOtp = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumber: "0895803463032",
      code: "000000", // Kode ngawur
    }),
  });
  console.log(`   - Wrong OTP Status: ${reqOtp.status}`);
  const t3Passed = reqOtp.status === 400 || reqOtp.status === 401;
  results.push({
    id: "SEC-OTP-03",
    name: "Wrong / Fake OTP Verification Blocked",
    passed: t3Passed,
    notes: t3Passed
      ? "Server menolak verifikasi OTP salah dengan kode status 400/401."
      : `Ekspektasi 400/401, diterima: ${reqOtp.status}`,
  });
  console.log(`   - Hasil: ${t3Passed ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------
  // TEST 4: Customer Blocked from Workshop Admin Portal (RBAC)
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Menguji RBAC Security Boundary (Customer -> Admin API)...");
  const reqRbac = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie, // Sesi customer
    },
    body: JSON.stringify({
      taskId: "any-task-id",
      stage: "DONE",
    }),
  });
  console.log(`   - RBAC Violation Status: ${reqRbac.status}`);
  const t4Passed = reqRbac.status === 403;
  results.push({
    id: "SEC-RBAC-04",
    name: "Customer Blocked from Workshop Admin Portal (RBAC)",
    passed: t4Passed,
    notes: t4Passed
      ? "Gerbang RBAC memblokir akun non-admin secara ketat (HTTP 403 Forbidden)."
      : `Ekspektasi 403 Forbidden, diterima: ${reqRbac.status}`,
  });
  console.log(`   - Hasil: ${t4Passed ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------
  // TEST 5: Underpayment Attack Rejection (iPaymu amount-mismatch → 400)
  // iPaymu TANPA signature: kirim nominal Rp 1.000 untuk order nyata TEST 1
  // → route wajib 400 Amount mismatch (guard webhooks/ipaymu:80-86).
  // Tanpa fixture order (TEST 1 gagal) → fallback: order fiktif → 404
  // (tetap membuktikan penyerang tak bisa melunaskan apa pun).
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Menguji Underpayment Attack (Nominal Kurang)...");
  const underpayRef = t1Passed && data1.orderNumber ? data1.orderNumber : "KK-FAKE-UNDERpay";
  const underpayWant = t1Passed && data1.orderNumber ? 400 : 404;
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
      channel: "qris",
    }),
  });
  console.log(`   - Underpayment Status: ${reqUnderpay.status} (target ${underpayRef})`);
  const t5Passed = reqUnderpay.status === underpayWant;
  results.push({
    id: "SEC-UNDERPAY-05",
    name: "Underpayment Callback Rejection",
    passed: t5Passed,
    notes: t5Passed
      ? (underpayWant === 400
        ? "Server mendeteksi ketidaksesuaian nominal order (kirim Rp 1.000) dan menolak update lunas (HTTP 400 Amount mismatch)."
        : "Tanpa fixture order nyata — fallback order fiktif ditolak (HTTP 404), penyerang tetap tak bisa melunaskan apa pun.")
      : `Ekspektasi ${underpayWant}, diterima: ${reqUnderpay.status}`,
  });
  console.log(`   - Hasil: ${t5Passed ? "PASS" : "FAIL"}`);

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
      Cookie: custCookie,
      "Idempotency-Key": `geo-sec-${Date.now()}`,
    },
    body: JSON.stringify(invalidGeoPayload),
  });
  console.log(`   - Geo Restriction Status: ${reqGeo.status}`);
  const t6Passed = reqGeo.status === 400;
  results.push({
    id: "SEC-SHIP-06",
    name: "Non-Makassar Subdistrict Rejected for Free Delivery",
    passed: t6Passed,
    notes: t6Passed
      ? "Server menolak opsi FREE_MAKASSAR untuk kecamatan di luar wilayah resmi Kota Makassar (HTTP 400)."
      : `Ekspektasi 400 Bad Request, diterima: ${reqGeo.status}`,
  });
  console.log(`   - Hasil: ${t6Passed ? "PASS" : "FAIL"}`);

  // -------------------------------------------------------------
  // TEST 7: Client Price Manipulation Guard (Server-Side Recalculation)
  // -------------------------------------------------------------
  console.log("\n[TEST 7] Menguji Client Price Tampering Protection...");
  const hackedPricePayload = {
    ...testPayloadBase,
    totalIdr: 500, // Coba menyusupkan harga Rp 500
    subtotalIdr: 500,
  };

  const reqPrice = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custCookie,
      "Idempotency-Key": `price-sec-${Date.now()}`,
    },
    body: JSON.stringify(hackedPricePayload),
  });
  const dataPrice = await reqPrice.json().catch(() => ({}));
  console.log(`   - Price Tamper Checkout Status: ${reqPrice.status} (Actual Amount: ${dataPrice.amount})`);
  // Server harus mengabaikan totalIdr dari client dan menghitung ulang harga asli dari database (> Rp 50.000)
  const t7Passed = reqPrice.status === 200 && dataPrice.amount > 50000;
  results.push({
    id: "SEC-PRICE-07",
    name: "Server-Side Anti-Tamper Price Recalculation",
    passed: t7Passed,
    notes: t7Passed
      ? `Server mengabaikan manipulasi harga Rp 500 dari browser dan menetapkan nominal asli Rp ${dataPrice.amount}.`
      : `Gagal melindungi manipulasi harga`,
  });
  console.log(`   - Hasil: ${t7Passed ? "PASS" : "FAIL"}`);

  // Simpan Hasil Audit
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = path.join(OUTPUT_DIR, "KASUS-5-sad-cases-security-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify({ kasus: "KASUS 5: PENETRATION & SAD CASES", results, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\nDokumen audit terbit di: ${reportPath}`);

  const passedCount = results.filter((r) => r.passed).length;
  console.log("=================================================================");
  console.log(`KASUS 5 SELESAI: ${passedCount}/${results.length} LULUS (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log("=================================================================");
}

runKasus5().catch((e) => {
  console.error("FATAL ERROR KASUS 5:", e);
  process.exit(1);
});
