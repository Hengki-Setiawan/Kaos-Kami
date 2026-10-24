// Live Production Deep Audit Script for https://kaoskami.biz.id
import https from "node:https";

const BASE_URL = "https://kaoskami.biz.id";

const PAGES = [
  "/",
  "/studio",
  "/catalog",
  "/katalog",
  "/kalkulator-sablon",
  "/faq",
  "/track",
  "/contact",
  "/kontak",
  "/kredit",
  "/privacy",
  "/terms",
  "/terms-and-conditions",
  "/refund",
  "/refund-policy",
  "/robots.txt",
  "/sitemap.xml",
];

const APIS = [
  "/api/health",
  "/api/catalog/categories",
  "/api/catalog/colors",
  "/api/catalog/materials",
  "/api/catalog/variants",
  "/api/catalog/sablon-methods",
  "/api/lookbook",
  "/api/shipping/locations",
  "/api/shop/announcement",
  "/api/reviews",
];

const MODELS = [
  "/models/tee-basic.draco.glb",
  "/models/tee-basic.glb",
  "/models/hoodie-blue.draco.glb",
  "/models/hoodie-blue.glb",
  "/models/mannequin.glb",
  "/models/cap.draco.glb",
  "/models/sweater.draco.glb",
  "/models/longsleeve.draco.glb",
  "/models/pants.glb",
  "/models/shorts.glb",
  "/models/jacket.glb",
];

async function checkUrl(path, isJson = false) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": "KaosKami-AuditBot/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const duration = Date.now() - start;
        let jsonOk = true;
        let parseError = null;
        let parsed = null;
        if (isJson) {
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            jsonOk = false;
            parseError = e.message;
          }
        }
        resolve({
          path,
          status: res.statusCode,
          duration,
          bytes: Buffer.byteLength(data),
          headers: res.headers,
          jsonOk,
          parseError,
          parsed,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        path,
        status: 0,
        duration: Date.now() - start,
        error: err.message,
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({
        path,
        status: 408,
        duration: Date.now() - start,
        error: "Timeout 15s",
      });
    });
  });
}

async function runAudit() {
  console.log("=== KAOS KAMI LIVE PRODUCTION AUDIT ===");
  console.log(`Target: ${BASE_URL}\n`);

  console.log("--- 1. AUDITING PUBLIC PAGES ---");
  const pageResults = [];
  for (const page of PAGES) {
    const res = await checkUrl(page);
    const mark = res.status === 200 ? "OK [200]" : `FAIL [${res.status}]`;
    console.log(`  ${page.padEnd(25)} : ${mark} (${res.duration}ms, ${res.bytes} bytes)`);
    pageResults.push(res);
  }

  console.log("\n--- 2. AUDITING PUBLIC APIS ---");
  const apiResults = [];
  for (const api of APIS) {
    const res = await checkUrl(api, true);
    const mark = res.status === 200 && res.jsonOk ? "OK [200 JSON]" : `WARN/FAIL [${res.status}]`;
    console.log(`  ${api.padEnd(30)} : ${mark} (${res.duration}ms)`);
    if (!res.jsonOk && res.parseError) {
      console.log(`     JSON Parse Error: ${res.parseError}`);
    }
    apiResults.push(res);
  }

  console.log("\n--- 3. AUDITING 3D ASSETS & MODELS ---");
  const modelResults = [];
  for (const model of MODELS) {
    const res = await checkUrl(model);
    const mark = res.status === 200 ? `OK [200] (${(res.bytes / 1024 / 1024).toFixed(2)} MB)` : `FAIL [${res.status}]`;
    console.log(`  ${model.padEnd(32)} : ${mark} (${res.duration}ms)`);
    modelResults.push(res);
  }

  console.log("\n--- 4. AUDITING HEADERS & SECURITY ---");
  const homeRes = pageResults[0];
  if (homeRes && homeRes.headers) {
    const h = homeRes.headers;
    console.log(`  Strict-Transport-Security : ${h["strict-transport-security"] || "MISSING"}`);
    console.log(`  X-Content-Type-Options    : ${h["x-content-type-options"] || "MISSING"}`);
    console.log(`  X-Frame-Options           : ${h["x-frame-options"] || "MISSING"}`);
    console.log(`  Content-Security-Policy   : ${h["content-security-policy"] ? "PRESENT (" + h["content-security-policy"].length + " chars)" : "MISSING"}`);
    console.log(`  X-OpenNext                : ${h["x-opennext"] || "MISSING"}`);
  }

  console.log("\n=== AUDIT FINISHED ===");
}

runAudit();
