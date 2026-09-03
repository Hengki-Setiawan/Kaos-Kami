/**
 * Port dari vihan-tshirt-designer src/utils/canvasSyncManager.js
 * Fabric.js 6.5.4 → CanvasTexture sync ke R3F Decal
 */
import * as fabric from "fabric";

export const canvasSyncManager = {
  getCanvasTexture: (fabricCanvas: fabric.Canvas | null): string | null => {
    if (!fabricCanvas) return null;
    try {
      fabricCanvas.renderAll();
      const dataURL = (fabricCanvas as any).toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
        enableRetinaScaling: true,
      });
      return dataURL;
    } catch (e) {
      console.error("getCanvasTexture failed", e);
      return null;
    }
  },

  getCanvasTextureFromStorage: (view: "front" | "back"): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const key = view === "front" ? "kaos_kami_front_canvas" : "kaos_kami_back_canvas";
        const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
        if (!stored) return resolve(null);
        const parsed = JSON.parse(stored);
        const tempCanvas = new fabric.Canvas(null as any, { width: 450, height: 500 });
        (fabric as any).util.enlivenObjects(
          parsed,
          (objects: any[]) => {
            objects.forEach((obj) => tempCanvas.add(obj));
            const dataURL = (tempCanvas as any).toDataURL({
              format: "png",
              quality: 1,
              multiplier: 1,
              enableRetinaScaling: true,
            });
            resolve(dataURL);
          },
          () => resolve(null)
        );
      } catch (e) {
        console.error("getCanvasTextureFromStorage failed", e);
        resolve(null);
      }
    });
  },

  debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  },
};
