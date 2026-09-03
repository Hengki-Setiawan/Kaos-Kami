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

export function initOfflineSyncQueue(
  onSync: (mutations: PendingMutation[]) => Promise<void>
): () => void {
  const processQueue = async () => {
    const status = await getCurrentNetworkStatus();
    if (status.connected) {
      const queue = getOfflineMutationQueue();
      if (queue.length > 0) {
        try {
          await onSync(queue);
          clearOfflineMutationQueue();
          console.log(`[SyncQueue] Sukses memproses ${queue.length} mutasi offline.`);
        } catch (err) {
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
