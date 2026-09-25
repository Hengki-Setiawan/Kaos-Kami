/**
 * CHECKOUT PARITY MOBILE ↔ WEB — helper murni + konstanta kontrak.
 *
 * Konteks web (DIBACA, tak diubah):
 * - `kaos-kami-web/src/lib/cartPriceRefresh.ts` → `fetchServerPriceMap`
 *   (GET /api/catalog/variants → { variantId: { priceIdr, stockQty } },
 *   tak pernah throw, `{}` bila gagal; server tetap otoritatif).
 * - `kaos-kami-web/src/components/ui/CheckoutModal.tsx` → pola re-quote
 *   sebelum submit (syncPrices + notice selisih + blokir submit bila harga
 *   berubah), field `email`, `courierNotes`, ekspansi size-breakdown
 *   (`sizeDistribution` → N items per ukuran), `turnstileToken`.
 * - `kaos-kami-web/src/app/api/mobile/orders/checkout/route.ts` →
 *   `MobileCheckoutSchema` (Zod, sumber kebenaran kontrak mobile).
 * - `kaos-kami-web/src/lib/schemas/design.ts` → `DecalLayerSchema`
 *   (id≤64, x/y ±0.75, scale 0.02–1.5, rotation ±180, opacity 0–1,
 *   targetSide ∈ 5 sisi {front,back,left_sleeve,right_sleeve,hood},
 *   maks 10 decal/item, maks 20 item/checkout).
 *
 * ATURAN PAKAI:
 * - File ini MURNI (pure): tanpa state React, tanpa Capacitor, tanpa store.
 *   Satu-satunya I/O = `fetchMobileServerPriceMap` (fetch + timeout,
 *   tak pernah throw). Aman dipanggil dari CheckoutSheet, test, worker.
 * - JANGAN import file ini dari store (store = state, helper = logika).
 *   Arah dependensi: CheckoutSheet → checkoutParity (+ store bila perlu).
 * - `CheckoutSheet.tsx` milik misi lain — JANGAN edit langsung; ikuti
 *   INTEGRASI UNTUK PEMILIK CheckoutSheet di bawah file ini.
 */

import { MOBILE_DECAL_SIDE_LABELS } from '@/lib/3d/mobileScaleCalibration';

// ---------------------------------------------------------------------------
// §1 — FIELD YANG WAJIB DIKIRIM CheckoutSheet (kontrak vs kondisi kini)
// ---------------------------------------------------------------------------

/**
 * Field MUST-SEND: ada di skema server / dikirim web, tapi CheckoutSheet
 * mobile SAAT INI (audit Sep 2026) belum mengirim. Kunci = nama field payload
 * POST /api/mobile/orders/checkout.
 */
export const MUST_SEND_FIELDS = [
  'email',
  'courierNotes',
  'decals[]-N-per-item',
  'sizeBreakdown',
] as const;

export type MustSendField = (typeof MUST_SEND_FIELDS)[number];

/**
 * Kunci payload eksplisit per field wajib (nama = kunci POST
 * /api/mobile/orders/checkout; sizeBreakdown = ekspansi client-only, BUKAN
 * field server — lihat §5). Dipakai pemilik CheckoutSheet agar tak salah ketik.
 */
export const CHECKOUT_EMAIL_PAYLOAD_KEY = 'email' as const;
export const CHECKOUT_COURIER_NOTES_PAYLOAD_KEY = 'courierNotes' as const;
/** BUKAN kunci server — nama konsep ekspansi client → N items (maks 20). */
export const CHECKOUT_SIZE_BREAKDOWN_KEY = 'sizeBreakdown' as const;
/** Batas skema server (Zod): email RFC, courierNotes ≤500, items ≤20, qty ≤500. */
export const CHECKOUT_EMAIL_MAX_LEN = 254;
export const CHECKOUT_COURIER_NOTES_MAX_LEN = 500;
export const CHECKOUT_MAX_ITEMS = 20;
export const CHECKOUT_MAX_QTY_PER_ITEM = 500;

/** Field SHOULD-SEND: opsional server tapi memengaruhi harga/kebenaran. */
export const SHOULD_SEND_FIELDS = [
  'turnstileToken',
  'materialFinishSlug',
  'fabricThicknessSlug',
] as const;

