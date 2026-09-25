# L3 — Catatan project Playwright (TIDAK edit `playwright.config.ts`)

> File ini usulan konfigurasi saja. `playwright.config.ts` saat ini HANYA punya
> project `chromium` (`testMatch: c-0[1-5]`) + `api` (`testMatch: c-0[6-9]/c-10`).
> Spec `l3-*.spec.ts` TIDAK cocok dengan keduanya → butuh project baru `l3`.
> JANGAN edit config tanpa perintah owner; tempel blok di bawah saat disuruh.

## `testMatch` yang disarankan untuk project `l3`

```ts
{
  name: "l3",
  // Ketiga draft L3 + setup auth sekali (pola Elio Navarrete: login via API,
  // spec TIDAK login UI berulang — hemat rate OTP).
  testMatch: /l3-.*\.spec\.ts/,
  use: { ...devices["Desktop Chrome"] },
  dependencies: ["setup"],
}
```

Rincian file → `testMatch` + kebutuhan sesi:

| File | testMatch | Sesi / fixture |
|---|---|---|
| `l3-invoice.spec.ts` (U-060, U-071, U-073, U-080) | `l3-invoice` | Tanpa storageState; butuh `E2E_L3_ORDER_ID` (PENDING) + `E2E_L3_SHIPPED_ID` |
| `l3-dashboard.spec.ts` (U-072, U-074, U-075, U-076) | `l3-dashboard` | `tests/e2e/.auth/user.json` (SKIP bila tak ada); opsional `E2E_L3_DESIGN_ID` |
| `l3-admin.spec.ts` (A-026, A-039, A-044) | `l3-admin` | `tests/e2e/.auth/admin.json` (SKIP bila tak ada); opsional `E2E_L3_ORDER_ID` |

Catatan: `l3-invoice` + `l3-dashboard` jalan sebagai user/publik biasa — JANGAN
pasang `storageState` admin di level project `l3` (sesi per-file via `test.use`).

## Cara run (setelah project `l3` ditambahkan + `@playwright/test` terinstal)

```powershell
# 1. Auth sekali (mengisi .auth/user.json + .auth/admin.json)
npx playwright test --project=setup

# 2. Semua L3
E2E_L3_ORDER_ID=<pending> E2E_L3_SHIPPED_ID=<shipped> E2E_L3_DESIGN_ID=<design> `
  npx playwright test --project=l3

# 3. Per file
E2E_L3_ORDER_ID=<pending> E2E_L3_SHIPPED_ID=<shipped> npx playwright test --project=l3 l3-invoice
npx playwright test --project=l3 l3-dashboard
npx playwright test --project=l3 l3-admin
```

## Aturan draft (diikuti ketiga spec)

- Header `// @ts-nocheck`, TANPA `waitForTimeout`, web-first assertions.
- SKIP-jujur bila fixture/sesi tak ada (klaim merah palsu dilarang).
- Mock hanya pihak ketiga (AgenWebsite, Fonnte, GA); DILARANG mock `/api/*` sendiri + Duitku.
- Aksi destruktif tidak dieksekusi: tombol bayar/cetak tidak diklik, dialog batal
  ditutup via BATAL, print diuji via `emulateMedia({ media: "print" })`.
