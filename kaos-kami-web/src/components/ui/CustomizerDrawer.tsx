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
  FlaskConical,
  Download,
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
import { InspectControls } from "./InspectControls";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCartStore } from "@/store/useCartStore";
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
import { Ruler, Wand2, Loader2, AlertTriangle, ShieldCheck, ShoppingCart, Type, Shirt, Scissors, Lock, CheckCircle2, Pin, Crosshair, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon, CircleHelp, User, UserCheck, Building2, CircleDot, SlidersHorizontal, Sunrise, Sunset, Image as ImageIcon } from "lucide-react";
import { getApparelIcon } from "@/components/ui/ApparelIcons";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AuthModal } from "@/components/ui/AuthModal";
import { SizeGuideModal } from "@/components/studio/SizeGuideModal";
// Blueprint Bab 53 Fase 5 — pecahan drawer: komposisi + wiring, JSX pindah verbatim.
import { ApparelTabContent } from "@/components/studio/ApparelTabContent";
import { SablonTabContent } from "@/components/studio/SablonTabContent";
import { SimpanEksporTabContent } from "@/components/studio/SimpanEksporTabContent";
import { SimpanOrderFooter } from "@/components/studio/SimpanOrderFooter";
import { MobileCustomizerSheet } from "@/components/studio/MobileCustomizerSheet";
import type { StudioTab } from "@/components/studio/studioDrawerTypes";
import { formatQuickDimensions } from "@/lib/apparelSizing";
import { openStudioTour } from "@/components/studio/StudioTour";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import { generateTextDecalDataUrl, FONT_PRESETS, type TextDecalOptions } from "@/lib/typography/textDecalGenerator";
import { shopWaLink } from "@/lib/shop";
import { Z_CLASS_DRAWER } from "@/lib/zIndex";

import { applyGuestWatermarkToDataUrl } from "@/lib/watermark";

// Spesifikasi bahan resmi otentik per apparel (standar konveksi & distro Kaos Kami Makassar)
const APPAREL_FABRIC_SPECS: Record<ApparelType, { name: string; tag: string; desc: string }> = {
  tshirt: {
    name: "100% Cotton Combed 24s (190 GSM)",
    tag: "DISTRO REGULAR",
    desc: "Kain katun combed premium: serat rapat & halus, adem di cuaca tropis, menyerap keringat optimal, dan sangat ramah sablon DTF.",
  },
  longsleeve: {
    name: "100% Cotton Combed 24s Rib Cuff (190 GSM)",
    tag: "DISTRO LONGSLEEVE",
    desc: "Katun combed 24s dengan manset rib elastis pada ujung lengan, nyaman dipakai harian tanpa rasa gerah.",
  },
  hoodie: {
    name: "Heavyweight Cotton Fleece 380 GSM",
    tag: "PREMIUM HEAVYWEIGHT",
    desc: "Bahan fleece tebal berbulu halus di bagian dalam, hangat maksimal dengan tudung ganda (double-layered hood) dan saku kangguru kokoh.",
  },
  crewneck: {
    name: "Heavy Cotton Fleece 330 GSM",
    tag: "SWEATER FLEECE",
    desc: "Sweater rajut fleece tebal tanpa tudung, kerah rib tahan kendur, potongan relaxed fit yang hangat dan lembut di kulit.",
  },
  shirt: {
    name: "Micro Taslan Polyester (Coach Jacket)",
    tag: "OUTDOOR STREETWEAR",
    desc: "Bahan jaket coach berpori rapat: tahan terpaan angin (windproof), menepis percikan air ringan, dan berfuring lembut.",
  },
  cap: {
    name: "Premium Cotton Twill 7-Panel",
    tag: "HEADWEAR DISTRO",
    desc: "Kain twill katun kokoh dengan lubang ventilasi bordir, mempertahankan struktur mahkota topi tetap tegak dan awet.",
  },
  pants: {
    name: "Cotton Twill / Stretch Jogger",
    tag: "CHINO PANTS",
    desc: "Bahan celana panjang twill berdaya regang tinggi, fleksibel untuk aktivitas harian dan jahitan ganda tahan lama.",
  },
  shorts: {
    name: "Cotton Baby Terry / Twill 240 GSM",
    tag: "CASUAL SHORTS",
    desc: "Bahan celana pendek santai bertekstur loop halus di bagian dalam, sejuk, ringan, dan leluasa bergerak.",
  },
};

// FASE F — Editor gambar in-mockup (lazy client-only; chunk AI 0KB sampai diklik
// di dalam modal via await import di imageEditPipeline).
const ImageEditorModalLazy = dynamic(
  () => import("@/components/studio/ImageEditorModal").then((m) => m.ImageEditorModal),
  {
    ssr: false,
    loading: () => <p className="text-xs font-sans text-text-muted p-2">Memuat editor gambar…</p>,
  }
);


/** Format ekspor 360° (D2 — muxer benar, bukan MediaRecorder mentah). */
export type { Export360Format } from "@/components/studio/studioDrawerTypes";
import type { Export360Format } from "@/components/studio/studioDrawerTypes";

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
    throw new Error(`Browser ini tidak bisa encode ${codec.toUpperCase()}. Silakan pilih format lain.`);
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

