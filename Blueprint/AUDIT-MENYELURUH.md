# AUDIT MENYELURUH KAOS KAMI — Hasil Lengkap Seluruh Kode

> Tanggal: 8 September 2026 · Auditor: AI (5 tim paralel + verifikasi silang bukti)
> Cakupan: 18+ halaman web, 46 komponen, 40 lib, 24 API route, aplikasi mobile
> Metode: baca penuh file + probe live prod + uji numerik + riset internet/docs resmi
> Legenda status: ✅ TERVERIFIKASI (bukti kode/probe) · 🔍 KLAIM AGEN (belum diverifikasi) · ✅ SEHAT
> Nilai: 1 (rusak) – 5 (sehat)

---

## 0. RINGKASAN EKSEKUTIF

| Area | Nilai | 1 kalimat |
|---|---|---|
| Halaman publik (home/katalog/studio/track/invoice) | 4/5 | Fungsional, bug kecil + 1 inkonsistensi harga |
| Dashboard user | 2/5 | **Bocor data tamu (P0)** + fitur tak jalan |
| Admin (overview/orders/kanban) | 3/5 | Kuat tapi tanpa paginasi + kartu menipu + DnD gagal antar-task |
| Admin (katalog/customer/kupon/cms/settings) | 3/5 | Bisa kelola, label menipu + CMS mati sebagian |
| Komponen UI toko | 2–3/5 | Checkout percaya harga client, OTP opsional, footer tanpa link |
| Studio 3D + fisika | 2–4/5 | Render benar, rantai skala 30cm retak 4 titik, VRAM bocor |
| Pola 2D + ekspor | 2/5 | Arah benar, rotasi hilang, offset 2cm, ekspor OOM |
| DB / Drizzle | 2/5 | Tanpa FK, tabrakan orderNumber, repay UNIQUE, race user |
| Auth | 2/5 | **Eskalasi ADMIN via sign-up (P0)**, role basi 5 mnt |
| Payment + webhook | 3–4/5 | Server-side pricing + idempoten bagus; repay mati; COD timpang |
| OTP | 2/5 | Plaintext + stacking + Math.random + limiter lokal |
| Rate-limit / R2 / cron | 2–3/5 | KV aktif (membaik); **backup PII ke bucket publik (P0)** |
| Mobile app | 2–4/5 | Alur lengkap; admin demo bohong; data pribadi hardcode; campur versi (diperbaiki branch) |

**Total temuan: 58 (P0: 9, P1: 21, P2: 28).** Rincian di bawah. Setiap temuan: lokasi → bukti → dampak → obat → estimasi.

---

## 1. TEMUAN P0 — KRITIS (perbaiki dulu)

### P0-1. Tamu bisa intip order + desain orang lain ✅ TERVERIFIKASI
- Lokasi: `kaos-kami-web/src/app/dashboard/orders/page.tsx:32-49`
- Bukti: `sessionUserId=null` → `orderWhere/designWhere=undefined` → `findMany` tanpa filter (limit 5/6) mengembalikan milik siapa pun.
- Dampak: bocor PII (nama, total belanja) + desain kompetitor.
- Obat: redirect login bila tak ada sesi; default `[]`. Estimasi: kecil (30 mnt + uji).

### P0-2. Eskalasi ADMIN via form daftar ✅ TERVERIFIKASI (sumber better-auth)
- Lokasi: `kaos-kami-web/src/lib/auth.ts:51-54`
- Bukti: field `role` tanpa `input:false`; `parseInputData` (better-auth `db/schema.mjs:65`) hanya menolak bila `input === false`. Attacker daftar dengan `role:"ADMIN"`.
- Dampak: ambil alih panel + data + refund + kupon.
- Obat: `role: { input: false }`, tolak `role` di payload, baca ulang role dari DB untuk route admin, audit baris `User.role=ADMIN` eksisting. Estimasi: 0,5 hari + uji regresi login.

