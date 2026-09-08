# AUDIT DETAIL — KOMPONEN (UI / Commerce / Admin / Providers)

> Induk: `AUDIT-MENYELURUH.md`. Metode: baca penuh file penting + inti sisanya.

---

## A. `ui/` (20 file)

### 1. `AppDownloadBanner.tsx` — 4/5
Banner APK Android pengganti PWA. Bug: `APK_URL` hardcode tanpa cek 404/versi. A11y: `role="dialog"` tanpa modal/focus. iOS tak dapat alternatif. Obat: cek HEAD + versi + pesan iOS. Kecil.

### 2. `AuthModal.tsx` — 3/5
Login/register/Google + sesi. Bug: `defaultMode` tak sinkron; flicker sesi; `signOut` tak await; mapping `xxx@kaoskami.phone` bocorkan pola; sukses `setTimeout` pasca-unmount. UX: tanpa dialog/ESC/backdrop/show-password/lupa-password; label WA vs email. Obat: sinkron + dialog proper + recovery. Sedang.

### 3. `BackGraphicOverlay.tsx` — 4/5
Overlay editorial punggung. Bug: fallback 30/42 vs kalibrasi. A11y: `opacity-0` tanpa aria-hidden. Obat: kecil.

### 4. `BottomSheet.tsx` — 2/5
Klaim drag, realita klik; `peek` mati; bukan dialog; tanpa ESC/scroll-lock; handle kecil; menutup konten. Obat: drag beneran + dialog. Sedang.

### 5. `CartDrawer.tsx` — 3/5
**Harga murni client** (server wajib re-hitung — beruntung server melakukannya); hapus by `id` (varian beda size ikut); `<img>` mentah; tanpa aria/focus/toast. Obat: kirim sinyal + andalkan server + aria. Kecil–sedang.

### 6. `CheckoutModal.tsx` — 2/5
OTP opsional (label saja); email tanpa format; district ikut PICKUP; kupon tanpa pratinjau; grandTotal client vs server; GPS append tanpa dedup; Nominatim tanpa UA/timeout; isLoading macet jalur sukses; `(window).checkout` tak di-load; pesan campur bahasa; slider tanpa label. Tanpa dialog/ESC/focus-trap. Obat: tegakkan OTP + validasi + pratinjau server + cleanup. Sedang–besar (2–3 hari + uji Duitku).

### 7. `CustomizerDrawer.tsx` (~1800 baris) — 3/5
Mobile editor mati (<768px cuma ringkasan, termasuk POLA 2D); multi-part tanpa tombol mode; handler sharp mati; export PNG blank (tanpa preserve); video 360 tak jamin penuh; share tanpa state; img race; 6 tab tanpa tablist; emoji penanda. Obat: render tab mobile + snapshot on-demand + drag sheet. Besar (3–5 hari).

### 8. `EditorialLookbook.tsx` — 4/5
Grid statis; hardcode; tanpa link produk; tahun hardcode. Obat: kecil.

### 9. `FabricEditor.tsx` — 3/5
Kanvas fix tak responsif; multiplier 1 (bukan 300DPI); CORS tainted; tanpa toolbar. Obat: responsif + toolbar. Sedang.

### 10. `Footer.tsx` — 1/5
**NOL link** (katalog/studio/track/WA/sosmed/kebijakan hilang). SEO + navigasi mati. Obat: tambah link + menu. Kecil (0,5–1 hari).

### 11. `HeroOverlay.tsx` — 4/5
Fetch CMS tanpa abort/loading; tanpa sanitasi panjang. Struktur h1 benar. Obat: kecil.

### 12. `HomeCatalogSection.tsx` — 3/5
Gagal fetch hilang diam; `images[0]` crash; tanpa toast cart; CLS; label "3+" statis. Obat: kecil.

### 13. `LookbookImage.tsx` — 4/5
Fallback baik; tanpa dimensi (CLS). Obat: kecil.

### 14. `ModelErrorBoundary.tsx` — 3/5
Tanpa retry; telan error asli. Obat: kecil.

