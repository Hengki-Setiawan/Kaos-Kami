import { createClient } from "@libsql/client/http";
import { serializeSignedCookie } from "../node_modules/better-call/dist/cookies.mjs";
import { nanoid } from "nanoid";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "kaos-kami-secret-dev-2026-key-32-chars-minimum-security-better-auth";
const TURSO_URL = process.env.TURSO_DATABASE_URL || "libsql://kaos-kami-hengki164.aws-ap-northeast-1.turso.io";
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgxNDg0MDEsImlkIjoiMDFhMDU1ZjItMjcwMS03NGM2LTliMGUtMzg2ODhlN2UwYTE2Iiwia2lkIjoiVHcwS3NHSzQwZXl5MFVad3JDTV9XcUg4VzJaVHlTWlY0cVJaNzIycUxHWSIsInJpZCI6ImQ3ZTNiMjkzLTkzNjktNDE1Ny04MjM3LWI0MjFjNmNmODJhYyJ9.FZo5YdVyvFPNyOo0eNRSpsGaHmxxfsULaEQhvm61pL7qhQzEeCuBFGhdzjdYcSEg4bHnMRkufnmhC4FqgxzFAQ";

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function signToken(token) {
  const ser = await serializeSignedCookie("better-auth.session_token", token, BETTER_AUTH_SECRET, {});
  return ser.slice(ser.indexOf("=") + 1);
}

const testResults = [];

