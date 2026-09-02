"use client";
import { useEffect, useRef } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { scheduleAutosave, hydrateFromServer, claimGuestDesigns } from "@/lib/designSync";

export const DesignSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const decals = useConfiguratorStore((s) => s.decals);
  const activeApparel = useConfiguratorStore((s) => s.activeApparel);
  const selectedColor = useConfiguratorStore((s) => s.selectedColor);
  const selectedSize = useConfiguratorStore((s) => s.selectedSize);
  const viewMode = useConfiguratorStore((s) => s.viewMode);
  const hasHydrated = useRef(false);

  // Hydrate once on mount
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    hydrateFromServer();
    claimGuestDesigns();
  }, []);

  // Autosave debounce 1.5s when in studio mode and decals/color/size changes
  useEffect(() => {
    if (viewMode !== "studio") return;
    // Don't autosave empty state on initial load
    if (decals.length === 0 && activeApparel === "tshirt") return;
    scheduleAutosave();
  }, [decals, activeApparel, selectedColor, selectedSize, viewMode]);

  return <>{children}</>;
};
