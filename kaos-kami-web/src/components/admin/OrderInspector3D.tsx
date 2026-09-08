"use client";
import React, { useEffect } from "react";
import * as THREE from "three";
import { CanvasStage } from "@/components/3d/CanvasStage";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import type { DecalLayer } from "@/lib/constants";

export interface InspectorSeed {
  decals: DecalLayer[];
  colorHex: string;
  colorName: string;
  size: string;
  apparel: "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt";
}

// Inspector 360°: tampilkan DESAIN ASLI pesanan (bukan model generik).
// Seed ke store global saat mount + kembalikan snapshot saat unmount agar
// state Studio tidak tertimpa (audit H1/H12).
export default function OrderInspector3D({ seed }: { seed: InspectorSeed | null }) {
  const camPos = new THREE.Vector3(0, 0.12, 2.4);
  const lookAt = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    if (!seed) return;
    const s = useConfiguratorStore.getState();
    const snap = {
      decals: s.decals,
      selectedColor: s.selectedColor,
      activeColorName: s.activeColorName,
      selectedSize: s.selectedSize,
      activeApparel: s.activeApparel,
    };
    s.setActiveApparel(seed.apparel);
    s.setSelectedColor(seed.colorHex, seed.colorName);
    s.setSelectedSize(seed.size);
    s.loadDecals(seed.decals);
    return () => {
      const cur = useConfiguratorStore.getState();
      cur.setActiveApparel(snap.activeApparel);
      cur.setSelectedColor(snap.selectedColor, snap.activeColorName);
      cur.setSelectedSize(snap.selectedSize);
      cur.loadDecals(snap.decals);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CanvasStage camPos={camPos} lookAtPos={lookAt} />;
}
