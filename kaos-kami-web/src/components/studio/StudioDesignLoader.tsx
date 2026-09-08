"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import type { ApparelType } from "@/lib/constants";

/**
 * Memuat desain tersimpan (?designId=) ke studio: apparel, warna, size,
 * dan semua decal. Sekali jalan per designId.
 */
export function StudioDesignLoader() {
  const params = useSearchParams();
  const designId = params.get("designId");
  const [notice, setNotice] = useState<string | null>(null);
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!designId || doneRef.current === designId) return;
    doneRef.current = designId;
    (async () => {
      try {
        const res = await fetch("/api/designs");
        const data = await res.json();
        const list = data.designs || [];
        const found = list.find((d: any) => d.id === designId);
        if (!found) {
          setNotice("Desain tidak ditemukan / bukan milikmu.");
          setTimeout(() => setNotice(null), 4000);
          return;
        }
        const st = useConfiguratorStore.getState();
        const decalsJson = typeof found.decals === "string" ? JSON.parse(found.decals || "[]") : found.decals || [];
        st.setActiveApparel(found.category?.slug as ApparelType);
        st.setSelectedColor(found.colorHex, found.colorName);
        st.setSelectedSize(found.size);
        for (const d of st.decals) st.removeDecal(d.id);
        for (const d of decalsJson) {
          st.addDecal({
            url: d.url,
            name: d.name || "Sablon",
            targetSide: d.targetSide || "front",
            x: d.x ?? 0,
            y: d.y ?? 0,
            scale: d.scale ?? 0.12,
            rotation: d.rotation ?? 0,
            opacity: d.opacity ?? 1,
          });
        }
        setNotice(`Desain "${found.title}" dimuat. Silakan edit / checkout.`);
        setTimeout(() => setNotice(null), 4000);
      } catch {
        setNotice("Gagal memuat desain.");
        setTimeout(() => setNotice(null), 4000);
      }
    })();
  }, [designId]);

  if (!notice) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-[#141416]/95 border border-brand-accent/40 text-white font-mono text-xs shadow-xl">
      {notice}
    </div>
  );
}
