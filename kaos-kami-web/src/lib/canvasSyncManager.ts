/**
 * Fabric.js CanvasTexture sync ke R3F Decal — kompatibel v6 & v7.
 * Riset: v6→v7 breaking minimal (callback→Promise di loadFromJSON/enliven,
 * setWidth/setHeight dihapus, Node 18 drop). toDataURL & enlivenObjects tetap ada.
 * Manager ini memakai Promise-first dengan fallback callback agar aman di dua versi.
 */
import * as fabric from "fabric";

type FabricCanvasLike = {
  renderAll(): void;
  toDataURL(options?: Record<string, unknown>): string;
  getObjects(): unknown[];
  dispose?: () => void;
  add?: (...objs: any[]) => void;
};

function toDataUrlSafe(canvas: FabricCanvasLike): string | null {
  try {
    if (typeof document !== "undefined") {
      // Hindari ekspor kontrol seleksi (v7: controls tidak ikut ekspor, tapi pastikan clear).
      (canvas as any).discardActiveObject?.();
    }
    canvas.renderAll();
    return canvas.toDataURL({
      format: "png",
      multiplier: 1,
      enableRetinaScaling: true,
    });
  } catch (e) {
    console.error("getCanvasTexture failed", e);
    return null;
  }
}

async function enlivenAsync(objects: any[]): Promise<any[]> {
  const util: any = (fabric as any).util;
  if (typeof util?.enlivenObjects !== "function") return [];
  // v7: Promise; v6: Promise + callback-compat. Coba Promise dulu.
  try {
    const maybe = util.enlivenObjects(objects);
    if (maybe && typeof maybe.then === "function") return await maybe;
  } catch {
    /* fallback ke callback di bawah */
  }
  return await new Promise<any[]>((resolve) => {
    try {
      util.enlivenObjects(objects, (enlivened: any[]) => resolve(enlivened || []));
    } catch {
      resolve([]);
    }
  });
}

export const canvasSyncManager = {
  getCanvasTexture: (fabricCanvas: fabric.Canvas | null): string | null => {
    if (!fabricCanvas) return null;
    return toDataUrlSafe(fabricCanvas as unknown as FabricCanvasLike);
  },

  getCanvasTextureFromStorage: async (view: "front" | "back"): Promise<string | null> => {
    try {
      const key = view === "front" ? "kaos_kami_front_canvas" : "kaos_kami_back_canvas";
      const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Dukung format array mentah maupun { objects: [...] }.
      const objects = Array.isArray(parsed) ? parsed : parsed?.objects;
      if (!Array.isArray(objects) || objects.length === 0) return null;
      if (typeof document === "undefined") return null;

      // Offscreen canvas valid (jangan `new Canvas(null)` — ditolak di v7).
      const el = document.createElement("canvas");
      el.width = 450;
      el.height = 500;
      const TempCtor: any = (fabric as any).StaticCanvas || (fabric as any).Canvas;
      const tempCanvas: FabricCanvasLike = new TempCtor(el, { width: 450, height: 500 });
      try {
        const enlivened = await enlivenAsync(objects);
        enlivened.forEach((obj) => tempCanvas.add?.(obj));
        return toDataUrlSafe(tempCanvas);
      } finally {
        try {
          tempCanvas.dispose?.();
        } catch {}
        el.remove?.();
      }
    } catch (e) {
      console.error("getCanvasTextureFromStorage failed", e);
      return null;
    }
  },

  debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  },
};
