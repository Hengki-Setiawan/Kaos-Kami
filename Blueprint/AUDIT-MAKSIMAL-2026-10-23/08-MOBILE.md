# 08 — APLIKASI MOBILE (Capacitor 8 + Next static export)

> Sumber: Auditor 8 (very thorough). appId `id.makassar.kaoskami`, webDir `out`, hostname = `kaoskami.biz.id` (WebView di origin HTTPS produksi; cleartext false; debug off).

## A. Peta fitur & paritas web

**Arsitektur:** Next static export (`output:'export'`, `assetPrefix:'./'`) → Capacitor WebView; 5-tab TabBar (`src/app/page.tsx` 1.770 brs); BottomSheet vaul; NativeHeader safe-area; framer-motion; three/R3F; zustand persist di **Capacitor Preferences native** (`preferencesStorage.ts`, localStorage cermin).

**Fitur ADA (kekuatan):**
- Katalog server (`/api/mobile/catalog` + ETag + cache offline)
- Studio 3D multi-lapis decal (7 sisi, clamp 30.0 cm `useMobileStudioStore.ts:361,568`)
- **AR try-on realtime** — getUserMedia + MediaPipe PoseLandmarker lite (bahu landmark 11/12; model `.task` dari CDN Google; GPU delegate; throttle FPS per tier; fallback siluet; dispose anti-OOM) + snapshot 1080×1920 + share
- Checkout native 3 langkah (OTP WA, **Idempotency-Key unik per klik**, draft→R2, **Direct QRIS in-app polling 3.5s**, deep link `kaoskami://payment` diverifikasi server)
- Lacak polling backoff 10→30→60s; push FCM (rebind pasca-login); offline strip + sync queue (poison-eviction); GPS reverse-geocode; scan QRIS/JobTicket MLKit; admin workshop penuh (produksi ACC, QC panel R2, revenue/kupon read-only jujur 401/403, `?demo=1` locked)
- Keamanan WebView: backend cookie better-auth via `CapacitorHttp` jar native; verifikasi sesi ulang; backup_rules.xml mengecualikan AsyncStorage/cookie; deep-link allowlist ketat; manifest minimal-privilege (tanpa READ_PHONE/CONTACTS/BACKGROUND_LOCATION); FileProvider unexported; ProGuard/R8 aktif; iOS limitsNavigationsToAppBoundDomains

**Fitur TIDAK ADA (eksplisit):** checkout N-decal (F-3); sizeBreakdown; Turnstile token (F-4); foto produk katalog; stok per varian (komitment `stockUnknown`); riwayat server + dashboard user web; komplain/refund flow App Links verified; biometrik gate nyata; OTA update; blog/FAQ native (InAppBrowser); WebSocket chat (polling 60s).

## B. Temuan

### 1. [MAJOR] Nomor WA fallback HP ≠ web
- Mobile `shop.ts:4` = `6281244002026`; web `shop.ts:1-2` = `62882020685076`. Build tanpa env mengarahkan CS ke nomor beda.
- **Fix:** samakan fallback + set env `NEXT_PUBLIC_SHOP_CONTACT_WHATSAPP` di kedua workspace.

### 2. [MAJOR] App Links tak akan pernah verifikasi
- `android/app/src/main/assets/applinks/assetlinks.json:11` & web `public/.well-known/assetlinks.json:7` = `"REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE"` (placeholder); iOS `App.entitlements` masih development.
- **Fix:** isi SHA256 keystore rilis + TEAMID/AASA produksi.

### 3. [MAJOR] Checkout kehilangan lapis decal (N-decal)
- `CheckoutSheet.tsx:498-521` — payload `items[].decals` tepat 1 entri (front/back) via `getDecalForItem` (1 transform/item), padahal cart simpan snapshot hingga 10 lapis × 7 sisi (`page.tsx:699-703`). Helper `buildMobileCheckoutItems`/`expandSizeBreakdown`/`shouldAttachTurnstile` **didefinisikan tapi 0 pemakaian** (grep).
- **Dampak:** desain lengan/rusuk/hood tidak terkirim = produk salah sablon.
- **Fix:** ikuti arsitektur §4 `checkoutParity` (draft R2 per-decal, nested loop).

