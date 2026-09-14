"use client";

import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { HapticButton, GlassCard } from '@/components/ui';
import { verifyUserBiometrics } from '@/lib/bridge/biometrics';
import { haptic } from '@/lib/bridge/haptics';

export function BiometricLockPrompt({
  title = 'Autentikasi Diperlukan',
  description = 'Gunakan Sidik Jari atau Face ID untuk membuka akses Workshop Admin.',
  onSuccess,
  onCancel,
}: {
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AUTO-LOCK: saat app ke background (appStateChange Capacitor + fallback
  // visibilitychange web), hentikan spinner verifikasi agar prompt kembali ke
  // keadaan terkunci saat dibuka lagi. SENGAJA tidak memanggil onSuccess /
  // onCancel dan tidak mengubah alur login — hanya reset state transien.
  useEffect(() => {
    let cancelled = false;
    let appSub: { remove: () => void } | null = null;
    const lockOnBackground = () => {
      if (!cancelled) setIsVerifying(false);
    };
    const onVisibility = () => {
      try {
        if (document.hidden) lockOnBackground();
      } catch {}
    };
    try {
      document?.addEventListener?.('visibilitychange', onVisibility);
    } catch {}
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        appSub = await App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) lockOnBackground();
        });
      } catch {
        // Non-native (web preview): cukup visibilitychange di atas.
      }
    })();
    return () => {
      cancelled = true;
      try {
        document?.removeEventListener?.('visibilitychange', onVisibility);
      } catch {}
      try {
        appSub?.remove();
      } catch {}
    };
  }, []);

  const handleTriggerBiometric = async () => {
    setIsVerifying(true);
    setErrorMsg(null);
    haptic.tapMedium();

    const verified = await verifyUserBiometrics('Akses Portal Workshop Kaos Kami');
    setIsVerifying(false);

    if (verified) {
      haptic.success();
      onSuccess();
    } else {
      // JANGAN bypass: gagal = tetap terkunci. Fallback = PIN/password HP
      // (pengguna dapat mengulang pindai atau menekan Batal).
      haptic.error();
      setErrorMsg(
        'Verifikasi gagal atau dibatalkan. Coba lagi, atau buka kunci HP dengan PIN/password lalu ulangi.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <GlassCard className="max-w-xs w-full p-6 text-center space-y-4 border-orange-500/30">
        <div className="w-16 h-16 rounded-3xl bg-orange-500/15 border border-orange-500/30 mx-auto flex items-center justify-center text-[#FF6B35]">
          <Fingerprint className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <h3 className="text-base font-bold text-white font-['Syne']">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
        </div>

        {errorMsg && (
          <p className="text-[11px] text-red-400 font-medium">{errorMsg}</p>
        )}

        <div className="space-y-2 pt-2">
          <HapticButton
            variant="primary"
            loading={isVerifying}
            onClick={handleTriggerBiometric}
            className="w-full font-bold"
          >
            Pindai Sidik Jari / Face ID
          </HapticButton>

          <HapticButton
            variant="ghost"
            onClick={onCancel}
            className="w-full text-xs text-zinc-400 hover:text-white"
          >
            Batal
          </HapticButton>
        </div>
      </GlassCard>
    </div>
  );
}
