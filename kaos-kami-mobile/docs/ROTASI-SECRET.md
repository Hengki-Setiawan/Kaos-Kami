# ROTASI SECRET + RENCANA PURGE HISTORI — Kaos Kami

> Status: **RENCANA / PERSIAPAN** — tidak ada perintah destruktif yang dijalankan saat dokumen ini ditulis.
> Aturan owner yang mengikat: **DEPLOY/PUSH GATE** — JANGAN `git push`, `npm run deploy`,
> `wrangler deploy`, revoke/invalidate token, `filter-repo`, `force-push`, atau generate keystore
> tanpa perintah eksplisit owner. Semua perintah di bawah adalah **teks rencana**, bukan eksekusi.
> Bahasa: Indonesia. Tidak ada nilai secret asli di dokumen ini — hanya `<PLACEHOLDER>`.

Tanggal penyusunan: 21 Sep 2026. Lokasi: `kaos-kami-mobile/docs/ROTASI-SECRET.md`.

---

## 0. Ringkasan temuan verifikasi (21 Sep 2026, read-only)

Hasil kerja persiapan (tanpa mengeksekusi apa pun yang destruktif):

### 0a. Jejak file sensitif di histori git

Perintah (sudah dijalankan, read-only):

```powershell
git log --all --full-history --oneline --name-status -- "*keystore*" "*key.properties*" "*password*"
git log --all --full-history --format="%H %ad %an %s" --date=short -- "*keystore*" "*key.properties*" "*password*"
```

| Commit | Tanggal | File | Kejadian |
|---|---|---|---|
| `cedf9f3` — *feat(mobile): add Cloth Rotational Inertia Physics…* | 2026-09-03 | `kaos-kami-mobile/android/app/kaoskami-release.keystore` | **A** (keystore beta ter-commit) |
| `deb461d` — *feat(web): Fase 15…* | 2026-09-07 | `kaos-kami-mobile/android/app/kaoskami-release.keystore` | **D** (dihapus dari tree) |
| `deb461d` | 2026-09-07 | `kaos-kami-mobile/android/key.properties.example` | **A** (aman — hanya placeholder) |
| `ba97eae` — *feat: paritas penuh mobile capacitor…* | 2026-09-20 | `scripts/set-admin-password.ts` | **A** (baru; berisi password admin plaintext — lihat §0d) |

### 0b. Blob keystore beta MASIH reachable — WAJIB purge + rotasi

```powershell
git rev-list --objects --all | Select-String "keystore"
# -> 045aaa0b80e49d0e1f0b697fe9ff48f3e81ca3a8  kaos-kami-mobile/android/app/kaoskami-release.keystore
git cat-file -t 045aaa0b80e49d0e1f0b697fe9ff48f3e81ca3a8  # -> blob (ada, 2796 byte)
git cat-file -e 045aaa0b80e49d0e1f0b697fe9ff48f3e81ca3a8 # -> sukses = reachable
git log --all --oneline --find-object=045aaa0b80e49d0e1f0b697fe9ff48f3e81ca3a8
# -> deb461d, cedf9f3 (terkandung di main, origin/main, exp/webgpu, upgrade/next-15)
```

Kesimpulan: menghapus file di commit baru (`deb461d`) **tidak** menghapus blob dari histori.
Siapa pun yang clone repo bisa mengekstrak keystore beta. Keystore beta = anggap bocor.

Catatan worktree: file `kaos-kami-mobile/android/app/kaoskami-release.keystore` dan
`kaos-kami-mobile/android/key.properties` **ada di disk lokal tapi UNTRACKED + IGNORED**
(`git ls-files` tidak mencatatnya; `git check-ignore` menunjuk ke `.gitignore`).
Hash file lokal BERBEDA dari blob histori (keystore lokal = hasil generate ulang, bukan blob beta).
Jangan pernah `git add` keduanya — `.gitignore` sudah benar (`*.keystore`, `**/android/key.properties`,
`keystore-passwords.local.txt`).

### 0c. Pola secret e2e — 3 bersih, 1 MASIH BOCOR

Cek tracked worktree (HEAD), hanya daftar file (nilai tidak ditampilkan):

```powershell
git grep -l "kaos-kami-secret-dev" -- .   # -> KOSONG (bersih)
git grep -l "ea279c7a" -- .               # -> KOSONG (bersih)
git grep -l "eyJhbGciOiJFZERTQS" -- .     # -> KOSONG (bersih)
git grep -l "DS28521" -- .               # -> 9 FILE MASIH MENGANDUNG (lihat bawah)
```

