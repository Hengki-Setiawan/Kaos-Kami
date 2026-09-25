"use client";

import React, { useState } from 'react';
import { Eye, RotateCcw, Wind, Activity, Compass, Footprints, Camera, Video, Wand2, AlertTriangle, FlaskConical } from 'lucide-react';
import { useMobileStudioStore, AnimationPreset, CameraAngle } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { useShallow } from 'zustand/shallow';
import { captureHDImage, recordTurntable360 } from '@/lib/3d/exportStudio';
import { haptic } from '@/lib/bridge/haptics';
import { removeSolidBackground } from '@/lib/enhancers/removeSolidBackground';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MobileTestLabControls } from './MobileTestLabControls';

// C4 (owner, Sep 2026): paywall Pro dicabut total — ekspor HD/360° selalu
// terbuka, tanpa unlock, tanpa watermark, tanpa jatah kredit.
export function StudioControlOverlay({
  onNotify,
}: {
  onNotify?: (msg: string) => void;
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState<'white' | 'black' | null>(null);
  // F3 Test Lab BottomSheet (tab 4 mode + slider + telemetri).
  const [testLabOpen, setTestLabOpen] = useState(false);

  const {
    cameraAngle,
    setCameraAngle,
    activeAnimation,
    setActiveAnimation,
    activeFace,
    setActiveFace,
    printWidthCm,
    printHeightCm,
    decalUrl,
    setDecalUrl,
    decalDpi,
    testLabMode,
  } = useMobileStudioStore(
    useShallow((s) => ({
      cameraAngle: s.cameraAngle,
      setCameraAngle: s.setCameraAngle,
      activeAnimation: s.activeAnimation,
      setActiveAnimation: s.setActiveAnimation,
      activeFace: s.activeFace,
      setActiveFace: s.setActiveFace,
      printWidthCm: s.printWidthCm,
      printHeightCm: s.printHeightCm,
      decalUrl: s.decalUrl,
      setDecalUrl: s.setDecalUrl,
      decalDpi: s.decalDpi,
      testLabMode: s.testLabMode,
    }))
  );

  const handleMagicCutout = async (targetColor: 'white' | 'black') => {
    if (!decalUrl) return;
    setRemovingBg(targetColor);
    haptic.tapHeavy();
    try {
      const transparentUrl = await removeSolidBackground(decalUrl, targetColor, 32);
      setDecalUrl(transparentUrl);
      haptic.success();
      onNotify?.(`🪄 Background ${targetColor === 'white' ? 'putih' : 'hitam'} berhasil dihapus!`);
    } catch (err: any) {
      haptic.error();
      onNotify?.(err?.message || 'Gagal memotong background.');
    } finally {
      setRemovingBg(null);
    }
  };

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
  const { tier } = useMobileDeviceTier();
  const recordBitrate = tier === 'low' || tier === 'no-webgl' ? 4_000_000 : 8_000_000;
  const dpiTone =
    dpi >= 300
      ? 'border-emerald-500/40 text-emerald-400'
      : dpi >= 150
      ? 'border-amber-500/40 text-amber-400'
      : 'border-rose-500/40 text-rose-400';

  return (
    <div className="absolute inset-x-3 top-3 pointer-events-none flex flex-col gap-2 z-10 select-none">
      {/* Top Row: Camera Angles & DPI & Flip Face */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        {/* Camera Angle Pills */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg overflow-x-auto max-w-[65vw] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="px-1.5 py-1 flex items-center gap-1 text-zinc-400 shrink-0">
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
                  if (angle.key === 'front') setActiveFace('front');
                  else if (angle.key === 'back') setActiveFace('back');
                }}
                className={`shrink-0 px-2 py-1 rounded-xl text-[10px] font-bold transition-all duration-150 min-h-[28px] ${
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

        {/* Front / Back Toggle Pill */}
        <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-lg shrink-0">
          <button
            onClick={() => {
              haptic.selection();
              setActiveFace('front');
              setCameraAngle('front');
            }}
            className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
              activeFace === 'front'
                ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Depan
          </button>
          <button
            onClick={() => {
              haptic.selection();
              setActiveFace('back');
              setCameraAngle('back');
            }}
            className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
              activeFace === 'back'
                ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Belakang
          </button>
        </div>
      </div>

      {/* Middle Row: Decal Tools (Magic Cutout & DPI Indicator) */}
      {decalUrl && (
        <div className="flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
          {/* Magic Cutout 1-Click Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 shadow-lg">
            <span className="text-[10px] text-zinc-300 font-bold px-1.5 flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-[#FF6B35]" /> Cutout:
            </span>
            <button
              disabled={removingBg !== null}
              onClick={() => handleMagicCutout('white')}
              className="px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
            >
              {removingBg === 'white' ? 'Memotong…' : 'Hapus Putih'}
            </button>
            <button
              disabled={removingBg !== null}
              onClick={() => handleMagicCutout('black')}
              className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold transition-colors disabled:opacity-50"
            >
              {removingBg === 'black' ? 'Memotong…' : 'Hapus Hitam'}
            </button>
          </div>

          {/* Real-time DPI & Scale Indicator */}
          <div className={`px-2.5 py-1 rounded-2xl bg-black/65 backdrop-blur-xl border text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg ${dpiTone}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{dpi > 0 ? `${dpi} DPI` : 'DPI …'} • {printWidthCm}x{printHeightCm} cm</span>
          </div>
        </div>
      )}

      {/* Low-DPI Warning Banner */}
      {decalUrl && dpi > 0 && dpi < 150 && (
        <div className="pointer-events-auto px-3 py-1.5 rounded-2xl bg-rose-950/85 backdrop-blur-xl border border-rose-500/50 text-[10px] text-rose-300 font-semibold flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Resolusi &lt; 150 DPI berpotensi pecah/buram di DTF. Disarankan upload gambar tajam min 1000px.</span>
        </div>
      )}

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
        {/* F3 Test Lab: BottomSheet uji tarik/senter/angin */}
        <button
          title="3D Test Lab (tarik/senter/angin)"
          onClick={() => {
            haptic.tap();
            setTestLabOpen(true);
          }}
          className={`p-2 rounded-xl text-xs flex items-center justify-center transition-colors ${
            testLabMode !== 'none'
              ? 'bg-[#FF6B35]/25 text-[#FF6B35]'
              : 'text-zinc-400 hover:text-white active:bg-white/10'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
        </button>
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

      {/* F3 Test Lab BottomSheet */}
      <BottomSheet
        open={testLabOpen}
        onOpenChange={setTestLabOpen}
        title="3D Test Lab"
        description="Uji tarik kain, senter inspeksi & terowongan angin."
      >
        <MobileTestLabControls />
      </BottomSheet>
    </div>
  );
}

