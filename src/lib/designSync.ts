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
  return fetch("/api/designs")
    .then((r) => r.json())
    .then((data) => {
      if (data.designs && Array.isArray(data.designs) && data.designs.length > 0) {
        const store = useConfiguratorStore.getState();
        try {
          const serverDesigns = data.designs.map((d: any) => ({
            id: d.id,
            title: d.title,
            apparel: d.category?.slug || "tshirt",
            colorHex: d.colorHex,
            colorName: d.colorName,
            size: d.size,
            theme: d.studioTheme || "obsidian",
            materialFinish: d.materialFinishSlug || "combed-cotton",
            decals: typeof d.decals === "string" ? JSON.parse(d.decals) : d.decals || [],
            savedAt: new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
            calculatedPriceIdr: d.calculatedPriceIdr,
          }));
          // Merge dedupe by id
          const existingIds = new Set(store.savedDesigns.map((s) => s.id));
          const newOnes = serverDesigns.filter((s: any) => !existingIds.has(s.id));
          if (newOnes.length > 0) {
            const merged = [...newOnes, ...store.savedDesigns];
            // Directly set via localStorage + store internal: we re-use save logic by setting state manually
            (store as any).savedDesigns = merged;
            try {
              localStorage.setItem("kaoskami_saved_designs", JSON.stringify(merged));
            } catch {}
            console.log("Hydrated", newOnes.length, "server designs into local");
          }
        } catch (e) {
          console.warn("Hydrate parse failed", e);
        }
      }
    })
    .catch(() => {});
}