### P0-3. Backup DB (PII penuh) ke bucket R2 PUBLIK ✅ TERVERIFIKASI (kode)
- Lokasi: `kaos-kami-web/src/app/api/cron/backup/route.ts` + `lib/r2.ts` (`kaos-kami-assets`, domain `r2.dev` publik AKTIF).
- Bukti: dump `User/Address/Order/Payment` → `backups/*.sql` di bucket yang sama dengan aset publik. Komentar "private" tidak ditegakkan kode.
- Dampak: nama/email/WA/alamat + riwayat belanja bisa diunduh publik bila URL ditebak/d bocor.
- Obat: bucket privat terpisah (tanpa domain publik) + enkripsi + retensi + alert; stream tanpa OOM; rotasi CRON_SECRET. Estimasi: 0,5 hari.

### P0-4. Bayar-ulang (repay) MATI TOTAL ✅ TERVERIFIKASI (skema)
- Lokasi: `kaos-kami-web/src/app/api/orders/[id]/repay/route.ts` + `drizzle-schema.ts:336` (`Payment.orderId UNIQUE`).
- Bukti: alur update-lama→EXPIRED lalu insert `orderId` sama = `SQLITE_CONSTRAINT_UNIQUE` → 500 setiap kali. (Belum pernah lolos uji live karena butuh order PENDING + charge; cacat logika pasti.)
- Dampak: tombol BAYAR ULANG selalu gagal; bila Duitku gagal setelah expire, order tanpa PENDING.
- Obat: update-in-place (satu baris payment per order, rotasi `providerRef`) ATAU longgarkan UNIQUE + kolom `isLatest`; pindah EXPIRED ke sesudah charge sukses; wajibkan auth pemilik; kuota per user+order. Estimasi: 0,5–1 hari + uji sandbox E2E.

### P0-5. Gerbang admin fail-open ✅ TERVERIFIKASI (kode)
- Lokasi: `kaos-kami-web/src/app/admin/layout.tsx:26-34`
- Bukti: non-prod ATAU `catch` error → children tetap render. Downtime DB/auth = panel terbuka.
- Obat: selalu `redirect("/login")`, hapus bypass dev, rethrow + log, tambah logout + tampil role. Estimasi: kecil.

### P0-6. Klaim 30cm retak — cap legacy 0.162 ✅ TERVERIFIKASI (kode)
- Lokasi: `kaos-kami-web/src/components/3d/DecalLayerRenderer.tsx:60-62`
- Bukti: `scale>0.22 → min(0.162, scale*0.22)` = maks 16,5cm di tshirt, padahal `maxDecalScaleUnits`=0,295 (30cm). Pengguna tak pernah capai 30cm; gizmo izinkan, render kecilkan.
- Obat: hapus normalisasi legacy ATAU migrasi eksplisit data lama sekali jalan. Estimasi: kecil + uji visual.

### P0-7. Kotak panduan selalu 30×42 (bohong untuk 3 apparel) ✅ TERVERIFIKASI (kode)
- Lokasi: `kaos-kami-web/src/components/3d/PrintZoneGuide.tsx:40-41` (`boxWidthUnits = 30.0 / mult` konstan).
- Bukti: hoodie-front spek 28×26, shirt-front 14×26, crewneck-front 30×38 — guide tetap 30×42 → hijau palsu / meluber.
- Obat: box per-side dari `APPAREL_PHYSICAL_SPECS` (maxFront/BackWidth/Height). Estimasi: kecil.

### P0-8. Dua route workshop kemungkinan mati ✅ SEBAGIAN (kode pasti, live belum)
- Lokasi: `render/[designId]/page.tsx` (impor CanvasStage client di server + desain tak dioper + ready langsung true); `gang-sheet/page.tsx:38` (`onClick={()=>window.print()}` di Server Component).
- Bukti: baca kode. Probe fake-id kembalikan 404 (routing hidup); render aktual dengan data BELUM diuji live.
- Obat: render → client-island + oper decals/warna + ready via `onCreated`; gang-sheet → tombol ke `PrintButton` existing. Estimasi: sedang (0,5–1 hari + uji browser).

