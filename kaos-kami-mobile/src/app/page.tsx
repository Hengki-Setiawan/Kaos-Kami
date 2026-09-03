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
  ShoppingBag as CartIcon,
  WifiOff,
  Share2,
  Eye,
  Crown,
  FileText,
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
import {
  initEdgeToEdgeStatusBar,
  haptic,
  pickOrCaptureDecalImage,
  listenNetworkStatus,
  shareCustomDesign,
} from '@/lib/bridge';
import { useMobileStudioStore, ApparelType } from '@/store/useMobileStudioStore';
import { useMobileCartStore } from '@/store/useMobileCartStore';
import {
  CheckoutSheet,
  UserOrderTracker,
  OrderItemData,
  ProUpgradeModal,
  TechPackModal,
} from '@/components/commerce';
import { AdminMobileDashboard } from '@/components/admin';
import { SavedDesignsGallery } from '@/components/offline';
import { BiometricLockPrompt } from '@/components/security';
import { optimizeDecalImageForMobile } from '@/lib/enhancers/imageOptimizerMobile';
import { useSavedDesignsStore } from '@/lib/offline/savedDesignsStore';

// Dynamic imports for 3D & AR to ensure zero SSR execution
const CanvasStageMobile = dynamic(
  () => import('@/components/3d/CanvasStageMobile').then((m) => m.CanvasStageMobile),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0E0E10] flex items-center justify-center text-xs text-zinc-500">
        Memuat Engine 3D...
      </div>
    ),
  }
);

const StudioControlOverlay = dynamic(
  () => import('@/components/3d/StudioControlOverlay').then((m) => m.StudioControlOverlay),
  { ssr: false }
);

