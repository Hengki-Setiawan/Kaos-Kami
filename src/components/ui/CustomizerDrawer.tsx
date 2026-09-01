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
} from "lucide-react";
import {
  PRODUCT_COLORS,
  APPAREL_CATALOG,
  calculateCustomMockupPrice,
  type ApparelType,
  type StudioTheme,
  type MaterialFinish,
  type LightingPreset,
} from "@/lib/constants";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { computePhysicalPrintDimensions } from "@/lib/scaleCalibration";
import { evaluatePrintQuality } from "@/lib/dpiAnalyzer";
import { removeSolidBackground } from "@/lib/enhancers/removeSolidBackground";
import { compressImageClient } from "@/lib/enhancers/compressImage";
import { Ruler, Wand2, Loader2, AlertTriangle, ShieldCheck, ShoppingCart, Type } from "lucide-react";
import { CheckoutModal } from "@/components/ui/CheckoutModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { AuthModal } from "@/components/ui/AuthModal";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import { generateTextDecalDataUrl, FONT_PRESETS, type TextDecalOptions } from "@/lib/typography/textDecalGenerator";

const FabricEditor = dynamic(() => import("./FabricEditor").then((m) => m.FabricEditor), {
  ssr: false,
  loading: () => <p className="text-xs font-mono text-text-muted p-2">Memuat Fabric editor…</p>,
});

