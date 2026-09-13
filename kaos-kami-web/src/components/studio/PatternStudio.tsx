"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import type { ApparelType, DecalLayer } from "@/lib/constants";
import {
  EDITOR_PX_PER_CM,
  getPanelGeometry,
  PX_PER_CM_300DPI,
  type PatternPanel,
} from "@/lib/patternGeometry";
import { getPatternSilhouette } from "@/lib/patternSilhouette";
import { decalToFabric, fabricToDecal } from "@/lib/patternSync";
import { fetchJson } from "@/lib/fetchJson";
import { compressImageClient } from "@/lib/enhancers/compressImage";
import { getImageSize, getMasterDataUrl, setMasterDataUrl } from "@/lib/imageEditPipeline";
import { generateTextDecalDataUrl } from "@/lib/typography/textDecalGenerator";
import { composePrintFileTiled, exportScaleFactor, PRINT_EXPORT_LIMITS } from "@/lib/printUV";
import { clampDecalXY, maxDecalScaleUnits, REAL_WORLD_PRINT_LIMITS } from "@/lib/scaleCalibration";

const PANELS: Array<{ id: PatternPanel; label: string; hoodOnly?: boolean }> = [
  { id: "front", label: "Depan" },
  { id: "back", label: "Belakang" },
  { id: "left_sleeve", label: "Lengan Kiri" },
  { id: "right_sleeve", label: "Lengan Kanan" },
  { id: "hood", label: "Tudung", hoodOnly: true },
];