export type ShouldSendField = (typeof SHOULD_SEND_FIELDS)[number];

/**
 * Dokumentasi per field: status mobile kini, pola web, aksi integrasi.
 * Baca ini sebelum menyentuh CheckoutSheet.
 */
export const CHECKOUT_FIELD_DOCS: Record<MustSendField | ShouldSendField, string> = {
  email:
    'Skema server: email opsional (z.email). Web CheckoutModal SELALU kirim ' +
    '(email || session.user.email). Mobile kini: TIDAK dikirim — invoice & notifikasi ' +
    'order tanpa alamat email. AKSI: tambah state email (prefill dari profil bila ada) ' +
    '+ input opsional di Step 1 + kirim `email: email || undefined`.',
  courierNotes:
    'Skema server: courierNotes opsional maks 500 char. Web kirim selalu ' +
    '(textarea "Catatan kurir"). Mobile kini: TIDAK ada input & tidak dikirim — ' +
    'catatan "tulis di pagar hijau / titip satpam" hilang. AKSI: tambah state ' +
    'courierNotes + textarea opsional di Step 2 + kirim `courierNotes: v || undefined`.',
  'decals[]-N-per-item':
    'Skema server: decals = array maks 10 (DecalLayerSchema, 5 sisi). ' +
    'Mobile kini: SELALU tepat 1 decal front/back per item (getDecalForItem baca ' +
    'field tunggal decalX/Y/Scale/Rotation/TargetSide + decalUrl) — desain lengan ' +
    'ke-2 dst & sisi rusuk/tudung HILANG saat checkout walau cart menyimpan N. ' +
    'AKSI: ganti builder items dengan buildMobileCheckoutItems() (§4) yang memetakan ' +
    'it.decals[] penuh (maks 10, clamp Zod, partisi sisi §4).',
  sizeBreakdown:
    'Web: satu desain bisa dipecah ke N ukuran (useCustomSizeBreakdown → ' +
    'sizeDistribution {S:2,M:3…} → N items). Mobile kini: 1 item = 1 size — ' +
    'order seragam (10 S + 20 M) butuh N kali add-to-cart. Skema server TIDAK ' +
    'punya field size-breakdown; parity = ekspansi client jadi N items ' +
    '(maks 20). AKSI: pakai expandSizeBreakdown() (§5) di belakang toggle ' +
    '"Bagi Ukuran (S–XXL)" di Step 3.',
  turnstileToken:
    'KONDISIONAL. Route mobile: OTP WA lolos → Turnstile DILEWATI (proof-of-human ' +
    'lebih kuat); OTP di-bypass darurat (CHECKOUT_OTP_REQUIRED=false) → Turnstile ' +
    'TETAP wajib fail-closed. Mobile kini: tidak pernah kirim → checkout MATI saat ' +
    'mode darurat. AKSI: pakai shouldAttachTurnstile() (§6); bila true, tampilkan ' +
    'widget Turnstile + kirim token (lihat pola web TurnstileWidget).',
  materialFinishSlug:
    'Skema server opsional maks 40 char; server turunkan kain + surcharge via ' +
    'materialFinishToPricing (fail-closed). Web kirim selalu. Mobile kini: tidak ' +
    'dikirim → harga server pakai default kain (selisih vs ekspektasi bila studio ' +
    'pakai finish khusus). AKSI: simpan finish di CartItem (follow-up store) lalu kirim.',
  fabricThicknessSlug:
    'Skema server opsional enum kain; sama seperti materialFinishSlug — ' +
    'memengaruhi unitPriceIdr server. AKSI: sama (simpan di CartItem lalu kirim).',
};

// ---------------------------------------------------------------------------
// §2 — RE-QUOTE HARGA SERVER + NOTICE SELISIH (pola web fetchServerPriceMap)
// ---------------------------------------------------------------------------

/** Kategori ramping GET /api/mobile/catalog (cermin mobileApiClient). */
export interface MobileCatalogCategory {
  id: string;
  slug: string;
  basePriceIdr: number;
  sizes: string[];
}

