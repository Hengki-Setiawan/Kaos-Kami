// Test script for enhanced dashboard and order pages on localhost
const BASE = "http://localhost:3000";

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN HALAMAN & FITUR LOKAL ===");

  // 1. Dashboard route
  try {
    const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    console.log(`[TEST 1] /dashboard status: ${res.status} (${res.status === 200 ? "OK" : res.status === 307 ? "Redirect (Auth Gate Berfungsi)" : "Status: " + res.status})`);
  } catch (e) {
    console.error(`[TEST 1] Gagal mengakses /dashboard:`, e.message);
  }

  // 2. Admin Gang Sheet route
  try {
    const res = await fetch(`${BASE}/admin/gang-sheet`, { redirect: "manual" });
    console.log(`[TEST 2] /admin/gang-sheet status: ${res.status} (${res.status === 200 ? "OK" : res.status === 307 ? "Redirect (Admin Gate Berfungsi)" : "Status: " + res.status})`);
  } catch (e) {
    console.error(`[TEST 2] Gagal mengakses /admin/gang-sheet:`, e.message);
  }

  // 3. Auth API: resolve-identifier
  try {
    const res = await fetch(`${BASE}/api/auth/resolve-identifier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "08123456789" }),
    });
    const data = await res.json();
    console.log(`[TEST 3] /api/auth/resolve-identifier status: ${res.status}, data:`, data);
  } catch (e) {
    console.error(`[TEST 3] Gagal resolve-identifier:`, e.message);
  }

  // 4. Auth API: send-email-otp validation
  try {
    const res = await fetch(`${BASE}/api/auth/send-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    });
    const data = await res.json();
    console.log(`[TEST 4] /api/auth/send-email-otp validation status: ${res.status} (Harus 400 jika email invalid), error: ${data.error}`);
  } catch (e) {
    console.error(`[TEST 4] Gagal send-email-otp:`, e.message);
  }

  // 5. Auth API: verify-turnstile
  try {
    const res = await fetch(`${BASE}/api/auth/verify-turnstile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token" }),
    });
    const data = await res.json();
    console.log(`[TEST 5] /api/auth/verify-turnstile status: ${res.status}, success: ${data.success}`);
  } catch (e) {
    console.error(`[TEST 5] Gagal verify-turnstile:`, e.message);
  }

  console.log("=== SEMUA PENGUJIAN API & ROUTE SELESAI ===");
}

runTests();
