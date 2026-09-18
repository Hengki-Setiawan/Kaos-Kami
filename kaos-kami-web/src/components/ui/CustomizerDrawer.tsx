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
  validSidesFor,
  type ApparelType,
  type StudioTheme,
  type MaterialFinish,
  type LightingPreset,
  type DecalTargetSide,
} from "@/lib/constants";
import { TestLabControls } from "./TestLabControls";
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
import { Ruler, Wand2, Loader2, AlertTriangle, ShieldCheck, ShoppingCart, Type, Shirt, Scissors, Lock, CheckCircle2, Pin, Crosshair, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon, CircleHelp, User, UserCheck } from "lucide-react";

import { CheckoutModal } from "@/components/ui/CheckoutModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AuthModal } from "@/components/ui/AuthModal";
import { openStudioTour } from "@/components/studio/StudioTour";
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

function getHexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * W3C standard native MediaRecorder fallback untuk video 360 kanvas.
 * Kompatibel 100% di semua browser (Chrome, Edge, Firefox, Safari) tanpa syarat hardware AVC.
 */
async function export360VideoNative(
  stream: MediaStream,
  totalMs: number,
  format: "mp4" | "webm",
  onTick: (elapsedMs: number) => void
): Promise<void> {
  let mimeType = "";
  const candidates =
    format === "mp4"
      ? [
          "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
          "video/mp4;codecs=avc1",
          "video/mp4;codecs=h264",
          "video/mp4",
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
        ]
      : [
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4",
        ];

  if (typeof MediaRecorder !== "undefined") {
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }
  }

  if (!mimeType) {
    throw new Error("Perekaman video kanvas tidak didukung di browser ini.");
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const startedAt = performance.now();
  recorder.start(200);

  await new Promise<void>((resolve, reject) => {
    const timer = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      onTick(elapsed);
      if (elapsed >= totalMs) {
        clearInterval(timer);
        try {
          recorder.onstop = () => resolve();
          recorder.onerror = (err) => reject(err);
          recorder.stop();
        } catch (err) {
          reject(err);
        }
      }
    }, 200);
  });

  if (chunks.length === 0) {
    throw new Error("Perekaman video menghasilkan buffer kosong.");
  }

  const isMp4 = mimeType.includes("mp4");
  const actualExt = isMp4 ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mimeType });
  downloadExportBlob(blob, `kaos-kami-360-turntable.${actualExt}`);
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

  type StudioTab = "apparel" | "decals" | "options" | "pattern" | "test3d" | "sandbox" | "saved" | "team" | "export";

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
    duplicateSavedDesign,
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
    setIsDrawerCollapsed,
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
      duplicateSavedDesign: s.duplicateSavedDesign,
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
      setIsDrawerCollapsed: s.setIsDrawerCollapsed,
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
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
    }))
  );

  const [activeTab, setActiveTab] = useState<StudioTab>("apparel");
  const [decalSubMode, setDecalSubMode] = useState<"standard" | "pattern" | "test3d" | "team">("standard");
  const [optionSubMode, setOptionSubMode] = useState<"saved" | "export">("saved");

  const handleTabChange = (tab: StudioTab) => {
    if (tab === "pattern") {
      setActiveTab("decals");
      setDecalSubMode("pattern");
    } else if (tab === "test3d" || tab === "sandbox") {
      setActiveTab("decals");
      setDecalSubMode("test3d");
    } else if (tab === "team") {
      setActiveTab("decals");
      setDecalSubMode("team");
    } else if (tab === "saved") {
      setActiveTab("options");
      setOptionSubMode("saved");
    } else if (tab === "export") {
      setActiveTab("options");
      setOptionSubMode("export");
    } else {
      setActiveTab(tab);
    }
  };
  const [designTitleInput, setDesignTitleInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // SATU sumber mobile = CSS/matchMedia (lihat useIsMobileCss) — bukan UA.
  const isMobileCss = useIsMobileCss();
  const isLight = studioTheme === "gallery";

  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [enhancementMessage, setEnhancementMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Text Typography Customizer State
  const [showTextInput, setShowTextInput] = useState(false);
  const [customTextString, setCustomTextString] = useState("");
  const [customTextFont, setCustomTextFont] = useState<TextDecalOptions["fontFamily"]>("streetwear-bold");
  const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
  const [hasManuallyPickedTextColor, setHasManuallyPickedTextColor] = useState(false);
  useEffect(() => {
    if (!hasManuallyPickedTextColor) {
      const isGarmentLight = getHexLuminance(selectedColor) > 0.55;
      setCustomTextColor(isGarmentLight ? "#000000" : "#FFFFFF");
    }
  }, [selectedColor, hasManuallyPickedTextColor]);
  // M3.4 — Shadow teks opsional, default MATI (jujur DTF, tanpa halo cetak).
  const [customTextShadow, setCustomTextShadow] = useState(false);
  const [activePartId, setActivePartId] = useState<string>("body");
  const [showFabricEditor, setShowFabricEditor] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { data: session } = useSession();
  // M3.4 — BG remover: tolerance slider + target putih/hitam (foto malam).
  const [bgTolerance, setBgTolerance] = useState(35);
  const [bgTarget, setBgTarget] = useState<"white" | "black">("white");
  const [showBgRemover, setShowBgRemover] = useState(false);
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
    setDecalSubMode("standard");
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
    if (!session?.user) {
      setIsAuthOpen(true);
      return;
    }
    if (unsavedMasters.length > 0 && !masterWarnDismissed) {
      setEnhancementMessage(
        `⚠️ Master belum tersimpan (${unsavedMasters.length} decal masih base64 lokal): ${unsavedMasters.slice(0, 3).map((m) => m.name).join(", ")}${unsavedMasters.length > 3 ? "…" : ""}. Kualitas tetap master penuh saat checkout. Klik PESAN sekali lagi untuk lanjut.`
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
      setDecalSubMode("standard");

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

  // Opsi Ekspor Gambar HD & Transparan
  const [exportBgMode, setExportBgMode] = useState<"studio" | "transparent">("studio");
  const [exportResolution, setExportResolution] = useState<"standard" | "2k">("2k");
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Ekspor 360° tangguh: mediabunny dengan auto-fallback ke native MediaRecorder
  const handleExport360Video = async () => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    if (isRecording360) return;
    const format = export360Format;

    // Scope ke kanvas WebGL
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
            // abaikan
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
        // Coba mediabunny terlebih dahulu bila browser mendukung; jika gagal/tak didukung, fallback ke native MediaRecorder
        let success = false;
        try {
          const { canEncodeVideo } = await import("mediabunny");
          const codec = format === "mp4" ? "avc" : "vp9";
          const canDo = await canEncodeVideo(codec);
          if (canDo) {
            await export360VideoMediabunny(videoTrack, totalMs, format, onTick);
            success = true;
          }
        } catch (e) {
          console.warn("Mediabunny encoder tidak tersedia, beralih ke native MediaRecorder:", e);
        }

        if (!success) {
          await export360VideoNative(stream, totalMs, format, onTick);
        }

        setEnhancementMessage(
          `✅ Video 360° ${format.toUpperCase()} tersimpan — siap dibagikan.`
        );
      }
      setTimeout(() => setEnhancementMessage(null), 5000);
      cleanup();
    } catch (err) {
      console.error("Gagal mengekspor video 360:", err);
      setEnhancementMessage(
        `Gagal mengekspor 360° (${err instanceof Error ? err.message : "kesalahan tak dikenal"}). Coba format lain atau pakai gambar PNG.`
      );
      setTimeout(() => setEnhancementMessage(null), 5000);
      cleanup();
    }
  };

  const doExportMockupImage = async (viewName: string = "mockup") => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setEnhancementMessage("Kanvas 3D tidak ditemukan.");
      return;
    }
    setIsExportingImage(true);
    try {
      let dataUrl = "";
      if (typeof (canvas as any).exportMockup === "function") {
        dataUrl = await (canvas as any).exportMockup({
          resolution: exportResolution,
          transparent: exportBgMode === "transparent",
        });
      } else {
        dataUrl = canvas.toDataURL("image/png");
      }
      const link = document.createElement("a");
      const suffix = exportBgMode === "transparent" ? "-transparent" : "";
      link.download = `kaos-kami-${activeApparel}-${viewName}-${exportResolution}${suffix}.png`;
      link.href = dataUrl;
      link.click();
      setEnhancementMessage(`✅ Gambar mockup HD (${viewName}) berhasil diunduh.`);
      setTimeout(() => setEnhancementMessage(null), 3000);
    } catch (err) {
      console.error("Gagal ekspor gambar:", err);
      setEnhancementMessage("Gagal mengekspor gambar mockup.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportPNG = (viewName: string = "mockup") => {
    void doExportMockupImage(viewName);
  };

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

  const handleExportFrontPNG = async (viewName: string = "front-view") => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    setCameraPreset("front");
    await waitForCameraPresetSettled(2000);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await doExportMockupImage(viewName);
  };

  const handleExportBackPNG = async (viewName: string = "back-view") => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    setCameraPreset("back");
    await waitForCameraPresetSettled(2000);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await doExportMockupImage(viewName);
  };

  const handleExportCurrentPNG = async (viewName: string = "current-view") => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    await doExportMockupImage(viewName);
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
      // Share-card ekspor SENGAJA fixed (brand gelap) — bukan ikut studioTheme,
      // agar hasil PNG 1080×1350 konsisten di semua perangkat & cetak arsip.
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
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
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
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    let previewUrl: string | undefined;
    try {
      const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
      if (canvas) {
        previewUrl = canvas.toDataURL("image/webp", 0.7);
      }
    } catch {}
    saveCurrentDesign(designTitleInput.trim() ? designTitleInput.trim() : undefined, previewUrl);
    setDesignTitleInput("");
    setActiveTab("options");
    setOptionSubMode("saved");
    setEnhancementMessage("✅ Desain berhasil disimpan ke koleksi Anda.");
    setTimeout(() => setEnhancementMessage(null), 3000);
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
      {/* Floating Interactive Tool Switcher (mobile: bottom-88px di atas BottomSheet; desktop: top-20) */}
      <div className="fixed top-auto bottom-[88px] md:top-20 md:bottom-auto left-4 sm:left-8 z-40 flex items-center space-x-1.5 p-1.5 rounded-2xl glass-panel shadow-xl pointer-events-auto border border-border-subtle">
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

      {/* Collapsed Floating Recovery Pill - Always accessible when drawer is closed */}
      {isDrawerCollapsed && (
        <div
          className={`fixed bottom-6 z-50 pointer-events-auto transition-all left-4 right-4 sm:left-auto ${
            drawerPosition === "left" ? "sm:left-6 sm:right-auto" : "sm:right-6"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerCollapsed(false);
            }}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start space-x-3 px-4 py-3 rounded-2xl glass-panel-elevated shadow-2xl border-2 border-brand-accent text-text-primary hover:bg-brand-accent/10 active:scale-95 transition-all group ring-4 ring-brand-accent/20 cursor-pointer"
            title="Klik untuk membuka kembali menu kustomisasi"
            aria-label="Buka Menu Kustomisasi"
          >
            <div className="flex items-center space-x-2.5">
              <div
                className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                ✏️ BUKA MENU · {currentApparelInfo.name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs text-brand-accent">
                {pricing.formattedTotal}
              </span>
              <div className="w-6 h-6 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent group-hover:-translate-y-0.5 transition-transform">
                <ChevronUp size={14} />
              </div>
            </div>
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
            ? "opacity-0 translate-y-full pointer-events-none invisible select-none"
            : "opacity-100 translate-y-0 pointer-events-none visible"
        }`}
      >
        <div className={`w-full rounded-2xl glass-panel-elevated shadow-2xl border border-border-subtle overflow-hidden max-h-[85vh] flex flex-col backdrop-blur-2xl ${
          isDrawerCollapsed ? "pointer-events-none" : "pointer-events-auto"
        }`}>
          {/* Top Header Bar - Ultra Clean & Minimal */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border-subtle flex items-center justify-between bg-surface/90 backdrop-blur-md">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 shadow-[0_0_8px_rgba(230,81,0,0.6)] animate-pulse" />
              <h3 className="text-sm sm:text-base font-display font-bold uppercase text-text-primary truncate tracking-tight">
                {currentApparelInfo.name}
              </h3>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Auto Spin Toggle */}
              <button
                onClick={toggleRotating}
                className={`p-2 rounded-xl border transition-all ${
                  isRotating
                    ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_10px_rgba(230,81,0,0.5)]"
                    : "bg-surface text-text-muted border-border-subtle hover:text-text-primary hover:bg-surface-elevated"
                }`}
                title={isRotating ? "Hentikan putaran" : "Putar otomatis 360°"}
                aria-label="Putar otomatis 360°"
              >
                <RotateCcw size={14} className={isRotating ? "animate-spin" : ""} />
              </button>

              {/* Dock Left / Right Toggle */}
              <button
                onClick={toggleDrawerPosition}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all"
                title={drawerPosition === "right" ? "Pindahkan panel ke kiri" : "Pindahkan panel ke kanan"}
                aria-label="Pindahkan posisi panel"
              >
                {drawerPosition === "right" ? <PanelLeftClose size={14} /> : <PanelRightClose size={14} />}
              </button>

              {/* Tutup Menu */}
              <button
                onClick={toggleDrawerCollapsed}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40 transition-all flex items-center justify-center"
                title="Tutup menu"
                aria-label="Tutup menu"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* 3 Primary Tabs Navigation - No text clipping, spacious & balanced */}
          <div className="grid grid-cols-3 border-b border-border-subtle bg-canvas/80 text-xs font-mono">
            {[
              { id: "apparel", label: "PRODUK", icon: Shirt },
              { id: "decals", label: `SABLON (${decals.length})`, icon: Sliders },
              { id: "options", label: "SIMPAN & EKSPOR", icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id as StudioTab)}
                className={`py-3 px-2 flex items-center justify-center space-x-1.5 border-b-2 whitespace-nowrap transition-all ${
                  activeTab === id
                    ? "border-brand-accent text-brand-accent font-bold bg-surface/60 shadow-inner"
                    : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/30"
                }`}
              >
                <Icon size={13} />
                <span className="text-[11px] sm:text-xs font-bold uppercase truncate">{label}</span>
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
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase tracking-wider">
                    JENIS PAKAIAN:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(APPAREL_CATALOG) as ApparelType[]).map((type) => {
                      const info = APPAREL_CATALOG[type];
                      const locked = !info.mockupEnabled;
                      const comingSoon = !info.orderable;
                      const isActive = activeApparel === type;
                      const label =
                        type === "tshirt"
                          ? "T-Shirt"
                          : type === "longsleeve"
                          ? "Longsleeve"
                          : type === "crewneck"
                          ? "Sweater"
                          : type === "hoodie"
                          ? "Hoodie"
                          : type === "shirt"
                          ? "Jacket"
                          : type === "cap"
                          ? "Topi"
                          : type === "shorts"
                          ? "Shorts"
                          : "Celana";

                      return (
                        <button
                          key={type}
                          onClick={() => {
                            if (!locked) setActiveApparel(type);
                          }}
                          disabled={locked}
                          title={
                            locked
                              ? `${info.name} — Segera hadir`
                              : comingSoon
                                ? `${info.name} — Mockup aktif, pemesanan segera dibuka`
                                : info.name
                          }
                          aria-disabled={locked}
                          className={`relative py-3 px-2.5 rounded-xl font-mono text-xs font-bold border transition-all text-center flex flex-col items-center justify-center min-h-[46px] ${
                            isActive
                              ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.45)] scale-[1.02]"
                              : locked
                                ? "bg-surface/50 border-border-subtle text-text-muted/40 cursor-not-allowed"
                                : "bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-accent/50 hover:bg-surface-elevated"
                          }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
                          {comingSoon && (
                            <span className="mt-1 px-1.5 py-px rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[8px] font-bold tracking-wider">
                              SEGERA
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colorway Picker */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase tracking-wider">WARNA PAKAIAN:</span>
                    <span className="text-text-primary font-bold">
                      {activeColorName} {pricing.colorTreatmentSurchargeIdr > 0 && `(+IDR ${pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")})`}
                    </span>
                  </div>

                  {/* Multi-Part Target Selector (Afilah) */}
                  {activeColorMode === "multi-part" && (
                    <div className="p-3 rounded-xl bg-surface/80 border border-brand-accent/30 mb-3 space-y-2 font-mono text-xs animate-fadeIn">
                      <span className="block text-[10px] text-text-muted font-bold uppercase">
                        BAGIAN PAKAIAN:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "body", label: "BODI" },
                          { id: "sleeves", label: "LENGAN" },
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
                                  : "bg-surface border-border-subtle hover:border-brand-accent"
                              }`}
                            >
                              <span className="font-bold">{part.label}</span>
                              <span
                                className="w-4 h-4 rounded-full border border-border-strong"
                                style={{ backgroundColor: currentColor }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Colorway Palette */}
                  <div className="flex flex-wrap gap-2 mb-1">
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

            {/* TAB 2: SABLON (DTF + POLA 2D + 3D TEST) */}
            {(activeTab === "decals" || activeTab === "pattern" || activeTab === "test3d" || activeTab === "sandbox") && (
              <>
                {/* Sub-mode Segmented Pill Switcher */}
                <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("standard");
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
                      decalSubMode === "standard" && activeTab !== "pattern" && activeTab !== "test3d" && activeTab !== "sandbox"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    SABLON DTF ({decals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("pattern");
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
                      decalSubMode === "pattern" || activeTab === "pattern"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    POLA 2D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("test3d");
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center flex items-center justify-center space-x-1 ${
                      decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    <Box size={12} className={decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox" ? "text-canvas" : "text-brand-accent"} />
                    <span>3D TEST</span>
                  </button>
                </div>

                {/* Sub-mode 1: SABLON DTF Standard */}
                {((decalSubMode === "standard" && activeTab !== "pattern" && activeTab !== "test3d" && activeTab !== "sandbox") || activeTab === "decals") && decalSubMode !== "pattern" && decalSubMode !== "test3d" && (
                  <>
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
                        : "bg-surface border-border-subtle text-text-muted hover:text-brand-accent"
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
                          className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent text-xs font-bold"
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
                            className="w-full px-2.5 py-1.5 rounded-lg bg-canvas border border-border-subtle text-text-primary text-[10px] focus:outline-none focus:border-brand-accent"
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
                                onClick={() => {
                                  setCustomTextColor(c);
                                  setHasManuallyPickedTextColor(true);
                                }}
                                className={`w-5 h-5 rounded-full border ${
                                  customTextColor === c ? "border-brand-accent ring-2 ring-brand-accent/40" : "border-border-strong"
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
                        <span>Bayangan Teks (Shadow)</span>
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

                {/* Decal Layer List */}
                {decals.length > 0 ? (
                  <div className="space-y-3">
                    <span className="block text-[11px] font-mono text-text-muted font-bold uppercase tracking-wider">
                      LAPISAN SABLON AKTIF ({decals.length}):
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {decals.map((d, index) => {
                        const sablonInfo = pricing.decalLayers.find((s) => s.id === d.id);
                        const isSelected = (selectedDecalId ?? decals[0]?.id) === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDecalId(d.id)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all shrink-0 ${
                              isSelected
                                ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            <span>#{index + 1} {d.targetSide.toUpperCase()}</span>
                            {sablonInfo?.tier && (
                              <span className="text-[10px] opacity-75 font-normal">({sablonInfo.tier})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Decal Transformation & Inspector Card */}
                    {activeDecal && (
                      <div className="p-3.5 rounded-2xl glass-panel border border-border-subtle space-y-3.5">
                        {/* Header: Decal Name + Gizmo Toggle + Delete */}
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-mono text-xs font-bold text-text-primary truncate max-w-[170px]" title={activeDecal.name}>
                            {activeDecal.name}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={toggleGizmoVisible}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                                isGizmoVisible
                                  ? "bg-brand-accent/15 border-brand-accent/40 text-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                              title={isGizmoVisible ? "Sembunyikan kotak kontrol gizmo" : "Tampilkan kotak kontrol gizmo"}
                            >
                              <Move size={11} />
                              <span>{isGizmoVisible ? "GIZMO ON" : "GIZMO OFF"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDecal(activeDecal.id)}
                              className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-rose-400 hover:border-rose-400/40 transition-all"
                              title="Hapus sablon ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Placement Selector & Real Dimensions — SSOT validSidesFor (Depan, Belakang, Samping Kiri/Kanan, Lengan, Tudung) */}
                        <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="block text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">
                              POSISI SABLON:
                            </span>
                            {physicalDimensions && (
                              <span className="text-[11px] font-mono font-bold text-brand-accent">
                                {physicalDimensions.widthCm} × {physicalDimensions.heightCm} cm
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 font-mono text-[10px]">
                            {(
                              [
                                {
                                  id: "front" as DecalTargetSide,
                                  label: activeApparel === "cap" ? "MAHKOTA DPN" : activeApparel === "pants" || activeApparel === "shorts" ? "PAHA DPN" : "DADA",
                                },
                                {
                                  id: "back" as DecalTargetSide,
                                  label: activeApparel === "cap" ? "MAHKOTA BLK" : activeApparel === "pants" || activeApparel === "shorts" ? "PAHA BLK" : "PUNGGUNG",
                                },
                                { id: "side_left" as DecalTargetSide, label: activeApparel === "pants" || activeApparel === "shorts" ? "STRIP KIRI" : "SMPG KIRI" },
                                { id: "side_right" as DecalTargetSide, label: activeApparel === "pants" || activeApparel === "shorts" ? "STRIP KANAN" : "SMPG KANAN" },
                                { id: "left_sleeve" as DecalTargetSide, label: "LGN KIRI" },
                                { id: "right_sleeve" as DecalTargetSide, label: "LGN KANAN" },
                                { id: "hood" as DecalTargetSide, label: "TUDUNG" },
                              ]
                            )
                              .filter((side) =>
                                (validSidesFor(activeApparel) as string[]).includes(side.id)
                              )
                              .map((side) => (
                                <button
                                  key={side.id}
                                  type="button"
                                  onClick={() => {
                                    // Auto-frame kamera ke sisi yang dipilih agar pengguna langsung melihat hasilnya
                                    if (side.id === "left_sleeve" || side.id === "side_left") {
                                      setCameraPreset("left");
                                    } else if (side.id === "right_sleeve" || side.id === "side_right") {
                                      setCameraPreset("right");
                                    } else if (side.id === "back" || side.id === "hood") {
                                      setCameraPreset("back");
                                    } else if (side.id === "front") {
                                      setCameraPreset("front");
                                    }

                                    // Koordinat awal cerdas: pusatkan decal di area sablon sisi yang dipilih
                                    let newX = 0;
                                    let newY = 0;
                                    if (side.id === "side_left" || side.id === "side_right") {
                                      newY = activeApparel === "pants" ? 0.0 : -0.05;
                                    } else if (side.id === "left_sleeve" || side.id === "right_sleeve") {
                                      newY = 0.02;
                                    } else if (side.id === "front" || side.id === "back") {
                                      if (activeApparel === "pants" || activeApparel === "shorts") {
                                        newX = -0.11; // Presisi paha kiri (menghindari celah selangkangan)
                                        newY = activeApparel === "pants" ? 0.05 : 0.0;
                                      } else if (activeApparel === "cap") {
                                        newX = 0;
                                        newY = side.id === "front" ? -0.01 : 0.0;
                                      } else {
                                        newY = -0.05;
                                      }
                                    }

                                    updateDecal(activeDecal.id, {
                                      targetSide: side.id,
                                      x: newX,
                                      y: newY,
                                    });
                                  }}
                                  className={`py-1.5 px-1 rounded-lg border font-bold text-center transition-all ${
                                    activeDecal.targetSide === side.id
                                      ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
                                  }`}
                                >
                                  {side.label}
                                </button>
                              ))}
                          </div>

                          {/* Detail dimensi fisik terpadu di dalam kartu posisi sablon */}
                          {physicalDimensions && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle/50 text-[10.5px] font-mono text-text-muted">
                              <span className="flex items-center gap-1">
                                <Ruler size={12} className="text-brand-accent" />
                                Jarak dari kerah:
                              </span>
                              <span className="font-bold text-text-primary">
                                ↓ {physicalDimensions.offsetFromCollarCm} cm
                              </span>
                            </div>
                          )}

                          {qualityReport && (
                            <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[11px] font-mono">
                              <span className="text-text-muted">Kualitas Cetak:</span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${qualityReport.badgeColor}`}>
                                {qualityReport.badgeLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Enhancement Message Notification */}
                        {enhancementMessage && (
                          <div className="p-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-mono flex items-center gap-1.5 animate-fadeIn">
                            <ShieldCheck size={14} />
                            <span>{enhancementMessage}</span>
                          </div>
                        )}

                        {/* Quick Edit Actions: Studio Image Editor & Clean Background Remover */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsImageEditorOpen(true)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 hover:bg-brand-accent/20 text-[11px] font-mono font-bold text-brand-accent transition-all shadow-sm"
                            title="Buka studio edit gambar lengkap (crop, filter, AI background, warna)"
                          >
                            <Sparkles size={13} />
                            <span>EDIT GAMBAR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBgRemover((v) => !v)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-[11px] font-mono font-bold transition-all shadow-sm ${
                              showBgRemover
                                ? "bg-surface border-brand-accent text-brand-accent"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent"
                            }`}
                            title="Hapus background putih atau hitam secara instan"
                          >
                            <Wand2 size={13} />
                            <span>HAPUS LATAR</span>
                          </button>
                        </div>

                        {/* Collapsible Background Remover Panel */}
                        {showBgRemover && (
                          <div className="p-3 rounded-xl bg-surface border border-brand-accent/30 space-y-2.5 animate-fadeIn">
                            <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                              PILIHAN HAPUS WARNA LATAR:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setBgTarget("white")}
                                aria-pressed={bgTarget === "white"}
                                className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                                  bgTarget === "white"
                                    ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                                }`}
                              >
                                ⬜ LATAR PUTIH
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgTarget("black")}
                                aria-pressed={bgTarget === "black"}
                                className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                                  bgTarget === "black"
                                    ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                                }`}
                              >
                                ⬛ LATAR HITAM
                              </button>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
                                <span className="font-bold">Toleransi Pembersihan</span>
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
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isEnhancingImage}
                                onClick={handleRemoveWhiteBg}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-brand-accent text-canvas text-[10px] font-mono font-bold hover:brightness-110 transition-all disabled:opacity-50"
                              >
                                {isEnhancingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                <span>TERAPKAN</span>
                              </button>
                              {(() => {
                                try {
                                  if (!hasOriginalMaster(activeDecal.id)) return null;
                                } catch { return null; }
                                return (
                                  <button
                                    type="button"
                                    onClick={() => void handleRestoreOriginal()}
                                    className="py-1.5 px-2 rounded-lg bg-surface border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-500/10 transition-all"
                                    title="Pulihkan file upload awal"
                                  >
                                    ↩ ASLI
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* 3-Position Fast Alignment */}
                        <div className="space-y-1.5 pt-1">
                          <span className="block text-[10px] font-mono text-text-muted font-bold uppercase">
                            POSISI CEPAT:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(0);
                                applyLogoPreset();
                              }}
                              className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                              title="Posisikan logo di saku dada kiri"
                            >
                              SAKU KIRI
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(1);
                                applyLogoPreset();
                              }}
                              className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                              title="Posisikan logo di tengah dada"
                            >
                              TENGAH
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPresetPos(2);
                                applyLogoPreset();
                              }}
                              className="py-1.5 px-1 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold transition-all text-center"
                              title="Posisikan logo di saku dada kanan"
                            >
                              SAKU KANAN
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Manual Sliders */}
                        <details className="group border border-border-subtle rounded-xl p-3 bg-surface/45 transition-all">
                          <summary className="cursor-pointer flex items-center justify-between text-[11px] font-mono font-bold text-text-muted hover:text-text-primary list-none select-none">
                            <span className="flex items-center gap-1.5">
                              <Sliders size={12} className="text-brand-accent" />
                              <span>PENGATURAN DETAIL (SLIDER)</span>
                            </span>
                            <ChevronDown size={13} className="transition-transform group-open:rotate-180 text-text-muted" />
                          </summary>
                          <div className="space-y-3 pt-3 mt-2 border-t border-border-subtle/50">
                            <div>
                              <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                                <span className="flex items-center space-x-1"><Move size={11} /> <span>GESER KIRI-KANAN</span></span>
                                <span>{activeDecal.x.toFixed(2)}</span>
                              </div>
                              {(() => {
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
                              {/* DTF Standard Size Presets */}
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
                                          : "border-border-subtle text-text-muted hover:text-text-primary"
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
                        </details>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-border-subtle text-text-muted font-mono text-xs space-y-1 bg-surface/30">
                    <p className="font-bold text-text-primary">Belum ada sablon</p>
                    <p className="text-[10px]">Unggah gambar atau tambahkan teks di atas.</p>
                  </div>
                )}
                  </>
                )}

                {/* Sub-mode 2: POLA 2D */}
                {(decalSubMode === "pattern" || activeTab === "pattern") && <PatternStudioLazy />}

                {/* Sub-mode 3: 3D TEST (Uji Baju, Sudut, Manekin, Simulasi & Pencahayaan) */}
                {(decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox") && (
                  <div className="space-y-4">
                    {/* Header Info Status Sablon & Baju */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-surface/80 via-surface/60 to-surface/40 border border-border-subtle flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center shrink-0">
                          <Box size={18} className="text-brand-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-text-primary truncate">
                              {APPAREL_CATALOG[activeApparel]?.name ?? "Baju 3D"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-surface border border-border-subtle text-text-muted">
                              {activeColorName}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-text-muted flex items-center space-x-1.5 mt-0.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${decals.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-text-muted/40"}`} />
                            <span className={decals.length > 0 ? "text-emerald-400 font-bold" : ""}>
                              {decals.length > 0 ? `${decals.length} Sablon Aktif Terpasang` : "Belum ada sablon"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openStudioTour()}
                        className="px-2.5 py-1.5 rounded-xl bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[10px] font-mono font-bold uppercase transition-all shrink-0 ml-2 flex items-center space-x-1"
                        title="Pelajari langkah kustomisasi produk"
                      >
                        <CircleHelp size={12} />
                        <span>PANDUAN</span>
                      </button>
                    </div>

                    {/* GRUP 1: SUDUT PANDANG & KAMERA 3D */}
                    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
                        <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                          <AngleIcon size={14} className="text-brand-accent" />
                          <span>UJI SUDUT PANDANG (360°)</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={toggleRotating}
                            className={`p-1 px-2 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center space-x-1 ${
                              isRotating
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                            title={isRotating ? "Hentikan putaran" : "Putar otomatis 360°"}
                          >
                            <RotateCcw size={11} className={isRotating ? "animate-spin" : ""} />
                            <span>{isRotating ? "BERPUTAR" : "PUTAR OTOMATIS"}</span>
                          </button>
                          <span className="text-xs font-mono font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md border border-brand-accent/20">
                            {modelRotY}°
                          </span>
                        </div>
                      </div>

                      {/* 4 Quick Angle Presets */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: "DEPAN", deg: 0 },
                          { label: "SERONG", deg: 45 },
                          { label: "SAMPING", deg: 90 },
                          { label: "BELAKANG", deg: 180 },
                        ].map(({ label, deg }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setModelRotY(deg)}
                            className={`py-2 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all truncate text-center ${
                              modelRotY === deg
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm scale-[1.02]"
                                : "bg-surface/70 border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface"
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
                        aria-label="Rotasi model 3D"
                      />

                      {/* Posisi Baju & Zoom */}
                      <div className="pt-2 border-t border-border-subtle/50 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">POSISI CEPAT MODEL:</span>
                          <button
                            type="button"
                            onClick={resetModelTransform}
                            className="text-[10px] font-mono text-brand-accent hover:underline font-bold uppercase"
                          >
                            RESET POSISI
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => alignModel("left")}
                            className={`py-2 px-2 rounded-xl border text-[10px] font-mono font-bold transition-all text-center ${
                              modelPosX < -0.2
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            ⬅ KIRI
                          </button>
                          <button
                            type="button"
                            onClick={() => alignModel("center")}
                            className={`py-2 px-2 rounded-xl border text-[10px] font-mono font-bold transition-all text-center ${
                              Math.abs(modelPosX) <= 0.2
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            ⏺ TENGAH
                          </button>
                          <button
                            type="button"
                            onClick={() => alignModel("right")}
                            className={`py-2 px-2 rounded-xl border text-[10px] font-mono font-bold transition-all text-center ${
                              modelPosX > 0.2
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            KANAN ➡
                          </button>
                        </div>

                        {/* Zoom Model Slider */}
                        <div className="pt-1">
                          <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1">
                              <ZoomIn size={11} /> <span>SKALA ZOOM MOCKUP</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setModelScale(1.0)}
                              title="Klik untuk reset zoom ke 100%"
                              className="font-bold text-text-primary hover:text-brand-accent transition-colors cursor-pointer"
                            >
                              {Math.round(modelScale * 100)}%
                            </button>
                          </div>
                          <input
                            type="range"
                            min="0.6"
                            max="1.8"
                            step="0.02"
                            value={modelScale}
                            onChange={(e) => setModelScale(parseFloat(e.target.value))}
                            className="w-full accent-brand-accent cursor-pointer"
                            aria-label="Zoom model 3D"
                          />
                        </div>
                      </div>
                    </div>

                    {/* GRUP 3: 3D TEST LAB & SIMULASI FISIKA */}
                    <TestLabControls />

                    {/* GRUP 4: PENCAHAYAAN & TEKSTUR BAHAN */}
                    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
                        <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                          <Sun size={14} className="text-brand-accent" />
                          <span>PENCAHAYAAN & BAHAN KAIN</span>
                        </span>
                      </div>

                      {/* Bahan Kain */}
                      <div>
                        <span className="block text-[10px] font-mono text-text-muted mb-1.5 font-bold uppercase">TEKSTUR BAHAN:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "combed-cotton", label: "COTTON 24S", sub: "190 GSM" },
                            { id: "french-terry", label: "HEAVY FLEECE", sub: "380 GSM" },
                            { id: "poplin", label: "POPLIN", sub: "130 GSM" },
                          ].map(({ id, label, sub }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setMaterialFinish(id as MaterialFinish)}
                              className={`py-2 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center ${
                                materialFinish === id
                                  ? "bg-brand-accent text-canvas border-brand-accent shadow-sm scale-[1.02]"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              <span>{label}</span>
                              <span className="text-[8.5px] opacity-75 font-normal">{sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Suasana Pencahayaan */}
                      <div className="pt-2 border-t border-border-subtle/50">
                        <span className="block text-[10px] font-mono text-text-muted mb-1.5 font-bold uppercase">SUASANA CAHAYA:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {STUDIO_MOODS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setLightingPreset(m.id)}
                              title={m.desc}
                              aria-pressed={lightingPreset === m.id}
                              className={`py-2 px-1 rounded-xl border text-center transition-all ${
                                lightingPreset === m.id
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold shadow-[0_0_10px_rgba(230,81,0,0.3)]"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              <span className="block text-sm leading-none">{m.icon}</span>
                              <span className="block mt-1 text-[9px] font-mono font-bold uppercase truncate">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tema Latar Studio */}
                      <div className="pt-2 border-t border-border-subtle/50">
                        <span className="block text-[10px] font-mono text-text-muted mb-1.5 font-bold uppercase">TEMA STUDIO:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "obsidian", label: "DARK", icon: Moon },
                            { id: "gallery", label: "LIGHT", icon: Sun },
                            { id: "concrete", label: "GREY", icon: Box },
                          ].map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setStudioTheme(id as StudioTheme)}
                              className={`py-2 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all flex items-center justify-center space-x-1 ${
                                studioTheme === id
                                  ? "bg-brand-accent text-canvas border-brand-accent shadow-sm scale-[1.02]"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              <Icon size={12} />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Kerangka (Wireframe) */}
                      <div className="pt-2 border-t border-border-subtle/50 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-text-muted font-bold uppercase">MODE KERANGKA (WIREFRAME):</span>
                        <button
                          type="button"
                          onClick={toggleWireframe}
                          className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-all ${
                            isWireframe
                              ? "bg-brand-accent text-canvas shadow-sm"
                              : "bg-surface text-text-muted border border-border-subtle hover:text-text-primary"
                          }`}
                        >
                          {isWireframe ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    {/* Lab Kain verlet */}
                    <ClothLabLazy />
                  </div>
                )}
              </>
            )}

            {/* TAB 3: SIMPAN & EKSPOR (TERSIMPAN + EKSPOR MOCKUP) */}
            {(activeTab === "options" || activeTab === "saved" || activeTab === "export") && (
              <>
                {/* Sub-mode Segmented Pill Switcher */}
                <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("options");
                      setOptionSubMode("saved");
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
                      (optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    DESAIN SAYA ({savedDesigns.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("options");
                      setOptionSubMode("export");
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
                      optionSubMode === "export" || activeTab === "export"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    EKSPOR MOCKUP
                  </button>
                </div>

                {!session ? (
                  <div className="p-6 rounded-2xl bg-surface/80 border border-brand-accent/30 shadow-xl text-center space-y-4 my-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_20px_rgba(230,81,0,0.2)]">
                      <Lock size={26} />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-text-primary font-mono tracking-wider">
                        LOGIN DIPERLUKAN
                      </h4>
                      <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                        Masuk ke akun Anda untuk menyimpan mockup ke koleksi dan mengunduh render HD & video 360°.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="w-full py-3 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] active:scale-98 flex items-center justify-center space-x-2"
                    >
                      <span>MASUK / DAFTAR SEKARANG</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Sub-mode: TERSIMPAN (DESAIN SAYA) */}
                    {((optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved") && (
                      <div className="space-y-4">
                        {/* Save Current Design Box */}
                        <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-text-primary">
                              SIMPAN DESAIN SAAT INI:
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">
                              {savedDesigns.length}/20 tersimpan
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={designTitleInput}
                              onChange={(e) => setDesignTitleInput(e.target.value)}
                              placeholder="mis. Kaos Komunitas Makassar 01"
                              maxLength={60}
                              className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-brand-accent"
                            />
                            <button
                              onClick={handleSaveDesign}
                              className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-md active:scale-95"
                            >
                              <Bookmark size={13} />
                              <span>SIMPAN</span>
                            </button>
                          </div>
                          {enhancementMessage && (
                            <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                              {enhancementMessage}
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
                                className="p-3 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-3 hover:border-brand-accent/40 transition-all group"
                              >
                                <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                                  {d.previewUrl ? (
                                    <img
                                      src={d.previewUrl}
                                      alt={d.title}
                                      className="w-12 h-12 rounded-lg object-contain bg-canvas/80 border border-border-subtle shrink-0"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-lg border border-border-subtle flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: d.colorHex }}
                                    >
                                      <Shirt size={20} className="text-white/80" />
                                    </div>
                                  )}
                                  <div className="overflow-hidden min-w-0">
                                    <span className="block text-xs font-mono font-bold text-text-primary truncate">
                                      {d.title}
                                    </span>
                                    <span className="block text-[10px] font-mono text-text-muted truncate">
                                      {d.apparel.toUpperCase()} · {d.size} · {d.decals.length} Sablon
                                    </span>
                                    <span className="block text-[10px] font-mono text-brand-accent">
                                      {d.savedAt}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    onClick={() => loadSavedDesign(d.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-[11px] font-mono font-bold text-brand-accent hover:bg-brand-accent hover:text-canvas transition-colors"
                                    title="Muat ke Studio 3D"
                                  >
                                    MUAT
                                  </button>
                                  <button
                                    onClick={() => duplicateSavedDesign(d.id)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-subtle transition-all"
                                    title="Duplikat Desain"
                                  >
                                    <Copy size={13} />
                                  </button>
                                  <button
                                    onClick={() => deleteSavedDesign(d.id)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Hapus Desain"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center rounded-xl border border-dashed border-border-subtle text-text-muted font-mono text-xs">
                              Belum ada desain tersimpan. Kustomisasi mockup Anda lalu tekan SIMPAN di atas!
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sub-mode: EKSPOR MOCKUP */}
                    {(optionSubMode === "export" || activeTab === "export") && (
                      <div className="space-y-4 py-1">
                        {/* Opsi Format & Kualitas */}
                        <div className="p-3.5 rounded-xl bg-surface/70 border border-border-subtle space-y-2.5">
                          <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider block">
                            PENGATURAN EKSPOR GAMBAR:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExportBgMode("studio")}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border text-center ${
                                exportBgMode === "studio"
                                  ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              🏢 Latar Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportBgMode("transparent")}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border text-center ${
                                exportBgMode === "transparent"
                                  ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              ✂️ Transparan (PNG)
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExportResolution("standard")}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all border text-center ${
                                exportResolution === "standard"
                                  ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              Standar (1K)
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportResolution("2k")}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all border text-center ${
                                exportResolution === "2k"
                                  ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                              }`}
                            >
                              ✨ Ultra HD (2K)
                            </button>
                          </div>
                        </div>

                        {/* Unduh Gambar Mockup */}
                        <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                          <span className="text-xs font-mono font-bold text-text-primary block">
                            UNDUH GAMBAR MOCKUP HD:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => void handleExportFrontPNG("front-view")}
                              disabled={isExportingImage}
                              className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1 disabled:opacity-50"
                            >
                              <Camera size={16} className="text-brand-accent" />
                              <span>TAMPAK DEPAN</span>
                            </button>

                            <button
                              onClick={() => void handleExportBackPNG("back-view")}
                              disabled={isExportingImage}
                              className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1 disabled:opacity-50"
                            >
                              <Camera size={16} className="text-brand-accent" />
                              <span>TAMPAK BELAKANG</span>
                            </button>
                          </div>

                          <button
                            onClick={() => void handleExportCurrentPNG("current-view")}
                            disabled={isExportingImage}
                            className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] disabled:opacity-50"
                          >
                            {isExportingImage ? "MERENDER 2K HD..." : "UNDUH TAMPILAN INI (2K HD)"}
                          </button>

                          <button
                            onClick={() => void handleShareMockup()}
                            disabled={isSharing}
                            className="w-full py-3.5 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <Share2 size={15} />
                            <span>{isSharing ? "MENYIAPKAN KARTU…" : "BAGIKAN KARTU MOCKUP"}</span>
                          </button>

                          {/* 360° Turntable Video Exporter */}
                          <div className="space-y-2 pt-1 border-t border-border-subtle/50">
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
                            BAGIKAN DESAIN:
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
                  </>
                )}
              </>
            )}
          </div>

          {/* Itemized Mathematical Price Calculation Footer - Clean & Compact */}
          <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-border-subtle bg-surface/95 backdrop-blur-md flex flex-col space-y-2">
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

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="block text-[10px] font-mono text-text-muted tracking-wider uppercase">ESTIMASI TOTAL</span>
                  <button
                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                    className="text-text-muted hover:text-brand-accent transition-colors"
                    title="Lihat rincian kalkulasi harga"
                    aria-label="Rincian harga"
                  >
                    <Info size={11} />
                  </button>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono font-bold text-base sm:text-lg text-brand-accent tracking-tight">
                    {pricing.formattedTotal}
                  </span>
                </div>
                {pricing.fabricThicknessSurchargeIdr > 0 && (
                  <span className="block text-[9px] font-mono text-text-muted truncate">
                    +Kain {pricing.fabricThicknessSlug} (IDR {pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")})
                  </span>
                )}
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={openCheckoutWithMasterGate}
                  className="py-2.5 px-5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(230,81,0,0.35)] flex items-center justify-center space-x-2 whitespace-nowrap"
                >
                  <ShoppingCart size={14} />
                  <span>PESAN SEKARANG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile BottomSheet (vaul pattern) — SATU sumber: matchMedia 767px
          (useIsMobileCss), selaras `hidden md:block` drawer + `md:hidden` sheet. */}
      {isMobileCss && !isDrawerCollapsed && (
        <BottomSheet onClose={toggleDrawerCollapsed}>
          <div className="space-y-3 font-mono text-xs">
            {/* Header Mobile Sheet: Nama Produk + Tutup */}
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 animate-pulse" />
                <span className="font-display font-bold text-xs uppercase text-text-primary truncate">
                  {currentApparelInfo.name}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleDrawerCollapsed}
                  className="p-1.5 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-[10px] font-bold flex items-center justify-center shrink-0"
                  title="Tutup sheet"
                  aria-label="Tutup panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* 3 Primary Tabs for Mobile */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-surface/80 rounded-xl border border-border-subtle" role="tablist" aria-label="Tab studio mobile">
              {[
                { id: "apparel", label: "PRODUK" },
                { id: "decals", label: `SABLON (${decals.length})` },
                { id: "options", label: "SIMPAN & EKSPOR" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => handleTabChange(t.id as any)}
                  className={`min-h-[38px] px-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center ${
                    activeTab === t.id
                      ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                      : "bg-surface border-transparent text-text-muted hover:text-text-primary"
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
                  const label =
                    type === "tshirt"
                      ? "T-Shirt"
                      : type === "longsleeve"
                      ? "Longsleeve"
                      : type === "crewneck"
                      ? "Sweater"
                      : type === "hoodie"
                      ? "Hoodie"
                      : type === "shirt"
                      ? "Jacket"
                      : type === "cap"
                      ? "Topi"
                      : type === "shorts"
                      ? "Shorts"
                      : "Celana";
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
                            ? "bg-surface border-border-subtle text-text-muted opacity-40"
                            : "bg-surface border-border-subtle text-text-primary"
                      }`}
                    >
                      {label}
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

            {(activeTab === "decals" || activeTab === "pattern" || activeTab === "test3d" || activeTab === "sandbox") && (
              <div className="space-y-2">
                {/* Sub-mode Segmented Switcher on Mobile */}
                <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("standard");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      decalSubMode === "standard" && activeTab !== "pattern" && activeTab !== "test3d" && activeTab !== "sandbox"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    SABLON DTF ({decals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("pattern");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      decalSubMode === "pattern" || activeTab === "pattern"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    POLA 2D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("decals");
                      setDecalSubMode("test3d");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center flex items-center justify-center space-x-1 ${
                      decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Box size={11} className={decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox" ? "text-canvas" : "text-brand-accent"} />
                    <span>3D TEST</span>
                  </button>
                </div>

                {/* Sub-mode 1: SABLON DTF Standard */}
                {((decalSubMode === "standard" && activeTab !== "pattern" && activeTab !== "test3d" && activeTab !== "sandbox") || activeTab === "decals") && decalSubMode !== "pattern" && decalSubMode !== "test3d" && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-[11px] uppercase"
                      >
                        + UPLOAD LOGO
                      </button>
                      <button
                        onClick={() => setShowTextInput((v) => !v)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase"
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
                          className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-base"
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
                            selectedDecalId === d.id ? "border-brand-accent bg-brand-accent/10" : "border-border-subtle bg-surface"
                          }`}
                        >
                          <button onClick={() => setSelectedDecalId(d.id)} className="flex-1 text-left text-[11px] text-text-primary truncate min-h-[44px] flex items-center">
                            {d.name}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDecalId(d.id);
                              setIsImageEditorOpen(true);
                            }}
                            aria-label={`Edit gambar ${d.name}`}
                            title="Edit gambar (sesuaikan, potong, efek, hapus BG)"
                            className="min-w-[44px] min-h-[44px] px-2 text-brand-accent font-bold flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <PenTool size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveDecal(d.id)}
                            aria-label={`Hapus ${d.name}`}
                            className="min-w-[44px] min-h-[44px] px-2 text-rose-400 hover:text-rose-500 font-bold flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Sub-mode 2: POLA 2D */}
                {(decalSubMode === "pattern" || activeTab === "pattern") && <PatternStudioLazy />}

                {/* Sub-mode 3: 3D TEST (Uji Baju, Sudut 360°, Manekin, Simulasi & Cahaya di HP) */}
                {(decalSubMode === "test3d" || activeTab === "test3d" || activeTab === "sandbox") && (
                  <div className="space-y-3 font-mono">
                    {/* Header Info Status Sablon & Baju */}
                    <div className="p-3 rounded-xl bg-surface/80 border border-border-subtle flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center shrink-0">
                          <Box size={16} className="text-brand-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] font-bold text-text-primary truncate">
                              {APPAREL_CATALOG[activeApparel]?.name ?? "Baju 3D"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-surface border border-border-subtle text-text-muted">
                              {activeColorName}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-text-muted flex items-center space-x-1 mt-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${decals.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-text-muted/40"}`} />
                            <span className={decals.length > 0 ? "text-emerald-400 font-bold" : ""}>
                              {decals.length > 0 ? `${decals.length} Sablon Aktif` : "Belum ada sablon"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openStudioTour()}
                        className="px-2 py-1.5 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[9.5px] font-bold uppercase transition-all shrink-0 flex items-center space-x-1"
                        title="Pelajari langkah kustomisasi produk"
                      >
                        <CircleHelp size={12} />
                        <span>PANDUAN</span>
                      </button>
                    </div>

                    {/* KARTU 1: SUDUT PANDANG 360° */}
                    <div className="p-3 rounded-xl bg-surface/50 border border-border-subtle space-y-2.5">
                      <div className="flex justify-between items-center pb-1.5 border-b border-border-subtle/60">
                        <span className="text-[11px] font-bold text-text-primary flex items-center space-x-1">
                          <AngleIcon size={12} className="text-brand-accent" />
                          <span>UJI SUDUT PANDANG (360°)</span>
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={toggleRotating}
                            className={`min-h-[32px] px-2 rounded-lg text-[9.5px] font-bold border transition-all flex items-center space-x-1 ${
                              isRotating
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted"
                            }`}
                          >
                            <RotateCcw size={10} className={isRotating ? "animate-spin" : ""} />
                            <span>{isRotating ? "PUTAR ON" : "PUTAR OTOMATIS"}</span>
                          </button>
                          <span className="text-[10px] font-bold text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded border border-brand-accent/20">
                            {modelRotY}°
                          </span>
                        </div>
                      </div>

                      {/* 4 Presets Sudut */}
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: "DEPAN", deg: 0 },
                          { label: "SERONG", deg: 45 },
                          { label: "SAMPING", deg: 90 },
                          { label: "BELAKANG", deg: 180 },
                        ].map(({ label, deg }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setModelRotY(deg)}
                            className={`min-h-[38px] py-1.5 px-1 rounded-lg text-[9.5px] font-bold border transition-all text-center ${
                              modelRotY === deg
                                ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Rotasi Slider */}
                      <div className="pt-1">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={modelRotY}
                          onChange={(e) => setModelRotY(parseInt(e.target.value, 10))}
                          className="w-full accent-brand-accent"
                          aria-label="Rotasi model 3D"
                        />
                      </div>

                      {/* Posisi & Zoom */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle/50">
                        <div>
                          <span className="block text-[9px] text-text-muted mb-1 font-bold">POSISI KAMERA:</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: "KIRI", x: -0.3 },
                              { label: "TENGAH", x: 0 },
                              { label: "KANAN", x: 0.3 },
                            ].map(({ label, x }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setModelPosX(x)}
                                className={`min-h-[32px] py-1 px-1 rounded-lg text-[8.5px] font-bold border transition-all text-center ${
                                  Math.abs(modelPosX - x) < 0.05
                                    ? "bg-brand-accent text-canvas border-brand-accent"
                                    : "bg-surface border-border-subtle text-text-muted"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[9px] text-text-muted mb-1 font-bold">
                            <span>ZOOM:</span>
                            <span className="text-text-primary">{Math.round(modelScale * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.6"
                            max="1.8"
                            step="0.02"
                            value={modelScale}
                            onChange={(e) => setModelScale(parseFloat(e.target.value))}
                            className="w-full accent-brand-accent"
                            aria-label="Zoom model 3D"
                          />
                        </div>
                      </div>
                    </div>

                    {/* KARTU 3: 3D TEST LAB & SIMULASI FISIKA */}
                    <TestLabControls />

                    {/* KARTU 4: PENCAHAYAAN & BAHAN KAIN */}
                    <div className="p-3 rounded-xl bg-surface/50 border border-border-subtle space-y-2.5">
                      <div className="flex justify-between items-center pb-1.5 border-b border-border-subtle/60">
                        <span className="text-[11px] font-bold text-text-primary flex items-center space-x-1">
                          <Sun size={12} className="text-brand-accent" />
                          <span>BAHAN & PENCAHAYAAN</span>
                        </span>
                      </div>
                      {/* Bahan Kain */}
                      <div>
                        <span className="block text-[9px] text-text-muted mb-1 font-bold uppercase">TEKSTUR BAHAN:</span>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: "combed-cotton", label: "COTTON 24S", sub: "190 GSM" },
                            { id: "french-terry", label: "HEAVY FLEECE", sub: "380 GSM" },
                            { id: "poplin", label: "POPLIN", sub: "130 GSM" },
                          ].map(({ id, label, sub }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setMaterialFinish(id as MaterialFinish)}
                              className={`min-h-[38px] py-1 px-1 rounded-lg text-[9px] font-bold border transition-all text-center flex flex-col items-center justify-center ${
                                materialFinish === id
                                  ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                                  : "bg-surface border-border-subtle text-text-muted"
                              }`}
                            >
                              <span>{label}</span>
                              <span className="text-[7.5px] opacity-75 font-normal">{sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Suasana Cahaya */}
                      <div className="pt-1.5 border-t border-border-subtle/50">
                        <span className="block text-[9px] text-text-muted mb-1 font-bold uppercase">SUASANA CAHAYA:</span>
                        <div className="grid grid-cols-3 gap-1">
                          {STUDIO_MOODS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setLightingPreset(m.id)}
                              className={`min-h-[36px] py-1 px-1 rounded-lg border text-center transition-all ${
                                lightingPreset === m.id
                                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                                  : "bg-surface border-border-subtle text-text-muted"
                              }`}
                            >
                              <span className="block text-xs leading-none">{m.icon}</span>
                              <span className="block mt-0.5 text-[8.5px] font-bold uppercase truncate">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Kerangka (Wireframe) */}
                      <div className="pt-1.5 border-t border-border-subtle/50 flex justify-between items-center">
                        <span className="text-[9.5px] text-text-muted font-bold uppercase">WIREFRAME 3D:</span>
                        <button
                          type="button"
                          onClick={toggleWireframe}
                          className={`min-h-[32px] px-3 py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                            isWireframe
                              ? "bg-brand-accent text-canvas shadow-sm"
                              : "bg-surface text-text-muted border border-border-subtle"
                          }`}
                        >
                          {isWireframe ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeTab === "options" || activeTab === "saved" || activeTab === "export") && (
              <div className="space-y-2">
                {/* Sub-mode Segmented Switcher on Mobile */}
                <div className="flex p-1 bg-surface/80 rounded-xl border border-border-subtle gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("options");
                      setOptionSubMode("saved");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      (optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    DESAIN SAYA ({savedDesigns.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("options");
                      setOptionSubMode("export");
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition-all text-center ${
                      optionSubMode === "export" || activeTab === "export"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    EKSPOR MOCKUP
                  </button>
                </div>

            {!session ? (
              <div className="p-5 rounded-2xl bg-surface/80 border border-brand-accent/30 shadow-lg text-center space-y-3 my-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_15px_rgba(230,81,0,0.2)]">
                  <Lock size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-primary font-mono tracking-wider">
                    LOGIN DIPERLUKAN
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                    Masuk ke akun Anda untuk menyimpan desain & mengunduh render HD atau video 360°.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-accent hover:brightness-110 text-canvas font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
                >
                  MASUK / DAFTAR SEKARANG
                </button>
              </div>
            ) : (
              <>
                {/* Sub-mode: TERSIMPAN */}
                {((optionSubMode === "saved" && activeTab !== "export") || activeTab === "saved") && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={designTitleInput}
                        onChange={(e) => setDesignTitleInput(e.target.value.slice(0, 60))}
                        placeholder="Nama desain…"
                        maxLength={60}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-base"
                      />
                      <button
                        onClick={handleSaveDesign}
                        className="min-h-[44px] px-4 rounded-xl bg-brand-accent text-canvas font-bold text-[11px]"
                      >
                        SIMPAN
                      </button>
                    </div>
                    {enhancementMessage && (
                      <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                        {enhancementMessage}
                      </div>
                    )}
                    {savedDesigns.length === 0 ? (
                      <p className="text-[11px] text-text-muted text-center py-4">Belum ada desain tersimpan.</p>
                    ) : (
                      savedDesigns.map((d) => (
                        <div
                          key={d.id}
                          className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            {d.previewUrl ? (
                              <img
                                src={d.previewUrl}
                                alt={d.title}
                                className="w-9 h-9 rounded-lg object-contain bg-canvas/80 border border-border-subtle shrink-0"
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded-lg border border-border-subtle flex items-center justify-center shrink-0"
                                style={{ backgroundColor: d.colorHex }}
                              >
                                <Shirt size={16} className="text-white/80" />
                              </div>
                            )}
                            <div className="overflow-hidden min-w-0">
                              <span className="block text-[11px] font-bold text-text-primary truncate">
                                {d.title}
                              </span>
                              <span className="block text-[9px] text-text-muted truncate">
                                {d.apparel.toUpperCase()} · {d.size}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => loadSavedDesign(d.id)}
                              className="px-2 py-1 rounded bg-brand-accent/15 text-brand-accent font-bold text-[10px]"
                            >
                              MUAT
                            </button>
                            <button
                              onClick={() => duplicateSavedDesign(d.id)}
                              className="p-1 rounded text-text-muted hover:text-text-primary"
                              title="Duplikat"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={() => deleteSavedDesign(d.id)}
                              className="p-1 rounded text-text-muted hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-mode: EKSPOR */}
                {(optionSubMode === "export" || activeTab === "export") && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface/60 rounded-xl border border-border-subtle text-[10px]">
                      <button
                        type="button"
                        onClick={() => setExportBgMode("studio")}
                        className={`py-1 rounded-lg border text-center font-bold ${
                          exportBgMode === "studio"
                            ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted"
                        }`}
                      >
                        Latar Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportBgMode("transparent")}
                        className={`py-1 rounded-lg border text-center font-bold ${
                          exportBgMode === "transparent"
                            ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                            : "bg-surface border-border-subtle text-text-muted"
                        }`}
                      >
                        Transparan (PNG)
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleExportFrontPNG("front-view")}
                        disabled={isExportingImage}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase disabled:opacity-50"
                      >
                        PNG DEPAN
                      </button>
                      <button
                        onClick={() => void handleExportBackPNG("back-view")}
                        disabled={isExportingImage}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-[11px] uppercase disabled:opacity-50"
                      >
                        PNG BELAKANG
                      </button>
                    </div>
                    <button
                      onClick={() => void handleExportCurrentPNG("current-view")}
                      disabled={isExportingImage}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-[11px] uppercase disabled:opacity-50"
                    >
                      {isExportingImage ? "MERENDER 2K HD..." : "UNDUH SAAT INI (2K HD)"}
                    </button>
                    <button
                      onClick={() => void handleShareMockup()}
                      disabled={isSharing}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Share2 size={13} />
                      <span>{isSharing ? "MENYIAPKAN KARTU…" : "BAGIKAN KARTU MOCKUP"}</span>
                    </button>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Format video 360">
                      {(["mp4", "webm", "gif"] as const).map((f) => (
                        <button
                          key={f}
                          role="radio"
                          aria-checked={export360Format === f}
                          onClick={() => setExport360Format(f)}
                          disabled={isRecording360}
                          className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-[11px] font-bold uppercase disabled:opacity-50 ${
                            export360Format === f
                              ? "bg-brand-accent/15 border-brand-accent text-brand-accent"
                              : "bg-surface border-border-subtle text-text-primary"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => void handleExport360Video()}
                      disabled={isRecording360}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface border border-brand-accent/50 text-brand-accent font-bold text-[11px] uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Video size={13} />
                      <span>
                        {isRecording360
                          ? `MEREKAM 360° ${export360Format.toUpperCase()} (${recordingProgress}%)…`
                          : `EKSPOR 360° ${export360Format.toUpperCase()}`}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-surface/60 border border-border-subtle flex justify-between items-center">
              <span className="text-[10px] font-mono text-text-muted uppercase">ESTIMASI TOTAL</span>
              <span className="font-mono font-bold text-sm text-brand-accent">{pricing.formattedTotal}</span>
            </div>
            <button
              onClick={openCheckoutWithMasterGate}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <ShoppingCart size={14} />
              <span>PESAN SEKARANG</span>
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
