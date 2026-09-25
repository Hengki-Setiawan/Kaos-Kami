/**
 * Fondasi master-registry mobile (P2) — cermin pola web imageEditPipeline.
 *
 * Web (JANGAN diubah, hanya dibaca polanya):
 * - `kaoskami_master_assets["decal:<id>"]` = master resolusi penuh per decal.
 * - `kaoskami_master_assets["<apparel>:<panel>"]` = { url https, at, dpi, wCm,
 *   hCm, tiles?, cols?, rows?, tiled? } hasil exportPanelMaster (tiled bila A3).
 * - Checkout hanya membawa https (maks 20, base64 TAK PERNAH ikut).
 *
 * Mobile (file ini):
 * - Kunci LS TERPISAH `kaoskami_mobile_master_assets` agar tak tabrakan
 *   dengan bucket web bila satu browser dipakai bergantian.
 * - Map memori + persist LS best-effort (kuota WebView kecil; master besar
 *   tetap hidup di memori sesi ini bila LS penuh).
 * - TILED: tahap ini hanya menyimpan RENCANA tile (cols/rows via
 *   planMobileTiles), BUKAN merakit tile — perakitan tiled = follow-up
 *   (butuh kanvas 2D penuh / Fabric, lihat FABRIC follow-up di panel).
 *
 * Murni client + tanpa DOM (aman diuji typecheck tanpa browser).
 */

export interface MobileMasterEntry {
  /** https R2 (siap checkout) ATAU data:image base64 lokal (belum upload). */
  url: string;
  at: string;
  dpi?: number;
  wCm?: number;
  hCm?: number;
  /** Rencana tiled (diisi bila wCm/hCm memenuhi ambang A3). */
  tiles?: string[];
  cols?: number;
  rows?: number;
  tiled?: boolean;
}

export interface MobileTiledPlan {
  tiled: boolean;
  cols: number;
  rows: number;
  reason: string;
}

const LS_KEY = 'kaoskami_mobile_master_assets';

const mem = new Map<string, MobileMasterEntry>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readBucket(): Record<string, MobileMasterEntry> {
  try {
    if (!isBrowser()) return {};
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MobileMasterEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeBucket(all: Record<string, MobileMasterEntry>): void {
  try {
    if (!isBrowser()) return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    // Kuota penuh — master tetap tersedia di memori sesi ini.
  }
}

export function isHttpsUrl(u: unknown): boolean {
  return typeof u === 'string' && /^https:\/\//.test(u);
}

/**
 * Rencana tiled jujur TANPA merakit piksel (siap tiled nanti).
 * Ambang cermin web exportPanelMaster: sisi >= 29cm ATAU luas > 12MP
 * pada 300 DPI (~ PRINT_EXPORT_LIMITS.maxMegapixels).
 */
export function planMobileTiles(wCm: number, hCm: number): MobileTiledPlan {
  const w = Number(wCm);
  const h = Number(hCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { tiled: false, cols: 1, rows: 1, reason: 'ukuran tak valid — single tile' };
  }
  const pxPerCm = 300 / 2.54;
  const mp = ((w * pxPerCm) * (h * pxPerCm)) / 1_000_000;
  if (Math.max(w, h) >= 29 || mp > 12) {
    const cols = w >= 29 ? 2 : 1;
    const rows = h >= 29 || (mp > 12 && h > w) ? 2 : cols === 2 && mp > 12 ? 2 : 1;
    return {
      tiled: true,
      cols,
      rows,
      reason: `A3/besar (${w}×${h}cm ≈ ${mp.toFixed(1)}MP @300DPI) — butuh tiled ${cols}×${rows} saat editor kanvas tersedia`,
    };
  }
  return { tiled: false, cols: 1, rows: 1, reason: 'di bawah ambang A3 — single file cukup' };
}

/** Simpan master per decal id (https bila sudah upload, base64 bila lokal). */
export function setMobileMaster(
  decalId: string,
  url: string,
  meta?: { dpi?: number; wCm?: number; hCm?: number },
): void {
  if (!decalId || !url) return;
  const wCm = meta?.wCm;
  const hCm = meta?.hCm;
  const plan = wCm && hCm ? planMobileTiles(wCm, hCm) : null;
  const entry: MobileMasterEntry = {
    url,
    at: new Date().toISOString(),
    ...(typeof meta?.dpi === 'number' ? { dpi: meta.dpi } : {}),
    ...(typeof wCm === 'number' ? { wCm } : {}),
    ...(typeof hCm === 'number' ? { hCm } : {}),
    ...(plan && plan.tiled ? { cols: plan.cols, rows: plan.rows, tiled: true } : {}),
  };
  mem.set(decalId, entry);
  try {
    const all = readBucket();
    all[`decal:${decalId}`] = entry;
    writeBucket(all);
  } catch {
    // abaikan — memori tetap benar
  }
}

/** Ambil master per decal id; null bila belum pernah disimpan. */
export function getMobileMaster(decalId: string): MobileMasterEntry | null {
  const m = mem.get(decalId);
  if (m) return m;
  try {
    const entry = readBucket()[`decal:${decalId}`];
    if (entry?.url) {
      mem.set(decalId, entry);
      return entry;
    }
  } catch {
    // abaikan
  }
  return null;
}

/** True bila master decal ini sudah https R2 (aman checkout). */
export function hasMobileHttpsMaster(decalId: string): boolean {
  const e = getMobileMaster(decalId);
  return !!e && isHttpsUrl(e.url);
}

/** Kumpulkan semua master per-decal (kunci tanpa prefix `decal:`). */
export function collectMobileMasters(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of mem) {
    if (v?.url) out[k] = v.url;
  }
  try {
    const all = readBucket();
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith('decal:') && v?.url && !out[k.slice('decal:'.length)]) {
        out[k.slice('decal:'.length)] = v.url;
      }
    }
  } catch {
    // abaikan
  }
  return out;
}

/**
 * Map checkout mobile (cermin web buildCheckoutMasterMap): hanya https,
 * maks 20 entri. Base64 lokal TAK PERNAH ikut (payload tetap kecil).
 */
export function buildMobileCheckoutMasterMap(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const all = collectMobileMasters();
    for (const [id, url] of Object.entries(all)) {
      if (Object.keys(out).length >= 20) break;
      if (isHttpsUrl(url)) out[`decal:${id}`] = url;
    }
  } catch {
    // abaikan
  }
  return out;
}

export function clearMobileMaster(decalId: string): void {
  mem.delete(decalId);
  try {
    const all = readBucket();
    delete all[`decal:${decalId}`];
    writeBucket(all);
  } catch {
    // abaikan
  }
}
