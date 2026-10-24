# 01 — LANDING PAGE, HALAMAN PUBLIK & SEO

> Sumber: Auditor 1 (very thorough). Semua path relatif `kaos-kami-web/`. Status fisik halaman publik: **🟡 AUDIT SELESAI — MENUNGGU VERIFIKASI OWNER**.

## A. Peta file halaman publik

| File | Peran |
|---|---|
| `src/app/layout.tsx` | Root layout: metadata global, next/font (Syne + Jakarta), theme-init, GA4 + CF Analytics, providers + chat widget |
| `src/app/page.tsx` | Landing story-mode 3D: Preloader, CanvasStage (dynamic), Hero/TechSpecs/BackGraphic, StoreShowcase, About, Footer |
| `src/components/ui/HeroOverlay.tsx` | Hero h1 + CTA + fetch CMS hero |
| `src/components/ui/TechSpecsOverlay.tsx` / `BackGraphicOverlay.tsx` | Fase 2–4 story scroll |
| `src/components/ui/StoreShowcaseSection.tsx` | Etalase marquee + modal detail + add-to-cart |
| `src/components/ui/AboutWorkshopSection.tsx` | Section tentang + metrik + 4 saluran kontak |
| `src/components/ui/JsonLd.tsx` | JSON-LD Product + CanvasErrorBoundary |
| `src/app/catalog/` (+`/katalog` redirect) | Katalog produk |
| `src/app/{track,kalkulator-sablon,faq,kontak,terms,refund,privacy,kredit}/` | Halaman publik lain |
| `src/app/{sitemap.ts,robots.ts,opengraph-image.tsx,not-found.tsx}` | Infrastruktur SEO |

## B. Temuan

###-transfer1. [BLOCKER-SEO] Canonical global "/" dipaksa ke SEMUA halaman
- **Bukti:** `src/app/layout.tsx:38-40` — `alternates: { canonical: "/" }`. Tidak ada satu pun page yang men-set `alternates` sendiri (grep hanya layout). Metadata merge Next → `/catalog`, `/faq`, `/kontak`, dst. memancarkan `<link rel="canonical" href="…/">` yang menyeberangkan semua halaman ke beranda.
- **Dampak:** Google menganggap semua subhalaman duplikat beranda → indeks subhalaman mati.
- **Perbaikan:** hapus `alternates` dari layout; tambahkan canonical per page (`/catalog`, `/faq`, dst).

### 2. [BLOCKER-PERF] three.js terimpor statis di bundle awal landing
- **Bukti:** `src/hooks/useScrollPhases.ts:4` `import * as THREE from "three"` (dipakai hanya untuk 2 `Vector3`, line 31-32); `src/components/ui/Preloader.tsx:4` `import { useProgress } from "@react-three/drei"` — keduanya dieimpor statis oleh `page.tsx:27,18`. Komentar `page.tsx:5-6` ("P0 bundle: CanvasStage lazy") tidak tercapai.
- **Dampak:** chunk three (~600KB+) tetap di first-load landing; tujuan banber P0 gagal.
- **Perbaikan:** ganti Vector3 dengan objek `{x,y,z}`; pindahkan `useProgress` ke komponen dynamic; laimkan Preloader dinamis.

### 3. [MAJOR] Komentar next.config kontradiksi: `unoptimized: true`
- **Bukti:** `next.config.mjs:27-31` — komentar "optimasi AKTIF (unoptimized:false)" padahal value `true`. `wrangler.jsonc:35-38` mengklaim value true disengaja untuk Workers (benar teknisnya).
- **Dampak:** semua `<Image>` jadi tag asli (mis. `CatalogClient.tsx:557` `unoptimized={true}`, `StoreShowcaseSection.tsx:519`): gambar besar mentah, LPS & bandwidth buruk.
- **Perbaikan:** selesaikan konfigurasi & besarkan `remotePatterns R2` gagal (hemat dengan loader saya `proxy-image` etc. — hati-hati R2 fetch internal via route `/api/proxy-image` yang TDIK-kanan JIT).

### 4. [MAJOR-SEO] `/catalog` kosong di HTML server
- **Bukti:** `src/app/catalog/CatalogClient.tsx:149` fetch client `?t=${Date.now()}` `cache:"no-store"`, tanpa fallback SSR content; header `<h1>` dan skelethonnya (`:494-506`) tidak diisi konten.
- **Dampak:** produk tidak terindeks; AnoLCP skeleton.
- **Perbaikan:** server-fetch di `catalog/page.tsx`, render `<CatalogClient initial={...}>`; cache (revalidate) alih-alih `no-store`.

### 5. [MAJOR] Konflik nomor WhatsApp (3 nomor berbeda)
- **SSOT:** `src/lib/shop.ts:4` `62882020685076` — dipakai `kontak/page.tsx:124`, `terms/page.tsx`, `refund/page.tssx`, landing Footer/About via `shopWaLink`.
- **Hardcode beda:** `src/app/privacy/page.tsx:70` & `src/components/commerce/OrderDetailModal.tsx:444` → `6281244002026`.
- **Mobile:** `shop.ts` mobile = `6281244002026` (auditor 8) → total ekosistem punya 3 nomor yang tak konsisten.
- **Perbaikan:** satu SSOT via `NEXT_PUBLIC_SHOP_CONTACT_WHATSAPP` di kedua workspace; hapus hardcode.

### 6. [MAJOR-SEO] FAQ: halaman client, tanpa metadata, tanpa FAQPage JSON-LD
- **Bukti:** `src/app/faq/page.tsx:1` `"use client"`; tidak ada `metadata.ts`/layout metadata di folder. ~20 FAQ tersedia di `FAQS` (line 35+).
- **Perbaikan:** pecah jadi server page + metadata + JSON-LD `FAQPage`.

