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
  FileText,
  Lock,
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
  ApparelVectorIcon,
} from '@/components/ui';
import {
  initEdgeToEdgeStatusBar,
  haptic,
  pickOrCaptureDecalImage,
  listenNetworkStatus,
  shareCustomDesign,
  registerPushNotificationHandlers,
  openInAppBrowser,
} from '@/lib/bridge';
import { initOfflineSyncQueue, enqueueOfflineMutation, replaySupportedMutations } from '@/lib/offline/syncQueue';
import {
  getActiveOrderId,
  setActiveOrderId as persistActiveOrderId,
  getPendingPaymentUrl,
  setPendingPaymentUrl as persistPendingPaymentUrl,
  getStoredUserId,
  setDecalPxForDesign,
} from '@/lib/offline/persistentKeys';
import { mobileApiClient, API_BASE_URL } from '@/lib/api/mobileApiClient';
import { SHOP_WHATSAPP } from '@/lib/shop';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { useMobileStudioStore, ApparelType, MOBILE_APPAREL_META } from '@/store/useMobileStudioStore';
import { useMobileCartStore } from '@/store/useMobileCartStore';
import { useShallow } from 'zustand/shallow';
import {
  CheckoutSheet,
  UserOrderTrackerLive,
  TechPackModal,
} from '@/components/commerce';
import { openDuitkuPaymentModal, parseDuitkuReturnUrl } from '@/lib/payments/duitkuMobile';
import { AdminMobileDashboard } from '@/components/admin';
import { SavedDesignsGallery } from '@/components/offline';
import { BiometricLockPrompt } from '@/components/security';
import { DynamicIslandPreview } from '@/components/native';
import { optimizeDecalImageForMobile } from '@/lib/enhancers/imageOptimizerMobile';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { useSavedDesignsStore } from '@/lib/offline/savedDesignsStore';
import { STREETWEAR_SWATCHES } from '@/components/ui/ColorSwatchPicker';

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
  const [techPackOpen, setTechPackOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Cart & Offline Stores
  const { items, addItem, getItemCount, getSubtotal } = useMobileCartStore(
    useShallow((s) => ({
      items: s.items,
      addItem: s.addItem,
      getItemCount: s.getItemCount,
      getSubtotal: s.getSubtotal,
    }))
  );
  const saveDesign = useSavedDesignsStore((s) => s.saveDesign);
  // PERF decal: maxDimension = tier cap (low 512 / mid 1024 / high 2048) agar
  // HP low tak menampung tekstur 2048px di VRAM. Cermin anisotropy tier-aware
  // di MobileDecalLayerRenderer.
  const { maxTextureSize: decalTierCap } = useMobileDeviceTier();

  // Active User Order State — orderId server (cuid), persist antar restart.
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('kaoskami_active_order') : null;
    } catch {
      return null;
    }
  });
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('kaoskami_pending_payment') : null;
    } catch {
      return null;
    }
  });
  const [pendingInvoiceUrl, setPendingInvoiceUrl] = useState<string | null>(null);

  const persistActiveOrder = (orderId: string | null, urls?: { paymentUrl?: string | null; invoiceUrl?: string | null }) => {
    const paymentUrl = urls?.paymentUrl ?? null;
    setActiveOrderId(orderId);
    setPendingPaymentUrl(paymentUrl);
    setPendingInvoiceUrl(urls?.invoiceUrl ?? null);
    // Persisten via Preferences (native survive restart) + cermin localStorage.
    persistActiveOrderId(orderId).catch(() => {});
    persistPendingPaymentUrl(paymentUrl).catch(() => {});
    try {
      if (orderId) localStorage.setItem('kaoskami_active_order', orderId);
      else localStorage.removeItem('kaoskami_active_order');
      if (paymentUrl) localStorage.setItem('kaoskami_pending_payment', paymentUrl);
      else localStorage.removeItem('kaoskami_pending_payment');
    } catch {}
  };

  // Hidrasi sekali dari Preferences (native): localStorage WebView bisa kosong
  // padahal Preferences masih menyimpan order/user dari sesi lalu.
  useEffect(() => {
    (async () => {
      try {
        const [oid, pay] = await Promise.all([getActiveOrderId(), getPendingPaymentUrl()]);
        if (oid && !activeOrderId) setActiveOrderId(oid);
        if (pay && !pendingPaymentUrl) setPendingPaymentUrl(pay);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    apparelType,
    setApparelType,
    color,
    setColor,
    decalUrl,
    setDecalUrl,
    printWidthCm,
    printHeightCm,
    offsetFromCollarCm,
    decalDpi,
    resetStudio,
  } = useMobileStudioStore(
    useShallow((s) => ({
      apparelType: s.apparelType,
      setApparelType: s.setApparelType,
      color: s.color,
      setColor: s.setColor,
      decalUrl: s.decalUrl,
      setDecalUrl: s.setDecalUrl,
      printWidthCm: s.printWidthCm,
      printHeightCm: s.printHeightCm,
      offsetFromCollarCm: s.offsetFromCollarCm,
      decalDpi: s.decalDpi,
      resetStudio: s.resetStudio,
    }))
  );

  useEffect(() => {
    initEdgeToEdgeStatusBar();
    const cleanupNet = listenNetworkStatus((status) => {
      setIsOnline(status.connected);
      if (!status.connected) {
        setToastMessage('Mode Offline: Data tersimpan di memori HP.');
      }
    });
    // Replay antrean offline → server saat koneksi pulih (M5).
    // Batch dipisah per tipe di syncQueue: SAVE_DESIGN + SUBMIT_ORDER direplay
    // via replaySupportedMutations (mobileApiClient); UPDATE_CART tak punya
    // endpoint server (cart = persist lokal) → DILEWATI + toast (JANGAN throw).
    const cleanupSync = initOfflineSyncQueue(
      async (mutations) => {
        const userId = (await getStoredUserId()) || (typeof window !== 'undefined' ? localStorage.getItem('kaoskami_user_id') || '' : '');
        // Throw (bukan return) bila tanpa user agar antrean DIPERTAHANKAN —
        // return = dianggap sukses = antrean dihapus (kehilangan order).
        const { syncedDesigns, submittedOrders } = await replaySupportedMutations(mutations, { userId });
        if (syncedDesigns > 0 || submittedOrders > 0) {
          setToastMessage(
            `Sinkronisasi ${syncedDesigns} desain${submittedOrders > 0 ? ` + ${submittedOrders} pesanan` : ''} offline berhasil!`
          );
        }
        // Replay server bersifat idempoten (LWW-update per judul; checkout
        // 502 fail-closed = orderId PENDING) sehingga pengulangan aman.
      },
      {
        onUnsupported: (skipped) => {
          setToastMessage(
            `${skipped.length} antrean ${skipped[0]?.type} dilewati (belum didukung sync) — desain tetap tersimpan di HP.`
          );
        },
      }
    );
    // Registrasi token push → UserDevice server (M10).
    registerPushNotificationHandlers(
      async (token) => {
        const userId = (await getStoredUserId()) || (typeof window !== 'undefined' ? localStorage.getItem('kaoskami_user_id') || undefined : undefined);
        await mobileApiClient.registerPushToken(token, userId);
      },
      // Tap push (status sablon lunas/selesai) → tab Pesanan agar user
      // langsung lihat tracker, bukan diam di tab aktif.
      () => {
        setActiveTab('orders');
      }
    );
    // Deep link kaoskami:// (M9): tile QS & return pembayaran.
    // ANTI OPEN-REDIRECT (Sep 2026): validasi KETAT via URL parse —
    // protocol wajib `kaoskami:`, host+path wajib masuk allowlist di bawah.
    // `startsWith` longgar SENGAJA dihapus (lolos `kaoskami://studio-evil`,
    // `kaoskami://payment@evil.com`, dsb). INVARIAN: isi deep-link TAK PERNAH
    // dipakai sebagai target navigasi/browser — hanya switch tab internal +
    // baca query orderId/status via parseDuitkuReturnUrl. Host tak dikenal →
    // abaikan diam-diam (tanpa toast/navigasi).
    // Allowlist:
    //   kaoskami://studio                     → tab Studio
    //   kaoskami://auth/callback               → tutup browser + tab Profil
    //   kaoskami://payment[/callback]?…        → tab Pesanan + toast lunas
    //     (query: orderId|merchantOrderId + status|resultCode, cth resultCode=00)
    // UJI appUrlOpen (manual, tanpa cap sync/build di sini): skema didaftarkan
    // di ios/App/App/Info.plist (CFBundleURLTypes → kaoskami) + Android
    // intent-filter; verifikasi via:
    //   xcrun simctl openurl booted "kaoskami://studio" (→ tab Studio)
    //   xcrun simctl openurl booted "kaoskami://auth/callback" (→ tutup browser + tab Profil)
    //   xcrun simctl openurl booted "kaoskami://payment?orderId=X&status=COMPLETED" (→ tab Pesanan + toast lunas)
    //   xcrun simctl openurl booted "kaoskami://payment/callback?merchantOrderId=X&resultCode=00" (→ sama, varian Duitku)
    // Status payment: COMPLETED → pending dibersihkan; CANCELLED → toast batal; PENDING/UNKNOWN → pending DIPERTAHANKAN + toast generik.
    let appUrlListener: { remove: () => void } | null = null;
    try {
      CapacitorApp.addListener('appUrlOpen', async (data: { url: string }) => {
        const url = data.url || '';
        // Parse ketat: tolak skema asing & URL malformed (open-redirect safe).
        let host = '';
        let path = '';
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'kaoskami:') return;
          host = (parsed.hostname || '').toLowerCase();
          path = (parsed.pathname || '').replace(/\/+$/, '') || '/';
        } catch {
          return;
        }
        if (host === 'studio' && (path === '/' || path === '')) {
          setActiveTab('studio');
        } else if (host === 'auth' && path === '/callback') {
          // Kembali dari login Google: tutup browser + segarkan status login.
          try {
            const { closeInAppBrowser } = await import('@/lib/bridge/browser');
            await closeInAppBrowser();
          } catch {}
          setToastMessage('Login berhasil. Memuat akun…');
          setActiveTab('profile');
        } else if (host === 'payment' && (path === '/' || path === '/callback')) {
          try {
            // parseDuitkuReturnUrl: orderId|merchantOrderId + status|resultCode
            // (00=lunas → COMPLETED, 01 → PENDING, 02/FAILED/EXPIRED → CANCELLED).
            const { orderId: oid, status: st } = parseDuitkuReturnUrl(url);
            if (oid) {
              persistActiveOrder(oid);
              setActiveTab('orders');
              if (st === 'COMPLETED' || st === 'CANCELLED') {
                persistPendingPaymentUrl(null).catch(() => {});
                try { localStorage.removeItem('kaoskami_pending_payment'); } catch {}
                setPendingPaymentUrl(null);
              }
              setToastMessage(
                st === 'COMPLETED' ? 'Pembayaran sukses. Pesanan masuk produksi.' :
                st === 'CANCELLED' ? 'Pembayaran dibatalkan.' :
                st === 'PENDING' ? 'Pembayaran menunggu konfirmasi. Status diperbarui otomatis.' :
                'Kembali dari pembayaran. Status diperbarui otomatis.'
              );
            } else {
              setActiveTab('orders');
              setToastMessage('Kembali dari pembayaran. Status diperbarui otomatis.');
            }
          } catch {
            setActiveTab('orders');
          }
        }
        // Host/path lain → abaikan (anti open-redirect: tanpa fallback navigasi).
      }).then((h) => {
        appUrlListener = h;
      }).catch(() => {});
    } catch {}
    // Keyboard menutupi input checkout → scroll elemen aktif ke pandangan (M2).
    // iOS: keyboardWillShow; Android: Will+Did fire hampir bersamaan
    // (docs Capacitor Keyboard) — dengar keduanya agar scroll tak miss di HP.
    // setResizeMode HANYA iOS (Android diatur manifest adjustResize + config
    // resizeOnFullScreen) — panggil aman di try/catch.
    let kbShow: { remove: () => void } | null = null;
    let kbDidShow: { remove: () => void } | null = null;
    try {
      const scrollActiveIntoView = () => {
        setTimeout(() => {
          (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        }, 100);
      };
      Keyboard.addListener('keyboardWillShow', scrollActiveIntoView).then((h) => {
        kbShow = h;
      }).catch(() => {});
      Keyboard.addListener('keyboardDidShow', scrollActiveIntoView).then((h) => {
        kbDidShow = h;
      }).catch(() => {});
      Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    } catch {}
    return () => {
      cleanupNet();
      cleanupSync();
      try { appUrlListener?.remove(); } catch {}
      try { kbShow?.remove(); } catch {}
      try { kbDidShow?.remove(); } catch {}
    };
  }, []);

  // Android backButton: tutup sheet/Browser DULU sebelum keluar (Capacitor 8:
  // listener ini menonaktifkan default — wajib handle manual + exitApp).
  // Urutan: AR → Browser bayar → checkout → customizer/admin/techpack/biometrik
  // → tab non-home kembali ke home → baru exitApp.
  useEffect(() => {
    let h: { remove: () => void } | null = null;
    try {
      CapacitorApp.addListener('backButton', async () => {
        try {
          if (arOpen) {
            setArOpen(false);
            return;
          }
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch {}
          if (checkoutOpen) {
            setCheckoutOpen(false);
            return;
          }
          if (sheetOpen) {
            setSheetOpen(false);
            return;
          }
          if (adminModeOpen) {
            setAdminModeOpen(false);
            return;
          }
          if (techPackOpen) {
            setTechPackOpen(false);
            return;
          }
          if (biometricPromptOpen) {
            setBiometricPromptOpen(false);
            return;
          }
          if (activeTab !== 'home') {
            setActiveTab('home');
            return;
          }
          await CapacitorApp.exitApp();
        } catch {}
      }).then((lh) => {
        h = lh;
      }).catch(() => {});
    } catch {}
    return () => {
      try { h?.remove(); } catch {}
    };
  }, [activeTab, sheetOpen, checkoutOpen, adminModeOpen, techPackOpen, arOpen, biometricPromptOpen]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleUploadDecal = async () => {
    haptic.tapMedium();
    const rawDataUrl = await pickOrCaptureDecalImage();
    if (rawDataUrl) {
      try {
        const st = useMobileStudioStore.getState();
        // Floor 512: tier no-webgl (maxTextureSize 0) tak boleh jadi cap 0px.
        const { optimizedUrl, dpi, width } = await optimizeDecalImageForMobile(
          rawDataUrl,
          Math.max(512, decalTierCap),
          st.printWidthCm
        );
        setDecalUrl(optimizedUrl);
        st.setDecalDpi(dpi);
        // decal_px PER-DESAIN (audit HIGH): kunci = apparel+warna aktif saat
        // upload; disalin ke ID desain final saat Simpan (handleSaveToCart).
        // Juga tulis global lama sekali (migrasi pembaca lawas).
        const decalKey = `pending:${st.apparelType}:${st.color}`;
        try {
          await setDecalPxForDesign(decalKey, width);
        } catch {}
        try {
          localStorage.setItem('kaoskami_decal_px', String(width));
        } catch {}
        haptic.success();
        triggerToast(
          dpi > 0
            ? `Logo siap (${dpi} DPI pada ${st.printWidthCm.toFixed(1)}cm)!`
            : 'Logo siap (DPI menyusul setelah skala dikunci).'
        );
      } catch {
        setDecalUrl(rawDataUrl);
        useMobileStudioStore.getState().setDecalDpi(null);
        triggerToast('Logo sablon berhasil diproyeksikan!');
      }
    }
  };

  // Katalog server (/api/mobile/catalog, ETag hemat kuota) + fallback statis.
  const [serverCatalog, setServerCatalog] = useState<import('@/lib/api/mobileApiClient').MobileCatalogCategory[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const etag = localStorage.getItem('kaoskami_catalog_etag') || undefined;
        const cached = localStorage.getItem('kaoskami_catalog_cache');
        const res = await mobileApiClient.getCatalog(etag);
        if (res.notModified && cached) {
          setServerCatalog(JSON.parse(cached));
        } else if (res.data?.categories) {
          setServerCatalog(res.data.categories);
          try {
            localStorage.setItem('kaoskami_catalog_cache', JSON.stringify(res.data.categories));
            if (res.etag) localStorage.setItem('kaoskami_catalog_etag', res.etag);
          } catch {}
        } else if (cached) {
          // Offline total (timeout/HTTP error): pakai cache terakhir agar
          // aplikasi tetap bisa dipakai lihat katalog + pesan (sync saat online).
          try {
            setServerCatalog(JSON.parse(cached));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // NOTE (sinkron aset Sep 2026): STUDIO_MODEL_MAP lama DIHAPUS — diganti
  // MOBILE_APPAREL_META (SSOT mockupEnabled/orderable). Alasan: map
  // `crewneck: 'tshirt'` = mesh salah (tak jujur); kini slug dikenal dipakai
  // apa adanya + picker mengunci !mockupEnabled.

  // Harga fallback = harga web APPAREL_CATALOG (server tetap sumber kebenaran).
  // Kunci jujur (orderable false) vs mockup (mockupEnabled):
  // - crewneck: picker TERKUNCI (mockupEnabled false) — pilih Sweater Pack
  //   (mesh & jahitan sama); order ikut terkunci.
  // - sweater/cap: MOCKUP 3D AKTIF di studio HP (MobileSweaterModel/
  //   MobileCapModel), order TETAP diblokir (orderable false cermin web;
  //   save-to-cart & checkout menolak, server validasi ulang).
  // - pants/shorts: mockup 3D AKTIF di studio HP, order TETAP diblokir.
  const apparelOptions: { key: ApparelType; label: string; gsm: string; price: number }[] = [
    { key: 'tshirt', label: 'Kaos Polos & Custom Kaos Kami', gsm: 'Combed 24s / 30s', price: 79000 },
    { key: 'longsleeve', label: 'Kaos Lengan Panjang', gsm: 'Combed 24s', price: 89000 },
    { key: 'crewneck', label: 'Crewneck Sweater', gsm: 'Baby Terry / Fleece', price: 139000 },
    { key: 'hoodie', label: 'Hoodie Jumper Kaos Kami', gsm: 'Fleece 280 GSM', price: 159000 },
    { key: 'shirt', label: 'Coach Jacket Kaos Kami', gsm: 'Taslan Premium', price: 189000 },
    { key: 'cap', label: 'Topi Kaos Kami', gsm: 'Twill / Kanvas', price: 45000 },
    { key: 'pants', label: 'Celana Panjang Cargo', gsm: 'Katun Twill', price: 0 },
    { key: 'shorts', label: 'Celana Pendek Chino', gsm: 'Katun Twill / Denim', price: 0 },
  ];

  const handleSaveToCart = () => {
    // Penjaga orderable (client-side ≈400): item terkunci JANGAN masuk
    // keranjang — pesan jujur, bukan mesh salah. Server tetap validasi ulang.
    const meta = MOBILE_APPAREL_META[apparelType];
    if (!meta?.orderable) {
      triggerToast(meta?.lockedMessage || 'Apparel ini belum bisa dipesan di HP.');
      return;
    }
    const selected = apparelOptions.find((a) => a.key === apparelType) || apparelOptions[0];
    // Harga SERVER otoritatif: katalog live bila ada, else fallback statis.
    // Sablon dihitung ulang engine server (calculate6VariablePrice) — JANGAN
    // +35000 hardcode di HP (35000 = tier A3 maks; cetakan kecil jadi kemahalan
    // di payload sync sebelum server menimpa).
    const serverBasePrice =
      serverCatalog?.find((c) => c.slug === apparelType)?.basePriceIdr ??
      (apparelType === 'sweater'
        ? serverCatalog?.find((c) => c.slug === 'crewneck')?.basePriceIdr
        : undefined) ??
      selected.price;
    // Snapshot gizmo per-item (K-A lanjutan): bekukan transform studio SAAT
    // INI ke item cart (kontrak DecalLayerSchema: x/y/scale/rotation/
    // targetSide, clamp batas Zod ±0.75 / 0.02–1.5 / ±180). Checkout memakai
    // snapshot per-item, BUKAN transform global studio yang sedang tampil.
    const gizmo = useMobileStudioStore.getState();
    const clampN = (v: number, lo: number, hi: number) =>
      Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
    const snapX = clampN(gizmo.decalPosition?.[0] ?? 0, -0.75, 0.75);
    const snapY = clampN(gizmo.decalPosition?.[1] ?? 0.04, -0.75, 0.75);
    const snapScale = clampN(gizmo.decalScale?.[0] ?? 0.22, 0.02, 1.5);
    const snapRot = clampN(gizmo.decalRotation ?? 0, -180, 180);
    const snapSide = (gizmo.activeFace === 'back' ? 'back' : 'front') as 'front' | 'back';
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
      decalX: snapX,
      decalY: snapY,
      decalScale: snapScale,
      decalRotation: snapRot,
      decalTargetSide: snapSide,
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
    // Salin decal_px pending → kunci ID desain baru (PER-DESAIN).
    try {
      const newest = useSavedDesignsStore.getState().designs[0];
      const pendingKey = `pending:${apparelType}:${color}`;
      let px = 0;
      try {
        const map = JSON.parse(localStorage.getItem('kaoskami_decal_px_map') || '{}');
        px = Number(map[pendingKey] || localStorage.getItem('kaoskami_decal_px') || 0);
      } catch {}
      if (newest && px > 0) {
        void setDecalPxForDesign(newest.id, px);
      }
    } catch {}

    // Antrekan sync offline → terkirim otomatis saat online (butuh userId pasca-checkout).
    try {
      enqueueOfflineMutation({
        type: 'SAVE_DESIGN',
        payload: {
          designs: [
            {
              clientId: `c-${Date.now()}`,
              title: `${selected.label} Custom`,
              apparelSlug: apparelType,
              colorHex: color,
              colorName: 'Custom Color',
              size: 'L',
              decals: [],
              calculatedPriceIdr: serverBasePrice,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      });
    } catch {}

    setSheetOpen(false);
    triggerToast('Desain disimpan ke keranjang & galeri offline!');
  };

  return (
    <div className="flex-1 flex flex-col min-h-dvh bg-canvas text-text-primary select-none transition-colors">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-600/90 text-black px-4 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode Offline: Desain & keranjang tersimpan di HP Anda</span>
        </div>
      )}

      {/* AR Camera Passthrough Mode */}
      {arOpen && <ARPreviewStage onClose={() => setArOpen(false)} onNotify={(m) => triggerToast(m)} />}

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
            <Badge variant="success" pulse={isOnline}>
              {isOnline ? 'Workshop Live' : 'Offline'}
            </Badge>
          </div>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom))] flex flex-col">
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
                Pilih bahan katun combed adem, pasang desain/logo DTF kualitas tajam, dan simulasikan langsung lewat mockup 3D.
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                <p className="text-[11px] text-zinc-400 mt-0.5">Katun Combed 24s / 30s</p>
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
                <p className="text-[11px] text-zinc-400 mt-0.5">Live Sablon & Bayar QRIS</p>
              </GlassCard>
            </div>

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
          <div className="flex-1 flex flex-col h-[calc(100dvh-140px)] relative">
            {/* 3D Canvas Stage */}
            <div className="flex-1 relative rounded-3xl overflow-hidden border border-border-subtle shadow-2xl bg-canvas transition-colors">
              <CanvasStageMobile />
              <StudioControlOverlay onNotify={(m) => triggerToast(m)} />
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-['Syne']">Katalog Apparel Makassar</h2>
              {serverCatalog && (
                <Badge variant="success">Live Server</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(serverCatalog && serverCatalog.length > 0
                ? serverCatalog.map((c) => {
                    // JUJUR: slug dikenal → pakai slug itu sendiri (terkunci
                    // tetap terkunci, JANGAN fallback tshirt = mesh salah);
                    // slug asing → tshirt (legacy aman).
                    const known = (MOBILE_APPAREL_META as Record<string, unknown>)[c.slug] !== undefined;
                    return {
                      key: (known ? c.slug : 'tshirt') as ApparelType,
                      label: c.name,
                      gsm: c.weightGsm || '',
                      price: c.basePriceIdr,
                      slug: c.slug,
                    };
                  })
                : apparelOptions.map((item) => ({ ...item, slug: item.key }))
              ).map((item) => {
                const m = MOBILE_APPAREL_META[item.key];
                const locked = !m?.orderable;
                const isCap = item.key === 'cap';
                return (
                <GlassCard
                  key={item.slug + item.label}
                  interactive={!locked}
                  onClick={() => {
                    if (locked) {
                      triggerToast(m?.lockedMessage || 'Segera di HP.');
                      return;
                    }
                    setApparelType(item.key);
                    setActiveTab('studio');
                    triggerToast(`${item.label} dipilih di Studio 3D!`);
                  }}
                  className={`p-3.5 text-left ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="w-full aspect-square rounded-2xl bg-zinc-800/80 mb-2.5 flex items-center justify-center text-zinc-500 relative">
                    <ApparelVectorIcon type={item.key} className="w-10 h-10 opacity-70 text-zinc-300" />
                    {locked && (
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide border ${
                        isCap
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-zinc-900/90 text-zinc-400 border-zinc-700'
                      }`}>
                        {isCap ? 'SEGERA' : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> SEGERA DI HP
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white truncate font-['Syne']">{item.label}</h4>
                  <p className="text-[11px] text-zinc-400">{item.gsm}</p>
                  <p className="text-[11px] text-[#FF6B35] font-semibold mt-1">
                    {item.key === 'pants' || item.key === 'shorts' || item.key === 'sweater' || item.key === 'cap' ? 'Segera' : `Rp ${item.price.toLocaleString('id-ID')}`}
                  </p>
                  {locked && (
                    <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                      {item.key === 'pants'
                        ? 'Mockup 3D di studio HP — pemesanan SEGERA.'
                        : item.key === 'shorts'
                        ? 'Mockup 3D di studio HP — pemesanan SEGERA.'
                        : item.key === 'sweater'
                        ? 'Mockup 3D di studio HP — pemesanan SEGERA.'
                        : item.key === 'cap'
                        ? 'Mockup 3D di studio HP — pemesanan SEGERA.'
                        : 'Pilih Sweater Pack (mesh sama).'}
                    </p>
                  )}
                </GlassCard>
                );
              })}
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

            {/* Dynamic Island Live Activity Simulation */}
            <div className="py-1">
              <p className="text-[10px] text-zinc-500 text-center mb-1.5 uppercase font-mono tracking-wider">
                Simulasi iOS Dynamic Island & Lock Screen
              </p>
              <DynamicIslandPreview
                orderNumber={activeOrderId ? `#${activeOrderId.slice(-6).toUpperCase()}` : '#-'}
                apparelTitle="Pesanan Sablon DTF"
              />
            </div>

            {/* Live Order Tracker — polling /api/mobile/orders/:id/status */}
            {activeOrderId ? (
              <>
                <UserOrderTrackerLive
                  orderId={activeOrderId}
                  paymentUrl={pendingPaymentUrl ?? undefined}
                  onNotify={(msg) => triggerToast(msg)}
                />
                {pendingPaymentUrl && (
                  <HapticButton
                    variant="primary"
                    onClick={() => openDuitkuPaymentModal(pendingPaymentUrl)}
                    className="w-full py-3 text-xs font-bold"
                  >
                    Lanjutkan Pembayaran
                  </HapticButton>
                )}
                {!pendingPaymentUrl && pendingInvoiceUrl && (
                  <HapticButton
                    variant="secondary"
                    onClick={() => openDuitkuPaymentModal(pendingInvoiceUrl)}
                    className="w-full py-3 text-xs font-bold"
                  >
                    Buka Invoice (Bayar Manual via WA)
                  </HapticButton>
                )}
              </>
            ) : (
              <GlassCard className="p-5 text-center space-y-2">
                <p className="text-xs font-bold text-white">Belum ada pesanan aktif</p>
                <p className="text-[11px] text-zinc-400">
                  Desain di Studio 3D, masukkan ke keranjang, lalu checkout — status sablon terpantau di sini.
                </p>
                <HapticButton
                  variant="primary"
                  onClick={() => setActiveTab('studio')}
                  className="w-full py-2.5 text-xs font-bold"
                >
                  Mulai Desain
                </HapticButton>
              </GlassCard>
            )}

            {items.length > 0 && (
              <GlassCard className="p-4 bg-orange-500/10 border-orange-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Ada {items.length} Kaos di Keranjang</h4>
                  <p className="text-[10px] text-zinc-400">Estimasi — dihitung ulang server: Rp {getSubtotal().toLocaleString('id-ID')}</p>
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
                <h3 className="text-sm font-bold text-white font-['Syne']">Pelanggan Kaos Kami</h3>
                <p className="text-[11px] text-zinc-400">Mode tamu • Tamalanrea, Makassar</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="success">Face ID Aktif</Badge>
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

            {/* Google OAuth & Akun Login Card */}
            <GlassCard className="p-4 space-y-3 border-zinc-800 bg-zinc-900/60">
              <div>
                <h4 className="text-xs font-bold text-white font-['Syne']">Autentikasi Akun Cloud</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Sinkronkan desain 3D & riwayat pesanan dengan akun web Kaos Kami
                </p>
              </div>

              <HapticButton
                variant="glass"
                hapticStyle="tapMedium"
                onClick={() => {
                  haptic.tap();
                  // Callback kembali via deeplink kaoskami://auth/callback
                  // (ditangani appUrlOpen → sesi dibaca ulang).
                  openInAppBrowser(`${API_BASE_URL}/api/auth/signin/google?callbackURL=kaoskami://auth/callback`);
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 border-zinc-700/80 hover:border-[#FF6B35]/60 text-xs font-bold"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google (OAuth)</span>
              </HapticButton>
            </GlassCard>

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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {apparelOptions.map((opt) => {
                const isSelected = apparelType === opt.key;
                // KEPUTUSAN FALLBACK (jujur, bukan mesh salah): item
                // !mockupEnabled TAK BISA dipilih — kunci + pesan (kini hanya
                // crewneck: pilih Sweater Pack, mesh sama). Sweater/cap TIDAK
                // reuse mesh hoodie/tshirt — MobileSweaterModel/MobileCapModel
                // render mesh sendiri (mockup saja, order tetap diblokir).
                // Pants/shorts mockupEnabled TRUE (orderable FALSE) → bisa dipilih
                // di sini, tapi save-to-cart & checkout tetap menolak.
                const meta = MOBILE_APPAREL_META[opt.key];
                const locked = !meta?.mockupEnabled;
                const isCap = opt.key === 'cap';
                return (
                  <button
                    key={opt.key}
                    disabled={locked}
                    onClick={() => {
                      if (locked) {
                        triggerToast(meta?.lockedMessage || 'Segera di HP.');
                        return;
                      }
                      haptic.selection();
                      setApparelType(opt.key);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      locked
                        ? 'bg-zinc-900/60 border-zinc-800 text-zinc-500 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-600/30'
                          : 'bg-zinc-800/80 text-zinc-400'
                      }`}>
                        <ApparelVectorIcon type={opt.key} className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          {opt.label}
                          {locked && (
                            <span className={`px-1.5 py-px rounded-full text-[8px] font-extrabold border ${
                              isCap
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}>
                              {isCap ? 'SEGERA' : 'SEGERA DI HP'}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-500">{opt.gsm}</p>
                      </div>
                    </div>
                    {isSelected && !locked && <Check className="w-4 h-4 text-[#FF6B35] shrink-0" />}
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
                {decalUrl
                  ? `${printWidthCm}x${printHeightCm} cm • ${useMobileStudioStore.getState().decalDpi ?? '…'} DPI`
                  : 'Belum Ada'}
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
        onOrderSuccess={(orderId, urls) => {
          persistActiveOrder(orderId, urls);
          setActiveTab('orders');
          triggerToast(
            urls.paymentUrl
              ? 'Pesanan dibuat! Selesaikan pembayaran QRIS.'
              : 'Pesanan tersimpan! Pantau status di tab Pesanan.'
          );
        }}
        onNotify={(msg) => triggerToast(msg)}
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

      {/* B2B TECH PACK VIEWER SHEET — tetap HTML (tanpa lib PDF).
          Nilai dari gizmo/store + cart nyata; fallback jujur bila kosong. */}
      <TechPackModal
        open={techPackOpen}
        onOpenChange={setTechPackOpen}
        data={(() => {
          // Item cart yang sama dengan studio tampil (apparel+warna) → size &
          // biaya sablon nyata; else item terbaru; else fallback jujur.
          const match =
            items.find(
              (it) => it.apparelType === apparelType && it.colorHex.toLowerCase() === color.toLowerCase()
            ) ?? items[0];
          const swatchName = STREETWEAR_SWATCHES.find(
            (s) => s.hex.toLowerCase() === color.toLowerCase()
          )?.name;
          return {
            orderId: activeOrderId ?? match?.id ?? '-',
            brandName: 'Kaos Kami Makassar',
            designerPhone: SHOP_WHATSAPP,
            apparelTitle:
              apparelOptions.find((a) => a.key === apparelType)?.label ?? match?.apparelTitle ?? 'Kaos Polos & Custom Kaos Kami',
            colorName: match?.colorName || swatchName || 'Custom',
            colorHex: color,
            // Store belum punya peta Pantone → biarkan kosong (modal cetak '-').
            colorPantone: undefined,
            decalDpi,
            size: match?.size ?? 'L',
            printWidthCm: match?.printWidthCm ?? printWidthCm,
            printHeightCm: match?.printHeightCm ?? printHeightCm,
            offsetFromCollarCm,
            // Biaya film = sablonPrice cart nyata; 35000 hanya fallback tier A3
            // maks (server hitung ulang via calculate6VariablePrice).
            estimatedFilmCostIdr: match?.sablonPrice ?? 35000,
          };
        })()}
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
        orderBadgeCount={items.length}
      />
    </div>
  );
}
