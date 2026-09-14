import { listenNetworkStatus, getCurrentNetworkStatus } from '@/lib/bridge/network';
import { prefGet, prefSet, prefRemove } from '@/lib/offline/preferencesStorage';
import { mobileApiClient } from '@/lib/api/mobileApiClient';

export interface PendingMutation {
  id: string;
  type: 'SAVE_DESIGN' | 'SUBMIT_ORDER' | 'UPDATE_CART';
  payload: any;
  timestamp: number;
}

/** Tipe yang didukung replay server. Tipe lain DILEWATI + toast, bukan macet.
 * - SAVE_DESIGN → POST /api/mobile/designs/sync (ada di mobileApiClient).
 * - SUBMIT_ORDER → POST /api/mobile/orders/checkout (ada di mobileApiClient;
 *   payload = body checkout mentah ATAU { checkoutPayload: body }).
 * - UPDATE_CART SENGAJA tak didukung: tak ada endpoint cart di mobileApiClient
 *   (cart = zustand persist lokal `kaoskami_mobile_cart`, bukan server) —
 *   memaksakan replay = 404 + poison-queue. Dibiarkan unsupported + toast jujur.
 */
export const SUPPORTED_MUTATION_TYPES: ReadonlyArray<PendingMutation['type']> = ['SAVE_DESIGN', 'SUBMIT_ORDER'];

const MUTATION_QUEUE_KEY = 'kaoskami_mutation_queue';
const FAIL_COUNT_KEY = 'kaoskami_mutation_failcount';
const MAX_QUEUE = 50; // Batas antrean (memori localStorage HP kentang).
const MAX_CONSECUTIVE_FAIL = 5; // Poison-eviction: item tertua DARI TIPE DIDUKUNG dibuang.

export function partitionMutations(queue: PendingMutation[]): {
  supported: PendingMutation[];
  unsupported: PendingMutation[];
} {
  const supported = queue.filter((m) => (SUPPORTED_MUTATION_TYPES as string[]).includes(m.type));
  const unsupported = queue.filter((m) => !(SUPPORTED_MUTATION_TYPES as string[]).includes(m.type));
  return { supported, unsupported };
}

// ---- Storage: Preferences (native) + localStorage (web/cermin sync) ----

async function loadQueueAsync(): Promise<PendingMutation[]> {
  try {
    const raw = await prefGet(MUTATION_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueueAsync(queue: PendingMutation[]): Promise<void> {
  try {
    await prefSet(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

async function getFailCountAsync(): Promise<number> {
  try {
    return Number((await prefGet(FAIL_COUNT_KEY)) || 0);
  } catch {
    return 0;
  }
}

export function getOfflineMutationQueue(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp'>): void {
  const queue = getOfflineMutationQueue();
  const fullMutation: PendingMutation = {
    ...mutation,
    id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };
  queue.push(fullMutation);
  const trimmed = queue.slice(-MAX_QUEUE);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(trimmed));
    } catch (e: any) {
      // Kuota penuh: buang setengah tertua, coba lagi sekali.
      try {
        localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(trimmed.slice(-Math.floor(MAX_QUEUE / 2))));
      } catch {}
    }
  }
  // Cermin async ke Preferences (fire-and-forget, native survive restart).
  saveQueueAsync(trimmed).catch(() => {});
}

export function clearOfflineMutationQueue(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(MUTATION_QUEUE_KEY);
    } catch {}
  }
  prefRemove(MUTATION_QUEUE_KEY).catch(() => {});
}

function getFailCount(): number {
  try {
    return Number(typeof window !== 'undefined' ? localStorage.getItem(FAIL_COUNT_KEY) || 0 : 0);
  } catch {
    return 0;
  }
}

export interface SyncQueueOptions {
  /** Dipanggil untuk tipe tak didukung — pemanggil wajib toast, JANGAN throw. */
  onUnsupported?: (mutations: PendingMutation[]) => void;
}

/**
 * Replay batch didukung → server via mobileApiClient yang sudah ada.
 * Dipakai handler onSync pemanggil (lihat src/app/page.tsx).
 * - SUBMIT_ORDER TANPA userId DIIZINKAN (checkout tamu: server membuat User
 *   dari phoneNumber + OTP di body; userId bukan bagian payload checkout).
 *   Hanya SAVE_DESIGN butuh userId (sync desain terikat akun) — tanpa itu
 *   throw agar antrean DIPERTAHANKAN (bukan dihapus diam-diam).
 * - checkout 502 fail-closed (success=false TAPI orderId ada) = SUKSES
 *   (order PENDING tersimpan server, cermin CheckoutSheet) — JANGAN throw.
 * - Gagal lain → throw agar poison-guard initOfflineSyncQueue menahan antrean.
 */
