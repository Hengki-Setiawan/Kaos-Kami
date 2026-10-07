# DESIGN.MD — KAOS KAMI DESIGN SYSTEM & STARTUP CRAFT TOKENS
# Silicon Valley Tier-1 Design Engineering (Linear × Apple WWDC × Vercel)
# Single Source of Truth (SSOT) for UI Components & Aesthetics

---

## 🎨 1. SEMANTIC COLOR TOKENS (DARK MODE STREETWEAR & TECH LUXURY)
> SSOT nilai = `kaos-kami-web/src/app/globals.css` tema default `obsidian` (`:root`, baris 45-57). Tema tambahan `gallery` (light) & `concrete` (dark alt) hanya override di file yang sama — jangan hardcode hex di luar token.

| Token Name | CSS Variable / Tailwind | Hex Value | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-canvas` (`--color-canvas`) | `#121214` | Deepest surface, viewport background, pure OLED-friendly neutral |
| **Surface Base** | `bg-surface` (`--color-surface`) | `rgba(26,26,30,0.75)` | Cards, drawers, modals, toolbars, dialogs (glass) |
| **Surface Elevated** | `bg-surface-elevated` (`--color-surface-elevated`) | `rgba(38,38,44,0.9)` | Elevated panels, popovers, dropdowns |
| **Border Subtle** | `border-border-subtle` (`--color-border-subtle`) | `rgba(255,255,255,0.08)` | 1px refined hairline borders (anti-blocky) |
| **Border Strong** | `border-border-strong` (`--color-border-strong`) | `rgba(255,255,255,0.2)` | Elevated panel borders, focus containers |
| **Primary Brand Accent** | `text-brand-accent` / `bg-brand-accent` (`--color-brand-accent`) | `#FF7A1A` | High-voltage Tangerine for Primary CTAs ("Beli", "Pesan", "Checkout") — A11Y X-001 4.65:1 di kanvas gelap |
| **Text Primary** | `text-text-primary` (`--color-text-primary`) | `#F5F5F7` | 98% white high-contrast text for headings and values |
| **Text Secondary / Muted** | `text-text-muted` (`--color-text-muted`) | `#8E8E93` | 65% zinc for labels, helper text, and inactive icons |
| **Semantic Success** | `text-success` (`--color-success`) | `#25D366` | Paid, verified, high-res DPI status |
| **Semantic Destructive** | `text-rose-400` / `bg-rose-500/10` | `#F43F5E` | Delete, cancel, remove, refund actions |

> **Catatan sidebar admin (Okt 2026):** navigasi admin = **5 menu** (`AdminNav.tsx`): Pesanan & Analitik, Workshop Sablon DTF, Hub Pengiriman & Kurir, Live Chat CS (Kamito), Pengaturan Toko & CMS. 8 sub-modul operasional diakses via kartu link di `/admin/settings`.

---

## ✍️ 2. TYPOGRAPHY HIERARCHY (ANTI-AI-SLOP RULES)

*   **Primary Functional UI (`font-sans`):** `Plus Jakarta Sans`
    - Digunakan untuk 95% elemen antarmuka: Tombol, menu, tabel admin, formulir, badge status, modal, tab drawer, dan teks paragraf.
    - Karakteristik: Bersih, geometris, keterbacaan tinggi pada layar retina ponsel dan monitor desktop.
*   **Hero & Display Only (`font-display`):** `Syne`
    - DILARANG digunakan pada tombol kecil, isi tabel, input, atau dialog konfirmasi.
    - HANYA diizinkan untuk H1 Landing Page Hero dan judul besar katalog ready-stock.
*   **Data & Technical Readouts (`font-mono`):** `JetBrains Mono` / `ui-monospace`
    - Digunakan untuk: Kode resi, SKU, koordinat cm sablon, timestamp log, dan nominal rupiah.

---

## 🔘 3. FOUR-TIER BUTTON SYSTEM (CVA SPECIFICATION)

