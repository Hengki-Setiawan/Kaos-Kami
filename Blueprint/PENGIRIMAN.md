# BLUEPRINT PENGIRIMAN — Kaos Kami (Makassar Hyperlocal + Ekspedisi Nasional)

Aturan bisnis (owner, Sep 2026):
1. **PICKUP** → user ambil di workshop, alamat tampil di invoice.
2. **Makassar** → tim antar **GRATIS** (`FREE_MAKASSAR`, Rp 0, tanpa minimal).
3. **Luar Makassar** → user lihat daftar kurir + pilih termurah (real-time).

Workshop: Jl. Galangan Kapal Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo,
Kota Makassar 90211 — GPS -5.106081, 119.432365.
Konstanta: `kaos-kami-web/src/lib/shop.ts` (alamat, WA, lat/lon, kode pos).

## Arsitektur (3 lapis, fail-safe berurutan)

```
User pilih kurir → /api/shipping/quote → checkout resolve server-side
  L1 PRIMER  : AgenWebsite Rate API (live, cache 30 mnt hemat kuota)
  L2 FALLBACK: tabel ExpeditionZone (milik sendiri, edit via /admin/shipping)
  L3 DARURAT : flat Rp 25.000 (checkout tidak pernah mati)
```

Harga FINAL selalu dihitung server (`checkout/route.ts` + `mobile/.../checkout`),
tidak pernah percaya angka dari client (prinsip sama seperti harga kaos).

## Metode pengiriman (5)

| Method | Biaya | Keterangan |
|---|---|---|
| PICKUP | Rp 0 | Ambil di workshop; invoice tampilkan alamat + "tunjukkan no. pesanan" |
| FREE_MAKASSAR | Rp 0 | Diantar tim, se-Kota Makassar |
| INSTANT_COURIER | Rp 0 + COD | Maxim/GoSend/Grab, bayar ke driver |
| FLAT_MAKASSAR | Rp 15.000 | Kurir internal (legacy, tetap didukung) |
| EXPEDITION_MANUAL | dinamis | Luar kota: live AgenWebsite → fallback zona → flat |

## AgenWebsite Rate API (provider live)

- Docs: https://www.agenwebsite.com/documentation/agenwebsite-rate-api/
- Free: Rp 0, **150 req/hari** + 20/menit, tanpa kartu kredit, reset 00:00 WIB.
- Kurir v1 (verifikasi via `GET /v1/couriers`, bukan klaim marketing): J&T, Lion, SAP, SPX, J&T Cargo. **JNE/SiCepat belum ada.**
- Scope v1: cek tarif saja (reguler, non-COD). Resi tetap manual.
- Auth: header `x-api-key: awk_live_...` (prod) / `awk_test_...` (sandbox).
- File: `src/lib/shipping/agenwebsite.ts` (rates, locations, usage, couriers + cache 30 mnt).
- Endpoint kita: `GET /api/shipping/quote?city=&postalCode=&weightGrams=` →
  `{source:"live",rates}` atau `{source:"zone[-fallback]",zones}`.
- Autocomplete kota: `GET /api/shipping/locations?q=` (proxy, key aman di server).
- Kuota admin: `GET /api/admin/shipping/usage` (tampil di /admin/shipping, warning 80/95%).
- 429/partial/timeout → fail-soft null → fallback zona (checkout tidak mati).
- Berat: `totalQty × 250g` (kaos + packing), dihitung server dari items tervalidasi.

### Aktivasi key (oleh owner, ±10 mnt)

1. Daftar agenwebsite.com → My Account → API → verifikasi email → Generate Key.
   (Saat dokumen ini ditulis: mode pratinjau → butuh persetujuan manual.)
2. Simpan sebagai secret (JANGAN commit):
   - Prod: `npx wrangler secret put AGENWEBSITE_RATE_API_KEY` (di `kaos-kami-web/`)
   - Lokal: tambah ke `.env.local` → `AGENWEBSITE_RATE_API_KEY=awk_live_...`
   - Sandbox: `AGENWEBSITE_SANDBOX=true` + key `awk_test_...`
3. Verifikasi: buka `/admin/shipping` → panel kuota harus tampil (bukan "belum dipasang").
   Test manual: `GET /api/shipping/quote?city=Gowa&postalCode=92111&weightGrams=500`
   → `source` harus `"live"`.
4. Tanpa key pun semua jalan (source `"zone"`, estimasi tabel).

## GPS isi-alamat

- Browser/WebView `navigator.geolocation` (tanpa plugin native) →
  `GET /api/geocode/reverse?lat&lon` (proxy Nominatim: UA benar + timeout 8s,
  rate-limit 10/mnt) → isi alamat + kecamatan/kota otomatis.
- Android: `ACCESS_COARSE/FINE_LOCATION` (runtime prompt).
- Web: tombol di CheckoutModal (semua metode + panel ekspedisi).
- HP: tombol di CheckoutSheet step 1 (+ isi kota tujuan bila mode ekspedisi).

## File terkait

- `src/lib/shipping/agenwebsite.ts`, `zones.ts`, `deliveryOptions.ts`
- `src/app/api/shipping/quote|locations/route.ts`, `src/app/api/geocode/reverse/route.ts`
- `src/app/api/admin/zones[/[id]]/route.ts`, `src/app/api/admin/shipping/usage/route.ts`
- `src/app/admin/shipping/page.tsx`, `src/components/ui/CheckoutModal.tsx`
- `src/app/orders/[id]/page.tsx` (alamat PICKUP + resi)
- Mobile: `deliveryOptionsMobile.ts`, `CheckoutSheet.tsx`, `mobileApiClient.ts`
  (quoteShipping, reverseGeocode, API_BASE_URL), `UserOrderTracker.tsx`

## Provider masa depan (slot siap)

`zones.ts` → `ExpeditionProvider` interface (`quote(city, weightGrams)`).
Kandidat: **Biteship** (Rp5/cek, 30+ kurir, resi+pickup otomatis gratis —
tujuan akhir saat butuh otomasi resi). Ganti 1 file + env, tanpa bongkar checkout.