`git log --all --oneline -S <pola>` membuktikan ketiga pola yang bersih itu pernah ada di histori
(termasuk penghapusan final di `ba97eae`) — artinya **nilai lama tetap di histori git** dan token terkait
tetap anggap bocor sampai dirotasi + histori di-purge. Konsisten dengan catatan
`Blueprint/TODO-ENV-RILIS-MAXIMAL.md` §0 (6 script e2e sudah dibersihkan ke `requireEnv()`,
nilai lama tetap di histori → masuk antrian rotasi).

**Pola `DS28521` = SECRET, bukan fixture.** Konteks kemunculan (nilai disensor):

- `Blueprint/mobile/BLUEPRINT-M4-COMMERCE-FLOW-MOBILE.md` (2 hit):
  `Merchant Code: DS28521<sensor>` — ini **kode merchant Duitku asli**.
- `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-6-kanban-fulfillment-audit.json` (3 hit) +
  5 artefak E2E lain (1 hit tiap file):
  `"note": "Pembayaran Duitku lunas via VA_BCA/QRIS (Ref: DS28521<sensor>…"` —
  referensi transaksi live yang menanam kode merchant.

9 file terdampak (jumlah hit per file dari `git grep -c`):

1. `Blueprint/hasil-pengujian-e2e/RENCANA-PENGECEKAN-E2E-REAL-MAXIMAL.md` (1)
2. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-1-invoice-web.html` (1)
3. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-1-kaos-boxy-makassar-KK-20260919-6521.json` (1)
4. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-2-hoodie-pickup-KK-20260919-2728.json` (1)
5. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-2-invoice-web.html` (1)
6. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-3-bulk-merch-order-KK-20260919-3258.json` (1)
7. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-3-invoice-web.html` (1)
8. `Blueprint/hasil-pengujian-e2e/orders-invoices/KASUS-6-kanban-fulfillment-audit.json` (3)
9. `Blueprint/mobile/BLUEPRINT-M4-COMMERCE-FLOW-MOBILE.md` (2)

Tindak lanjut: rotasi `DUITKU_MERCHANT_CODE` + `DUITKU_API_KEY` (§4) dan redaksi/purge 9 file (§8).

### 0d. Temuan tambahan: password admin plaintext di repo

`scripts/set-admin-password.ts` (baru di `ba97eae`, masih di HEAD) berisi userId admin + password
plaintext + `console.log` password. Ini kredensial aktif yang ter-commit. Tindak lanjut:

1. Ganti password admin via jalur aman (bagian dari eksekusi rotasi, §7).
2. Sanitasi file: ganti literal dengan `requireEnv("ADMIN_RESET_PASSWORD")` / hapus setelah dipakai —
   JANGAN biarkan literal di repo (eksekusi sanitasi menunggu perintah owner).

### 0e. Tool tersedia (cek 21 Sep 2026, hanya pencatatan)

| Tool | Status |
|---|---|
| `git filter-repo` | **TIDAK TERINSTAL** (`git: 'filter-repo' is not a git command`) — instal dulu saat eksekusi (§8) |
| BFG Repo-Cleaner | **TIDAK TERINSTAL** (`bfg` tidak dikenal) — alternatif bila filter-repo tak bisa dipasang |
| `gh` | ADA — `gh version 2.96.0` |
| `git` | ADA — `git version 2.49.0.windows.1` |

---

## 1. Inventaris secret (nama saja, tanpa nilai)

Sumber kebenaran: `kaos-kami-web/wrangler.jsonc` → `secrets.required` (10 secret) + kode + `.env.example`.

| # | Secret | Dipakai di (kode) | Sifat |
|---|---|---|---|
| 1 | `TURSO_AUTH_TOKEN` | `src/lib/db.ts`, `scripts/*`, `check-turso.mjs` | Token DB rw; **bocor di histori** (script e2e lama) |
| 2 | `BETTER_AUTH_SECRET` | `src/lib/auth.ts`, `src/lib/otp.ts` (pepper OTP), `scripts/run-all-e2e-real.mjs` | Secret auth + pepper OTP; **bocor di histori** |
| 3 | `FONNTE_TOKEN` | `src/lib/notifications/whatsapp.ts`, `src/app/api/auth/send-otp/route.ts` | Token WA device |
| 4 | `DUITKU_MERCHANT_CODE` | `src/lib/payments/duitku.ts`, webhook, script e2e | **Bocor aktif** — awalan `DS28521…` di 9 file (§0c) |
| 5 | `DUITKU_API_KEY` | sama dengan di atas | Pasangan merchant code; rotasi selalu berpasangan |
| 6 | `CLOUDFLARE_API_TOKEN` | `src/lib/r2.ts`, `src/app/api/cron/backup-status/route.ts` | Token API CF (scope R2 dsb) |
| 7 | `CLOUDFLARE_TURNSTILE_SECRET_KEY` | verifikasi Turnstile checkout | Secret captcha |
| 8 | `CRON_SECRET` | `src/app/api/cron/sweep/route.ts`, `src/app/api/cron/backup/route.ts` | Bearer cron-job.org; tanpa secret = 503, salah = 401 |
| 9 | `GOOGLE_CLIENT_SECRET` | `src/lib/auth.ts` (Google provider) | Secret OAuth (ID-nya publik, di vars) |
| 10 | `AGENWEBSITE_RATE_API_KEY` | shipping AgenWebsite Rate API | Kunci tarif ekspedisi |
| 11 | Keystore Android + `key.properties` | `kaos-kami-mobile/android/` | **Beta bocor di histori**; lokal ignored (benar) |
| 12 | Password admin | `scripts/set-admin-password.ts` | **Plaintext di HEAD** — sanitasi + reset (§0d, §7) |

