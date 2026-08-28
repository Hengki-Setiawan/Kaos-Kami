"use client";

import React, { useRef, useState, useMemo } from "react";
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

type StudioTab = "apparel" | "decals" | "sandbox" | "saved" | "export";

export const CustomizerDrawer: React.FC = () => {
  const {
    activeApparel,
    setActiveApparel,
    selectedColor,
    activeColorName,
    setSelectedColor,
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
  } = useConfiguratorStore();

  const [activeTab, setActiveTab] = useState<StudioTab>("apparel");
  const [customHex, setCustomHex] = useState(selectedColor);
  const [designTitleInput, setDesignTitleInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVisible = viewMode === "studio";
  const currentApparelInfo = APPAREL_CATALOG[activeApparel];
  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];

  // Dynamic Makassar Mathematical Pricing Calculator
  const pricing = useMemo(() => {
    return calculateCustomMockupPrice(activeApparel, selectedColor, selectedSize, decals);
  }, [activeApparel, selectedColor, selectedSize, decals]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = addDecal({
      name: `Sablon ${decals.length + 1} (${file.name.slice(0, 8)})`,
      url,
      targetSide: "front",
      x: 0,
      y: -0.05, // Clean chest placement, below neck/hood
      scale: 0.48,
      rotation: 0,
      opacity: 1,
    });
    setSelectedDecalId(id);
    setActiveTab("decals");
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

      {/* Full Customizer Drawer */}
      <section
        className={`fixed bottom-0 z-40 p-3 sm:p-6 md:p-8 max-w-xl w-full pointer-events-none transition-all duration-500 ease-out ${
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
                        <span className="text-sm">
                          {type === "tshirt" ? "👕" : type === "hoodie" ? "🧥" : "🧥"}
                        </span>
                        <span className="text-[10px] sm:text-xs tracking-wider">
                          {type === "tshirt" ? "T-SHIRT" : type === "hoodie" ? "HOODIE" : "JACKET"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colorway Picker */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-text-muted font-bold uppercase">COLORWAY PALETTE:</span>
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
                        }}
                        style={{ backgroundColor: c.hex }}
                        aria-label={c.name}
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative ${
                          selectedColor.toLowerCase() === c.hex.toLowerCase()
                            ? "border-brand-accent scale-110 shadow-[0_0_10px_rgba(230,81,0,0.6)]"
                            : "border-border-subtle hover:border-text-muted"
                        }`}
                      >
                        {selectedColor.toLowerCase() === c.hex.toLowerCase() && (
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
                {/* Add New Decal Button */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl border border-dashed border-border-subtle hover:border-brand-accent bg-surface/50 text-xs font-mono text-text-primary transition-all hover:bg-surface font-bold shadow-sm"
                  >
                    <Upload size={14} className="text-brand-accent" />
                    <span>+ UPLOAD ANY GRAPHIC / SABLON (PNG/JPG)</span>
                  </button>
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

                        {/* Position X */}
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                            <span className="flex items-center space-x-1"><Move size={11} /> <span>HORIZONTAL (X)</span></span>
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

            {/* TAB 4: SAVED DESIGNS (Preset Manager) */}
            {activeTab === "saved" && (
              <div className="space-y-4">
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

            <div className="flex items-center justify-between gap-4">
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
                <span className="font-display font-black text-base text-brand-accent">
                  {pricing.formattedTotal}
                </span>
              </div>
              <button
                onClick={handleSendToWhatsApp}
                className="flex-1 py-3 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md text-center flex items-center justify-center space-x-2"
              >
                <MessageCircle size={14} />
                <span>ORDER VIA WHATSAPP</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
