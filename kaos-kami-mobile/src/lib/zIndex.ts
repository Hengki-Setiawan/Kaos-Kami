/**
 * Token z-index pusat — Kaos Kami Mobile (port dari web `src/lib/zIndex.ts`,
 * Blueprint Bab 23/27/39).
 *
 * Hierarki stacking mutlak (rendah → tinggi). JANGAN ubah urutan tanpa
 * persetujuan owner + uji fisik di Studio HP:
 *
 * - L0 CANVAS   = 10 → panduan/bidang dalam kanvas 3D (CanvasStageMobile,
 *   silhouette guide AR, print-zone guide).
 * - L1 BG       = 20 → section/content editorial (dicadangkan).
 * - L2 HUD      = 30 → overlay bantuan 3D, flash snapshot AR.
 * - L3 CHAT     = 35 → MobileKamitoChatWidget (pill + sheet). HARUS < DRAWER
 *   (50) agar drawer tak tertutup bubble chat (bug web Bab 23).
 * - L4 NAV/DRAWER = 50 → NativeHeader, TabBar, BottomSheet overlay,
 *   popover. Selevel agar sejajar, di atas chat & kanvas.
 * - L5 MODAL/CART = 60 → BottomSheet content (cart drawer, checkout,
 *   customizer, admin), MobileNotificationBell sheet, MobileSizeGuideModal,
 *   ARPreviewStage root. Di atas drawer/nav agar selalu terlihat.
 * - L6 AUTH/CONFIRM = 70 → BiometricLockModal (verifikasi admin = prioritas
 *   di atas modal biasa).
 * - L7 TOAST/QRIS = 80 → Toast + DirectQrisSheet (pembayaran = prioritas
 *   tertinggi). Tak boleh tertutup apa pun.
 *
 * Aturan pakai:
 * - Import konstanta Z_CLASS_* di komponen dan interpolasi ke className,
 *   JANGAN hardcode `z-40` / `z-50` lagi.
 * - Nilai class ditulis literal di file ini agar Tailwind JIT (v3) tetap
 *   men-generate CSS — pastikan glob `./src/lib/**` ada di
 *   `tailwind.config.ts` content.
 * - Hanya ubah STACKING. Dilarang ubah logika kamera/decals/checkout.
 */

// ── Nilai numerik (untuk style={{ zIndex }} bila dibutuhkan) ──
export const Z_CANVAS = 10;
export const Z_BG = 20;
export const Z_HUD = 30;
export const Z_CHAT = 35;
export const Z_NAV = 50;
export const Z_DRAWER = 50;
export const Z_CART = 60;
export const Z_MODAL = 60;
export const Z_AUTH = 70;
export const Z_CONFIRM = 70;
export const Z_POPOVER = 70;
export const Z_QRIS = 80;
export const Z_TOAST = 80;

// ── Class Tailwind (pakai ini di className) ──
// Literal penuh agar terdeteksi Tailwind content scanner.
export const Z_CLASS_CANVAS = "z-[10]";
export const Z_CLASS_BG = "z-20";
export const Z_CLASS_HUD = "z-30";
export const Z_CLASS_CHAT = "z-[35]";
export const Z_CLASS_NAV = "z-50";
export const Z_CLASS_DRAWER = "z-50";
export const Z_CLASS_CART = "z-[60]";
export const Z_CLASS_MODAL = "z-[60]";
export const Z_CLASS_AUTH = "z-[70]";
export const Z_CLASS_CONFIRM = "z-[70]";
export const Z_CLASS_POPOVER = "z-[70]";
export const Z_CLASS_QRIS = "z-[80]";
export const Z_CLASS_TOAST = "z-[80]";

/** Peta ringkas untuk inspeksi/debug (L0→L7). */
export const Z_HIERARCHY = {
  L0_canvas: Z_CANVAS,
  L1_bg: Z_BG,
  L2_hud: Z_HUD,
  L3_chat: Z_CHAT,
  L4_nav_drawer: Z_NAV,
  L5_modal_cart: Z_CART,
  L6_auth_confirm: Z_AUTH,
  L7_qris_toast: Z_QRIS,
} as const;
