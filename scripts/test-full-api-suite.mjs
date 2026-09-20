// Comprehensive parallel API and logic test suite
const BASE = "http://localhost:3000";

async function test(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[PASS] ${name} (${duration}ms):`, result || "OK");
    return { name, pass: true, duration, result };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[FAIL] ${name} (${duration}ms):`, err.message);
    return { name, pass: false, duration, error: err.message };
  }
}

async function runSuite() {
  console.log("=== MEMULAI TEST SUITE LENGKAP API & LOGIKA (PARALEL) ===");

  const results = await Promise.all([
    // Group 1: Auth & Identifier Resolution
    test("Auth: Resolve Identifier (Email)", async () => {
      const res = await fetch(`${BASE}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "customizer@kaoskami.com" }),
      });
      const data = await res.json();
      if (res.status !== 200 || data.email !== "customizer@kaoskami.com") {
        throw new Error(`Invalid response: ${JSON.stringify(data)}`);
      }
      return `Resolved email: ${data.email}`;
    }),

    test("Auth: Resolve Identifier (WhatsApp Phone 0812...)", async () => {
      const res = await fetch(`${BASE}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "081299887766" }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.email.includes("@kaoskami.phone")) {
        throw new Error(`Invalid response: ${JSON.stringify(data)}`);
      }
      return `Resolved phone: ${data.email}`;
    }),

    test("Auth: Turnstile Protection Fail-Closed on Bad Token", async () => {
      const res = await fetch(`${BASE}/api/auth/verify-turnstile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "fake-test-token" }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success === true) {
        throw new Error("Turnstile should have rejected fake token!");
      }
      return `Correctly blocked bad token (status: ${res.status})`;
    }),

    test("Auth: Send OTP to Email Validation", async () => {
      const testEmail = `makassar.audit.${Date.now()}@example.com`;
      const res = await fetch(`${BASE}/api/auth/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(`Failed to send OTP: ${data.error}`);
      }
      return `OTP sent to ${testEmail}, devCode: ${data.devCode}`;
    }),

    // Group 2: Shipping & Locations
    test("Shipping: Get Shipping Locations", async () => {
      const res = await fetch(`${BASE}/api/shipping/locations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `Locations loaded (${Array.isArray(data) ? data.length + " lokasi" : "OK"})`;
    }),

    test("Shipping: Get FREE_MAKASSAR Shipping Quote", async () => {
      const res = await fetch(`${BASE}/api/shipping/quote?city=Makassar&deliveryMethod=FREE_MAKASSAR`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `Quote received (source: ${data.source || "local"})`;
    }),

    // Group 3: Checkout Validation Guard
    test("Checkout: Fail-Closed on Invalid Empty Request", async () => {
      const res = await fetch(`${BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status !== 400 && res.status !== 401) {
        throw new Error(`Expected 400/401 on empty body, got: ${res.status}`);
      }
      return `Checkout properly guarded (status: ${res.status}, rejected empty payload)`;
    }),

    // Group 4: Cron & System Health
    test("Public: Backup Status Endpoint", async () => {
      const res = await fetch(`${BASE}/api/cron/backup-status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `Backup status available: count=${data.count}`;
    }),

    // Group 5: Protected Route Gates
    test("Security: /admin Protected Gate", async () => {
      const res = await fetch(`${BASE}/admin`, { redirect: "manual" });
      if (res.status !== 307 && res.status !== 302 && res.status !== 401 && res.status !== 403) {
        throw new Error(`Admin route allowed unauthenticated access! Status: ${res.status}`);
      }
      return `Admin gate correctly redirected/blocked unauthenticated request (status: ${res.status})`;
    }),

    test("Security: /dashboard Protected Gate", async () => {
      const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
      if (res.status !== 307 && res.status !== 302 && res.status !== 401 && res.status !== 403) {
        throw new Error(`Dashboard route allowed unauthenticated access! Status: ${res.status}`);
      }
      return `Dashboard gate correctly redirected/blocked unauthenticated request (status: ${res.status})`;
    }),
  ]);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log("\n=================================================");
  console.log(`HASIL AKHIR TEST SUITE: ${passed} PASSED / ${failed} FAILED (TOTAL ${results.length})`);
  console.log("=================================================");
}

runSuite();