Yang **BUKAN** secret (tetap di `vars`, jangan dipindah ke secrets): `DUITKU_ENV`,
`GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_*`, `TURSO_DATABASE_URL`, `CLOUDFLARE_ACCOUNT_ID`,
`R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `SHOP_POSTAL_CODE` (keputusan W1, `wrangler.jsonc:48-58`).

---

## 2. Prinsip urutan rotasi (berlaku untuk SEMUA secret)

```text
BUAT-BARU → PASANG (wrangler + dev lokal) → DEPLOY → VERIFIKASI → CABUT-LAMA
```

Aturan keras:

1. **Jangan cabut yang lama sebelum yang baru terverifikasi hidup** — kecuali Turso (§3,
   `invalidate` mematikan semua token lama sekaligus, jadi penjadwalannya terbalik: siapkan
   segalanya dulu, eksekusi saat off-peak).
2. **Deploy yang benar = `npm run deploy` dari `kaos-kami-web/`**
   (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`).
   JANGAN `wrangler deploy` langsung (bundle `.open-next` basi → rute baru 404). Lihat AGENTS.md §7.
3. `npx wrangler secret put <KEY>` **langsung men-deploy ulang Worker** (dokumen CF resmi) —
   jadi langkah PASANG ≈ DEPLOY parsial; tetap jalankan `npm run deploy` penuh setelah semua secret
   baru terpasang agar build konsisten.
4. Verifikasi dari **jaringan luar** (bukan `localhost`) untuk hal yang menyangkut prod.
5. Nilai baru: generate acak minimal 32 char untuk secret generik:
   `openssl rand -base64 48` (Git Bash / PowerShell dengan OpenSSL dari Git for Windows).
6. Simpan nilai baru HANYA di: password manager owner + `wrangler secret` (prod) +
   file dev lokal gitignored (`kaos-kami-web/.dev.vars`, `.env.local`). JANGAN di repo/chat/log.
7. Waktu eksekusi: **off-peak** (tengah malam WITA), umumkan freeze checkout ±30 menit untuk
   secret berdampak sesi/transaksi (Better Auth, Duitku, Turso).

Perintah bantu (aman, read-only, boleh jalan kapan saja):

```powershell
cd kaos-kami-web
npx wrangler secret list            # daftar NAMA secret (nilai tak pernah tampil)
node ..\check-turso.mjs             # smoke koneksi Turso (pakai env lokal)
curl -sS https://kaoskami.biz.id/api/health
curl -sS https://kaoskami.biz.id/api/cron/backup-status
```

---

## 3. Prosedur per secret — TURSO_AUTH_TOKEN

**Dampak:** semua akses DB prod (web Worker, script, seed). Salah pasang = seluruh situs 500.
**Karakter penting (hasil riset dokumen Turso resmi, Sep 2026):**
`turso db tokens invalidate <db>` memutar kunci penandatangan sehingga **SEMUA token yang pernah
diterbitkan ikut mati — termasuk token yang baru dibuat 5 menit sebelumnya**. Jadi urutan
create → pasang → deploy → invalidate adalah **SALAH** (token yang baru di-deploy ikut mati).
Urutan benar: siapkan segalanya → `invalidate` saat off-peak → langsung `create` → `put` →
`deploy` → verifikasi. Jendela downtime = menit antara invalidate dan deploy hijau.

