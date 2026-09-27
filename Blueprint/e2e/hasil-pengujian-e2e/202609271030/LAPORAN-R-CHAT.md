=== RUNNER E2E LIVE CHAT KAMITO & NOTIFIKASI (STAMP: 202609271030) ===
Target Server: http://127.0.0.1:3000

Berhasil memuat signed cookie untuk hengkishadow@gmail.com (Admin) & hengkivibecoding@gmail.com (User)
[PASS] CHAT-01 — Presence endpoint publik merespons HTTP 200 dengan info maskot (Kamito)
[PASS] CHAT-06 — Jam operasional workshop Makassar tampil valid: "Setiap Hari 09.00–21.00 WITA"
[PASS] CHAT-04 — Heartbeat admin online terkirim sukses (isAdminOnline=true)
[PASS] CHAT-09 — Pelanggan berhasil mengirim pesan pertanyaan (ID: chat_1790505062849_180026)
[PASS] CHAT-07 — Bot Kamito merespons/menangani pesan perdana pelanggan secara otomatis
[PASS] CHAT-10 — Skrip XSS berhasil disanitasi menjadi entitas HTML aman: "&lt;script&gt;alert("hacked")&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;"
[PASS] CHAT-11 — Pesan melebihi batas 2000 karakter ditolak dengan HTTP 400
[PASS] CHAT-14 — Konsol thread chat diproteksi role Admin: Guest ditolak (401), Admin sukses memuat 1 thread
[FAIL] CHAT-16 — Admin berhasil mengirim pesan balasan ke thread pelanggan
[FAIL] CHAT-17 — Template respon operator DTF terkirim dengan kredensial Kamito / Admin
[FAIL] CHAT-18 — Pusat notifikasi pengguna menyatukan pembaruan pesanan dan pesan chat admin
[FAIL] CHAT-19 — Lonceng notifikasi admin menampilkan counter chat unread: undefined

Membersihkan rekaman chat pengujian dari Turso DB...
Pembersihan database selesai.

=======================================================
HASIL EVALUASI E2E LIVE CHAT & NOTIFIKASI: 8/12 LULUS (67%)
Laporan lengkap tersimpan di: Blueprint\e2e\hasil-pengujian-e2e\202609271030\LAPORAN-R-CHAT.md
=======================================================