/** Peta slug → harga dasar segar (IDR). */
export type MobileServerPriceMap = Record<string, number>;

function apiBaseUrl(): string {
  try {
    const v = process.env.NEXT_PUBLIC_API_URL;
    if (typeof v === 'string' && v.trim()) return v.trim().replace(/\/+$/, '');
  } catch {
    // abaikan — pakai default
  }
  return 'https://kaoskami.biz.id';
}

/**
 * Ambil harga dasar segar per slug dari /api/mobile/catalog.
 * Cermin web fetchServerPriceMap (disederhanakan wajar): katalog mobile tak
 * punya endpoint /api/catalog/variants, jadi sumber = basePriceIdr kategori.
 * TAK PERNAH throw — gagal (offline/timeout/5xx) → `{}` agar checkout tak
 * diblokir (server tetap otoritatif saat POST).
 */
export async function fetchMobileServerPriceMap(timeoutMs = 10000): Promise<MobileServerPriceMap> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs));
  try {
    const res = await fetch(`${apiBaseUrl()}/api/mobile/catalog`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return {};
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      categories?: MobileCatalogCategory[];
    } | null;
    const list = Array.isArray(data?.categories) ? data!.categories! : [];
    const map: MobileServerPriceMap = {};
    for (const c of list) {
      if (!c || typeof c.slug !== 'string') continue;
      if (typeof c.basePriceIdr === 'number' && Number.isFinite(c.basePriceIdr) && c.basePriceIdr > 0) {
        map[c.slug] = Math.floor(c.basePriceIdr);
      }
    }
    return map;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/** Baris hitung untuk subtotal: kompatibel CartItem (basePrice+sablonPrice)×qty. */
export interface PricedLine {
  basePrice: number;
  sablonPrice: number;
  quantity: number;
}

/** Subtotal murni dari baris cart (tanpa ongkir/kupon/turnaround). */
export function computeCartSubtotal(lines: PricedLine[]): number {
  return lines.reduce((a, it) => {
    const unit =
      (typeof it.basePrice === 'number' && Number.isFinite(it.basePrice) ? it.basePrice : 0) +
      (typeof it.sablonPrice === 'number' && Number.isFinite(it.sablonPrice) ? it.sablonPrice : 0);
    const qty = typeof it.quantity === 'number' && Number.isFinite(it.quantity) ? it.quantity : 0;
    return a + unit * qty;
  }, 0);
}

export interface PriceChangeNotice {
  oldTotal: number;
  newTotal: number;
  /** newTotal − oldTotal (negatif = harga turun). */
  diff: number;
  /** Kalimat siap tampil (Bahasa Indonesia). */
  message: string;
}

/** Format IDR cermin web formatIdr (tanda −/+/Rp). */
export function formatIdr(n: number): string {
  const sign = n < 0 ? '−' : n > 0 ? '+' : '';
  return `${sign}Rp ${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
}

/**
 * Bangun notice selisih harga (pola web: tampilkan + minta klik BAYAR ulang).
 * Murni — null bila tak ada perubahan.
 */
export function buildPriceChangeNotice(oldTotal: number, newTotal: number): PriceChangeNotice | null {
  const diff = newTotal - oldTotal;
  if (diff === 0) return null;
  return {
    oldTotal,
    newTotal,
    diff,
    message:
      `Harga katalog diperbarui (selisih ${formatIdr(diff)}). ` +
      `Total kini Rp ${newTotal.toLocaleString('id-ID')}. Periksa lalu klik PESAN lagi.`,
  };
}

// ---------------------------------------------------------------------------
// §3 — VALIDASI VARIAN + STOK DARI /api/mobile/catalog
// ---------------------------------------------------------------------------

export interface CatalogValidationIssue {
  itemIndex: number;
  code: 'UNKNOWN_APPAREL' | 'INVALID_SIZE' | 'INVALID_QTY' | 'TOO_MANY_ITEMS' | 'STALE_PRICE';
  message: string;
}

export interface CatalogValidationResult {
  ok: boolean;
  issues: CatalogValidationIssue[];
  /** Peta slug → harga segar (untuk syncBasePrices). */
  priceMap: MobileServerPriceMap;
  /**
   * JUJUR: endpoint /api/mobile/catalog TIDAK mengembalikan stockQty
   * (hanya basePriceIdr + sizes[]) — stok per varian tak bisa dicek client.
   * Stok = otoritas server saat POST checkout (400 bila habis).
   * True = "tak diketahui", BUKAN "aman".
   */
  stockUnknown: true;
  /** Selisih subtotal vs harga segar (0 = segar). */
  priceDiff: number;
  notice: PriceChangeNotice | null;
}

/**
 * Validasi cart terhadap katalog segar (murni, bisa unit-test).
 * - apparel dikenal (ada di katalog) — cermin guard orderable route
 *   (orderable final tetap di server; client hanya menolak slug asing).
 * - size ∈ sizes[] kategori.
 * - quantity 1…500 (cermin MobileItemSchema).
 * - total item ≤ 20 (cermin items.max(20)).
 * - harga basi → priceDiff + notice (cermin pola web syncPrices).
 */
export function validateCartAgainstCatalog(
  items: Array<{ apparelType: string; size: string; quantity: number; basePrice: number; sablonPrice: number }>,
  categories: MobileCatalogCategory[]
): CatalogValidationResult {
  const issues: CatalogValidationIssue[] = [];
  const priceMap: MobileServerPriceMap = {};
  const bySlug = new Map<string, MobileCatalogCategory>();
  for (const c of categories) {
    if (c && typeof c.slug === 'string') {
      bySlug.set(c.slug, c);
      if (typeof c.basePriceIdr === 'number' && Number.isFinite(c.basePriceIdr) && c.basePriceIdr > 0) {
        priceMap[c.slug] = Math.floor(c.basePriceIdr);
      }
    }
  }
  items.forEach((it, i) => {
    const cat = bySlug.get(it.apparelType);
    if (!cat) {
      issues.push({
        itemIndex: i,
        code: 'UNKNOWN_APPAREL',
        message: `Item ${i + 1}: apparel "${it.apparelType}" tak ada di katalog — keluarkan lalu checkout ulang.`,
      });
      return;
    }
    if (!Array.isArray(cat.sizes) || !cat.sizes.includes(it.size)) {
      issues.push({
        itemIndex: i,
        code: 'INVALID_SIZE',
        message: `Item ${i + 1}: ukuran "${it.size}" tak tersedia untuk ${cat.slug} (pilihan: ${(cat.sizes || []).join(', ') || '—'}).`,
      });
    }
    if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 500) {
      issues.push({
        itemIndex: i,
        code: 'INVALID_QTY',
        message: `Item ${i + 1}: qty harus 1–500.`,
      });
    }
    const fresh = priceMap[it.apparelType];
    if (typeof fresh === 'number' && fresh !== it.basePrice) {
      issues.push({
        itemIndex: i,
        code: 'STALE_PRICE',
        message: `Item ${i + 1}: harga berubah Rp ${it.basePrice.toLocaleString('id-ID')} → Rp ${fresh.toLocaleString('id-ID')}.`,
      });
    }
  });
  if (items.length > 20) {
    issues.push({
      itemIndex: -1,
      code: 'TOO_MANY_ITEMS',
      message: `Maks 20 item per checkout (kini ${items.length}) — pecah jadi 2 pesanan.`,
    });
  }
  const before = computeCartSubtotal(items);
  const after = items.reduce((a, it) => {
    const unit =
      (priceMap[it.apparelType] ?? it.basePrice) +
      (typeof it.sablonPrice === 'number' && Number.isFinite(it.sablonPrice) ? it.sablonPrice : 0);
    return a + unit * (Number.isInteger(it.quantity) ? it.quantity : 0);
  }, 0);
  const notice = buildPriceChangeNotice(before, after);
  return {
    ok: !issues.some((x) => x.code !== 'STALE_PRICE'),
    issues,
    priceMap,
    stockUnknown: true,
    priceDiff: after - before,
    notice,
  };
}

// ---------------------------------------------------------------------------
// §4 — BUILDER ITEMS CHECKOUT N-DECAL (5 sisi server + clamp Zod)
// ---------------------------------------------------------------------------

/** Sisi yang diterima DecalLayerSchema server (Zod enum — sisi rusuk DITOLAK 400). */
export const SERVER_ACCEPTED_DECAL_SIDES = [
  'front',
  'back',
  'left_sleeve',
  'right_sleeve',
  'hood',
] as const;

export type ServerDecalSide = (typeof SERVER_ACCEPTED_DECAL_SIDES)[number];

/**
 * Sisi mockup-saja mobile (7-sisi studio) yang DITOLAK skema server.
 * Decal rusuk tetap valid di studio/cart/preview — hanya tak bisa ikut POST
 * checkout sebelum server membuka enum-nya.
 */
export const MOBILE_ONLY_DECAL_SIDES = ['side_left', 'side_right'] as const;

export function isServerAcceptedSide(side: string): side is ServerDecalSide {
  return (SERVER_ACCEPTED_DECAL_SIDES as readonly string[]).includes(side);
}

/** Satu decal mentah dari CartItem.decals[] (struktural — kompatibel store). */
export interface CartDecalInput {
  id: string;
  url: string;
  targetSide: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

/** Decal siap POST (lolos DecalLayerSchema). */
export interface ServerDecalPayload {
  id: string;
  url: string;
  name: string;
  targetSide: ServerDecalSide;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

function clampNum(v: unknown, lo: number, hi: number, fb: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb;
}

/** Label sisi Indonesia untuk `name` (cermin web: 'Depan'/'Belakang'…). */
export function serverDecalName(side: ServerDecalSide): string {
  try {
    const label = MOBILE_DECAL_SIDE_LABELS[side as keyof typeof MOBILE_DECAL_SIDE_LABELS];
    if (typeof label === 'string' && label) return label;
  } catch {
    // abaikan — fallback di bawah
  }
  return side === 'back' ? 'Belakang' : side === 'front' ? 'Depan' : side;
}

/**
 * Partisi decals[] cart jadi yang boleh ikut checkout vs yang mockup-saja.
 * Murni — dipakai untuk peringatan jujur SEBELUM POST (jangan buang diam-diam).
 */
export function partitionDecalsForServer(decals: CartDecalInput[]): {
  accepted: CartDecalInput[];
  dropped: CartDecalInput[];
} {
  const accepted: CartDecalInput[] = [];
  const dropped: CartDecalInput[] = [];
  for (const d of decals || []) {
    if (!d || typeof d.url !== 'string' || !d.url) continue;
    if (isServerAcceptedSide(d.targetSide)) accepted.push(d);
    else dropped.push(d);
  }
  return { accepted: accepted.slice(0, 10), dropped };
}

/** Normalisasi satu decal ke rentang DecalLayerSchema (murni). */
export function toServerDecal(d: CartDecalInput, fallbackId: string): ServerDecalPayload {
  const side: ServerDecalSide = isServerAcceptedSide(d.targetSide) ? d.targetSide : 'front';
  return {
    id: typeof d.id === 'string' && d.id ? d.id.slice(0, 64) : fallbackId.slice(0, 64),
    url: d.url,
    name: serverDecalName(side),
    targetSide: side,
    x: clampNum(d.x, -0.75, 0.75, 0),
    y: clampNum(d.y, -0.75, 0.75, 0.04),
    scale: clampNum(d.scale, 0.02, 1.5, 0.22),
    rotation: clampNum(d.rotation, -180, 180, 0),
    opacity: clampNum(d.opacity, 0, 1, 1),
  };
}

/** Item cart struktural (kompatibel CartItem store — tanpa import runtime). */
export interface CartItemInput {
  id: string;
  apparelType: string;
  apparelTitle: string;
  colorHex: string;
  colorName: string;
  size: string;
  quantity: number;
  decalUrl?: string | null;
  decals?: CartDecalInput[];
}

/** Item siap POST /api/mobile/orders/checkout. */
export interface ServerCheckoutItem {
  apparelSlug: string;
  colorHex: string;
  colorName: string;
  size: string;
  quantity: number;
  title: string;
  decals: ServerDecalPayload[];
  materialFinishSlug?: string;
  fabricThicknessSlug?: string;
}

export interface BuiltCheckoutItems {
  items: ServerCheckoutItem[];
  /** Peringatan jujur: decal rusuk terpotong, item tanpa decal, dst. */
  warnings: string[];
}

/**
 * Bangun items[] checkout dari cart (N-decal per item, 5 sisi, clamp Zod).
 * - decals[] penuh (maks 10): ganti pola lama "tepat 1 front/back".
 * - Sisi rusuk (side_left/right) DIPARTISI keluar + warning (bukan 400 diam).
 * - `opts.includeMockupOnlySides = false` default (fail-closed: jangan kirim
 *   yang pasti 400). Set true HANYA bila server sudah membuka enum sisi.
 */
export function buildMobileCheckoutItems(
  cartItems: CartItemInput[],
  opts?: { includeMockupOnlySides?: boolean }
): BuiltCheckoutItems {
  const warnings: string[] = [];
  const items: ServerCheckoutItem[] = [];
  for (const it of cartItems || []) {
    const raw: CartDecalInput[] = Array.isArray(it.decals)
      ? it.decals.filter((d) => d && typeof d.url === 'string' && d.url.length > 0)
      : [];
    // Kompat cache lama: decalUrl tunggal tanpa decals[] → bungkus 1 lapis.
    if (raw.length === 0 && typeof it.decalUrl === 'string' && it.decalUrl) {
      raw.push({
        id: `decal-${it.id}`,
        url: it.decalUrl,
        targetSide: 'front',
        x: 0,
        y: 0.04,
        scale: 0.22,
        rotation: 0,
        opacity: 1,
      });
    }
    const { accepted, dropped } = partitionDecalsForServer(raw);
    if (dropped.length > 0 && !opts?.includeMockupOnlySides) {
      warnings.push(
        `"${it.apparelTitle || it.apparelType}" — ${dropped.length} sablon rusuk (kiri/kanan) ` +
          'belum diterima server: TIDAK ikut terkirim. Pindahkan ke depan/belakang/lengan bila penting.'
      );
    }
    const pool = opts?.includeMockupOnlySides ? raw.slice(0, 10) : accepted;
    const decals = pool.map((d, i) => toServerDecal(d, `decal-${it.id}-${i}`));
    if (raw.length > 0 && decals.length === 0) {
      warnings.push(`"${it.apparelTitle || it.apparelType}" — sablon tak ada yang lolos validasi server; item terkirim tanpa gambar.`);
    }
    items.push({
      apparelSlug: it.apparelType,
      colorHex: it.colorHex,
      colorName: it.colorName,
      size: it.size,
      quantity: it.quantity,
      title: (it.apparelTitle || 'Custom Mobile').slice(0, 80),
      decals,
    });
  }
  return { items: items.slice(0, 20), warnings };
}

// ---------------------------------------------------------------------------
// §5 — SIZE-BREAKDOWN (paritas web sizeDistribution → N items)
// ---------------------------------------------------------------------------

/**
 * Ekspansi size-breakdown ala web (CheckoutModal sizeDistribution):
 * 1 desain + {S:2, M:3} → 2 items (S×2, M×3). Total qty ≤ 500/item (Zod),
 * total items ≤ 20/checkout — kelebihan DIKEMBALIKAN sebagai warning
 * (bukan dipotong diam-diam).
 */
export function expandSizeBreakdown<T extends { size: string; quantity: number }>(
  baseItem: Omit<T, 'size' | 'quantity'>,
  distribution: Record<string, number>
): { items: T[]; warnings: string[] } {
  const warnings: string[] = [];
  const items: T[] = [];
  for (const [size, qty] of Object.entries(distribution || {})) {
    const q = Math.floor(Number(qty) || 0);
    if (q <= 0) continue;
    if (q > 500) {
      warnings.push(`Ukuran ${size}: qty ${q} melebihi maks 500 — dipangkas ke 500.`);
    }
    items.push({ ...(baseItem as object), size: size.slice(0, 10), quantity: Math.min(500, q) } as T);
  }
  if (items.length > 20) {
    warnings.push(
      `Hasil bagi ukuran ${items.length} item melebihi maks 20/checkout — pecah jadi 2 pesanan.`
    );
  }
  const total = items.reduce((a, it) => a + it.quantity, 0);
  if (total <= 0) {
    warnings.push('Rincian ukuran kosong — isi minimal 1 pcs.');
  }
  return { items, warnings };
}

// ---------------------------------------------------------------------------
// §6 — ATURAN TURNSTILE (fail-closed, cermin route mobile)
// ---------------------------------------------------------------------------

/**
 * Kapan CheckoutSheet wajib melampirkan turnstileToken:
 * - OTP WA terverifikasi → FALSE (dilewati, hemat — proof-of-human cukup).
 * - Mode darurat CHECKOUT_OTP_REQUIRED=false → TRUE (fail-closed anti-spam).
 * Tanpa info mode darurat (client tak bisa baca env server) → default FALSE
 * + dokumentasikan: endpoint health/version bisa diekspos bila owner setuju.
 */
export function shouldAttachTurnstile(opts: {
  otpVerified: boolean;
  otpBypassEmergency?: boolean;
}): boolean {
  if (opts.otpBypassEmergency === true) return true;
  if (opts.otpVerified) return false;
  return false;
}

// ---------------------------------------------------------------------------
// §7 — CONVENIENCE: re-quote + sinkronkan store cart (opsional, non-pure)
// ---------------------------------------------------------------------------

export interface RequoteResult {
  /** Peta harga segar ({} = gagal/τήσει — cart tak diubah). */
  priceMap: MobileServerPriceMap;
  /** Selisih subtotal baru−lama (0 = segar/gagal). */
  diff: number;
  notice: PriceChangeNotice | null;
}

/**
 * Re-quote harga + sinkronkan basePrice cart via store.syncBasePrices
 * (pola web: fetchServerPriceMap → syncPrices → notice).
 * Import store LAZY agar file ini tetap bebas siklus dependensi
 * (store TAK BOLEH import file ini).
 */
export async function requoteAndSyncCart(timeoutMs = 10000): Promise<RequoteResult> {
  const empty: RequoteResult = { priceMap: {}, diff: 0, notice: null };
  try {
    const priceMap = await fetchMobileServerPriceMap(timeoutMs);
    if (Object.keys(priceMap).length === 0) return empty;
    const { useMobileCartStore } = await import('@/store/useMobileCartStore');
    const before = computeCartSubtotal(
      useMobileCartStore.getState().items.map((it) => ({
        basePrice: it.basePrice,
        sablonPrice: it.sablonPrice,
        quantity: it.quantity,
      }))
    );
    const diff = useMobileCartStore.getState().syncBasePrices(priceMap);
    // syncBasePrices sudah kembalikan selisih pasti (sumber kebenaran store).
    const notice = buildPriceChangeNotice(before, before + diff);
    return { priceMap, diff, notice };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// INTEGRASI UNTUK PEMILIK CheckoutSheet.tsx (JANGAN edit file ini —
// tempel potongan berikut ke CheckoutSheet oleh pemiliknya)
//
// Jangkar presisi (audit 21 Sep 2026, JANGAN edit CheckoutSheet dari misi ini):
// - `handlePlaceOrder` = CheckoutSheet.tsx:256 (async; validasi → R2 → checkout)
// - `getDecalForItem` = CheckoutSheet.tsx:321 (builder 1-decal front/back —
//   TARGET GANTI §4)
// - Loop draft-R2 per item = CheckoutSheet.tsx:344-398 (`createDesignDraft`
//   dipanggil di :360; hasil 1 URL/item di `resolvedDecalUrls`)
// - POST checkout = CheckoutSheet.tsx:413 (`mobileApiClient.checkout`, payload
//   `items:` dibangun di :431-455 via `items.map((it, mapIdx) => …)`)
// - Guard orderable ≈400 = :282-290; ekspedisi tanpa quote = :291-296;
//   OTP 6-digit = :300-302; whitelist kecamatan = :304-306
// - State form = :74-78 (`customerName/Phone/Address`, `couponCode`,
//   `turnaroundTier`); Step 1 = :624, Step 2 = :729, Step 3 = :966;
//   tombol submit = :1070 (`handlePlaceOrder`)
// ---------------------------------------------------------------------------
/**
 * LANGKAH 1 — Re-quote saat sheet dibuka (ganti pola "harga cart apa adanya"):
 * ```tsx
 * import { requoteAndSyncCart } from '@/lib/checkoutParity';
 * const [priceNotice, setPriceNotice] = useState<string | null>(null);
 * useEffect(() => {
 *   if (!open || items.length === 0) return;
 *   let alive = true;
 *   (async () => {
 *     const r = await requoteAndSyncCart(10000);
 *     if (alive && r.notice) setPriceNotice(r.notice.message);
 *   })();
 *   return () => { alive = false; };
 * }, [open]);
 * // + tampilkan priceNotice di Step 3 (CheckoutSheet.tsx:966, banner amber)
 * // SEBELUM tombol PESAN (:1070).
 * ```
 *
 * LANGKAH 2 — Validasi varian+stok sebelum submit (di `handlePlaceOrder`
 * (:256), setelah guard orderable (:282-290), sebelum cek ongkir (:291-296)):
 * ```tsx
 * import { validateCartAgainstCatalog } from '@/lib/checkoutParity';
 * const cats = await mobileApiClient.getCatalog().then(r => r.data?.categories ?? []);
 * const v = validateCartAgainstCatalog(items, cats);
 * if (!v.ok) return setFormError(v.issues[0].message);
 * if (v.notice) { setPriceNotice(v.notice.message); return setFormError(v.notice.message + ' Klik PESAN lagi.');
 * }
 * // v.stockUnknown SELALU true — JANGAN klaim "stok aman" di UI.
 * ```
 *
 * LANGKAH 3 — Ganti builder items tunggal → N-decal (di `handlePlaceOrder`,
 * ganti `getDecalForItem` (:321) + `decals:[{...1 item}]` di peta
 * `items.map` (:431-455) dengan):
 * ```tsx
 * import { buildMobileCheckoutItems } from '@/lib/checkoutParity';
 * const built = buildMobileCheckoutItems(items);
 * if (built.warnings.length > 0) onNotify?.(built.warnings.join(' '));
 * // pakai built.items[i].decals untuk payload + alur draft-R2 per decal
 * // (loop :344-398 jadi NESTED: per item → per decal; `createDesignDraft`
 * //  (:360) dipanggil per decal, URL per-index-decal masuk
 * //  `decals:[...N...]` di `items.map` (:431-455)).
 * ```
 * CATATAN: alur R2 kini kirim 1 decal/item — dengan N-decal, draft per item
 * harus membawa N url (ubah decals:[...1...] di createDesignDraft jadi map
 * dari built.items[i].decals + resolvedDecalUrls per-index-decal).
 *
 * LANGKAH 4 — Field wajib baru (state + UI + payload; state tetangga
 * ada di :74-78, sisipkan di sebelahnya):
 * - `const [email, setEmail] = useState('')` + input opsional Step 1 (:624) +
 *   payload `email: email.trim().slice(0,254) || undefined`
 *   (kunci = CHECKOUT_EMAIL_PAYLOAD_KEY).
 * - `const [courierNotes, setCourierNotes] = useState('')` + textarea
 *   opsional (maks 500) Step 2 (:729) + payload
 *   `courierNotes: v.slice(0,500) || undefined`
 *   (kunci = CHECKOUT_COURIER_NOTES_PAYLOAD_KEY).
 * - Size-breakdown: toggle "Bagi Ukuran (S–XXL)" + stepper per size di Step 3
 *   (:966), lalu `expandSizeBreakdown(base, dist)` → ganti `items:` payload
 *   (:431-455). Kunci konsep = CHECKOUT_SIZE_BREAKDOWN_KEY (client-only,
 *   BUKAN field server; hasil = N items ≤20).
 * - Turnstile: `shouldAttachTurnstile({ otpVerified: otpLifetimeOk })` —
 *   bila true, render widget + kirim `turnstileToken`.
 *
 * URUTAN VALIDASI FINAL (cermin web): login → nama/WA/alamat → orderable →
 * validateCartAgainstCatalog → ongkir/quote → OTP → submit → cegah
 * double-submit via Idempotency-Key (sudah ada — pertahankan).
 */
