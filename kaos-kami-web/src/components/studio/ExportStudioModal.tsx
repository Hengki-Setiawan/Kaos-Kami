"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  X,
  Camera,
  Share2,
  Film,
  Sparkles,
  CheckCircle2,
  Lock,
  Shirt,
  RotateCw,
  Layers,
  Image as ImageIcon,
  Loader2,
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
    cameraPreset,
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
      cameraPreset: s.cameraPreset,
      isRotating: s.isRotating,
      toggleRotating: s.toggleRotating,
      materialFinish: s.materialFinish,
      selectedSize: s.selectedSize,
      selectedColor: s.selectedColor,
    }))
  );

  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"photo" | "card" | "video">("photo");
  const [photoAngle, setPhotoAngle] = useState<"front" | "back" | "current">("front");
  const [resolution, setResolution] = useState<"hd" | "2k">("2k");
  const [bgMode, setBgMode] = useState<"studio" | "transparent">("studio");
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Video 360 recording states
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFormat, setVideoFormat] = useState<"webm" | "mp4">("webm");

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

  // Tunggu pergerakan kamera preset jika user memilih tampak depan/belakang
  const alignCameraAngle = async (angle: "front" | "back" | "current") => {
    if (angle === "current") return;
    setCameraPreset(angle);
    // Beri waktu 400ms untuk lerp animasi kamera
    await new Promise((r) => setTimeout(r, 450));
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
        rawDataUrl = await (canvas as any).exportMockup({
          resolution: resolution,
          transparent: bgMode === "transparent",
        });
      } else {
        rawDataUrl = canvas.toDataURL("image/png");
      }

      let finalDataUrl = rawDataUrl;

      // APPLIED RULE: Jika Guest (belum login), sematkan watermark ultra-low opacity resmi Kaos Kami
      if (!session) {
        setFeedbackMsg("Menyematkan watermark resmi Kaos Kami (Mode Tamu)…");
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
          ? "Mockup berhasil diunduh (Mode Tamu dengan Watermark Halus)."
          : "Mockup Ultra HD 2K Bersih berhasil diunduh!"
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

      // Background Gradien Obsidian Dark Streetwear
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

          // Harga Kalkulasi
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
          ctx.font = "800 52px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText(hargaFormatted, W / 2, 1180);

          // Watermark / Brand Footer
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.font = "500 22px 'Plus Jakarta Sans', system-ui, sans-serif";
          ctx.fillText("Didesain di kaoskami.biz.id · Workshop Makassar", W / 2, 1270);

          resolve();
        };
        img.onerror = reject;
        img.src = rawDataUrl;
      });

      // Watermark tamu (pola watermark.ts): diagonal berulang + tengah,
      // ultra-low opacity agar desain tetap jelas. Member login = bersih.
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
          ? "✅ Kartu Medsos 4:5 berhasil diunduh (Mode Tamu dengan Watermark Halus)."
          : "✅ Kartu Medsos 4:5 berhasil diunduh."
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

  // 3. Ekspor Video 360° Turntable Loop (5 Detik)
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
    setFeedbackMsg("Merekam video berputar 360° (5 detik)…");

    const wasRotating = isRotating;
    let stream: MediaStream | null = null;
    const totalMs = 5000;

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
        setFeedbackMsg("✅ Video 360° berhasil diunduh.");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => setIsExportModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90dvh] flex flex-col rounded-3xl bg-surface/95 border border-border-subtle shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.25)]">
              <Download size={20} />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-sm sm:text-base font-bold text-text-primary font-mono tracking-tight flex items-center gap-2">
                <span>EKSPOR MOCKUP & KARTU MEDSOS</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-brand-accent text-canvas">
                  2K RETINA
                </span>
              </h3>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                Simpan gambar resolusi tinggi, kartu Instagram/TikTok, atau video berputar 360°.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="w-8 h-8 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface/80 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tutup Modal Ekspor"
          >
            <X size={16} />
          </button>
        </div>

        {/* Member Status / Guest Watermark Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-surface via-surface/80 to-surface border-b border-border-subtle/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono">
            {session ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-text-primary font-bold">
                  ⭐ Member Terdaftar: Unduh 100% Bersih Ultra HD 2K Tanpa Watermark
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <span className="text-text-muted text-[11px]">
                  🏷️ Mode Tamu: Unduh Mockup Gratis (Watermark Halus). Masuk untuk versi bersih 2K!
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-subtle px-4 py-2 bg-surface/40 gap-1">
          {[
            { id: "photo", label: "FOTO MOCKUP (PNG)", icon: Camera },
            { id: "card", label: "KARTU MEDSOS 4:5", icon: Share2 },
            { id: "video", label: "VIDEO 360° LOOP", icon: Film },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/60"
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-text-primary">
          {/* TAB 1: FOTO MOCKUP PNG */}
          {activeTab === "photo" && (
            <div className="space-y-4">
              {/* Pilihan Sudut Pandang */}
              <div className="space-y-1.5">
                <span className="block text-xs font-sans text-text-muted font-bold uppercase">SUDUT PANDANG KAMERA:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "front", label: "TAMPAK DEPAN", icon: Shirt },
                    { id: "back", label: "TAMPAK BELAKANG", icon: RotateCw },
                    { id: "current", label: "SUDUT SAAT INI", icon: Camera },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPhotoAngle(id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        photoAngle === id
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent font-bold shadow-sm"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface/80"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] font-sans font-bold uppercase">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Resolusi & Latar Belakang */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <span className="block text-xs font-sans text-text-muted font-bold uppercase">RESOLUSI GAMBAR:</span>
                  <div className="flex rounded-xl border border-border-subtle p-1 bg-surface/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setResolution("hd")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        resolution === "hd" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      FULL HD (1080p)
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolution("2k")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        resolution === "2k" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      ULTRA HD (2K)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-sans text-text-muted font-bold uppercase">LATAR BELAKANG:</span>
                  <div className="flex rounded-xl border border-border-subtle p-1 bg-surface/60 gap-1">
                    <button
                      type="button"
                      onClick={() => setBgMode("studio")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        bgMode === "studio" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      STUDIO
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode("transparent")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        bgMode === "transparent" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      TRANSPARAN
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportPhoto}
                  className="w-full py-3.5 px-5 rounded-2xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>{isExporting ? "MEMPROSES GAMBAR…" : `UNDUH MOCKUP ${resolution.toUpperCase()} PNG`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KARTU MEDSOS 4:5 */}
          {activeTab === "card" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                <p className="text-xs text-text-muted leading-relaxed">
                  Menghasilkan kartu visual vertikal rasio 4:5 (1080×1350 piksel) berlatar streetwear modern, lengkap dengan detail nama pakaian, warna resmi, rincian bahan, dan badge Kaos Kami Makassar — siap unggah ke Instagram Feed / Story dan status WhatsApp!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-text-primary block">
                    {APPAREL_CATALOG[activeApparel]?.name ?? "Apparel Streetwear"}
                  </span>
                  <span className="text-[11px] text-text-muted block mt-0.5">
                    Warna {activeColorName} · Ukuran {selectedSize || "L"} · Format 1080×1350
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-lg border border-brand-accent/30">
                  RASIO 4:5
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportCard}
                  className="w-full py-3.5 px-5 rounded-2xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  <span>{isExporting ? "MENYUSUN KARTU…" : "UNDUH KARTU MEDSOS 4:5 (PNG)"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO 360° TURNTABLE */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                <p className="text-xs text-text-muted leading-relaxed">
                  Rekam perputaran 360 derajat pakaian secara mulus selama 5 detik. Video ini sangat menarik untuk dijadikan showcase produk di katalog toko atau konten media sosial.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-sans text-text-muted font-bold uppercase">FORMAT VIDEO:</span>
                <div className="flex rounded-xl border border-border-subtle p-1 bg-surface/60 gap-1">
                  <button
                    type="button"
                    onClick={() => setVideoFormat("webm")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      videoFormat === "webm" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    WEBM (HD KANVAS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoFormat("mp4")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      videoFormat === "mp4" ? "bg-brand-accent text-canvas" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    MP4 (UNIVERSAL)
                  </button>
                </div>
              </div>

              {/* Progress Bar when recording */}
              {isExporting && videoProgress > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-muted">Proses Merekam 360°:</span>
                    <span className="font-bold text-brand-accent">{videoProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface border border-border-subtle overflow-hidden">
                    <div
                      className="h-full bg-brand-accent transition-all duration-100 ease-out"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExport360Video}
                  className="w-full py-3.5 px-5 rounded-2xl bg-brand-accent hover:brightness-110 text-canvas font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  <span>{isExporting ? `MEREKAM (${videoProgress}%)…` : "REKAM VIDEO 360° (5 DETIK)"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Toast Banner */}
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-surface border border-brand-accent/40 text-xs font-mono text-center text-text-primary animate-fade-in shadow-md">
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface/80 flex justify-between items-center text-[11px] font-mono text-text-muted">
          <span>Tekan ESC untuk menutup</span>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-surface border border-border-subtle hover:bg-surface/80 text-text-primary font-bold cursor-pointer transition-all"
          >
            TUTUP
          </button>
        </div>
      </div>
    </div>
  );
};
