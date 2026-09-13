"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  Upload,
  RotateCcw,
  Check,
  Trash2,
  Maximize2,
  Minimize2,
  Camera,
  Sun,
  Moon,
  Box,
  Layers,
  Sparkles,
  Sliders,
  PenTool,
  Move,
  RotateCw,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelRightClose,
  Hand,
  Compass,
  Bookmark,
  MessageCircle,
  Copy,
  X,
  Compass as AngleIcon,
  Info,
  Video,
  Users,
  Share2,
} from "lucide-react";
import {
  PRODUCT_COLORS,
  APPAREL_CATALOG,
  STUDIO_MOODS,
  STUDIO_STARTER_TEMPLATES,
  validSidesFor,
  type ApparelType,
  type StudioTheme,
  type MaterialFinish,
  type LightingPreset,
  type StarterTemplateId,
} from "@/lib/constants";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { computePhysicalPrintDimensions, maxDecalScaleUnits, APPAREL_PHYSICAL_SPECS, DECAL_MOVE_LIMITS, clampDecalXY } from "@/lib/scaleCalibration";
import { classifyPrintTierByCm, printTierCost, PRINT_TIER_LABEL } from "@/lib/printTiers";
import { evaluatePrintQuality } from "@/lib/dpiAnalyzer";
import { BG_MAX_SIDE, removeSolidBackground, wasBgDownscaled } from "@/lib/enhancers/removeSolidBackground";
import { compressImageClient } from "@/lib/enhancers/compressImage";
import {
  clearMasterDataUrl,
  clearOriginalMasterDataUrl,
  getImageSize,
  getMasterDataUrl,
  getOriginalMasterDataUrl,
  hasOriginalMaster,
  isHttpsMasterUrl,
  setMasterDataUrl,
  setOriginalMasterDataUrl,
  uploadMasterDataUrlToR2,
} from "@/lib/imageEditPipeline";
import { Ruler, Wand2, Loader2, AlertTriangle, ShieldCheck, ShoppingCart, Type } from "lucide-react";
import { CheckoutModal } from "@/components/ui/CheckoutModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AuthModal } from "@/components/ui/AuthModal";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import { generateTextDecalDataUrl, FONT_PRESETS, type TextDecalOptions } from "@/lib/typography/textDecalGenerator";
import { shopWaLink } from "@/lib/shop";

const FabricEditor = dynamic(() => import("./FabricEditor").then((m) => m.FabricEditor), {
  ssr: false,
  loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat Fabric editor…</p>,
});

// Pola 2D skala-cm (Fabric, lazy — sinkron live ke DecalLayer 3D).
const PatternStudioLazy = dynamic(
  () => import("@/components/studio/PatternStudio").then((m) => m.PatternStudio),
  {
    ssr: false,
    loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat pola 2D…</p>,
  }
);

// Lab Kain verlet (lazy — Canvas R3F kecil, hanya saat dibuka).
const ClothLabLazy = dynamic(
  () => import("@/components/studio/ClothLab").then((m) => m.ClothLab),
  {
    ssr: false,
    loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat lab kain…</p>,
  }
);

// FASE F — Editor gambar in-mockup (lazy client-only; chunk AI 0KB sampai diklik
// di dalam modal via await import di imageEditPipeline).
const ImageEditorModalLazy = dynamic(
  () => import("@/components/studio/ImageEditorModal").then((m) => m.ImageEditorModal),
  {
    ssr: false,
    loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat editor gambar…</p>,
  }
);

// M4.1 — Panel jersey regu / teamwear (lazy client-only; generateTextDecalDataUrl
// + raster kanvas hanya diunduh saat tab TIM dibuka).
const TeamwearPanelLazy = dynamic(
  () => import("@/components/studio/TeamwearPanel").then((m) => m.TeamwearPanel),
  {
    ssr: false,
    loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat panel jersey regu…</p>,
  }
);

/** Format ekspor 360° (D2 — muxer benar, bukan MediaRecorder mentah). */
export type Export360Format = "mp4" | "webm" | "gif";

/**
 * SATU sumber mobile: matchMedia "(max-width: 767px)" — SELARAS breakpoint
 * CSS `md:` (768px) yang dipakai drawer desktop (`hidden md:block`) +
 * BottomSheet (`md:hidden`). JANGAN pakai UA (useDeviceTier.isMobile):
 * UA-desktop + jendela sempit = drawer hilang; UA-mobile + layar lebar =
 * dobel/hilang. Hook ini + kelas CSS = satu breakpoint yang sama.
 */
function useIsMobileCss(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    // Safari lama: addListener/removeListener.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    const legacy = mq as unknown as { addListener: (fn: (e: any) => void) => void; removeListener: (fn: (e: any) => void) => void };
    legacy.addListener(onChange);
    return () => legacy.removeListener(onChange);
  }, []);
  return isMobile;
}

/** Unduh blob + revoke URL (dipakai semua jalur ekspor 360°). */
function downloadExportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }
}

/**
 * D2 — Mux MP4/WebM via mediabunny dari track captureStream kanvas WebGL.
 * MediaStreamVideoTrackSource membaca frame hasil composite (aman dari kanvas
 * blank tanpa preserveDrawingBuffer). Import dinamis client-only.
 */
async function export360VideoMediabunny(
  track: MediaStreamVideoTrack,
  totalMs: number,
  format: "mp4" | "webm",
  onTick: (elapsedMs: number) => void
): Promise<void> {
  const { Output, BufferTarget, MediaStreamVideoTrackSource, Mp4OutputFormat, WebMOutputFormat, canEncodeVideo } =
    await import("mediabunny");
  const codec = format === "mp4" ? "avc" : "vp9";
  let bisaEncode = false;
  try {
    bisaEncode = await canEncodeVideo(codec);
  } catch {
    bisaEncode = false;
  }
  if (!bisaEncode) {
    throw new Error(`Browser ini tidak bisa encode ${codec.toUpperCase()} — pilih format lain.`);
  }
  const target = new BufferTarget();
  const output = new Output({
    format: format === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });
  const source = new MediaStreamVideoTrackSource(track, { codec, bitrate: 4_000_000 });
  output.addVideoTrack(source, { frameRate: 30 });
  try {
    await output.start();
    const startedAt = performance.now();
    try {
      // Tunggu hingga durasi penuh; source menarik frame real-time sendiri.
      // (Mediabunny butuh event-loop hidup — polling ringan per 200ms.)
      await new Promise<void>((resolve) => {
        const iv = setInterval(() => {
          const elapsed = performance.now() - startedAt;
          onTick(elapsed);
          if (elapsed >= totalMs) {
            clearInterval(iv);
            resolve();
          }
        }, 200);
      });
    } finally {
      try {
        source.close();
      } catch {
        // abaikan — finalize/cancel tetap jalan
      }
    }
    await output.finalize();
  } catch (err) {
    // Bebaskan encoder bila start/finalize gagal (anti leak di semua jalur).
    try {
      await output.cancel();
    } catch {
      // abaikan
    }
    throw err;
  }
  if (!target.buffer) throw new Error("Hasil encode kosong.");
  const mime = format === "mp4" ? "video/mp4" : "video/webm";
  downloadExportBlob(
    new Blob([target.buffer], { type: mime }),
    `kaos-kami-360-turntable.${format}`
  );
}

/**
 * D2 — Encode GIF via gifenc dari frame video captureStream (12fps, lebar 320px).
 * Frame diambil dari elemen <video> (hasil composite) sehingga tidak blank.
 */