type StudioTab = "apparel" | "decals" | "sandbox" | "saved" | "export";

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
    isGizmoVisible,
    toggleGizmoVisible,
  } = useConfiguratorStore();

  const [activeTab, setActiveTab] = useState<StudioTab>("apparel");
  const [customHex, setCustomHex] = useState(selectedColor);
  const [designTitleInput, setDesignTitleInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceTier = useDeviceTier();

  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [enhancementMessage, setEnhancementMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Text Typography Customizer State
  const [showTextInput, setShowTextInput] = useState(false);
  const [customTextString, setCustomTextString] = useState("");
  const [customTextFont, setCustomTextFont] = useState<TextDecalOptions["fontFamily"]>("streetwear-bold");
  const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
  const [activePartId, setActivePartId] = useState<string>("body");
  const [showFabricEditor, setShowFabricEditor] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { data: session } = useSession();

  const handleAddTextDecal = () => {
    if (!customTextString.trim()) return;
    const textDataUrl = generateTextDecalDataUrl({
      text: customTextString,
      fontFamily: customTextFont,
      textColor: customTextColor,
    });

    const id = addDecal({
      name: `Teks: ${customTextString.slice(0, 10)}`,
      url: textDataUrl,
      targetSide: "front",
      x: 0,
      y: -0.05,
      scale: 0.52,
      rotation: 0,
      opacity: 1,
    });

    setSelectedDecalId(id);
    setCustomTextString("");
    setShowTextInput(false);
    setActiveTab("decals");
  };

  const isVisible = viewMode === "studio";
  const currentApparelInfo = APPAREL_CATALOG[activeApparel];
  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];

  // Real-Time DPI & Aspect Ratio Quality Analyzer — uses actual image naturalWidth and naturalHeight
  const [decalPixelWidth, setDecalPixelWidth] = useState<number>(1200);
  const [decalAspectRatio, setDecalAspectRatio] = useState<number>(1.0);

  useEffect(() => {
    if (!activeDecal?.url) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 1200;
      const h = img.naturalHeight || img.height || 1200;
      setDecalPixelWidth(w);
      setDecalAspectRatio(h > 0 ? w / h : 1.0);
    };
    img.onerror = () => {
      setDecalPixelWidth(1200);
      setDecalAspectRatio(1.0);
    };
    img.src = activeDecal.url;
  }, [activeDecal?.url]);

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
    return evaluatePrintQuality(decalPixelWidth, physicalDimensions.widthCm);
  }, [physicalDimensions, decalPixelWidth]);

  // Handler: 1-Click White Background Remover (<10ms Canvas Chroma-Key)
  const handleRemoveWhiteBg = async () => {
    if (!activeDecal) return;
    try {
      setIsEnhancingImage(true);
      const transparentDataUrl = await removeSolidBackground(activeDecal.url, "white", 35);
      updateDecal(activeDecal.id, { url: transparentDataUrl });
      setEnhancementMessage("✨ Background putih berhasil dihilangkan (Transparan)!");
      setTimeout(() => setEnhancementMessage(null), 3000);
    } catch (err: any) {
      setEnhancementMessage("Gagal menghapus background: " + (err?.message || "Kesalahan"));
      setTimeout(() => setEnhancementMessage(null), 3000);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  // Handler: Serverless Sharp Image Edge Sharpener
  const handleSharpEnhance = async () => {
    if (!activeDecal) return;
    try {
      setIsEnhancingImage(true);
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: activeDecal.url }),
      });
      const data = await res.json();
      if (data.enhancedUrl) {
        updateDecal(activeDecal.id, { url: data.enhancedUrl });
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

  // Dynamic Makassar Mathematical Pricing Calculator
  const pricing = useMemo(() => {
    return calculateCustomMockupPrice(activeApparel, selectedColor, selectedSize, decals);
  }, [activeApparel, selectedColor, selectedSize, decals]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsEnhancingImage(true);
      // Auto-compress large phone camera uploads to max 1200px (Saves up to 90% DB storage while keeping 300 DPI print crispness)
      const compressedDataUrl = await compressImageClient(file, { maxDimension: 1200, quality: 0.9 });

      const id = addDecal({
        name: `Sablon ${decals.length + 1} (${file.name.slice(0, 8)})`,
        url: compressedDataUrl,
        targetSide: "front",
        x: 0,
        y: -0.05, // Clean chest placement, below neck/hood
        scale: 0.48,
        rotation: 0,
        opacity: 1,
      });
      setSelectedDecalId(id);
      setActiveTab("decals");
    } catch (err: any) {
      console.error("Gagal mengompres gambar:", err);
    } finally {
      setIsEnhancingImage(false);
    }
  };

  const [isRecording360, setIsRecording360] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const handleExport360Video = async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    try {
      setIsRecording360(true);
      setRecordingProgress(0);

      // Ensure rotation is enabled
      const wasRotating = isRotating;
      if (!wasRotating) toggleRotating();

      // Capture 30fps video stream from Three.js canvas
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (!stream) {
        alert("Browser Anda tidak mendukung perekaman kanvas 3D langsung.");
        setIsRecording360(false);
        return;
      }

      // Check supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kaos-kami-${activeApparel}-360-turntable.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording360(false);
        if (!wasRotating) toggleRotating();
      };

      mediaRecorder.start();

      // 5-second 360-degree rotation recording with progress ticker
      const totalMs = 5000;
      const intervalMs = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += intervalMs;
        setRecordingProgress(Math.min(Math.round((elapsed / totalMs) * 100), 100));
        if (elapsed >= totalMs) {
          clearInterval(timer);
          mediaRecorder.stop();
        }
      }, intervalMs);
    } catch (err) {
      console.error("Gagal mengekspor video 360:", err);
      setIsRecording360(false);
    }
  };

  const handleExportPNG = (viewName: string = "mockup") => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `kaos-kami-${activeApparel}-${viewName}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleSendToWhatsApp = () => {
    const printList = pricing.sablonDetails.map((s) => `  • ${s.name}: +IDR ${s.cost.toLocaleString("id-ID")}`).join("\n");
    const text = encodeURIComponent(
      `*Halo Kaos Kami Makassar, saya ingin memesan Mockup Custom:*\n\n` +
      `• *Pakaian:* ${currentApparelInfo.name} (Base IDR ${pricing.basePrice.toLocaleString("id-ID")})\n` +
      `• *Warna:* ${activeColorName} (${selectedColor}) ${pricing.colorSurcharge > 0 ? `(+IDR ${pricing.colorSurcharge.toLocaleString("id-ID")})` : ""}\n` +
      `• *Ukuran:* ${selectedSize} ${pricing.sizeSurcharge > 0 ? `(+IDR ${pricing.sizeSurcharge.toLocaleString("id-ID")})` : ""}\n` +
      `• *Material Finish:* ${materialFinish.toUpperCase()}\n` +
      `• *Sablon DTF:* ${decals.length} Layer(s)\n` +
      `${printList ? printList + "\n" : ""}` +
      `• *TOTAL ESTIMASI HARGA:* ${pricing.formattedTotal}\n\n` +
      `Mohon info proses produksi & pengiriman. Terima kasih!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleSaveDesign = () => {
    saveCurrentDesign(designTitleInput.trim() ? designTitleInput.trim() : undefined);
    setDesignTitleInput("");
    setActiveTab("saved");
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
          title="Rotate Mode (Left click + drag to orbit 360°)"
        >
          <Compass size={14} />
          <span className="hidden sm:inline">ROTATE 360°</span>
        </button>

        <button
          onClick={() => setInteractionTool("pan")}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
            interactionTool === "pan"
              ? "bg-brand-accent text-canvas font-bold shadow-md"
              : "text-text-muted hover:text-text-primary hover:bg-surface"
          }`}
          title="Move / Pan Mode (Left click + drag anywhere to move model)"
        >
          <Hand size={14} />
          <span className="hidden sm:inline">MOVE / PAN</span>
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

      {/* Full Customizer Drawer — Desktop (md+) uses fixed drawer, Mobile uses BottomSheet */}
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
                  {"// 3D PRO MOCKUP SANDBOX"}
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
                title={drawerPosition === "right" ? "Dock to Left Side" : "Dock to Right Side"}
              >
                {drawerPosition === "right" ? <PanelLeftClose size={14} /> : <PanelRightClose size={14} />}
              </button>

              {/* Minimize Drawer Button */}
              <button
                onClick={toggleDrawerCollapsed}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all"
                title="Minimize Drawer"
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
                title={isHideWebsiteUI ? "Show Website UI" : "Fullscreen Clean Mockup"}
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
                title="Toggle 360° Auto-Spin"
              >
                <RotateCcw size={14} className={isRotating ? "animate-spin" : ""} />
              </button>

              {/* Close Studio / Return to Story */}
              <button
                onClick={handleReturnToStory}
                className="p-2 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas transition-all flex items-center space-x-1 font-mono text-[11px] font-bold"
                title="Exit Studio & Return to Story"
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
                    CHOOSE APPAREL ASSET:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["tshirt", "hoodie", "shirt"] as ApparelType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setActiveApparel(type)}
                        className={`py-3 px-2 rounded-xl font-mono text-xs font-bold border transition-all uppercase truncate flex flex-col items-center justify-center space-y-1 ${
                          activeApparel === type
                            ? "bg-brand-accent text-canvas border-brand-accent shadow-[0_0_14px_rgba(230,81,0,0.5)] scale-[1.02]"
                            : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-text-muted"
                        }`}
                      >
                        <span className="text-base">
                          {type === "tshirt" ? "👕" : type === "hoodie" ? "🧥" : "👔"}
                        </span>
                        <span className="text-[10px] sm:text-xs tracking-wider">
                          {type === "tshirt" ? "T-SHIRT" : type === "hoodie" ? "HOODIE" : "JACKET / SHIRT"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colorway Picker — sablon focus: single solid (multi-part hidden, tailor bukan fokus UMKM) */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">WARNA GARMENT (SABLON FOCUS):</span>
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
                      {activeColorName} {pricing.colorSurcharge > 0 && "(+IDR 15k)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRODUCT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedColor(c.hex, c.name);
                          setCustomHex(c.hex);
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

                  {/* Custom Hex Color Picker */}
                  <div className="flex items-center space-x-3 p-2 rounded-xl bg-surface border border-border-subtle">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value, "Custom Tint");
                        setCustomHex(e.target.value);
                      }}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => {
                        setCustomHex(e.target.value);
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          setSelectedColor(e.target.value, "Custom Hex");
                        }
                      }}
                      placeholder="#121214"
                      className="flex-1 bg-transparent font-mono text-xs text-text-primary focus:outline-none uppercase"
                    />
                    <span className="text-[10px] font-mono text-text-muted uppercase">CUSTOM HEX</span>
                  </div>
                </div>

                {/* Sizing Matrix */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">STREET-CUT SIZING:</span>
                    {pricing.sizeSurcharge > 0 && (
                      <span className="text-brand-accent font-bold">+IDR {pricing.sizeSurcharge.toLocaleString("id-ID")}</span>
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

                  {/* Official Kaos Kami Brand & Mascot Sticker Presets */}
                  <div className="p-3 rounded-xl bg-surface/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] text-text-muted font-bold uppercase">
                      <span>STIKER & MASKOT RESMI</span>
                      <span className="text-brand-accent">1-KLIK TEMPEL 3D</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: "Maskot Cool", url: "/brand/mascot-cool.png" },
                        { name: "Maskot Sablon", url: "/brand/mascot-sablon.png" },
                        { name: "Logo Putih", url: "/brand/logo-white.png" },
                        { name: "Logo Emblem", url: "/brand/logo-emblem.png" },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const id = addDecal({
                              name: item.name,
                              url: item.url,
                              targetSide: "front",
                              x: 0,
                              y: -0.05,
                              scale: 0.45,
                              rotation: 0,
                              opacity: 1,
                            });
                            setSelectedDecalId(id);
                          }}
                          className="group flex flex-col items-center p-1.5 rounded-lg border border-white/10 bg-black/40 hover:border-brand-accent hover:bg-brand-accent/10 transition-all text-center"
                        >
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-black/60 flex items-center justify-center p-1 mb-1">
                            <img src={item.url} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                          </div>
                          <span className="text-[9px] font-mono text-text-muted group-hover:text-white truncate w-full">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
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
                    <span>{showFabricEditor ? "TUTUP FABRIC EDITOR" : "ADVANCED 2D FABRIC EDITOR (VIHAN)"}</span>
                  </button>
                  {showFabricEditor && (
                    <FabricEditor
                      onExport={(dataUrl) => {
                        const id = addDecal({
                          name: `Fabric ${decals.length + 1}`,
                          url: dataUrl,
                          targetSide: "front",
                          x: 0,
                          y: -0.05,
                          scale: 0.52,
                          rotation: 0,
                          opacity: 1,
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
                          placeholder="e.g. MAKASSAR NEVER DIES"
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
                    <span className="block text-xs font-mono text-text-muted font-bold">ACTIVE SABLON LAYERS:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {decals.map((d, index) => {
                        const sablonInfo = pricing.sablonDetails.find((s) => s.id === d.id);
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
                            <span className="text-[10px] opacity-75">({sablonInfo?.sizeType.split(" ")[0]})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Decal Transformation Sliders */}
                    {activeDecal && (
                      <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-mono text-xs font-bold text-text-primary">
                            TRANSFORM: {activeDecal.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                updateDecal(activeDecal.id, {
                                  targetSide: activeDecal.targetSide === "front" ? "back" : "front",
                                })
                              }
                              className="px-2 py-1 rounded text-[10px] font-mono bg-surface border border-border-subtle text-text-muted hover:text-brand-accent uppercase font-bold"
                            >
                              SIDE: {activeDecal.targetSide.toUpperCase()}
                            </button>
                            <button
                              onClick={() => removeDecal(activeDecal.id)}
                              className="p-1 rounded text-text-muted hover:text-red-400"
                              title="Delete Decal"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Live Physical 1:1 CM Scale & Real-Time DPI Quality Badges */}
                        {physicalDimensions && (
                          <div className="p-3 rounded-xl bg-surface/70 border border-border-subtle space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                                <Ruler size={13} className="text-brand-accent" />
                                <span>DIMENSI FISIK CETAK NYATA:</span>
                              </span>
                              <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                📏 {physicalDimensions.formattedText}
                              </span>
                            </div>

                            {qualityReport && (
                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="text-[11px] font-mono text-text-muted">KETELITIAN SABLON:</span>
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

                        {/* 1-Click Background Remover & Enhancer Suite */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isEnhancingImage}
                            onClick={handleRemoveWhiteBg}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary hover:text-white transition-all disabled:opacity-50"
                            title="Hapus background putih pada gambar JPG/PNG secara otomatis"
                          >
                            {isEnhancingImage ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} className="text-brand-accent" />}
                            <span>✨ HAPUS BG PUTIH</span>
                          </button>
                          <button
                            type="button"
                            disabled={isEnhancingImage}
                            onClick={handleSharpEnhance}
                            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary hover:text-white transition-all disabled:opacity-50"
                            title="Pertajam resolusi tepi sablon dengan AI unsharp-mask filter"
                          >
                            {isEnhancingImage ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-brand-accent" />}
                            <span>🔍 PERTAJAM DTF</span>
                          </button>
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
                            PRESET POSISI LOGO CEPAT (STANDAR DISTRO):
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
                            <span className="flex items-center space-x-1"><Move size={11} /> <span>HORIZONTAL MANUAL (X)</span></span>
                            <span>{activeDecal.x.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-0.35"
                            max="0.35"
                            step="0.01"
                            value={activeDecal.x}
                            onChange={(e) => updateDecal(activeDecal.id, { x: parseFloat(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>

                        {/* Position Y */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><Move size={11} /> <span>VERTICAL (Y)</span></span>
                            <span>{activeDecal.y.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-0.35"
                            max="0.35"
                            step="0.01"
                            value={activeDecal.y}
                            onChange={(e) => updateDecal(activeDecal.id, { y: parseFloat(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>

                        {/* Scale / Size (Directly affects DTF print cost) */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span>SABLON PRINT SIZE (DTF)</span>
                            <span className="text-brand-accent font-bold">
                              {activeDecal.scale < 0.35 ? "A6 Pocket (+15k)" : activeDecal.scale >= 0.65 ? "A3 Big (+45k)" : "A4 Chest (+28k)"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.15"
                            max="1.1"
                            step="0.02"
                            value={activeDecal.scale}
                            onChange={(e) => updateDecal(activeDecal.id, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>

                        {/* Rotation */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><RotateCw size={11} /> <span>ROTATION</span></span>
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
                            <span>OPACITY / BLEND</span>
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
                    <p>No graphics uploaded yet.</p>
                    <p className="text-[10px]">Click the button above to upload and position graphics freely anywhere!</p>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: SANDBOX ENVIRONMENT, 3D ROTATION & TRANSFORMS */}
            {activeTab === "sandbox" && (
              <>
                {/* 3D Model Manual Rotation (0° - 360°) */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-xs font-mono font-bold text-text-primary flex items-center space-x-1.5">
                      <AngleIcon size={13} className="text-brand-accent" />
                      <span>3D APPAREL ROTATION ANGLE (Y)</span>
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
                      3D MODEL POSITION & SCALE
                    </span>
                    <button
                      onClick={resetModelTransform}
                      className="text-[10px] font-mono text-brand-accent hover:underline uppercase font-bold"
                    >
                      RESET CENTER
                    </button>
                  </div>

                  {/* 1-Click Quick Alignments */}
                  <div>
                    <span className="block text-[10px] font-mono text-text-muted uppercase mb-1.5 font-bold">
                      QUICK ALIGNMENT:
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
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>MOVE UP / DOWN (Y)</span></span>
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
                      <span className="flex items-center space-x-1"><Move size={11} /> <span>MOVE LEFT / RIGHT (X)</span></span>
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
                      <span className="flex items-center space-x-1"><ZoomIn size={11} /> <span>MODEL ZOOM / SCALE</span></span>
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
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">STUDIO CANVAS THEME:</span>
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

                {/* Lighting Presets */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">STUDIO LIGHTING SETUP:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "editorial", label: "HIGH CONTRAST" },
                      { id: "cyber", label: "CYBER TANGERINE" },
                      { id: "soft-daylight", label: "SOFT DIFFUSE" },
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
                </div>

                {/* Material Finish */}
                <div>
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">FABRIC MATERIAL FINISH:</span>
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
                  <span className="block text-xs font-mono text-text-muted mb-2 font-bold uppercase">ANIMATION PRESET (VIRTUALTHREADS BENCHMARK):</span>
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

                {/* Technical Wireframe Mode */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-border-subtle">
                  <span className="text-xs font-mono text-text-primary font-bold">WIREFRAME MESH TOPOLOGY</span>
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
                    SAVE CURRENT CONFIGURATION:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={designTitleInput}
                      onChange={(e) => setDesignTitleInput(e.target.value)}
                      placeholder="e.g. My Streetwear Tee 01"
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
                </div>

                {/* Saved Designs List */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-text-muted block font-bold">
                    SAVED PRESETS ({savedDesigns.length}):
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
                      No saved designs yet. Customize your mockup and click Save above!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: EXPORT & SHARE */}
            {activeTab === "export" && (
              <div className="space-y-4 py-2">
                {/* 1. Download Views Suite */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    📸 DOWNLOAD HIGH-RES MOCKUP RENDERS:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportPNG("front-view")}
                      className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1"
                    >
                      <Camera size={16} className="text-brand-accent" />
                      <span>FRONT VIEW (PNG)</span>
                    </button>

                    <button
                      onClick={() => {
                        setCameraPreset("back");
                        setTimeout(() => handleExportPNG("back-view"), 300);
                      }}
                      className="py-3 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex flex-col items-center space-y-1"
                    >
                      <Camera size={16} className="text-brand-accent" />
                      <span>BACK VIEW (PNG)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleExportPNG("current-view")}
                    className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)]"
                  >
                    DOWNLOAD CURRENT VIEW (HIGH-RES PNG)
                  </button>

                  {/* 360° Turntable Video Exporter (VirtualThreads Benchmark) */}
                  <button
                    onClick={handleExport360Video}
                    disabled={isRecording360}
                    className="w-full py-3.5 px-4 rounded-xl bg-surface border border-brand-accent/50 hover:bg-brand-accent/10 text-brand-accent font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Video size={16} className={isRecording360 ? "animate-pulse text-red-500" : ""} />
                    <span>
                      {isRecording360
                        ? `MEREKAM VIDEO 360° (${recordingProgress}%)...`
                        : "EKSPOR VIDEO 360° TURNTABLE (MEDSOS)"}
                    </span>
                  </button>
                </div>

                {/* 2. Share & Order Inquiry Suite */}
                <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-3">
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    SHARE & PRODUCTION ORDER:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyShareLink}
                      className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-all flex items-center justify-center space-x-1.5"
                    >
                      {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      <span>{copiedLink ? "LINK COPIED!" : "COPY LINK"}</span>
                    </button>

                    <button
                      onClick={handleSendToWhatsApp}
                      className="py-2.5 px-2 rounded-xl bg-[#25D366]/20 border border-[#25D366]/50 hover:bg-[#25D366] text-text-primary hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <MessageCircle size={14} className="text-[#25D366] group-hover:text-white" />
                      <span>WHATSAPP ORDER</span>
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
                  <span>IDR {pricing.basePrice.toLocaleString("id-ID")}</span>
                </div>
                {pricing.colorSurcharge > 0 && (
                  <div className="flex justify-between text-brand-accent">
                    <span>Special Pigment Dye:</span>
                    <span>+IDR {pricing.colorSurcharge.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.sizeSurcharge > 0 && (
                  <div className="flex justify-between text-brand-accent">
                    <span>Extra Fabric ({selectedSize}):</span>
                    <span>+IDR {pricing.sizeSurcharge.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {pricing.sablonDetails.map((s) => (
                  <div key={s.id} className="flex justify-between text-text-muted">
                    <span className="truncate pr-2">{s.name}:</span>
                    <span>+IDR {s.cost.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="block text-[10px] font-mono text-text-muted uppercase">MAKASSAR LIVE ESTIMATE</span>
                  <button
                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                    className="text-text-muted hover:text-brand-accent transition-colors"
                    title="View Price Breakdown"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <span className="font-display font-black text-base sm:text-lg text-brand-accent">
                  {pricing.formattedTotal}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(230,81,0,0.4)] text-center flex items-center justify-center space-x-2"
                >
                  <ShoppingCart size={14} />
                  <span>PESAN (MIDTRANS)</span>
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

      {/* Mobile BottomSheet (vaul pattern) — active on <768px via deviceTier */}
      {deviceTier.isMobile && !isDrawerCollapsed && (
        <BottomSheet>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "apparel", label: "APPAREL" },
                { id: "decals", label: `SABLON (${decals.length})` },
                { id: "sandbox", label: "SANDBOX" },
                { id: "saved", label: `SAVED (${savedDesigns.length})` },
                { id: "export", label: "EXPORT" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                    activeTab === t.id
                      ? "bg-brand-accent text-canvas border-brand-accent"
                      : "bg-surface border-white/10 text-text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-surface/60 border border-white/10 flex justify-between items-center">
              <span className="text-[11px] text-text-muted">ESTIMASI</span>
              <span className="font-bold text-brand-accent">{pricing.formattedTotal}</span>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase"
            >
              PESAN (MIDTRANS) — {pricing.formattedTotal}
            </button>
            <p className="text-[10px] text-text-muted text-center">Geser handle di atas untuk peek / half / full — vaul pattern aktif di mobile</p>
          </div>
        </BottomSheet>
      )}

      {/* Auth Modal for SAVED gate */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {/* Checkout Modal Dialog */}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </>
  );
};