```powershell
# 0. SIAPKAN (sebelum jendela off-peak; read-only, aman):
turso db show kaos-kami-hengki164
turso db tokens list kaos-kami-hengki164 2>&1 | Select-Object -First 10
# Ganti <NAMA_DB_TURSO> dengan nama DB bila berbeda dari contoh di atas
# (URL di wrangler.jsonc: libsql://kaos-kami-hengki164.aws-ap-northeast-1.turso.io).

# 1. JENDELA OFF-PEAK — matikan semua token lama (TIDAK BISA DIBATALKAN):
turso db tokens invalidate <NAMA_DB_TURSO> --yes

# 2. Terbitkan token baru (langsung, memakai kunci baru):
turso db tokens create <NAMA_DB_TURSO> --expiration never
# -> salin HANYA ke password manager + langkah 3. Jangan paste di chat/log.

# 3. Pasang ke prod (dari kaos-kami-web/; men-deploy ulang Worker):
cd kaos-kami-web
npx wrangler secret put TURSO_AUTH_TOKEN
# 4. Pasang ke dev lokal (file gitignored, JANGAN commit):
#    kaos-kami-web/.dev.vars  +  .env.local  ->  TURSO_AUTH_TOKEN=<nilai-baru>

# 5. Deploy penuh + verifikasi:
npm run deploy
curl -sS https://kaoskami.biz.id/api/health
curl -sS https://kaoskami.biz.id/api/cron/backup-status
# Kriteria lolos: /api/health 200 + DB ok, katalog 200, signup+signin uji, COD order uji.
```

**Rollback:** tidak ada "un-invalidate". Bila deploy gagal setelah invalidate, ulangi langkah 2–5
(buat token lagi → put → deploy) sampai hijau. Karena itu eksekusi HANYA saat owner siap standby.

---

## 4. Prosedur per secret — BETTER_AUTH_SECRET, FONNTE_TOKEN, DUITKU_*, CLOUDFLARE_API_TOKEN (+Turnstile), GOOGLE_*, CRON_SECRET

Pola umum tiap secret di bawah: **buat-baru di dashboard resmi → `wrangler secret put` →
`.dev.vars`/`.env.local` → `npm run deploy` → verifikasi → cabut/nonaktifkan yang lama di dashboard**.
Semua perintah `put` dijalankan dari `kaos-kami-web/`. Perintah di bawah BELUM dijalankan.

### 4a. BETTER_AUTH_SECRET

**Dampak:** SEMUA sesi login mati + pepper OTP (`src/lib/otp.ts`) berubah → OTP yang sedang
berjalan ikut invalid. Umumkan ke user: "silakan login ulang". E2E signature helper memakai secret
ini (`run-all-e2e-real.mjs`) — sinkronkan env CI/dev juga.

```powershell
# 1. Generate (di mesin owner, JANGAN commit hasilnya):
openssl rand -base64 48
# 2. Pasang:
cd kaos-kami-web
npx wrangler secret put BETTER_AUTH_SECRET
# 3. Samakan dev lokal (.dev.vars + .env.local).
# 4. Deploy + verifikasi:
npm run deploy
curl -sS https://kaoskami.biz.id/api/health
# Kriteria lolos: signup + signin prod OK, lupa-password/OTP OK, sesi lama ditolak (expected).
# 5. Cabut-lama: tidak ada tombol revoke (secret stateless) — yang lama otomatis tak berguna
#    setelah deploy karena server hanya kenal nilai baru. Pastikan tidak ada Worker versi lama
#    yang masih digradual-rollout (cek dashboard Workers > Deployments).
```

### 4b. FONNTE_TOKEN

**Dampak:** OTP WhatsApp + notifikasi order. Fail-safe kode: tanpa token, checkout tetap sukses
(try/catch + tombol `wa.me` manual) — jadi rotasi ini risiko rendah.

```powershell
# 1. Buat baru: dashboard Fonnte -> device -> regenerate/disconnect-connect ulang -> salin token.
# 2. Pasang:
cd kaos-kami-web
npx wrangler secret put FONNTE_TOKEN
# 3. Samakan dev lokal.
# 4. Deploy + verifikasi:
npm run deploy
# Kirim OTP uji ke nomor owner via halaman login prod; cek dashboard Fonnte (device connected,
# kuota berkurang 1). Fallback wa.me manual tetap ada walau token salah (by design).
# 5. Cabut-lama: revoke/disconnect device lama di dashboard Fonnte.
```

### 4c. DUITKU_* (MERCHANT_CODE + API_KEY) — PRIORITAS TINGGI (bocor aktif)

**Dampak:** inquiry pembayaran, signature callback MD5 (`merchantCode+amount+orderNumber+apiKey`),
webhook. Kode merchant **sedang terpapar di 9 file repo** (§0c) — minta kode merchant BARU ke Duitku
(jenisnya identitas akun, tidak bisa "generate" sendiri seperti token acak).

