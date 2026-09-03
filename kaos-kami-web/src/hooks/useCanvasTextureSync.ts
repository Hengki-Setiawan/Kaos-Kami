"use client";
import { useCallback, useEffect, useState } from "react";
import { canvasSyncManager } from "@/lib/canvasSyncManager";
import type * as fabric from "fabric";

interface Options {
  frontCanvas: fabric.Canvas | null;
  backCanvas: fabric.Canvas | null;
  selectedView?: "front" | "back";
}

export function useCanvasTextureSync(options: Options) {
  const { frontCanvas, backCanvas, selectedView = "front" } = options;
  const [designTextureFront, setDesignTextureFront] = useState<string | null>(null);
  const [designTextureBack, setDesignTextureBack] = useState<string | null>(null);

  useEffect(() => {
    const canvasMap: Record<string, { canvas: fabric.Canvas | null; setter: (v: string | null) => void }> = {
      front: { canvas: frontCanvas, setter: setDesignTextureFront },
      back: { canvas: backCanvas, setter: setDesignTextureBack },
    };
    const criticalEvents = ["object:modified", "object:added", "object:removed"] as const;

    const updateTexture = async (view: "front" | "back") => {
      const { canvas, setter } = canvasMap[view]!;
      if (!canvas) return;
      try {
        const hasObjects = (canvas as any).getObjects().length > 0;
        if (!hasObjects) return;
        const texture =
          selectedView === view
            ? canvasSyncManager.getCanvasTexture(canvas)
            : await canvasSyncManager.getCanvasTextureFromStorage(view);
        setter(texture as string | null);
      } catch (e) {
        console.error(`${view} texture update failed`, e);
      }
    };

    const debouncedFront = canvasSyncManager.debounce(() => updateTexture("front"), 100);
    const debouncedBack = canvasSyncManager.debounce(() => updateTexture("back"), 100);

    if (frontCanvas) criticalEvents.forEach((ev) => (frontCanvas as any).on(ev, debouncedFront));
    if (backCanvas) criticalEvents.forEach((ev) => (backCanvas as any).on(ev, debouncedBack));

    updateTexture("front");
    updateTexture("back");

    return () => {
      if (frontCanvas) criticalEvents.forEach((ev) => (frontCanvas as any).off(ev, debouncedFront));
      if (backCanvas) criticalEvents.forEach((ev) => (backCanvas as any).off(ev, debouncedBack));
    };
  }, [frontCanvas, backCanvas, selectedView]);

  const manualTriggerSync = useCallback(
    async (view: "front" | "back" = "front") => {
      const map: any = {
        front: { canvas: frontCanvas, setter: setDesignTextureFront },
        back: { canvas: backCanvas, setter: setDesignTextureBack },
      };
      const { canvas, setter } = map[view];
      if (!canvas) return;
      try {
        const texture = canvasSyncManager.getCanvasTexture(canvas);
        if (texture) setter(texture);
      } catch (e) {
        console.error(`Manual ${view} sync failed`, e);
      }
    },
    [frontCanvas, backCanvas]
  );

  return { designTextureFront, designTextureBack, manualTriggerSync };
}