function getMoodIcon(id: string) {
  switch (id) {
    case "golden":
      return <Sunrise size={18} className="mx-auto text-amber-500" />;
    case "sunset":
      return <Sunset size={18} className="mx-auto text-orange-500" />;
    case "gallery":
      return <ImageIcon size={18} className="mx-auto text-sky-500" />;
    default:
      return <Sun size={18} className="mx-auto" />;
  }
}

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
    syncDesignToServer,
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
    viewMode,
    setViewMode,
    setActivePhase,
    animationPreset,
    setAnimationPreset,
    animationSpeed,
    isSizeGuideOpen,
    setIsSizeGuideOpen,
    toggleClothLab,
    toggleExportModal,
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
      syncDesignToServer: s.syncDesignToServer,
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
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      setActivePhase: s.setActivePhase,
      animationPreset: s.animationPreset,
      setAnimationPreset: s.setAnimationPreset,
      animationSpeed: s.animationSpeed,
      setAnimationSpeed: s.setAnimationSpeed,
      isSizeGuideOpen: s.isSizeGuideOpen,
      setIsSizeGuideOpen: s.setIsSizeGuideOpen,
      toggleClothLab: s.toggleClothLab,
      toggleExportModal: s.toggleExportModal,
    }))
  );

  const [activeTab, setActiveTab] = useState<StudioTab>("apparel");
  const [decalSubMode, setDecalSubMode] = useState<"standard" | "team">("standard");
  const [optionSubMode, setOptionSubMode] = useState<"saved" | "export">("saved");

  const handleTabChange = (tab: StudioTab) => {
    if (tab === "team") {
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { data: session } = useSession();
  // M3.4 — BG remover: tolerance slider + target putih/hitam (foto malam).
  const [bgTolerance, setBgTolerance] = useState(35);
  const [bgTarget, setBgTarget] = useState<"white" | "black">("white");
  const [showBgRemover, setShowBgRemover] = useState(false);
  // M3.6 — Peringatan master belum tersimpan sebelum checkout (sekali per buka).
  const [masterWarnDismissed, setMasterWarnDismissed] = useState(false);

  // Live Inventory Variant Map (persilangan slug_color_size)
  interface VariantItemInfo {
    stockQty: number;
    priceIdr: number;
    sku: string;
  }
  const [variantStockMap, setVariantStockMap] = useState<Record<string, VariantItemInfo>>({});
  useEffect(() => {
    let active = true;
    fetch("/api/catalog/variants")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.variants) return;
        const map: Record<string, VariantItemInfo> = {};
        for (const v of data.variants) {
          const rawSlug = (v.category?.slug || "").toLowerCase().trim();
          const slugs = [rawSlug];
          if (rawSlug === "tee") slugs.push("tshirt");
          if (rawSlug === "tshirt") slugs.push("tee");
          if (rawSlug === "sweater") slugs.push("crewneck");
          if (rawSlug === "crewneck") slugs.push("sweater");
          if (rawSlug === "jacket") slugs.push("shirt");
          if (rawSlug === "shirt") slugs.push("jacket");

          const hex = (v.colorHex || "").toLowerCase().trim();
          const sz = (v.size || "").toUpperCase().trim();
          const cName = (v.colorName || "").toLowerCase().trim();
          const info: VariantItemInfo = {
            stockQty: v.stockQty ?? 0,
            priceIdr: v.priceIdr ?? 0,
            sku: v.sku ?? "",
          };

          for (const s of slugs) {
            // Prioritaskan kunci eksak (hex dan nama warna spesifik)
            if (hex) map[`${s}_${hex}_${sz}`] = info;
            if (cName) map[`${s}_${cName}_${sz}`] = info;

            // Alias fallback tanpa menimpa varian eksak yang sudah ada
            if (hex === "#ffffff" || cName.includes("chalk")) {
              if (!map[`${s}_#ffffff_${sz}`]) map[`${s}_#ffffff_${sz}`] = info;
              if (!map[`${s}_chalk_${sz}`]) map[`${s}_chalk_${sz}`] = info;
            }
            if (hex === "#121214" || cName.includes("obsidian")) {
              if (!map[`${s}_#121214_${sz}`]) map[`${s}_#121214_${sz}`] = info;
              if (!map[`${s}_obsidian_${sz}`]) map[`${s}_obsidian_${sz}`] = info;
            }
          }
        }
        setVariantStockMap(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const resolveVariantInfo = (apparel: string, colorHex: string, size: string): VariantItemInfo | undefined => {
    const normApparel = apparel.toLowerCase().trim();
    const hex = colorHex.toLowerCase().trim();
    const sz = size.toUpperCase().trim();

    // 1. Cek kunci eksak apparel + hex + size
    if (variantStockMap[`${normApparel}_${hex}_${sz}`]) {
      return variantStockMap[`${normApparel}_${hex}_${sz}`];
    }
    // 2. Cek nama warna aktif
    if (activeColorName && variantStockMap[`${normApparel}_${activeColorName.toLowerCase().trim()}_${sz}`]) {
      return variantStockMap[`${normApparel}_${activeColorName.toLowerCase().trim()}_${sz}`];
    }
    // 3. Fallback warna putih / hitam standar
    if (hex === "#ffffff" || hex === "#efece6" || hex === "#f7f5f0") {
      const whiteInfo = variantStockMap[`${normApparel}_#ffffff_${sz}`] || variantStockMap[`${normApparel}_chalk_${sz}`] || variantStockMap[`${normApparel}_#f7f5f0_${sz}`];
      if (whiteInfo) return whiteInfo;
    }
    if (hex === "#121214" || hex === "#111111" || hex === "#000000") {
      const blackInfo = variantStockMap[`${normApparel}_#121214_${sz}`] || variantStockMap[`${normApparel}_obsidian_${sz}`] || variantStockMap[`${normApparel}_#000000_${sz}`];
      if (blackInfo) return blackInfo;
    }
    // 4. Fallback varian pertama garmen & ukuran sama
    for (const key of Object.keys(variantStockMap)) {
      if (key.startsWith(`${normApparel}_`) && key.endsWith(`_${sz}`)) {
        return variantStockMap[key];
      }
    }
    return undefined;
  };

  const currentVariantInfo = resolveVariantInfo(activeApparel, selectedColor, selectedSize);
  const currentVariantStock = currentVariantInfo?.stockQty;
  const currentVariantSku = currentVariantInfo?.sku;
  const isCurrentVariantOut = currentVariantInfo !== undefined && currentVariantInfo.stockQty <= 0;
  const isCurrentVariantLow = currentVariantInfo !== undefined && currentVariantInfo.stockQty > 0 && currentVariantInfo.stockQty <= 10;

  const handleAddTextDecal = async () => {
    if (!customTextString.trim()) return;
    // M3.5 — SATU mesin teks + master (WS-C Bab 43: drawer 100% 3D).
    const textDataUrl = await generateTextDecalDataUrl({
      text: customTextString,
      fontFamily: customTextFont,
      textColor: customTextColor,
      enableShadow: customTextShadow,
    });
    if (!textDataUrl) return;

    const curCam = useConfiguratorStore.getState().cameraPreset;
    let targetSide: DecalTargetSide = "front";
    let initX = 0;
    let initY = -0.05;
    let initScale = 0.11;
    if (curCam === "back") {
      targetSide = "back";
      initY = 0.0;
      initScale = 0.14;
    } else if (curCam === "left") {
      targetSide = "left_sleeve";
      initY = 0.05;
      initScale = 0.08;
    } else if (curCam === "right") {
      targetSide = "right_sleeve";
      initY = 0.05;
      initScale = 0.08;
    }

    const id = addDecal({
      name: `Teks: ${customTextString.slice(0, 10)}`,
      url: textDataUrl,
      targetSide,
      x: initX,
      y: initY,
      scale: initScale,
      rotation: 0,
      opacity: 1,
      // Bab 52/53 (3) — simpan metadata teks agar re-editable (client-only).
      textMetadata: {
        text: customTextString.trim().slice(0, 24),
        fontId: customTextFont,
        color: customTextColor,
      },
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
  // Blueprint Bab 37.2 + Bab 41 — PESAN SEKARANG = tambah-ke-keranjang lalu
  // buka CartDrawer. JANGAN bypass langsung ke CheckoutModal; JANGAN paksa
  // login di sini (guest boleh masuk cart — checkout tamu ditangani
  // CheckoutModal "Checkout Cepat (Tamu)"). Checkout hanya dibuka dari
  // CartDrawer ("Proses Checkout (Bayar QRIS)" → checkoutMode="cart").
  const openCheckoutWithMasterGate = () => {
    if (isCurrentVariantOut) {
      setEnhancementMessage(
        `⚠️ Stok varian ${currentApparelInfo.name} (${activeColorName} - Ukuran ${selectedSize}) sedang habis di workshop. Silakan pilih warna atau ukuran lain.`
      );
      setTimeout(() => setEnhancementMessage(null), 6000);
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
    // Harga SELARAS struk checkout: engine 6-variabel yang sama dipakai
    // CheckoutModal (custom-3d) — tanpa productVariantId agar server hitung
    // via engine otoritatif (termasuk diskon volume).
    const mat = materialFinishToPricing(materialFinish);
    useCartStore.getState().addItem({
      id: `custom-${activeApparel}-${selectedColor.toLowerCase()}`,
      name: `Custom ${currentApparelInfo.name} Sablon DTF`,
      priceIdr: pricing.totalPriceIdr,
      size: selectedSize,
      colorName: activeColorName,
      colorHex: selectedColor,
      // SENGAJA thumbnail generik: preview decal = base64 raksasa yang
      // membengkakkan localStorage cart (persist). Master produksi ikut
      // via `decals` di bawah, bukan via `image`.
      image: "/lookbook/look-01.jpg",
      isCustom: true,
      apparelSlug: activeApparel,
      ...(typeof currentVariantStock === "number" ? { stockQty: currentVariantStock } : {}),
      decals,
      materialFinishSlug: materialFinish,
      fabricThicknessSlug: mat.fabricThicknessSlug,
    });
    // addItem sudah set isCartOpen:true; panggil eksplisit agar niat
    // "lalu buka CartDrawer" jelas (pola sama: Navbar/StoreShowcaseSection).
    useCartStore.getState().openCart();
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

      // Tentukan targetSide cerdas sesuai sudut pandang kamera saat ini
      const curCam = useConfiguratorStore.getState().cameraPreset;
      let targetSide: DecalTargetSide = "front";
      let initX = 0;
      let initY = 0.0;
      let initScale = 0.11;
      if (curCam === "back") {
        targetSide = "back";
        initY = 0.0;
        initScale = 0.14; // Sablon punggung lebih leluasa (A3/A4)
      } else if (curCam === "left") {
        targetSide = "left_sleeve";
        initY = 0.05;
        initScale = 0.08;
      } else if (curCam === "right") {
        targetSide = "right_sleeve";
        initY = 0.05;
        initScale = 0.08;
      }

      // Ukur dimensi master/preview SEBELUM addDecal agar printPx langsung terisi sejak frame 1 (anti 1:1 square stretch)
      let initialPrintPx: { w: number; h: number } | undefined = undefined;
      try {
        const sz = await getImageSize(master || previewUrl);
        if (sz && sz.w > 0 && sz.h > 0) {
          initialPrintPx = { w: sz.w, h: sz.h };
        }
      } catch {}

      const id = addDecal({
        name: `Sablon ${decals.length + 1} (${file.name.slice(0, 8)})`,
        url: previewUrl,
        targetSide,
        x: initX,
        y: initY,
        scale: initScale,
        rotation: 0,
        opacity: 1,
        ...(initialPrintPx ? { printPx: initialPrintPx } : {}),
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
      if (!initialPrintPx) {
        void getImageSize(master)
          .then((sz) => {
            try {
              if (sz && sz.w > 0 && sz.h > 0) {
                updateDecal(id, { printPx: { w: sz.w, h: sz.h } });
              }
            } catch {}
          })
          .catch(() => {});
      }
      setSelectedDecalId(id);
      setActiveTab("decals");
      setDecalSubMode("standard");


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
  const [exportResolution, setExportResolution] = useState<"standard" | "hd" | "2k">("2k");
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Ekspor 360° tangguh: mediabunny dengan auto-fallback ke native MediaRecorder.
  // Bab 53 — tamu (!session) via kompositor-kanvas + tile pra-render
  // (lib/watermarkVideo.ts); member (session) = stream langsung bersih.
  const handleExport360Video = async () => {
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
    let activeStream: MediaStream | null = null;
    let stopCompositor: (() => void) | null = null;
    let guestWatermarked = false;
    const totalMs = 5000;

    const cleanup = () => {
      try {
        stopCompositor?.();
      } catch {
        // abaikan
      }
      stopCompositor = null;
      for (const s of [activeStream, stream]) {
        try {
          s?.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {
              // abaikan
            }
          });
        } catch {
          // abaikan
        }
      }
      stream = null;
      activeStream = null;
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
      const srcTrack = stream.getVideoTracks()[0];
      if (!srcTrack) {
        setEnhancementMessage("Track video 360° tidak tersedia di browser ini.");
        setTimeout(() => setEnhancementMessage(null), 4000);
        cleanup();
        return;
      }

      // Gate tamu/member: member = stream langsung; tamu = kompositor watermark.
      activeStream = stream;
      let activeTrack: MediaStreamVideoTrack = srcTrack;
      if (!session) {
        try {
          const { wrapGuestVideoStreamWithWatermark } = await import("@/lib/watermarkVideo");
          const wrapped = await wrapGuestVideoStreamWithWatermark(stream, { fps: 30 });
          if (wrapped.supported) {
            activeStream = wrapped.stream;
            activeTrack = wrapped.videoTrack;
            stopCompositor = wrapped.stop;
            guestWatermarked = true;
          } else {
            // 🟡 Safari/mechanical blocker: jujur tanpa crash, lanjut stream asli.
            console.warn("Watermark video tamu dilewati:", wrapped.reason);
            setEnhancementMessage(
              `⚠️ Watermark tamu dilewati (${wrapped.reason}). Video tetap tersimpan tanpa watermark. Masuk untuk versi bersih.`
            );
            setTimeout(() => setEnhancementMessage(null), 5000);
          }
        } catch (e) {
          console.warn("Kompositor watermark tamu gagal, lanjut tanpa watermark:", e);
          setEnhancementMessage(
            "⚠️ Kompositor watermark gagal. Video tetap tersimpan tanpa watermark."
          );
          setTimeout(() => setEnhancementMessage(null), 5000);
        }
      }

      const onTick = (elapsedMs: number) =>
        setRecordingProgress(Math.min(100, Math.round((elapsedMs / totalMs) * 100)));

      if (format === "gif") {
        await export360Gif(activeStream, totalMs, onTick);
        setEnhancementMessage(
          guestWatermarked
            ? "✅ GIF 360° tersimpan (Preview Tamu ber-watermark). Masuk untuk versi bersih."
            : "✅ GIF 360° tersimpan, siap dibagikan ke medsos."
        );
      } else {
        // Coba mediabunny terlebih dahulu bila browser mendukung; jika gagal/tak didukung, fallback ke native MediaRecorder
        let success = false;
        try {
          const { canEncodeVideo } = await import("mediabunny");
          const codec = format === "mp4" ? "avc" : "vp9";
          const canDo = await canEncodeVideo(codec);
          if (canDo) {
            await export360VideoMediabunny(activeTrack, totalMs, format, onTick);
            success = true;
          }
        } catch (e) {
          console.warn("Mediabunny encoder tidak tersedia, beralih ke native MediaRecorder:", e);
        }

        if (!success) {
          await export360VideoNative(activeStream, totalMs, format, onTick);
        }

        setEnhancementMessage(
          guestWatermarked
            ? `✅ Video 360° ${format.toUpperCase()} tersimpan (Preview Tamu ber-watermark), siap dibagikan.`
            : `✅ Video 360° ${format.toUpperCase()} tersimpan, siap dibagikan.`
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

      // Sesuai Bab 53: Pengguna tamu (belum login) disematkan watermark transparan halus
      // Member yang login mendapatkan gambar bersih 100% tanpa watermark.
      let finalDataUrl = dataUrl;
      if (!session) {
        finalDataUrl = await applyGuestWatermarkToDataUrl(dataUrl);
      }

      const link = document.createElement("a");
      const suffix = exportBgMode === "transparent" ? "-transparent" : "";
      const watermarkTag = !session ? "-guest-preview" : "-clean";
      link.download = `kaos-kami-${activeApparel}-${viewName}-${exportResolution}${suffix}${watermarkTag}.png`;
      link.href = finalDataUrl;
      link.click();
      setEnhancementMessage(
        !session
          ? `✅ Gambar mockup (${viewName}) berhasil diunduh (Mode Tamu). Masuk untuk versi 2K bersih tanpa watermark!`
          : `✅ Gambar mockup HD (${viewName}) bersih berhasil diunduh.`
      );
      setTimeout(() => setEnhancementMessage(null), 4000);
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

  // true = kamera settle; false = timeout (panggil tetap ekspor + peringatan jujur).
  const waitForCameraPresetSettled = async (timeoutMs = 2000): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (useConfiguratorStore.getState().cameraPreset === null) return true;
      } catch {
        return true;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  };

  const handleExportFrontPNG = async (viewName: string = "front-view") => {
    setCameraPreset("front");
    const settled = await waitForCameraPresetSettled(2000);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    if (!settled) {
      setEnhancementMessage("⚠️ Kamera belum settle: hasil mungkin dari sudut lama.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    }
    await doExportMockupImage(viewName);
  };

  const handleExportBackPNG = async (viewName: string = "back-view") => {
    setCameraPreset("back");
    const settled = await waitForCameraPresetSettled(2000);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    if (!settled) {
      setEnhancementMessage("⚠️ Kamera belum settle: hasil mungkin dari sudut lama.");
      setTimeout(() => setEnhancementMessage(null), 3000);
    }
    await doExportMockupImage(viewName);
  };

  const handleExportCurrentPNG = async (viewName: string = "current-view") => {
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
          ctx.fillText("Studio Sablon DTF: desain sendiri, kami cetak", W / 2, 155);
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
    // Tamu DIBUKA: kartu medsos disematkan watermark pola watermark.ts
    // (applyGuestWatermarkToDataUrl existing); member = bersih.
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setEnhancementMessage("Kanvas 3D tidak ditemukan. Buka studio lalu coba lagi.");
      setTimeout(() => setEnhancementMessage(null), 4000);
      return;
    }
    setIsSharing(true);
    try {
      // Sumber 2K tajam (bukan screenshot layar): exportMockup render ulang 2048px.
      let mockupUrl = "";
      try {
        if (typeof (canvas as any).exportMockup === "function") {
          mockupUrl = await (canvas as any).exportMockup({ resolution: "2k" });
        } else {
          mockupUrl = canvas.toDataURL("image/png");
        }
      } catch {
        mockupUrl = canvas.toDataURL("image/png");
      }
      const blob = await buildBrandedShareCard(mockupUrl, {
        apparel: currentApparelInfo.name,
        warna: activeColorName,
        harga: pricing.formattedTotal,
      });
      // Deep-link: pastikan desain tersimpan di server agar tautan membuka karya yg sama.
      let deepLink = "";
      try {
        const localId = saveCurrentDesign(undefined, undefined);
        const sync = await syncDesignToServer(localId);
        if (sync.serverId) {
          deepLink = `${window.location.origin}/studio?designId=${encodeURIComponent(sync.serverId)}`;
        }
      } catch {}
      // Pola watermark.ts guest: tamu → watermark halus, member → bersih.
      let shareBlob = blob;
      if (!session) {
        const rawUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(new Error("gagal baca kartu medsos"));
          fr.readAsDataURL(blob);
        });
        const wmUrl = await applyGuestWatermarkToDataUrl(rawUrl);
        shareBlob = await (await fetch(wmUrl)).blob();
      }
      const file = new File([shareBlob], `kaos-kami-${activeApparel}-1080x1350.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title: string; text: string; url?: string }) => Promise<void> };
      const shareText = `Mockup ${APPAREL_CATALOG[activeApparel]?.name ?? activeApparel} · ${activeColorName} (Kaos Kami Makassar)${deepLink ? ` ${deepLink}` : ""}`;
      if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
        await nav.share({
          files: [file],
          title: "Mockup Kaos Kami",
          text: shareText,
        });
        setEnhancementMessage(deepLink ? "✅ Mockup + tautan desain dibagikan." : "✅ Mockup dibagikan (tautan desain tak tersedia: offline/tamu).");
      } else {
        // Fallback: unduh PNG (perilaku lama, tetap berguna di desktop).
        handleExportPNG("bagikan");
        setEnhancementMessage("Perangkat tak mendukung berbagi langsung. PNG diunduh, silakan teruskan manual.");
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
      setEnhancementMessage("Berbagi gagal: PNG diunduh sebagai gantinya.");
    } finally {
      setIsSharing(false);
      setTimeout(() => setEnhancementMessage(null), 4000);
    }
  };

  const handleCopyShareLink = () => {
    // Tautan berisi ?designId= agar penerima membuka DESAIN yg sama (bukan studio kosong).
    // guestId lokal ikut didukung loader (perangkat yg sama); serverId untuk lintas perangkat.
    const copyText = async (text: string, okMsg: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } else {
          throw new Error("no-clipboard");
        }
      } catch {
        setEnhancementMessage(okMsg);
        setTimeout(() => setEnhancementMessage(null), 4000);
      }
    };
    // Tamu tetap bisa: simpanan tamu tersimpan di server (userId null) + lokal.
    setEnhancementMessage("⏳ Menyiapkan tautan desain…");
    void (async () => {
      try {
        const localId = saveCurrentDesign(undefined, undefined);
        const sync = await syncDesignToServer(localId);
        const st = useConfiguratorStore.getState();
        const entry = st.savedDesigns.find((d) => d.id === localId);
        const did = sync.serverId || entry?.id || "";
        if (!did) {
          await copyText(window.location.href, "Gagal siapkan tautan. Salin manual dari address bar.");
          return;
        }
        const link = `${window.location.origin}/studio?designId=${encodeURIComponent(did)}`;
        await copyText(link, `Tautan: ${link}`);
        setEnhancementMessage(sync.serverId ? "✅ Tautan desain disalin: penerima membuka karya yg sama." : "✅ Tautan disalin (berlaku di perangkat ini; login untuk lintas perangkat).");
        setTimeout(() => setEnhancementMessage(null), 4000);
      } catch {
        setEnhancementMessage("Gagal siapkan tautan. Salin manual dari address bar.");
        setTimeout(() => setEnhancementMessage(null), 3000);
      }
    })();
  };

  const handleSendToWhatsApp = () => {
    const printList = pricing.decalLayers.map((s) => `  • ${s.name} (${s.tier} ${s.widthCm.toFixed(1)}×${s.heightCm.toFixed(1)}cm): +IDR ${s.costIdr.toLocaleString("id-ID")}`).join("\n");
    const text = encodeURIComponent(
      `*Halo Kaos Kami Makassar, saya ingin memesan Mockup Custom:*\n\n` +
      `• *Pakaian:* ${currentApparelInfo.name} (Base IDR ${pricing.basePriceIdr.toLocaleString("id-ID")})\n` +
      (pricing.fabricThicknessSurchargeIdr > 0 ? `• *Kain ${pricing.fabricThicknessSlug}:* +IDR ${pricing.fabricThicknessSurchargeIdr.toLocaleString("id-ID")}\n` : "") +
      `• *Warna:* ${activeColorName} (${selectedColor}) ${pricing.colorTreatmentSurchargeIdr > 0 ? `(+IDR ${pricing.colorTreatmentSurchargeIdr.toLocaleString("id-ID")})` : ""}\n` +
      `• *Ukuran:* ${selectedSize} ${pricing.sizeSurchargeIdr > 0 ? `(+IDR ${pricing.sizeSurchargeIdr.toLocaleString("id-ID")})` : ""}\n` +
      `• *Bahan & Ketebalan:* ${materialFinish.toUpperCase()}\n` +
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
    const localId = saveCurrentDesign(designTitleInput.trim() ? designTitleInput.trim() : undefined, previewUrl);
    setDesignTitleInput("");
    setActiveTab("options");
    setOptionSubMode("saved");
    // Sinkron server: tampilkan status KUOTA jujur (server maks 5/akun).
    setEnhancementMessage("⏳ Menyimpan ke server…");
    void syncDesignToServer(localId).then((r) => {
      if (r.quotaExceeded) {
        setEnhancementMessage("Koleksi cloud Anda sudah penuh (5/5): tersimpan lokal saja. Hapus desain lama di dashboard untuk memberi ruang, ya.");
      } else if (r.error) {
        setEnhancementMessage("⚠️ Tersimpan lokal; sinkron server gagal. Coba lagi nanti.");
      } else {
        setEnhancementMessage("✅ Desain berhasil disimpan ke koleksi Anda.");
      }
      setTimeout(() => setEnhancementMessage(null), 4000);
    });
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

  // Bab 52/53 (2) — Duplikat decal-layer: copy via store yang sama, geser X+0.05.
  const handleDuplicateDecal = (id: string) => {
    const src = decals.find((d) => d.id === id);
    if (!src) return;
    const jepit = clampDecalXY(src.targetSide, src.x + 0.05, src.y);
    const newId = addDecal({
      name: `${src.name} (Salinan)`,
      url: src.url,
      targetSide: src.targetSide,
      x: jepit.x,
      y: jepit.y,
      scale: src.scale,
      rotation: src.rotation,
      opacity: src.opacity,
      ...(src.printPx ? { printPx: { ...src.printPx } } : {}),
      ...(src.textMetadata ? { textMetadata: { ...src.textMetadata } } : {}),
    });
    try {
      const m = getMasterDataUrl(src.id, src.url);
      setMasterDataUrl(newId, m);
    } catch {
      // abaikan — preview tetap tampil
    }
    try {
      const o = getOriginalMasterDataUrl(src.id);
      if (o) setOriginalMasterDataUrl(newId, o);
    } catch {
      // abaikan
    }
    setSelectedDecalId(newId);
  };

  // Bab 52/53 (3) — Edit Teks: buka kembali generator terisi dari textMetadata.
  // Generator MENDUKUNG prefill (state controlled customText* di drawer ini).
  const handleEditTextDecal = (id: string) => {
    const layer = decals.find((d) => d.id === id);
    const meta = layer?.textMetadata;
    if (!layer || !meta) return;
    setCustomTextString(meta.text);
    const validFont = FONT_PRESETS.some((f) => f.id === meta.fontId)
      ? (meta.fontId as TextDecalOptions["fontFamily"])
      : "streetwear-bold";
    setCustomTextFont(validFont);
    setCustomTextColor(meta.color);
    setHasManuallyPickedTextColor(true);
    setSelectedDecalId(id);
    setShowTextInput(true);
    setActiveTab("decals");
    setDecalSubMode("standard");
  };

  const handleReturnToStory = () => {
    setViewMode("story");
    setActivePhase(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  const isDrawerHidden = isDrawerCollapsed || isHideWebsiteUI;

  return (
    <>
      {/* Collapsed Floating Recovery Pill - Hanya aktif saat di Studio Mode, tidak pernah di Story Mode */}
      {isDrawerCollapsed && !isHideWebsiteUI && viewMode === "studio" && (
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
              <span className="font-sans font-semibold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-brand-accent shrink-0" />
                <span>BUKA MENU · {currentApparelInfo.name}</span>
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

      {/* Full Customizer Drawer — Desktop Floating Luxury Panel (md+ via CSS) */}
      <aside
        className={`fixed top-[74px] bottom-5 ${Z_CLASS_DRAWER} max-w-[430px] w-full hidden md:flex flex-col pointer-events-none transition-all duration-500 ease-out ${
          drawerPosition === "left" ? "left-5" : "right-5"
        } ${
          isDrawerHidden
            ? "opacity-0 translate-y-8 pointer-events-none invisible select-none"
            : "opacity-100 translate-y-0 pointer-events-auto visible"
        }`}
      >
        <div className={`w-full h-full rounded-3xl glass-panel-elevated shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-border-subtle overflow-hidden flex flex-col backdrop-blur-2xl bg-surface/90 ${
          isDrawerHidden ? "pointer-events-none" : "pointer-events-auto"
        }`}>
          {/* Top Header Bar - Ultra Clean, Minimal & Luxury */}
          <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-surface/90 backdrop-blur-md shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 shadow-[0_0_8px_rgba(230,81,0,0.6)] animate-pulse" />
              <h3 className="text-sm sm:text-base font-sans font-bold uppercase text-text-primary truncate tracking-tight">
                {currentApparelInfo.name}
              </h3>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Dock Left / Right Toggle */}
              <button
                onClick={toggleDrawerPosition}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer shadow-sm active:scale-95"
                title={drawerPosition === "right" ? "Pindahkan panel ke kiri" : "Pindahkan panel ke kanan"}
                aria-label="Pindahkan posisi panel"
              >
                {drawerPosition === "right" ? <PanelLeftClose size={14} /> : <PanelRightClose size={14} />}
              </button>

              {/* Tutup Menu */}
              <button
                onClick={toggleDrawerCollapsed}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                title="Tutup menu kustomisasi"
                aria-label="Tutup menu kustomisasi"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* 3 Primary Tabs Navigation - Balanced Segmented Controls */}
          <div role="tablist" aria-label="Menu kustomisasi" className="grid grid-cols-3 border-b border-border-subtle bg-canvas/60 text-xs font-sans tabular-nums shrink-0">
            {[
              { id: "apparel", label: "PRODUK", icon: Shirt },
              { id: "decals", label: `SABLON (${decals.length})`, icon: Sliders },
              { id: "options", label: "SIMPAN & EKSPOR", icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => handleTabChange(id as StudioTab)}
                className={`py-3 px-2 flex items-center justify-center space-x-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === id
                    ? "border-brand-accent text-brand-accent font-bold bg-surface/80 shadow-inner"
                    : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface/30"
                }`}
              >
                <Icon size={13} />
                <span className="text-[11px] sm:text-xs font-bold uppercase truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable Content Body with Independent Fluid Scrolling */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4 text-text-primary">
            {/* TAB 1: APPAREL & COLOR → ApparelTabContent (Bab 53 Fase 5, JSX verbatim) */}
            {activeTab === "apparel" && (
              <ApparelTabContent
                activeApparel={activeApparel}
                setActiveApparel={setActiveApparel}
                activeColorName={activeColorName}
                colorTreatmentSurchargeIdr={pricing.colorTreatmentSurchargeIdr}
                sizeSurchargeIdr={pricing.sizeSurchargeIdr}
                activeColorMode={activeColorMode}
                partColors={partColors}
                selectedColor={selectedColor}
                activePartId={activePartId}
                setActivePartId={setActivePartId}
                setSelectedColor={setSelectedColor}
                setPartColor={setPartColor}
                selectedSize={selectedSize}
                setSelectedSize={setSelectedSize}
                setIsSizeGuideOpen={setIsSizeGuideOpen}
                currentVariantStock={currentVariantStock}
                currentVariantSku={currentVariantSku}
                currentApparelSizes={currentApparelInfo.sizes}
                resolveVariantInfo={resolveVariantInfo}
              />
            )}

            {/* TAB 2: SABLON (DTF) → SablonTabContent (Bab 53 Fase 5, JSX verbatim) */}
            {activeTab === "decals" && (
              <SablonTabContent
                activeTab={activeTab}
                decalSubMode={decalSubMode}
                decals={decals}
                selectedDecalId={selectedDecalId}
                setSelectedDecalId={setSelectedDecalId}
                activeDecal={activeDecal}
                activeApparel={activeApparel}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                showTextInput={showTextInput}
                setShowTextInput={setShowTextInput}
                customTextString={customTextString}
                setCustomTextString={setCustomTextString}
                customTextFont={customTextFont}
                setCustomTextFont={setCustomTextFont}
                customTextColor={customTextColor}
                setCustomTextColor={setCustomTextColor}
                setHasManuallyPickedTextColor={setHasManuallyPickedTextColor}
                customTextShadow={customTextShadow}
                setCustomTextShadow={setCustomTextShadow}
                handleAddTextDecal={handleAddTextDecal}
                pricingDecalLayers={pricing.decalLayers}
                updateDecal={updateDecal}
                setCameraPreset={setCameraPreset}
                physicalDimensions={physicalDimensions}
                qualityReport={qualityReport}
                enhancementMessage={enhancementMessage}
                setIsImageEditorOpen={setIsImageEditorOpen}
                showBgRemover={showBgRemover}
                setShowBgRemover={setShowBgRemover}
                bgTarget={bgTarget}
                setBgTarget={setBgTarget}
                bgTolerance={bgTolerance}
                setBgTolerance={setBgTolerance}
                isEnhancingImage={isEnhancingImage}
                handleRemoveWhiteBg={handleRemoveWhiteBg}
                handleRestoreOriginal={handleRestoreOriginal}
                hasOriginalMaster={hasOriginalMaster}
                applyLogoPreset={applyLogoPreset}
                handleRemoveDecal={handleRemoveDecal}
                handleDuplicateDecal={handleDuplicateDecal}
                handleEditTextDecal={handleEditTextDecal}
                toggleClothLab={toggleClothLab}
              />
            )}

            {/* TAB 3: SIMPAN & EKSPOR → SimpanEksporTabContent (Bab 53 Fase 5, JSX verbatim) */}
            {(activeTab === "options" || activeTab === "saved" || activeTab === "export") && (
              <SimpanEksporTabContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                optionSubMode={optionSubMode}
                setOptionSubMode={setOptionSubMode}
                savedDesigns={savedDesigns}
                session={session}
                setIsAuthOpen={setIsAuthOpen}
                designTitleInput={designTitleInput}
                setDesignTitleInput={setDesignTitleInput}
                handleSaveDesign={handleSaveDesign}
                enhancementMessage={enhancementMessage}
                loadSavedDesign={loadSavedDesign}
                duplicateSavedDesign={duplicateSavedDesign}
                deleteSavedDesign={deleteSavedDesign}
                exportBgMode={exportBgMode}
                setExportBgMode={setExportBgMode}
                exportResolution={exportResolution}
                setExportResolution={setExportResolution}
                toggleExportModal={toggleExportModal}
                handleExportFrontPNG={handleExportFrontPNG}
                handleExportBackPNG={handleExportBackPNG}
                handleExportCurrentPNG={handleExportCurrentPNG}
                isExportingImage={isExportingImage}
                handleShareMockup={handleShareMockup}
                isSharing={isSharing}
                export360Format={export360Format}
                setExport360Format={setExport360Format}
                isRecording360={isRecording360}
                recordingProgress={recordingProgress}
                handleExport360Video={handleExport360Video}
                handleCopyShareLink={handleCopyShareLink}
                copiedLink={copiedLink}
                handleSendToWhatsApp={handleSendToWhatsApp}
              />
            )}
          </div>

          {/* Itemized Mathematical Price Calculation Footer → SimpanOrderFooter (Bab 53 Fase 5, JSX verbatim) */}
          <SimpanOrderFooter
            variant="desktop"
            pricing={pricing}
            currentApparelName={currentApparelInfo.name}
            selectedSize={selectedSize}
            showPriceBreakdown={showPriceBreakdown}
            setShowPriceBreakdown={setShowPriceBreakdown}
            openCheckoutWithMasterGate={openCheckoutWithMasterGate}
            isCurrentVariantOut={isCurrentVariantOut}
          />
        </div>
      </aside>

      {/* Mobile BottomSheet → MobileCustomizerSheet (Bab 53 Fase 5, JSX verbatim) */}
      <MobileCustomizerSheet
        isMobileCss={isMobileCss}
        isDrawerHidden={isDrawerHidden}
        toggleDrawerCollapsed={toggleDrawerCollapsed}
        currentApparelName={currentApparelInfo.name}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleTabChange={handleTabChange}
        decals={decals}
        selectedDecalId={selectedDecalId}
        setSelectedDecalId={setSelectedDecalId}
        activeApparel={activeApparel}
        setActiveApparel={setActiveApparel}
        decalSubMode={decalSubMode}
        toggleClothLab={toggleClothLab}
        fileInputRef={fileInputRef}
        showTextInput={showTextInput}
        setShowTextInput={setShowTextInput}
        customTextString={customTextString}
        setCustomTextString={setCustomTextString}
        handleAddTextDecal={handleAddTextDecal}
        setIsImageEditorOpen={setIsImageEditorOpen}
        handleRemoveDecal={handleRemoveDecal}
        optionSubMode={optionSubMode}
        setOptionSubMode={setOptionSubMode}
        savedDesigns={savedDesigns}
        session={session}
        setIsAuthOpen={setIsAuthOpen}
        designTitleInput={designTitleInput}
        setDesignTitleInput={setDesignTitleInput}
        handleSaveDesign={handleSaveDesign}
        enhancementMessage={enhancementMessage}
        loadSavedDesign={loadSavedDesign}
        duplicateSavedDesign={duplicateSavedDesign}
        deleteSavedDesign={deleteSavedDesign}
        toggleExportModal={toggleExportModal}
        exportBgMode={exportBgMode}
        setExportBgMode={setExportBgMode}
        handleExportFrontPNG={handleExportFrontPNG}
        handleExportBackPNG={handleExportBackPNG}
        handleExportCurrentPNG={handleExportCurrentPNG}
        isExportingImage={isExportingImage}
        handleShareMockup={handleShareMockup}
        isSharing={isSharing}
        export360Format={export360Format}
        setExport360Format={setExport360Format}
        isRecording360={isRecording360}
        recordingProgress={recordingProgress}
        handleExport360Video={handleExport360Video}
        pricing={pricing}
        selectedSize={selectedSize}
        showPriceBreakdown={showPriceBreakdown}
        setShowPriceBreakdown={setShowPriceBreakdown}
        openCheckoutWithMasterGate={openCheckoutWithMasterGate}
        isCurrentVariantOut={isCurrentVariantOut}
      />

      {/* Auth Modal for SAVED gate */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {/* Blueprint Bab 37.2 + 41: checkout HANYA via CartDrawer
          (checkoutMode="cart") — JANGAN render CheckoutModal langsung di sini. */}
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
            setEnhancementMessage(`✅ Gambar tersimpan: ${label}${ukuran}.`);
            setTimeout(() => setEnhancementMessage(null), 5000);
          }}
        />
      )}

      {/* Size Guide Modal Dialog */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        activeApparel={activeApparel}
        selectedSize={selectedSize}
        onSelectSize={(sz) => setSelectedSize(sz)}
      />
    </>
  );
};