### P0-9. Data pribadi dev tampil ke SEMUA pengguna HP ✅ TERVERIFIKASI (grep)
- Lokasi: `kaos-kami-mobile/src/app/page.tsx:703-704,909`, `UserOrderTracker.tsx:71`, `AdminMobileDashboard.tsx:453`, `generateTechPack.ts:148` (nama + `0882-0206-85076` + alamat; 2 nomor WA beda vs `.env`).
- Dampak: privasi owner + pelanggan bingung nomor mana yang benar.
- Obat: profil dari akun login, `NEXT_PUBLIC_SHOP_CONTACT_WHATSAPP` tunggal, hapus default TechPack. Estimasi: kecil (2–3 jam + verifikasi).

---

## 2. TEMUAN P1 — PENTING (19 temuan)

### P1-01. Tabrakan `orderNumber` saat ramai ✅ (kode)
`KK-YYYYMMDD-XXXX` (ruang 9000) + `UNIQUE` tanpa retry → ~40% tabrakan di 100 order/hari → checkout 500. Obat: retry-loop / sufiks nanoid8. Estimasi: 0,5 hari + uji beban.

### P1-02. Race buat-User ganda ✅ (kode)
`findFirst(or(phone,email))` lalu insert tanpa `onConflict` → request kembar = 500 UNIQUE. Obat: cari by phone saja + `onConflictDoNothing` + tangani konflik email. Estimasi: 0,5 hari.

### P1-03. Stok oversell ✅ (kode)
Cek di checkout, kurang saat lunas; 10 checkout sisa-1 semua lolos; `max(0,…)` sembunyikan oversell. Obat: decrement kondisional + flag bila minus + alert. Estimasi: 0,5 hari.

### P1-04. OTP ditumpuk + plaintext + Math.random ✅ (kode)
Multi-kode valid bersamaan; `Verification.value` plaintext; `Math.random` bukan CSPRNG; campur format `08/62`. Obat: hapus kode lama saat kirim baru, hash SHA-256+pepper, `crypto.getRandomValues`, counter gagal di DB, normalisasi tunggal. Estimasi: 1–2 hari.

### P1-05. Limiter tak global ✅ (kode + docs)
Memory per-isolate (+KV aktif sejak Fase 17 — membaik), fail-OPEN, kunci IP spoofable, `get+put` tak atomik, kuota repay global per-order bisa di-DoS. Obat: kunci per-user route authed, Durable Object untuk presisi, timing-safe compare. Estimasi: 1 hari.

### P1-06. Checkout percaya harga client ✅ (kode)
`CartDrawer`/`CheckoutModal`/`ReorderButton` kirim `unitPriceIdr`; server hitung ulang (aman) TAPI tampilan bisa beda (kupon/grosir) + reorder tanpa transaksi. Obat: server sumber total + tampilkan rincian server; reorder batch atomik. Estimasi: 1 hari.

### P1-07. OTP tak ditegakkan di checkout ✅ (kode)
`isPhoneVerified` hanya label; submit tanpa verifikasi. Obat: wajibkan bila fitur aktif / hapus UI palsu. Estimasi: kecil.

### P1-08. Kanban: drop antar-task gagal diam-diam ✅ (kode)
`overId=taskId` bukan stage → return diam; tombol dalam kartu draggable tanpa handle; tanpa optimistic update. Obat: baca `over.data.current.stage` + drag-handle. Estimasi: kecil.

### P1-09. Salah pasang dimensi cetak ✅ (kode)
Fallback `productionTasks[idx]` bisa pasang dimensi item A ke B (detail/job-ticket/gang-sheet). Obat: join eksplisit `orderItemId` + warning keras bila kosong. Estimasi: kecil.

### P1-10. Omset termasuk belum-bayar ✅ (kode)
`sum(totalIdr) where !=CANCELLED` termasuk PENDING. Obat: filter status lunas (CONFIRMED+). Estimasi: kecil.

### P1-11. List tanpa paginasi ✅ (kode)
`/admin/orders` full fetch (OOM), katalog `limit 20` dikira total, customers 50. Obat: paginasi/search server. Estimasi: sedang.

