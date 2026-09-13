"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { fetchJson } from "@/lib/fetchJson";
import type { ApparelType, DecalTargetSide } from "@/lib/constants";
import { clampDecalXY, maxDecalScaleUnits, REAL_WORLD_PRINT_LIMITS } from "@/lib/scaleCalibration";

// Coming-soon (cap/pants/shorts) ikut dimuat apa adanya agar desain yang
// disimpan dari dashboard bisa dibuka kembali di mesh yang benar (dulu
// jatuh ke tshirt = mesh salah). Guard orderable checkout tak tersentuh.
const VALID_APPARELS = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"] as const;

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
        // B-02: validasi sisi SSOT — "hood" HANYA hoodie. Di apparel lain
        // migrasikan ke front (jangan hilangkan karya) + hitung untuk notifikasi.
        // Jepit posisi via clampDecalXY + skala via maxDecalScaleUnits(apparel,
        // side) — bukan global ±0.35/0.35. Rumus cm tak diubah.
        const VALID_SIDES: DecalTargetSide[] = ["front", "back", "left_sleeve", "right_sleeve", "hood"];
        let migratedHood = 0;
        st.loadDecals(
          (Array.isArray(decalsJson) ? decalsJson : []).slice(0, 10).map((d: any, i: number) => {
            const rawSide: DecalTargetSide = VALID_SIDES.includes(d.targetSide) ? d.targetSide : "front";
            let side = rawSide;
            if (side === "hood" && apparel !== "hoodie") {
              side = "front";
              migratedHood += 1;
            }
            const jepit = clampDecalXY(side, Number(d.x) || 0, Number(d.y) || 0);
            const maxS = maxDecalScaleUnits(apparel, side);
            const scale = Math.max(
              REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits,
              Math.min(maxS, Number(d.scale) || 0.12)
            );
            const pw = Number(d?.printPx?.w);
            const ph = Number(d?.printPx?.h);
            return {
              id: typeof d.id === "string" ? d.id : `loaded-${i}`,
              url: String(d.url || ""),
              name: String(d.name || "Sablon").slice(0, 40),
              targetSide: side,
              x: jepit.x,
              y: jepit.y,
              scale,
              rotation: Math.max(-180, Math.min(180, Number(d.rotation) || 0)),
              opacity: Math.max(0, Math.min(1, d.opacity ?? 1)),
              // Pertahankan aspek master bila ada (badge/pricing jujur).
              ...(pw > 0 && ph > 0 ? { printPx: { w: Math.round(pw), h: Math.round(ph) } } : {}),
            };
          })
        );
        say(
          migratedHood > 0
            ? `Desain "${found.title}" dimuat. ${migratedHood} sablon tudung dipindah ke depan (apparel ini tak bertudung).`
            : `Desain "${found.title}" dimuat. Silakan edit / checkout.`
        );
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
