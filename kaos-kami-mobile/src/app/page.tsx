"use client";

import React, { useState, useEffect } from 'react';
import {
  Palette,
  ShoppingBag,
  ClipboardList,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Layers,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import {
  NativeHeader,
  TabBar,
  TabKey,
  GlassCard,
  HapticButton,
  Badge,
  ColorSwatchPicker,
  BottomSheet,
  Toast,
} from '@/components/ui';
import { initEdgeToEdgeStatusBar, haptic, pickOrCaptureDecalImage } from '@/lib/bridge';

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [selectedColor, setSelectedColor] = useState('#0E0E10');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadedDecal, setUploadedDecal] = useState<string | null>(null);

  useEffect(() => {
    initEdgeToEdgeStatusBar();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleUploadDecal = async () => {
    haptic.tapMedium();
    const dataUrl = await pickOrCaptureDecalImage();
    if (dataUrl) {
      setUploadedDecal(dataUrl);
      haptic.success();
      triggerToast('Logo sablon berhasil diunggah (300 DPI)!');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0E0E10] text-white select-none">
      {/* Native Header */}
      <NativeHeader
        title="KAOS KAMI"
        subtitle="Makassar Streetwear 3D Studio"
        actions={
          <Badge variant="success" pulse>
            Workshop Live
          </Badge>
        }
      />

      {/* Main Tab Content */}
      <main className="flex-1 px-4 pt-3 pb-24 flex flex-col">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* 3D Configurator Hero Card */}
            <GlassCard glow className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/40 tracking-wider">
                  <Flame className="w-3.5 h-3.5" />
                  3D CONFIGURATOR 2026
                </span>
                <Badge variant="production">DTF 30.0 cm Max</Badge>
              </div>

              <h2 className="text-xl font-extrabold text-white font-['Syne'] leading-tight mb-1">
                Kustom Kaos 3D Impianmu
              </h2>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Pilih kain heavyweight 240 & 280 GSM, pasang stiker logo 300 DPI, dan dapatkan kalibrasi sablon fisik 1:1 cm.
              </p>

              {/* Color Swatch Preview */}
              <div className="mb-4">
                <ColorSwatchPicker
                  label="Pilih Warna Bahan Kaos:"
                  selectedHex={selectedColor}
                  onSelect={(hex) => {
                    setSelectedColor(hex);
                    triggerToast(`Warna kain diubah: ${hex}`);
                  }}
                />
              </div>

              <div className="flex gap-2.5">
                <HapticButton
                  variant="primary"
                  hapticStyle="tapHeavy"
                  icon={<Palette className="w-4 h-4" />}
                  onClick={() => setSheetOpen(true)}
                  className="flex-1"
                >
                  Buka Customizer
                </HapticButton>

                <HapticButton
                  variant="glass"
                  hapticStyle="tapMedium"
                  icon={<Camera className="w-4 h-4" />}
                  onClick={handleUploadDecal}
                  className="px-3"
                >
                  Upload Logo
                </HapticButton>
              </div>
            </GlassCard>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-3">
              <GlassCard
                interactive
                onClick={() => {
                  haptic.tap();
                  setActiveTab('catalog');
                }}
                className="p-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[#FF6B35] mb-2.5">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-['Syne']">Katalog Baju</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Heavyweight 240 & 280 GSM</p>
              </GlassCard>

              <GlassCard
                interactive
                onClick={() => {
                  haptic.tap();
                  setActiveTab('orders');
                }}
                className="p-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2.5">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-['Syne']">Lacak Pesanan</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Live Sablon & Maxim COD</p>
              </GlassCard>
            </div>

            {/* Admin Workshop Quick Access Card */}
            <GlassCard className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/90 border-zinc-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Admin Mobile Workshop</h4>
                  <p className="text-[10px] text-zinc-400">ACC desain & pantau sablon dari HP</p>
                </div>
              </div>
              <HapticButton
                variant="secondary"
                hapticStyle="tap"
                onClick={() => triggerToast('Mode Admin Aktif: Cek daftar order & tombol ACC!')}
                className="px-3.5 py-2 text-xs"
              >
                Buka
              </HapticButton>
            </GlassCard>
          </div>
        )}

        {/* Tab Studio 3D */}
        {activeTab === 'studio' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/15 flex items-center justify-center text-[#FF6B35]">
              <Palette className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-['Syne']">Studio 3D Configurator</h2>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Touch Orbit Controls, kalibrasi fisik 1:1 cm, dan proyeksi decal Drei. Siap diintegrasikan di Phase 3!
            </p>
            <HapticButton
              variant="primary"
              onClick={() => setSheetOpen(true)}
              className="mt-2"
            >
              Buka Panel Kustomisasi
            </HapticButton>
          </div>
        )}

        {/* Tab Katalog */}
        {activeTab === 'catalog' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold font-['Syne']">Katalog Apparel Makassar</h2>
            <div className="grid grid-cols-2 gap-3">
              {['Kaos Heavyweight 240 GSM', 'Kaos Heavyweight 280 GSM', 'Streetwear Hoodie', 'Coach Jacket'].map(
                (item, idx) => (
                  <GlassCard key={idx} interactive className="p-3.5 text-left">
                    <div className="w-full aspect-square rounded-2xl bg-zinc-800/80 mb-2.5 flex items-center justify-center text-zinc-500">
                      <Layers className="w-8 h-8 opacity-40" />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate font-['Syne']">{item}</h4>
                    <p className="text-[11px] text-[#FF6B35] font-semibold mt-0.5">Rp 125.000</p>
                  </GlassCard>
                )
              )}
            </div>
          </div>
        )}

        {/* Tab Pesanan */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-['Syne']">Pesanan Sablon DTF</h2>
              <Badge variant="production">1 Aktif</Badge>
            </div>

            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-white font-mono">#KK-2026-089</span>
                  <p className="text-[10px] text-zinc-400">1x Kaos Heavyweight 280 GSM • Hitam</p>
                </div>
                <Badge variant="production" pulse>
                  Cetak DTF
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Sablon Depan:</span>
                  <span className="text-white font-medium">Lebar 28.5 cm (A4+)</span>
                </div>
                <div className="flex justify-between">
                  <span>Pengiriman:</span>
                  <span className="text-white font-medium">Maxim Instant COD Makassar</span>
                </div>
              </div>

              <HapticButton
                variant="secondary"
                hapticStyle="tap"
                onClick={() => triggerToast('Status: Kaos sedang dipress 160°C di Tamalanrea!')}
                className="w-full py-2 text-xs mt-2"
              >
                Lihat Progres Sablon
              </HapticButton>
            </GlassCard>
          </div>
        )}

        {/* Tab Profil */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF6B35] to-orange-400 mx-auto flex items-center justify-center text-white text-2xl font-bold font-['Syne'] shadow-xl shadow-orange-500/25">
              H
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Syne']">Hengki Setiawan</h3>
              <p className="text-xs text-zinc-400">0882-0206-85076 • Tamalanrea, Makassar</p>
            </div>
            <div className="pt-4 max-w-xs mx-auto space-y-2">
              <HapticButton
                variant="glass"
                onClick={() => triggerToast('Login Biometrik Sidik Jari Aktif!')}
                className="w-full"
              >
                Aktifkan Face ID / Sidik Jari
              </HapticButton>
            </div>
          </div>
        )}
      </main>

      {/* Customizer Vaul Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Studio 3D Configurator"
        description="Pilih warna kain, upload stiker sablon, dan sesuaikan ukuran cm."
      >
        <div className="space-y-5 py-2">
          <div>
            <ColorSwatchPicker
              label="Warna Dasar Kaos:"
              selectedHex={selectedColor}
              onSelect={(hex) => setSelectedColor(hex)}
            />
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Stiker Sablon DTF:</span>
              <Badge variant={uploadedDecal ? 'success' : 'neutral'}>
                {uploadedDecal ? '300 DPI Terverifikasi' : 'Belum Ada'}
              </Badge>
            </div>
            <HapticButton
              variant="secondary"
              hapticStyle="tapHeavy"
              icon={<Camera className="w-4 h-4" />}
              onClick={handleUploadDecal}
              className="w-full"
            >
              {uploadedDecal ? 'Ganti Desain Logo' : 'Upload Logo dari Galeri'}
            </HapticButton>
          </div>

          <HapticButton
            variant="primary"
            hapticStyle="success"
            onClick={() => {
              setSheetOpen(false);
              haptic.addToCart();
              triggerToast('Desain disimpan ke keranjang!');
            }}
            className="w-full py-4 text-base"
          >
            Simpan Desain Kaos
          </HapticButton>
        </div>
      </BottomSheet>

      {/* Floating Native Toast */}
      <Toast
        show={!!toastMessage}
        message={toastMessage || ''}
        onClose={() => setToastMessage(null)}
      />

      {/* Bottom Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} orderBadgeCount={1} />
    </div>
  );
}
