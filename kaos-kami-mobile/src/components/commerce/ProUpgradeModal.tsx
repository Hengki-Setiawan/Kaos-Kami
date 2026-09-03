"use client";

import React, { useState } from 'react';
import { Crown, Sparkles, Check, PlayCircle, X } from 'lucide-react';
import { GlassCard, HapticButton, Badge } from '@/components/ui';
import { billingProvider } from '@/lib/monetization/billing';
import { adsProvider } from '@/lib/monetization/ads';
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
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubscribe = async () => {
    if (busy) return;
    setBusy(true);
    haptic.tapHeavy();
    try {
      const res = await billingProvider.purchaseProMonthly();
      if (res.ok) {
        haptic.success();
        onUnlockPro();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleWatchRewardedAd = async () => {
    haptic.tapMedium();
    setAdWatching(true);
    setAdProgress(0);
    const tick = setInterval(() => {
      setAdProgress((prev) => Math.min(95, prev + 12));
    }, 200);
    try {
      await adsProvider.showRewarded(() => {
        haptic.success();
        onUnlockPro();
        onClose();
      });
    } finally {
      clearInterval(tick);
      setAdWatching(false);
    }
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
            loading={busy}
            onClick={handleSubscribe}
            className="w-full py-3.5 font-bold shadow-lg shadow-orange-600/40"
          >
            Langganan Pro • Rp 29.000 / Bulan
          </HapticButton>
          {!billingProvider.isLive && (
            <p className="text-[10px] text-zinc-500 text-center">
              Mode simulasi — pembayaran asli aktif setelah rilis Play Store.
            </p>
          )}

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
              <>
                <HapticButton
                  variant="glass"
                  icon={<PlayCircle className="w-4 h-4 text-amber-400" />}
                  onClick={handleWatchRewardedAd}
                  className="w-full text-xs text-zinc-300"
                >
                  Tonton Video 15 Detik (Buka 1x Ekspor HD)
                </HapticButton>
                {!adsProvider.isLive && (
                  <p className="text-[10px] text-zinc-500 text-center mt-1">
                    Slot iklan simulasi — AdMob aktif setelah App ID terdaftar.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
