// LHCI mobile (motoG4 + 4G) — pasangan lighthouserc.js (desktop).
// Emulasi = default mobile Lighthouse: formFactor mobile, CPU 4x slowdown,
// jaringan 4G simulasi, viewport 360x640 (Moto G4). Budget CWV disamakan:
// LCP < 3500ms & CLS < 0.1 = error (gagalkan CI).
module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/", "http://localhost:3000/catalog", "http://localhost:3000/studio"],
      startServerCommand: "npm run start",
      numberOfRuns: 3,
      settings: {
        formFactor: "mobile",
        throttlingMethod: "simulate",
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 3000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        interactive: ["warn", { maxNumericValue: 4500 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
