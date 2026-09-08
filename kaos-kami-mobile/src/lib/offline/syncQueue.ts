import { listenNetworkStatus, getCurrentNetworkStatus } from '@/lib/bridge/network';

export interface PendingMutation {
  id: string;
  type: 'SAVE_DESIGN' | 'SUBMIT_ORDER' | 'UPDATE_CART';
  payload: any;
  timestamp: number;
}

const MUTATION_QUEUE_KEY = 'kaoskami_mutation_queue';

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
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  }
}

export function clearOfflineMutationQueue(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MUTATION_QUEUE_KEY);
  }
}

const FAIL_COUNT_KEY = 'kaoskami_mutation_failcount';
const MAX_QUEUE = 50; // Batas antrean (memori localStorage HP kentang).
const MAX_CONSECUTIVE_FAIL = 5; // Poison-eviction: item tertua dibuang.

function getFailCount(): number {
  try {
    return Number(localStorage.getItem(FAIL_COUNT_KEY) || 0);
  } catch {
    return 0;
  }
}

export function initOfflineSyncQueue(
  onSync: (mutations: PendingMutation[]) => Promise<void>
): () => void {
  const processQueue = async () => {
    const status = await getCurrentNetworkStatus();
    if (status.connected) {
      let queue = getOfflineMutationQueue();
      if (queue.length > MAX_QUEUE) {
        // Pangkas terlama bila membludak (HP offline berhari-hari).
        queue = queue.slice(queue.length - MAX_QUEUE);
        if (typeof window !== 'undefined') {
          localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
        }
      }
      if (queue.length > 0) {
        try {
          await onSync(queue);
          clearOfflineMutationQueue();
          try {
            localStorage.removeItem(FAIL_COUNT_KEY);
          } catch {}
          console.log(`[SyncQueue] Sukses memproses ${queue.length} mutasi offline.`);
        } catch (err) {
          // Poison-guard: gagal N x beruntun → buang 1 item tertua (kemungkinan
          // rusak/ditolak permanen server) agar antrean tidak macet selamanya.
          const fails = getFailCount() + 1;
          try {
            localStorage.setItem(FAIL_COUNT_KEY, String(fails));
          } catch {}
          if (fails >= MAX_CONSECUTIVE_FAIL) {
            const dropped = queue[0];
            queue = queue.slice(1);
            if (typeof window !== 'undefined') {
              localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
              localStorage.removeItem(FAIL_COUNT_KEY);
            }
            console.warn('[SyncQueue] Poison-eviction, buang mutasi tertua:', dropped?.id, err);
          } else {
            console.warn('[SyncQueue] Gagal sinkronisasi mutasi:', err);
          }
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
