"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Maximize2, Minimize2, X, Crosshair, Sparkles, Upload, Trash2, Type, ZoomIn, ZoomOut, CheckCircle2 } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import type { ApparelType, DecalLayer } from "@/lib/constants";
import {
  cmToUnits,
  EDITOR_PX_PER_CM,
  getPanelGeometry,
  getPanelOrigin,
  getPrintBounds,
  PX_PER_CM_300DPI,
  type PatternPanel,
  unitsToCm,
} from "@/lib/patternGeometry";
import { getPatternSilhouette } from "@/lib/patternSilhouette";
import { decalToFabric, fabricToDecal } from "@/lib/patternSync";
import { fetchJson } from "@/lib/fetchJson";
import { compressImageClient } from "@/lib/enhancers/compressImage";
import { getImageSize, getMasterDataUrl, setMasterDataUrl, setOriginalMasterDataUrl } from "@/lib/imageEditPipeline";
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

function getLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function silhouetteDataUrl(
  apparel: ApparelType,
  panel: PatternPanel,
  isLight = false,
  garmentColor?: string
): string {
  const g = getPanelGeometry(apparel, panel);
  const s = getPatternSilhouette(apparel, panel);

  const color = garmentColor || (isLight ? "#f4f4f5" : "#18181b");
  const isGarmentLight = getLuminance(color) > 0.55;

  const bodyFill = color;
  const bodyStroke = isGarmentLight
    ? (isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)")
    : (isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.45)");
  const detailStroke = isGarmentLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
  const stitchStroke = isGarmentLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.25)";

  const cx = g.wCm / 2;
  const centerLine =
    panel === "front" || panel === "back"
      ? `<line x1="${cx}" y1="4" x2="${cx}" y2="${g.hCm - 4}" stroke="${
          isGarmentLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.22)"
        }" stroke-width="0.35" stroke-dasharray="2 2"/>`
      : "";

  const canvasW = Math.round(g.wCm * EDITOR_PX_PER_CM);
  const canvasH = Math.round(g.hCm * EDITOR_PX_PER_CM);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">` +
    `<g transform="scale(${EDITOR_PX_PER_CM})">` +
    `<path d="${s.body}" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="0.45"/>` +
    centerLine +
    s.details.map((d) => `<path d="${d}" fill="none" stroke="${detailStroke}" stroke-width="0.35"/>`).join("") +
    s.stitches.map((d) => `<path d="${d}" fill="none" stroke="${stitchStroke}" stroke-width="0.25" stroke-dasharray="1.2 1"/>`).join("") +
    `</g>` +
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
    selectedColor,
    decals,
    addDecal,
    updateDecal,
    removeDecal,
    selectedDecalId,
    setSelectedDecalId,
    studioTheme,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      selectedColor: s.selectedColor,
      decals: s.decals,
      addDecal: s.addDecal,
      updateDecal: s.updateDecal,
      removeDecal: s.removeDecal,
      selectedDecalId: s.selectedDecalId,
      setSelectedDecalId: s.setSelectedDecalId,
      studioTheme: s.studioTheme,
    }))
  );
  const isLight = studioTheme === "gallery";
  const [panel, setPanel] = useState<PatternPanel>("front");
  const [textInput, setTextInput] = useState("");
  const [textColorChoice, setTextColorChoice] = useState<string>("auto");
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // M3.7 — DPI aktual ekspor terakhir (jujur pasca-cap/tiled) untuk label dinamis.
  const [lastActualDpi, setLastActualDpi] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomPreset, setZoomPreset] = useState<"fit" | "100" | "150">("fit");
  // Pengali zoom manual untuk kanvas (bisa perbesar di drawer maupun layar penuh)
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const syncingRef = useRef(false);
  const loadingDecalIdsRef = useRef<Set<string>>(new Set());
  const decalsRef = useRef(decals);
  decalsRef.current = decals;

  // Styling kontrol objek seleksi Fabric (Canva/Figma style):
  // Menghilangkan 9 kotak biru bertumpuk dan menggantinya dengan 4 lingkaran putih rapi beraksen hijau emerald
  const applyFabricObjectControls = useCallback((img: any) => {
    img.set({
      cornerColor: "#ffffff",
      cornerStrokeColor: "#10b981", // Emerald 500
      borderColor: "#10b981",
      cornerStyle: "circle",
      cornerSize: 8,
      transparentCorners: false,
      borderScaleFactor: 1.5,
      borderDashArray: [4, 4],
      padding: 4,
    });
    // Matikan kontrol kotak tengah (ml, mr, mt, mb) agar tidak saling menumpuk menjadi banyak kotak biru
    img.setControlsVisibility({
      ml: false,
      mr: false,
      mt: false,
      mb: false,
      mtr: true,
    });
    if (img.controls?.mtr) {
      img.controls.mtr.offsetY = -18;
    }
  }, []);

  const geo = getPanelGeometry(activeApparel, panel);
  const canvasW = Math.round(geo.wCm * EDITOR_PX_PER_CM);
  const canvasH = Math.round(geo.hCm * EDITOR_PX_PER_CM);

  const updateCanvasDimensions = useCallback(() => {
    const canvas = fabricRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerW = container.clientWidth || (isExpanded && typeof window !== "undefined" ? window.innerWidth - 48 : 340);
    const containerH = isExpanded
      ? Math.max(380, (container.clientHeight || (typeof window !== "undefined" ? window.innerHeight - 160 : 600)))
      : Math.min(360, Math.max(260, (typeof window !== "undefined" ? window.innerHeight : 800) * 0.4));

    let targetScale = 1.0;
    if (isExpanded && zoomPreset === "100") {
      targetScale = 1.0;
    } else if (isExpanded && zoomPreset === "150") {
      targetScale = 1.5;
    } else {
      const scaleW = (containerW - 24) / canvasW;
      const scaleH = (containerH - 24) / canvasH;
      targetScale = Math.min(scaleW, scaleH);
    }
    // Terapkan zoomMultiplier untuk mode drawer standar & mode perbesar
    targetScale = Math.max(0.25, targetScale * zoomMultiplier);

    const displayW = Math.round(canvasW * targetScale);
    const displayH = Math.round(canvasH * targetScale);

    canvas.setDimensions({ width: displayW, height: displayH });
    canvas.setZoom(targetScale);
    canvas.requestRenderAll();
  }, [canvasH, canvasW, isExpanded, zoomPreset, zoomMultiplier]);

  // Pantau ukuran container untuk auto-fit responsive
  useEffect(() => {
    updateCanvasDimensions();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [updateCanvasDimensions]);

  // Tombol Esc untuk menutup mode perbesar layar penuh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

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

  // Bangun ulang kanvas saat apparel/panel/warna berubah.
  useEffect(() => {
    let mounted = true;
    let canvas: any = null;
    (async () => {
      try {
        const fabric = await import("fabric");
        if (!mounted || !canvasRef.current) return;
        // Konfigurasi kontrol objek default secara global agar semua objek tidak memiliki 9 kotak biru Fabric
        try {
          (fabric as any).Object.prototype.set({
            cornerColor: "#ffffff",
            cornerStrokeColor: "#10b981",
            borderColor: "#10b981",
            cornerStyle: "circle",
            cornerSize: 8,
            transparentCorners: false,
            borderScaleFactor: 1.5,
            borderDashArray: [4, 4],
            padding: 4,
          });
        } catch {}
        if (fabricRef.current) {
          try { fabricRef.current.dispose(); } catch {}
          fabricRef.current = null;
        }
        canvas = new (fabric as any).Canvas(canvasRef.current, {
          width: canvasW,
          height: canvasH,
          backgroundColor: isLight ? "#F5F4F0" : "#141416",
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;

        // Latar siluet pola + bingkai batas sablon (tak bisa dipilih).
        const bgUrl = silhouetteDataUrl(activeApparel, panel, isLight, selectedColor);
        const bgImg = await (fabric as any).FabricImage.fromURL(bgUrl);
        bgImg.set({
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          selectable: false,
          evented: false,
          excludeFromExport: false,
        });
        bgImg.scaleToWidth(canvasW);
        bgImg.scaleToHeight(canvasH);
        canvas.backgroundImage = bgImg;

        const origin = getPanelOrigin(activeApparel, panel);

        // Batas hijau kotak & label teknis ditiadakan agar kanvas bersih untuk pengguna umum.
        // Magnet snapping tetap aktif secara presisi menggunakan getPrintBounds & getPanelOrigin.

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
          const origin = getPanelOrigin(activeApparel, panel);
          const pBounds = getPrintBounds(activeApparel, panel);
          const cx = pBounds.leftPx;
          const cy = pBounds.topPx;
          const pW = pBounds.widthPx;
          const pH = pBounds.heightPx;
          const targetsX = [cx - pW / 2, cx, cx + pW / 2];
          // Target snap Y: batas atas, batas bawah, tengah box, DAN origin dada (origin.yPx)
          const targetsY = [cy - pH / 2, cy, cy + pH / 2, origin.yPx];
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
              left: origin.xPx + p.cxPx,
              top: origin.yPx + p.cyPx,
              originX: "center",
              originY: "center",
              angle: p.rotation,
              opacity: p.opacity,
            });
            img.scaleToWidth(p.wPx);
            (img as any).decalId = d.id;
            (img as any).aspectWoverH = natAspect;
            applyFabricObjectControls(img);
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
          // Kunci uniform: stretch 1-sisi distorsi artwork — normalisasi ke
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
          const origin = getPanelOrigin(activeApparel, panel);
          const cxPx = (obj.left ?? origin.xPx) - origin.xPx;
          const cyPx = (obj.top ?? origin.yPx) - origin.yPx;
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
          syncingRef.current = true;
          updateDecal(id, patch);
          syncingRef.current = false;
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

        // Interaktivitas Pan & Wheel Zoom di kanvas (bisa zoom di drawer maupun mode perbesar)
        let isPanning = false;
        let panLastX = 0;
        let panLastY = 0;

        canvas.on("mouse:down", (opt: any) => {
          const evt = opt.e;
          if (!opt.target || evt.altKey || evt.shiftKey) {
            isPanning = true;
            canvas.selection = false;
            panLastX = evt.clientX;
            panLastY = evt.clientY;
          }
        });

        canvas.on("mouse:move", (opt: any) => {
          if (isPanning) {
            const e = opt.e;
            const vpt = canvas.viewportTransform;
            if (vpt) {
              vpt[4] += e.clientX - panLastX;
              vpt[5] += e.clientY - panLastY;
              canvas.requestRenderAll();
            }
            panLastX = e.clientX;
            panLastY = e.clientY;
          }
        });

        canvas.on("mouse:up", () => {
          if (isPanning) {
            isPanning = false;
            canvas.selection = true;
            canvas.setCoords?.();
          }
        });

        canvas.on("mouse:wheel", (opt: any) => {
          const delta = opt.e.deltaY;
          let zoom = canvas.getZoom();
          zoom *= 0.999 ** delta;
          zoom = Math.max(0.25, Math.min(4.0, zoom));
          canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
          opt.e.preventDefault();
          opt.e.stopPropagation();
        });

        canvas.on("selection:created", (e: any) => {
          const id = (e.selected?.[0] as any)?.decalId;
          if (id) setSelectedDecalId(id);
        });
        canvas.on("selection:updated", (e: any) => {
          const id = (e.selected?.[0] as any)?.decalId;
          if (id) setSelectedDecalId(id);
        });
        canvas.on("selection:cleared", () => {
          setSelectedDecalId(null);
        });

        canvas.renderAll();
        updateCanvasDimensions();
      } catch (e: any) {
        if (mounted) setStatus(`Kanvas 2D gagal dimuat: ${e?.message || e}`);
      }
    })();
    return () => {
      mounted = false;
      // Dispose kanvas Fabric saat unmount/ganti panel (audit #40)
      try {
        fabricRef.current?.dispose();
      } catch {}
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApparel, panel, isLight, selectedColor, isExpanded, updateCanvasDimensions, applyFabricObjectControls]);

  // Sinkronisasi real-time 3D <-> 2D dua arah:
  // - Saat decal diubah di 3D Gizmo atau drawer slider, mutasi posisi/skala/rotasi/opacity di-apply ke Fabric.
  // - Saat decal baru ditambahkan di 3D (mis. teks atau gambar dari drawer), otomatis dimuat ke kanvas 2D!
  // - Saat decal dihapus di 3D, otomatis dibuang dari kanvas 2D.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || syncingRef.current) return;
    let isCancelled = false;

    (async () => {
      try {
        const fabric = await import("fabric");
        if (isCancelled || !fabricRef.current) return;
        const origin = getPanelOrigin(activeApparel, panel);
        const sideDecals = decals.filter((d) => (d.targetSide as string) === panel);
        const existingObjs = canvas.getObjects().filter((o: any) => o.decalId);

        let needsRender = false;

        // 1. Hapus objek Fabric yang sudah tidak ada di store
        for (const obj of existingObjs) {
          if (!sideDecals.some((d) => d.id === obj.decalId)) {
            canvas.remove(obj);
            needsRender = true;
          }
        }

        // 2. Sinkronkan posisi atau tambahkan decal baru yang belum ada di kanvas
        for (const d of sideDecals) {
          let obj = existingObjs.find((o: any) => o.decalId === d.id);
          if (!obj) {
            // Cegah race condition concurrent loading untuk decal yang sama
            if (loadingDecalIdsRef.current.has(d.id)) continue;
            loadingDecalIdsRef.current.add(d.id);
            // Decal baru dari 3D: muat dan tambahkan ke kanvas Fabric secara otomatis
            try {
              const srcUrl = getMasterDataUrl(d.id, d.url);
              const nat = await naturalSize(srcUrl);
              const natAspect = d.printPx?.w && d.printPx?.h
                ? d.printPx.w / d.printPx.h
                : (nat.w && nat.h ? nat.w / nat.h : 1);
              const p = decalToFabric(activeApparel, d, natAspect);
              const newImg = await (fabric as any).FabricImage.fromURL(srcUrl);
              if (isCancelled || !fabricRef.current) {
                loadingDecalIdsRef.current.delete(d.id);
                return;
              }
              const alreadyThere = canvas.getObjects().some((o: any) => o.decalId === d.id);
              if (!alreadyThere) {
                newImg.set({
                  left: origin.xPx + p.cxPx,
                  top: origin.yPx + p.cyPx,
                  originX: "center",
                  originY: "center",
                  angle: p.rotation,
                  opacity: p.opacity,
                });
                newImg.scaleToWidth(p.wPx);
                (newImg as any).decalId = d.id;
                (newImg as any).aspectWoverH = natAspect;
                applyFabricObjectControls(newImg);
                canvas.add(newImg);
                needsRender = true;
              }
            } catch (err) {
              console.warn("Gagal menambahkan decal 3D ke 2D canvas:", err);
            } finally {
              loadingDecalIdsRef.current.delete(d.id);
            }
            continue;
          }

          // Hindari menimpa objek jika sedang di-drag oleh user di kanvas 2D
          const activeObj = canvas.getActiveObject();
          if (activeObj === obj && (canvas as any)._currentTransform) continue;

          const aspect = (obj as any).aspectWoverH || 1;
          const p = decalToFabric(activeApparel, d, aspect);
          const targetLeft = origin.xPx + p.cxPx;
          const targetTop = origin.yPx + p.cyPx;

          const dLeft = Math.abs((obj.left ?? 0) - targetLeft);
          const dTop = Math.abs((obj.top ?? 0) - targetTop);
          const dAngle = Math.abs((obj.angle ?? 0) - p.rotation);
          const curW = obj.getScaledWidth?.() ?? 0;
          const dW = Math.abs(curW - p.wPx);
          const curOpacity = obj.opacity ?? 1;
          const dOpacity = Math.abs(curOpacity - p.opacity);

          if (dLeft > 0.5 || dTop > 0.5 || dAngle > 0.5 || dW > 0.5 || dOpacity > 0.02) {
            obj.set({
              left: targetLeft,
              top: targetTop,
              angle: p.rotation,
              opacity: p.opacity,
            });
            obj.scaleToWidth(p.wPx);
            obj.setCoords?.();
            needsRender = true;
          }
        }

        if (needsRender && !isCancelled) {
          canvas.requestRenderAll();
        }
      } catch {}
    })();

    return () => {
      isCancelled = true;
    };
  }, [decals, activeApparel, panel, applyFabricObjectControls]);

  // Sinkronkan objek seleksi aktif dari 3D ke 2D
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!selectedDecalId) {
      if (canvas.getActiveObject()) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
      return;
    }
    const objs = canvas.getObjects().filter((o: any) => o.decalId);
    const targetObj = objs.find((o: any) => o.decalId === selectedDecalId);
    if (targetObj && canvas.getActiveObject() !== targetObj) {
      canvas.setActiveObject(targetObj);
      canvas.requestRenderAll();
    }
  }, [selectedDecalId]);

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
      try { setOriginalMasterDataUrl(id, masterUrl); } catch {}
      void getImageSize(masterUrl)
        .then((sz) => { try { updateDecal(id, { printPx: { w: sz.w, h: sz.h } }); } catch {} })
        .catch(() => {});

      loadingDecalIdsRef.current.add(id);

      const canvas = fabricRef.current;
      if (canvas) {
        const fabric = await import("fabric");
        const origin = getPanelOrigin(activeApparel, panel);
        const p = decalToFabric(activeApparel, { id, url: previewUrl, name: "", targetSide: panel as any, x: 0, y: 0.02, scale: 0.12, rotation: 0, opacity: 1 }, aspect);
        // M3.1: kanvas pola pegang MASTER (ekspor komposit = bitmap master).
        const img = await (fabric as any).FabricImage.fromURL(masterUrl);
        img.set({ left: origin.xPx + p.cxPx, top: origin.yPx + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        (img as any).aspectWoverH = aspect;
        applyFabricObjectControls(img);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      setSelectedDecalId(id);
      loadingDecalIdsRef.current.delete(id);

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
  }, [activeApparel, addDecal, updateDecal, canvasW, panel, applyFabricObjectControls, setSelectedDecalId]);

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
      const isGarmentLight = getLuminance(selectedColor) > 0.55;
      const chosenColor = textColorChoice === "auto"
        ? (isGarmentLight ? "#111827" : "#FFFFFF")
        : textColorChoice;

      const dataUrl = await generateTextDecalDataUrl({
        text,
        fontFamily: "streetwear-bold",
        textColor: chosenColor,
      });
      if (!dataUrl) { flash("Teks kosong — tulis dulu."); return; }
      const sz = await getImageSize(dataUrl).catch(() => ({ w: 1024, h: 256 }));
      setTextInput("");
      const aspect = sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 4;
      const draft = {
        url: dataUrl,
        name: `Teks: ${text.slice(0, 16)}`,
        targetSide: panel as DecalLayer["targetSide"],
        x: 0,
        y: panel === "front" ? -0.05 : 0.02,
        scale: 0.13,
        rotation: 0,
        opacity: 1,
        // B-01/B-04: aspek natural + printPx agar badge/pricing tak fallback 1.0.
        printPx: { w: sz.w, h: sz.h },
      };
      const id = addDecal(draft);
      // Master teks = raster mesin (sama dengan preview; resolusi auto-fit).
      try { setMasterDataUrl(id, dataUrl); } catch {}
      try { setOriginalMasterDataUrl(id, dataUrl); } catch {}

      loadingDecalIdsRef.current.add(id);

      if (canvas) {
        const origin = getPanelOrigin(activeApparel, panel);
        const p = decalToFabric(activeApparel, { id, ...draft }, aspect);
        const img = await (fabric as any).FabricImage.fromURL(dataUrl);
        img.set({ left: origin.xPx + p.cxPx, top: origin.yPx + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        (img as any).aspectWoverH = aspect;
        applyFabricObjectControls(img);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      setSelectedDecalId(id);
      loadingDecalIdsRef.current.delete(id);
      flash(`Teks "${text}" berhasil dipasang di pola & 3D.`);
    } catch (e: any) {
      flash(`Teks gagal: ${e?.message || e}`);
    }
  }, [activeApparel, addDecal, panel, selectedColor, textInput, textColorChoice, applyFabricObjectControls, setSelectedDecalId]);

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
        flash(`Pola sablon ${wCm}×${hCm}cm berhasil disimpan!`);
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
        if (!up.url) { flash("Penyimpanan gagal diunggah."); return null; }
        masterUrlToSave = up.url;
        try { setLastActualDpi(actualDpi); } catch {}
        flash(`Pola sablon ${wCm}×${hCm}cm berhasil disimpan!`);
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

  const sideDecals = decals.filter((d) => (d.targetSide as string) === panel);
  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? (sideDecals[0] || null);

  const handleAlign = useCallback((mode: "center" | "pocket" | "reset") => {
    if (!activeDecal) return;
    const canvas = fabricRef.current;
    const id = activeDecal.id;
    let targetX = 0;
    let targetY = 0;
    let targetScale = activeDecal.scale;

    if (mode === "center") {
      targetX = 0;
      targetY = panel === "front" ? -0.05 : panel === "back" ? -0.08 : 0;
    } else if (mode === "pocket") {
      targetX = -0.12;
      targetY = -0.08;
      const pocketUnits = cmToUnits(activeApparel, 8.5);
      targetScale = Math.min(activeDecal.scale, pocketUnits);
    } else if (mode === "reset") {
      targetX = 0;
      targetY = 0;
    }

    const jepit = clampDecalXY(panel as any, targetX, targetY);
    updateDecal(id, { x: jepit.x, y: jepit.y, scale: targetScale, rotation: 0 });

    if (canvas) {
      const obj = canvas.getObjects().find((o: any) => o.decalId === id);
      if (obj) {
        const origin = getPanelOrigin(activeApparel, panel);
        const natAspect = (obj as any).aspectWoverH || 1;
        const p = decalToFabric(
          activeApparel,
          { ...activeDecal, x: jepit.x, y: jepit.y, scale: targetScale, rotation: 0 },
          natAspect
        );
        obj.set({
          left: origin.xPx + p.cxPx,
          top: origin.yPx + p.cyPx,
          angle: 0,
        });
        obj.scaleToWidth(p.wPx);
        obj.setCoords();
        canvas.requestRenderAll();
      }
    }
  }, [activeApparel, activeDecal, canvasH, canvasW, panel, updateDecal]);

  const decalStats = (() => {
    if (!activeDecal) return null;
    const wCm = unitsToCm(activeApparel, activeDecal.scale);
    const aspect =
      activeDecal.printPx && activeDecal.printPx.h > 0
        ? activeDecal.printPx.w / activeDecal.printPx.h
        : 1;
    const actualWCm = aspect >= 1 ? wCm : wCm * aspect;
    const actualHCm = aspect >= 1 ? wCm / aspect : wCm;

    const origin = getPanelOrigin(activeApparel, panel);
    const cyCm = origin.yCm - unitsToCm(activeApparel, activeDecal.y);
    const topEdgeCm = cyCm - actualHCm / 2;
    const distFromCollar = Math.max(0, topEdgeCm - origin.collarYCm);

    return {
      wCm: Math.round(actualWCm * 10) / 10,
      hCm: Math.round(actualHCm * 10) / 10,
      distCollar: Math.round(distFromCollar * 10) / 10,
    };
  })();

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
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>Pola 2D topi belum tersedia</span>
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
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>Pola 2D celana belum tersedia</span>
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
        <p className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>Pola 2D celana pendek belum tersedia</span>
        </p>
        <p className="font-mono text-[11px] text-text-muted leading-relaxed">
          Panel paha melengkung belum ada pola ukurnya — menampilkan artboard
          datar akan menipu skala cm. Atur posisi & ukuran sablon langsung di
          mockup 3D (geser/zoom), lalu simpan desain seperti biasa.
        </p>
      </div>
    );
  }

  // MODE PERBESAR LAYAR PENUH (PORTAL LANGSUNG KE BODY — 100% BEBAS DARI KENDALA DRAWER)
  if (isExpanded && mounted && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] w-screen h-screen bg-canvas/98 backdrop-blur-3xl flex flex-col overflow-hidden animate-fadeIn select-none text-text-primary">
        {/* HEADER TOP BAR */}
        <header className="h-16 px-4 sm:px-8 border-b border-border-subtle/60 flex items-center justify-between shrink-0 bg-surface/60 backdrop-blur-md z-10 gap-4">
          {/* Sisi Kiri: Judul Panel & Dimensi */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent text-base font-bold shadow-sm">
              📐
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary tracking-wide whitespace-nowrap">
                  POLA {PANELS.find((p) => p.id === panel)?.label.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                  {geo.wCm}×{geo.hCm} cm
                </span>
              </div>
              <p className="text-[10px] font-mono text-text-muted hidden sm:block">
                Mode Inspeksi Layar Penuh • Sinkron langsung ke 3D
              </p>
            </div>
          </div>

          {/* Tengah: Tab Pemilih Panel Baju */}
          <div className="flex items-center gap-1 bg-surface/90 p-1 rounded-2xl border border-border-subtle shadow-sm shrink-0">
            {PANELS.filter((p) => !p.hoodOnly || activeApparel === "hoodie").map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPanel(p.id)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all whitespace-nowrap ${
                  panel === p.id
                    ? "bg-brand-accent text-canvas shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sisi Kanan: Kontrol Zoom & Tombol Tutup */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex bg-surface rounded-xl p-0.5 border border-border-subtle text-xs font-mono">
              <button
                type="button"
                onClick={() => setZoomPreset("fit")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  zoomPreset === "fit"
                    ? "bg-brand-accent text-canvas font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                FIT
              </button>
              <button
                type="button"
                onClick={() => setZoomPreset("100")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  zoomPreset === "100"
                    ? "bg-brand-accent text-canvas font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setZoomPreset("150")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  zoomPreset === "150"
                    ? "bg-brand-accent text-canvas font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                150%
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle text-text-primary hover:border-rose-500 hover:text-rose-400 font-mono text-xs font-bold transition-all shadow-sm"
            >
              <X size={15} />
              <span>TUTUP</span>
            </button>
          </div>
        </header>

        {/* AREA KANVAS UTAMA (Luas, lega, di tengah tanpa tertutup panel) */}
        <div
          ref={containerRef}
          className="flex-1 w-full h-full relative flex items-center justify-center p-6 overflow-auto bg-canvas/60"
        >
          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-border-subtle/80 bg-surface/30">
            <canvas ref={canvasRef} style={{ touchAction: "none" }} />
          </div>
        </div>

        {/* FLOATING HUD TOOLBAR (Melayang di bawah, ringkas & elegan) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-auto max-w-[95vw] flex items-center flex-wrap justify-center gap-3 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl px-5 py-3 shadow-2xl animate-fadeIn">
          {/* Posisi Cepat bila ada karya terpilih */}
          {activeDecal && decalStats && (
            <div className="flex items-center gap-2 pr-3 border-r border-border-subtle/60 text-xs font-mono whitespace-nowrap">
              <span className="text-text-muted font-bold flex items-center gap-1">
                <Crosshair size={13} className="text-brand-accent" />
                <span>POSISI:</span>
              </span>
              <button
                type="button"
                onClick={() => handleAlign("center")}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent font-bold transition-all"
                title="Posisikan pas di tengah dada"
              >
                🎯 Tengah Dada
              </button>
              {panel === "front" && (
                <button
                  type="button"
                  onClick={() => handleAlign("pocket")}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent font-bold transition-all"
                  title="Posisikan di dada kiri (saku)"
                >
                  👕 Dada Kiri
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAlign("reset")}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-text-primary text-text-muted hover:text-text-primary transition-all"
                title="Reset ke titik tengah"
              >
                ↺
              </button>
              <span className="text-emerald-400 font-bold ml-1">
                {decalStats.wCm}×{decalStats.hCm} cm
              </span>
            </div>
          )}

          {/* Alat Aksi Cepat */}
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <label className="py-2 px-3.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
              <Upload size={14} className="text-brand-accent" />
              <span>UPLOAD</span>
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

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-xl border border-border-subtle">
                {[
                  { id: "auto", title: "Kontras Otomatis", color: getLuminance(selectedColor) > 0.55 ? "#111827" : "#FFFFFF" },
                  { id: "#111827", title: "Hitam Pekat", color: "#111827" },
                  { id: "#FFFFFF", title: "Putih Bersih", color: "#FFFFFF" },
                  { id: "#E65100", title: "Oranye", color: "#E65100" },
                  { id: "#E53935", title: "Merah", color: "#E53935" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTextColorChoice(c.id)}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      textColorChoice === c.id
                        ? "border-brand-accent ring-2 ring-brand-accent/50 scale-110"
                        : "border-border-strong opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.title}
                  />
                ))}
              </div>
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddText(); }}
                placeholder="Teks sablon…"
                maxLength={40}
                className="w-32 sm:w-44 px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs placeholder:text-text-muted focus:border-brand-accent outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => void handleAddText()}
                className="px-3.5 py-1.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
              >
                <Type size={13} />
                <span>+ TEKS</span>
              </button>
            </div>

            {activeDecal && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="py-2 px-3 rounded-xl bg-surface border border-border-subtle hover:border-rose-500 text-xs font-mono font-bold transition-all flex items-center gap-1 shadow-sm hover:text-rose-400"
                title="Hapus gambar yang dipilih"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span>HAPUS</span>
              </button>
            )}

            {/* Status Sinkronisasi Real-Time Otomatis ke 3D (Option A) */}
            <div className="py-2 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs font-bold flex items-center gap-2 shadow-sm whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>OTOMATIS TERSINKRON KE 3D</span>
            </div>
          </div>
        </div>

        {status && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 font-mono text-xs text-amber-300 bg-surface/95 border border-amber-500/40 rounded-xl px-4 py-2 shadow-xl animate-fadeIn">
            {status}
          </div>
        )}
      </div>,
      document.body
    );
  }

  // MODE DRAWER STANDAR
  return (
    <div className="space-y-3">
      {/* Header Info & Perbesar Toggle */}
      <div className="flex items-center justify-between pb-1">
        <div className="min-w-0 pr-2">
          <p className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 truncate">
            <span>📐 MEJA POLA DTF (1:1)</span>
            <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5 shrink-0">
              {geo.wCm}×{geo.hCm} cm
            </span>
          </p>
          <p className="font-mono text-[10px] text-text-muted mt-0.5 truncate">
            Pola 2D Skala 1:1 • Sinkron langsung ke 3D
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-all shadow-sm border border-brand-accent/40 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent"
            title="Perbesar layar penuh untuk tata letak luas & presisi"
          >
            <Maximize2 size={12} />
            <span>PERBESAR</span>
          </button>
        </div>
      </div>

      {/* Tab panel (tudung = hoodie saja) */}
      <div className="grid grid-cols-5 gap-1.5 shrink-0" role="tablist" aria-label="Panel pola">
        {PANELS.filter((p) => !p.hoodOnly || activeApparel === "hoodie").map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={`py-1.5 px-1 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wide transition-all ${
              panel === p.id
                ? "bg-brand-accent text-canvas shadow-sm"
                : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Quick Alignment & Real-Time DTF Measurement (Bila ada karya aktif) */}
      {activeDecal && decalStats && (
        <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle space-y-2 shrink-0 animate-fadeIn">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted font-bold flex items-center gap-1">
              <Crosshair size={11} className="text-brand-accent" />
              <span>POSISI CEPAT:</span>
            </span>
            <span className="text-emerald-400 font-bold">
              {decalStats.wCm} × {decalStats.hCm} cm
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAlign("center")}
              className="flex-1 py-1 px-2 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-[10px] font-mono font-bold transition-all text-center"
              title="Posisikan pas di tengah dada (7.5 cm dari leher)"
            >
              🎯 Tengah Dada
            </button>
            {panel === "front" && (
              <button
                type="button"
                onClick={() => handleAlign("pocket")}
                className="flex-1 py-1 px-2 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-[10px] font-mono font-bold transition-all text-center"
                title="Posisikan logo di dada kiri ukuran saku (8.5 cm)"
              >
                👕 Dada Kiri
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAlign("reset")}
              className="py-1 px-2 rounded-lg bg-surface border border-border-subtle hover:border-text-primary text-text-muted hover:text-text-primary text-[10px] font-mono transition-all text-center"
              title="Reset ke titik tengah meja cetak"
            >
              ↺ Reset
            </button>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-text-muted pt-0.5 border-t border-border-subtle/40">
            <span>Jarak kerah: ~{decalStats.distCollar} cm</span>
            <span className="text-text-muted/70">Batas lebar: 30 cm</span>
          </div>
        </div>
      )}

      {/* Kanvas pola responsif dengan In-Drawer Zoom Controls */}
      <div className="relative w-full rounded-2xl border border-border-subtle bg-surface/40 overflow-hidden select-none shadow-inner">
        {/* Floating In-Drawer Zoom HUD */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border-subtle/80 rounded-xl p-1 shadow-lg font-mono text-xs">
          <button
            type="button"
            onClick={() => setZoomMultiplier((z) => Math.max(0.6, Math.round((z - 0.25) * 100) / 100))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all active:scale-95"
            title="Perkecil Kanvas"
            aria-label="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={() => setZoomMultiplier(1.0)}
            className="px-2 h-6 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-primary font-bold text-[11px] transition-all"
            title="Reset ke Ukuran Pas (100%)"
          >
            {Math.round(zoomMultiplier * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoomMultiplier((z) => Math.min(3.0, Math.round((z + 0.25) * 100) / 100))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all active:scale-95"
            title="Perbesar Kanvas"
            aria-label="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
        </div>

        {zoomMultiplier > 1.0 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-surface/80 backdrop-blur-sm border border-border-subtle/60 text-[9px] font-mono text-text-muted pointer-events-none">
            Drag kanvas untuk geser • Scroll untuk zoom
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full flex justify-center items-center overflow-hidden max-h-[370px] min-h-[260px] p-2"
        >
          <canvas ref={canvasRef} style={{ touchAction: "none" }} />
        </div>
      </div>

      {/* Toolbar Aksi */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <label className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-[11px] font-mono font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm">
          <Upload size={13} className="text-brand-accent" />
          <span>UPLOAD GAMBAR</span>
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
          type="button"
          onClick={handleDeleteSelected}
          className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-rose-500 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:text-rose-400"
        >
          <Trash2 size={13} className="text-rose-400" />
          <span>HAPUS PILIHAN</span>
        </button>
      </div>

      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Teks Sablon:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">Warna:</span>
            {[
              { id: "auto", label: "Auto", color: getLuminance(selectedColor) > 0.55 ? "#111827" : "#FFFFFF" },
              { id: "#111827", label: "Hitam", color: "#111827" },
              { id: "#FFFFFF", label: "Putih", color: "#FFFFFF" },
              { id: "#E65100", label: "Oranye", color: "#E65100" },
              { id: "#E53935", label: "Merah", color: "#E53935" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTextColorChoice(c.id)}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  textColorChoice === c.id
                    ? "border-brand-accent ring-2 ring-brand-accent/50 scale-110"
                    : "border-border-strong opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.color }}
                title={`Pilih warna ${c.label}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAddText(); }}
            placeholder="Tulis teks sablon…"
            maxLength={40}
            className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs placeholder:text-text-muted focus:border-brand-accent outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => void handleAddText()}
            className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
          >
            <Type size={12} />
            <span>+ TEKS</span>
          </button>
        </div>
      </div>

      {/* Status Sinkronisasi Real-Time Otomatis ke 3D (Option A) */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold">Tersinkronisasi Otomatis ke 3D</span>
        </div>
        <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span>Real-time</span>
        </span>
      </div>

      {status && (
        <p className="font-mono text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 shrink-0 animate-fadeIn">
          {status}
        </p>
      )}
      {selectedDecalId && (
        <p className="font-mono text-[10px] text-text-muted shrink-0 truncate">
          Terpilih: {decals.find((d) => d.id === selectedDecalId)?.name || selectedDecalId.slice(0, 8)}
        </p>
      )}
    </div>
  );
};
