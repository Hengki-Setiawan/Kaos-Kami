/**
 * adminCommandPalette — logika murni (bebas JSX/DOM) untuk AdminCommandBar.
 *
 * Dipisah ke file .ts agar bisa diuji vitest node-env (vitest.config.mts hanya
 * mentransform .ts; import .tsx ber-JSX gagal parse). Komponen .tsx hanya
 * mengimpor dari sini — TIDAK ada logika bisnis, hanya katalog navigasi.
 */

export type AdminPillar = "production" | "delivery" | "admin";

export interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  href: string;
  keywords: string;
  pillar: AdminPillar;
}

/** 5 menu utama — cermin LINKS di AdminNav.tsx (satu-satunya isi sidebar). */
export const ADMIN_MENU_ACTIONS: PaletteAction[] = [
  { id: "menu-admin", label: "Pesanan & Analitik", hint: "/admin", href: "/admin", keywords: "dashboard pesanan analitik ikhtisar omzet", pillar: "admin" },
  { id: "menu-production", label: "Workshop Sablon DTF", hint: "/admin/production", href: "/admin/production", keywords: "produksi workshop sablon dtf kanban heat press", pillar: "production" },
  { id: "menu-deliveries", label: "Hub Pengiriman & Kurir", hint: "/admin/deliveries", href: "/admin/deliveries", keywords: "kurir kirim antar resi ekspedisi makassar", pillar: "delivery" },
  { id: "menu-chat", label: "Live Chat CS (Kamito)", hint: "/admin/chat", href: "/admin/chat", keywords: "chat cs kamito pelanggan pesan", pillar: "admin" },
  { id: "menu-settings", label: "Pengaturan Toko & CMS", hint: "/admin/settings", href: "/admin/settings", keywords: "pengaturan setting toko cms konfigurasi", pillar: "admin" },
];

/** 8 sub-modul — cermin MODULE_CARDS di /admin/settings (akses via hub, bukan sidebar). */
export const ADMIN_SUBMODULE_ACTIONS: PaletteAction[] = [
  { id: "sub-orders", label: "Daftar Semua Pesanan", hint: "/admin/orders", href: "/admin/orders", keywords: "order pesanan daftar semua", pillar: "admin" },
  { id: "sub-gang-sheet", label: "Gang Sheet DTF 100x58", hint: "/admin/gang-sheet", href: "/admin/gang-sheet", keywords: "gang sheet dtf cetak film layout", pillar: "admin" },
  { id: "sub-catalog", label: "Katalog & Stok Bahan", hint: "/admin/catalog", href: "/admin/catalog", keywords: "katalog stok bahan kaos hoodie inventaris", pillar: "admin" },
  { id: "sub-coupons", label: "Kupon & Promo Diskon", hint: "/admin/coupons", href: "/admin/coupons", keywords: "kupon promo diskon voucher pemasaran", pillar: "admin" },
  { id: "sub-shipping", label: "Tarif & Zona Ongkir", hint: "/admin/shipping", href: "/admin/shipping", keywords: "tarif zona ongkir ekspedisi logistik agenwebsite", pillar: "admin" },
  { id: "sub-cms", label: "Konten Website (CMS)", hint: "/admin/cms", href: "/admin/cms", keywords: "cms konten banner lookbook tampilan", pillar: "admin" },
  { id: "sub-customers", label: "Database Pelanggan", hint: "/admin/customers", href: "/admin/customers", keywords: "pelanggan customer akun database", pillar: "admin" },
  { id: "sub-laporan", label: "Laporan Finansial & Defect QC", hint: "/admin/laporan", href: "/admin/laporan", keywords: "laporan finansial omzet defect qc analitik", pillar: "admin" },
];

/**
 * Pintasan antrean review desain. Navigasi ke daftar pesanan (badge status
 * DESIGN_REVIEW terlihat di tabel; filter ?status=DESIGN_REVIEW SENGAJA tidak
 * dipakai karena daftar server-side hanya mengenali 11 status STATUSES —
 * status tak dikenal diabaikan → tampil semua, menyesatkan bila diklaim
 * sebagai antrean tersaring).
 */
export const ADMIN_REVIEW_QUEUE_ACTION: PaletteAction = {
  id: "queue-review",
  label: "Antrean Review Desain",
  hint: "/admin/orders",
  href: "/admin/orders",
  keywords: "review desain antrean acc setuju tolak design_review",
  pillar: "admin",
};

export const ADMIN_ALL_ACTIONS: PaletteAction[] = [
  ...ADMIN_MENU_ACTIONS,
  ...ADMIN_SUBMODULE_ACTIONS,
  ADMIN_REVIEW_QUEUE_ACTION,
];

/** Filter aksi per peran — cermin guard RBAC di AdminNav (produksi/kurir dibatasi pilarnya). */
export function visiblePaletteActions(role?: string | null): PaletteAction[] {
  const safe = (role || "").toUpperCase();
  if (safe === "PRODUCTION_STAFF") return ADMIN_ALL_ACTIONS.filter((a) => a.pillar === "production");
  if (safe === "COURIER") return ADMIN_ALL_ACTIONS.filter((a) => a.pillar === "delivery");
  return ADMIN_ALL_ACTIONS;
}

/** Pencocokan substring case-insensitive atas label + hint + keywords. Query kosong = semua. */
export function filterPaletteActions(actions: PaletteAction[], query: string): PaletteAction[] {
  const q = query.trim().toLowerCase();
  if (!q) return actions;
  return actions.filter((a) =>
    `${a.label} ${a.hint} ${a.keywords}`.toLowerCase().includes(q)
  );
}

/** URL daftar server-side untuk pencarian teks (mendukung ?q= : no.order/nama/WA/resi). */
export function buildOrderSearchUrl(q: string): string {
  return `/admin/orders?q=${encodeURIComponent(q.trim().slice(0, 40))}`;
}

/** URL API JSON untuk saran order (kontrak asli: param `q` + `limit`). */
export function buildOrderApiUrl(q: string, limit = 6): string {
  const s = new URLSearchParams();
  s.set("q", q.trim().slice(0, 40));
  s.set("limit", String(Math.min(25, Math.max(1, limit))));
  return `/api/admin/orders?${s.toString()}`;
}

export interface OrderHit {
  id: string;
  orderNumber: string;
  status: string;
}

/** Parse defensif respons API {orders:[{id,orderNumber,status}]} — bentuk lain = null. */
export function parseOrderHits(json: unknown): OrderHit[] | null {
  if (!json || typeof json !== "object") return null;
  const orders = (json as Record<string, unknown>).orders;
  if (!Array.isArray(orders)) return null;
  const hits: OrderHit[] = [];
  for (const o of orders) {
    if (!o || typeof o !== "object") continue;
    const r = o as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.orderNumber !== "string") continue;
    hits.push({
      id: r.id,
      orderNumber: r.orderNumber,
      status: typeof r.status === "string" ? r.status : "?",
    });
  }
  return hits;
}
