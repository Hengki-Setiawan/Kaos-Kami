"use client";

import React, { useState } from 'react';
import { Eye, RotateCcw, Wind, Activity, Compass, Footprints, Camera, Video } from 'lucide-react';
import { useMobileStudioStore, AnimationPreset, CameraAngle } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { useShallow } from 'zustand/shallow';
import { captureHDImage, recordTurntable360 } from '@/lib/3d/exportStudio';
import { haptic } from '@/lib/bridge/haptics';

// C4 (owner, Sep 2026): paywall Pro dicabut total — ekspor HD/360° selalu
// terbuka, tanpa unlock, tanpa watermark, tanpa jatah kredit.
export function StudioControlOverlay({
  onNotify,
}: {
  onNotify?: (msg: string) => void;
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const {
    cameraAngle,
    setCameraAngle,
    activeAnimation,
    setActiveAnimation,
    printWidthCm,
    printHeightCm,
    decalUrl,
    decalDpi,
  } = useMobileStudioStore(
    useShallow((s) => ({
      cameraAngle: s.cameraAngle,
      setCameraAngle: s.setCameraAngle,
      activeAnimation: s.activeAnimation,
      setActiveAnimation: s.setActiveAnimation,
      printWidthCm: s.printWidthCm,
      printHeightCm: s.printHeightCm,
      decalUrl: s.decalUrl,
      decalDpi: s.decalDpi,
    }))
  );

  const cameraAngles: { key: CameraAngle; label: string }[] = [
    { key: 'front', label: 'Depan' },
    { key: 'back', label: 'Belakang' },
    { key: 'left', label: 'Kiri' },
    { key: 'right', label: 'Kanan' },
    { key: 'perspective', label: '360°' },
  ];

  const animationPresets: { key: AnimationPreset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'idle', label: 'Idle', icon: Activity },
    { key: 'walking', label: 'Jalan', icon: Footprints },
    { key: 'waving', label: 'Angin', icon: Wind },
    { key: 'spin', label: 'Putar', icon: Compass },
    { key: 'none', label: 'Diam', icon: RotateCcw },
  ];

  const dpi = decalDpi ?? 0;
  // PERF: tier-low rekam 4 Mbps (hemat encoder + file ~½); mid/high 8 Mbps.
  const { tier } = useMobileDeviceTier();
  const recordBitrate = tier === 'low' || tier === 'no-webgl' ? 4_000_000 : 8_000_000;
  const dpiTone =
    dpi >= 300
      ? 'border-emerald-500/30 text-emerald-400'
      : dpi >= 150
      ? 'border-amber-500/30 text-amber-400'
      : 'border-rose-500/30 text-rose-400';
  // C4: semua ekspor selalu kualitas penuh tanpa watermark.

  return (
    <div className="absolute inset-x-3 top-3 pointer-events-none flex flex-col gap-2 z-10 select-none">
      {/* Top Bar: Camera Angles & Reset */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        {/* Camera Angle Pills — HP 360px: geser horizontal, tak overflow. */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg overflow-x-auto max-w-[72vw] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="px-2 py-1 flex items-center gap-1 text-zinc-400 shrink-0">
            <Eye className="w-3.5 h-3.5" />
          </div>
          {cameraAngles.map((angle) => {
            const isActive = cameraAngle === angle.key;
            return (
              <button
                key={angle.key}
                onClick={() => {
                  haptic.selection();
                  setCameraAngle(angle.key);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all duration-150 min-h-[32px] ${
                  isActive
                    ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-600/40'
                    : 'text-zinc-400 hover:text-white active:bg-white/10'
                }`}
              >
                {angle.label}
              </button>
            );
          })}
        </div>

        {/* Real-time DPI & Scale Indicator (If Decal Active) */}
        {decalUrl && (
          <div className={`px-3 py-1 rounded-2xl bg-black/60 backdrop-blur-xl border text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg ${dpiTone}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{dpi > 0 ? `${dpi} DPI` : 'DPI …'} • {printWidthCm}x{printHeightCm} cm</span>
          </div>
        )}
      </div>

      {/* Animation Motion Floating Selector */}
      <div className="self-end pointer-events-auto mt-1 flex flex-col gap-1 p-1 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg">
        {animationPresets.map((preset) => {
          const isActive = activeAnimation === preset.key;
          const Icon = preset.icon;

          return (
            <button
              key={preset.key}
              onClick={() => {
                haptic.tap();
                setActiveAnimation(preset.key);
              }}
              title={preset.label}
              className={`p-2 rounded-xl text-xs flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-white/20 text-[#FF6B35]'
                  : 'text-zinc-400 hover:text-white active:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
        <div className="h-px bg-white/10 my-0.5" />
        <button
          title="Ekspor HD 1080p"
          disabled={exporting !== null}
          onClick={async () => {
            setExporting('hd');
            try {
              await captureHDImage();
              haptic.success();
              onNotify?.('Ekspor HD tersimpan & dibagikan!');
            } catch (e: any) {
              onNotify?.(e?.message || 'Ekspor gagal.');
            } finally {
              setExporting(null);
            }
          }}
          className="p-2 rounded-xl text-xs flex items-center justify-center text-zinc-400 hover:text-white active:bg-white/10 disabled:opacity-40"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          title="Rekam turntable 360° (±4 dtk)"
          disabled={exporting !== null}
          onClick={async () => {
            setExporting('video');
            try {
              await recordTurntable360((m) => onNotify?.(m), { videoBitsPerSecond: recordBitrate });
              haptic.success();
              onNotify?.('Video 360° tersimpan & dibagikan!');
            } catch (e: any) {
              onNotify?.(e?.message || 'Perekaman gagal di perangkat ini.');
            } finally {
              setExporting(null);
            }
          }}
          className="p-2 rounded-xl text-xs flex items-center justify-center text-zinc-400 hover:text-white active:bg-white/10 disabled:opacity-40"
        >
          <Video className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