async function export360Gif(
  stream: MediaStream,
  totalMs: number,
  onTick: (elapsedMs: number) => void
): Promise<void> {
  // gifenc tanpa tipe bawaan — bentuk runtime diverifikasi dari
  // node_modules/gifenc/src/index.js (GIFEncoder/quantize/applyPalette/bytes).
  // @ts-expect-error — gifenc tidak membawa deklarasi tipe
  const gifenc = await import("gifenc");
  const GIFEncoder = gifenc.GIFEncoder as () => {
    writeFrame: (index: Uint8Array | number[], w: number, h: number, opts: Record<string, unknown>) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  const quantize = gifenc.quantize as (rgba: Uint8Array | number[], maxColors: number) => number[][];
  const applyPalette = gifenc.applyPalette as (rgba: Uint8Array | number[], palette: number[][]) => Uint8Array | number[];

  const video = document.createElement("video");
  video.muted = true;
  (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
  video.srcObject = stream;
  await video.play().catch(() => {});
  // Tunggu metadata dimensi (maks ~2 dtk) agar bingkai tak 0×0.
  for (let i = 0; i < 20 && !(video.videoWidth > 0 && video.videoHeight > 0); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  const srcW = video.videoWidth || 480;
  const srcH = video.videoHeight || 480;
  const outW = Math.min(320, srcW);
  const outH = Math.max(2, Math.round((srcH / Math.max(1, srcW)) * outW));

  const frame = document.createElement("canvas");
  frame.width = outW;
  frame.height = outH;
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  if (!fctx) throw new Error("Kanvas 2D tidak tersedia.");

  const gif = GIFEncoder();
  const fps = 12;
  const frameDelayMs = 1000 / fps;
  const startedAt = performance.now();
  let frameCount = 0;
  try {
    while (performance.now() - startedAt < totalMs) {
      try {
        fctx.drawImage(video, 0, 0, outW, outH);
        const imgData = fctx.getImageData(0, 0, outW, outH);
        const palette = quantize(Array.from(imgData.data), 256);
        const index = applyPalette(Array.from(imgData.data), palette);
        gif.writeFrame(index, outW, outH, {
          palette,
          delay: Math.round(frameDelayMs),
          repeat: frameCount === 0 ? 0 : undefined,
          first: frameCount === 0,
        });
      } catch {
        // Frame sesekali gagal (video belum siap) — lewati, jangan gagalkan semua.
      }
      frameCount++;
      onTick(performance.now() - startedAt);
      await new Promise((r) => setTimeout(r, frameDelayMs));
    }
  } finally {
    try {
      video.pause();
    } catch {
      // abaikan
    }
    video.srcObject = null;
    video.removeAttribute("src");
  }
  if (frameCount === 0) throw new Error("Tak ada frame GIF yang tertangkap.");
  gif.finish();
  const bytes = gif.bytes();
  downloadExportBlob(new Blob([bytes as BlobPart], { type: "image/gif" }), "kaos-kami-360-turntable.gif");
}

  type StudioTab = "apparel" | "decals" | "pattern" | "sandbox" | "saved" | "team" | "export";

export const CustomizerDrawer: React.FC = () => {
  const {
    activeApparel,
    setActiveApparel,
    selectedColor,
    activeColorName,
    setSelectedColor,
    partColors,
    setPartColor,
    activeColorMode,
    setColorMode,
    setLogoPresetPos,
    applyLogoPreset,
    selectedSize,
    setSelectedSize,
    modelPosX,
    modelPosY,
    modelScale,
    modelRotY,
    setModelPosX,
    setModelPosY,
    setModelScale,
    setModelRotY,
    alignModel,
    resetModelTransform,
    decals,
    selectedDecalId,
    setSelectedDecalId,
    addDecal,
    updateDecal,
    removeDecal,
    savedDesigns,
    saveCurrentDesign,
    loadSavedDesign,
    deleteSavedDesign,
    studioTheme,
    setStudioTheme,
    materialFinish,
    setMaterialFinish,
    lightingPreset,
    setLightingPreset,
    isWireframe,
    toggleWireframe,
    isRotating,
    toggleRotating,
    setCameraPreset,
    isHideWebsiteUI,
    toggleHideWebsiteUI,
    isDrawerCollapsed,
    toggleDrawerCollapsed,
    drawerPosition,
    toggleDrawerPosition,
    interactionTool,
    setInteractionTool,
    viewMode,
    setViewMode,
    setActivePhase,
    animationPreset,
    setAnimationPreset,
    animationSpeed,
    setAnimationSpeed,
    modelMode,
    setModelMode,
    motionClip,
    setMotionClip,
    motionSpeed,
    setMotionSpeed,
    isGizmoVisible,
    toggleGizmoVisible,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      setActiveApparel: s.setActiveApparel,
      selectedColor: s.selectedColor,
      activeColorName: s.activeColorName,
      setSelectedColor: s.setSelectedColor,
      partColors: s.partColors,
      setPartColor: s.setPartColor,
      activeColorMode: s.activeColorMode,
      setColorMode: s.setColorMode,
      setLogoPresetPos: s.setLogoPresetPos,
      applyLogoPreset: s.applyLogoPreset,
      selectedSize: s.selectedSize,
      setSelectedSize: s.setSelectedSize,
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
      modelScale: s.modelScale,
      modelRotY: s.modelRotY,
      setModelPosX: s.setModelPosX,
      setModelPosY: s.setModelPosY,
      setModelScale: s.setModelScale,
      setModelRotY: s.setModelRotY,
      alignModel: s.alignModel,
      resetModelTransform: s.resetModelTransform,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      setSelectedDecalId: s.setSelectedDecalId,
      addDecal: s.addDecal,
      updateDecal: s.updateDecal,
      removeDecal: s.removeDecal,
      savedDesigns: s.savedDesigns,
      saveCurrentDesign: s.saveCurrentDesign,
      loadSavedDesign: s.loadSavedDesign,
      deleteSavedDesign: s.deleteSavedDesign,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      materialFinish: s.materialFinish,
      setMaterialFinish: s.setMaterialFinish,
      lightingPreset: s.lightingPreset,
      setLightingPreset: s.setLightingPreset,
      isWireframe: s.isWireframe,
      toggleWireframe: s.toggleWireframe,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      setCameraPreset: s.setCameraPreset,
      isHideWebsiteUI: s.isHideWebsiteUI,
      toggleHideWebsiteUI: s.toggleHideWebsiteUI,
      isDrawerCollapsed: s.isDrawerCollapsed,
      toggleDrawerCollapsed: s.toggleDrawerCollapsed,
      drawerPosition: s.drawerPosition,
      toggleDrawerPosition: s.toggleDrawerPosition,
      interactionTool: s.interactionTool,
      setInteractionTool: s.setInteractionTool,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      setActivePhase: s.setActivePhase,
      animationPreset: s.animationPreset,
      setAnimationPreset: s.setAnimationPreset,
      animationSpeed: s.animationSpeed,
      setAnimationSpeed: s.setAnimationSpeed,
      modelMode: s.modelMode,
      setModelMode: s.setModelMode,
      motionClip: s.motionClip,
      setMotionClip: s.setMotionClip,
      motionSpeed: s.motionSpeed,
      setMotionSpeed: s.setMotionSpeed,
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
    }))
  );

  const [activeTab, setActiveTab] = useState<StudioTab>("apparel");
  const [designTitleInput, setDesignTitleInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // SATU sumber mobile = CSS/matchMedia (lihat useIsMobileCss) — bukan UA.
  const isMobileCss = useIsMobileCss();

  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [enhancementMessage, setEnhancementMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Text Typography Customizer State
  const [showTextInput, setShowTextInput] = useState(false);
  const [customTextString, setCustomTextString] = useState("");
  const [customTextFont, setCustomTextFont] = useState<TextDecalOptions["fontFamily"]>("streetwear-bold");
  const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
  // M3.4 — Shadow teks opsional, default MATI (jujur DTF, tanpa halo cetak).
  const [customTextShadow, setCustomTextShadow] = useState(false);
  const [activePartId, setActivePartId] = useState<string>("body");
  const [showFabricEditor, setShowFabricEditor] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { data: session } = useSession();
  // M3.4 — BG remover: tolerance slider + target putih/hitam (foto malam).
  const [bgTolerance, setBgTolerance] = useState(35);
  const [bgTarget, setBgTarget] = useState<"white" | "black">("white");
  // M3.6 — Peringatan master belum tersimpan sebelum checkout (sekali per buka).
  const [masterWarnDismissed, setMasterWarnDismissed] = useState(false);

  const handleAddTextDecal = async () => {
    if (!customTextString.trim()) return;
    // M3.5 — SATU mesin teks (mesin yang sama dengan PatternStudio) + master.
    const textDataUrl = await generateTextDecalDataUrl({
      text: customTextString,
      fontFamily: customTextFont,
      textColor: customTextColor,
      enableShadow: customTextShadow,
    });
    if (!textDataUrl) return;

    const id = addDecal({
      name: `Teks: ${customTextString.slice(0, 10)}`,
      url: textDataUrl,
      targetSide: "front",
      x: 0,
      y: -0.05,
      scale: 0.11, // A4 standar dada (~20.5 cm)
      rotation: 0,
      opacity: 1,
    });
    // M3.5: master teks = raster mesin (wajib agar badge/checkout jujur).
    try { setMasterDataUrl(id, textDataUrl); } catch {}
    try { setOriginalMasterDataUrl(id, textDataUrl); } catch {}

    setSelectedDecalId(id);
    setCustomTextString("");
    setShowTextInput(false);
    setActiveTab("decals");
    // printPx dari raster AKTUAL (getImageSize): kanvas teks auto-fit
    // (aspek ~4:1 untuk quotes panjang). Tanpa ini printPx undefined →
    // pricing/aspek jatuh ke 1.0 dan cm + tier salah untuk teks lebar.
    void getImageSize(textDataUrl)
      .then((sz) => {
        try {
          updateDecal(id, { printPx: { w: sz.w, h: sz.h } });
        } catch {
          // abaikan — decal teks tetap tampil
        }
      })
      .catch(() => {});
  };

  // Pola eksklusif Sep 2026: starter 1-klik — 1 decal contoh dari template
  // (Logo Dada / Quotes / Full-Back). Mesin teks sama seperti tulisan custom
  // (generateTextDecalDataUrl) + master tersimpan, skala dijepit batas cetak.
  const handleApplyStarterTemplate = async (tplId: StarterTemplateId) => {
    const tpl = STUDIO_STARTER_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    try {
      setIsEnhancingImage(true);
      const dataUrl = await generateTextDecalDataUrl({
        text: tpl.sampleText,
        fontFamily: "streetwear-bold",
        textColor: "#FFFFFF",
        enableShadow: false,
      });
      if (!dataUrl) return;
      const maks = maxDecalScaleUnits(activeApparel, tpl.targetSide);
      const id = addDecal({
        name: `Contoh: ${tpl.label}`,
        url: dataUrl,
        targetSide: tpl.targetSide,
        x: tpl.x,
        y: tpl.y,
        scale: Math.max(0.04, Math.min(maks, tpl.scale)),
        rotation: 0,
        opacity: 1,
      });
      try { setMasterDataUrl(id, dataUrl); } catch {}
      try { setOriginalMasterDataUrl(id, dataUrl); } catch {}
      setSelectedDecalId(id);
      setActiveTab("decals");
      void getImageSize(dataUrl)
        .then((sz) => {
          try { updateDecal(id, { printPx: { w: sz.w, h: sz.h } }); } catch {}
        })
        .catch(() => {});
      setEnhancementMessage(`✅ Contoh "${tpl.label}" terpasang — silakan geser & ubah ukurannya.`);
      setTimeout(() => setEnhancementMessage(null), 4000);
    } catch {
      setEnhancementMessage("Contoh gagal dipasang. Coba lagi ya.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  const isVisible = viewMode === "studio";
  const currentApparelInfo = APPAREL_CATALOG[activeApparel];
  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];

  // Real-Time DPI & Aspect Ratio Quality Analyzer — uses actual image naturalWidth and naturalHeight
  const [decalPixelWidth, setDecalPixelWidth] = useState<number>(1200);
  const [decalPixelHeight, setDecalPixelHeight] = useState<number>(1200);
  const [decalAspectRatio, setDecalAspectRatio] = useState<number>(1.0);

  useEffect(() => {
    if (!activeDecal?.url) return;
    // Badge DPI WAJIB dari MASTER produksi (getMasterDataUrl), bukan preview
    // 1200px — preview downscale menipu (DPI tampil rendah padahal master
    // tajam, atau sebaliknya). Pola sama seperti upload (:getImageSize master).
    const decalId = activeDecal.id;
    const masterUrl = getMasterDataUrl(decalId, activeDecal.url);
    let alive = true;
    void getImageSize(masterUrl)
      .then((sz) => {
        if (!alive) return;
        const w = sz.w || 1200;
        const h = sz.h || 1200;
        setDecalPixelWidth(w);
        setDecalPixelHeight(h);
        setDecalAspectRatio(h > 0 ? w / h : 1.0);
      })
      .catch(() => {
        if (!alive) return;
        setDecalPixelWidth(1200);
        setDecalPixelHeight(1200);
        setDecalAspectRatio(1.0);
      });
    // Cleanup: cegah setState balapan bila URL ganti/unmount (audit).
    return () => {
      alive = false;
    };
  }, [activeDecal?.id, activeDecal?.url]);

  // Physical Scale 1:1 CM Calibration Engine per Apparel Type
  const physicalDimensions = useMemo(() => {
    if (!activeDecal) return null;
    return computePhysicalPrintDimensions(
      activeApparel,
      activeDecal.scale,
      activeDecal.y,
      decalAspectRatio,
      activeDecal.targetSide
    );
  }, [activeApparel, activeDecal, decalAspectRatio]);

  const qualityReport = useMemo(() => {
    if (!physicalDimensions) return null;
    // 2 sumbu (audit #21): pakai tinggi riil, bukan default 28,5cm.
    return evaluatePrintQuality(
      decalPixelWidth,
      physicalDimensions.widthCm,
      decalPixelHeight,
      (physicalDimensions as any).heightCm || physicalDimensions.widthCm
    );
  }, [physicalDimensions, decalPixelWidth, decalPixelHeight]);

  // M3.3+M3.4 — BG remover dari MASTER penuh (tanpa cap 1600) + choke 1px +
  // decontaminate tepi (di lib) + tolerance slider + target putih/hitam.
  // Original disimpan SEKALI sebelum timpa (tombol Kembalikan asli).
  const handleRemoveWhiteBg = async () => {
    if (!activeDecal) return;
    try {
      setIsEnhancingImage(true);
      // Sumber = MASTER (resolusi penuh), bukan preview 1200px.
      const srcUrl = getMasterDataUrl(activeDecal.id, activeDecal.url);
      try { setOriginalMasterDataUrl(activeDecal.id, srcUrl); } catch {}
      let srcW = 0;
      let srcH = 0;
      try {
        const s = await getImageSize(srcUrl);
        srcW = s.w; srcH = s.h;
      } catch {}
      const transparentDataUrl = await removeSolidBackground(srcUrl, bgTarget, bgTolerance);
      updateDecal(activeDecal.id, { url: transparentDataUrl });
      // F5: master ikut diperbarui agar tak basi (preview vs produksi sinkron).
      try {
        setMasterDataUrl(activeDecal.id, transparentDataUrl);
      } catch {
        // abaikan — update preview tetap sukses
      }
      try {
        const s = await getImageSize(transparentDataUrl);
        updateDecal(activeDecal.id, { printPx: { w: s.w, h: s.h } });
      } catch {}
      const label = bgTarget === "white" ? "putih" : "hitam";
      const downBadge = srcW > 0 && wasBgDownscaled(srcW, srcH)
        ? ` ⚠️ Master turun resolusi ke ${BG_MAX_SIDE}px (cap aman HP).`
        : "";
      setEnhancementMessage(`✨ Background ${label} berhasil dihilangkan (Transparan, tepi choke 1px).${downBadge}`);
      setTimeout(() => setEnhancementMessage(null), 5000);
    } catch (err: any) {
      setEnhancementMessage("Gagal menghapus background: " + (err?.message || "Kesalahan"));
      setTimeout(() => setEnhancementMessage(null), 3000);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  // M3.3 — Kembalikan file upload awal (original tak tersentuh).
  const handleRestoreOriginal = async () => {
    if (!activeDecal) return;
    try {
      const orig = getOriginalMasterDataUrl(activeDecal.id);
      if (!orig) {
        setEnhancementMessage("Original belum tersimpan untuk decal ini.");
        setTimeout(() => setEnhancementMessage(null), 3000);
        return;
      }
      updateDecal(activeDecal.id, { url: orig });
      try { setMasterDataUrl(activeDecal.id, orig); } catch {}
      try {
        const s = await getImageSize(orig);
        updateDecal(activeDecal.id, { printPx: { w: s.w, h: s.h } });
      } catch {}
      setEnhancementMessage("↩ Dikembalikan ke file asli upload awal.");
      setTimeout(() => setEnhancementMessage(null), 4000);
    } catch (e: any) {
      setEnhancementMessage(`Gagal kembalikan: ${e?.message ?? e}`);
      setTimeout(() => setEnhancementMessage(null), 3000);
    }
  };

  // Handler: Serverless Sharp Image Edge Sharpener
  // M3.3: sumber = MASTER penuh (bukan preview); original disimpan dulu.
  const handleSharpEnhance = async () => {
    if (!activeDecal) return;
    try {
      setIsEnhancingImage(true);
      const srcUrl = getMasterDataUrl(activeDecal.id, activeDecal.url);
      try { setOriginalMasterDataUrl(activeDecal.id, srcUrl); } catch {}
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: srcUrl }),
      });
      const data = await res.json();
      if (data.enhancedUrl) {
        updateDecal(activeDecal.id, { url: data.enhancedUrl });
        try { setMasterDataUrl(activeDecal.id, data.enhancedUrl); } catch {}
        try {
          const s = await getImageSize(data.enhancedUrl);
          updateDecal(activeDecal.id, { printPx: { w: s.w, h: s.h } });
        } catch {}
        setEnhancementMessage("🔍 Resolusi grafis berhasil dipertajam untuk sablon DTF!");
        setTimeout(() => setEnhancementMessage(null), 3000);
      }
    } catch (err: any) {
      setEnhancementMessage("Peringatan: Gagal memproses penajaman di server.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  // M3.6 — Status master per-decal + gate checkout jujur.
  // "Sudah tersimpan" = https R2. "Belum" = base64 lokal (guest tetap bisa
  // via server-hosting POST /api/designs draft, tapi user wajib tahu).
  const masterStatusList = useMemo(() => {
    return decals.map((d) => {
      let url = d.url;
      try { url = getMasterDataUrl(d.id, d.url); } catch {}
      const https = isHttpsMasterUrl(url);
      return { id: d.id, name: d.name, https, url };
    });
  }, [decals]);
  const unsavedMasters = masterStatusList.filter((m) => !m.https);
  // Reset gate bila semua master sudah https (decal baru → peringatan lagi).
  useEffect(() => {
    if (unsavedMasters.length === 0) setMasterWarnDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterStatusList.map((m) => `${m.id}:${m.https}`).join(",")]);
  const openCheckoutWithMasterGate = () => {
    if (unsavedMasters.length > 0 && !masterWarnDismissed) {
      setEnhancementMessage(
        `⚠️ Master belum tersimpan (${unsavedMasters.length} decal masih base64 lokal): ${unsavedMasters.slice(0, 3).map((m) => m.name).join(", ")}${unsavedMasters.length > 3 ? "…" : ""}. Login untuk upload R2, atau lanjut — guest akan di-hosting-kan server saat Save/Checkout (kualitas tetap master penuh). Klik PESAN sekali lagi untuk lanjut.`
      );
      setMasterWarnDismissed(true);
      setTimeout(() => setEnhancementMessage(null), 8000);
      return;
    }
    setIsCheckoutOpen(true);
  };

  // Estimasi live Makassar — SSOT 6-variabel (K-E): pigmen + kain + aspek
  // printPx + volume SELARAS struk checkout (legacy menyimpang, dilarang).
  const pricingTreatment = useMemo(() => {
    const matched = PRODUCT_COLORS.find(
      (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
    );
    const mat = materialFinishToPricing(materialFinish);
    return { isSpecialPigment: !!matched?.isSpecialPigment, ...mat };
  }, [selectedColor, materialFinish]);

  const pricing = useMemo(() => {
    return calculate6VariablePrice({
      apparelSlug: activeApparel,
      fabricThicknessSlug: pricingTreatment.fabricThicknessSlug,
      size: selectedSize,
      colorHex: selectedColor,
      isSpecialPigment: pricingTreatment.isSpecialPigment,
      decals,
      quantity: 1,
    });
  }, [activeApparel, selectedColor, selectedSize, decals, pricingTreatment]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsEnhancingImage(true);
      // FASE C1 — kontrak BARU compressImageClient (agen lain):
      // { dataUrl (preview hemat utk decal 3D), masterDataUrl (file asli utk
      //   produksi), previewDpiAt30cm, masterDpiAt30cm }.
      // DEFENSIF: bila field baru belum ada (kontrak lama), fallback ke
      // perilaku lama — dataUrl dipakai untuk keduanya.
      const r = (await compressImageClient(file, { maxDimension: 1200, quality: 0.9 })) as unknown as {
        dataUrl: string;
        masterDataUrl?: string;
        previewDpiAt30cm?: number;
        masterDpiAt30cm?: number;
      };
      const previewUrl = r.dataUrl;
      const master = r.masterDataUrl ?? r.dataUrl;
      // Warning DPI pakai angka MASTER (jujur untuk cetak), bukan preview.
      const masterDpi = r.masterDpiAt30cm ?? r.previewDpiAt30cm;

      const id = addDecal({
        name: `Sablon ${decals.length + 1} (${file.name.slice(0, 8)})`,
        url: previewUrl,
        targetSide: "front",
        x: 0,
        y: -0.05, // Clean chest placement, below neck/hood
        scale: 0.11, // A4 standar dada (~20.5 cm)
        rotation: 0,
        opacity: 1,
      });
      // Master produksi disimpan terpisah dari preview 3D.
      // K2: master base64 WAJIB di-upload ke R2 DULU (login: /api/upload/r2
      // kind=master) agar checkout kirim URL https, bukan base64. Guest (401)
      // tetap simpan base64 lokal — di-upload saat save/checkout via draft
      // POST /api/designs (server hosting-kan) atau fallback preview.
      try {
        setMasterDataUrl(id, master);
      } catch {
        // registry best-effort — upload tetap sukses
      }
      // M3.3: original = file upload awal (untuk Kembalikan asli).
      try { setOriginalMasterDataUrl(id, master); } catch {}
      if (typeof master === "string" && master.startsWith("data:image")) {
        void uploadMasterDataUrlToR2(master)
          .then((https) => {
            if (https) {
              try {
                setMasterDataUrl(id, https);
              } catch {
                // abaikan
              }
            }
          })
          .catch(() => {});
      }
      // Best-effort: dimensi master → printPx agar badge DPI & pricing jujur.
      void getImageSize(master)
        .then((sz) => {
          try {
            updateDecal(id, { printPx: { w: sz.w, h: sz.h } });
          } catch {
            // abaikan
          }
        })
        .catch(() => {});
      setSelectedDecalId(id);
      setActiveTab("decals");

      if (typeof masterDpi === "number" && Number.isFinite(masterDpi)) {
        if (masterDpi < 150) {
          setEnhancementMessage(
            `⚠️ Master ~${masterDpi} DPI @30cm — cetakan besar bisa pecah. Perkecil ukuran sablon atau pakai file asli yang lebih tajam.`
          );
        } else if (masterDpi < 300) {
          setEnhancementMessage(
            `Master ~${masterDpi} DPI @30cm — cukup jelas untuk DTF. Hasil terbaik bila ≥300 DPI.`
          );
          setTimeout(() => setEnhancementMessage(null), 5000);
        } else {
          setEnhancementMessage(`✅ Master ~${masterDpi} DPI @30cm — tajam & siap cetak.`);
          setTimeout(() => setEnhancementMessage(null), 4000);
        }
      }
    } catch (err: any) {
      console.error("Gagal mengompres gambar:", err);
      setEnhancementMessage("Gagal mengunggah gambar. Coba file JPG/PNG/WebP lain.");
      setTimeout(() => setEnhancementMessage(null), 4000);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  const [isRecording360, setIsRecording360] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  // FASE F — editor gambar per decal aktif + format ekspor 360° (D2).
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [export360Format, setExport360Format] = useState<Export360Format>("mp4");

  // D2 — Ekspor 360° rapi: MP4/WebM via mediabunny, GIF via gifenc.
  // Keduanya await import() dinamis client-only; cleanup stream/track di SEMUA
  // jalur keluar agar tidak leak. Tombol & pesan Bahasa Indonesia.
  const handleExport360Video = async () => {
    if (isRecording360) return;
    const format = export360Format;

    // Scope ke kanvas WebGL (audit #39 — querySelector mentah bisa dapat Fabric).
    const webglCanvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!webglCanvas) {
      setEnhancementMessage("Kanvas 3D tidak ditemukan. Buka studio lalu coba lagi.");
      setTimeout(() => setEnhancementMessage(null), 4000);
      return;
    }

    const wasRotating = isRotating;
    let stream: MediaStream | null = null;
    const totalMs = 5000;

    const cleanup = () => {
      try {
        stream?.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // abaikan per-track
          }
        });
      } catch {
        // abaikan
      }
      stream = null;
      if (!wasRotating) {
        try {
          toggleRotating();
        } catch {
          // abaikan
        }
      }
      setIsRecording360(false);
      setRecordingProgress(0);
    };

    try {
      setIsRecording360(true);
      setRecordingProgress(0);
      if (!wasRotating) toggleRotating();
      // Beri rotasi waktu jalan agar frame pertama ikut berputar.
      await new Promise((r) => setTimeout(r, 350));

      const capture = (
        webglCanvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }
      ).captureStream;
      stream =
        typeof capture === "function" ? capture.call(webglCanvas, 30) : null;
      if (!stream) {
        setEnhancementMessage("Browser tidak mendukung perekaman kanvas 3D langsung.");
        setTimeout(() => setEnhancementMessage(null), 4000);
        cleanup();
        return;
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        setEnhancementMessage("Track video 360° tidak tersedia di browser ini.");
        setTimeout(() => setEnhancementMessage(null), 4000);
        cleanup();
        return;
      }

      const onTick = (elapsedMs: number) =>
        setRecordingProgress(Math.min(100, Math.round((elapsedMs / totalMs) * 100)));

      if (format === "gif") {
        await export360Gif(stream, totalMs, onTick);
        setEnhancementMessage("✅ GIF 360° tersimpan — siap dibagikan ke medsos.");
      } else {
        await export360VideoMediabunny(videoTrack, totalMs, format, onTick);
        setEnhancementMessage(
          `✅ Video 360° ${format.toUpperCase()} tersimpan — siap upload TikTok/IG.`
        );
      }
      setTimeout(() => setEnhancementMessage(null), 5000);
      cleanup();
    } catch (err) {
      console.error("Gagal mengekspor video 360:", err);
      setEnhancementMessage(
        `Gagal mengekspor 360° (${err instanceof Error ? err.message : "kesalahan tak dikenal"}). Coba format lain atau pakai PNG.`
      );
      setTimeout(() => setEnhancementMessage(null), 5000);
      cleanup();
    }
  };

  const handleExportPNG = (viewName: string = "mockup") => {
    // Scope ke kanvas WebGL (audit #39 — querySelector mentah bisa dapat Fabric).
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `kaos-kami-${activeApparel}-${viewName}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Ekspor tampak belakang: tunggu animasi preset kamera TUNTAS
  // (cameraPreset===null, poll 50ms + timeout 2 dtk) + 2 frame segar sebelum
  // toDataURL — JANGAN setTimeout 300ms fix (animasi 0.6s → tangkapan miring
  // di tengah jalan). invalidate(): R3F invalidate() hanya callable di dalam
  // <Canvas>; dari drawer ini frame segar dijamin ganda — (1) preset null
  // berarti CameraRig sudah render frame final dalam mode frameloop always,
  // (2) 2× requestAnimationFrame, (3) toDataURL ter-patch CanvasStage me-render
  // sinkron gl.render(scene,camera) sebelum baca piksel.
  const waitForCameraPresetSettled = async (timeoutMs = 2000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (useConfiguratorStore.getState().cameraPreset === null) return;
      } catch {
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const handleExportBackPNG = async (viewName: string = "back-view") => {
    setCameraPreset("back");
    await waitForCameraPresetSettled(2000);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    handleExportPNG(viewName);
  };

  // M4.5 + pola eksklusif Sep 2026 — kartu bagikan branded 1080×1350 (4:5,
  // pas feed IG/TikTok): mockup kanvas + nama brand + warna + harga.
  // Web Share API (level 2, file) bila tersedia, fallback unduh PNG.
  // 100% client-side, tanpa server.
  const [isSharing, setIsSharing] = useState(false);
  const buildBrandedShareCard = (
    mockupDataUrl: string,
    meta: { apparel: string; warna: string; harga: string }
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const W = 1080;
      const H = 1350;
      const cnv = document.createElement("canvas");
      cnv.width = W;
      cnv.height = H;
      const ctx = cnv.getContext("2d");
      if (!ctx) {
        reject(new Error("kanvas 2D tak tersedia"));
        return;
      }
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1a1a1e");
      bg.addColorStop(0.6, "#121214");
      bg.addColorStop(1, "#0c0c0e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#E65100";
      ctx.fillRect(0, 0, W, 10);
      const img = new Image();
      img.onload = () => {
        try {
          ctx.textAlign = "center";
          ctx.fillStyle = "#E65100";
          ctx.font = "900 40px system-ui, sans-serif";
          ctx.fillText("KAOS KAMI • MAKASSAR", W / 2, 110);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "500 28px system-ui, sans-serif";
          ctx.fillText("Studio Sablon DTF — desain sendiri, kami cetak", W / 2, 155);
          const boxX = 80;
          const boxY = 200;
          const boxW = W - 160;
          const boxH = 800;
          const skala = Math.min(boxW / img.width, boxH / img.height);
          const dw = img.width * skala;
          const dh = img.height * skala;
          ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 44px system-ui, sans-serif";
          const nama = meta.apparel.length > 34 ? meta.apparel.slice(0, 34) + "…" : meta.apparel;
          ctx.fillText(nama, W / 2, 1075);
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.font = "500 32px system-ui, sans-serif";
          ctx.fillText(meta.warna, W / 2, 1125);
          ctx.fillStyle = "#E65100";
          ctx.font = "900 56px system-ui, sans-serif";
          ctx.fillText(meta.harga, W / 2, 1195);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "500 26px system-ui, sans-serif";
          ctx.fillText("Didesain di Studio Kaos Kami", W / 2, 1290);
          cnv.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("gagal membaca piksel kanvas"));
          }, "image/png");
        } catch (e) {
          reject(e instanceof Error ? e : new Error("gagal menyusun kartu"));
        }
      };
      img.onerror = () => reject(new Error("gagal membaca piksel kanvas"));
      img.src = mockupDataUrl;
    });
  };
  const handleShareMockup = async () => {
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setEnhancementMessage("Kanvas 3D tidak ditemukan. Buka studio lalu coba lagi.");
      setTimeout(() => setEnhancementMessage(null), 4000);
      return;
    }
    setIsSharing(true);
    try {
      const mockupUrl = canvas.toDataURL("image/png");
      const blob = await buildBrandedShareCard(mockupUrl, {
        apparel: currentApparelInfo.name,
        warna: activeColorName,
        harga: pricing.formattedTotal,
      });
      const file = new File([blob], `kaos-kami-${activeApparel}-1080x1350.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title: string; text: string }) => Promise<void> };
      if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
        await nav.share({
          files: [file],
          title: "Mockup Kaos Kami",
          text: `Mockup ${APPAREL_CATALOG[activeApparel]?.name ?? activeApparel} — ${activeColorName} (Kaos Kami Makassar)`,
        });
        setEnhancementMessage("✅ Mockup dibagikan. Sampai jumpa di lapangan!");
      } else {
        // Fallback: unduh PNG (perilaku lama, tetap berguna di desktop).
        handleExportPNG("bagikan");
        setEnhancementMessage("Perangkat tak mendukung berbagi langsung — PNG diunduh, silakan teruskan manual.");
      }
    } catch (e) {
      // AbortError = user batal → diam. Error lain → fallback unduh.
      if (e instanceof DOMException && e.name === "AbortError") {
        setIsSharing(false);
        return;
      }
      try {
        handleExportPNG("bagikan");
      } catch {}
      setEnhancementMessage("Berbagi gagal — PNG diunduh sebagai gantinya.");
    } finally {
      setIsSharing(false);
      setTimeout(() => setEnhancementMessage(null), 4000);
    }
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        setEnhancementMessage("Gagal salin link. Salin manual dari address bar.");
        setTimeout(() => setEnhancementMessage(null), 3000);
      });
    } else {
      setEnhancementMessage("Browser tak mendukung salin otomatis. Salin manual dari address bar.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    }
  };

  const handleSendToWhatsApp = () => {
    const printList = pricing.decalLayers.map((s) => `  • ${s.name} (${s.tier} ${s.widthCm.toFixed(1)}×${s.heightCm.toFixed(1)}cm): +IDR ${s.costIdr.toLocaleString("id-ID")}`).join("\n");
    const text = encodeURIComponent(
      `*Halo Kaos Kami Makassar, saya ingin memesan Mockup Custom:*\n\n` +
      `• *Pakaian:* ${currentApparelInfo.name} (Base IDR ${pricing.basePriceIdr.toLocaleString("id-ID")})\n` +
      (pricing.fabricThicknessSurchargeIdr > 0 ? `• *Kain ${pricing.fabricThicknessSlug}:* +IDR ${pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")}\n` : "") +
      `• *Warna:* ${activeColorName} (${selectedColor}) ${pricing.colorTreatmentSurchargeIdr > 0 ? `(+IDR ${pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")})` : ""}\n` +
      `• *Ukuran:* ${selectedSize} ${pricing.sizeSurchargeIdr > 0 ? `(+IDR ${pricing.sizeSurchargeIdr.toLocaleString("id-ID")})` : ""}\n` +
      `• *Material Finish:* ${materialFinish.toUpperCase()}\n` +
      `• *Sablon DTF:* ${decals.length} Layer(s)\n` +
      `${printList ? printList + "\n" : ""}` +
      `• *TOTAL ESTIMASI HARGA:* ${pricing.formattedTotal}\n\n` +
      `Mohon info proses produksi & pengiriman. Terima kasih!`
    );
    // shopWaLink = nomor workshop SSOT (audit: tanpa phone = pesan tanpa penerima).
    window.open(shopWaLink(decodeURIComponent(text)), "_blank");
  };

  const handleSaveDesign = () => {
    // Blokir lembut guest ber-gambar: POST /api/designs menolak 401 bila
    // decals/master base64 tanpa login (anti penimbunan bucket). Cegah 401
    // misterius — arahkan login/upload dulu dengan pesan jelas; desain tetap
    // aman di HP ini (localStorage) hingga user login lalu SIMPAN lagi.
    // Berlaku desktop + BottomSheet mobile (SATU fungsi ini dipakai keduanya).
    if (!session) {
      try {
        const hasBase64Image = decals.some((d) => {
          const u = typeof d?.url === "string" ? d.url : "";
          if (u.startsWith("data:image") || u.startsWith("blob:")) return true;
          try {
            const m = getMasterDataUrl(d.id, d.url);
            return typeof m === "string" && m.startsWith("data:image");
          } catch {
            return false;
          }
        });
        if (hasBase64Image) {
          setEnhancementMessage(
            "🔒 Login dulu untuk simpan desain ber-gambar — akun tamu tak bisa upload (server tolak 401). Klik LOGIN / DAFTAR di bawah, lalu tekan SIMPAN lagi. Desain tetap aman di HP ini."
          );
          setTimeout(() => setEnhancementMessage(null), 9000);
          setIsAuthOpen(true);
          return;
        }
      } catch {
        // Pemeriksaan best-effort — lanjut simpan bila tak terbaca.
      }
    }
    saveCurrentDesign(designTitleInput.trim() ? designTitleInput.trim() : undefined);
    setDesignTitleInput("");
    setActiveTab("saved");
  };

  // Hapus decal + master + original produksinya (anti yatim di registry).
  const handleRemoveDecal = (id: string) => {
    try {
      clearMasterDataUrl(id);
    } catch {
      // abaikan
    }
    try {
      clearOriginalMasterDataUrl(id);
    } catch {
      // abaikan
    }
    removeDecal(id);
  };

  const handleReturnToStory = () => {
    setViewMode("story");
    setActivePhase(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Interactive Tool Switcher (Top Left) */}
      <div className="fixed top-20 left-4 sm:left-8 z-40 flex items-center space-x-1.5 p-1.5 rounded-2xl glass-panel shadow-xl pointer-events-auto border border-border-subtle">
        <button
          onClick={() => setInteractionTool("rotate")}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
            interactionTool === "rotate"
              ? "bg-brand-accent text-canvas font-bold shadow-md"
              : "text-text-muted hover:text-text-primary hover:bg-surface"
          }`}
          title="Mode putar (klik kiri + geser untuk memutar 360°)"
        >
          <Compass size={14} />
          <span className="hidden sm:inline">PUTAR 360°</span>
        </button>

        <button
          onClick={() => setInteractionTool("pan")}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
            interactionTool === "pan"
              ? "bg-brand-accent text-canvas font-bold shadow-md"
              : "text-text-muted hover:text-text-primary hover:bg-surface"
          }`}
          title="Mode geser (klik kiri + geser di mana saja untuk memindahkan model)"
        >
          <Hand size={14} />
          <span className="hidden sm:inline">GESER</span>
        </button>
      </div>

      {/* Collapsed Pill Button (When minimized) */}
      {isDrawerCollapsed && (
        <div
          className={`fixed bottom-6 z-40 pointer-events-auto transition-all ${
            drawerPosition === "left" ? "left-6" : "right-6"
          }`}
        >
          <button
            onClick={toggleDrawerCollapsed}
            className="flex items-center space-x-3 px-5 py-3.5 rounded-2xl glass-panel-elevated shadow-2xl border border-brand-accent/50 text-text-primary hover:border-brand-accent transition-all group"
          >
            <div
              className="w-4 h-4 rounded-full border border-border-strong"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="font-display font-black text-xs uppercase tracking-wider">
              {currentApparelInfo.name} · {pricing.formattedTotal}
            </span>
            <ChevronUp size={16} className="text-brand-accent group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Full Customizer Drawer — Desktop (md+ via CSS), Mobile via BottomSheet di bawah.
          SATU breakpoint: CSS `hidden md:block` di sini + matchMedia 767px di
          useIsMobileCss untuk BottomSheet — keduanya = <768px mobile. */}
      <section
        className={`fixed bottom-0 z-40 p-3 sm:p-6 md:p-8 max-w-xl w-full pointer-events-none transition-all duration-500 ease-out hidden md:block ${
          drawerPosition === "left" ? "left-0" : "right-0"
        } ${
          isDrawerCollapsed
            ? "opacity-0 translate-y-32 pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="w-full rounded-2xl glass-panel-elevated shadow-2xl pointer-events-auto border border-border-subtle overflow-hidden max-h-[85vh] flex flex-col backdrop-blur-2xl">
          {/* Top Header Bar */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface/80">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                <span className="text-[10px] font-mono text-brand-accent tracking-widest uppercase">
                  {"// STUDIO MOCKUP 3D"}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-black uppercase text-text-primary mt-0.5">
                {currentApparelInfo.name}
              </h3>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Dock Left / Right Toggle */}
              <button
                onClick={toggleDrawerPosition}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
                title={drawerPosition === "right" ? "Pindah ke kiri" : "Pindah ke kanan"}
              >
                {drawerPosition === "right" ? <PanelLeftClose size={14} /> : <PanelRightClose size={14} />}
              </button>

              {/* Minimize Drawer Button */}
              <button
                onClick={toggleDrawerCollapsed}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
                title="Kecilkan panel"
              >
                <ChevronDown size={14} />
              </button>

              {/* Clean Mockup View Toggle */}
              <button
                onClick={toggleHideWebsiteUI}
                className={`p-2 rounded-xl border transition-all ${
                  isHideWebsiteUI
                    ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                    : "bg-surface text-text-muted border-border-subtle hover:text-text-primary"
                }`}
                title={isHideWebsiteUI ? "Tampilkan UI web" : "Tampilan bersih layar penuh"}
              >
                {isHideWebsiteUI ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Auto Spin Toggle */}
              <button
                onClick={toggleRotating}
                className={`p-2 rounded-xl border transition-all ${
                  isRotating
                    ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.5)]"
                    : "bg-surface text-text-muted border-border-subtle hover:text-text-primary"
                }`}
                title="Putar otomatis 360°"
              >
                <RotateCcw size={14} className={isRotating ? "animate-spin" : ""} />
              </button>

              {/* Close Studio / Return to Story */}
              <button
                onClick={handleReturnToStory}
                className="p-2 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas transition-all flex items-center space-x-1 font-mono text-[11px] font-bold"
                title="Keluar studio & kembali ke cerita"
              >
                <X size={14} />
                <span className="hidden sm:inline">CLOSE</span>
              </button>
            </div>
          </div>

          {/* Clean Robust Tab Navigation */}
          <div className="flex border-b border-border-subtle bg-canvas/80 text-xs font-mono">
            {[
              { id: "apparel", label: "APPAREL", icon: Layers },
              { id: "decals", label: `SABLON (${decals.length})`, icon: Sliders },
              { id: "pattern", label: "POLA 2D", icon: PenTool },
              { id: "team", label: "TIM", icon: Users },
              { id: "sandbox", label: "SANDBOX", icon: Sparkles },
              { id: "saved", label: `SAVED (${savedDesigns.length})`, icon: Bookmark },
              { id: "export", label: "EXPORT", icon: Camera },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as StudioTab)}
                className={`flex-1 py-3 px-1.5 flex items-center justify-center space-x-1 border-b-2 transition-all ${
                  activeTab === id
                    ? "border-brand-accent text-brand-accent font-bold bg-surface/60 shadow-inner"
                    : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/30"
                }`}
              >
                <Icon size={12} />
                <span className="text-[10px] sm:text-xs font-bold uppercase truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-text-primary">
            {/* TAB 1: APPAREL & COLOR */}
            {activeTab === "apparel" && (
              <>
                {/* 3D Mockup Apparel Switcher */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">
                    PILIH JENIS PAKAIAN:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(Object.keys(APPAREL_CATALOG) as ApparelType[]).map((type) => {
                      const info = APPAREL_CATALOG[type];
                      const locked = !info.mockupEnabled;
                      const comingSoon = !info.orderable;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            if (!locked) setActiveApparel(type);
                          }}
                          disabled={locked}
                          title={
                            locked
                              ? `${info.name} — mockup 3D SEGERA hadir`
                              : comingSoon
                                ? `${info.name} — mockup bisa dicoba, pemesanan SEGERA dibuka`
                                : info.name
                          }
                          aria-disabled={locked}
                          className={`relative py-3 px-1.5 rounded-xl font-mono text-xs font-bold border transition-all uppercase truncate flex flex-col items-center justify-center space-y-1 ${
                            activeApparel === type
                              ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_14px_rgba(230,81,0,0.5)] scale-[1.02]"
                              : locked
                                ? "bg-surface border-border-subtle text-text-muted opacity-40 cursor-not-allowed"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-text-muted"
                          }`}
                        >
                          {comingSoon && (
                            <span className="absolute top-1 right-1 px-1.5 py-px rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-black tracking-wider">
                              {locked ? "🔒 SEGERA" : "SEGERA"}
                            </span>
                          )}
                          <span className="text-base">
                            {type === "tshirt" ? "👕" : type === "longsleeve" ? "🦾" : type === "crewneck" ? "🎽" : type === "hoodie" ? "🧥" : type === "shirt" ? "👔" : type === "cap" ? "🧢" : type === "shorts" ? "🩳" : "👖"}
                          </span>
                          <span className="text-[9px] sm:text-[10px] tracking-wider font-bold">
                            {type === "tshirt"
                              ? "T-SHIRT"
                              : type === "longsleeve"
                              ? "LONGSLEEVE"
                              : type === "crewneck"
                              ? "CREWNECK"
                              : type === "hoodie"
                              ? "HOODIE"
                              : type === "shirt"
                              ? "JACKET"
                              : type === "cap"
                              ? "TOPI"
                              : type === "shorts"
                              ? "SHORTS"
                              : "CELANA"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colorway Picker — sablon focus: single solid (multi-part hidden, tailor bukan fokus UMKM) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">WARNA BAHAN (FOKUS SABLON):</span>
                    <span className="text-brand-accent font-bold text-[10px] uppercase">SOLID</span>
                  </div>

                  {/* Multi-Part Target Selector (Afilah) */}
                  {activeColorMode === "multi-part" && (
                    <div className="p-3 rounded-xl bg-surface/80 border border-brand-accent/30 mb-3 space-y-2 font-mono text-xs animate-fadeIn">
                      <span className="block text-[10px] text-text-muted font-bold uppercase">
                        PILIH BAGIAN YANG DIWARNAI:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "body", label: "👕 BODI" },
                          { id: "sleeves", label: "💪 LENGAN" },
                          { id: "collar", label: "⭕ KERAH" },
                        ].map((part) => {
                          const currentColor = partColors[part.id] || selectedColor;
                          const isActive = activePartId === part.id;
                          return (
                            <button
                              key={part.id}
                              onClick={() => setActivePartId(part.id)}
                              className={`py-1.5 px-1 rounded-lg border text-[10px] flex flex-col items-center justify-center space-y-1 transition-all ${
                                isActive
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                  : "bg-black/40 border-white/10 hover:border-brand-accent"
                              }`}
                            >
                              <span className="font-bold">{part.label}</span>
                              <span
                                className="w-4 h-4 rounded-full border border-white/20"
                                style={{ backgroundColor: currentColor }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-text-muted leading-tight">
                        *Pilih bagian di atas, lalu klik warna palet di bawah untuk mengubahnya. {activePartId.toUpperCase()} aktif.
                      </p>
                    </div>
                  )}

                  {/* Colorway Palette */}
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">PALET WARNA:</span>
                    <span className="text-text-primary font-bold">
                      {activeColorName} {pricing.colorTreatmentSurchargeIdr > 0 && `(+IDR ${pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")})`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRODUCT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedColor(c.hex, c.name);
                          if (activeColorMode === "multi-part") {
                            setPartColor(activePartId, c.hex);
                          }
                        }}
                        style={{ backgroundColor: c.hex }}
                        aria-label={c.name}
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative ${
                          (activeColorMode === "multi-part"
                            ? (partColors[activePartId] || selectedColor).toLowerCase() === c.hex.toLowerCase()
                            : selectedColor.toLowerCase() === c.hex.toLowerCase())
                            ? "border-brand-accent scale-110 shadow-[0_0_10px_rgba(230,81,0,0.6)]"
                            : "border-border-subtle hover:border-text-muted"
                        }`}
                      >
                        {(activeColorMode === "multi-part"
                          ? (partColors[activePartId] || selectedColor).toLowerCase() === c.hex.toLowerCase()
                          : selectedColor.toLowerCase() === c.hex.toLowerCase()) && (
                          <Check size={13} className={c.id === "chalk" ? "text-neutral-900 stroke-[3]" : "text-white stroke-[3]"} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* M4.4 — palet kurasi workshop (tanpa color-wheel bebas):
                      warna di luar palet membuat klaim sablon tak akurat
                      (pigmen custom = hasil cetak tak terjamin). */}
                  <p className="text-[10px] font-mono text-text-muted uppercase">
                    Palet kurasi workshop — {PRODUCT_COLORS.length} warna teruji sablon DTF
                  </p>
                </div>

                {/* Sizing Matrix */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">UKURAN:</span>
                    {pricing.sizeSurchargeIdr > 0 && (
                      <span className="text-brand-accent font-bold">+IDR {pricing.sizeSurchargeIdr.toLocaleString("id-ID")}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentApparelInfo.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 px-4 rounded-lg font-mono text-xs font-bold border transition-all ${
                          selectedSize === size
                            ? "bg-text-primary text-canvas border-text-primary shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: DECALS & SABLON STUDIO */}
            {activeTab === "decals" && (
              <>
                {/* Starter 1-klik — contoh siap pakai biar kanvas tak kosong */}
                <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 space-y-2">
                  <span className="block text-[10px] font-mono text-brand-accent font-bold uppercase">
                    ✨ MULAI DARI CONTOH (1 KLIK):
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {STUDIO_STARTER_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => void handleApplyStarterTemplate(t.id)}
                        disabled={isEnhancingImage}
                        title={`${t.label} — ${t.desc}`}
                        className="py-2 px-1 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-center transition-all disabled:opacity-50"
                      >
                        <span className="block text-[11px] font-mono font-bold text-white">{t.label}</span>
                        <span className="block mt-0.5 text-[9px] font-mono text-text-muted leading-tight">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-text-muted leading-snug">
                    Contoh menempel sebagai 1 decal teks — bebas digeser, diperkecil, atau dihapus.
                  </p>
                </div>
                {/* Add Decal & Text Creation Suite */}
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl border border-dashed border-border-subtle hover:border-brand-accent bg-surface/50 text-[11px] font-mono text-text-primary transition-all hover:bg-surface font-bold shadow-sm"
                    >
                      <Upload size={13} className="text-brand-accent" />
                      <span>+ UPLOAD GAMBAR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTextInput(!showTextInput)}
                      className={`flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl border border-dashed text-[11px] font-mono transition-all font-bold shadow-sm ${
                        showTextInput
                          ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                          : "border-border-subtle hover:border-brand-accent bg-surface/50 text-text-primary hover:bg-surface"
                      }`}
                    >
                      <Type size={13} className="text-brand-accent" />
                      <span>+ TULIS TEKS 3D</span>
                    </button>
                  </div>

                  {/* Fabric.js Advanced Toggle (Vihan — lazy, code-split) */}
                  <button
                    type="button"
                    onClick={() => setShowFabricEditor(!showFabricEditor)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-mono font-bold transition-all ${
                      showFabricEditor
                        ? "bg-brand-accent text-canvas border-brand-accent"
                        : "bg-surface border-white/10 text-text-muted hover:text-brand-accent"
                    }`}
                  >
                    <Layers size={13} />
                    <span>{showFabricEditor ? "TUTUP EDITOR 2D" : "EDITOR 2D LANJUTAN"}</span>
                  </button>
                  {showFabricEditor && (
                    <FabricEditor
                      printWidthCm={(() => {
                        const d = decals.find((x) => x.id === selectedDecalId) ?? decals[0];
                        // SSOT multiplier (Fase 13: bukan peta hardcode — drift
                        // kalibrasi). Cap jatuh ke tshirt (arsip saja); pants
                        // punya spek sendiri (celana coming-soon).
                        const m = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
                        return Math.min(30, Math.max(3.5, (d?.scale ?? 0.11) * m));
                      })()}
                      printHeightCm={(() => {
                        const d = decals.find((x) => x.id === selectedDecalId) ?? decals[0];
                        const m = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
                        return Math.min(42, Math.max(3.5, (d?.scale ?? 0.11) * m));
                      })()}
                      onExport={(dataUrl, printPx) => {
                        const id = addDecal({
                          name: `Fabric ${decals.length + 1}`,
                          url: dataUrl,
                          targetSide: "front",
                          x: 0,
                          y: -0.05,
                          scale: 0.11, // A4 standar dada (~11.2 cm pada kaos, terkalibrasi ukur)
                          rotation: 0,
                          opacity: 1,
                          ...(printPx ? { printPx } : {}),
                        });
                        setSelectedDecalId(id);
                        setShowFabricEditor(false);
                      }}
                    />
                  )}

                  {/* Interactive Text Generator Drawer Input */}
                  {showTextInput && (
                    <div className="p-3.5 rounded-xl bg-surface/80 border border-brand-accent/30 space-y-3 animate-fadeIn font-mono text-xs">
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase mb-1 font-bold">
                          Ketik Tulisan / Quotes / Nama:
                        </label>
                        <input
                          type="text"
                          value={customTextString}
                          onChange={(e) => setCustomTextString(e.target.value)}
                          placeholder="mis. MAKASSAR NEVER DIES"
                          className="w-full px-3 py-2 rounded-xl bg-canvas border border-white/10 text-white focus:outline-none focus:border-brand-accent text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-text-muted uppercase mb-1">
                            Pilihan Font:
                          </label>
                          <select
                            value={customTextFont}
                            onChange={(e) => setCustomTextFont(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-canvas border border-white/10 text-white text-[10px] focus:outline-none focus:border-brand-accent"
                          >
                            {FONT_PRESETS.map((font) => (
                              <option key={font.id} value={font.id}>
                                {font.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-text-muted uppercase mb-1">
                            Warna Font:
                          </label>
                          <div className="flex items-center space-x-1.5">
                            {["#FFFFFF", "#000000", "#E65100", "#FFD700", "#E53935", "#1E88E5"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setCustomTextColor(c)}
                                className={`w-5 h-5 rounded-full border ${
                                  customTextColor === c ? "border-brand-accent ring-2 ring-brand-accent/40" : "border-white/20"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* M3.4 — Shadow teks opsional, default MATI (DTF jujur). */}
                      <label className="flex items-center gap-2 text-[11px] text-text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={customTextShadow}
                          onChange={(e) => setCustomTextShadow(e.target.checked)}
                          className="accent-brand-accent w-4 h-4"
                        />
                        <span>Bayangan teks (shadow) — <b>default MATI</b> agar cetak DTF tajam</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddTextDecal}
                        className="w-full py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        <span>PASANG TEKS DI KAOS 3D</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Decal Layer List + M3.6 status master per-decal */}
                {decals.length > 0 ? (
                  <div className="space-y-3">
                    <span className="block text-xs font-mono text-text-muted font-bold">LAPISAN SABLON AKTIF:</span>
                    {/* M3.6: hijau = master https tersimpan; kuning = base64 lokal
                        (guest via server-hosting saat Save/Checkout — tetap master penuh). */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-[10px]">
                      <span className="block font-bold text-text-muted uppercase">STATUS FILE CETAK:</span>
                      {masterStatusList.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                          <span className="text-white truncate">{m.name}</span>
                          {m.https ? (
                            <span className="shrink-0 text-emerald-300 font-bold">✅ File cetak tersimpan</span>
                          ) : (
                            <span className="shrink-0 text-amber-300 font-bold">⚠️ File cetak masih di HP ini</span>
                          )}
                        </div>
                      ))}
                      {unsavedMasters.length > 0 && (
                        <p className="text-amber-300/90 leading-snug">
                          Guest tetap bisa checkout — master base64 di-hosting-kan server via Save/Checkout (kualitas master penuh, bukan preview).
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {decals.map((d, index) => {
                        const sablonInfo = pricing.decalLayers.find((s) => s.id === d.id);
                        const saved = masterStatusList.find((m) => m.id === d.id)?.https;
                        return (
                          <button
                            key={d.id}
                            onClick={() => setSelectedDecalId(d.id)}
                            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all shrink-0 ${
                              (selectedDecalId ?? decals[0]?.id) === d.id
                                ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            <span>#{index + 1} {d.targetSide.toUpperCase()}</span>
                            <span className="text-[10px] opacity-75">({sablonInfo?.tier})</span>
                            <span title={saved ? "Master https tersimpan" : "Master base64 lokal — belum tersimpan"}>
                              {saved ? "🟢" : "🟡"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Decal Transformation Sliders */}
                    {activeDecal && (
                      <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-mono text-xs font-bold text-text-primary">
                            ATUR: {activeDecal.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRemoveDecal(activeDecal.id)}
                              className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-400/40 transition-all"
                              title="Hapus sablon"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Placement Selector — SSOT validSidesFor (hood = hoodie
                            saja; cap/pants/shorts = depan saja). */}
                        <div className="space-y-1">
                          <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                            POSISI PENEMPATAN SABLON:
                          </span>
                          <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
                            {(
                              [
                                { id: "front", label: activeApparel === "cap" ? "🧢 DEPAN TOPI" : activeApparel === "pants" ? "👖 PAHA DEPAN" : activeApparel === "shorts" ? "🩳 PAHA DEPAN" : "👕 DADA" },
                                { id: "back", label: "🔙 PUNGGUNG" },
                                { id: "left_sleeve", label: "👈 LGN KIRI" },
                                { id: "right_sleeve", label: "👉 LGN KANAN" },
                                { id: "hood", label: "🧢 TUDUNG" },
                              ] as Array<{ id: string; label: string }>
                            )
                              .filter((side) =>
                                (validSidesFor(activeApparel) as string[]).includes(side.id)
                              )
                              .map((side) => (
                                <button
                                  key={side.id}
                                  type="button"
                                  onClick={() => updateDecal(activeDecal.id, { targetSide: side.id as any })}
                                  className={`py-1.5 px-1 rounded-lg border font-bold text-center transition-all ${
                                    activeDecal.targetSide === side.id
                                      ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                      : "bg-surface border-white/10 text-text-muted hover:text-white"
                                  }`}
                                >
                                  {side.label}
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Live Physical 1:1 CM Scale & Real-Time DPI Quality Badges */}
                        {physicalDimensions && (
                          <div className="p-3 rounded-xl bg-surface/70 border border-border-subtle space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                                <Ruler size={13} className="text-brand-accent" />
                                <span>UKURAN CETAK ASLI:</span>
                              </span>
                              <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                📏 {physicalDimensions.formattedText}
                              </span>
                            </div>

                            {qualityReport && (
                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="text-[11px] font-mono text-text-muted">KETAJAMAN SABLON:</span>
                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${qualityReport.badgeColor}`}>
                                  {qualityReport.badgeLabel}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                              <span>JARAK DARI KERAH:</span>
                              <span className="text-text-primary font-bold">~{physicalDimensions.offsetFromCollarCm} cm</span>
                            </div>
                          </div>
                        )}

                        {/* Enhancement Message Notification */}
                        {enhancementMessage && (
                          <div className="p-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-mono flex items-center gap-1.5 animate-fadeIn">
                            <ShieldCheck size={14} />
                            <span>{enhancementMessage}</span>
                          </div>
                        )}

                        {/* M3.4 — BG remover: tolerance slider + checker preview + putih/hitam */}
                        <div className="p-3 rounded-xl bg-surface border border-white/10 space-y-2.5">
                          <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                            HAPUS LATAR FOTO (TEPI RAPI 1PX)
                          </span>
                          {/* Preview checkerboard jujur: transparan terlihat kotak-kotak */}
                          <div
                            className="rounded-xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[96px] max-h-[160px] p-2"
                            style={{
                              backgroundImage:
                                "linear-gradient(45deg, #3a3a3e 25%, transparent 25%, transparent 75%, #3a3a3e 75%), linear-gradient(45deg, #3a3a3e 25%, transparent 25%, transparent 75%, #3a3a3e 75%)",
                              backgroundColor: "#1c1c1f",
                              backgroundSize: "16px 16px",
                              backgroundPosition: "0 0, 8px 8px",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeDecal.url}
                              alt={`Pratinjau transparansi ${activeDecal.name}`}
                              className="max-h-[140px] w-auto object-contain"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setBgTarget("white")}
                              aria-pressed={bgTarget === "white"}
                              className={`py-2 rounded-xl border text-[11px] font-mono font-bold transition-all ${
                                bgTarget === "white"
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                  : "bg-surface border-white/10 text-text-muted hover:text-white"
                              }`}
                            >
                              ⬜ BG PUTIH
                            </button>
                            <button
                              type="button"
                              onClick={() => setBgTarget("black")}
                              aria-pressed={bgTarget === "black"}
                              title="Untuk foto malam / background gelap"
                              className={`py-2 rounded-xl border text-[11px] font-mono font-bold transition-all ${
                                bgTarget === "black"
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                  : "bg-surface border-white/10 text-text-muted hover:text-white"
                              }`}
                            >
                              ⬛ BG HITAM (FOTO MALAM)
                            </button>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                              <span className="font-bold uppercase">Toleransi</span>
                              <span className="text-text-primary font-bold">{bgTolerance}</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={80}
                              step={1}
                              value={bgTolerance}
                              onChange={(e) => setBgTolerance(parseInt(e.target.value, 10))}
                              className="w-full accent-brand-accent cursor-pointer"
                              aria-label="Toleransi hapus background"
                            />
                            <p className="text-[10px] font-mono text-text-muted mt-1">
                              Kecil = hanya {bgTarget === "white" ? "putih bersih" : "hitam pekat"} yang hilang; besar = {bgTarget === "white" ? "abu terang" : "abu gelap"} ikut hilang (risiko melubangi motif).
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* FASE F — editor gambar in-mockup per decal aktif */}
                            <button
                              type="button"
                              onClick={() => setIsImageEditorOpen(true)}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/40 hover:bg-brand-accent/25 text-[11px] font-mono font-bold text-brand-accent transition-all col-span-2"
                              title="Sesuaikan warna, potong & putar, efek sablon, atau hapus background dengan AI"
                            >
                              <span>🖌 EDIT GAMBAR</span>
                            </button>
                            <button
                              type="button"
                              disabled={isEnhancingImage}
                              onClick={handleRemoveWhiteBg}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary hover:text-white transition-all disabled:opacity-50 col-span-2"
                              title={`Hapus background ${bgTarget === "white" ? "putih" : "hitam"} dari MASTER penuh (tolerance ${bgTolerance})`}
                            >
                              {isEnhancingImage ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} className="text-brand-accent" />}
                              <span>✨ HAPUS BG {bgTarget === "white" ? "PUTIH" : "HITAM"} (TOL {bgTolerance})</span>
                            </button>
                            {/* M3.3 — Kembalikan asli (tampil bila original ada) */}
                            {(() => {
                              try {
                                if (!hasOriginalMaster(activeDecal.id)) return null;
                              } catch { return null; }
                              return (
                                <button
                                  type="button"
                                  onClick={() => void handleRestoreOriginal()}
                                  className="col-span-2 py-2 px-2.5 rounded-xl bg-surface border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold hover:bg-emerald-500/10 transition-all"
                                  title="Pulihkan file upload awal"
                                >
                                  ↩ KEMBALIKAN ASLI
                                </button>
                              );
                            })()}
                            {/* Tombol PERTAJAM DTF disembunyikan Sep 2026: endpoint
                                /api/enhance-image (sharp native) tidak bisa jalan
                                di Workers (500). Handler handleSharpEnhance
                                dipertahankan untuk dihidupkan ulang versi
                                client-side. */}
                          </div>
                        </div>

                        {/* Interactive Direct-Manipulation Gizmo Toggle Banner */}
                        <div className="p-3 rounded-xl bg-surface border border-white/10 hover:border-brand-accent/40 flex items-center justify-between gap-2.5 text-xs font-mono transition-all">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${isGizmoVisible ? "bg-brand-accent text-canvas" : "bg-neutral-800 text-neutral-400"} flex items-center justify-center shrink-0 shadow-md transition-all`}>
                              <Move size={16} className={isGizmoVisible ? "animate-pulse" : ""} />
                            </div>
                            <div>
                              <span className="font-bold text-white block">GIZMO KONTROL 3D</span>
                              <span className="text-[10px] text-text-muted">
                                {isGizmoVisible ? "Aktif di atas baju 3D" : "Disembunyikan (Mode Preview Bersih)"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={toggleGizmoVisible}
                            className={`py-1.5 px-3 rounded-lg font-mono text-[11px] font-bold transition-all ${
                              isGizmoVisible
                                ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.3)] hover:brightness-110"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {isGizmoVisible ? "SEMBUNYIKAN" : "TAMPILKAN"}
                          </button>
                        </div>

                        {/* 3-Position Anatomical Logo Presets (Ariyan T-Designer) */}
                        <div className="space-y-1.5 pt-1">
                          <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                            POSISI LOGO CEPAT:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(0);
                                applyLogoPreset();
                              }}
                              className="py-2 px-1 rounded-xl bg-surface border border-white/10 hover:border-brand-accent hover:text-brand-accent text-white font-bold transition-all text-center"
                              title="Posisikan logo di saku dada kiri"
                            >
                              📍 SAKU KIRI
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(1);
                                applyLogoPreset();
                              }}
                              className="py-2 px-1 rounded-xl bg-surface border border-white/10 hover:border-brand-accent hover:text-brand-accent text-white font-bold transition-all text-center"
                              title="Posisikan logo di tengah dada"
                            >
                              📍 TENGAH
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(2);
                                applyLogoPreset();
                              }}
                              className="py-2 px-1 rounded-xl bg-surface border border-white/10 hover:border-brand-accent hover:text-brand-accent text-white font-bold transition-all text-center"
                              title="Posisikan logo di saku dada kanan"
                            >
                              📍 SAKU KANAN
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER KIRI-KANAN</span></span>
                            <span>{activeDecal.x.toFixed(2)}</span>
                          </div>
                          {(() => {
                            // Batas geser SSOT per sisi (DECAL_MOVE_LIMITS):
                            // lengan ±0.12 (melingkar), tudung ±0.09 —
                            // slider global ±0.35 melepas decal dari kain.
                            const limX =
                              activeDecal.targetSide === "hood"
                                ? DECAL_MOVE_LIMITS.hoodX
                                : activeDecal.targetSide === "left_sleeve" || activeDecal.targetSide === "right_sleeve"
                                ? DECAL_MOVE_LIMITS.sleeveSlideX
                                : DECAL_MOVE_LIMITS.frontBackX;
                            return (
                              <input
                                type="range"
                                min={-limX}
                                max={limX}
                                step="0.01"
                                value={activeDecal.x}
                                onChange={(e) => {
                                  const jepit = clampDecalXY(activeDecal.targetSide, parseFloat(e.target.value), activeDecal.y);
                                  updateDecal(activeDecal.id, { x: jepit.x, y: jepit.y });
                                }}
                                className="w-full accent-brand-accent cursor-pointer"
                              />
                            );
                          })()}
                        </div>

                        {/* Position Y */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER ATAS-BAWAH</span></span>
                            <span>{activeDecal.y.toFixed(2)}</span>
                          </div>
                          {(() => {
                            const limY =
                              activeDecal.targetSide === "hood"
                                ? DECAL_MOVE_LIMITS.hoodY
                                : activeDecal.targetSide === "left_sleeve" || activeDecal.targetSide === "right_sleeve"
                                ? DECAL_MOVE_LIMITS.sleeveY
                                : DECAL_MOVE_LIMITS.frontBackY;
                            return (
                              <input
                                type="range"
                                min={-limY}
                                max={limY}
                                step="0.01"
                                value={activeDecal.y}
                                onChange={(e) => {
                                  const jepit = clampDecalXY(activeDecal.targetSide, activeDecal.x, parseFloat(e.target.value));
                                  updateDecal(activeDecal.id, { x: jepit.x, y: jepit.y });
                                }}
                                className="w-full accent-brand-accent cursor-pointer"
                              />
                            );
                          })()}
                        </div>

                        {/* Scale / Size (Directly affects DTF print cost) */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span>UKURAN CETAK (DTF):</span>
                            <span className="text-brand-accent font-bold">
                              {(() => {
                                if (!activeDecal || !physicalDimensions) return "—";
                                // Pricing pakai Math.max(w,h) (pricingEngine) —
                                // label slider WAJIB sama agar portrait tak tampil
                                // tier lebih murah dari yang ditagih.
                                const tier = classifyPrintTierByCm(
                                  Math.max(physicalDimensions.widthCm, physicalDimensions.heightCm)
                                );
                                return `${PRINT_TIER_LABEL[tier]} (+${printTierCost(tier) / 1000}k) • ${physicalDimensions.widthCm.toFixed(1)}cm`;
                              })()}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.04"
                            max={activeDecal ? maxDecalScaleUnits(activeApparel, activeDecal.targetSide) : 0.3}
                            step="0.002"
                            value={activeDecal.scale}
                            onChange={(e) => updateDecal(activeDecal.id, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                          {/* DTF Standard Size Presets — cm akurat per apparel, bukan skala mentah */}
                          <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[9px]">
                            {(() => {
                              const mm = APPAREL_PHYSICAL_SPECS[activeApparel]?.meshMultiplier ?? 101.8;
                              const presets = [
                                { label: "A6 (9cm)", cm: 9 },
                                { label: "A5 (15cm)", cm: 15 },
                                { label: "A4 (21cm)", cm: 21 },
                                { label: "A3 (29cm)", cm: 29 },
                              ].map((p) => ({ ...p, scale: p.cm / mm }));
                              return presets.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => updateDecal(activeDecal.id, { scale: preset.scale })}
                                  className={`py-1 rounded bg-surface border text-center transition-all ${
                                    Math.abs(activeDecal.scale - preset.scale) < preset.scale * 0.15
                                      ? "border-brand-accent text-brand-accent font-bold"
                                      : "border-white/10 text-text-muted hover:text-white"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ));
                            })()}
                          </div>
                        </div>

                        {/* Rotation */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><RotateCw size={11} /> <span>PUTAR</span></span>
                            <span>{activeDecal.rotation}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="5"
                            value={activeDecal.rotation}
                            onChange={(e) => updateDecal(activeDecal.id, { rotation: parseInt(e.target.value, 10) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>

                        {/* Opacity */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span>TRANSPARANSI</span>
                            <span>{Math.round(activeDecal.opacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={activeDecal.opacity}
                            onChange={(e) => updateDecal(activeDecal.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border-subtle text-text-muted font-mono text-xs space-y-2">
                    <p className="font-bold text-text-primary">Belum ada sablon — mulai dari contoh 1 klik di atas 👆</p>
                    <p className="text-[10px]">Atau unggah gambarmu / tulis teks sendiri. Semua bebas digeser di kaos 3D.</p>
                  </div>
                )}
              </>
            )}

            {/* TAB 2B: POLA 2D (skala cm, sinkron live ke 3D) */}
            {activeTab === "pattern" && <PatternStudioLazy />}

            {/* TAB 3: SANDBOX ENVIRONMENT, 3D ROTATION & TRANSFORMS */}
            {activeTab === "sandbox" && (
              <>
                {/* MODE MANEKIN BERJALAN (in-place) — default BAJU = perilaku
                    lama (mesh apparel + decal/gizmo/guide). MANEKIN = manekin
                    Quaternius beranimasi; gizmo/guide/decal disembunyikan
                    (decal di badan butuh skinning = follow-up). */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-xs font-mono font-bold text-text-primary">
                      MODE MODEL 3D
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">IN-PLACE · TANPA ROOT-MOTION</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode model 3D">
                    {(
                      [
                        { id: "garment", label: "BAJU" },
                        { id: "mannequin", label: "MANEKIN" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setModelMode(id)}
                        className={`py-2 px-2 rounded-xl font-mono text-xs font-bold border transition-all ${
                          modelMode === id
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {modelMode === "mannequin" && (
                    <>
                      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Klip gerak manekin">
                        {(
                          [
                            { id: "idle", label: "DIAM" },
                            { id: "walk", label: "JALAN" },
                            { id: "jog", label: "LARI" },
                            { id: "sprint", label: "SPRINT" },
                          ] as const
                        ).map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setMotionClip(id)}
                            className={`py-2 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                              motionClip === id
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-muted">KECEPATAN</span>
                        <input
                          type="range"
                          min="0.2"
                          max="2"
                          step="0.05"
                          value={motionSpeed}
                          onChange={(e) => setMotionSpeed(parseFloat(e.target.value))}
                          className="flex-1 accent-brand-accent"
                          aria-label="Kecepatan gerak manekin"
                        />
                        <span className="text-[10px] font-mono text-brand-accent font-bold">{motionSpeed.toFixed(2)}x</span>
                      </div>
                      <p className="text-[10px] font-mono text-text-muted">
                        Warna manekin ikut warna kaos (tab APPAREL). Sablon & guide disembunyikan di mode ini.
                      </p>
                    </>
                  )}
                </div>

                {/* 3D Model Manual Rotation (0° - 360°) */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                      <AngleIcon size={13} className="text-brand-accent" />
                      <span>PUTAR MODEL 3D (SAMPING)</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-brand-accent">{modelRotY}°</span>
                  </div>

                  {/* Quick Angle Presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "FRONT", deg: 0 },
                      { label: "3/4 ANGLE", deg: 45 },
                      { label: "PROFILE", deg: 90 },
                      { label: "BACK", deg: 180 },
                    ].map(({ label, deg }) => (
                      <button
                        key={label}
                        onClick={() => setModelRotY(deg)}
                        className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all truncate ${
                          modelRotY === deg
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Continuous Rotation Slider */}
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={modelRotY}
                    onChange={(e) => setModelRotY(parseInt(e.target.value, 10))}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>

                {/* Full Position & Scale Sliders */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-xs font-mono font-bold text-text-primary">
                      POSISI & UKURAN MODEL
                    </span>
                    <button
                      onClick={resetModelTransform}
                      className="text-[10px] font-mono text-brand-accent hover:underline uppercase font-bold"
                    >
                      TENGAHKAN LAGI
                    </button>
                  </div>

                  {/* 1-Click Quick Alignments */}
                  <div>
                    <span className="block text-[10px] font-mono text-text-muted uppercase mb-1.5 font-bold">
                      POSISI CEPAT:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => alignModel("left")}
                        className={`py-2 px-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 ${
                          modelPosX < -0.2
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <span>⬅ LEFT</span>
                      </button>

                      <button
                        onClick={() => alignModel("center")}
                        className={`py-2 px-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 ${
                          Math.abs(modelPosX) <= 0.2
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <span>⏺ CENTER</span>
                      </button>

                      <button
                        onClick={() => alignModel("right")}
                        className={`py-2 px-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 ${
                          modelPosX > 0.2
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <span>RIGHT ➡</span>
                      </button>
                    </div>
                  </div>

                  {/* Continuous Smooth Slider: MOVE UP / DOWN (Y) */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER ATAS / BAWAH</span></span>
                      <span>{modelPosY.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.75"
                      max="0.75"
                      step="0.01"
                      value={modelPosY}
                      onChange={(e) => setModelPosY(parseFloat(e.target.value))}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>

                  {/* Continuous Smooth Slider: MOVE LEFT / RIGHT (X) */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER KIRI / KANAN</span></span>
                      <span>{modelPosX.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.75"
                      max="0.75"
                      step="0.01"
                      value={modelPosX}
                      onChange={(e) => setModelPosX(parseFloat(e.target.value))}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>

                  {/* Continuous Smooth Slider: MODEL ZOOM / SCALE */}
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                      <span className="flex items-center space-x-1"><ZoomIn size={11} /> <span>ZOOM MODEL</span></span>
                      <span>{Math.round(modelScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.02"
                      value={modelScale}
                      onChange={(e) => setModelScale(parseFloat(e.target.value))}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Theme Switcher */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">TEMA LATAR STUDIO:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "obsidian", label: "OBSIDIAN DARK", icon: Moon },
                      { id: "gallery", label: "GALLERY LIGHT", icon: Sun },
                      { id: "concrete", label: "CONCRETE", icon: Box },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setStudioTheme(id as StudioTheme)}
                        className={`py-2.5 px-2 rounded-xl font-mono text-xs font-bold border transition-all flex flex-col items-center space-y-1 ${
                          studioTheme === id
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="text-[9px] sm:text-[10px]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cahaya studio — Bahasa manusia, logika sama */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">CAHAYA STUDIO:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "editorial", label: "TEGAS" },
                      { id: "cyber", label: "HANGAT" },
                      { id: "soft-daylight", label: "SIANG LEMBUT" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setLightingPreset(id as LightingPreset)}
                        className={`py-2 px-2 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                          lightingPreset === id
                            ? "bg-text-primary text-canvas border-text-primary shadow-sm"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* Pola eksklusif Sep 2026: 3 suasana tanpa HDR — hanya tint
                        IBL prosedural (StudioEnvironment). Tanpa unduhan. */}
                    <span className="block text-[10px] font-mono text-text-muted mt-3 mb-1.5 font-bold uppercase">
                      SUASANA (GANTI NUANSA, TANPA UNDUHAN):
                    </span>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Suasana cahaya studio">
                      {STUDIO_MOODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLightingPreset(m.id)}
                          title={m.desc}
                          aria-pressed={lightingPreset === m.id}
                          className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                            lightingPreset === m.id
                              ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold shadow-[0_0_10px_rgba(230,81,0,0.3)]"
                              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                          }`}
                        >
                          <span className="block text-base leading-none">{m.icon}</span>
                          <span className="block mt-1 text-[10px] font-mono font-bold uppercase">{m.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] font-mono text-text-muted leading-snug">
                      Golden hangat · Sunset senja · Galeri putih jujur — lampu tak berubah, hanya nuansa.
                    </p>
                </div>

                {/* Material Finish */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">BAHAN KAIN:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "combed-cotton", label: "COMBED COTTON" },
                      { id: "french-terry", label: "HEAVY FLEECE" },
                      { id: "poplin", label: "COTTON POPLIN" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setMaterialFinish(id as MaterialFinish)}
                        className={`py-2 px-2 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                          materialFinish === id
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Presets (BLUEPRINT-02 §4 VirtualThreads benchmark) */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">GERAKAN KAIN:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "static", label: "STATIC" },
                      { id: "wind", label: "WIND" },
                      { id: "walking", label: "WALK" },
                      { id: "knit", label: "KNIT" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setAnimationPreset(id as any)}
                        className={`py-2 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                          animationPreset === id
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-md"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono text-text-muted">SPEED</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                      className="flex-1 accent-brand-accent"
                    />
                    <span className="text-[10px] font-mono text-brand-accent font-bold">{animationSpeed.toFixed(1)}x</span>
                  </div>
                </div>

                {/* Technical Wireframe Mode */}                <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-xs font-mono text-text-primary font-bold">MODE KERANGKA</span>
                  <button
                    onClick={toggleWireframe}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                      isWireframe
                        ? "bg-brand-accent text-canvas"
                        : "bg-canvas text-text-muted border border-border-subtle"
                    }`}
                  >
                    {isWireframe ? "ON" : "OFF"}
                  </button>
                </div>
                {/* Lab Kain verlet — cubit & tarik, rasa GSM + angin */}
                <ClothLabLazy />
              </>
            )}

            {/* TAB 4: SAVED DESIGNS (Preset Manager) — login gate: tamu localStorage, login → DB + Dashboard */}
            {activeTab === "saved" && (
              <div className="space-y-4">
                {!session && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono flex flex-col gap-2">
                    <span className="font-bold">🔒 Login untuk simpan permanen di Dashboard</span>
                    <span>Sekarang desain cuma di HP ini (localStorage). Login pakai Google/Email biar tersimpan di akun & bisa dipesan nanti.</span>
                    <button onClick={() => setIsAuthOpen(true)} className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs">
                      LOGIN / DAFTAR SEKARANG
                    </button>
                  </div>
                )}
                {/* Save Current Design Box */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    SIMPAN DESAIN INI:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={designTitleInput}
                      onChange={(e) => setDesignTitleInput(e.target.value)}
                      placeholder="mis. Kaos Komunitas 01"
                      className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                    />
                    <button
                      onClick={handleSaveDesign}
                      className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-md"
                    >
                      <Bookmark size={13} />
                      <span>SAVE</span>
                    </button>
                  </div>
                  {/* Blokir lembut guest ber-gambar: pesan + tombol login (desktop). */}
                  {enhancementMessage && (
                    <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex flex-col gap-2">
                      <span>{enhancementMessage}</span>
                      {!session && (
                        <button onClick={() => setIsAuthOpen(true)} className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs">
                          LOGIN / DAFTAR SEKARANG
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Saved Designs List */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-text-muted block font-bold">
                    DESAIN TERSIMPAN ({savedDesigns.length}):
                  </span>
                  {savedDesigns.length > 0 ? (
                    savedDesigns.map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-3 hover:border-border-strong transition-all"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div
                            className="w-5 h-5 rounded-full border border-border-strong shrink-0"
                            style={{ backgroundColor: d.colorHex }}
                          />
                          <div className="overflow-hidden">
                            <span className="block text-xs font-mono font-bold text-text-primary truncate">
                              {d.title}
                            </span>
                            <span className="block text-[10px] font-mono text-text-muted">
                              {d.apparel.toUpperCase()} · {d.size} · {d.decals.length} Decal(s) · {d.savedAt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => loadSavedDesign(d.id)}
                            className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-mono font-bold text-brand-accent hover:bg-brand-accent hover:text-canvas transition-colors"
                          >
                            LOAD
                          </button>
                          <button
                            onClick={() => deleteSavedDesign(d.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400"
                            title="Delete Preset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center rounded-xl border border-dashed border-border-subtle text-text-muted font-mono text-xs">
                      Belum ada desain tersimpan. Atur mockup lalu tekan SIMPAN di atas!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB TIM: JERSEY REGU (M4.1) — 1 desain → roster → keranjang massal */}
            {activeTab === "team" && <TeamwearPanelLazy />}

            {/* TAB 5: EXPORT & SHARE */}
            {activeTab === "export" && (
              <div className="space-y-4 py-2">
                {/* 1. Download Views Suite */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    📸 UNDUH GAMBAR MOCKUP:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportPNG("front-view")}
                      className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1"
                    >
                      <Camera size={16} className="text-brand-accent" />
                      <span>TAMPAK DEPAN (PNG)</span>
                    </button>

                    <button
                      onClick={() => void handleExportBackPNG("back-view")}
                      className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1"
                    >
                      <Camera size={16} className="text-brand-accent" />
                      <span>TAMPAK BELAKANG (PNG)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleExportPNG("current-view")}
                    className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)]"
                  >
                    UNDUH TAMPILAN INI (PNG)
                  </button>

                  {/* M4.5 — Bagikan mockup: Web Share API + fallback unduh. */}
                  <button
                    onClick={() => void handleShareMockup()}
                    disabled={isSharing}
                    className="w-full py-3.5 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Share2 size={15} />
                    <span>{isSharing ? "MENYIAPKAN KARTU…" : "BAGIKAN KARTU MOCKUP 📤"}</span>
                  </button>

                  {/* 360° Turntable Video Exporter (D2: mediabunny MP4/WebM + gifenc GIF) */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                      FORMAT VIDEO 360°:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Format video 360">
                      {(
                        [
                          { id: "mp4", label: "MP4", hint: "TikTok/IG" },
                          { id: "webm", label: "WebM", hint: "Web" },
                          { id: "gif", label: "GIF", hint: "Chat/Stiker" },
                        ] as Array<{ id: Export360Format; label: string; hint: string }>
                      ).map((f) => (
                        <button
                          key={f.id}
                          role="radio"
                          aria-checked={export360Format === f.id}
                          onClick={() => setExport360Format(f.id)}
                          disabled={isRecording360}
                          className={`py-2 px-1 rounded-xl border text-center transition-all disabled:opacity-50 ${
                            export360Format === f.id
                              ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                              : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                          }`}
                        >
                          <span className="block text-[11px] font-mono font-bold">{f.label}</span>
                          <span className="block text-[9px] font-mono opacity-75">{f.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleExport360Video}
                    disabled={isRecording360}
                    className="w-full py-3.5 px-4 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Video size={16} className={isRecording360 ? "animate-pulse text-red-500" : ""} />
                    <span>
                      {isRecording360
                        ? `MEREKAM 360° ${export360Format.toUpperCase()} (${recordingProgress}%)...`
                        : `EKSPOR 360° ${export360Format.toUpperCase()} (±5 DETIK)`}
                    </span>
                  </button>
                </div>

                {/* 2. Share & Order Inquiry Suite */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    BAGIKAN & PESAN PRODUKSI:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyShareLink}
                      className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex items-center justify-center space-x-1.5"
                    >
                      {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      <span>{copiedLink ? "LINK TERSALIN!" : "SALIN LINK"}</span>
                    </button>

                    <button
                      onClick={handleSendToWhatsApp}
                      className="py-2.5 px-2 rounded-xl bg-[#25D366]/20 border border-[#25D366]/50 hover:bg-[#25D366] text-text-primary hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <MessageCircle size={14} className="text-[#25D366] group-hover:text-white" />
                      <span>PESAN VIA WA</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Itemized Mathematical Price Calculation Footer */}
          <div className="p-4 border-t border-border-subtle bg-surface/95 flex flex-col space-y-2">
            {/* Price Breakdown Tooltip / Accordion */}
            {showPriceBreakdown && (
              <div className="p-3 rounded-xl bg-canvas border border-border-subtle text-xs font-mono space-y-1.5 mb-1 animate-in fade-in">
                <div className="flex justify-between text-text-muted">
                  <span>Base {currentApparelInfo.name}:</span>
                  <span>IDR {pricing.basePriceIdr.toLocaleString("id-ID")}</span>
                </div>
                {pricing.fabricThicknessSurchargeIdr > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Kain {pricing.fabricThicknessSlug}:</span>
                    <span>+IDR {pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.sleeveSurchargeIdr > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Lengan panjang:</span>
                    <span>+IDR {pricing.sleeveSurchargeIdr.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.colorTreatmentSurchargeIdr > 0 && (
                  <div className="flex justify-between text-brand-accent">
                    <span>Special Pigment Dye:</span>
                    <span>+IDR {pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.sizeSurchargeIdr > 0 && (
                  <div className="flex justify-between text-brand-accent">
                    <span>Extra Fabric ({selectedSize}):</span>
                    <span>+IDR {pricing.sizeSurchargeIdr.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.decalLayers.map((s) => (
                  <div key={s.id} className="flex justify-between text-text-muted">
                    <span className="truncate pr-2">{s.name} ({s.tier} {s.widthCm.toFixed(1)}×{s.heightCm.toFixed(1)}cm):</span>
                    <span>+IDR {s.costIdr.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="block text-[10px] font-mono text-text-muted uppercase">ESTIMASI HARGA MAKASSAR</span>
                  <button
                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                    className="text-text-muted hover:text-brand-accent transition-colors"
                    title="Lihat rincian harga"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <span className="font-display font-black text-base sm:text-lg text-brand-accent">
                  {pricing.formattedTotal}
                </span>
                {pricing.fabricThicknessSurchargeIdr > 0 && (
                  <span className="block text-[10px] font-mono text-text-muted">
                    Termasuk kain {pricing.fabricThicknessSlug} (+IDR{" "}
                    {pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")})
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openCheckoutWithMasterGate}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(230,81,0,0.4)] text-center flex items-center justify-center space-x-2"
                >
                  <ShoppingCart size={14} />
                  <span>PESAN (DUITKU)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToWhatsApp}
                  className="py-3 px-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-text-primary hover:bg-[#25D366] hover:text-white font-mono font-bold text-xs uppercase transition-all flex items-center justify-center space-x-1.5"
                  title="Konsultasi & Pesan Manual via WhatsApp"
                >
                  <MessageCircle size={14} className="text-[#25D366]" />
                  <span className="hidden sm:inline">WA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile BottomSheet (vaul pattern) — SATU sumber: matchMedia 767px
          (useIsMobileCss), selaras `hidden md:block` drawer + `md:hidden` sheet. */}
      {isMobileCss && !isDrawerCollapsed && (
        <BottomSheet>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Tab studio">
              {[
                { id: "apparel", label: "APPAREL" },
                { id: "decals", label: `SABLON (${decals.length})` },
                { id: "pattern", label: "POLA 2D" },
                { id: "sandbox", label: "SANDBOX" },
                { id: "saved", label: `SAVED (${savedDesigns.length})` },
                { id: "export", label: "EXPORT" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                    activeTab === t.id
                      ? "bg-brand-accent text-canvas border-brand-accent"
                      : "bg-surface border-white/10 text-text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Isi tab di HP (audit #7 — sebelumnya cuma ringkasan). */}
            {activeTab === "apparel" && (
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(APPAREL_CATALOG) as Array<keyof typeof APPAREL_CATALOG>).map((type) => {
                  const info = APPAREL_CATALOG[type];
                  const locked = !info.mockupEnabled;
                  const comingSoon = !info.orderable;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (!locked) setActiveApparel(type as any);
                      }}
                      disabled={locked}
                      aria-disabled={locked}
                      className={`relative min-h-[44px] px-3 py-2 rounded-xl border text-[11px] font-bold uppercase ${
                        activeApparel === type
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                          : locked
                            ? "bg-surface border-white/10 text-text-muted opacity-40"
                            : "bg-surface border-white/10 text-white"
                      }`}
                    >
                      {String(type)}
                      {comingSoon && (
                        <span className="ml-1.5 px-1.5 py-px rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black">
                          {locked ? "🔒 SEGERA" : "SEGERA"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "decals" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-[11px] uppercase"
                  >
                    + UPLOAD LOGO
                  </button>
                  <button
                    onClick={() => setShowTextInput((v) => !v)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold text-[11px] uppercase"
                  >
                    + TEKS
                  </button>
                </div>
                {showTextInput && (
                  <div className="flex gap-2">
                    <input
                      value={customTextString}
                      onChange={(e) => setCustomTextString(e.target.value)}
                      placeholder="Tulis teks sablon…"
                      maxLength={24}
                      className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-white/10 text-white text-base"
                    />
                    <button
                      onClick={handleAddTextDecal}
                      className="min-h-[44px] px-4 rounded-xl bg-brand-accent text-canvas font-bold text-[11px]"
                    >
                      OK
                    </button>
                  </div>
                )}
                {decals.length === 0 ? (
                  <p className="text-[11px] text-text-muted">Belum ada sablon. Upload logo atau tambah teks.</p>
                ) : (
                  decals.map((d) => (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between p-2 rounded-xl border ${
                        selectedDecalId === d.id ? "border-brand-accent bg-brand-accent/10" : "border-white/10 bg-surface"
                      }`}
                    >
                      <button onClick={() => setSelectedDecalId(d.id)} className="flex-1 text-left text-[11px] text-white truncate min-h-[44px] flex items-center">
                        {d.name}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDecalId(d.id);
                          setIsImageEditorOpen(true);
                        }}
                        aria-label={`Edit gambar ${d.name}`}
                        title="Edit gambar (sesuaikan, potong, efek, hapus BG)"
                        className="min-w-[44px] min-h-[44px] px-2 text-brand-accent font-bold text-sm"
                      >
                        🖌
                      </button>
                      <button
                        onClick={() => handleRemoveDecal(d.id)}
                        aria-label={`Hapus ${d.name}`}
                        className="min-w-[44px] min-h-[44px] px-2 text-rose-300 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "pattern" && <PatternStudioLazy />}

            {activeTab === "sandbox" && (
              <div className="space-y-2">
                {/* MODE MANEKIN BERJALAN (mobile) — sama seperti desktop. */}
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode model 3D">
                  {(
                    [
                      { id: "garment", label: "BAJU" },
                      { id: "mannequin", label: "MANEKIN" },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setModelMode(id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-[11px] font-bold uppercase ${
                        modelMode === id
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                          : "bg-surface border-white/10 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {modelMode === "mannequin" && (
                  <>
                    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Klip gerak manekin">
                      {(
                        [
                          { id: "idle", label: "DIAM" },
                          { id: "walk", label: "JALAN" },
                          { id: "jog", label: "LARI" },
                          { id: "sprint", label: "SPRINT" },
                        ] as const
                      ).map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setMotionClip(id)}
                          className={`min-h-[44px] px-1 py-2 rounded-xl border text-[11px] font-bold uppercase ${
                            motionClip === id
                              ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                              : "bg-surface border-white/10 text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] text-text-muted">KECEPATAN</span>
                      <input
                        type="range"
                        min="0.2"
                        max="2"
                        step="0.05"
                        value={motionSpeed}
                        onChange={(e) => setMotionSpeed(parseFloat(e.target.value))}
                        className="flex-1 accent-brand-accent min-h-[44px]"
                        aria-label="Kecepatan gerak manekin"
                      />
                      <span className="text-[11px] font-bold text-brand-accent">{motionSpeed.toFixed(2)}x</span>
                    </div>
                  </>
                )}
              <div className="flex gap-2">
                {(["static", "wind", "walking"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAnimationPreset(p as any)}
                    className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border text-[11px] font-bold uppercase ${
                      animationPreset === p
                        ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                        : "bg-surface border-white/10 text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              </div>
            )}

            {activeTab === "saved" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={designTitleInput}
                    onChange={(e) => setDesignTitleInput(e.target.value.slice(0, 60))}
                    placeholder="Nama desain…"
                    maxLength={60}
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-white/10 text-white text-base"
                  />
                  <button
                    onClick={handleSaveDesign}
                    className="min-h-[44px] px-4 rounded-xl bg-brand-accent text-canvas font-bold text-[11px]"
                  >
                    SIMPAN
                  </button>
                </div>
                {/* Blokir lembut guest ber-gambar (mobile): pesan jelas + login. */}
                {enhancementMessage && (
                  <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                    {enhancementMessage}
                  </div>
                )}
                {savedDesigns.length === 0 ? (
                  <p className="text-[11px] text-text-muted">Belum ada desain tersimpan.</p>
                ) : (
                  savedDesigns.slice(0, 6).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => loadSavedDesign(d.id)}
                      className="w-full min-h-[44px] p-2 rounded-xl border border-white/10 bg-surface text-left text-[11px] text-white truncate"
                    >
                      {d.title}
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === "export" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportPNG("front-view")}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold text-[11px] uppercase"
                  >
                    PNG DEPAN
                  </button>
                  <button
                    onClick={() => void handleExportBackPNG("back-view")}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold text-[11px] uppercase"
                  >
                    PNG BELAKANG
                  </button>
                </div>
                <button
                  onClick={() => void handleShareMockup()}
                  disabled={isSharing}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50"
                >
                  {isSharing ? "MENYIAPKAN KARTU…" : "📤 BAGIKAN KARTU MOCKUP"}
                </button>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Format video 360">
                  {(["mp4", "webm", "gif"] as const).map((f) => (
                    <button
                      key={f}
                      role="radio"
                      aria-checked={export360Format === f}
                      onClick={() => setExport360Format(f)}
                      disabled={isRecording360}
                      className={`min-h-[44px] px-2 py-2 rounded-xl border text-[11px] font-bold uppercase disabled:opacity-50 ${
                        export360Format === f
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                          : "bg-surface border-white/10 text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void handleExport360Video()}
                  disabled={isRecording360}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50"
                >
                  {isRecording360
                    ? `MEREKAM 360° ${export360Format.toUpperCase()} (${recordingProgress}%)…`
                    : `🎥 EKSPOR 360° ${export360Format.toUpperCase()}`}
                </button>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface/60 border border-white/10 flex justify-between items-center">
              <span className="text-[11px] text-text-muted">ESTIMASI</span>
              <span className="font-bold text-brand-accent">{pricing.formattedTotal}</span>
            </div>
            <button
              onClick={openCheckoutWithMasterGate}
              className="w-full min-h-[48px] py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase"
            >
              PESAN (DUITKU) — {pricing.formattedTotal}
            </button>
            <p className="text-[10px] text-text-muted text-center">Geser handle di atas untuk peek / half / full — vaul pattern aktif di mobile</p>
          </div>
        </BottomSheet>
      )}

      {/* Auth Modal for SAVED gate */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {/* Checkout Modal Dialog */}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      {/* FASE F — Editor gambar in-mockup (edit dari MASTER, Simpan refresh DPI) */}
      {isImageEditorOpen && activeDecal && (
        <ImageEditorModalLazy
          decalId={activeDecal.id}
          sourceUrl={getMasterDataUrl(activeDecal.id, activeDecal.url)}
          decalName={activeDecal.name}
          printWidthCm={physicalDimensions?.widthCm}
          printHeightCm={(physicalDimensions as unknown as { heightCm?: number } | null)?.heightCm}
          onClose={() => setIsImageEditorOpen(false)}
          onSaved={({ quality }) => {
            const label =
              typeof quality.badgeLabel === "string"
                ? quality.badgeLabel.replace(/^[🟢🟡🔴]\s*/, "")
                : "tersimpan";
            const ukuran =
              quality.pxW > 0 && quality.pxH > 0 ? ` (${quality.pxW}×${quality.pxH}px)` : "";
            setEnhancementMessage(`✅ Gambar tersimpan — ${label}${ukuran}.`);
            setTimeout(() => setEnhancementMessage(null), 5000);
          }}
        />
      )}
    </>
  );
};