export async function replaySupportedMutations(
  mutations: PendingMutation[],
  opts?: { userId?: string }
): Promise<{ syncedDesigns: number; submittedOrders: number }> {
  const userId = opts?.userId || '';
  const supported = mutations.filter((m) => (SUPPORTED_MUTATION_TYPES as string[]).includes(m.type));
  const designs = supported
    .filter((m) => m.type === 'SAVE_DESIGN')
    .flatMap((m) => (Array.isArray(m.payload?.designs) ? m.payload.designs : [m.payload]));
  const orders = supported.filter((m) => m.type === 'SUBMIT_ORDER');
  if (designs.length > 0 && !userId) throw new Error('tanpa userId (belum checkout) — tahan antrean');
  let syncedDesigns = 0;
  let submittedOrders = 0;
  if (designs.length > 0) {
    const res = await mobileApiClient.syncDesigns({ userId, designs });
    if (!res.success) throw new Error(res.error || 'sync desain gagal');
    syncedDesigns = res.synced ?? designs.length;
  }
  for (const m of orders) {
    const body = (m.payload?.checkoutPayload ?? m.payload) as Record<string, unknown>;
    if (!body || !Array.isArray((body as { items?: unknown }).items) || (body as { items: unknown[] }).items.length === 0) {
      throw new Error(`SUBMIT_ORDER ${m.id} payload tak valid (butuh items[])`);
    }
    // Idempotency-Key = ID mutasi (stabil antar-replay) → retry/replay key
    // SAMA dibalas server 409 + order lama (tanpa order ganda).
    const res = await mobileApiClient.checkout(body, { idempotencyKey: m.id });
    // success ATAU orderId (502 fail-closed PENDING) = replay selesai.
    if (!res.success && !res.orderId) throw new Error(res.error || `checkout replay ${m.id} gagal`);
    submittedOrders += 1;
  }
  return { syncedDesigns, submittedOrders };
}

export function initOfflineSyncQueue(
  onSync: (mutations: PendingMutation[]) => Promise<void>,
  opts?: SyncQueueOptions
): () => void {
  const processQueue = async () => {
    const status = await getCurrentNetworkStatus();
    if (!status.connected) return;
    let queue = await loadQueueAsync();
    // Sinkronkan cermin bila Preferences kosong tapi localStorage ada (migrasi).
    if (queue.length === 0 && typeof window !== 'undefined') {
      const legacy = getOfflineMutationQueue();
      if (legacy.length > 0) {
        queue = legacy;
        await saveQueueAsync(queue);
      }
    }
    if (queue.length > MAX_QUEUE) {
      // Pangkas terlama bila membludak (HP offline berhari-hari).
      queue = queue.slice(queue.length - MAX_QUEUE);
      await saveQueueAsync(queue);
    }
    if (queue.length === 0) return;

    // Pisahkan batch per tipe: yang didukung direplay, yang tak didukung
    // DILEWATI (toast) — JANGAN jegal antrean, JANGAN lempar agar macet.
    const { supported, unsupported } = partitionMutations(queue);
    if (unsupported.length > 0) {
      try {
        opts?.onUnsupported?.(unsupported);
      } catch {}
      // Keluarkan yang tak didukung dari antrean (tetap catat di log) agar
      // replay tipe didukung jalan; data tak hilang diam-diam karena toast.
      queue = supported;
      await saveQueueAsync(queue);
      console.warn(
        `[SyncQueue] Lewati ${unsupported.length} mutasi tak didukung:`,
        unsupported.map((m) => `${m.id}:${m.type}`).join(', ')
      );
      if (queue.length === 0) return;
    }

    if (queue.length > 0) {
      try {
        await onSync(queue);
        // Sukses: hapus yang berhasil (tipe didukung). Antrean kini kosong
        // karena unsupported sudah dikeluarkan di atas.
        clearOfflineMutationQueue();
        try {
          if (typeof window !== 'undefined') localStorage.removeItem(FAIL_COUNT_KEY);
        } catch {}
        await prefRemove(FAIL_COUNT_KEY);
        console.log(`[SyncQueue] Sukses memproses ${queue.length} mutasi offline.`);
      } catch (err) {
        // Poison-guard HANYA untuk tipe didukung: gagal N x beruntun → buang
        // 1 item tertua DARI BATCH DIDUKUNG agar antrean tidak macet selamanya.
        let persistedFails = 0;
        try {
          persistedFails = await getFailCountAsync();
        } catch {}
        if (!persistedFails) persistedFails = getFailCount();
        const nextFails = persistedFails + 1;
        try {
          if (typeof window !== 'undefined') localStorage.setItem(FAIL_COUNT_KEY, String(nextFails));
        } catch {}
        await prefSet(FAIL_COUNT_KEY, String(nextFails));
        if (nextFails >= MAX_CONSECUTIVE_FAIL) {
          const dropped = queue[0];
          queue = queue.slice(1);
          await saveQueueAsync(queue);
          await prefRemove(FAIL_COUNT_KEY);
          try {
            if (typeof window !== 'undefined') localStorage.removeItem(FAIL_COUNT_KEY);
          } catch {}
          console.warn('[SyncQueue] Poison-eviction (tipe didukung), buang mutasi tertua:', dropped?.id, err);
        } else {
          console.warn('[SyncQueue] Gagal sinkronisasi mutasi:', err);
        }
      }
    }
  };

  // Process on startup
  processQueue();

  // Listen to network changes
  return listenNetworkStatus((status) => {
    if (status.connected) {
      processQueue();
    }
  });
}
