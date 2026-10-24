# 11 — KEPUTUSAN OWNER (2026-10-23)

> Hasil jawaban owner atas `10-RENCANA-PERBAIKAN.md`. Ini menjadi SSOT keputusan; setiap butir berimbas langsung pada urutan kerja.

| # | Topik | Keputusan | Implementasi |
|---|---|---|---|
| 1 | Clamp fisik decal | **B — 35 cm adalah nilai resmi**; AGENTS.md §3, FAQ, ketentuan, & copy diperbarui ke 35 cm; kode & test tetap 35 (sudah konsisten); `masterNotify` tetap 35 | Ubah dokumen/klaim publik 30→35 (grep "30.0/30 cm" terkait) — **jangan balik ubah kode** |
| 2 | Harga dasar combed 24s | **A — Rp 59.000** (APPAREL_CATALOG adalah SSOT) | `JsonLd.tsx` pakai harga dari satu sumber katalog; hapus konst 79.000 untuk nama sama |
| 3 | Nomor WhatsApp CS resmi | **A — `62882020685076`** via `NEXT_PUBLIC_SHOP_CONTACT_WHATSAPP` | Ganti hardcode `6281244002026` di `privacy/page.tsx:70`, `OrderDetailModal.tsx:444`, `kaos-kami-mobile/shop.ts:4`; semua pakai `shopWaLink()`/shop SSOT |
| 4 | Refund & stok | Setuju dengan rencana (📝 tanpa beban) | Auto-restore stok saat REFUNDED via `client.batch()` di P0.5 |
| 5 | `pin-bypass` | **A — HAPUS permanen** route + seluruh pemanggil UI | `api/auth/pin-bypass` dihapus; `SecretPinModal`, entry di `AdminNav`, `AdminMobileNav` dibersihkan |
| 6 | Webhook iPaymu | **A — signature wajib (fail-closed) + amount match wajib + tolak amount≤0**; tanpa token per-order (sementara) | `api/webhooks/ipaymu/route.ts` ditulis ulang sesuai docs resmi (X-Signature HMAC kunci = VA; normalisasi tipe; sort A-Z; idempotensi) |
| 7 | QR renderer | **A — generate lokal (client)**; tidak lagi via `api.qrserver.com` | Hapus fabricate-lokal + qrserver; charge gagal → 502 + ref `pending-*`; modal QRIS render local dari `qrString` |
| 8 | Migrasi DB | **A — regenerate baseline** dari schema.prisma; db push jadi mekanisme tunggal; folder lama dibersihkan | Snapshot DDL UTF-8 dari DBنتاج (read-only introspection) + hapus drift; RUNBOOK §5 diperbarui |
| 9 | ± 24 file Blueprint hilang | **B — cabut referensi + tandai CI e2e DRAFT disabled**; restore/reconstruct nanti | AGENTS.md blueprint-block dirombak jujur (daftar yang benar-benar ada); `.github/workflows/e2e-*` job `if: false` + komentar |
| 10 | Lisensi pants/shorts | **TIDAK ada bukti lisensi** — kerjakan yang diperlukan; buat ulang lebih baik | `ASSET_CREDITS.md` pants/shorts ditandai `UNVERIFIED_LICENSE` — **sebelum lisensi beres: jangan tawarkan pants/shorts atas nama kontrak komersial**; P1: sumber ulang asset berlisensi liberal (Kenney/Quaternius/CC0) atau beli lisensi; checklist baru dibuat |
| 11 | Upgrade `next` + npm audit fix (7 CVE) | **A — ya, bertahap** | P1: `npm audit fix` bertahap → tsc + vitest + `preview` opennext lokal + manual test sebelum deploy (uty deploy gate) |
| 12 | Sejarah git ±50MB mascot | **A — `git filter-repo`** diperbolehkan | Dilakukan sekali setelah semua clone dibekukan besoknya Tim Hengki; `git rm -r` mascot dulu; filter-repo eksekusi saat owner konfirmasi "sekarang" (destruktif) |
| 13 | `shipping-sync` cron | **A — jadwalkan mingguan cron-job.org + dok RUNBOOK** | RUNBOOK §10a; marker `cron-state/shipping-sync.json` |
| 14 | iPaymu domain/IP produksi | Owner: "harusnya sudah — coba cek" | Saya cek endpoint publik webhook (GET) dari luar buat konfirmasi rute hidup; validasi dashboard iPaymu (IP/domain) tetap manual oleh owner di dashboard |
| 15 | Dark mode publik | **A — `darkMode: ["selector", "[data-theme=obsidian]"]`** | `tailwind.config.ts` diubah; kelas `dark:` mengikuti tema pilihan user |
| 16 | `CheckoutModalLegacy` | **A — hapus legacy + flag `USE_CHECKOUT_V2`** | Hapus file + referensi `CartDrawer` |
| 17 | Hierarki z-index | **A — ikut kode z-50 yang sekarang** | Update test `zIndexHierarchy.test.ts` + tabel di `DESIGN.md` (resti MISMATCH) |
| 18 | Akses halaman staff | **A — ketatkan** | Redirect per-role: staff hanya `/admin/production`, `/admin/deliveries` (+job-tiem terkait task miliknya); guard halaman server |
| 19 | WA transaksional | **A — tetap OTP-only** + tombol wa.me manual | Tidak berubah; dead-code template `buildOrderConfirmedMessage` dibers‹iha nanti |
| 20 | AgenWebsite Rate API | **A — kebarkan total** | **HAPUS** `lib/shipping/agenwebsite.ts` + semua pemanggil (checkout web, checkout mobile, quote, locations, admin/shipping/usage) — ongkir = master 514 kota → `zones.ts` → flat 25k; env `AGENWEBSITE_*` dibersihkan |

## Tambahan mutlak
- Semua tempat lain mengikuti P0/P1/P2 di `10-RENCANA-PERBAIKAN.md`.
- **Pilar anti-premature:** setiap selesai berubah status → `🟡 KODE DIUBAH — MENUNGGU VERIFIKASI FISIK OWNER`; owner mencentang setelah uji layar.
