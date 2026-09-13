"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Camera, FlipHorizontal, X, Share2, Sparkles, Bot } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { haptic } from '@/lib/bridge/haptics';
import { shareCustomDesign } from '@/lib/bridge/share';
import { enableScreenKeepAwake, disableScreenKeepAwake } from '@/lib/bridge/keepAwake';
import { computeAverageLuminance } from '@/lib/3d/lightingEstimation';
import { MediaPipePoseTracker, PoseTransform3D } from '@/lib/3d/mediaPipePoseTracker';
import { MobileApparelMeshRenderer } from './MobileApparelMeshRenderer';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { registerARSnapshot, renderARNow } from '@/lib/3d/exportStudio';
import { useShallow } from 'zustand/shallow';

export function ARPreviewStage({ onClose, onNotify }: { onClose: () => void; onNotify?: (msg: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [lightMultiplier, setLightMultiplier] = useState(1.2);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  // PERF low-end: AI MATI default (hemat GPU/CPU) — user bisa nyalakan manual.
  // aiTouched = user sudah toggle eksplisit → efek tier tak menimpa pilihan.
  const [useAITracking, setUseAITracking] = useState(true);
  const aiTouched = useRef(false);

  const [poseTransform, setPoseTransform] = useState<PoseTransform3D>({
    detected: false,
    position: [0, -0.1, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
  });

  const { apparelType, printWidthCm } = useMobileStudioStore(
    useShallow((s) => ({ apparelType: s.apparelType, printWidthCm: s.printWidthCm }))
  );
  const { tier, isResolved } = useMobileDeviceTier();
  const poseTracker = useMemo(() => new MediaPipePoseTracker(), []);

  // PERF tier-low: AI mati default + inferensi 133ms (~7.5 FPS, cukup untuk
  // anchor bahu); mid/high 66ms (~15 FPS). Hanya sebelum user toggle manual.
  useEffect(() => {
    if (!isResolved) return;
    const low = tier === 'low' || tier === 'no-webgl';
    try {
      poseTracker.setInferenceIntervalMs(low ? 133 : 66);
    } catch {}
    if (low && !aiTouched.current) setUseAITracking(false);
  }, [isResolved, tier, poseTracker]);

  // PERF KeepAwake: layar dijaga menyala HANYA saat AR aktif (studio & katalog
  // SENGAJA boleh sleep — hemat baterai). Dilepas saat AR ditutup/unmount.
  useEffect(() => {
    void enableScreenKeepAwake();
    return () => {
      void disableScreenKeepAwake();
    };
  }, []);

  // VRAM: bebaskan landmarker MediaPipe (WASM/GPU) saat AR ditutup/unmount.
  // Tanpa close() tiap buka-tutup AR menambah sesi GPU → OOM di HP low-end.
  useEffect(() => {
    const tracker = poseTracker;
    return () => {
      try {
        tracker.dispose();
      } catch {}
      try {
        registerARSnapshot(null);
      } catch {}
    };
  }, [poseTracker]);

  const handleClose = () => {
    haptic.tap();
    try {
      poseTracker.dispose();
    } catch {}
    try {
      registerARSnapshot(null);
    } catch {}
    void disableScreenKeepAwake();
    onClose();
  };

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let cancelled = false;

    async function initCamera() {
      try {
        // Minta izin eksplisit dulu (audit: getUserMedia mentah = video hitam
        // tanpa pesan di WebView saat izin ditolak).
        try {
          const { Camera } = await import('@capacitor/camera');
          const perm = await Camera.checkPermissions();
          if (perm.camera !== 'granted') {
            const req = await Camera.requestPermissions();
            if (req.camera !== 'granted' && req.camera !== 'limited') {
              onNotify?.('Izin kamera ditolak. Aktifkan di Pengaturan HP untuk AR.');
              return;
            }
          }
        } catch {}
        // PERF low-end: 640×480 (hemat encoder/GPU/CPU ~6x piksel vs 720p).
        // Tunggu isResolved agar HP low tak sempat membuka 720p dulu.
        if (!isResolved) return;
        const low = tier === 'low' || tier === 'no-webgl';
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: low ? 640 : 1280 },
            height: { ideal: low ? 480 : 720 },
          },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        currentStream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        onNotify?.('Kamera gagal dibuka. Periksa izin kamera lalu coba lagi.');
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, tier, isResolved]);

  // Lighting & MediaPipe AI Pose Tracking Loop
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    let lastTime = performance.now();
    // THROTTLE low-end: lighting tiap 90 frame (vs 30) + setState pose hanya
    // saat inferensi benar-benar jalan / tiap 10 frame (vs tiap frame 60fps).
    // setPoseTransform tiap frame = re-render React 60x/detik — boros di low.
    const low = tier === 'low' || tier === 'no-webgl';
    const lightCadence = low ? 90 : 30;

    const loop = (now: number) => {
      frameCount++;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (videoRef.current) {
        // 1. Lighting estimation (throttled per-tier)
        if (frameCount % lightCadence === 0) {
          const lum = computeAverageLuminance(videoRef.current);
          setLightMultiplier(lum);
        }

        // 2. MediaPipe Pose tracking inference (if enabled)
        if (useAITracking) {
          const ran = poseTracker.processVideoFrame(videoRef.current, now);
          if (ran || frameCount % 10 === 0) {
            const smoothed = poseTracker.updateSmooth(dt);
            setPoseTransform({ ...smoothed });
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [useAITracking, poseTracker, tier]);

  const handleFlipCamera = () => {
    haptic.selection();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleTakeSnapshot = async () => {
    haptic.tapHeavy();
    setSnapshotTaken(true);
    try {
      const video = videoRef.current;
      const glCanvas = document.querySelector('#kk-ar-stage canvas');
      if (!video || video.readyState < 2 || !glCanvas) throw new Error('Kamera/3D belum siap');

      // On-demand (preserveDrawingBuffer:false): render sinkron di task yang sama
      // agar drawImage tak blank/hitam (pasangan registerARSnapshot di Canvas bawah).
      renderARNow();

      // Komposit 1080x1920: video cover-fit + overlay 3D (C4: tanpa watermark).
      const W = 1080;
      const H = 1920;
      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak didukung');

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cover = Math.max(W / vw, H / vh);
      const dw = vw * cover;
      const dh = vh * cover;
      ctx.save();
      if (facingMode === 'user') {
        ctx.translate(W, 0);
        ctx.scale(-1, 1); // un-mirror agar logo terbaca normal
      }
      ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();

      const gw = (glCanvas as HTMLCanvasElement).width;
      const gh = (glCanvas as HTMLCanvasElement).height;
      const fit = Math.min(W / gw, H / gh);
      ctx.drawImage(glCanvas as HTMLCanvasElement, (W - gw * fit) / 2, (H - gh * fit) / 2, gw * fit, gh * fit);

      const base64 = out.toDataURL('image/jpeg', 0.92).split(',')[1] ?? '';
      const fileName = `kaoskami-ar-${Date.now()}.jpg`;
      const native = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
      if (native) {
        const saved = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        await Share.share({ title: 'AR Try-On Kaos Kami', url: saved.uri, dialogTitle: 'Bagikan ke WhatsApp Status' });
      } else {
        const a = document.createElement('a');
        a.href = `data:image/jpeg;base64,${base64}`;
        a.download = fileName;
        a.click();
      }
      haptic.success();
      onNotify?.('Foto AR 1080x1920 tersimpan & siap dibagikan!');
    } catch (e: any) {
      onNotify?.(e?.message || 'Snapshot gagal. Coba lagi.');
      shareCustomDesign('ar-snapshot', `Hasil AR Virtual Try-On Kaos Kami (${apparelType.toUpperCase()})`);
    } finally {
      setTimeout(() => setSnapshotTaken(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden">
      {/* Video Background Passthrough */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Snapshot Flash Overlay */}
      {snapshotTaken && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300" />}

      {/* Silhouette Guide (Visible when AI tracking is off or searching) */}
      {(!useAITracking || !poseTransform.detected) && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
          <div className="w-72 h-80 border-2 border-dashed border-white/40 rounded-t-[100px] rounded-b-[40px] flex items-center justify-center relative animate-pulse">
            <span className="absolute top-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
              {useAITracking ? 'Mendeteksi Posisi Bahu (MediaPipe)...' : 'Sejajarkan Bahu Anda di Garis Ini'}
            </span>
          </div>
        </div>
      )}

      {/* 3D Model Transparent Overlay with MediaPipe Transform */}
      <div id="kk-ar-stage" className="absolute inset-0 z-20 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 2.3], fov: 45 }}
          // On-demand: false hemat VRAM; snapshot via renderARNow() tepat sebelum
          // drawImage (pasangan registerARSnapshot — kalau tidak, hasil blank).
          gl={{ alpha: true, preserveDrawingBuffer: false }}
          onCreated={({ gl, scene, camera }) => {
            try {
              registerARSnapshot({ gl: gl as any, scene: scene as any, camera: camera as any });
            } catch {}
          }}
        >
          <ambientLight intensity={0.55 * lightMultiplier} />
          <directionalLight position={[1, 3, 2]} intensity={1.2 * lightMultiplier} />
          <directionalLight position={[-1, 1, 1]} intensity={0.6 * lightMultiplier} />
          <MobileApparelMeshRenderer
            externalTransform={
              useAITracking && poseTransform.detected
                ? {
                    position: poseTransform.position,
                    rotation: poseTransform.rotation,
                    scale: poseTransform.scale,
                  }
                : undefined
            }
          />
        </Canvas>
      </div>

      {/* Top Header Navigation */}
      <div className="relative z-30 flex items-center justify-between p-4 pt-[env(safe-area-inset-top,16px)]">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MediaPipe AI Toggle Pill */}
        <button
          onClick={() => {
            haptic.selection();
            aiTouched.current = true;
            setUseAITracking((prev) => !prev);
          }}
          className={`px-3.5 py-1.5 rounded-full backdrop-blur-xl border text-xs font-bold font-['Syne'] flex items-center gap-1.5 transition-all ${
            useAITracking
              ? 'bg-[#FF6B35]/30 border-[#FF6B35] text-white shadow-lg shadow-orange-500/30'
              : 'bg-black/60 border-white/20 text-zinc-400'
          }`}
        >
          <Bot className={`w-3.5 h-3.5 ${useAITracking ? 'text-[#FF6B35]' : 'text-zinc-500'}`} />
          <span>{useAITracking ? 'MediaPipe AI Pose: AKTIF' : 'Siluet Manual'}</span>
        </button>

        <button
          onClick={handleFlipCamera}
          className="w-10 h-10 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-90"
        >
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Guard tier: perangkat low + AI aktif → sarankan mode manual bila berat.
          MediaPipe GPU + kamera + 3D bersamaan rawan patah-patah/OOM di low-end. */}
      {tier === 'low' && useAITracking && (
        <div className="relative z-30 mx-4 mt-1 rounded-2xl bg-amber-500/15 border border-amber-400/30 px-3 py-2 backdrop-blur-xl">
          <p className="text-[11px] leading-snug text-amber-200">
            Perangkat terdeteksi <b>low-end</b> — AR + AI bisa berat. Matikan{' '}
            <b>MediaPipe AI Pose</b> ke <b>Siluet Manual</b> bila patah-patah.
          </p>
          <button
            onClick={() => {
              haptic.selection();
              aiTouched.current = true;
              setUseAITracking(false);
            }}
            className="mt-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-[11px] font-bold text-amber-100 active:scale-95"
          >
            Matikan AI (mode ringan)
          </button>
        </div>
      )}

      {/* Bottom Shutter & Controls */}
      <div className="relative z-30 mt-auto flex items-center justify-around pb-[env(safe-area-inset-bottom,24px)] pt-4 px-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="w-14 text-center text-[10px] text-zinc-400 font-mono">
          DTF {printWidthCm}cm
        </div>

        {/* Shutter Button */}
        <button
          onClick={handleTakeSnapshot}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-2xl"
        >
          <div className="w-full h-full rounded-full bg-[#FF6B35] flex items-center justify-center text-white shadow-lg shadow-orange-500/50">
            <Camera className="w-7 h-7" />
          </div>
        </button>

        <button
          onClick={() => {
            haptic.tap();
            shareCustomDesign('ar-live', 'Coba Baju 3D Kaos Kami');
          }}
          className="w-12 h-12 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-90"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