### P1-12. Kupon palsu-menjanjikan ✅ (kode)
`.catch(()=>[])` sembunyikan DB down; badge hitung nonaktif; form di bawah; `FIXED max(100)` bikin kupon Rp>100 mustahil; tanpa tanggal di list. Obat: perbaiki semua + tampil error. Estimasi: kecil.

### P1-13. CMS separuh mati ✅ (kode)
Lookbook input/tombol tanpa handler; hero sudah hidup (Fase 20). Obat: implement R2 list/upload atau hapus panel palsu. Estimasi: sedang.

### P1-14. Sync berdasar JUDUL ✅ (kode)
Kolisi judul = overwrite; fallback kategori diam-diam; jam HP bisa dari masa depan. Obat: upsert by-ID (tambah `clientId` unik) + tolak clock-skew. Estimasi: sedang.

### P1-15. Decal tembus + cache di-dispose ✅ (kode)
`depthTest:false` (ghosting putar) + dispose texture share (flicker) + Z lengan melayang. Obat: depthTest true + hapus dispose + Z per-side + renderOrder. Estimasi: 0,5 hari.

### P1-16. Bocor VRAM ✅ (kode)
Hoodie/Shirt tanpa dispose (vs Tshirt/Longsleeve ada); clone multi-part + geoms tak dispose; ClothLab canvas kedua; `preserveDrawingBuffer:true`. Obat: pola dispose terpusat + snapshot on-demand. Estimasi: 0,5–1 hari.

### P1-17. Pola 2D: rotasi hilang + offset 2cm + ekspor OOM ✅ (kode, baru)
`fabricToDecal` buang rotation/opacity; tanpa subscribe 3D→2D; komentar "2mm" salah 10x (0,02 unit = 2,03cm); ekspor bbox 17MP PNG di HP. Obat: kembalikan rotasi/opacity + langganan 2-arah + konstanta offset benar + letterbox + cap/tiling. Estimasi: 1–2 hari.

### P1-18. Pipeline kualitas bunuh diri ✅ (kode)
`compressImage` PNG-1200px (DPI 101 = POOR, `quality` mati, EXIF abai); `removeBG` makan putih interior + tanpa feather + CORS; `textDecal` 3:1 fix + font tak tunggu; `dpiAnalyzer` 1-sumbu. Obat: JPEG/WebP adaptif + master asli + flood-fill + auto-fit + DPI 2-sumbu. Estimasi: 1 hari.

### P1-19. Admin mobile bohong ✅ (kode)
Tolak=COMPLETED; approve tanpa PATCH (klaim sukses palsu); mapping stage melompat. Obat: status REJECTED + mapping benar + wajib taskId. Estimasi: 0,5 hari.

---

## 3. TEMUAN P2 — SEDANG/KECIL (28 temuan, ringkas)

### Halaman (skor 3-4)
- H1: JSON-LD duplikat; flash kanvas kosong pre-detect; `setViewMode` tanpa cleanup; tanpa error-boundary Canvas; import Link mati. (4/5)
- H2 katalog: `handleOpenInStudio` tak set apparel; beli stok-0 lolos; error API disalahkan ke filter; filter tanpa XXL; img tanpa dimensi (CLS); ikon mati. (3/5)
- H3 privacy: tanpa Navbar/Footer; tanggal hardcode. (5/5 fungsi, 3 UX)
- H4 track: terima `mock` sebagai sukses; label 6-digit vs validasi 4; tanpa timer/resend/nomor tampil; bukan `<form>`; sukses/error sama-sama amber. (3/5)
- H5 studio: tanpa fallback non-WebGL; `new Vector3` tiap render; select-none mobile; ikon tanpa aria-label. (3/5)
- H7 invoice: `order.user.name` crash bila guest `user=null`; `IN_PRODUCTION_QUEUE` = banner "BERHASIL" (menyesatkan); `?status=success` dipercaya (spoofable); `courierNotes` internal tampil publik; impor ikon mati. (4/5)
- H8 dashboard: limit 5/6 tanpa "lihat semua"; impor ikon mati; `revalidate+force-dynamic` dobel. (2/5 → naik setelah P0-1 diperbaiki)
- H9 overview: deteksi express `like %EXPRESS%` rapuh; tabel tanpa paginasi/search; nama full ke staff. (3/5)
- H11 orders: tanggal tanpa tahun; kolom payment difetch tak tampil; impor Search/Filter mati. (3/5)
- H12 detail: `wa.me/undefined` bila phone null; asumsi `front` bila placement null; histori jam saja; impor mati. (3/5)
- H14 job-ticket: PII tercetak (risiko foto); checkbox tanpa htmlFor. (4/5)
- H15 katalog-admin: kategori read-only (label CRUD bohong); field tanpa fallback ("undefined"); tanpa tambah/filter. (3/5)
- H16 customers: label total salah; tanpa mask/search/export; teks PDP tanpa enforcement. (3/5)
- H19 settings: read-only berjudul settings; fallback env bisa bocor ke UI; teks WA template statis. (3/5)
- H21 layout: `DUITKU_ENV` unset → fallback sandbox ikut prod; gaId tanpa sanitasi; banner mount di admin/print; SmoothScroll ganggu print; tanpa OG image. (4/5)
- H22 404: orphan tanpa nav; pesan generik. (4/5)
- H23 sitemap: fallback `kaoskami.com` vs `workers.dev` (kanonikal ganda); `lastModified: now` boros crawl. (4/5)

