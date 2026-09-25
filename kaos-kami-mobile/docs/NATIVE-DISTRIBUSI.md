# NATIVE & DISTRIBUSI — Kaos Kami Mobile (N1–N5, L2)

> Status pengerjaan: 21 Sep 2026. Semua item KODE di bawah sudah diterapkan di
> repo. Semua item bertanda **[OWNER]** butuh akun/kunci milik owner dan
> **sengaja TIDAK dieksekusi** di sesi ini (tanpa push/deploy/build/menulis secret).

Sumber kebenaran versi: `package.json` (`1.0.0`) · Android
`versionName "1.0.0"` + `versionCode` env-default `20260913` ·
iOS `MARKETING_VERSION 1.0.0` + `CURRENT_PROJECT_VERSION 20260913`.

---

## N1 — Android SDK 36 + versionCode env + scripts (kode: SELESAI)

Yang diubah:

- `android/variables.gradle` — `targetSdkVersion` 35 → **36** (syarat Play Console
  per Agu 2026; `compileSdkVersion` sudah 36). `minSdkVersion` tetap 23.
- `android/app/build.gradle` — `versionCode` dibaca dari env
  `ANDROID_VERSION_CODE` via **lazy provider** yang null-aman:
  `providers.environmentVariable("ANDROID_VERSION_CODE").getOrElse("20260913")`.
  Pola `System.getenv() ?: …` langsung di blok `defaultConfig` tetap DILARANG
  (meledak `Value is null` saat evaluasi AGP — insiden 13 Sep 2026).
  `versionName` disamakan `"1.0.0"` (paritas `package.json` + iOS).
- `package.json` scripts:
  - `cap:build:apk` → `next build && cap sync android && guard && gradlew assembleRelease`
    (sebelumnya berhenti di `cap sync` — tidak menghasilkan APK).
  - `cap:build:aab` → guard signing dulu, baru build+sync+`bundleRelease`.
  - `typecheck` baru: `tsc --noEmit`.
- `scripts/check-android-signing.mjs` (baru) — guard fail-fast: lolos bila
  `KAOSKAMI_STORE_PASSWORD` + `KAOSKAMI_KEY_PASSWORD` ada di env/CI **atau**
  `android/key.properties` ada. Tidak membaca/mencetak password.

**[OWNER] N1:**
1. Tiap rilis Play: `ANDROID_VERSION_CODE=<angka-naik> gradlew bundleRelease`
   (angka wajib naik monoton; aman < 2100000000). Lokal tanpa env = default tanggal.
2. Uji perilaku Android 16 (targetSdk 36): notifikasi runtime, edge-to-edge,
   photo picker — sebelum upload AAB.

## N2 — iOS: versi + entitlements + push delegate + MP4 (kode: SELESAI)

Yang diubah (semua tanpa Apple account):

- `ios/App/App.xcodeproj/project.pbxproj` — `MARKETING_VERSION` 1.0 → **1.0.0**,
  `CURRENT_PROJECT_VERSION` 1 → **20260913** (paritas Android), +
  `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` (Debug & Release).
- `ios/App/App/App.entitlements` (baru) — `aps-environment: development` +
  `associated-domains: applinks:kaoskami.biz.id`.
- `ios/App/App/AppDelegate.swift` — push delegate resmi Capacitor
  (`didRegister…` / `didFailToRegister…` → `NotificationCenter`), tanpa itu
  plugin push iOS tidak menerima token.
- `src/lib/3d/exportStudio.ts` — rekaman turntable **per-platform**: iOS → **MP4**
  (H.264), Android/web → WebM VP9. Sebelumnya WebM hardcode = file tak bisa
  diputar/dibagikan dari iPhone.

**[OWNER] N2 (butuh Apple Developer, JANGAN dieksekusi di sini):**

```bash
# 1. Di Xcode (Mac) — buka dan set signing team:
open kaos-kami-mobile/ios/App/App.xcodeproj
# Target App → Signing & Capabilities → Team: <Team owner> (Automatic).
# Tambahkan kapabilitas: Push Notifications + Associated Domains
# (applinks:kaoskami.biz.id).

# 2. Ganti aps-environment menjadi production untuk archive App Store
#    (atau biarkan Xcode yang mengatur saat signing otomatis).

# 3. Isi TEAMID nyata di apple-app-site-association (lihat §N5),
#    lalu archive + upload:
xcodebuild -scheme App -configuration Release archive -archivePath build/KaosKami.xcarchive
xcodebuild -exportArchive -archivePath build/KaosKami.xcarchive -exportPath build/ipa -exportOptionsPlist ExportOptions.plist
# Upload via Xcode Organizer / Transporter. Butuh: Apple Developer Program
# aktif (99 USD/thn), bundle id.makassar.kaoskami, APNs Auth Key (.p8)
# untuk push server → simpan sebagai secret server (JANGAN commit).
```