```powershell
# 1. Buat baru: dashboard Duitku (mode sandbox DULU, lalu production) ->
#    reset API key + minta merchant code baru bila didukung; catat DUITKU_ENV tetap "sandbox"
#    di vars sampai waktunya live (keputusan W1).
# 2. Pasang BERPASANGAN (keduanya, satu sesi):
cd kaos-kami-web
npx wrangler secret put DUITKU_MERCHANT_CODE
npx wrangler secret put DUITKU_API_KEY
# 3. Samakan dev lokal.
# 4. Deploy + verifikasi:
npm run deploy
# a) Dashboard Duitku -> Transactions -> orderNumber uji sandbox Rp10.000 -> resultCode=00
#    (alur sama seperti verifikasi 04 Sep 2026 di BUILD-PROGRESS-TRACKER-MOBILE).
# b) Uji callback signature: scripts/e2e-kasus-1.mjs (env lokal baru) — sandbox saja.
# c) Halaman admin settings hanya menampilkan status ada/tidak (tak pernah menampilkan nilai).
# 5. Cabut-lama: nonaktifkan API key lama di dashboard Duitku; merchant code lama otomatis
#    mati mengikuti. Lanjut ke redaksi 9 file (§0c) + purge histori (§8).
```

### 4d. CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_TURNSTILE_SECRET_KEY)

**Dampak token API:** baca R2 untuk `backup-status`, operasi R2 lain (`src/lib/r2.ts`).
**Dampak Turnstile secret:** verifikasi captcha checkout (pasangannya site key publik di vars).

```powershell
# 1. Buat baru: dashboard Cloudflare -> My Profile -> API Tokens ->
#    buat token dengan scope minimum yang dipakai app (R2:Edit pada akun/bucket terkait;
#    tiru permission token lama, JANGAN pakai Global API Key).
# 2. Pasang:
cd kaos-kami-web
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_TURNSTILE_SECRET_KEY
# 3. Samakan dev lokal.
# 4. Deploy + verifikasi:
npm run deploy
curl -sS https://kaoskami.biz.id/api/cron/backup-status
curl -sS -H "Authorization: Bearer <CF_TOKEN_BARU>" "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/tokens/verify"
# Kriteria lolos: backup-status 200 + ringkasan umur backup wajar; verify -> "status":"active".
# Checkout uji dengan Turnstile (salah isi captcha harus ditolak).
# 5. Cabut-lama: dashboard Cloudflare -> API Tokens -> Roll/Delete token lama.
```

### 4e. GOOGLE_* (GOOGLE_CLIENT_ID publik + GOOGLE_CLIENT_SECRET)

**Dampak:** login Google web. Client ID publik (di `vars`, W1) — tidak dirotasi kecuali pindah
project GCP. SHA-256 Play / assetlinks / App Links TIDAK terpengaruh rotasi secret ini.

```powershell
# 1. Buat baru: Google Cloud Console -> APIs & Services -> Credentials ->
#    OAuth client -> rotate/regenerate client secret (authorized redirect URI JANGAN diubah:
#    https://kaoskami.biz.id/api/auth/callback/google).
# 2. Pasang (HANYA secret-nya; ID tetap di vars):
cd kaos-kami-web
npx wrangler secret put GOOGLE_CLIENT_SECRET
# 3. Samakan dev lokal.
# 4. Deploy + verifikasi:
npm run deploy
# Login Google di prod end-to-end (akun uji) + cek callback 302 kembali ke situs.
# 5. Cabut-lama: secret lama otomatis mati setelah regenerate di konsol Google.
```

### 4f. CRON_SECRET

**Dampak:** 2 job cron-job.org (sweep tiap jam menit-0; backup Senin 02:00 WIB) + endpoint
`/api/cron/sweep`, `/api/cron/backup`. Tanpa secret = 503; salah = 401 (timing-safe compare).
Jadwal + header hidup di **dashboard cron-job.org** (by design, bukan di repo).

