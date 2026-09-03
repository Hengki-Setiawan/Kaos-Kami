"use client";

import React, { useState } from 'react';
import { Crown, Sparkles, Check, PlayCircle, X } from 'lucide-react';
import { GlassCard, HapticButton, Badge } from '@/components/ui';
import { haptic } from '@/lib/bridge/haptics';

export function ProUpgradeModal({
  open,
  onClose,
  onUnlockPro,
}: {
  open: boolean;
  onClose: () => void;
  onUnlockPro: () => void;
}) {
  const [adWatching, setAdWatching] = useState(false);
  const [adProgress, setAdProgress] = useState(0);

  if (!open) return null;

  const handleWatchRewardedAd = () => {
    haptic.tapMedium();
    setAdWatching(true);
    setAdProgress(0);

    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAdWatching(false);
          haptic.success();
          onUnlockPro();
          onClose();
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <GlassCard glow className="max-w-sm w-full p-5 space-y-4 border-[#FF6B35]/40 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown Header */}
        <div className="text-center space-y-1 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-amber-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-orange-500/30 mb-2">
            <Crown className="w-7 h-7" />
          </div>
          <Badge variant="production">KAOS KAMI PRO SUITE</Badge>
          <h3 className="text-lg font-bold text-white font-['Syne']">Upgrade ke Kaos Kami Pro</h3>
          <p className="text-xs text-zinc-400">
            Khusus Distro, Brand Streetwear & Konveksi Sablon Makassar
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-2 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
          {[
            'Ekspor Mockup 4K Ultra-HD Tanpa Watermark',
            'Download Lembar Cetak B2B Tech Pack Sablon DTF',
            'Ekspor Video 360° Turntable MP4 untuk TikTok / Reels',
            'Akses Prioritas Antrean Workshop Sablon Tamalanrea',
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-zinc-300">
              <Check className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <HapticButton
            variant="primary"
            hapticStyle="tapHeavy"
            onClick={() => {
              onUnlockPro();
              onClose();
            }}
            className="w-full py-3.5 font-bold shadow-lg shadow-orange-600/40"
          >
            Langganan Pro • Rp 29.000 / Bulan
          </HapticButton>

          {/* Rewarded Ads Free Option */}
          <div className="pt-2 border-t border-zinc-800 text-center">
            {adWatching ? (
              <div className="space-y-1.5 py-2">
                <p className="text-[11px] text-[#FF6B35] font-bold">Memutar Video Iklan Sponsor (15 dtk)...</p>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B35] transition-all duration-300"
                    style={{ width: `${adProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <HapticButton
                variant="glass"
                icon={<PlayCircle className="w-4 h-4 text-amber-400" />}
                onClick={handleWatchRewardedAd}
                className="w-full text-xs text-zinc-300"
              >
                Tonton Video 15 Detik (Buka 1x Ekspor HD)
              </HapticButton>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
