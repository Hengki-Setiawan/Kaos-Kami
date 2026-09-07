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
  try {
    const raw = localStorage.getItem("kaoskami_saved_designs");
    if (!raw) return;
    const local = JSON.parse(raw);
    if (!Array.isArray(local) || local.length === 0) return;
    // Hanya desain lokal (id non-cuid server) yang perlu diklaim.
    const guests = local.filter((d: any) => d && !d.claimed && typeof d.id === "string" && d.id.startsWith("saved-"));
    if (guests.length === 0) return;
    const res = await fetch("/api/designs/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        designs: guests.slice(0, 20).map((d: any) => ({
          title: String(d.title || "Desain Guest").slice(0, 60),
          apparelSlug: d.apparel || "tshirt",
          colorHex: d.colorHex || "#121214",
          colorName: d.colorName || "Obsidian Black",
          size: d.size || "L",
          decals: Array.isArray(d.decals) ? d.decals.slice(0, 10) : [],
          calculatedPriceIdr: Number(d.calculatedPriceIdr) > 0 ? Math.min(100_000_000, Math.round(Number(d.calculatedPriceIdr))) : 149000,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && (data.claimed || 0) > 0) {
      // Tandai sudah diklaim agar tidak duplikat saat login berikutnya.
      const claimedIds = new Set(guests.map((d: any) => d.id));
      const updated = local.map((d: any) => (claimedIds.has(d.id) ? { ...d, claimed: true } : d));
      try {
        localStorage.setItem("kaoskami_saved_designs", JSON.stringify(updated));
      } catch {}
    }
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