```powershell
# 1. Generate:
openssl rand -base64 48
# 2. Pasang ke prod:
cd kaos-kami-web
npx wrangler secret put CRON_SECRET
# 3. Samakan dev lokal (.env.local / .dev.vars).
# 4. Update KEDUA job di dashboard cron-job.org: header
#    Authorization: Bearer <CRON_SECRET_BARU> (sweep + backup).
# 5. Deploy + verifikasi (3 lapis):
npm run deploy
curl -sS https://kaoskami.biz.id/api/cron/backup-status
curl -sS -o NUL -w "%{http_code}\n" -H "Authorization: Bearer SALAH-SENGAJA" https://kaoskami.biz.id/api/cron/sweep
# -> harus 401 (gerbang secret hidup).
curl -sS -o NUL -w "%{http_code}\n" -H "Authorization: Bearer <CRON_SECRET_BARU>" https://kaoskami.biz.id/api/cron/sweep
# -> harus 200. PERHATIAN: request Bearer-valid MENGEKSEKUSI sweep betulan
#    (batalkan PENDING >24h sesuai desain) — jalankan sekali, off-peak, dan catat hasilnya.
# 6. Cabut-lama: tidak ada revoke sisi server (stateless); keamanan dipulihkan karena hanya
#    nilai baru yang dikenal server + dashboard. Jangan tinggalkan nilai lama di kopi mana pun.
```

Urutan aman CRON_SECRET: pasang server (`put`) + deploy DULU, lalu update dashboard cron-job.org
SEGERA (jeda = job gagal 401, bukan kebocoran). Siapkan tab dashboard sebelum `put`.

### 4g. AGENWEBSITE_RATE_API_KEY + catatan CI

- `AGENWEBSITE_RATE_API_KEY`: buat baru di dashboard AgenWebsite → `wrangler secret put
  AGENWEBSITE_RATE_API_KEY` → samakan dev lokal → `npm run deploy` → verifikasi cek tarif luar
  kota (pilih termurah muncul) → nonaktifkan kunci lama. Fallback `ExpeditionZone` membuat risiko
  rendah (ongkir tetap tampil bila API mati).
- CI (`.github/workflows/ci.yml`): memakai `BETTER_AUTH_SECRET: "ci-only-dummy-…"` — dummy khusus
  CI, **tidak perlu** diganti saat rotasi prod. Tidak ada secret prod di GitHub Actions yang perlu
  disentuh kecuali bila suatu saat keystore CI ditambahkan (saat ini belum ada).

---

## 5. Keystore Android (beta bocor, produksi baru) — RENCANA, bukan eksekusi

Konteks: blob beta reachable (§0b). Aturan misi: **JANGAN generate keystore sekarang**.
Prosedur saat owner memerintahkan (kunci produksi BARU, terpisah dari beta yang bocor):

```powershell
# 1. Generate (di mesin BERSIH owner, BUKAN di repo; passphrase via password manager):
keytool -genkeypair -v -keystore kaos-kami-play.keystore -alias kaoskami -keyalg RSA -keysize 2048 -validity 10000
# 2. Daftarkan ke CI sebagai GitHub Secrets:
#    KAOSKAMI_STORE_PASSWORD / KAOSKAMI_KEY_ALIAS / KAOSKAMI_KEY_PASSWORD
#    (+ upload keystore ke secret/file aman CI sesuai NATIVE-DISTRIBUSI.md).
# 3. versionCode monoton naik + build AAB internal testing (M1 di TODO-ENV-RILIS-MAXIMAL).
# 4. Keystore BETA tidak pernah dipakai untuk Play (sideload saja) dan tidak pernah di-commit lagi.
# 5. Purge blob beta dari histori (§8) — tetap wajib walau keystore beta sudah tak dipakai.
```

---

## 6. Password admin + sanitasi script (RENCANA)

```powershell
# 1. Tetapkan password baru via password manager (acak, >=16 char). JANGAN tulis di repo.
# 2. Jalankan reset SEKALI dari mesin owner dengan password via env (JANGAN hardcode):
#    $env:ADMIN_RESET_PASSWORD="<nilai-baru>"; npx tsx scripts/set-admin-password.ts
#    (dengan catatan: file script WAJIB disanitasi dulu — lihat langkah 3.)
# 3. Sanitasi scripts/set-admin-password.ts: ganti SEMUA literal password + userId dengan
#    requireEnv("...") atau HAPUS file setelah reset berhasil. Verifikasi:
#    git grep -l "KaosKamiAdmin2026" -- .   # harus KOSONG setelah sanitasi
# 4. Verifikasi login admin dengan password baru; sesi lama (bila ada) dicabut via ganti
#    BETTER_AUTH_SECRET (§4a) bila dicurigai penyalahgunaan.
```

---

## 7. Checklist eksekusi rotasi (urutan jalan)

Eksekusi menunggu perintah owner. Urutan yang disarankan (risiko kecil dulu):

