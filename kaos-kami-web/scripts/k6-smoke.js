// kaos-kami-web/scripts/k6-smoke.js — SIAP SIMPAN (tanpa instalasi tambahan selain binary k6).
// SSOT: Blueprint/e2e/E2E-MASTER-PLAN.md Bab 8 R7.3 (k6 smoke 10 VU, SLO p95<2s) + Bab 10 P-001 + U-005/U-006.
// ATURAN: STAGING-ONLY untuk beban; localhost hanya verifikasi smoke. READ-ONLY: murni GET
// (tanpa tulis-DB, tanpa checkout/OTP/payment, tanpa fixture TEST-*).
// Run: BASE_URL=https://staging.kaoskami.id k6 run kaos-kami-web/scripts/k6-smoke.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 2 }, // pemanasan (buang cold-start dari SLO)
    { duration: '1m', target: 10 }, // smoke R7.3: 10 VU — BUKAN load penuh
    { duration: '20s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // SLO: p95 < 2 detik
    http_req_failed: ['rate<0.01'], // error rate < 1%
    checks: ['rate>0.99'], // check lolos > 99%
  },
};

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function () {
  group('health', () => {
    const r = http.get(`${BASE_URL}/api/health`);
    check(r, {
      'health 200': (x) => x.status === 200,
      'health <2s': (x) => x.timings.duration < 2000,
    });
  });

  group('katalog', () => {
    const r1 = http.get(`${BASE_URL}/api/catalog/variants`);
    check(r1, {
      'variants 200': (x) => x.status === 200,
      'variants success:true': (x) => x.json('success') === true,
    });
    const r2 = http.get(`${BASE_URL}/api/catalog/categories`);
    check(r2, { 'categories 200': (x) => x.status === 200 });
  });

  group('quote', () => {
    // Bentuk query persis U-006 (tanpa sesi, tanpa tulis).
    const r = http.get(
      `${BASE_URL}/api/shipping/quote?city=Makassar&postalCode=90211&qty=1&deliveryMethod=EXPEDITION_MANUAL`,
    );
    check(r, {
      'quote 200': (x) => x.status === 200,
      'quote live-atau-zona': (x) => {
        try {
          const j = x.json();
          return !!(j.live || j.zone || j.zones || j.rates);
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1); // hormati rate-limit global (Bab 0.1-6)
}
