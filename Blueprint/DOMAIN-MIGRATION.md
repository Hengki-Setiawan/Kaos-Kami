# TUTORIAL — Pindah Domain `kaoskami.biz.id` dari Vercel ke Cloudflare Workers

Status: panduan resmi. Domain tetap terdaftar di DomaiNesia (tidak pindah
registrar, perpanjangan tetap di sana). Yang pindah hanya pengarah (DNS).

---

## 1. Konsep (baca 1 menit)

- Pengunjung pergi ke mana = ditentukan **DNS (nameserver)**, bukan Vercel.
- Vercel tidak "melepas sendiri" — catatannya tetap ada sampai di-Remove manual,
  tapi jadi tak berpengaruh begitu DNS pindah.
- Workers Custom Domain butuh domain terdaftar di Cloudflare (paket Free cukup,
  `.biz.id` didukung). SSL otomatis gratis.

## 2. Tahap 1 — Daftarkan domain ke Cloudflare (dashboard, ±5 menit)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add domain** → `kaoskami.biz.id` → **Free**.
2. Catat 2 nameserver dari Cloudflare (contoh `xxx.ns.cloudflare.com`).
3. DomaiNesia → My Domains → klik `kaoskami.biz.id` → **Manage Nameservers** →
   pilih Custom → tempel 2 nameserver → simpan.
4. Tunggu sampai dashboard Cloudflare bertuliskan **Active** (umumnya 5–30 menit,
   maks 24 jam). Cek: `nslookup kaoskami.biz.id` harus jawab nameserver Cloudflare.

## 3. Tahap 2 — Sambungkan Worker (±3 menit)

1. Cloudflare → **Workers & Pages** → `kaos-kami-3d` → **Settings → Domains & Routes**
   → **Add Custom Domain** → tambahkan **dua-duanya**:
   - `kaoskami.biz.id`
   - `www.kaoskami.biz.id`
2. Verifikasi: buka `https://kaoskami.biz.id/api/health` → harus
   `{"status":"ok", ...}`. Ulangi untuk `www`.

## 4. Tahap 3 — Ganti semua yang mengikat domain lama (Wajib!)

AI agent mengerjakan bagian ini (env + redeploy + probe). Checklist:

| # | Layanan | Yang diganti | Kalau lupa |
|---|---|---|---|
| 1 | Worker env | `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` → `https://kaoskami.biz.id` | Link invoice/WA + sitemap salah |
| 2 | Google Cloud Console | Authorized origin + redirect `.../api/auth/callback/google` | Login Google gagal |
| 3 | Cloudflare Turnstile | Tambah hostname `kaoskami.biz.id` (+ `www`) | Captcha gagal → checkout 403 |
| 4 | Dashboard Duitku | Callback URL → `https://kaoskami.biz.id/api/webhooks/duitku` | Settlement tak masuk! |
| 5 | Probe | `/api/health`, `/api/shipping/quote?city=Gowa`, 1 halaman, 1 checkout sandbox | — |

Perintah deploy yang benar: `npm run deploy` dari `kaos-kami-web/`
(jangan `wrangler deploy` langsung — bundle basi, lihat RUNBOOK §8).

## 5. Tahap 4 — Bersihkan Vercel (PALING AKHIR)

1. Setelah domain baru terbukti jalan (Tahap 3 hijau), buka Vercel →
   project `kaos-kami-etalase` → Settings → Domains → **Remove**
   `www.kaoskami.biz.id`.
2. Opsional: hapus project etalase bila situs lama tak dibutuhkan
   (URL `*.vercel.app` ikut mati).

## 6. Rollback darurat

- DNS belum propagasi / error: kembalikan nameserver DomaiNesia ke semula
  (catat nilai aslinya SEBELUM mengganti!) → trafik kembali ke Vercel.
- Worker error di domain baru: `*.workers.dev` tetap hidup sebagai fallback
  selama DNS belum disebarluaskan penuh.

## 7. Setelah live di domain sendiri

- `sitemap.ts` memakai `NEXT_PUBLIC_SITE_URL` otomatis (tanpa ubah kode).
- Daftarkan properti baru di Google Search Console + minta index ulang.
- SOCMED/bio: ganti link ke `https://kaoskami.biz.id`.