### 4. [MAJOR] Turnstile tidak pernah dikirim
- grep `turnstileToken` = 0 di komponen checkout. Ketika server mode darurat `CHECKOUT_OTP_REQUIRED=false` (Turnstile fail-closed) → checkout APK **mati 4xx** (documented `checkoutParity.ts:102-107` sendiri).
- **Fix:** pasang widget + `shouldAttachTurnstile`.

### 5. [MINOR→MAJOR] versionCode statis
- `android/app/build.gradle:16-18` `versionCode = env ?: 20260913`, `versionName "1.0.0"` — build ulang = code tetap → Play/sideload update tertolak. **Fix:** bump per rilis (CI var tersedia — pastikan dipakai).

### 6. [MINOR] AR AI default AKTIF vs komentar "MATI"
- `ARPreviewStage.tsx:25-27` — `useState(true)`; mid/high langsung MediaPipe GPU + kamera 720p = boros baterai. **Fix:** default false, toggle manual.

### 7. [MINOR] Polling notifikasi + `userId` mentah
- `MobileNotificationBell.tsx:32-63` request `?userId=` tiap 60/duka tolerant tak login (fallback items demo). **Perlu verifikasi sisi server** apakah `/api/notifications` mengikat ke sesi cookie, bukan percaya query (potential IDOR); poll hanya bila logged-in + document visibility.

### 8. [MINOR] `window.open` untuk wa.me/Maps
- `page.tsx:1268,1384`, `AdminMobileDashboard.tsx:1194-1224`, `UserOrderTracker.tsx:95` — inkonsisten dengan Browser/Share bridge. **Fix:** `openInAppBrowser`/`App.openURL`.

### 9. [MINOR] Copy basi "DTF 35.0 cm Max"
- `page.tsx:860` — kaidah fisik & clamp keduanya 30.0 cm. **Fix:** 30.0 (sambungan temuan 02-#1 — kejujuran klaim cm/DPI).

### 10. [MINOR] Biometrik tidak melindungi apa pun
- `BiometricLockModal` 0 pemakaian; `verifyUserBiometrics` hanya badge "Tersedia" (`page.tsx:111-134`); admin login password biasa. **Fix:** jurusan pembuka dashboard admin ATAU hapus badge.

### 11. [MINOR] Share URL designId palsu
- `share.ts:11` dipakai `ar-snapshot`/`ar-live` (`ARPreviewStage.tsx:246,383`) → link mati di web. **Fix:** hanya share setelah draft ter-hosting (R2 ID).

### 12. [MINOR] Dead code duplikasi paymen
- `duitkuMobile.ts` stub deprecated + notifikasi fallback "Selamat Datang" fiktif unread=1.

### 13. [MINOR] Type safety
- 121 situs `any`/`as any` (105 file TS) di pemanggilan API — terutama `response.data as any`. Contract callback `MobileCheckoutSchema` terpisah — pertimbangkan tipe cermin.

## C. Keamanan mobile spesifk (kekuatan)
- Ses/cop: sesi admin tak pernah dipercaya dari POST status; login jujur tidak percaya cookie InAppBrowser.
- Storage: localStorage hanya name/email/role; token push di Preferences; backup exclusion ✓; NativeBiometric HANYA verifyIdentity (kredensial tak disimpan keystore).
- Deep link: `new URL` + allowlist + status COMPLETED dari URL selalu re-verifikasi server ✓.
- Manifest: minimal privilege ✓; cleartext false ✓.
- ⚠ Tidak ada certificate pinning (MITM koruptif di jaringan korrupt — mitigasi HTTPS+HSTS; pertimbangkan pinning untuk perangkat admin workshop yang dipakai di jaringan publik).
- Push: FCM sender-id publik standar; iOS aps-env development (belum App Store).

## D. Top 5
1. N-decal hilang di checkout (produksi salah sablon)
2. Turnstile tidak dikirim → mode darurat mematikan checkout APK
3. assetlinks.json placeholder → App Links tak berfungsi
4. Nomor WA CS mobile ≠ web
5. versionCode statis (+ AR AI default-on baterai)
