# MOBILE PARITY — Web vs Mobile vs Capacitor

> SSOT angka: `src/lib/mobileParitySpec.json` + test `src/lib/mobileParity.test.ts`.
> Snapshot JSON BUKAN sumber kebenaran — sumber = `scaleCalibration.ts`,
> `shipping/deliveryOptions.ts`, `assetManifest.ts`. Test gagal bila snapshot drift.
> Sinkron ke mobile TETAP manual (prinsip: tanpa import cross-workspace).

## Tabel paritas (ringkas)

| Area | Web (`kaos-kami-web`) | Mobile (`kaos-kami-mobile`) | Capacitor / Native |
|---|---|---|---|
| Viewport | `matchMedia("(max-width: 767px)")` SATU sumber (`CustomizerDrawer.tsx:163-184` `useIsMobileCss`); drawer desktop `hidden md:block`, `BottomSheet.tsx:1-13` `<768px`; A11y pinch-zoom diizinkan | `Viewport` eksplisit (`mobile/src/app/layout.tsx:9-17`: `device-width, initialScale 1, maximumScale 5, viewportFit cover`); `body min-h-dvh`, `pt-safe` hanya `NativeHeader`, `pb-safe` `TabBar/BottomSheet` | Web sembunyikan banner/gps di native (`AppDownloadBanner.tsx:23-25`, `NotificationGpsPrompt.tsx:23-24` via `Capacitor.isNativePlatform()`); `auth-client.ts:51` cache sesi kompatibel WebView |
| 3D | R3F `CanvasStage.tsx:483-520` + `ApparelMeshRenderer`; rantai model via `probeFirstExistingUrl` (`useDeviceTier.ts:120-157`): tee `tee-basic.draco.glb→tee-basic.glb→tshirt-heavyweight.glb`, hoodie `hoodie-blue.draco.glb→…`, manekin web-only `/models/mannequin.glb`; `surfaceZ`/`unitsToCm`/`maxWidth` SSOT `scaleCalibration.ts` | `CanvasStageMobile.tsx:199-237` + `MobileApparelMeshRenderer.tsx:80-109` `MOBILE_MODEL_CANDIDATES` (primer non-Draco cermin web; SOFT-DISABLE Draco 14 Sep 2026); tanpa `mannequin.glb`; `mobileScaleCalibration.ts` cermin SSOT (lihat drift cap di bawah) | `powerPreference` per-tier (`CanvasStageMobile.tsx:202-204`: high=`high-performance`, mid/low=`low-power`); `preserveDrawingBuffer:false` + bus snapshot `registerStudioSnapshot` (`CanvasStageMobile.tsx:211-215`) |
| Frameloop | `demand` saat idle, `always` bila butuh kontinu (`CanvasStage.tsx:491` `frameloop={needsContinuous ? "always" : "demand"}`); `ClothLab.tsx:264` `demand`; `CameraRig.tsx:76,120-123` invalidate manual agar tak macet di demand | Sama: `CanvasStageMobile.tsx:210` `frameloop={needsContinuous ? 'always' : 'demand'}`; default idle `none` (`useMobileStudioStore.ts:387`) agar 0fps | Hemat baterai/VRAM native: DPR adaptif + `low-power` tier, `SceneDisposer`/`PerfAdaptive` (`CanvasStageMobile.tsx:229-230`) |
| Chat | `ChatMessage`/`UserPresence` (`drizzle-schema.ts:494-534`); bubble `z-35` di bawah drawer (`zIndex.ts:12-15`, `zIndexHierarchy.test.ts:30,64-65`); bell + `open-kamito-chat` (`UserNotificationBell.tsx:193,232`) | `MobileKamitoChatWidget.tsx:31-…` (pill + sheet, history `localStorage kaoskami_mobile_chat_history:91`, event `open-kamito-chat:119-133`); z-order sama (`mobile/src/lib/zIndex.ts:12-15`: chat 35 < drawer 50) | Realtime via `mobileApiClient` (`/api/chat/messages`, `/api/chat/presence`); offline: sapaan bot lokal (`MobileKamitoChatWidget.tsx:203`) |
| Dialog | `role="dialog"` + ESC + focus-trap + scroll-lock: `BottomSheet.tsx:22-34`, `CheckoutModal.tsx:801-807`, `DirectQrisModal.tsx:156`, `AuthModal.tsx:411`, `CartDrawer.tsx:106,194`, `ConfirmDialog.tsx:46` | `BottomSheet.tsx:18-…` sebagai fondasi `CheckoutSheet.tsx:621`, `DirectQrisSheet.tsx:131`, `MobileCartDrawer.tsx:35`, `AdminJobTicketModal.tsx:97`; QRIS/toast prioritas tertinggi (`mobile/src/lib/zIndex.ts:21`: 80) | Native bila di HP: `bridge/dialogs.ts:17-67` (`Dialog.confirm/prompt/alert` Capacitor; fallback `window.confirm/prompt/alert` di web); pembayaran tetap BottomSheet in-app (bukan redirect eksternal) |
| Tipografi | Engine kanvas `textDecalGenerator.ts:13-37` (`FONT_PRESETS`: streetwear-bold/varsity/modern/vintage/cyber-mono, `Plus Jakarta Sans`, auto-fit, `document.fonts.ready`, shadow default MATI M3.4); watermark gambar memakai stack font yang sama (`watermark.ts:43,70,73`) | Stack font sama (`mobile/src/app/globals.css:70`: `Plus Jakarta Sans`); **GAP jujur: tanpa generator teks-3D** (grep `FONT_PRESETS|textDecal` di mobile = nol) — teks mobile via input sheet standar, raster 3D menunggu pemilik CheckoutSheet | TechPack HTML memakai stack sistem (`mobile/src/lib/techpack/generateTechPack.ts:36`) agar konsisten cetak |
| Bayar | `CheckoutModal.tsx` + `DirectQrisModal.tsx` (portal `z-[110]`, re-quote `syncPrices`, blokir bila harga berubah); gateway iPaymu QRIS/VA (`webhooks/ipaymu`, `payments/confirmOrder.ts`); estimasi zona, bypass admin `[TEST]` | `CheckoutSheet.tsx:67-…` + `DirectQrisSheet.tsx:22-…` (100% in-app BottomSheet); helper `ipaymuMobile.ts:1-…` (simpan QRIS ke galeri), `duitkuMobile.ts`; kontrak murni `checkoutParity.ts:1-…` (`MUST_SEND_FIELDS`, batas 20 item/500 qty, email/courierNotes/sizeBreakdown) | Buka/tutup browser in-app via `@capacitor/browser` (`ipaymuMobile.ts:1`); unduh QR `QRIS-KAOSKAMI-<order>.png` (`ipaymuMobile.ts:33-36`); status lunas ter-update di invoice web + notifikasi + app Capacitor (`payments/confirmOrder.ts:235`) |