```
[Tier 1: Primary]      bg-[#FF7A1A] text-[#0A0A0C] font-bold active:scale-[0.97]
                        -> Aksi konversi utama: "PESAN SEKARANG", "BAYAR", "CHECKOUT"
                        (diselaraskan ke token `--color-brand-accent` §1 + `globals.css:53` + Amandemen A3;
                        nilai lama `bg-[#F97316]` pra-A11Y DICABUT 05 Okt 2026)

[Tier 2: Secondary]    bg-[#141418] border border-[#27272A] text-zinc-100 hover:bg-[#1E1E24]
                       -> Aksi operasional: "Pilih Ukuran", "Tambah Sablon", "Filter"

[Tier 3: Ghost / Icon] bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40
                       -> Aksi navigasi & toolbar: "Back", "Tutup", "Zoom", "Gizmo"

[Tier 4: Destructive]  bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20
                       -> Aksi bahaya: "Hapus Sablon", "Batalkan Pesanan", "Logout"
```

*Prinsip Interaksi:*
- Feedback instan pada `:active` (`scale(0.97)` dalam durasi 100ms).
- Saat loading, tombol mempertahankan dimensi lebarnya persis (*zero-layout-jitter*), menampilkan spinner 14px tanpa mengubah tinggi tombol.

---

## ⚡ 4. APPLE × LINEAR MOTION SPECIFICATIONS

1. **Easing:**
   - Masuk (Entrance): `cubic-bezier(0.16, 1, 0.3, 1)` (snappy fluid settle).
   - Keluar (Exit): `cubic-bezier(0.4, 0, 1, 1)` (cepat menghilang, 150ms).
   - HARAM menggunakan `ease-in` untuk animasi masuk.
2. **Spring Physics (Framer Motion / Motion):**
   - Draggable FAB & Widget: `damping: 28, stiffness: 220, mass: 0.8` (glide halus, zero jitter).
   - Modal Entrance: `damping: 24, stiffness: 300, mass: 0.6` (Apple sheet snap).
3. **GPU Isolation:**
   - Animasi HANYA boleh memanipulasi `transform` (`translate3d`, `scale`) dan `opacity`.
   - Dilarang menganimasikan `width`, `height`, `top`, `left`, `margin`.

---

## 📱 5. ERGONOMI MOBILE & CAPACITOR TOUCH DOCTRINE

- **Touch Target:** Minimal `48px × 48px` untuk semua elemen yang dapat diklik. (Keputusan 05 Okt 2026 mengikuti **Amandemen A3** Bab 56 — `FAB 48px` DISAHKAN sebagai pengganti angka spec lama `44px`; `44px` pra-amandemen DICABUT.)
- **Viewport Aware:** Gunakan `100dvh` (Dynamic Viewport Height) agar tidak tertabrak address bar Chrome/Safari.
- **Notch Insets:** Hormati `env(safe-area-inset-top)` dan `env(safe-area-inset-bottom)`.
- **Hover Gating:** Seluruh efek hover dibatasi dengan `@media (hover: hover) and (pointer: fine)`.
- **Three.js Performance:** Mode `frameloop="demand"` pada mobile untuk menghemat 100% baterai saat pakaian tidak diputar.

---

## 🗂️ 6. HIERARKI Z-INDEX GLOBAL 8 TINGKAT (L0–L7)
> SSOT nilai = `kaos-kami-web/src/lib/zIndex.ts` (`Z_HIERARCHY`, dikunci test `zIndexHierarchy.test.ts`). Import konstanta `Z_CLASS_*` di komponen — JANGAN hardcode `z-40` / `z-[110]` lagi. Nilai class ditulis literal agar Tailwind JIT (v3) tetap men-generate CSS.

| Level | Token | Nilai | Class Tailwind | Penghuni |
| :--- | :--- | :--- | :--- | :--- |
| **L0** | CANVAS | `10` | `z-[10]` | WebGL canvas 3D (CanvasStage, R3F) — paling bawah |
| **L1** | BG | `20` | `z-20` | Section/content/overlay editorial (HeroOverlay, Footer, StoreShowcaseSection) |
| **L2** | HUD | `30` | `z-30` | StudioHUD / helper overlay 3D, pill dev |
| **L3** | CHAT | `35` | `z-[35]` | KamitoChatWidget — HARUS < DRAWER agar drawer customizer tak tertutup bubble chat |
| **L4** | NAV / DRAWER | `50` | `z-50` | Navbar (fixed top) + CustomizerDrawer (panel + recovery pill) |
| **L5** | MODAL / CART | `60` | `z-[60]` | CartDrawer, CheckoutModal, modal generik |
| **L6** | AUTH / CONFIRM / POPOVER | `70` | `z-[70]` (`Z_CLASS_POPOVER` tertulis `z-50` di file — MISMATCH, perlu putusan owner) | AuthModal, ConfirmDialog, dropdown, popover, UserNotificationBell |
| **L7** | QRIS / TOAST | `80` | `z-[80]` | DirectQrisModal (pembayaran = prioritas tertinggi), toast/notifikasi |

> Catatan koreksi: Blueprint Bab 23 (§23) menulis Level 40 untuk chat — itu angka spec pra-implementasi; nilai aktual pasca-perbaikan tabrakan Bab 23 adalah **35** (chat) vs **50** (drawer). Kode + test adalah kebenaran.