### 7. [MAJOR] Harga konflik antar konstanta + URL JsonLd hardcode
- **Bukti:** `src/components/ui/JsonLd.tsx:20` URL `https://kaoskami.biz.id` (abaikan env); harga `PRODUCT_DETAILS.priceIdr = 79000` (`constants.ts:450`) untuk "T-Shirt Cotton Combed 24s" — kontra `APPAREL_CATALOG.tshirt.basePriceIdr = 59000` (`constants:206`) namanya sama.
- **Perbaikan:** satu sumber harga; URL pakai `NEXT_PUBLIC_SITE_URL`.

### 8. [MAJOR-A11Y] Kartu produk tak dioperasikan keyboard
- **Bukti:** `StoreShowcaseSection.tsx:503-507`, `CatalogClient.tsx:541-544`: `<div onClick>` tanpa `role="button"`/`tabIndex`/Enter. Quick-view pill `CatalogClient.tsx:584` `opacity-0 group-hover + pointer-events-none`.
- **Perbaikan:** bungkus jadi `<a>`/`<button>`.

### 9. [MAJOR-A11Y] Tap target < 24px
- **Bukti:** swatch ukuran `w-5 h-5` (20px): `CatalogClient.tsx:628`, `StoreShowcaseSection.tsx:577`.
- **Perbaikan:** buka hitbox via padding/after-pseudo (minimal 44px).

### 10. [MAJOR-UI] Sistem `dark:` Tailwind vs `data-theme` bertabrakan
- **Bukti:** `tailwind.config.ts` tanpa `darkMode` (default `media`); tema pakai `[data-theme]` (`Navbar.tsx:213` + `globals.css:65-126`). Kelas `dark:bg-black/90` (`Navbar.tsx:102-103`) mengikuti OS, bukan pilihan user.
- **Dampak:** OS dark + tema "gallery" = campuran permukaan hitam di atas canvas terang.
- **Perbaikan:** `darkMode: ["selector", "[data-theme=obsidian]"]` — atau siangkan semua `dark:` pakai token.

### 11. [MAJOR-PERF] Preloader fullscreen menahan LCP ±2.8s
- **Bukti:** `Preloader.tsx:40-49` — safety timer 2800ms sebelum konten terlihat (setiap sesi baru).
- **Perbaikan:** maks 1–1.2s atau skeleton inline.

### MINOR (dalami di headroom)
12. Bahasa campur ID/EN (Navbar "Home/Catalog/About Us/LOGIN" `Navbar.tsx:146-176`; fallback no-webgl EN `StaticShowcase.tsx:40`; hero "MULAI IDR 59.000" vs UI lain "Rp" — `HeroOverlay.tsx:118`).
13. `not-found.tsx:7` hardcode dark `bg-[#0E0E10] text-white` + typo "Halaman tidak ketemu" (baku: "tidak ditemukan").
14. Klaim "4.9 ★ Rating" hardcode `AboutWorkshopSection.tsx:87` tanpa sumber (API reviews ada).
15. Heading hierarchy skip (`TechSpecsOverlay.tsx:57` h2 → `:80,88` langsung h4).
16. SVG sosmed duplikat besar ×2 (`Footer.tsx:70-111` vs `AboutWorkshopSection.tsx:233-304`).
17. Fetch `/api/admin/cms` 5–6× per visit (`HeroOverlay.tsx:46` + `useCmsContent.ts:16` per konsumen; `memoryCache` tidak berpenganuh lintas komponen).
18. Cache-busting agresif `?t=Date.now()` + `no-store` di katalog (`CatalogClient.tsx:149`, `StoreShowcaseSection.tsx:313`).
19. Kontras: `text-text-muted/50` (`StoreShowcaseSection.tsx:855`), `text-amber-300` di bg terang (`page.tsx:97`); pesan admin `?denied=admin` tampil di beranda publik.
20. Dead weight legacy: `CheckoutModalLegacy.tsx` (~1.5k baris) masih diimpor `CartDrawer.tsx:11-16` via flag `USE_CHECKOUT_V2`; `TestLabControls/InspectControls` statis di drawer landing (`CustomizerDrawer.tsx:51-52`).

## C. Yang TIDAK ditemukan (eksplisit)
- Route group `(marketing)`, `/tentang`, `/harga`: **TIDAK ADA**
- Duplikat route: TIDAK ADA (`/katalog` redirect; `/contact`,`/terms-and-conditions`,`/refund-policy` = shim 301)
- `robots.txt` fisik: TIDAK ADA — tapi `robots.ts` ADA (allow all + disallow admin/dashboard/orders/api, sitemap OK)
- `sitemap.ts` ADA (11 rute statis, lastModified 2026-09-08)
- JSON-LD: hanya 1 Product — Organization/LocalBusiness/BreadcrumbList **TIDAK ADA**
- OG image hanya root; render og per subpage **TIDAK ADA**
- `lang="id"` ADA; hreflang/i18n: **TIDAK ADA**
- Favicon set lengkap ADA (dilayani layout:70-77)
- Placeholder Lorem/TODO: TIDAK DITEMUKAN di halaman publik
- `<img>` tanpa alt: TIDAK DITEMUKAN
- Hydration: satuan guard (`suppressHydrationWarning` di Footer `:209`, HeroOverlay `:106`); hooks mulai null — **layak**

## D. Top 5
1. Canonical global ( temuan #1) → pemulihan SEO satu baris config.
2. three.js first-load ( #2).
3. Image optimization OFF + komentar menipu ( #3).
4. `/catalog` tanpa SSR ( #4).
5. Konflik 3 nomor WA ( #5).

> 📌 Semua temuan sepadan dengan frontier design: konten & copy visual bagus; yang merusak adalah konfigurasi & integritas data, bukan estetika.
