"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  X,
  Camera,
  Share2,
  Film,
  Shirt,
  RotateCw,
  Layers,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useSession } from "@/lib/auth-client";
import { applyGuestWatermarkToDataUrl } from "@/lib/watermark";
import { APPAREL_CATALOG } from "@/lib/constants";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";

export const ExportStudioModal: React.FC = () => {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    activeApparel,
    activeColorName,
    decals,
    setCameraPreset,
    isRotating,
    toggleRotating,
    materialFinish,
    selectedSize,
    selectedColor,
  } = useConfiguratorStore(
    useShallow((s) => ({
      isExportModalOpen: s.isExportModalOpen,
      setIsExportModalOpen: s.setIsExportModalOpen,
      activeApparel: s.activeApparel,
      activeColorName: s.activeColorName,
      decals: s.decals,
      setCameraPreset: s.setCameraPreset,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      materialFinish: s.materialFinish,
      selectedSize: s.selectedSize,
      selectedColor: s.selectedColor,
    }))
  );

  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"photo" | "card" | "video">("photo");
  const [photoAngle, setPhotoAngle] = useState<"front" | "back" | "left" | "right" | "current">("front");
  const [resolution, setResolution] = useState<"hd" | "2k">("2k");
  const [bgMode, setBgMode] = useState<"studio" | "transparent">("studio");
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Video 360 recording states
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFormat, setVideoFormat] = useState<"webm" | "mp4">("mp4");
  const [videoDuration, setVideoDuration] = useState<5 | 8>(5);

  // Social card states
  const [includePriceOnCard, setIncludePriceOnCard] = useState(true);

  // Escape listener
  useEffect(() => {
    if (!isExportModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExportModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExportModalOpen, setIsExportModalOpen]);

  if (!isExportModalOpen) return null;

  // Gerakkan kamera preset dengan transisi halus jika user memilih sudut tertentu
  const alignCameraAngle = async (angle: "front" | "back" | "left" | "right" | "current") => {
    if (angle === "current") return;
    setCameraPreset(angle);
    // Beri waktu 500ms untuk lerp animasi kamera
    await new Promise((r) => setTimeout(r, 500));
  };

  // 1. Ekspor Foto Mockup PNG (2K / HD) dengan Guest Watermark
  const handleExportPhoto = async () => {
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setFeedbackMsg("Kanvas 3D tidak ditemukan.");
      return;
    }

    setIsExporting(true);
    setFeedbackMsg("Menghasilkan render resolusi tinggi…");

    try {
      await alignCameraAngle(photoAngle);

      let rawDataUrl = "";
      if (typeof (canvas as any).exportMockup === "function") {
        const sideParam = photoAngle === "front" || photoAngle === "back" ? photoAngle : undefined;
        rawDataUrl = await (canvas as any).exportMockup({
          resolution: resolution,
          transparent: bgMode === "transparent",
          side: sideParam,
        });
      } else {
        rawDataUrl = canvas.toDataURL("image/png");
      }

      let finalDataUrl = rawDataUrl;

      // Mode Tamu (belum login): sematkan watermark resmi Kaos Kami
      if (!session) {
        setFeedbackMsg("Menyematkan watermark preview (Mode Tamu)…");
        finalDataUrl = await applyGuestWatermarkToDataUrl(rawDataUrl);
      }

      const link = document.createElement("a");
      const suffix = bgMode === "transparent" ? "-transparent" : "";
      const watermarkTag = !session ? "-guest-preview" : "-clean";
      link.download = `kaos-kami-${activeApparel}-${photoAngle}-${resolution}${suffix}${watermarkTag}.png`;
      link.href = finalDataUrl;
      link.click();

      setFeedbackMsg(
        !session
          ? "Mockup berhasil diunduh (Mode Tamu dengan Watermark Preview)."
          : "Mockup Ultra HD berhasil diunduh!"
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error("Gagal ekspor mockup:", err);
      setFeedbackMsg("Gagal mengekspor gambar mockup.");
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Ekspor Kartu Medsos 4:5 (1080x1350)
  const handleExportCard = async () => {
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setFeedbackMsg("Kanvas 3D tidak ditemukan.");
      return;
    }

    setIsExporting(true);
    setFeedbackMsg("Menyusun kartu media sosial 4:5…");

    try {
      let rawDataUrl = "";
      if (typeof (canvas as any).exportMockup === "function") {
        rawDataUrl = await (canvas as any).exportMockup({
          resolution: "2k",
          transparent: true,
        });
      } else {
        rawDataUrl = canvas.toDataURL("image/png");
      }

      // Render kartu 1080x1350
      const W = 1080;
      const H = 1350;
      const cnv = document.createElement("canvas");
      cnv.width = W;
      cnv.height = H;
      const ctx = cnv.getContext("2d");
      if (!ctx) throw new Error("Gagal membuat konteks kanvas 2D.");

      // Background Gradien Obsidian Streetwear
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#18181b");
      bg.addColorStop(0.5, "#0f0f11");
      bg.addColorStop(1, "#09090b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Garis Aksen Tangerine di Atas
      ctx.fillStyle = "#F97316";
      ctx.fillRect(0, 0, W, 8);

      // Gambar Mockup
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.textAlign = "center";
          ctx.fillStyle = "#F97316";
          ctx.font = "800 36px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText("KAOS KAMI • MAKASSAR", W / 2, 100);

          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "500 24px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText("Studio 3D & Sablon DTF High-Craft", W / 2, 140);

          const boxX = 90;
          const boxY = 190;
          const boxW = W - 180;
          const boxH = 800;
          const skala = Math.min(boxW / img.width, boxH / img.height);
          const dw = img.width * skala;
          const dh = img.height * skala;
          ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);

          // Info Apparel & Warna
          const apparelName = APPAREL_CATALOG[activeApparel]?.name ?? "Custom Streetwear";
          ctx.fillStyle = "#ffffff";
          ctx.font = "800 42px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText(apparelName, W / 2, 1060);

          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "600 28px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText(`${activeColorName} · Size ${selectedSize || "L"}`, W / 2, 1105);

          // Harga Kalkulasi (jika diaktifkan)
          if (includePriceOnCard) {
            const finishPricing = materialFinishToPricing(materialFinish);
            const pricing = calculate6VariablePrice({
              apparelSlug: activeApparel,
              fabricThicknessSlug: finishPricing.fabricThicknessSlug,
              size: selectedSize || "L",
              colorHex: selectedColor || "#18181b",
              decals: decals,
              quantity: 1,
            });
            const hargaFormatted = `IDR ${pricing.unitPriceIdr.toLocaleString("id-ID")}`;

            ctx.fillStyle = "#F97316";
            ctx.font = "800 50px 'Plus Jakarta Sans', system-ui, sans-serif";
            ctx.fillText(hargaFormatted, W / 2, 1180);
          } else {
            ctx.fillStyle = "#60A5FA";
            ctx.font = "700 32px 'Plus Jakarta Sans', system-ui, sans-serif";
            ctx.fillText("PREMIUM DTF CUSTOM PRINTING", W / 2, 1180);
          }

          // Watermark / Brand Footer
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.font = "500 22px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText("Didesain di kaoskami.biz.id · Workshop Makassar", W / 2, 1270);

          resolve();
        };
        img.onerror = reject;
        img.src = rawDataUrl;
      });

      // Watermark tamu jika belum login
      if (!session) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 22px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.translate(W / 2, H / 2);
        ctx.rotate((-24 * Math.PI) / 180);
        ctx.translate(-W / 2, -H / 2);
        for (let x = -W * 0.6; x < W * 1.6; x += 410) {
          for (let y = -H * 0.6; y < H * 1.6; y += 300) {
            ctx.fillText("KAOS KAMI MAKASSAR · kaoskami.biz.id", x, y);
          }
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "800 34px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.fillText("KAOS KAMI MAKASSAR", W / 2, H / 2 - 22);
        ctx.font = "700 17px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.fillText("PREVIEW MOCKUP · WWW.KAOSKAMI.BIZ.ID", W / 2, H / 2 + 16);
        ctx.restore();
      }

      const cardDataUrl = cnv.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `kaos-kami-card-4x5-${activeApparel}.png`;
      link.href = cardDataUrl;
      link.click();

      setFeedbackMsg(
        !session
          ? "Kartu Medsos 4:5 berhasil diunduh (Mode Tamu)."
          : "Kartu Medsos 4:5 berhasil diunduh!"
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error("Gagal buat kartu medsos:", err);
      setFeedbackMsg("Gagal membuat kartu medsos.");
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Ekspor Video 360° Turntable Loop
  const handleExport360Video = async () => {
    const canvas = document.querySelector(".webgl-canvas-container canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setFeedbackMsg("Kanvas 3D tidak ditemukan.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setFeedbackMsg("Browser Anda tidak mendukung perekaman kanvas video.");
      return;
    }

    setIsExporting(true);
    setVideoProgress(0);
    const totalMs = videoDuration * 1000;
    setFeedbackMsg(`Merekam perputaran 360° (${videoDuration} detik)…`);

    const wasRotating = isRotating;
    let stream: MediaStream | null = null;

    const cleanup = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (!wasRotating && isRotating) {
        toggleRotating();
      }
      setIsExporting(false);
      setVideoProgress(0);
    };

    try {
      if (!isRotating) toggleRotating();
      await new Promise((r) => setTimeout(r, 300));

      const capture = (canvas as any).captureStream;
      stream = typeof capture === "function" ? capture.call(canvas, 30) : null;
      if (!stream) {
        setFeedbackMsg("Gagal merekam stream kanvas 3D.");
        cleanup();
        return;
      }

      const mimeType = videoFormat === "mp4" && MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `kaos-kami-360-${activeApparel}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setFeedbackMsg("Video 360° berhasil diunduh!");
        setTimeout(() => setFeedbackMsg(null), 4000);
        cleanup();
      };

      recorder.start();

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
        setVideoProgress(pct);
        if (elapsed >= totalMs) {
          clearInterval(interval);
          if (recorder.state === "recording") recorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error("Gagal rekam 360 video:", err);
      setFeedbackMsg("Gagal merekam video 360°.");
      cleanup();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => setIsExportModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[92dvh] flex flex-col rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden text-neutral-100"
      >
        {/* Header - High Contrast & Clean */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm">
              <Download size={20} />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Ekspor &amp; Publikasi Mockup</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simpan render resolusi tinggi, kartu media sosial, atau video 360°.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-700 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tutup Modal Ekspor"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher - Segmented Pills */}
        <div className="flex border-b border-neutral-800 px-6 py-2.5 bg-neutral-950/60 gap-1.5 shrink-0">
          {[
            { id: "photo", label: "Foto Mockup (PNG)", icon: Camera },
            { id: "card", label: "Kartu Medsos 4:5", icon: Share2 },
            { id: "video", label: "Video 360° Loop", icon: Film },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 text-neutral-100">
          {/* TAB 1: FOTO MOCKUP PNG */}
          {activeTab === "photo" && (
            <div className="space-y-4">
              {/* Pilihan Sudut Pandang Kamera (5 Presets) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Sudut Pandang Kamera
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: "front", label: "Depan", icon: Shirt },
                    { id: "back", label: "Belakang", icon: RotateCw },
                    { id: "left", label: "Lengan Kiri", icon: Layers },
                    { id: "right", label: "Lengan Kanan", icon: Layers },
                    { id: "current", label: "Sudut Aktif", icon: Camera },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPhotoAngle(id as any)}
                      className={`py-3 px-1.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        photoAngle === id
                          ? "bg-blue-600/15 border-blue-500 text-blue-400 font-bold ring-1 ring-blue-500/30 shadow-sm"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] sm:text-[11px] font-medium leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Resolusi & Latar Belakang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Resolusi Render
                  </label>
                  <div className="flex rounded-xl border border-neutral-800 p-1 bg-neutral-950/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setResolution("hd")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        resolution === "hd" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Full HD (1080p)
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolution("2k")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        resolution === "2k" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Ultra HD (2K)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Latar Belakang
                  </label>
                  <div className="flex rounded-xl border border-neutral-800 p-1 bg-neutral-950/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setBgMode("studio")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        bgMode === "studio" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode("transparent")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        bgMode === "transparent" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Transparan
                    </button>
                  </div>
                </div>
              </div>

              {/* Ringkasan Konfigurasi Render */}
              <div className="p-3 rounded-2xl bg-neutral-950/40 border border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{APPAREL_CATALOG[activeApparel]?.name ?? "Pakaian 3D"} · {activeColorName}</span>
                </div>
                <span className="font-mono text-[11px] text-neutral-400">
                  {resolution === "2k" ? "2048 × 2048 px" : "1536 × 1536 px"} · PNG Lossless
                </span>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportPhoto}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>{isExporting ? "Memproses Render 3D…" : `Unduh Mockup PNG (${resolution.toUpperCase()})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KARTU MEDSOS 4:5 */}
          {activeTab === "card" && (
            <div className="space-y-4">
              {/* Preview Box */}
              <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {APPAREL_CATALOG[activeApparel]?.name ?? "Custom Streetwear"}
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      Warna {activeColorName} · Ukuran {selectedSize || "L"} · Sablon DTF High-Craft
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    1080 × 1350 (4:5)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                  <span className="text-neutral-400">Format Visual:</span>
                  <span className="font-medium text-neutral-300">
                    Instagram Feed &amp; WhatsApp Story Ready
                  </span>
                </div>
              </div>

              {/* Toggle Opsi Harga */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/80">
                <span className="text-xs text-neutral-300 font-medium">
                  Sertakan Rincian Harga Produk (IDR)
                </span>
                <button
                  type="button"
                  onClick={() => setIncludePriceOnCard(!includePriceOnCard)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    includePriceOnCard ? "bg-blue-600" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      includePriceOnCard ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportCard}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  <span>{isExporting ? "Menyusun Kartu Medsos…" : "Unduh Kartu Medsos 4:5 (PNG)"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO 360° TURNTABLE */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Merekam perputaran 360° mulus dari kanvas 3D langsung dari browser. Format ini ideal untuk showcase produk di katalog toko atau konten media sosial.
              </p>

              {/* Durasi & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Durasi Putaran
                  </label>
                  <div className="flex rounded-xl border border-neutral-800 p-1 bg-neutral-950/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setVideoDuration(5)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        videoDuration === 5 ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      5 Detik (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoDuration(8)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        videoDuration === 8 ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      8 Detik (Sinematik)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Format Kontainer
                  </label>
                  <div className="flex rounded-xl border border-neutral-800 p-1 bg-neutral-950/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setVideoFormat("mp4")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        videoFormat === "mp4" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      MP4 (Universal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFormat("webm")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        videoFormat === "webm" ? "bg-blue-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      WebM (Kanvas HD)
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar when recording */}
              {isExporting && videoProgress > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Proses Perekaman 360°:</span>
                    <span className="font-bold text-blue-400">{videoProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-100 ease-out"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExport360Video}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  <span>{isExporting ? `Merekam (${videoProgress}%)…` : `Mulai Rekam Video 360° (${videoDuration} Detik)`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Toast Banner */}
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-blue-500/40 text-xs font-medium text-center text-blue-300 animate-fade-in shadow-md">
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Footer - Watermark Status & Close */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 flex justify-between items-center text-xs shrink-0">
          <div className="flex items-center gap-2 text-neutral-400">
            {session ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-neutral-300 font-medium">
                  Akun Terverifikasi · Hasil ekspor bersih tanpa watermark
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-neutral-400 text-[11px]">
                  Mode Tamu · Watermark preview otomatis disertakan
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs cursor-pointer transition-all border border-neutral-700/60"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