1. [ ] `CLOUDFLARE_API_TOKEN` + Turnstile (§4d) — risiko rendah, jendela aman.
2. [ ] `FONNTE_TOKEN` (§4b) — risiko rendah (fail-safe checkout).
3. [ ] `AGENWEBSITE_RATE_API_KEY` (§4g) — risiko rendah (fallback tabel).
4. [ ] `GOOGLE_CLIENT_SECRET` (§4e) — sedang (uji login).
5. [ ] `CRON_SECRET` (§4f) — sedang (siapkan tab cron-job.org; jeda = 401 sementara).
6. [ ] `BETTER_AUTH_SECRET` (§4a) — tinggi (semua sesi mati; umumkan dulu).
7. [ ] `DUITKU_*` (§4c) — tinggi (uang; sandbox dulu, lalu production) + redaksi 9 file (§0c).
8. [ ] `TURSO_AUTH_TOKEN` (§3) — tertinggi (downtime by-design; off-peak, owner standby).
9. [ ] Password admin + sanitasi script (§6).
10. [ ] Keystore produksi baru (§5) — terpisah (butuh akun Play/CI owner).
11. [ ] Purge histori (§8) — setelah SEMUA rotasi hijau (agar nilai baru tak ikut tersapu masalah).

Setiap langkah: catat jam mulai/selesai + hasil curl di worklog
(`Blueprint/TODO-SISA-KERJA-MAXIMAL.md`), tanpa menempel nilai secret.

---

## 8. RENCANA PURGE HISTORI (belum dieksekusi — menunggu perintah + prasyarat)

Target purge: (a) blob keystore beta `045aaa0b…` (§0b); (b) string secret di histori:
awalan merchant code `DS28521…`, token `eyJhbGciOiJFZERTQS…`, `kaos-kami-secret-dev…`,
`ea279c7a…`, password `KaosKamiAdmin2026!`; (c) 9 file §0c (redaksi string, BUKAN hapus file
kecuali diputuskan — file E2E adalah artefak uji berharga; redaksi isi sudah cukup).

### 8a. Perintah exact — git filter-repo (utama)

```powershell
# 0. BACKUP MIRROR (wajib, read-only, aman — satu-satunya perintah bagian ini yang boleh
#    jalan SEBELUM perintah owner, karena tidak mengubah apa pun):
git clone --mirror <REMOTE-URL> kaos-kami-backup-mirror.git

# 1. Instal (belum terinstal — §0e):
pip install git-filter-repo
git filter-repo --version

# 2. Kerja di CLONE SEGAR, bukan worktree ini (worktree ini KOTOR — lihat §9):
git clone <REMOTE-URL> kaos-kami-purge.git
cd kaos-kami-purge.git

# 3. Hapus file keystore dari SELURUH histori:
git filter-repo --invert-paths --path kaos-kami-mobile/android/app/kaoskami-release.keystore --force

# 4. Redaksi string secret. Buat file redaksi.txt (SEBELAH clone, JANGAN di-commit;
#    isinya POLA, bukan nilai asli — satu baris per pola, format: regex==>teks-pengganti):
#    --- isi redaksi.txt ---
#    DS28521[A-Za-z0-9_-]+==>***DUITKU-MERCHANT-CODE-DICABUT***
#    eyJhbGciOiJFZERTQS[A-Za-z0-9._-]+==>***TOKEN-DICABUT***
#    kaos-kami-secret-dev[A-Za-z0-9._-]*==>***SECRET-DICABUT***
#    ea279c7a[A-Za-z0-9_-]*==>***KUNCI-DICABUT***
#    KaosKamiAdmin2026!==>***PASSWORD-DICABUT***
#    -----------------------
git filter-repo --replace-text ..\redaksi.txt --force

# 5. Bersihkan sisa + verifikasi (di clone hasil rewrite):
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git rev-list --objects --all | Select-String "kaoskami-release.keystore"
# -> HARUS KOSONG (tidak ada baris).
git log --all --oneline -S "DS28521" -- .
# -> HARUS KOSONG.
git log --all --oneline -S "KaosKamiAdmin2026" -- .
# -> HARUS KOSONG.
git cat-file -e 045aaa0b80e49d0e1f0b697fe9ff48f3e81ca3a8
# -> HARUS GAGAL (fatal: Not a valid object name).

# 6. Sanity build sebelum push (di kaos-kami-web clone hasil rewrite):
npm run typecheck
# + next build bila sempat (lihat package.json scripts).

# 7. Push rewrite — HANYA atas perintah eksplisit owner (DESTRUKTIF, menimpa histori remote):
git remote add origin <REMOTE-URL>   # filter-repo MENGHAPUS remote origin; daftarkan ulang
git push --force --all
git push --force --tags
```

### 8b. Alternatif — BFG Repo-Cleaner (bila filter-repo tak bisa dipasang)