const ARPreviewStage = dynamic(
  () => import('@/components/3d/ARPreviewStage').then((m) => m.ARPreviewStage),
  { ssr: false }
);

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminModeOpen, setAdminModeOpen] = useState(false);
  const [biometricPromptOpen, setBiometricPromptOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [techPackOpen, setTechPackOpen] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Cart & Offline Stores
  const { items, addItem, getItemCount, getSubtotal } = useMobileCartStore();
  const { saveDesign } = useSavedDesignsStore();

  // Active User Order State
  const [activeOrder, setActiveOrder] = useState<OrderItemData>({
    id: 'demo-order-active',
    orderNumber: '#KK-2026-089',
    apparelTitle: 'Kaos Heavyweight 280 GSM',
    colorName: 'Obsidian Black',
    size: 'L',
    quantity: 1,
    printWidthCm: 28.5,
    printHeightCm: 22.0,
    status: 'PENDING_DESIGN_APPROVAL',
    totalAmount: 160000,
    paymentMethod: 'QRIS Instant',
    deliveryMethod: 'Maxim Instant COD Makassar',
    createdAt: 'Baru saja',
  });

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
    const cleanupNet = listenNetworkStatus((status) => {
      setIsOnline(status.connected);
      if (!status.connected) {
        setToastMessage('Mode Offline: Data tersimpan di memori HP.');
      }
    });
    return () => {
      cleanupNet();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleUploadDecal = async () => {
    haptic.tapMedium();
    const rawDataUrl = await pickOrCaptureDecalImage();
    if (rawDataUrl) {
      try {
        const { optimizedUrl, dpi } = await optimizeDecalImageForMobile(rawDataUrl);
        setDecalUrl(optimizedUrl);
        haptic.success();
        triggerToast(`Logo sablon siap (${dpi} DPI terverifikasi)!`);
      } catch {
        setDecalUrl(rawDataUrl);
        triggerToast('Logo sablon berhasil diproyeksikan!');
      }
    }
  };

  const apparelOptions: { key: ApparelType; label: string; gsm: string; price: number }[] = [
    { key: 'tshirt', label: 'T-Shirt Heavyweight', gsm: '240 GSM', price: 125000 },
    { key: 'hoodie', label: 'Streetwear Hoodie', gsm: '330 GSM', price: 210000 },
    { key: 'jacket', label: 'Coach Jacket', gsm: 'Waterproof', price: 220000 },
    { key: 'longsleeve', label: 'Longsleeve Shirt', gsm: '280 GSM', price: 145000 },
  ];

  const handleSaveToCart = () => {
    const selected = apparelOptions.find((a) => a.key === apparelType) || apparelOptions[0];
    addItem({
      apparelType,
      apparelTitle: selected.label,
      colorHex: color,
      colorName: 'Custom Color',
      size: 'L',
      quantity: 1,
      basePrice: selected.price,
      sablonPrice: 35000,
      decalUrl,
      printWidthCm,
      printHeightCm,
    });

    saveDesign({
      title: `${selected.label} Custom`,
      apparelType,
      colorHex: color,
      colorName: 'Custom Color',
      decalDataUrl: decalUrl,
      printWidthCm,
      printHeightCm,
    });

    setSheetOpen(false);
    triggerToast('Desain disimpan ke keranjang & galeri offline!');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0E0E10] text-white select-none">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-600/90 text-black px-4 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode Offline: Desain & keranjang tersimpan di HP Anda</span>
        </div>
      )}

      {/* AR Camera Passthrough Mode */}
      {arOpen && <ARPreviewStage onClose={() => setArOpen(false)} />}

      {/* Native Header */}
      <NativeHeader
        title="KAOS KAMI"
        subtitle={
          adminModeOpen
            ? 'Workshop Admin Portal'
            : activeTab === 'studio'
            ? '3D Configurator Studio'
            : 'Makassar Streetwear & DTF'
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.tap();
                setCheckoutOpen(true);
              }}
              className="relative w-8 h-8 rounded-xl bg-zinc-850 bg-[#18181B] border border-zinc-700/60 flex items-center justify-center text-white"
            >
              <CartIcon className="w-4 h-4 text-[#FF6B35]" />
              {getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#FF6B35] text-white text-[8px] font-bold flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </button>
            <Badge variant={isProUser ? 'production' : 'success'} pulse={isOnline}>
              {isProUser ? 'PRO TIER' : isOnline ? 'Workshop Live' : 'Offline'}
            </Badge>
          </div>
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
                  onClick={() => setActiveTab('studio')}
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

            {/* Pro Suite & B2B Tech Pack Banner */}
            <GlassCard
              interactive
              onClick={() => setProModalOpen(true)}
              className="p-4 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Kaos Kami Pro Suite</h4>
                  <p className="text-[10px] text-zinc-400">Ekspor 4K & Dokumen PDF B2B Sablon DTF</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400">Lihat →</span>
            </GlassCard>

            {/* Admin Workshop Access Card */}
            <GlassCard className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/90 border-zinc-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Admin Mobile Workshop</h4>
                  <p className="text-[10px] text-zinc-400">ACC desain & moderasi sablon dari HP</p>
                </div>
              </div>
              <HapticButton
                variant="secondary"
                hapticStyle="tap"
                onClick={() => setBiometricPromptOpen(true)}
                className="px-3.5 py-2 text-xs"
              >
                Buka Portal
              </HapticButton>
            </GlassCard>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: STUDIO 3D CONFIGURATOR (WITH AR TRY-ON & TECH PACK) */}
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
                Kustomisasi
              </HapticButton>

              <HapticButton
                variant="glass"
                icon={<Eye className="w-4 h-4 text-[#FF6B35]" />}
                onClick={() => setArOpen(true)}
                className="px-3 text-xs"
                title="Coba AR Virtual Try-On"
              />

              <HapticButton
                variant="glass"
                icon={<FileText className="w-4 h-4 text-amber-400" />}
                onClick={() => setTechPackOpen(true)}
                className="px-3 text-xs"
                title="Lembar B2B Tech Pack Sablon"
              />

              <HapticButton
                variant="primary"
                onClick={handleSaveToCart}
                className="px-4 text-xs font-bold"
              >
                Simpan
              </HapticButton>
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
                  <p className="text-[11px] text-[#FF6B35] font-semibold mt-1">
                    Rp {item.price.toLocaleString('id-ID')}
                  </p>
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
              <h2 className="text-lg font-bold font-['Syne']">Status Sablon DTF</h2>
              <Badge variant="production">Live Tracking</Badge>
            </div>

            <UserOrderTracker
              order={activeOrder}
              onPayNow={() => {
                setActiveOrder((prev) => ({ ...prev, status: 'PRINTING_DTF' }));
                triggerToast('Pembayaran QRIS Berhasil! Baju masuk ke antrean cetak DTF.');
              }}
            />

            {items.length > 0 && (
              <GlassCard className="p-4 bg-orange-500/10 border-orange-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Ada {items.length} Kaos di Keranjang</h4>
                  <p className="text-[10px] text-zinc-400">Total: Rp {getSubtotal().toLocaleString('id-ID')}</p>
                </div>
                <HapticButton
                  variant="primary"
                  onClick={() => setCheckoutOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold"
                >
                  Checkout
                </HapticButton>
              </GlassCard>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PROFIL */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 py-2">
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-orange-400 flex items-center justify-center text-white text-xl font-bold font-['Syne'] shadow-lg shadow-orange-500/25">
                H
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Syne']">Hengki Setiawan</h3>
                <p className="text-[11px] text-zinc-400">0882-0206-85076 • Tamalanrea, Makassar</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant={isProUser ? 'production' : 'success'}>
                    {isProUser ? 'PRO MEMBER' : 'Face ID Aktif'}
                  </Badge>
                </div>
              </div>
            </GlassCard>

            <SavedDesignsGallery
              onSelectDesign={() => setActiveTab('studio')}
              onNewDesign={() => {
                resetStudio();
                setActiveTab('studio');
              }}
            />

            <HapticButton
              variant="secondary"
              onClick={() => setBiometricPromptOpen(true)}
              className="w-full"
            >
              Masuk ke Admin Workshop
            </HapticButton>
          </div>
        )}
      </main>

      {/* CUSTOMIZER DRAWER */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Studio 3D Configurator"
        description="Pilih jenis pakaian, warna kain, dan stiker logo sablon DTF."
      >
        <div className="space-y-5 py-2">
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

          <div>
            <ColorSwatchPicker
              label="Warna Dasar Kain:"
              selectedHex={color}
              onSelect={(hex) => setColor(hex)}
            />
          </div>

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
            onClick={handleSaveToCart}
            className="w-full py-4 text-base"
          >
            Simpan Desain Kaos
          </HapticButton>
        </div>
      </BottomSheet>

      {/* CHECKOUT SHEET */}
      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onOrderSuccess={(newId) => {
          setActiveOrder({
            id: `ord-${Date.now()}`,
            orderNumber: `#${newId}`,
            apparelTitle: 'Kaos Heavyweight 280 GSM',
            colorName: 'Obsidian Black',
            size: 'L',
            quantity: 1,
            printWidthCm: 28.5,
            printHeightCm: 22.0,
            status: 'PENDING_DESIGN_APPROVAL',
            totalAmount: 160000,
            paymentMethod: 'QRIS Instant',
            deliveryMethod: 'Maxim Instant COD Makassar',
            createdAt: 'Baru saja',
          });
          setActiveTab('orders');
          triggerToast(`Pesanan #${newId} diajukan! Menunggu ACC Desain Admin.`);
        }}
      />

      {/* ADMIN WORKSHOP DRAWER */}
      <BottomSheet
        open={adminModeOpen}
        onOpenChange={setAdminModeOpen}
        title="Admin Mobile Workshop"
        description="ACC Desain & Kontrol Antrean Sablon DTF"
      >
        <AdminMobileDashboard
          onClose={() => setAdminModeOpen(false)}
          onNotify={(msg) => triggerToast(msg)}
        />
      </BottomSheet>

      {/* BIOMETRIC PROMPT */}
      {biometricPromptOpen && (
        <BiometricLockPrompt
          title="Verifikasi Workshop Admin"
          description="Gunakan Sidik Jari atau Face ID untuk mengonfirmasi identitas Admin Workshop Kaos Kami."
          onSuccess={() => {
            setBiometricPromptOpen(false);
            setAdminModeOpen(true);
          }}
          onCancel={() => setBiometricPromptOpen(false)}
        />
      )}

      {/* PRO UPGRADE MODAL & REWARDED ADS */}
      <ProUpgradeModal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        onUnlockPro={() => {
          setIsProUser(true);
          triggerToast('🎉 Fitur Kaos Kami Pro Suite Berhasil Diaktifkan!');
        }}
      />

      {/* B2B TECH PACK VIEWER SHEET */}
      <TechPackModal
        open={techPackOpen}
        onOpenChange={setTechPackOpen}
        data={{
          orderId: activeOrder.orderNumber,
          brandName: 'Kaos Kami Streetwear',
          designerPhone: '0882-0206-85076',
          apparelTitle: activeOrder.apparelTitle,
          colorName: activeOrder.colorName,
          colorHex: color,
          size: activeOrder.size,
          printWidthCm: activeOrder.printWidthCm,
          printHeightCm: activeOrder.printHeightCm,
          offsetFromCollarCm: 7.5,
          estimatedFilmCostIdr: 35000,
        }}
      />

      {/* Floating Native Toast */}
      <Toast
        show={!!toastMessage}
        message={toastMessage || ''}
        onClose={() => setToastMessage(null)}
      />

      {/* Bottom Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        orderBadgeCount={items.length > 0 ? items.length : 1}
      />
    </div>
  );
}
