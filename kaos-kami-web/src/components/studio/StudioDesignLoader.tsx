"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { fetchJson } from "@/lib/fetchJson";
import type { ApparelType } from "@/lib/constants";

const VALID_APPARELS = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"] as const;

/**
 * Memuat desain tersimpan (?designId=) ke studio via endpoint by-id
 * (audit #14 — sebelumnya fetch SEMUA desain + find di client).
 */
export function StudioDesignLoader() {
  const params = useSearchParams();
  const designId = params.get("designId");
  const [notice, setNotice] = useState<string | null>(null);
  const doneRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!designId || doneRef.current === designId) return;
    // Validasi ID dulu (audit #14 — slug tanpa validasi).
    if (!/^[A-Za-z0-9_-]{5,64}$/.test(designId)) {
      setNotice("ID desain tidak valid.");
      return;
    }
    doneRef.current = designId;
    const say = (msg: string) => {
      setNotice(msg);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNotice(null), 4000);
    };
    (async () => {
      try {
        const data = await fetchJson<{ design?: any }>(
          `/api/designs/${encodeURIComponent(designId)}`,
          undefined,
          15000
        );
        const found = data.design;
        if (!found) {
          say("Desain tidak ditemukan / bukan milikmu.");
          return;
        }
        const st = useConfiguratorStore.getState();
        const decalsJson = typeof found.decals === "string" ? JSON.parse(found.decals || "[]") : found.decals || [];
        const apparel = VALID_APPARELS.includes(found.category?.slug) ? found.category.slug : "tshirt";
        st.setActiveApparel(apparel as ApparelType);
        st.setSelectedColor(found.colorHex || "#121214", found.colorName || "Custom");
        st.setSelectedSize(found.size || "L");
        st.loadDecals(
          (Array.isArray(decalsJson) ? decalsJson : []).slice(0, 10).map((d: any, i: number) => ({
            id: typeof d.id === "string" ? d.id : `loaded-${i}`,
            url: String(d.url || ""),
            name: String(d.name || "Sablon").slice(0, 40),
            targetSide: ["front", "back", "left_sleeve", "right_sleeve"].includes(d.targetSide) ? d.targetSide : "front",
            x: Math.max(-0.35, Math.min(0.35, Number(d.x) || 0)),
            y: Math.max(-0.35, Math.min(0.35, Number(d.y) || 0)),
            scale: Math.min(0.35, Math.max(0.04, Number(d.scale) || 0.12)),
            rotation: Math.max(-180, Math.min(180, Number(d.rotation) || 0)),
            opacity: Math.max(0, Math.min(1, d.opacity ?? 1)),
          }))
        );
        say(`Desain "${found.title}" dimuat. Silakan edit / checkout.`);
      } catch (e: any) {
        say(e?.message || "Gagal memuat desain.");
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