```powershell
# Unduh bfg.jar resmi (butuh Java): https://rtyley.github.io/bfg-repo-cleaner/
# Kerja di clone mirror:
git clone --mirror <REMOTE-URL> kaos-kami-bfg.git
cd kaos-kami-bfg.git
java -jar ..\bfg.jar --delete-files kaoskami-release.keystore
java -jar ..\bfg.jar --replace-text ..\redaksi.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
# Verifikasi sama seperti §8a langkah 5, lalu push --force atas perintah owner.
```

### 8c. Checklist koordinasi (wajib sebelum force-push)

- [ ] Semua rotasi §3–§6 HIJAU (nilai baru hidup; yang lama mati).
- [ ] Freeze: umumkan ke semua kontributor — push/merge DITAHAN selama jendela purge.
- [ ] Semua orang push kerjaannya; tidak ada PR terbuka yang belum di-rebase (rewrite = hash baru).
- [ ] Backup mirror §8a-0 terverifikasi bisa dibuka (`git log` di mirror).
- [ ] CI secrets: tidak ada yang perlu diganti (CI pakai dummy — §4g). GitHub Secrets keystore
      (bila sudah ada saat eksekusi) dicatat ulang setelah re-clone.
- [ ] Cron: **purge TIDAK memengaruhi cron-job.org** (scheduler eksternal; jadwal+header di
      dashboard, bukan di repo). Yang memengaruhi cron HANYA rotasi `CRON_SECRET` (§4f) —
      pastikan itu sudah hijau SEBELUM purge agar tidak tercampur diagnosisnya.
- [ ] Mobile: semua dev hapus clone lama → **re-clone bersih** setelah push; jangan pull/merge
      clone lama ke histori baru (akan mengembalikan blob).
- [ ] Kabari: Play Console / Firebase tidak terdampak purge (mereka tidak baca histori git).

### 8d. Kriteria GO / NO-GO

| # | Kriteria | GO bila | NO-GO bila |
|---|---|---|---|
| 1 | Rotasi secret | §7 langkah 1–9 hijau, app sehat | masih ada secret lama yang hidup |
| 2 | Worktree & clone | rewrite dikerjakan di clone SEGERA yang bersih | worktree kotor (saat ini worktree utama KOTOR — 20+ file modified — JANGAN purge dari sini) |
| 3 | Backup | mirror backup ada + terbaca | tanpa backup |
| 4 | Verifikasi pasca-rewrite | blob hilang + `git log -S` kosong + typecheck lolos | satu pun cek gagal |
| 5 | Koordinasi | semua kontributor siap re-clone; freeze diumumkan | ada pihak yang belum siap |
| 6 | Perintah owner | ada perintah eksplisit "jalankan purge + force-push" | perintah belum ada (posisi saat ini: **NO-GO**) |

**Posisi dokumen ini: NO-GO (menunggu eksekusi bertahap + perintah owner).**

---

## 9. Lampiran — kondisi worktree saat verifikasi (21 Sep 2026)

- HEAD: `1c55971` (satu commit di atas `ba97eae`).
- `git status --short`: 20+ file **modified, belum di-commit** (area mobile 3D, models, dsb).
  Implikasi: JANGAN jadikan worktree ini basis rewrite; commit/stash dulu ATAU (lebih baik) pakai
  clone segar §8a-2.
- `git count-objects -v`: 3303 loose objects, `in-pack: 0` — belum pernah `gc`; blob lama utuh.
- Branch yang mengandung commit keystore (`cedf9f3`, `deb461d`): `main`, `origin/main`,
  `exp/webgpu`, `upgrade/next-15` — coordinated re-clone mencakup semua pemilik branch ini.

---

## 10. Pernyataan penutup

- Item misi 1 (verifikasi): SELESAI — §0a–§0e.
- Item misi 2 (runbook rotasi): dokumen ini §1–§7.
- Item misi 3 (rencana purge): dokumen ini §8.
- Item misi 4 (cek tool): §0e.
- File dibuat: `kaos-kami-mobile/docs/ROTASI-SECRET.md` (file ini — BARU).
- TIDAK ADA yang dieksekusi dari kategori destruktif: tidak ada revoke/rotate secret,
  tidak ada filter-repo/BFG, tidak ada force-push, tidak ada generate keystore, dan tidak ada
  deploy/push. Perintah `put/invalidate/deploy` di atas adalah teks rencana.
- Estimate kasar (TODO-ENV-RILIS-MAXIMAL W4/M6): rotasi = L (>1 hari, bertahap off-peak);
  purge = L (rewrite + koordinasi + re-clone).