## SSOT angka (rujuk `mobileParity.test.ts`)

Test `src/lib/mobileParity.test.ts:44-123` mengunci snapshot = kode web:

- `surfaceZ` = `SURFACE_Z_PER_APPAREL` (`mobileParitySpec.json:4-14`; fallback unknown `0.176`).
- `unitsToCm` = `meshMultiplier` (`mobileParitySpec.json:15-24`).
- `maxWidth` depan = `maxFrontWidthCm`, dalam batas printhead `30.0` (`mobileParitySpec.json:25-37`; global `_globalPrintheadMax 30.0`, `_globalMaxHeight 42.0`, `_minDecalScaleUnits 0.04`; khusus hoodie/shirt depan `28.0` — kantong kangaroo/pullover).
- Kecamatan = `MAKASSAR_SUBDISTRICTS` (`mobileParitySpec.json:38-53`, 14 kecamatan, mengandung `Tallo`).
- Model = `assetManifest.ts` (`ACTIVE/BACKUP/STAGED_FILES`; `null` jujur untuk pants/shorts menunggu owner; sweater alias crewneck).
- Konsistensi: `maxScaleUnits = front/mult` dalam clamp Zod mobile `0.02…1.5`.

Panduan sinkron manual (dari header test `:20-34` + `_syncGuide`):

1. `surfaceZ` → `mobile/.../DecalGizmoMobile.tsx` (`MOBILE_SURFACE_Z`; sweater ikut crewneck).
2. `unitsToCm` → `mobile/.../useMobileStudioStore.ts` (`MOBILE_UNITS_TO_CM`).
3. `maxWidth` → file sama (`MOBILE_MAX_WIDTH_CM`; depan saja; hoodie/shirt 28 khusus).
4. Kecamatan → `mobile/.../deliveryOptionsMobile.ts`.
5. Model → `mobile/.../MobileApparelMeshRenderer.tsx` (`MOBILE_MODEL_CANDIDATES`; primer = `models.<apparel>.file`).
6. Jalankan `npm test` di `kaos-kami-web` + typecheck mobile.

🟡 Drift diketahui (belum disamakan, menunggu final web): mobile cap `unitsToCm 50 vs SSOT 100` & `maxWidth 12 vs SSOT 10` (ASUMSI+TODO lama mobile).