### Komponen UI/toko (skor 1-4)
- U1 banner: URL hardcode tanpa cek 404/versi; dialog tanpa modal/focus; iOS tak dapat apa-apa. (4/5)
- U2 AuthModal: defaultMode tak sinkron; flicker sesi; signOut tak await; mapping `xxx@kaoskami.phone` bocorkan pola; tanpa ESC/backdrop/show-password/lupa-password; sukses `setTimeout` pasca-unmount; label WA vs email. (3/5)
- U3/U19 overlay editorial: fallback angka bila spec hilang; `opacity-0` tanpa aria-hidden. (4/5)
- U4 BottomSheet: klaim drag, realita klik; `peek` mati; tanpa ESC/scroll-lock; handle kecil; menutup konten. (2/5)
- U6 CheckoutModal: email tanpa format; district default ikut PICKUP; kupon tanpa pratinjau; grandTotal client vs server; GPS append tanpa dedup; Nominatim tanpa UA/timeout; isLoading macet jalur sukses; `(window).checkout` tak pernah di-load; pesan campur ID/EN; slider tanpa label. (2/5)
- U7 CustomizerDrawer: mobile editor mati total (<768px cuma ringkasan); multi-part tanpa tombol mode; export PNG blank (tanpa preserve); video 360 durasi tak jamin penuh; share link tanpa state; img race tanpa abort; 6 tab tanpa tablist; emoji satu-satunya penanda. (3/5)
- U8 lookbook: hardcode, tanpa link produk, tahun hardcode. (4/5)
- U9 FabricEditor: kanvas fix tak responsif; multiplier 1 (bukan 300DPI nyata); CORS tainted; tanpa toolbar. (3/5)
- U10 Footer: NOL link (navigasi + SEO mati). (1/5)
- U12 HomeCatalog: gagal fetch hilang diam; `images[0]` crash; tanpa toast cart; CLS; label "3+" statis. (3/5)
- U13 LookbookImage: tanpa dimensi (CLS). (4/5)
- U14 ModelErrorBoundary: tanpa retry; telan error asli. (3/5)
- U15 Navbar: tanpa /track; mobile tanpa nav; CTA duplikat; badge >99; impor/state mati. (2/5)
- U16 Preloader: progres palsu; useProgress di luar Canvas; aria terbalik. (4/5)
- U17 PrintButton: cetak seluruh halaman; gaya inkonsisten. (3/5)
- U18 StaticShowcase: tombol ACQUIRE mati; sizeFee drift; harga duplikat logika; copy Inggris; nested main. (2/5)
- U20 TurnstileWidget: fallback test-key di luar CheckoutModal = lolos bot; callback basi (deps inline); tanpa timeout polling; tanpa pesan visual. (3/5)
- C21 AddressBook: refresh andalkan parent; tanpa edit/default; confirm/alert native (WebView blokir). (3/5)
- C22 CancelButton: tanpa cek client; done permanen; confirm native. (4/5)
- C23 DesignCardActions: rename tanpa catch; prompt/confirm native; tanpa pesan. (3/5)
- C26 CmsHeroForm: tanpa load awal (rawan timpa); tanpa sanitasi server; label tanpa htmlFor. (3/5)
- C28 CustomerRoleSelect: cancel-confirm malah refresh; ADMIN bisa pilih SUPER_ADMIN di UI. (4/5)
- C29 OrderAdminActions: satu busy 3 aksi; resi tanpa validasi; tombol destruktif rapat. (4/5)
- C31 VariantRowActions: race klik cepat; error diam; Enter tak save. (4/5)
- P32 DesignSyncProvider: fire-and-forget; guard hanya tshirt; slider picu effect; tanpa indikator sync. (3/5)
- P33 QueryProvider: getQueryClient tiap render; tanpa tuning. (3/5)
- P34 SmoothScrollProvider: pasang global termasuk studio (rebut orbit); konversi `*1000` verifikasi; tanpa refresh pasca-load; hijack wheel. (3/5)

