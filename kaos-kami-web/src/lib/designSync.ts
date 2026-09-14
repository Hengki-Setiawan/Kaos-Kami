/**
 * Thin sync layer — Blueprint 01 §4
 * Debounce 1.5s autosave ke POST /api/designs/:id/autosave
 * + offline-first localStorage cache + claim guest→login
 */
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { fetchJson } from "@/lib/fetchJson";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let offlineQueue: any[] = [];

// localStorage berversi (audit #41): blob: URL mati pasca-reload, kuota penuh
// diam, format lama tanpa versi. v1 = { v: 1, items: [...] }.
const LS_KEY = "kaos_kami_saved_designs_v1";
const LEGACY_KEY = "kaoskami_saved_designs";
const MAX_LOCAL_DESIGNS = 20;

function readLocalDesigns(): any[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1 && Array.isArray(parsed.items)) return parsed.items;
    }
    // Migrasi format lama (bare array) sekali, lalu hapus key lama.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr)) {
        const cleaned = arr.map(stripBlobUrls).slice(0, MAX_LOCAL_DESIGNS);
        writeLocalDesigns(cleaned);
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {}
        return cleaned;
      }
    }
  } catch {}
  return [];
}

function writeLocalDesigns(items: any[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, items: items.slice(0, MAX_LOCAL_DESIGNS) }));
  } catch {
    // Kuota penuh: pangkas setengah lalu coba lagi (jangan diam).
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ v: 1, items: items.slice(0, Math.floor(MAX_LOCAL_DESIGNS / 2)) })
      );
    } catch {}
  }
}

/** Blob URL tak selamat dari reload + bocor memori — buang saat persist. */
function stripBlobUrls(d: any) {
  if (!d || typeof d !== "object") return d;
  const decals = Array.isArray(d.decals)
    ? d.decals.map((l: any) =>
        typeof l?.url === "string" && l.url.startsWith("blob:") ? { ...l, url: "" } : l
      )
    : d.decals;
  return { ...d, decals };
}

function revokeBlobUrls(decals: any[]) {
  for (const l of decals || []) {
    try {
      if (typeof l?.url === "string" && l.url.startsWith("blob:")) URL.revokeObjectURL(l.url);
    } catch {}
  }
}

function setSyncStatus(s: "idle" | "saving" | "saved" | "error") {
  try {
    (useConfiguratorStore.getState() as any).setSyncStatus?.(s);
  } catch {}
}

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

    setSyncStatus("saving");
    try {
      await fetchJson("/api/designs/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 15000);
      // flush offline queue
      offlineQueue = [];
      try {
        localStorage.removeItem("kaos_kami_offline_queue");
      } catch {}
      setSyncStatus("saved");
    } catch (e) {
      setSyncStatus("error");
      offlineQueue.push(payload);
      try {
        localStorage.setItem("kaos_kami_offline_queue", JSON.stringify(offlineQueue.slice(-10)));
      } catch {}
    }
  }, 1500);
}

export async function claimGuestDesigns() {
  try {
    const local = readLocalDesigns();
    if (local.length === 0) return;
    // Hanya desain lokal (id non-cuid server) yang perlu diklaim.
    const guests = local.filter((d: any) => d && !d.claimed && typeof d.id === "string" && d.id.startsWith("saved-"));
    if (guests.length === 0) return;
    const data = await fetchJson<{ success?: boolean; claimed?: number }>("/api/designs/claim", {
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
    }, 20000);
    if (data.success && (data.claimed || 0) > 0) {
      // Tandai sudah diklaim agar tidak duplikat saat login berikutnya.
      const claimedIds = new Set(guests.map((d: any) => d.id));
      const updated = local.map((d: any) => (claimedIds.has(d.id) ? { ...d, claimed: true } : d));
      writeLocalDesigns(updated);
    }
  } catch {
    // Offline/401 = coba lagi lain waktu, tanpa berisik.
  }
}

export function hydrateFromServer() {
  fetchJson<{ designs?: any[] }>("/api/designs", undefined, 15000)
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
            theme: d.studioTheme || "gallery",
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
            (store as any).savedDesigns = merged;
            writeLocalDesigns(merged.map(stripBlobUrls));
          }
          // DB menang atas localStorage saat login: terapkan tema desain
          // server terbaru ke store + persist lokal + data-theme.
          const latestTheme = (serverDesigns[0] as any)?.theme;
          if (latestTheme === "gallery" || latestTheme === "obsidian" || latestTheme === "concrete") {
            try {
              useConfiguratorStore.setState({ studioTheme: latestTheme });
              localStorage.setItem("kaos-studio-theme", latestTheme);
              if (typeof document !== "undefined") {
                document.documentElement.setAttribute("data-theme", latestTheme);
              }
            } catch {}
          }
        } catch (e) {
          console.warn("Hydrate parse failed", e);
        }
      }
    })
    .catch(() => {});
}