## N3 — Push lengkap (kode: SELESAI)

Yang diubah:

- `src/lib/bridge/push.ts` — rewrite: 4 listener
  (`registration`, **`registrationError`**, **`pushNotificationReceived`**,
  `pushNotificationActionPerformed`), `removeAllListeners()` anti-ganda, token
  disimpan (`kaoskami_last_push_token`) + `refreshPushTokenBinding(userId?)` /
  alias `reRegisterPushTokenAfterLogin()`.
- `src/app/page.tsx` — registrasi awal memakai handler lengkap; notifikasi
  foreground → toast `judul: isi` (tanpa navigasi); tap → tab Pesanan.
- `src/components/commerce/CheckoutSheet.tsx` — **re-register token** di 2 titik:
  (a) checkout sukses dengan `userId` baru, (b) sheet dibuka saat user sudah
  login (mis. login Google sesi sebelumnya). Keduanya fire-and-forget.
- `android/…/MainActivity.java` — **Notification Channel `kaoskami_orders`**
  (API 26+, `IMPORTANCE_HIGH`, guard versi + try/catch agar start tak crash).

Catatan server: bila FCM dikirim dengan `android_channel_id` eksplisit, pakai
`kaoskami_orders`. iOS memakai APNs via plugin (butuh §N2 owner).

Uji manual (tanpa build di sini): izinkan notifikasi → token terkirim ke
`/api/mobile/notifications/register` → kirim uji FCM → foreground toast muncul,
tap membuka tab Pesanan → login/OTP → binding terkirim ulang dengan userId.

## N4 — Backup rules (kode + dokumen: SELESAI)

`android/app/src/main/res/xml/backup_rules.xml` + komentar alasan di file:

- Ditambah: `<exclude domain="sharedpref" path="CapacitorStorage.xml" />`.
  `@capacitor/preferences` menyimpan **semua** kunci (`kaoskami_user_id`,
  `active_order`, antrean sync, `decal_px`) di SharedPreferences grup default
  **`CapacitorStorage`** — restore backup lama ke perangkat baru akan
  menghidupkan user_id + order + antrean basi (risiko replay/order ganda).
- `allowBackup` **tetap `true`** (bukan `false`): galeri draft & preferensi
  tetap ikut backup; hanya file sensitif/basi yang di-exclude. `false` akan
  menghapus seluruh persistensi user tiap reinstall — ditolak.

## N5 — Universal/App Links + janitor + google-services (kode: SELESAI, hosting: OWNER)

Yang diubah:

- `android/…/AndroidManifest.xml` — intent-filter App Links
  `https://kaoskami.biz.id` dengan `android:autoVerify="true"`.
- `ios/App/App/App.entitlements` — `applinks:kaoskami.biz.id` (sama file dengan §N2).
- `applinks/assetlinks.json` + `applinks/apple-app-site-association` (sumber di
  repo mobile) + cermin hosting di `kaos-kami-web/public/.well-known/`
  (efektif pada deploy web berikutnya — **tanpa deploy di sesi ini**).
- `kaos-kami-web/public/_headers` — `Content-Type: application/json` untuk kedua
  file + larangan redirect di `/.well-known/*`.
- `src/lib/3d/exportStudio.ts` — `pruneStaleHdCache()` (baru, diekspor):
  hapus `kaoskami-hd-<epochMs>.png` berumur **>7 hari** di `Directory.Cache`;
  dipanggil fire-and-forget tiap `persistAndShare()`; nama tak terpola dilewati.

**[OWNER] N5:**

```bash
# 1. Ganti placeholder LALU deploy web (satu-satunya cara file tayang):
#    - assetlinks.json: "REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE" →
#      SHA-256 sertifikat Play (Play Console → Setup → App signing →
#      SHA-256 certificate fingerprint). Bila multi-key (upload+signing),
#      cantumkan SEMUA fingerprint.
#    - apple-app-site-association: "TEAMID" → Apple Team ID (10 karakter).
# 2. Verifikasi tayang (wajib 200 TANPA redirect, content-type json):
curl -sI https://kaoskami.biz.id/.well-known/assetlinks.json
curl -s https://kaoskami.biz.id/.well-known/apple-app-site-association
# 3. Android: adb shell pm get-app-links id.makassar.kaoskami  → verified.
#    iOS: install via TestFlight → buka https link → langsung ke aplikasi.
```

### Restriksi kunci `google-services.json` (TERDAFTAR di git — baca ini)

`android/app/google-services.json` mengandung `api_key` Firebase. Kunci ini
**bukan secret** (identifier publik, wajib ada di APK), TAPI wajib dibatasi agar
tak disalahgunakan dari aplikasi lain bila bocor ke publik:

**[OWNER] di Google Cloud Console** (project `studio-5437363240-5a213`):