### 3D/grafis lanjutan (skor 2-4)
- G1 ApparelMeshRenderer: magic number story; crewneck=hoodie mesh tapi spek cm beda (lompat harga tanpa beda visual); modelRotY abai di story; skala ganda mobile. (4/5)
- G2 CameraRig: target literal (reset berulang); preset jump; min/max vs story cam. (4/5)
- G3 CanvasStage: `preserveDrawingBuffer` mahal; exposure tak reaktif; Draco path tanpa cek; 2 konteks + ClothLab. (3/5)
- G4 DecalGizmo: cm abaikan aspek; kerah hardcode 0.18 (salah s/d 1,4cm); maxFront untuk semua sisi; drag sensitif viewport; clamp ±0,25 vs guide 0,08 vs store ±0,35 (tiga angka beda!). (3/5)
- G6/G7 Hoodie/Shirt/Longsleeve/Tshirt: leak material/merged/clone (kecuali Tshirt/Longsleeve dispose ada); `center()` geser jangkar + hapus normals; roughness mati; preload ganda; wind ganda (Tshirt); knit timpa scale; ambang part tak terkalibrasi; mutasi cache GLB. (2-3/5)
- G10 StudioLighting: physical-lights (point/spot redup); 7 lampu + shadow di tier-low tanpa degradasi. Perlu verifikasi visual + tiering. (4/5)
- G12 ClothLab: side-effect di render; normals tiap frame; tanpa substep; tak dispose; wind assignment saat render. (2/5)
- G21 dpiAnalyzer: 1 sumbu; clamp menaikkan; default 28,5cm menyesatkan. (4/5)
- G22 printUV: split z gagal lengan; v dari bbox hood; stretch drawImage; OOM 17MP. (2/5)
- G23 geometryPrep: pinY vs kerah hood; box-UV benar untuk weave. (4/5)
- G24 proceduralTextures: loop 512² main-thread (sekali, OK); letterSpacing Safari; repeat vs box-UV. (4/5)
- G25 clothPhysicalMaterial: selalu Physical (tier-low langgar); sheen 1,15 (>1); ambang linear vs sRGB; tanpa fallback SSR. (3/5)
- G26 windDisplacement: injeksi X-only vs dokumen X+Z; reset uTime; tanpa dispose. (2/5)
- G27 compressImage: PNG-1200 + quality mati + EXIF abai → klaim print-ready salah. (2/5)
- G28 removeSolidBackground: makan putih interior + tanpa feather + CORS. (2/5)
- G29 textDecalGenerator: kanvas 3:1 fix + alpha buang + font tak tunggu + opsi mati. (2/5)

