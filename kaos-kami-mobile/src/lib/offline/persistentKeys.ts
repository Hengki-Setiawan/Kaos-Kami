import { prefGet, prefSet, prefRemove } from '@/lib/offline/preferencesStorage';

/**
 * Kunci persisten kecil — WAJIB via Capacitor Preferences di native
 * (localStorage WebView tak dijamin survive restart/evict).
 * Semua helper async; pemanggil sync lama memakai cermin localStorage.
 */
export const KK_ACTIVE_ORDER = 'kaoskami_active_order';
export const KK_PENDING_PAYMENT = 'kaoskami_pending_payment';
export const KK_USER_ID = 'kaoskami_user_id';
/** Map JSON decal_px PER-DESAIN: { [designKey]: widthPx }. */
export const KK_DECAL_PX_MAP = 'kaoskami_decal_px_map';
/** Pointer upload decal terakhir (untuk hitung DPI saat gizmo digeser). */
export const KK_DECAL_PX_CURRENT = 'kaoskami_decal_px_current';
/** Kunci global lama (single) — hanya untuk migrasi sekali. */
const KK_DECAL_PX_LEGACY = 'kaoskami_decal_px';

export async function getActiveOrderId(): Promise<string | null> {
  return prefGet(KK_ACTIVE_ORDER);
}
export async function setActiveOrderId(id: string | null): Promise<void> {
  if (id) await prefSet(KK_ACTIVE_ORDER, id);
  else await prefRemove(KK_ACTIVE_ORDER);
}
export async function getPendingPaymentUrl(): Promise<string | null> {
  return prefGet(KK_PENDING_PAYMENT);
}
export async function setPendingPaymentUrl(url: string | null): Promise<void> {
  if (url) await prefSet(KK_PENDING_PAYMENT, url);
  else await prefRemove(KK_PENDING_PAYMENT);
}
export async function getStoredUserId(): Promise<string> {
  return (await prefGet(KK_USER_ID)) || '';
}
export async function setStoredUserId(id: string): Promise<void> {
  if (id) await prefSet(KK_USER_ID, id);
}

function readMapSync(): Record<string, number> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KK_DECAL_PX_MAP) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Baca lebar piksel decal untuk satu desain (sync fast-path via cermin). */
export function getDecalPxForDesignSync(designKey: string): number {
  const map = readMapSync();
  const v = Number(map[designKey] || 0);
  if (v > 0) return v;
  // Migrasi: global lama dianggap milik desain yang sedang dibuka.
  try {
    return Number(typeof window !== 'undefined' ? localStorage.getItem(KK_DECAL_PX_LEGACY) || 0 : 0);
  } catch {
    return 0;
  }
}

/** Pointer upload terakhir (sync fast-path). */
export function getCurrentDecalKeySync(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(KK_DECAL_PX_CURRENT) : null;
  } catch {
    return null;
  }
}

/** Simpan lebar piksel decal PER-DESAIN (async → Preferences + cermin). */
export async function setDecalPxForDesign(designKey: string, widthPx: number): Promise<void> {
  try {
    const raw = await prefGet(KK_DECAL_PX_MAP);
    let map: Record<string, number> = {};
    try {
      map = raw ? JSON.parse(raw) : readMapSync();
    } catch {
      map = readMapSync();
    }
    map[designKey] = Math.round(widthPx);
    // Batasi 30 entri terbaru agar tak bengkak.
    const keys = Object.keys(map);
    if (keys.length > 30) {
      for (const k of keys.slice(0, keys.length - 30)) delete map[k];
    }
    await prefSet(KK_DECAL_PX_MAP, JSON.stringify(map));
    await prefSet(KK_DECAL_PX_CURRENT, designKey);
  } catch {}
}

/** Hapus entri decal satu desain (mis. desain dihapus dari galeri). */
export async function removeDecalPxForDesign(designKey: string): Promise<void> {
  try {
    const raw = await prefGet(KK_DECAL_PX_MAP);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    delete map[designKey];
    await prefSet(KK_DECAL_PX_MAP, JSON.stringify(map));
  } catch {}
}
