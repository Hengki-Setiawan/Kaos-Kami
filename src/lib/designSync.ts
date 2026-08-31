/**
 * Thin sync layer — Blueprint 01 §4
 * Debounce 1.5s autosave ke POST /api/designs/:id/autosave
 * + offline-first localStorage cache + claim guest→login
 */
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let offlineQueue: any[] = [];

export function scheduleAutosave() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const state = useConfiguratorStore.getState();
    const payload = {
      apparelSlug: state.activeApparel,
      colorHex: state.selectedColor,
      colorName: state.activeColorName,
      size: state.selectedSize,
      decals: state.decals,
      studioTheme: state.studioTheme,
      materialFinishSlug: state.materialFinish,
    };

    try {
      const res = await fetch("/api/designs/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("autosave failed");
      // flush offline queue
      offlineQueue = [];
    } catch (e) {
      console.warn("Autosave failed, queue offline", e);
      offlineQueue.push(payload);
      try {
        localStorage.setItem("kaos_kami_offline_queue", JSON.stringify(offlineQueue));
      } catch {}
    }
  }, 1500);
}

export async function claimGuestDesigns() {
  const guestToken = typeof document !== "undefined" ? document.cookie.match(/guest_token=([^;]+)/)?.[1] : null;
  if (!guestToken) return;
  try {
    await fetch("/api/designs/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestToken }),
    });
  } catch (e) {
    console.warn("Claim failed", e);
  }
}

export function hydrateFromServer() {
  // Called on mount if authenticated — GET /api/designs?userId=me
  return fetch("/api/designs")
    .then((r) => r.json())
    .then((data) => {
      if (data.designs && Array.isArray(data.designs)) {
        const store = useConfiguratorStore.getState();
        // Merge server designs into local savedDesigns (dedupe by id)
        // For now just log — full hydration handled in dashboard
        console.log("Hydrated", data.designs.length, "server designs");
      }
    })
    .catch(() => {});
}