### 15. `Navbar.tsx` — 2/5
**Tanpa link /track**; mobile tanpa nav; CTA duplikat; badge >99; impor/state mati. Obat: link + hamburger. Kecil (0,5–1 hari, gabung footer).

### 16. `Preloader.tsx` — 4/5
Progres palsu; useProgress di luar Canvas; aria terbalik. Obat: kecil.

### 17. `PrintButton.tsx` — 3/5
Cetak seluruh halaman; gaya inkonsisten. Obat: print-CSS scoping. Kecil.

### 18. `StaticShowcase.tsx` — 2/5
Tombol ACQUIRE mati; sizeFee drift; harga duplikat logika; copy Inggris; nested main. Obat: kecil–sedang.

### 19. `TechSpecsOverlay.tsx` — 4/5
Data statis tanpa CMS. Obat: kecil.

### 20. `TurnstileWidget.tsx` — 3/5
Fallback test-key di luar CheckoutModal = lolos bot; callback basi (deps inline); tanpa timeout/error visual. Obat: ref stabil + hapus fallback. Kecil.

---

## B. `commerce/` (5 file)

### 21. `AddressBook.tsx` — 3/5
Refresh andalkan parent; tanpa edit/default; confirm/alert native (WebView blokir). Obat: kecil.

### 22. `CancelOrderButton.tsx` — 4/5
Tanpa cek client (server menolak benar); done permanen; confirm native. Obat: kecil.

### 23. `DesignCardActions.tsx` — 3/5
Rename tanpa catch; prompt/confirm native; tanpa pesan. Obat: kecil.

### 24. `ReorderButton.tsx` — 2/5
Loop sekuensial N RTT + tanpa transaksi (parsial); kirim harga client (server abaikan — aman tapi kotor); reset rusak; done tanpa link cart. Obat: endpoint batch server. Sedang.

### 25. `RepayButton.tsx` — 4/5
Redirect full (kehilangan state); tanpa cek mock/prod. Teks anti-ganda bagus; error inline baik. Obat: kecil.

---

## C. `admin/` (6 file)

### 26. `CmsHeroForm.tsx` — 3/5
Tanpa load awal (rawan timpa); tanpa sanitasi server; label tanpa htmlFor. Obat: kecil.

### 27. `CouponAdminPanel.tsx` (+RowActions) — 3/5
Tanpa validasi range (PERCENT>100, FIXED negatif, NaN); RowActions gagal diam; PATCH-delete tak RESTful; grid sempit; input tanpa label. Obat: kecil.

### 28. `CustomerRoleSelect.tsx` — 4/5
Cancel-confirm malah refresh; ADMIN bisa pilih SUPER_ADMIN di UI. Aria baik. Obat: kecil.

### 29. `OrderAdminActions.tsx` — 4/5
Satu busy 3 aksi; resi tanpa validasi; tombol destruktif rapat (amber vs merah membantu). Obat: kecil.

### 30. `OrderInspector3D.tsx` — 1/5
**Bukan inspektor**: render CanvasStage kosong tanpa orderId/decals/warna. Beban THREE tanpa nilai. Obat: teruskan data + read-only + unduh master (1–2 hari).

### 31. `VariantRowActions.tsx` — 4/5
Race klik cepat; error diam; Enter tak save. Aria baik. Obat: kecil.

---

## D. `providers/` (3 file)

### 32. `DesignSyncProvider.tsx` — 3/5
Fire-and-forget; guard hanya tshirt; slider picu effect; tanpa indikator sync. Obat: kecil–sedang.

### 33. `QueryProvider.tsx` — 3/5
`getQueryClient()` tiap render (risiko cache hilang); tanpa tuning. Obat: kecil.

### 34. `SmoothScrollProvider.tsx` — 3/5
Global termasuk studio (rebut orbit); konversi `*1000` verifikasi; tanpa refresh; hijack wheel. Hormati reduced-motion (baik). Obat: kecualikan studio + verifikasi. Kecil.