function silhouetteDataUrl(apparel: ApparelType, panel: PatternPanel): string {
  const g = getPanelGeometry(apparel, panel);
  const s = getPatternSilhouette(apparel, panel);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}" width="${g.wCm * EDITOR_PX_PER_CM}" height="${g.hCm * EDITOR_PX_PER_CM}">` +
    `<path d="${s.body}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" stroke-width="0.35"/>` +
    s.details.map((d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.3"/>`).join("") +
    s.stitches.map((d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.25" stroke-dasharray="1.2 1"/>`).join("") +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Ukuran alami gambar (untuk rasio aspek). */
function naturalSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = url;
  });
}

/**
 * POLA 2D — editor datar skala-cm per panel (depan/belakang/lengan).
 * Satu data dengan 3D: setiap objek di sini = satu DecalLayer di store
 * (geser di 2D → 3D ikut live, dan sebaliknya via refresh).
 */
export const PatternStudio: React.FC = () => {
  const {
    activeApparel,
    decals,
    addDecal,
    updateDecal,
    removeDecal,
    selectedDecalId,
    setSelectedDecalId,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      decals: s.decals,
      addDecal: s.addDecal,
      updateDecal: s.updateDecal,
      removeDecal: s.removeDecal,
      selectedDecalId: s.selectedDecalId,
      setSelectedDecalId: s.setSelectedDecalId,
    }))
  );
  const [panel, setPanel] = useState<PatternPanel>("front");
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // M3.7 — DPI aktual ekspor terakhir (jujur pasca-cap/tiled) untuk label dinamis.
  const [lastActualDpi, setLastActualDpi] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const syncingRef = useRef(false);
  const decalsRef = useRef(decals);
  decalsRef.current = decals;

  const geo = getPanelGeometry(activeApparel, panel);
  const canvasW = Math.round(geo.wCm * EDITOR_PX_PER_CM);
  const canvasH = Math.round(geo.hCm * EDITOR_PX_PER_CM);

  // M3.7 — Label jujur: DPI teoritis area sablon panel ini (batas bawah;
  // bbox artwork kecil bisa lebih tinggi, A3 ter-cap lebih rendah).
  // Rumus sama dengan composePrintFile (contain, proporsi dipertahankan).
  const panelLabelDpi = (() => {
    try {
      const rawW = Math.max(1, (geo.printWcm / 2.54) * 300);
      const rawH = Math.max(1, (geo.printHcm / 2.54) * 300);
      const kk = exportScaleFactor(rawW, rawH);
      const wPx = Math.max(1, Math.round(rawW * kk));
      const hPx = Math.max(1, Math.round(rawH * kk));
      return Math.round((wPx / (geo.printWcm / 2.54) + hPx / (geo.printHcm / 2.54)) / 2);
    } catch {
      return 300;
    }
  })();
  const labelDpi = lastActualDpi ?? panelLabelDpi;

  // Bangun ulang kanvas saat apparel/panel berubah.
  useEffect(() => {
    let mounted = true;
    let canvas: any = null;
    (async () => {
      try {
        const fabric = await import("fabric");
        if (!mounted || !canvasRef.current) return;
        if (fabricRef.current) {
          try { fabricRef.current.dispose(); } catch {}
          fabricRef.current = null;
        }
        canvas = new (fabric as any).Canvas(canvasRef.current, {
          width: canvasW,
          height: canvasH,
          backgroundColor: "#141416",
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;

        // Latar siluet pola + bingkai batas sablon (tak bisa dipilih).
        const bgUrl = silhouetteDataUrl(activeApparel, panel);
        const bgImg = await (fabric as any).FabricImage.fromURL(bgUrl);
        bgImg.set({ selectable: false, evented: false, excludeFromExport: false });
        canvas.backgroundImage = bgImg;

        const printW = geo.printWcm * EDITOR_PX_PER_CM;
        const printH = geo.printHcm * EDITOR_PX_PER_CM;
        const bounds = new (fabric as any).Rect({
          left: canvasW / 2,
          top: canvasH / 2,
          width: printW,
          height: printH,
          originX: "center",
          originY: "center",
          fill: "rgba(16,185,129,0.04)",
          stroke: "rgba(16,185,129,0.7)",
          strokeWidth: 1,
          strokeDashArray: [5, 4],
          selectable: false,
          evented: false,
          name: "__printBounds",
        });
        canvas.add(bounds);
        const label = new (fabric as any).Text(
          `${geo.printWcm}×${geo.printHcm}cm`,
          { left: canvasW / 2, top: canvasH / 2 - printH / 2 - 10, fontSize: 10, fill: "#10b981", originX: "center", originY: "center", selectable: false, evented: false, name: "__printLabel" }
        );
        canvas.add(label);

        // M4.3 — SNAPPING MAGNETIS (UI-only, TANPA ubah SSOT master/patternSync).
        // Saat drag, posisi objek dijepit ke tengah/tepi area cetak bila dalam
        // SNAP_THRESHOLD_PX (6px editor); guideline merah sementara menandai
        // sumbu yang ke-snap. Alur SSOT tak berubah: posisi snap mengalir lewat
        // pushToStoreSync yang sama (fabricToDecal → clampDecalXY → updateDecal).
        // Guideline bernama __snapGuide + excludeFromExport + tanpa decalId →
        // tak ikut ekspor master (exportPanelMaster hanya memungut o.decalId).
        const SNAP_THRESHOLD_PX = 6;
        let snapGuides: any[] = [];
        const clearSnapGuides = () => {
          try {
            for (const g of snapGuides) canvas.remove(g);
          } catch {}
          snapGuides = [];
        };
        const applyMagneticSnap = (obj: any) => {
          try {
            for (const g of snapGuides) canvas.remove(g);
          } catch {}
          snapGuides = [];
          const cx = canvasW / 2;
          const cy = canvasH / 2;
          const pW = geo.printWcm * EDITOR_PX_PER_CM;
          const pH = geo.printHcm * EDITOR_PX_PER_CM;
          const targetsX = [cx - pW / 2, cx, cx + pW / 2];
          const targetsY = [cy - pH / 2, cy, cy + pH / 2];
          const left = typeof obj.left === "number" ? obj.left : cx;
          const top = typeof obj.top === "number" ? obj.top : cy;
          let halfW = 0;
          let halfH = 0;
          try {
            halfW = (obj.getScaledWidth?.() ?? 0) / 2;
            halfH = (obj.getScaledHeight?.() ?? 0) / 2;
          } catch {}
          // Kandidat objek (tepi-kiri/tengah/tepi-kanan) vs tiap target cetak;
          // ambil delta terkecil dalam threshold per sumbu (X & Y independen).
          let bestDX = 0;
          let bestDY = 0;
          let guideX: number | null = null;
          let guideY: number | null = null;
          for (const t of targetsX) {
            for (const c of [left - halfW, left, left + halfW]) {
              const d = t - c;
              if (Math.abs(d) <= SNAP_THRESHOLD_PX && (guideX === null || Math.abs(d) < Math.abs(bestDX))) {
                bestDX = d;
                guideX = t;
              }
            }
          }
          for (const t of targetsY) {
            for (const c of [top - halfH, top, top + halfH]) {
              const d = t - c;
              if (Math.abs(d) <= SNAP_THRESHOLD_PX && (guideY === null || Math.abs(d) < Math.abs(bestDY))) {
                bestDY = d;
                guideY = t;
              }
            }
          }
          if (guideX !== null) obj.set({ left: left + bestDX });
          if (guideY !== null) obj.set({ top: top + bestDY });
          try { obj.setCoords?.(); } catch {}
          // Guideline sementara sepanjang area cetak pada sumbu yang ke-snap.
          try {
            const F = fabric as any;
            if (guideX !== null) {
              const v = new F.Line([guideX, cy - pH / 2, guideX, cy + pH / 2], {
                stroke: "rgba(244,63,94,0.9)",
                strokeWidth: 1,
                strokeDashArray: [4, 3],
                selectable: false,
                evented: false,
                excludeFromExport: true,
                name: "__snapGuide",
              });
              canvas.add(v);
              snapGuides.push(v);
            }
            if (guideY !== null) {
              const h = new F.Line([cx - pW / 2, guideY, cx + pW / 2, guideY], {
                stroke: "rgba(244,63,94,0.9)",
                strokeWidth: 1,
                strokeDashArray: [4, 3],
                selectable: false,
                evented: false,
                excludeFromExport: true,
                name: "__snapGuide",
              });
              canvas.add(h);
              snapGuides.push(h);
            }
          } catch {}
        };

        // M3.1 — Muat MASTER produksi ke Fabric (bukan preview 1200px).
        // Preview downscale menipu: ekspor komposit dari preview = cetak blur.
        // getMasterDataUrl(id, url) = master resolusi penuh; fallback preview
        // bila master belum ada (kontrak lama, badge jujur di bawah).
        const sideDecals = decalsRef.current.filter((d) => (d.targetSide as string) === panel);
        for (const d of sideDecals) {
          try {
            const srcUrl = getMasterDataUrl(d.id, d.url);
            const nat = await naturalSize(srcUrl);
            // Aspek natural disimpan per objek (kontrak patternSync — tahan
            // AABB rotasi/stretch, audit #19). Fallback ke printPx bila ada.
            const natAspect = d.printPx?.w && d.printPx?.h
              ? d.printPx.w / d.printPx.h
              : nat.w / nat.h;
            const p = decalToFabric(activeApparel, d, natAspect);
            const img = await (fabric as any).FabricImage.fromURL(srcUrl);
            img.set({
              left: canvasW / 2 + p.cxPx,
              top: canvasH / 2 + p.cyPx,
              originX: "center",
              originY: "center",
              angle: p.rotation,
              opacity: p.opacity,
            });
            img.scaleToWidth(p.wPx);
            (img as any).decalId = d.id;
            (img as any).aspectWoverH = natAspect;
            canvas.add(img);
          } catch {}
        }

        // Throttle rAF: event moving/scaling menembak tiap piksel (audit #40).
        let rafPending = false;
        let lastObj: any = null;
        const pushToStore = (obj: any) => {
          lastObj = obj;
          if (rafPending) return;
          rafPending = true;
          requestAnimationFrame(() => {
            rafPending = false;
            const target = lastObj;
            lastObj = null;
            if (!target || !mounted || !fabricRef.current) return;
            pushToStoreSync(target);
          });
        };
        const pushToStoreSync = (obj: any) => {
          // Kunci uniform: stretch 1-sisialat distorsi artwork — normalisasi ke
          // sisi panjang (kontrak patternSync, audit #19).
          try {
            if (obj && obj.scaleX && obj.scaleY && Math.abs(obj.scaleX - obj.scaleY) > 1e-6) {
              obj.set({ scaleY: obj.scaleX });
            }
          } catch {}
          const id = (obj as any).decalId as string | undefined;
          if (!id || syncingRef.current) return;
          const target = decalsRef.current.find((x) => x.id === id);
          if (!target) return;
          const cxPx = (obj.left ?? 0) - canvasW / 2;
          const cyPx = (obj.top ?? 0) - canvasH / 2;
          const wPx = (obj.getScaledWidth?.() ?? 10);
          const hPx = (obj.getScaledHeight?.() ?? 10);
          // B-04: teruskan aspek natural + opacity (kontrak patternSync).
          // Aspek dari objek (disimpan saat upload/muat); fallback ke bbox.
          const aspectOpt = (obj as any).aspectWoverH as number | undefined;
          const patch = fabricToDecal(activeApparel, cxPx, cyPx, wPx, hPx, obj.angle ?? 0, {
            ...(aspectOpt && aspectOpt > 0 ? { aspectWoverH: aspectOpt } : {}),
            ...(typeof obj.opacity === "number" ? { opacity: obj.opacity } : {}),
          });
          // Jepit SSOT per sisi (bukan global ±0.35 mentah) + jepit skala ke
          // batas cetak sisi ini. Rumus cm tak diubah — hanya satukan pemakaian.
          const jepit = clampDecalXY(target.targetSide as any, patch.x, patch.y);
          patch.x = jepit.x;
          patch.y = jepit.y;
          try {
            const maxS = maxDecalScaleUnits(activeApparel, target.targetSide as any);
            patch.scale = Math.max(
              REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits,
              Math.min(maxS, patch.scale)
            );
          } catch {}
          updateDecal(id, patch);
        };
        // M4.3 — snap magnetis dulu (visual kanvas), lalu throttle-sync ke
        // store seperti biasa (SSOT tak berubah).
        canvas.on("object:moving", (e: any) => {
          if (!e.target) return;
          try { applyMagneticSnap(e.target); } catch {}
          try { canvas.requestRenderAll(); } catch {}
          pushToStore(e.target);
        });
        canvas.on("object:scaling", (e: any) => e.target && pushToStore(e.target));
        canvas.on("object:rotating", (e: any) => e.target && pushToStore(e.target));
        // M4.3 — drag selesai → hapus guideline sementara (tak tersimpan).
        canvas.on("object:modified", (e: any) => {
          try { clearSnapGuides(); } catch {}
          if (e.target) pushToStore(e.target);
        });
        canvas.on("mouse:up", () => { try { clearSnapGuides(); } catch {} });
        canvas.on("selection:created", (e: any) => {
          const id = (e.selected?.[0] as any)?.decalId;
          if (id) setSelectedDecalId(id);
        });
        canvas.on("selection:cleared", () => {});
        canvas.renderAll();
      } catch (e: any) {
        if (mounted) setStatus(`Kanvas 2D gagal dimuat: ${e?.message || e}`);
      }
    })();
    return () => {
      mounted = false;
      // Dispose kanvas Fabric saat unmount/ganti panel (audit #40 —
      // sebelumnya listener + WebGL context bocor tiap rebuild).
      try {
        fabricRef.current?.dispose();
      } catch {}
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApparel, panel]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flash = (msg: string) => {
    setStatus(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setStatus(null), 3500);
  };

  const handleUpload = useCallback(async (file: File) => {
    try {
      // B-01: kontrak SATU compressImageClient — { dataUrl (preview hemat utk
      // 3D/DB), masterDataUrl (file asli utk produksi), previewDpiAt30cm,
      // masterDpiAt30cm }. Koreksi EXIF otomatis di dalam helper
      // (createImageBitmap imageOrientation:from-image; foto portrait HP tak
      // lagi miring). Preview→decal.url, master→registry + printPx, badge
      // SELALU dari master (jujur untuk cetak, bukan preview 1200px).
      const r = await compressImageClient(file, { maxDimension: 1200, quality: 0.9 });
      const previewUrl = r.dataUrl;
      const masterUrl = r.masterDataUrl ?? r.dataUrl;
      const masterDpi = r.masterDpiAt30cm ?? r.previewDpiAt30cm;
      const aspect = r.width > 0 && r.height > 0 ? r.width / r.height : 1;
      // Buat di store dulu (3D ikut muncul), lalu pasang di kanvas.
      const id = addDecal({
        url: previewUrl,
        name: file.name.slice(0, 24) || "Upload 2D",
        targetSide: panel as DecalLayer["targetSide"],
        x: 0, y: 0.02, scale: 0.12, rotation: 0, opacity: 1,
      });
      // Master produksi terpisah (best-effort) + dimensi master→printPx agar
      // badge DPI & pricing 6-variabel jujur (aspek riil, bukan 1.0).
      try { setMasterDataUrl(id, masterUrl); } catch {}
      void getImageSize(masterUrl)
        .then((sz) => { try { updateDecal(id, { printPx: { w: sz.w, h: sz.h } }); } catch {} })
        .catch(() => {});
      const canvas = fabricRef.current;
      if (canvas) {
        const fabric = await import("fabric");
        const p = decalToFabric(activeApparel, { id, url: previewUrl, name: "", targetSide: panel as any, x: 0, y: 0.02, scale: 0.12, rotation: 0, opacity: 1 }, aspect);
        // M3.1: kanvas pola pegang MASTER (ekspor komposit = bitmap master).
        const img = await (fabric as any).FabricImage.fromURL(masterUrl);
        img.set({ left: canvasW / 2 + p.cxPx, top: canvasH / 2 + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        (img as any).aspectWoverH = aspect;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      if (typeof masterDpi === "number" && Number.isFinite(masterDpi)) {
        if (masterDpi < 150) flash(`Gambar masuk pola + 3D. ⚠️ Master ~${masterDpi} DPI @30cm — perkecil sablon / pakai file lebih tajam.`);
        else if (masterDpi < 300) flash(`Gambar masuk pola + 3D. Master ~${masterDpi} DPI @30cm — cukup untuk DTF.`);
        else flash(`Gambar masuk pola + 3D. ✅ Master ~${masterDpi} DPI @30cm — tajam & siap cetak.`);
      } else {
        flash("Gambar masuk pola + 3D.");
      }
    } catch (e: any) {
      flash(`Upload gagal: ${e?.message || e}`);
    }
  }, [activeApparel, addDecal, updateDecal, canvasW, panel]);

  // M3.5 — SATU mesin teks: generateTextDecalDataUrl (bukan raster Fabric
  // lokal 1024×256). Kedua pintu (drawer + pola ini) memanggil mesin yang
  // sama + setMasterDataUrl + printPx dari raster AKTUAL agar badge/pricing
  // jujur. Shadow default MATI (mesin), konsisten dengan drawer.
  const handleAddText = useCallback(async () => {
    const text = textInput.trim();
    if (!text) return;
    try {
      const fabric = await import("fabric");
      const canvas = fabricRef.current;
      const dataUrl = await generateTextDecalDataUrl({
        text,
        fontFamily: "streetwear-bold",
        textColor: "#ffffff",
      });
      if (!dataUrl) { flash("Teks kosong — tulis dulu."); return; }
      const sz = await getImageSize(dataUrl).catch(() => ({ w: 1024, h: 256 }));
      setTextInput("");
      const aspect = sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 4;
      const draft = {
        url: dataUrl, name: text.slice(0, 24) || "Teks",
        targetSide: panel as DecalLayer["targetSide"],
        x: 0, y: 0.05, scale: 0.14, rotation: 0, opacity: 1,
        // B-01/B-04: aspek natural + printPx agar badge/pricing tak fallback 1.0.
        printPx: { w: sz.w, h: sz.h },
      };
      const id = addDecal(draft);
      // Master teks = raster mesin (sama dengan preview; resolusi auto-fit).
      try { setMasterDataUrl(id, dataUrl); } catch {}
      if (canvas) {
        const p = decalToFabric(activeApparel, { id, ...draft }, aspect);
        const img = await (fabric as any).FabricImage.fromURL(dataUrl);
        img.set({ left: canvasW / 2 + p.cxPx, top: canvasH / 2 + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        (img as any).aspectWoverH = aspect;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      flash("Teks masuk pola + 3D.");
    } catch (e: any) {
      flash(`Teks gagal: ${e?.message || e}`);
    }
  }, [activeApparel, addDecal, canvasW, panel, textInput]);

  const handleDeleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject?.();
    const id = obj?.decalId as string | undefined;
    if (!id) { flash("Pilih dulu gambar/teks di pola."); return; }
    canvas.remove(obj);
    canvas.renderAll();
    removeDecal(id);
    flash("Dihapus dari pola + 3D.");
  }, [removeDecal]);

  /**
   * M3.2 — SATU SSOT master: jalur yang HIDUP (baca ini, bukan yang lain).
   * - Registry per-decal: imageEditPipeline masterMem + LS `decal:<id>`
   *   (upload drawer/pola/editor; https R2 bila login, base64 bila guest).
   * - Kanvas pola ini: memegang MASTER (M3.1, bukan preview) — ekspor komposit
   *   = bitmap master, bukan upscale preview.
   * - Ekspor ini → R2 via POST /api/upload/r2 (kind=master) → LS
   *   `<apparel>:<panel>` = { url (https), at, dpi, wCm, hCm (, tiles bila A3) }.
   * - Checkout: buildCheckoutMasterMap() gabung `<apparel>:<panel>` + `decal:<id>`
   *   https (maks 20, base64 TAK PERNAH ikut — payload <50KB).
   * - Guest: base64 di-hosting-kan server via POST /api/designs draft
   *   (meng-upload ke R2) — JANGAN kirim base64 ke /api/checkout (Zod tolak).
   * JALUR MATI (jangan pakai): direct-upload R2 dari browser (Missing token),
   *   composePrintFile satu-kanvas untuk A3 (OOM 70MB), klaim "300 DPI" pasca-cap.
   */
  const exportPanelMaster = useCallback(async (): Promise<string | null> => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    setExporting(true);
    try {
      const objs = canvas.getObjects().filter((o: any) => o.decalId);
      if (objs.length === 0) { flash("Panel ini kosong — tambah desain dulu."); return null; }
      // M3.1 — Gate jujur: tolak ekspor bila MASTER per-decal <150 DPI @30cm.
      // DPI master = sumbu terkecil px ÷ (30cm→inci). Preview 1200px tak dipakai.
      const sideDecals = decalsRef.current.filter((d) => (d.targetSide as string) === panel);
      for (const d of sideDecals) {
        try {
          const mUrl = getMasterDataUrl(d.id, d.url);
          const sz = d.printPx && d.printPx.w > 0 && d.printPx.h > 0
            ? d.printPx
            : await getImageSize(mUrl).catch(() => ({ w: 0, h: 0 }));
          if (sz.w > 0 && sz.h > 0) {
            const dpi30 = Math.round(Math.min(sz.w, sz.h) / (30 / 2.54));
            if (dpi30 < 150) {
              flash(`Ekspor ditolak: master "${d.name || d.id.slice(0, 8)}" hanya ~${dpi30} DPI @30cm (<150). Pakai file lebih tajam atau perkecil sablon — cetakan besar pasti pecah bila dipaksa.`);
              return null;
            }
          }
        } catch {
          // Best-effort — lanjutkan bila ukuran tak terbaca (badge menyusul).
        }
      }
      // BBox gabungan (px editor) + bleed 1cm.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const o of objs) {
        const r = o.getBoundingRect(true, true);
        minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.left + r.width); maxY = Math.max(maxY, r.top + r.height);
      }
      const bleed = EDITOR_PX_PER_CM; // 1cm
      minX = Math.max(0, minX - bleed); minY = Math.max(0, minY - bleed);
      maxX = Math.min(canvasW, maxX + bleed); maxY = Math.min(canvasH, maxY + bleed);
      const wPx = Math.max(10, maxX - minX), hPx = Math.max(10, maxY - minY);
      // Faktor ke 300 DPI dari skala editor (px/cm), dibatasi maks 4000px/sisi
      // agar HP kentang tak OOM (audit #40).
      const k = PX_PER_CM_300DPI / EDITOR_PX_PER_CM;
      const kCapped = Math.min(k, 4000 / Math.max(wPx, hPx));
      // DPI AKTUAL terhitung (jujur pasca-cap): k penuh = 300 DPI, kCapped
      // lebih kecil = DPI turun proporsional. JANGAN klaim 300 bila di-cap.
      const actualDpi = Math.round(kCapped * EDITOR_PX_PER_CM * 2.54);
      const fabric = await import("fabric");
      const off = new (fabric as any).StaticCanvas(null, {
        width: Math.round(wPx * kCapped), height: Math.round(hPx * kCapped),
        backgroundColor: "rgba(0,0,0,0)",
      });
      // Salin objek terpotong bbox dengan skala k.
      // B-04: Fabric 7 clone = Promise (bukan callback). Sertakan decalId +
      // aspectWoverH agar kontrak objek tetap utuh di kanvas offscreen.
      const cloneObjs: any[] = [];
      for (const o of objs) {
        const c: any = await (o as any).clone(["decalId", "aspectWoverH"]);
        c.set({ left: (o.left - minX) * kCapped, top: (o.top - minY) * kCapped });
        c.scaleX = (o.scaleX || 1) * kCapped;
        c.scaleY = (o.scaleY || 1) * kCapped;
        cloneObjs.push(c);
      }
      for (const c of cloneObjs) off.add(c);
      off.renderAll();
      const dataUrl = off.toDataURL({ format: "png" });
      const offW = off.width as number;
      const offH = off.height as number;
      off.dispose();
      const wCm = Math.round((wPx / EDITOR_PX_PER_CM) * 10) / 10;
      const hCm = Math.round((hPx / EDITOR_PX_PER_CM) * 10) / 10;
      // M3.7 — A3/besar via TILED (anti-OOM): komposisi penuh TAK PERNAH
      // dipegang sebagai satu kanvas raksasa. composePrintFileTiled me-render
      // per-tile langsung dari SUMBER (contain = proporsi dipertahankan +
      // letterbox transparan, JANGAN stretch), tiap tile ≤2048px (~16MB),
      // di-upload SEBUAH DEMI SEBUAH (puncak RAM ≈ 1 tile + sumber).
      const isLarge = offW * offH > PRINT_EXPORT_LIMITS.maxMegapixels * 1_000_000
        || Math.max(offW, offH) > PRINT_EXPORT_LIMITS.maxSidePx
        || Math.max(wCm, hCm) >= 29;
      let masterUrlToSave = "";
      let tileInfo: { cols: number; rows: number; urls: string[] } | null = null;
      if (isLarge) {
        const tiled = await composePrintFileTiled(dataUrl, wCm, hCm);
        const urls: string[] = [];
        for (const t of tiled.tiles) {
          // Sekuensial (bukan Promise.all) — puncak RAM + beban server kecil.
          const up = await fetchJson<{ success?: boolean; url?: string }>(
            "/api/upload/r2",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: t.dataUrl, kind: "master" }),
            },
            60000
          );
          if (!up.url) { flash(`Ekspor tiled gagal di tile ${t.col},${t.row}.`); return null; }
          urls.push(up.url);
        }
        tileInfo = { cols: tiled.cols, rows: tiled.rows, urls };
        masterUrlToSave = urls[0] as string;
        try { setLastActualDpi(tiled.dpi); } catch {}
        flash(`Master TILED ${wCm}×${hCm}cm @~${tiled.dpi}DPI tersimpan (${tiled.cols}×${tiled.rows} tile, contain — tanpa stretch).`);
      } else {
        // Upload via server (token R2 TIDAK PERNAH ke browser — audit: direct
        // upload dari client selalu gagal Missing token di prod).
        const up = await fetchJson<{ success?: boolean; url?: string; error?: string }>(
          "/api/upload/r2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: dataUrl, kind: "master" }),
          },
          60000
        );
        if (!up.url) { flash("Ekspor gagal upload."); return null; }
        masterUrlToSave = up.url;
        try { setLastActualDpi(actualDpi); } catch {}
        flash(`Master ${wCm}×${hCm}cm @~${actualDpi}DPI tersimpan.${kCapped < k ? " (dibatasi 4000px/sisi agar HP tak OOM)" : ""}`);
      }
      // Simpan meta tiled ke LS agar produksi bisa rakit ulang (url = tile 0
      // untuk kompatibilitas pembaca lama; tiles = set lengkap).
      try {
        const raw = localStorage.getItem("kaoskami_master_assets") || "{}";
        const all = JSON.parse(raw);
        all[`${activeApparel}:${panel}`] = {
          url: masterUrlToSave,
          at: new Date().toISOString(),
          dpi: isLarge && tileInfo ? undefined : actualDpi,
          wCm,
          hCm,
          ...(tileInfo ? { tiles: tileInfo.urls, cols: tileInfo.cols, rows: tileInfo.rows, tiled: true } : {}),
        };
        localStorage.setItem("kaoskami_master_assets", JSON.stringify(all));
      } catch {}
      return masterUrlToSave;
    } catch (e: any) {
      flash(`Ekspor gagal: ${e?.message || e}`);
      return null;
    } finally {
      setExporting(false);
    }
  }, [activeApparel, canvasH, canvasW, panel]);

  // KEPUTUSAN FASE 13 (risiko kecil): Pola 2D untuk TOPI DINONAKTIFKAN
  // EKSPLISIT berpesan — bukan "minimal layak". Alasan: geometri panel topi
  // (crown melengkung + lidah) tak terwakili artboard persegi tshirt-fallback
  // (56×74cm) — menampilkan skala-cm SALAH lebih berbahaya daripada jujur
  // menonaktifkan. Sablon topi tetap bisa diatur via mockup 3D + PanelStudio
  // menyusul bila pola crown diukur.
  // CELANA coming-soon (pola cap): Pola 2D celana DINONAKTIFKAN EKSPLISIT
  // berpesan — bukan "minimal layak". Alasan: panel paha melengkung +
  // selangkangan tak terwakili artboard persegi (32.7×100cm) — menampilkan
  // skala-cm SALAH lebih berbahaya daripada jujur menonaktifkan. Sablon
  // celana tetap bisa diatur via mockup 3D, lalu simpan desain seperti biasa.
  if (activeApparel === "cap") {
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider">
          🧢 Pola 2D topi belum tersedia
        </p>
        <p className="font-mono text-[11px] text-text-muted leading-relaxed">
          Panel crown melengkung belum ada pola ukurnya — menampilkan artboard
          datar akan menipu skala cm. Atur posisi & ukuran sablon langsung di
          mockup 3D (geser/zoom), lalu simpan desain seperti biasa.
        </p>
      </div>
    );
  }
  if (activeApparel === "pants") {
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider">
          👖 Pola 2D celana belum tersedia
        </p>
        <p className="font-mono text-[11px] text-text-muted leading-relaxed">
          Panel paha melengkung belum ada pola ukurnya — menampilkan artboard
          datar akan menipu skala cm. Atur posisi & ukuran sablon langsung di
          mockup 3D (geser/zoom), lalu simpan desain seperti biasa.
        </p>
      </div>
    );
  }
  // CELANA PENDEK coming-soon (pola pants persis): Pola 2D DINONAKTIFKAN
  // EKSPLISIT berpesan — panel paha melengkung + selangkangan tak terwakili
  // artboard persegi (28.4×50cm). Sablon diatur via mockup 3D, lalu simpan.
  if (activeApparel === "shorts") {
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider">
          🩳 Pola 2D celana pendek belum tersedia
        </p>
        <p className="font-mono text-[11px] text-text-muted leading-relaxed">
          Panel paha melengkung belum ada pola ukurnya — menampilkan artboard
          datar akan menipu skala cm. Atur posisi & ukuran sablon langsung di
          mockup 3D (geser/zoom), lalu simpan desain seperti biasa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
          Pola 2D skala cm — sinkron live ke 3D
        </p>
        <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
          {geo.wCm}×{geo.hCm}cm
        </span>
      </div>

      {/* Tab panel (tudung = hoodie saja) */}
      <div className="grid grid-cols-5 gap-1.5" role="tablist" aria-label="Panel pola">
        {PANELS.filter((p) => !p.hoodOnly || activeApparel === "hoodie").map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wide transition-all ${
              panel === p.id
                ? "bg-brand-accent text-canvas"
                : "bg-surface border border-white/10 text-text-muted hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Kanvas pola */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-[#141416] flex justify-center p-2">
        <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto", touchAction: "none" }} />
      </div>
      <p className="font-mono text-[10px] text-text-muted">
        Kotak hijau = batas sablon {geo.printWcm}×{geo.printHcm}cm. Geser/zoom karya di dalam kanvas — mockup 3D ikut bergerak. Geser dekat tengah/tepi kotak: magnetis ±6px (garis merah sesaat).
      </p>

      {/* Toolbar */}
      <div className="grid grid-cols-2 gap-2">
        <label className="py-2.5 px-2 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-center cursor-pointer transition-all">
          ⬆ UPLOAD GAMBAR
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={handleDeleteSelected}
          className="py-2.5 px-2 rounded-xl bg-surface border border-white/10 hover:border-rose-500 text-[11px] font-mono font-bold transition-all"
        >
          🗑 HAPUS PILIHAN
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Tulis teks sablon…"
          maxLength={40}
          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white text-xs placeholder:text-text-muted"
        />
        <button
          onClick={() => void handleAddText()}
          className="px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs"
        >
          + TEKS
        </button>
      </div>

      {/* Ekspor master produksi — M3.7 label dinamis jujur (bukan klaim 300). */}
      <button
        onClick={() => void exportPanelMaster()}
        disabled={exporting}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-display font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all"
      >
        {exporting ? `MENGEKSPOR @~${labelDpi} DPI…` : `💾 SIMPAN MASTER @~${labelDpi} DPI (PRODUKSI)`}
      </button>

      {status && (
        <p className="font-mono text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
          {status}
        </p>
      )}
      {selectedDecalId && (
        <p className="font-mono text-[10px] text-text-muted">
          Terpilih: {decals.find((d) => d.id === selectedDecalId)?.name || selectedDecalId.slice(0, 8)} (klik karya di kanvas untuk pilih)
        </p>
      )}
    </div>
  );
};