### Backend lanjutan (skor 2-4)
- B1 DB: tanpa FK/RLS/CHECK; enum hanya Zod; transisi mundur bebas; CartItem tanpa unique; `isoDateTime` null→1970/Invalid; kompensasi yatim berjendela. (2/5)
- B2 auth: cookie role basi 5 mnt; Google env kosong samar; guest-checkout campur akun (email korban + nomor sendiri); email tanpa verifikasi; password min-6 custom saja; staff baca PII penuh. (2/5)
- B3 payment: COD tak dikenal webhook/repay; total-Rp0 lolos; discount negatif overcharge; stok oversell; kupon hangus saat Duitku down; `method` mentah client; mobile tanpa varian; MD5+HMAC ganda (catat hapus MD5). (3/5)
- B4 webhook: amount opsional saat sukses; race ganda (payload last-wins); FAILED tanpa history; compare non-timing-safe. (4/5)
- B5 OTP: semua di P1-04 + enumerasi via track. (2/5)
- B6 rate-limit: tanpa KV global (membaik Fase 17); fail-open; IP spoof; non-atomik; tanpa kunci user. (2/5)
- B7 R2: base64 skip sharp; contentType dipercaya; designs fallback data-URL bengkakkan DB; OOM regex; `Buffer` vs compat; Turnstile catch fail-open. (3/5)
- B8 cron: secret `!==` biasa; sweep tanpa limit (andalkan secret); rotasi + IP allowlist disarankan. (3/5)
- B9 cart/designs/admin: harga client; qty tanpa max POST; variant/design tak divalidasi; guest PATCH/DELETE by-obscurity; claim/autosave `z.any` raksasa; admin tasks tanpa cek pemilik/transisi; claim overwrite; kupon FIXED max100; ADMIN promosikan SUPER_ADMIN. (2-3/5)

### Mobile (skor 2-4)
- M1 checkout: validasi telat per-step; tanpa format 08/62 + max; district tanpa cek; total tanpa diskon; COD fail-closed baik. (3/5)
- M2 admin: fallback jujur baik; selain P1-19. (2/5)
- M3 API: tanpa timeout/retry/auth; null generik; platform hardcode; produksi selalu 401→demo. (2/5)
- M4 offline: persist ya; checkout wajib online; trigger startup+reconnect saja. (2/5)
- M5 versi: core v8 vs 12 plugin v7 (diperbaiki keyboard; sisanya di branch Next15/React19 — status: branch digabung, verifikasi HP fisik tertunda). (2/5 → re-audit pasca-merge)
- M6 token/URL: userId plaintext localStorage; allowBackup on; deeplink longgar (aman karena poll server). (3/5)
- M7 3D/perf: disposal+tier+context-loss terbaik; physical di low; base64 video OOM. (4/5)
- M8 signing/build: env/key.properties benar; vCode 1; minSdk 23; minify off. (4/5)

---

## 4. DAFTAR OBAT BERURUT (disarankan)

1. P0-2 (role input:false + audit ADMIN) → 2. P0-1 (redirect dashboard) → 3. P0-5 (fail-closed admin) → 4. P0-3 (bucket privat backup) → 5. P0-4 (repay update-in-place + auth) → 6. P1 kanban/file/timeline/diskon (sudah sebagian, sisa kecil) → 7. P1 OTP hardening → 8. P1 orderNumber/User race → 9. P2 batch UI (footer/nav/track/cms/404) → 10. P2 3D (scale SSOT, dispose, sync 2D, pipeline kualitas) → 11. Mobile (data pribadi, admin jujur, versi, timeout) → 12. Next15 branch (sudah digabung — verifikasi HP + hapus flag danger bila peer oke).

## 5. CATATAN VERIFIKASI & BATASAN AUDIT
- Yang DIVERIFIKASI via kode/probe/live: semua P0 + P1-01..05, P1-08..10, P1-15, P1-17 (kode), backup exposure, coupon FIXED, role parse, kanban drop, gang-sheet (404 routing hidup; render aktual butuh order beneran).
- Yang KLAIM AGEN (wajar, belum dibuktikan live): perilaku visual 3D di HP fisik, performa HP low, OOM ekspor 17MP di Safari, timing rayapan crawler, isi notifikasi Fonnte terkirim.
- Estimasi total: P0 ≈ 3–4 hari, P1 ≈ 8–12 hari, P2 ≈ 10–15 hari (termasuk uji). Tanpa ubah skema DB kecuali noted.
