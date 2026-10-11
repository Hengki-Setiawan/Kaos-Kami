"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { fetchJson } from "@/lib/fetchJson";
import { PRODUCT_COLORS, type ApparelType, type DecalTargetSide } from "@/lib/constants";
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
  const editCatalogId = params.get("editCatalogId");
  const apparelParam = params.get("apparel");
  const colorParam = params.get("color");
  const decalFrontParam = params.get("decalFront");
  const decalBackParam = params.get("decalBack");
  const printSizeParam = params.get("printSize");
  const titleParam = params.get("title");

  const [notice, setNotice] = useState<string | null>(null);
  const doneRef = useRef<string | null>(null);
  const mockupDoneRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Deep-link A: Muat Aset Mockup 3D dari Parameter URL (Katalog Distro / Admin 3D Builder)
  useEffect(() => {
    if (designId) return; // Prioritaskan designId jika ada
    if (!decalFrontParam && !decalBackParam && !colorParam && !apparelParam) return;

    const mockupKey = `${apparelParam}_${colorParam}_${decalFrontParam}_${decalBackParam}_${printSizeParam}`;
    if (mockupDoneRef.current === mockupKey) return;
    mockupDoneRef.current = mockupKey;

    const say = (msg: string) => {
      setNotice(msg);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNotice(null), 4000);
    };

    const st = useConfiguratorStore.getState();

    // 1. Terapkan model pakaian jika valid
    if (apparelParam && (VALID_APPARELS as readonly string[]).includes(apparelParam)) {
      st.setActiveApparel(apparelParam as ApparelType);
    }

    // 2. Terapkan warna kain jika ada (dengan decoding URL aman & pencocokan palet)
    if (colorParam) {
      let cleanHex = colorParam.trim();
      try {
        cleanHex = decodeURIComponent(cleanHex).trim();
      } catch {}
      if (cleanHex && !cleanHex.startsWith("#") && !cleanHex.startsWith("rgb")) {
        cleanHex = "#" + cleanHex;
      }

      const matched = PRODUCT_COLORS.find((c) => c.hex.toLowerCase() === cleanHex.toLowerCase());
      const colorLabel =
        matched?.name ||
        (cleanHex.toLowerCase() === "#e65100" ? "Oranye Makassar" : "Warna Custom");
      st.setColorMode("single");
      st.setSelectedColor(cleanHex, colorLabel);
    }

    // 3. Muat decal sablon mockup (depan & belakang)
    const newDecals: any[] = [];
    const sizeScaleMap: Record<string, number> = {
      A6: 0.12,
      A5: 0.18,
      A4: 0.26,
      A3: 0.35,
    };
    const scale = sizeScaleMap[printSizeParam?.toUpperCase() || "A4"] || 0.26;

    const frontY = apparelParam === "hoodie" ? -0.04 : -0.02;

    if (decalFrontParam) {
      newDecals.push({
        id: "mockup-front-decal",
        url: decalFrontParam,
        name: titleParam ? `${titleParam} (Depan)` : "Sablon Mockup Depan",
        targetSide: "front",
        x: 0,
        y: frontY,
        scale,
        rotation: 0,
        opacity: 1,
      });
    }

    if (decalBackParam) {
      newDecals.push({
        id: "mockup-back-decal",
        url: decalBackParam,
        name: titleParam ? `${titleParam} (Belakang)` : "Sablon Mockup Belakang",
        targetSide: "back",
        x: 0,
        y: 0.0,
        scale,
        rotation: 0,
        opacity: 1,
      });
    }

    if (newDecals.length > 0) {
      st.loadDecals(newDecals);
    }
    say(
      editCatalogId
        ? `Mode Admin: Mockup 3D "${titleParam || "Produk"}" siap diedit. Tekan tombol PERBARUI KE ETALASE di kanan atas setelah selesai.`
        : titleParam
          ? `Aset Mockup 3D "${titleParam}" berhasil dimuat di Studio!`
          : "Aset Mockup 3D Apparel & Sablon berhasil dimuat di Studio!"
    );
  }, [designId, editCatalogId, apparelParam, colorParam, decalFrontParam, decalBackParam, printSizeParam, titleParam]);

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
    // Deep-link lokal dulu: id lokal ATAU serverId yg sudah tersinkron
    // (tamu/offline + lintas-perangkat tanpa fetch bila sudah ada lokal).
    try {
      const st0 = useConfiguratorStore.getState();
      const local = st0.savedDesigns.find((d) => d.id === designId || d.serverId === designId);
      if (local) {
        st0.loadSavedDesign(local.id);
        say(`Desain "${local.title}" dimuat dari koleksi. Silakan edit / checkout.`);
        return;
      }
    } catch {}
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
        st.setEditingDesign(found.id, found.title);
        const decalsJson = typeof found.decals === "string" ? JSON.parse(found.decals || "[]") : found.decals || [];
        const apparel = VALID_APPARELS.includes(found.category?.slug) ? found.category.slug : "tshirt";
        st.setActiveApparel(apparel as ApparelType);
        st.setSelectedColor(found.colorHex || "#121214", found.colorName || "Custom");
        st.setSelectedSize(found.size || "L");
        // B-02: validasi sisi SSOT — "hood" HANYA hoodie. Di apparel lain
        // migrasikan ke front (jangan hilangkan karya) + hitung untuk notifikasi.
        const VALID_SIDES: DecalTargetSide[] = [
          "front",
          "back",
          "side_left",
          "side_right",
          "left_sleeve",
          "right_sleeve",
          "hood",
        ];
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
    <div className="fixed top-20 right-4 sm:right-6 z-40 max-w-sm px-4 py-3 rounded-2xl bg-surface/95 backdrop-blur-xl border border-brand-accent/40 text-text-primary font-sans text-xs shadow-2xl animate-in fade-in slide-in-from-top-3 flex items-start gap-2.5">
      <Sparkles size={16} className="text-brand-accent shrink-0 mt-0.5" />
      <span className="flex-1 leading-snug font-medium text-[11px]">{notice}</span>
      <button
        onClick={() => setNotice(null)}
        className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
        aria-label="Tutup notifikasi"
      >
        <X size={13} />
      </button>
    </div>
  );
}
