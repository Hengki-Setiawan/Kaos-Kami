"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  RotateCcw,
  Sliders,
  Check,
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
import { useMobileStudioStore, ApparelType } from '@/store/useMobileStudioStore';

// Dynamic import for R3F Canvas to ensure zero SSR execution
const CanvasStageMobile = dynamic(
  () => import('@/components/3d/CanvasStageMobile').then((m) => m.CanvasStageMobile),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#0E0E10] flex items-center justify-center text-xs text-zinc-500">Memuat Engine 3D...</div> }
);

const StudioControlOverlay = dynamic(
  () => import('@/components/3d/StudioControlOverlay').then((m) => m.StudioControlOverlay),
  { ssr: false }
);

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    apparelType,
    setApparelType,
    color,
    setColor,
    decalUrl,
    setDecalUrl,
    printWidthCm,
    printHeightCm,
    resetStudio,
  } = useMobileStudioStore();

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
      setDecalUrl(dataUrl);
      haptic.success();
      triggerToast('Logo sablon berhasil diproyeksikan (300 DPI)!');
    }
  };

  const apparelOptions: { key: ApparelType; label: string; gsm: string }[] = [
    { key: 'tshirt', label: 'T-Shirt Heavyweight', gsm: '240 GSM' },
    { key: 'hoodie', label: 'Streetwear Hoodie', gsm: '330 GSM' },
    { key: 'jacket', label: 'Coach Jacket', gsm: 'Waterproof' },
    { key: 'longsleeve', label: 'Longsleeve Shirt', gsm: '280 GSM' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0E0E10] text-white select-none">
      {/* Native Header */}
      <NativeHeader
        title="KAOS KAMI"
        subtitle={activeTab === 'studio' ? '3D Configurator Studio' : 'Makassar Streetwear & DTF'}
        actions={
          <Badge variant="success" pulse>
            Workshop Live
          </Badge>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-2 pb-24 flex flex-col">
        {/* ========================================================= */}
        {/* TAB 1: HOME */}
        {/* ========================================================= */}
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
                  selectedHex={color}
                  onSelect={(hex) => {
                    setColor(hex);
                    triggerToast(`Warna kain diubah: ${hex}`);
                  }}
                />
              </div>

              <div className="flex gap-2.5">
                <HapticButton
                  variant="primary"
                  hapticStyle="tapHeavy"
                  icon={<Palette className="w-4 h-4" />}
                  onClick={() => {
                    setActiveTab('studio');
                  }}
                  className="flex-1"
                >
                  Buka Studio 3D
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

            {/* Quick Action Grid */}
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

        {/* ========================================================= */}
        {/* TAB 2: STUDIO 3D CONFIGURATOR (PHASE 3 ACTIVE) */}
        {/* ========================================================= */}
        {activeTab === 'studio' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-140px)] relative">
            {/* 3D Canvas Stage */}
            <div className="flex-1 relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#0E0E10]">
              <CanvasStageMobile />
              <StudioControlOverlay />
            </div>

            {/* Bottom Quick Control Bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <HapticButton
                variant="glass"
                icon={<Sliders className="w-4 h-4" />}
                onClick={() => setSheetOpen(true)}
                className="flex-1 text-xs"
              >
                Panel Kustomisasi
              </HapticButton>

              <HapticButton
                variant="glass"
                icon={<Camera className="w-4 h-4" />}
                onClick={handleUploadDecal}
                className="px-3 text-xs"
              >
                {decalUrl ? 'Ganti Logo' : 'Upload Logo'}
              </HapticButton>

              <HapticButton
                variant="secondary"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => {
                  resetStudio();
                  triggerToast('Studio 3D direset!');
                }}
                className="px-3 text-xs"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KATALOG */}
        {/* ========================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold font-['Syne']">Katalog Apparel Makassar</h2>
            <div className="grid grid-cols-2 gap-3">
              {apparelOptions.map((item) => (
                <GlassCard
                  key={item.key}
                  interactive
                  onClick={() => {
                    setApparelType(item.key);
                    setActiveTab('studio');
                    triggerToast(`${item.label} dipilih di Studio 3D!`);
                  }}
                  className="p-3.5 text-left"
                >
                  <div className="w-full aspect-square rounded-2xl bg-zinc-800/80 mb-2.5 flex items-center justify-center text-zinc-500">
                    <Layers className="w-8 h-8 opacity-40" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate font-['Syne']">{item.label}</h4>
                  <p className="text-[11px] text-zinc-400">{item.gsm}</p>
                  <p className="text-[11px] text-[#FF6B35] font-semibold mt-1">Rp 125.000</p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PESANAN */}
        {/* ========================================================= */}
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

        {/* ========================================================= */}
        {/* TAB 5: PROFIL */}
        {/* ========================================================= */}
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
        description="Pilih jenis pakaian, warna kain, dan stiker logo sablon DTF."
      >
        <div className="space-y-5 py-2">
          {/* Pilihan Jenis Pakaian */}
          <div>
            <label className="text-xs font-semibold text-white mb-2 block font-['Syne']">
              Jenis Pakaian:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {apparelOptions.map((opt) => {
                const isSelected = apparelType === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      haptic.selection();
                      setApparelType(opt.key);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] text-zinc-500">{opt.gsm}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#FF6B35]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pemilih Warna Kain */}
          <div>
            <ColorSwatchPicker
              label="Warna Dasar Kain:"
              selectedHex={color}
              onSelect={(hex) => setColor(hex)}
            />
          </div>

          {/* Upload Logo Sablon */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Stiker Sablon DTF:</span>
              <Badge variant={decalUrl ? 'success' : 'neutral'}>
                {decalUrl ? `${printWidthCm}x${printHeightCm} cm • 300 DPI` : 'Belum Ada'}
              </Badge>
            </div>
            <HapticButton
              variant="secondary"
              hapticStyle="tapHeavy"
              icon={<Camera className="w-4 h-4" />}
              onClick={handleUploadDecal}
              className="w-full"
            >
              {decalUrl ? 'Ganti Desain Logo' : 'Upload Logo dari Galeri (PNG)'}
            </HapticButton>
          </div>

          <HapticButton
            variant="primary"
            hapticStyle="success"
            onClick={() => {
              setSheetOpen(false);
              haptic.addToCart();
              triggerToast('Desain disimpan! Siap masuk ke keranjang belanja.');
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