1. APIs & Services → Credentials → kunci `AIza...GT1iQ` → Application restrictions:
   **Android apps** → tambah `id.makassar.kaoskami` + SHA-1/SHA-256 keystore
   produksi (dan SHA debug untuk dev).
2. API restrictions: **batasi hanya API yang dipakai** (FCM, dsb.) — jangan `None`.
3. Bila kunci pernah disalahgunakan: rotasi di Firebase Console → unduh
   `google-services.json` baru → ganti file → commit (file ini memang tracked).

## L2 — RUNBOOK rotasi keystore (DOKUMEN SAJA — tidak dieksekusi)

Fakta (terverifikasi git): `kaoskami-release.keystore` **pernah ter-commit**
(`cedf9f3`, 3 Sep 2026, 2796 bytes), dihapus dari tree di `deb461d`
(7 Sep 2026) + `.gitignore` kini menolak `*.keystore / *.jks / key.properties /
keystore-passwords.local.txt`. `key.properties` & `*-passwords*` **tidak pernah**
ter-commit (aman). Namun **blob keystore tetap ada di histori git** → anggap
keystore beta BOCOR dan JANGAN PERNAH dipakai untuk Play Store.

**[OWNER] langkah rotasi (berurutan):**

```bash
# 1. Generate keystore PRODUKSI baru (di mesin aman, BUKAN di CI):
keytool -genkeypair -v -keystore kaos-kami-play.keystore -alias kaoskami \
  -keyalg RSA -keysize 2048 -validity 10000
# Simpan file + password di password manager (OFFLINE). Jangan commit.

# 2. Pakai lokal tanpa commit (file gitignored):
cp kaos-kami-mobile/android/key.properties.example kaos-kami-mobile/android/key.properties
# lalu isi storePassword/keyPassword. SEMENTARA masih keystore beta untuk
# sideload; ganti path/alias ke keystore produksi saat siap Play.

# 3. Daftarkan ke CI (GitHub → Settings → Secrets and variables → Actions):
#    KAOSKAMI_STORE_PASSWORD, KAOSKAMI_KEY_PASSWORD,
#    KAOSKAMI_KEY_ALIAS=kaoskami (+ opsional ANDROID_VERSION_CODE).
#    (Opsional, bila keystore disimpan sebagai secret base64:)
#    KAOSKAMI_KEYSTORE_BASE64=<base64 kaos-kami-play.keystore>
#    Workflow bertugas men-decode ke android/app/ saat build — JANGAN
#    commit decode script berisi secret.

# 4. Bersihkan histori (keystore beta bocor) — KOORDINASI DULU (rewrite history):
git clone --mirror <url-repo> repo-mirror.git
cd repo-mirror.git
git filter-repo --invert-paths \
  --path kaos-kami-mobile/android/app/kaoskami-release.keystore \
  --path kaos-kami-mobile/android/key.properties \
  --path kaos-kami-mobile/android/keystore-passwords.local.txt
# Alternatif tanpa filter-repo: BFG Repo-Cleaner:
#   bfg --delete-files kaoskami-release.keystore
git push --force --all && git push --force --tags
# Lalu: semua anggota tim re-clone; cache CI dihapus; keystore beta
# DIANGGAP BOCOR — revoke/ganti kredensial terkait bila pernah dipakai.

# 5. Play Console (pertama kali): buat aplikasi → pakai keystore PRODUKSI
#    sebagai upload key → catat SHA-256 → isi ke assetlinks.json (§N5).
#    JANGAN upload AAB yang ditandatangani keystore beta ke Play.
```

## Perintah yang SENGAJA tidak dijalankan (butuh owner)

```bash
# Android rilis (butuh kredensial signing + keystore produksi):
npm --workspace=kaos-kami-mobile run cap:build:apk
npm --workspace=kaos-kami-mobile run cap:build:aab
ANDROID_VERSION_CODE=20260921 gradlew bundleRelease   # dari android/
keytool -genkeypair ...                                # generate keystore

# iOS (butuh Mac + Apple Developer):
open kaos-kami-mobile/ios/App/App.xcodeproj           # set Team + kapabilitas
xcodebuild -scheme App -configuration Release archive # + export + upload

# Git sensitif (butuh keputusan owner):
git push / git filter-repo / bfg                      # histori + distribusi
```

## Verifikasi sesi ini

- `mobile:typecheck` (`tsc --noEmit -p kaos-kami-mobile/tsconfig.json`):
  lihat laporan sesi. Perubahan TS sesi ini: `push.ts` (rewrite),
  `page.tsx` (opts push), `CheckoutSheet.tsx` (re-register), `exportStudio.ts`
  (janitor + recording target).
- TIDAK dijalankan: `next build`, `cap sync`, `gradlew *`, `xcodebuild`,
  `git push`, deploy Cloudflare, generate keystore — sesuai misi.