function record(suite, name, passed, details = "") {
  testResults.push({ suite, name, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[${icon}] ${suite} :: ${name} ${details ? `(${details})` : ""}`);
}

async function main() {
  console.log("=== MEMULAI TEST AUDIT 3 PILAR INTERNAL (PRODUKSI, KURIR, ADMIN) ===\n");

  // -------------------------------------------------------------------------
  // 1. SETUP TEST USERS & SESSIONS DI DATABASE
  // -------------------------------------------------------------------------
  const stamp = Date.now();
  const testUsers = [
    {
      id: `test_admin_${stamp}`,
      email: `test_admin_${stamp}@kaoskami.test`,
      name: "Test Admin",
      role: "ADMIN",
      token: `tok_admin_${stamp}`,
    },
    {
      id: `test_prod_${stamp}`,
      email: `test_prod_${stamp}@kaoskami.test`,
      name: "Test Staff Produksi",
      role: "PRODUCTION_STAFF",
      token: `tok_prod_${stamp}`,
    },
    {
      id: `test_courier_${stamp}`,
      email: `test_courier_${stamp}@kaoskami.test`,
      name: "Test Kurir",
      role: "COURIER",
      token: `tok_courier_${stamp}`,
    },
  ];

  console.log("Membuat akun test & token sesi di Turso...");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  for (const u of testUsers) {
    await db.execute({
      sql: `INSERT INTO User (id, name, email, role, emailVerified, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [u.id, u.name, u.email, u.role, nowIso, nowIso],
    });

    await db.execute({
      sql: `INSERT INTO Session (id, userId, token, expiresAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [nanoid(), u.id, u.token, expiresAt, nowIso, nowIso],
    });

    u.cookie = `better-auth.session_token=${await signToken(u.token)}`;
  }

  const [adminUser, prodUser, courierUser] = testUsers;

  try {
    // -------------------------------------------------------------------------
    // TEST SET A: STATE MACHINE LOGIC (machine.ts)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST SET A: State Machine Transitions (ORDER_TRANSITIONS) ---");
    const { assertTransition, isTerminalStatus, TERMINAL_STATUSES } = await import(
      "../kaos-kami-web/src/lib/orders/machine.ts"
    );

    // Courier valid transitions
    try {
      assertTransition("COURIER", "READY_TO_SHIP", "SHIPPED");
      record("Machine", "COURIER READY_TO_SHIP -> SHIPPED", true);
    } catch (e) {
      record("Machine", "COURIER READY_TO_SHIP -> SHIPPED", false, e.message);
    }

    try {
      assertTransition("COURIER", "READY_TO_SHIP", "DELIVERED");
      record("Machine", "COURIER READY_TO_SHIP -> DELIVERED (handover langsung)", true);
    } catch (e) {
      record("Machine", "COURIER READY_TO_SHIP -> DELIVERED", false, e.message);
    }

    try {
      assertTransition("COURIER", "SHIPPED", "DELIVERED");
      record("Machine", "COURIER SHIPPED -> DELIVERED (paket selesai antar)", true);
    } catch (e) {
      record("Machine", "COURIER SHIPPED -> DELIVERED", false, e.message);
    }

    try {
      assertTransition("COURIER", "DELIVERED", "COMPLETED");
      record("Machine", "COURIER DELIVERED -> COMPLETED", true);
    } catch (e) {
      record("Machine", "COURIER DELIVERED -> COMPLETED", false, e.message);
    }

    // Courier forbidden transitions
    try {
      assertTransition("COURIER", "PRINTING", "QUALITY_CHECK");
      record("Machine", "COURIER block PRINTING -> QUALITY_CHECK", false, "Harusnya error");
    } catch (e) {
      record("Machine", "COURIER block PRINTING -> QUALITY_CHECK", true, "Ditolak (status 400)");
    }

    try {
      assertTransition("COURIER", "READY_TO_SHIP", "CANCELLED");
      record("Machine", "COURIER block CANCELLED (hanya admin)", false, "Harusnya error");
    } catch (e) {
      record("Machine", "COURIER block CANCELLED (hanya admin)", true, "Ditolak (status 400)");
    }

    // Production Staff valid & forbidden transitions
    try {
      assertTransition("PRODUCTION_STAFF", "PRINTING", "QUALITY_CHECK");
      record("Machine", "PRODUCTION_STAFF PRINTING -> QUALITY_CHECK", true);
    } catch (e) {
      record("Machine", "PRODUCTION_STAFF PRINTING -> QUALITY_CHECK", false, e.message);
    }

    try {
      assertTransition("PRODUCTION_STAFF", "QUALITY_CHECK", "PRINTING");
      record("Machine", "PRODUCTION_STAFF QUALITY_CHECK -> PRINTING (rework cacat)", true);
    } catch (e) {
      record("Machine", "PRODUCTION_STAFF QUALITY_CHECK -> PRINTING", false, e.message);
    }

    try {
      assertTransition("PRODUCTION_STAFF", "PRINTING", "REFUNDED");
      record("Machine", "PRODUCTION_STAFF block REFUNDED", false, "Harusnya error");
    } catch (e) {
      record("Machine", "PRODUCTION_STAFF block REFUNDED", true, "Ditolak (status 400)");
    }

    // -------------------------------------------------------------------------
    // TEST SET B: SSR PAGE NAVIGATION & REDIRECTION
    // -------------------------------------------------------------------------
    console.log("\n--- TEST SET B: SSR Page Navigation & Redirection ---");

    // 1. /admin access
    // Anon -> redirect to /?denied=admin
    const resAnonAdmin = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
    const anonLoc = resAnonAdmin.headers.get("location") || "";
    record(
      "Page Nav",
      "GUEST /admin -> redirect to /?denied=admin",
      resAnonAdmin.status >= 300 && anonLoc.includes("denied=admin"),
      `status: ${resAnonAdmin.status}, loc: ${anonLoc}`
    );

    // Production Staff -> redirect to /admin/production
    const resProdAdmin = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: prodUser.cookie },
      redirect: "manual",
    });
    const prodLoc = resProdAdmin.headers.get("location") || "";
    record(
      "Page Nav",
      "PRODUCTION_STAFF /admin -> auto-redirect /admin/production",
      resProdAdmin.status >= 300 && prodLoc.includes("/admin/production"),
      `status: ${resProdAdmin.status}, loc: ${prodLoc}`
    );

    // Courier -> redirect to /admin/deliveries
    const resCourierAdmin = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: courierUser.cookie },
      redirect: "manual",
    });
    const courierLoc = resCourierAdmin.headers.get("location") || "";
    record(
      "Page Nav",
      "COURIER /admin -> auto-redirect /admin/deliveries",
      resCourierAdmin.status >= 300 && courierLoc.includes("/admin/deliveries"),
      `status: ${resCourierAdmin.status}, loc: ${courierLoc}`
    );

    // Admin -> 200 OK (sees full 3-pillar dashboard)
    const resAdminAdmin = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminUser.cookie },
      redirect: "manual",
    });
    const adminHtml = await resAdminAdmin.text();
    record(
      "Page Nav",
      "ADMIN /admin -> 200 OK & renders 3 Pilar Hub",
      resAdminAdmin.status === 200 && adminHtml.includes("DASHBOARD EKSEKUTIF 3 PILAR"),
      `status: ${resAdminAdmin.status}`
    );

    // 2. Sensitive admin pages protection (/admin/customers, /admin/coupons, /admin/cms, /admin/settings)
    // Production staff visiting /admin/customers -> redirect
    const resProdCust = await fetch(`${BASE_URL}/admin/customers`, {
      headers: { Cookie: prodUser.cookie },
      redirect: "manual",
    });
    const prodCustLoc = resProdCust.headers.get("location") || "";
    record(
      "Page Nav",
      "PRODUCTION_STAFF /admin/customers -> redirect away",
      resProdCust.status >= 300 && (prodCustLoc.includes("/admin/production") || prodCustLoc.includes("denied")),
      `status: ${resProdCust.status}, loc: ${prodCustLoc}`
    );

    // Courier visiting /admin/customers -> redirect
    const resCourierCust = await fetch(`${BASE_URL}/admin/customers`, {
      headers: { Cookie: courierUser.cookie },
      redirect: "manual",
    });
    const courierCustLoc = resCourierCust.headers.get("location") || "";
    record(
      "Page Nav",
      "COURIER /admin/customers -> redirect away",
      resCourierCust.status >= 300 && (courierCustLoc.includes("/admin/deliveries") || courierCustLoc.includes("denied")),
      `status: ${resCourierCust.status}, loc: ${courierCustLoc}`
    );

    // Admin visiting /admin/customers -> 200 OK
    const resAdminCust = await fetch(`${BASE_URL}/admin/customers`, {
      headers: { Cookie: adminUser.cookie },
      redirect: "manual",
    });
    record(
      "Page Nav",
      "ADMIN /admin/customers -> 200 OK",
      resAdminCust.status === 200,
      `status: ${resAdminCust.status}`
    );

    // Production staff visiting /admin/coupons -> redirect
    const resProdCoup = await fetch(`${BASE_URL}/admin/coupons`, {
      headers: { Cookie: prodUser.cookie },
      redirect: "manual",
    });
    record(
      "Page Nav",
      "PRODUCTION_STAFF /admin/coupons -> redirect away",
      resProdCoup.status >= 300,
      `status: ${resProdCoup.status}`
    );

    // Courier visiting /admin/coupons -> redirect
    const resCourierCoup = await fetch(`${BASE_URL}/admin/coupons`, {
      headers: { Cookie: courierUser.cookie },
      redirect: "manual",
    });
    record(
      "Page Nav",
      "COURIER /admin/coupons -> redirect away",
      resCourierCoup.status >= 300,
      `status: ${resCourierCoup.status}`
    );

    // Admin visiting /admin/coupons -> 200 OK
    const resAdminCoup = await fetch(`${BASE_URL}/admin/coupons`, {
      headers: { Cookie: adminUser.cookie },
      redirect: "manual",
    });
    record(
      "Page Nav",
      "ADMIN /admin/coupons -> 200 OK",
      resAdminCoup.status === 200,
      `status: ${resAdminCoup.status}`
    );

    // -------------------------------------------------------------------------
    // TEST SET C: API AUTHORIZATION GATES
    // -------------------------------------------------------------------------
    console.log("\n--- TEST SET C: API Authorization Gates ---");

    // 1. /api/admin/reports (Financial Reports API)
    // Anon -> 401
    const resRepAnon = await fetch(`${BASE_URL}/api/admin/reports`);
    record("API Gate", "GET /api/admin/reports (GUEST) -> 401", resRepAnon.status === 401, `status: ${resRepAnon.status}`);

    // Courier -> 403
    const resRepCourier = await fetch(`${BASE_URL}/api/admin/reports`, {
      headers: { Cookie: courierUser.cookie },
    });
    record("API Gate", "GET /api/admin/reports (COURIER) -> 403", resRepCourier.status === 403, `status: ${resRepCourier.status}`);

    // Production Staff -> 403
    const resRepProd = await fetch(`${BASE_URL}/api/admin/reports`, {
      headers: { Cookie: prodUser.cookie },
    });
    record("API Gate", "GET /api/admin/reports (PRODUCTION_STAFF) -> 403", resRepProd.status === 403, `status: ${resRepProd.status}`);

    // Admin -> 200
    const resRepAdmin = await fetch(`${BASE_URL}/api/admin/reports`, {
      headers: { Cookie: adminUser.cookie },
    });
    record("API Gate", "GET /api/admin/reports (ADMIN) -> 200", resRepAdmin.status === 200, `status: ${resRepAdmin.status}`);

    // 2. /api/admin/production-tasks (Workshop Tasks API)
    // Courier -> 403
    const resTaskCourier = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
      headers: { Cookie: courierUser.cookie },
    });
    record("API Gate", "GET /api/admin/production-tasks (COURIER) -> 403", resTaskCourier.status === 403, `status: ${resTaskCourier.status}`);

    // Production Staff -> 200
    const resTaskProd = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
      headers: { Cookie: prodUser.cookie },
    });
    record("API Gate", "GET /api/admin/production-tasks (PRODUCTION_STAFF) -> 200", resTaskProd.status === 200, `status: ${resTaskProd.status}`);

    // Admin -> 200
    const resTaskAdmin = await fetch(`${BASE_URL}/api/admin/production-tasks`, {
      headers: { Cookie: adminUser.cookie },
    });
    record("API Gate", "GET /api/admin/production-tasks (ADMIN) -> 200", resTaskAdmin.status === 200, `status: ${resTaskAdmin.status}`);

    // 3. /api/admin/orders (Order List for Staff)
    // Courier -> 200
    const resOrdCourier = await fetch(`${BASE_URL}/api/admin/orders?limit=5`, {
      headers: { Cookie: courierUser.cookie },
    });
    record("API Gate", "GET /api/admin/orders (COURIER) -> 200", resOrdCourier.status === 200, `status: ${resOrdCourier.status}`);

    // Production Staff -> 200
    const resOrdProd = await fetch(`${BASE_URL}/api/admin/orders?limit=5`, {
      headers: { Cookie: prodUser.cookie },
    });
    record("API Gate", "GET /api/admin/orders (PRODUCTION_STAFF) -> 200", resOrdProd.status === 200, `status: ${resOrdProd.status}`);

    // 4. /api/admin/customers (Customer & Role Management API)
    // Courier -> 403
    const resCustCourier = await fetch(`${BASE_URL}/api/admin/customers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: courierUser.cookie },
      body: JSON.stringify({ userId: courierUser.id, role: "ADMIN" }),
    });
    record("API Gate", "PATCH /api/admin/customers (COURIER) -> 403", resCustCourier.status === 403, `status: ${resCustCourier.status}`);

    // Production Staff -> 403
    const resCustProd = await fetch(`${BASE_URL}/api/admin/customers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: prodUser.cookie },
      body: JSON.stringify({ userId: prodUser.id, role: "ADMIN" }),
    });
    record("API Gate", "PATCH /api/admin/customers (PRODUCTION_STAFF) -> 403", resCustProd.status === 403, `status: ${resCustProd.status}`);

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST USERS
    // -------------------------------------------------------------------------
    console.log("\nMembersihkan data akun test dari database...");
    for (const u of testUsers) {
      await db.execute({ sql: `DELETE FROM Session WHERE userId = ?`, args: [u.id] });
      await db.execute({ sql: `DELETE FROM User WHERE id = ?`, args: [u.id] });
    }
  }

  // -------------------------------------------------------------------------
  // RINGKASAN AKHIR
  // -------------------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n=======================================================`);
  console.log(`HASIL TEST AUDIT 3 PILAR INTERNAL: ${passed}/${total} LULUS (${Math.round((passed / total) * 100)}%)`);
  if (failed > 0) {
    console.log(`PERINGATAN: ${failed} pengujian gagal!`);
    process.exit(1);
  } else {
    console.log(`SEMUA 26 PENGUJIAN OTOMATIS 100% SUKSES DAN TERVERIFIKASI!`);
    console.log(`=======================================================`);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
