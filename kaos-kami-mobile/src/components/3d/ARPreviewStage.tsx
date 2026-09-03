"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Camera, FlipHorizontal, X, Share2, Sparkles, Bot } from 'lucide-react';
import { haptic } from '@/lib/bridge/haptics';
import { shareCustomDesign } from '@/lib/bridge/share';
import { computeAverageLuminance } from '@/lib/3d/lightingEstimation';
import { MediaPipePoseTracker, PoseTransform3D } from '@/lib/3d/mediaPipePoseTracker';
import { MobileApparelMeshRenderer } from './MobileApparelMeshRenderer';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';

export function ARPreviewStage({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lightMultiplier, setLightMultiplier] = useState(1.2);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [useAITracking, setUseAITracking] = useState(true);

  const [poseTransform, setPoseTransform] = useState<PoseTransform3D>({
    detected: false,
    position: [0, -0.1, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
  });

  const { apparelType, printWidthCm } = useMobileStudioStore();
  const poseTracker = useMemo(() => new MediaPipePoseTracker(), []);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } catch (err) {
        console.debug('[AR Camera] Error initializing camera feed:', err);
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Lighting & MediaPipe AI Pose Tracking Loop
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      frameCount++;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (videoRef.current) {
        // 1. Lighting estimation (every 30 frames)
        if (frameCount % 30 === 0) {
          const lum = computeAverageLuminance(videoRef.current);
          setLightMultiplier(lum);
        }

        // 2. MediaPipe Pose tracking inference (if enabled)
        if (useAITracking) {
          poseTracker.processVideoFrame(videoRef.current, now);
          const smoothed = poseTracker.updateSmooth(dt);
          setPoseTransform({ ...smoothed });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [useAITracking, poseTracker]);

  const handleFlipCamera = () => {
    haptic.selection();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleTakeSnapshot = () => {
    haptic.tapHeavy();
    setSnapshotTaken(true);
    setTimeout(() => {
      setSnapshotTaken(false);
      haptic.success();
      shareCustomDesign('ar-snapshot', `Hasil AR Virtual Try-On Kaos Kami (${apparelType.toUpperCase()})`);
    }, 400);
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
      <div className="absolute inset-0 z-20 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 2.3], fov: 45 }}
          gl={{ alpha: true, preserveDrawingBuffer: true }}
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
          onClick={() => {
            haptic.tap();
            onClose();
          }}
          className="w-10 h-10 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MediaPipe AI Toggle Pill */}
        <button
          onClick={() => {
            haptic.selection();
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
