"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  MAKASSAR_DELIVERY_OPTIONS,
  MAKASSAR_SUBDISTRICTS,
  WORKSHOP_LOCATION,
  isMakassarAddress,
  type DeliveryMethod,
} from "@/lib/shipping/deliveryOptions";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { APPAREL_CATALOG, PRODUCT_COLORS, type ApparelType } from "@/lib/constants";
import {
  X,
  ShoppingBag,
  MapPin,
  Truck,
  CreditCard,
  Phone,
  User,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Package,
  Store,
  Lock,
  Sparkles,
  ExternalLink,
  Shirt,
  Clock,
  Zap,
  Crosshair,
  Navigation,
} from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { AuthModal } from "@/components/ui/AuthModal";
import { useCartStore } from "@/store/useCartStore";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { fetchJson } from "@/lib/fetchJson";
import { fetchServerPriceMap, formatIdr } from "@/lib/cartPriceRefresh";
import { getMasterDataUrl, isHttpsMasterUrl } from "@/lib/imageEditPipeline";
import { normalizePhoneId } from "@/lib/phone";
import { getClosedQueueNotice } from "@/lib/shopHours";
import { DirectQrisModal } from "@/components/ui/DirectQrisModal";
import { LocationPickerModal, type PickedLocation } from "@/components/maps/LocationPickerModal";
import { Z_CLASS_MODAL } from "@/lib/zIndex";

/** Notice antrean saat workshop tutup (09.00–21.00 WITA) — tak blokir checkout. */
const ShopClosedNotice: React.FC = () => {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    try {
      setMsg(getClosedQueueNotice(new Date()));
    } catch {
      setMsg(null);
    }
  }, []);
  if (!msg) return null;
  return (
    <p className="text-center font-sans text-[10px] text-amber-400">
      {msg}
    </p>
  );
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutMode?: "custom-3d" | "cart";
}

// P0-2: Idempotency-Key UNIK per NIAT checkout, BUKAN per fetch.
// Key yang dibuat ulang tiap klik membuat double-click/timeout-retry menjadi
// dua order berbeda. Key disimpan di sessionStorage agar retry setelah refresh
// tetap memakai klaim yang sama; dibersihkan setelah order benar-benar selesai.
const CHECKOUT_IDEM_STORAGE_KEY = "kk_checkout_idempotency_key";
function newIdempotencyKey(): string {
  try {
    const u = globalThis?.crypto?.randomUUID?.();
    if (typeof u === "string" && u.length >= 8) return u;
  } catch {}
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
function getCheckoutIdempotencyKey(): string {
  try {
    const existing = window.sessionStorage.getItem(CHECKOUT_IDEM_STORAGE_KEY);
    if (existing && /^[A-Za-z0-9\-_.:]{8,128}$/.test(existing)) return existing;
    const fresh = newIdempotencyKey();
    window.sessionStorage.setItem(CHECKOUT_IDEM_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return newIdempotencyKey();
  }
}
function clearCheckoutIdempotencyKey(): void {
  try {
    window.sessionStorage.removeItem(CHECKOUT_IDEM_STORAGE_KEY);
  } catch {}
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  checkoutMode = "custom-3d",
}) => {
  const {
    activeApparel,
    selectedColor,
    activeColorName,
    selectedSize,
    decals,
    materialFinish,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      selectedColor: s.selectedColor,
      activeColorName: s.activeColorName,
      selectedSize: s.selectedSize,
      decals: s.decals,
      materialFinish: s.materialFinish,
    }))
  );

  const { items: cartItems, getTotalPrice: getCartTotalPrice, clearCart } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      getTotalPrice: s.getTotalPrice,
      clearCart: s.clearCart,
    }))
  );

  const isCartCheckout = checkoutMode === "cart" && cartItems.length > 0;

  // Sesi akun pelanggan & modal autentikasi opsional
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setIsAuthModalOpen(false);
    }
  }, [session?.user]);

  // Modal Direct QRIS 100% In-App (iPaymu)
  const [directQrisData, setDirectQrisData] = useState<{
    orderId: string;
    orderNumber: string;
    amountIdr: number;
    qrImage?: string;
    qrString?: string;
    invoiceUrl?: string;
  } | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [useCustomSizeBreakdown, setUseCustomSizeBreakdown] = useState(false);
  const [sizeDistribution, setSizeDistribution] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 1,
    XL: 0,
    XXL: 0,
  });

  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PICKUP");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sessionUser = session?.user as any;
  const userRole = sessionUser?.role || "CUSTOMER";
  const isAdmin =
    ["ADMIN", "SUPER_ADMIN"].includes(userRole) ||
    sessionUser?.email === "hengkishadow@gmail.com" ||
    sessionUser?.email === "admin@kaoskami.biz.id";

  const [adminBypassActive, setAdminBypassActive] = useState(false);
  const [adminDirectConfirm, setAdminDirectConfirm] = useState(true);

  const cleanPhone = (p?: string | null) => (p || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
  const isAccountPhoneVerified =
    Boolean(sessionUser?.phoneVerified) &&
    Boolean(sessionUser?.phoneNumber) &&
    Boolean(phoneNumber) &&
    cleanPhone(phoneNumber) === cleanPhone(sessionUser?.phoneNumber);

  const [district, setDistrict] = useState(MAKASSAR_SUBDISTRICTS[0] || "Tallo");
  const [fullAddress, setFullAddress] = useState("");
  const [courierNotes, setCourierNotes] = useState("");

  // Waktu produksi workshop default REGULER (tanpa beban surcharge ke pembeli)
  const turnaroundTier: "REGULER" = "REGULER";
  const turnaroundSurcharge = 0;

  const [couponCode, setCouponCode] = useState("");

  interface QuoteOption {
    key: string;
    courier: string;
    service: string;
    cost: number;
    etd: string;
    // #20=A: "live" dicabut — tarif hanya dari master 514 kota atau tabel zona.
    source: "zone" | "master";
    zoneId?: string;
    courierCode?: string;
    serviceCode?: string;
  }
  const [destQuery, setDestQuery] = useState("");
  const [locSuggest, setLocSuggest] = useState<{ postalCode: string; label: string }[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedPostal, setSelectedPostal] = useState("");
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [quoteSource, setQuoteSource] = useState<"zone" | "master" | "">("");
  const [selectedQuoteKey, setSelectedQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartPriceNotice, setCartPriceNotice] = useState<{ oldTotal: number; newTotal: number; diff: number } | null>(null);
  const [cartPriceChecking, setCartPriceChecking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const [isClient, setIsClient] = useState(false);
  const [submittedDesignReview, setSubmittedDesignReview] = useState<{
    orderNumber: string;
    orderId: string;
  } | null>(null);

  const isCustomOrder =
    checkoutMode === "custom-3d" ||
    (isCartCheckout &&
      cartItems.some(
        (it) => it.isCustom || (Array.isArray(it.decals) && it.decals.length > 0)
      ));

  // Amandemen Bab 56 A2 (V2 2-tahap): 1 = Alamat+kurir (Kontak + Metode +
  // Alamat GPS + ongkir), 2 = Bayar (ringkasan + QRIS DirectQrisModal +
  // polling + repay via komponen existing). Semua state form tetap di
  // komponen ini sehingga bolak-balik tahap TIDAK menghilangkan isian.
  const [step, setStep] = useState<1 | 2>(1);
  const bodyScrollRef = useRef<HTMLFormElement>(null);

  const scrollBodyTop = () => {
    try {
      bodyScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = 0;
    }
  };

  // Reset ke Tahap 1 setiap modal dibuka (fresh checkout); bolak-balik
  // di dalam satu sesi open dipertahankan (tidak di-reset).
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [addressDetectionNotice, setAddressDetectionNotice] = useState<string | null>(null);

  // Prefill otomatis saat akun login terdeteksi & auto-deteksi alamat Makassar
  useEffect(() => {
    if (session?.user && isOpen) {
      if (!recipientName && session.user.name) {
        setRecipientName(session.user.name);
      }
      if (!email && session.user.email) {
        setEmail(session.user.email);
      }
      const userPhone = (session.user as any)?.phoneNumber;
      if (!phoneNumber && userPhone) {
        setPhoneNumber(userPhone);
      }

      // Ambil alamat tersimpan akun untuk pendeteksian otomatis wilayah
      void (async () => {
        try {
          const res = await fetch("/api/user/profile");
          const data = await res.json().catch(() => null);
          if (data?.success && data?.user?.addresses?.length > 0) {
            const savedAddr = data.user.addresses.find((a: any) => a.isDefault) || data.user.addresses[0];
            if (savedAddr) {
              if (savedAddr.fullAddress) setFullAddress(savedAddr.fullAddress);
              if (savedAddr.recipientName) setRecipientName(savedAddr.recipientName);
              if (savedAddr.phoneNumber) setPhoneNumber(savedAddr.phoneNumber);
              if (savedAddr.district && MAKASSAR_SUBDISTRICTS.includes(savedAddr.district)) {
                setDistrict(savedAddr.district);
              }

              // Sinkronisasi otomatis titik koordinat GPS jika ada di catatan alamat
              if (savedAddr.notes) {
                const gpsMatch =
                  savedAddr.notes.match(/\[GPS:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/) ||
                  savedAddr.notes.match(/google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
                  savedAddr.notes.match(/(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})/);
                if (gpsMatch) {
                  const lat = parseFloat(gpsMatch[1]);
                  const lon = parseFloat(gpsMatch[2]);
                  if (!isNaN(lat) && !isNaN(lon)) {
                    setGpsCoords({ lat, lon });
                    setGpsMsg(`Titik GPS tersinkronisasi dari buku alamat (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
                  }
                }
              }

              const isMks = isMakassarAddress({
                fullAddress: savedAddr.fullAddress,
                city: savedAddr.city,
                district: savedAddr.district,
                province: savedAddr.province,
              });

              if (isMks) {
                setDeliveryMethod("FREE_MAKASSAR");
                setAddressDetectionNotice("Alamat akun di Kota Makassar terdeteksi: Gratis Antar Tim Kaos Kami aktif (Rp 0).");
              } else if (savedAddr.city) {
                setDeliveryMethod("EXPEDITION_MANUAL");
                setDestQuery(savedAddr.city);
                setAddressDetectionNotice(`Alamat akun luar Makassar (${savedAddr.city}) terdeteksi: Tarif 5 ekspedisi nasional langsung dihitung.`);
                void handleCheckOngkir(savedAddr.city, savedAddr.postalCode || "");
              }
            }
          }
        } catch {
          // Defensif jika fetch gagal
        }
      })();
    }
  }, [session, isOpen]);

  // Hitung mundur (cooldown) kirim ulang OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // A11y dialog ESC & trap focus
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Refresh harga cart
  useEffect(() => {
    if (!isOpen || !isCartCheckout) {
      setCartPriceNotice(null);
      return;
    }
    let alive = true;
    setCartPriceChecking(true);
    (async () => {
      try {
        const before = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
        const map = await fetchServerPriceMap(10000);
        if (!alive || Object.keys(map).length === 0) return;
        const { diffIdr } = useCartStore.getState().syncPrices(map);
        if (!alive) return;
        const after = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
        setCartPriceNotice(diffIdr !== 0 ? { oldTotal: before, newTotal: after, diff: diffIdr } : null);
      } finally {
        if (alive) setCartPriceChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isOpen, isCartCheckout]);

  // Kirim kode OTP WhatsApp
  const handleSendOtp = async () => {
    const norm = normalizePhoneId(phoneNumber);
    if (norm) setPhoneNumber(norm);
    if (!norm || norm.replace(/[^0-9]/g, "").length < 9) {
      setOtpMsg("Isi nomor WhatsApp yang aktif (contoh: 081234567890)");
      return;
    }
    setIsSendingOtp(true);
    setOtpMsg(null);
    try {
      const data = await fetchJson<{ success?: boolean; mock?: boolean; code?: string; alreadyVerified?: boolean }>("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: norm }),
      });
      if (data.alreadyVerified) {
        setOtpMsg("Nomor ini sudah terverifikasi permanen — langsung klik BAYAR tanpa kode.");
        return;
      }
      setOtpSent(true);
      setResendCooldown(60);
      const showMock = data.mock && data.code && process.env.NODE_ENV !== "production";
      setOtpMsg(showMock ? `Kode mock dev: ${data.code}` : "Kode OTP 6 digit telah dikirim ke WhatsApp Anda.");
    } catch (e: any) {
      setOtpMsg(e?.message || "Gagal mengirim OTP ke WhatsApp.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSizeCountChange = (sizeKey: string, delta: number) => {
    const nextVal = Math.max(0, (sizeDistribution[sizeKey] || 0) + delta);
    const nextDist = { ...sizeDistribution, [sizeKey]: nextVal };
    setSizeDistribution(nextDist);
    const sum = Object.values(nextDist).reduce((a, b) => a + b, 0);
    setQuantity(Math.max(1, sum));
  };

  const matchedCheckoutColor = PRODUCT_COLORS.find(
    (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
  );
  const checkoutMaterial = materialFinishToPricing(materialFinish);
  const pricing = calculate6VariablePrice({
    apparelSlug: activeApparel,
    fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
    size: selectedSize,
    colorHex: selectedColor,
    isSpecialPigment: !!matchedCheckoutColor?.isSpecialPigment,
    decals,
    quantity,
  });

  const selectedDelivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
  const totalQty = isCartCheckout
    ? cartItems.reduce((a, c: any) => a + (c.quantity || 0), 0)
    : quantity;
  const selectedQuote = quotes.find((q) => q.key === selectedQuoteKey) || null;
  const shippingCost =
    deliveryMethod === "EXPEDITION_MANUAL" && selectedQuote
      ? selectedQuote.cost
      : selectedDelivery?.costIdr || 0;

  // Autocomplete kota tujuan
  const handleDestSearch = async (q: string) => {
    setDestQuery(q);
    setSelectedPostal("");
    setQuotes([]);
    setSelectedQuoteKey("");
    if (q.trim().length < 3) {
      setLocSuggest([]);
      return;
    }
    setLocLoading(true);
    try {
      const j = await fetchJson<{ locations?: { postalCode: string; label: string }[] }>(
        `/api/shipping/locations?q=${encodeURIComponent(q.trim())}`,
        undefined,
        10000
      );
      if (Array.isArray(j.locations)) setLocSuggest(j.locations.slice(0, 6));
      else setLocSuggest([]);
    } catch {
      setLocSuggest([]);
    } finally {
      setLocLoading(false);
    }
  };

  // Cek ongkir kurir (dapat dipanggil otomatis dari Pin Point Peta atau tombol)
  const handleCheckOngkir = async (targetCity?: string, targetPostal?: string) => {
    setQuoteMsg(null);
    const activeCity = (targetCity ?? destQuery).trim();
    const activePostal = targetPostal ?? selectedPostal;
    if (!activePostal && activeCity.length < 2) {
      setQuoteMsg("Pilih kota dari saran atau ketik manual min. 2 huruf.");
      return;
    }
    setQuoteLoading(true);
    try {
      const params = new URLSearchParams({
        city: activeCity,
        weightGrams: String(Math.max(250, totalQty * 250)),
      });
      if (activePostal) params.set("postalCode", activePostal);
      const j = await fetchJson<any>(`/api/shipping/quote?${params.toString()}`, undefined, 20000);
      if (j.source === "master-tariff" && Array.isArray(j.rates)) {
        setQuoteSource("master");
        const opts: QuoteOption[] = j.rates.map((x: any) => ({
          key: `master:${x.courierCode}:${x.serviceCode}`,
          courier: x.courierName,
          service: x.serviceName,
          cost: x.costIdr,
          etd: x.etdText,
          source: "master" as const,
          courierCode: x.courierCode,
          serviceCode: x.serviceCode,
        }));
        setQuotes(opts);
        setSelectedQuoteKey(opts[0]?.key || "");
        if (!opts.length) setQuoteMsg("Tarif tidak ditemukan untuk tujuan ini.");
      } else if (Array.isArray(j.zones)) {
        setQuoteSource("zone");
        const opts: QuoteOption[] = j.zones.map((z: any) => ({
          key: `zone:${z.id}`,
          courier: z.courier,
          service: `${z.service} — ${z.city}`,
          cost: z.costIdr,
          etd: z.etdLabel,
          source: "zone" as const,
          zoneId: z.id,
        }));
        setQuotes(opts);
        setSelectedQuoteKey(opts[0]?.key || "");
        if (!opts.length) setQuoteMsg("Tarif tidak ditemukan.");
      } else {
        setQuoteMsg("Respons ongkir tak dikenal. Coba lagi.");
      }
    } catch (e: any) {
      setQuoteMsg(e?.message || "Gagal cek ongkir. Coba lagi.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsMsg("GPS tidak didukung browser ini.");
      return;
    }
    setGpsLoading(true);
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ lat: latitude, lon: longitude });
        try {
          const j = await fetchJson<{ result?: { displayName?: string; district?: string; city?: string } }>(
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
            undefined,
            25000
          );
          const g = j?.result;
          if (g?.displayName) setFullAddress(g.displayName);
          if (g?.district && MAKASSAR_SUBDISTRICTS.includes(g.district)) setDistrict(g.district);
          if (g?.city && deliveryMethod === "EXPEDITION_MANUAL") handleDestSearch(g.city);
          setGpsMsg(
            g?.displayName || g?.district
              ? `Lokasi: ${[g.district, g.city].filter(Boolean).join(", ") || "Terdeteksi"}`
              : "Titik GPS terkunci. Silakan lengkapi detail alamat di bawah."
          );
        } catch {
          setGpsMsg("Titik GPS terkunci. Silakan lengkapi detail alamat di bawah.");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsMsg("Izin lokasi ditolak. Silakan isi manual.");
      },
      { timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleLocationPicked = (loc: PickedLocation) => {
    setGpsCoords({ lat: loc.lat, lon: loc.lng });
    setFullAddress(loc.displayName);
    if (loc.district && MAKASSAR_SUBDISTRICTS.includes(loc.district)) {
      setDistrict(loc.district);
    }
    const isMks = isMakassarAddress({
      fullAddress: loc.displayName,
      district: loc.district,
      city: loc.city,
      province: loc.province,
    });
    if (isMks) {
      setDeliveryMethod("FREE_MAKASSAR");
      setAddressDetectionNotice("Titik peta di Kota Makassar terdeteksi: Gratis Antar Tim Kaos Kami aktif (Rp 0).");
    } else if (loc.city) {
      setDeliveryMethod("EXPEDITION_MANUAL");
      setDestQuery(loc.city);
      void handleCheckOngkir(loc.city);
      setAddressDetectionNotice(`Titik peta di luar Makassar (${loc.city}) terdeteksi: Tarif Lion Parcel, SiCepat, Pos Indonesia, JNE, & J&T langsung dihitung.`);
    }
    setGpsMsg(`Titik terpilih: ${[loc.district, loc.city].filter(Boolean).join(", ") || "Koordinat terkunci"}`);
  };

  const effectiveSubtotal = isCartCheckout ? getCartTotalPrice() : pricing.totalPriceIdr;
  const grandTotal = effectiveSubtotal + shippingCost;

  // V2 validasi Tahap 1 (mirror handleCheckoutSubmit 400-checks, TANPA
  // OTP/kupon/Turnstile — itu gerbang Tahap 2/submit). pricingEngine,
  // endpoint /api/checkout, OTP WA TIDAK DIUBAH (submit memanggil sama).
  const validateStep1 = (): string | null => {
    const normPhone = normalizePhoneId(phoneNumber);
    if (!recipientName.trim()) return "Nama lengkap penerima wajib diisi.";
    if (!normPhone || normPhone.replace(/[^0-9]/g, "").length < 9)
      return "Nomor WhatsApp tidak valid (contoh: 081234567890).";
    if (deliveryMethod !== "PICKUP" && !fullAddress.trim())
      return "Alamat lengkap pengiriman wajib diisi.";
    if (deliveryMethod === "EXPEDITION_MANUAL" && !selectedQuote)
      return "Silakan cek ongkir & pilih kurir ekspedisi terlebih dahulu.";
    const slugs: string[] = isCartCheckout
      ? (cartItems as any[]).map((it) => String(it?.apparelSlug ?? ""))
      : [String(activeApparel)];
    const blocked = slugs.find((s) => !APPAREL_CATALOG[s as ApparelType]?.orderable);
    if (blocked) {
      const opt = APPAREL_CATALOG[blocked as ApparelType];
      return opt
        ? `${opt.name} belum bisa dipesan saat ini.`
        : `Apparel "${blocked}" tidak dikenal.`;
    }
    return null;
  };

  const handleNextToPayment = () => {
    const err = validateStep1();
    if (err) {
      setErrorMessage(err);
      scrollBodyTop();
      return;
    }
    const norm = normalizePhoneId(phoneNumber);
    if (norm) setPhoneNumber(norm);
    setErrorMessage(null);
    setStep(2);
    // Scroll async setelah render tahap 2 (state persisten, tak reset isian).
    requestAnimationFrame(() => scrollBodyTop());
  };

  const handleBackToAddress = () => {
    setErrorMessage(null);
    setStep(1);
    requestAnimationFrame(() => scrollBodyTop());
  };

  if (!isClient || typeof document === "undefined") return null;

  // Blueprint Bab 37.2 + Bab 41 — LARANG modal-di-atas-modal: AuthModal
  // TIDAK PERNAH ditumpuk di atas CheckoutModal. Mekanisme tutup-dulu-
  // baru-buka: bila user klik "Masuk Akun", checkout disembunyikan dulu
  // lalu AuthModal tampil SENDIRI (satu portal dalam satu waktu).
  if (isAuthModalOpen) {
    return createPortal(
      <AuthModal
        isOpen
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />,
      document.body
    );
  }

  if (!isOpen) return null;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normPhone = normalizePhoneId(phoneNumber);
    if (normPhone) setPhoneNumber(normPhone);

    // Satu sumber validasi Tahap 1 (hindari drift string error ganda).
    const stepErr = validateStep1();
    if (stepErr) {
      setErrorMessage(stepErr);
      return;
    }

    const sessionUser = session?.user as any;
    const cleanPhone = (p?: string | null) => (p || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const isAccountPhoneVerified =
      Boolean(sessionUser?.phoneVerified) &&
      Boolean(sessionUser?.phoneNumber) &&
      Boolean(normPhone) &&
      cleanPhone(normPhone) === cleanPhone(sessionUser?.phoneNumber);

    const isCatalogCart = isCartCheckout || !decals || decals.length === 0;
    const isSandboxBypass = process.env.NODE_ENV !== "production";
    const isOtpRequired = process.env.NEXT_PUBLIC_CHECKOUT_OTP_REQUIRED !== "false";
    if (isOtpRequired && !isAccountPhoneVerified && !isSandboxBypass && !adminBypassActive && !isCatalogCart && !/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage("Kode OTP 6 digit wajib diisi. Klik KIRIM OTP untuk menerima kode via WhatsApp.");
      return;
    }

    try {
      setIsLoading(true);

      if (isCartCheckout) {
        try {
          const before = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
          const map = await fetchServerPriceMap(10000);
          if (Object.keys(map).length > 0) {
            const { diffIdr } = useCartStore.getState().syncPrices(map);
            if (diffIdr !== 0) {
              const after = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
              setCartPriceNotice({ oldTotal: before, newTotal: after, diff: diffIdr });
              setErrorMessage(
                `Harga katalog diperbarui (selisih ${formatIdr(diffIdr)}). Total kini Rp ${after.toLocaleString("id-ID")}. Periksa lalu klik BAYAR lagi.`
              );
              setIsLoading(false);
              return;
            }
          }
        } catch {}
      }

      let masterForPayload: Record<string, string> | undefined;
      if (!isCartCheckout) {
        try {
          const pipe = await import("@/lib/imageEditPipeline");
          await pipe.ensureDecalMastersUploaded().catch(() => ({}));
          const m = pipe.buildCheckoutMasterMap(activeApparel);
          if (m && Object.keys(m).length > 0) {
            masterForPayload = m;
          }
        } catch {
          masterForPayload = undefined;
        }
      } else {
        try {
          const pipe = await import("@/lib/imageEditPipeline");
          await pipe.ensureDecalMastersUploaded().catch(() => ({}));
          const m = pipe.buildCheckoutMasterMap();
          if (m && Object.keys(m).length > 0) {
            masterForPayload = m;
          }
        } catch {
          masterForPayload = undefined;
        }
      }

      const itemsPayload = isCartCheckout
        ? cartItems.map((item) => ({
            apparelSlug: (item.apparelSlug as any) || "tshirt",
            productVariantId: item.productVariantId,
            colorHex: item.colorHex || "#121214",
            colorName: item.colorName || "Obsidian Black",
            size: item.size || "L",
            quantity: item.quantity,
            decals: Array.isArray((item as any).decals) ? (item as any).decals : [],
            materialFinishSlug: (item as any).materialFinishSlug,
            fabricThicknessSlug: (item as any).fabricThicknessSlug,
            title: item.name,
            ...(!item.productVariantId && masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
          }))
        : useCustomSizeBreakdown
        ? Object.entries(sizeDistribution)
            .filter(([_, qty]) => qty > 0)
            .map(([s, q]) => ({
              apparelSlug: activeApparel,
              fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
              materialFinishSlug: materialFinish,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: s,
              quantity: q,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
              ...(masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
            }))
        : [
            {
              apparelSlug: activeApparel,
              fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
              materialFinishSlug: materialFinish,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: selectedSize,
              quantity,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
              ...(masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
            },
          ];

      const payload = {
        recipientName,
        phoneNumber: normPhone,
        email: email || session?.user?.email || undefined,
        otpCode: !isOtpRequired || isAccountPhoneVerified || isSandboxBypass || adminBypassActive ? undefined : otpCode.trim(),
        deliveryMethod,
        turnaroundTier,
        district: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : deliveryMethod !== "PICKUP" ? district : undefined,
        destinationCity: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : undefined,
        destinationPostalCode: deliveryMethod === "EXPEDITION_MANUAL" && selectedPostal ? selectedPostal : undefined,
        expeditionZoneId: selectedQuote?.source === "zone" ? selectedQuote.zoneId : undefined,
        expeditionCourier: selectedQuote?.source === "master" ? selectedQuote.courierCode : undefined,
        expeditionService: selectedQuote?.source === "master" ? selectedQuote.serviceCode : undefined,
        fullAddress: deliveryMethod === "PICKUP" ? "Workshop Kaos Kami Makassar (Self Pick-up)" : fullAddress,
        courierNotes: gpsCoords
          ? [courierNotes || "", `[GPS:${gpsCoords.lat.toFixed(6)},${gpsCoords.lon.toFixed(6)}]`].filter(Boolean).join(" | ")
          : courierNotes,
        items: itemsPayload,
        turnstileToken: turnstileToken || undefined,
        couponCode: couponCode.trim() || undefined,
        adminBypassPayment: isAdmin ? adminBypassActive : undefined,
        adminDirectConfirm: isAdmin && adminBypassActive ? adminDirectConfirm : undefined,
      };

      const data = await fetchJson<{
        orderId: string;
        reference?: string;
        paymentUrl?: string;
        qrString?: string;
        qrImage?: string;
        invoiceUrl?: string;
        orderNumber?: string;
        amount?: number;
        status?: string;
        message?: string;
      }>("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": getCheckoutIdempotencyKey() },
        body: JSON.stringify(payload),
      }, 75000);

      // ALUR PENGUJIAN ADMIN / BYPASS: jika order langsung lunas atau berstatus test
      if ((data as any)?.isTestOrder || (data as any)?.status === "PAYMENT_CONFIRMED") {
        clearCheckoutIdempotencyKey();
        if (isCartCheckout) clearCart();
        window.location.href = (data as any)?.invoiceUrl || `/orders/${data.orderId}`;
        return;
      }

      // ALUR REVIEW (3D Studio Custom): pesanan masuk antre review workshop, TANPA charge awal.
      if ((data as any)?.status === "DESIGN_REVIEW" || (!(data as any)?.paymentUrl && !(data as any)?.qrImage && !(data as any)?.qrString && data.orderId)) {
        if (isCartCheckout) clearCart();
        setIsLoading(false);
        setSubmittedDesignReview({
          orderId: data.orderId,
          orderNumber: data.orderNumber || data.orderId,
        });
        return;
      }

      // 1. DIRECT QRIS 100% IN-APP (iPaymu):
      // Jika server mengembalikan qrImage atau qrString, tampilkan Modal QRIS langsung di layar!
      // Pengguna tidak dialihkan ke situs lain, dapat langsung screenshot atau unduh gambar QRIS.
      if (data.qrImage || data.qrString) {
        setDirectQrisData({
          orderId: data.orderId,
          orderNumber: data.orderNumber || data.orderId,
          amountIdr: (data as any)?.amount || grandTotal,
          qrImage: data.qrImage,
          qrString: data.qrString,
          invoiceUrl: data.invoiceUrl,
        });
        setIsLoading(false);
        return;
      }

      // 2. Fallback jika paymentUrl tersedia:
      if (data.paymentUrl && !data.paymentUrl.includes("mock")) {
        window.location.href = data.paymentUrl;
      } else {
        window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
      }
    } catch (err: any) {
      const serverMsg = err?.message || "Terjadi kendala saat memproses pesanan.";
      const d = err?.data as { orderNumber?: string; orderId?: string; invoiceUrl?: string } | undefined;
      const suffix =
        err?.status === 409 && d && (d.orderNumber || d.orderId || d.invoiceUrl)
          ? `${d.orderNumber || d.orderId ? ` Order: ${d.orderNumber || d.orderId}.` : ""}${d.invoiceUrl ? ` Buka invoice: ${d.invoiceUrl}` : ""}`
          : "";
      setErrorMessage(`${serverMsg}${suffix}`);
      setIsLoading(false);
    }
  };

  // 100% In-App Direct QRIS: alihkan seluruh modal ke DirectQrisModal saat data QRIS diterima
  if (directQrisData) {
    return (
      <DirectQrisModal
        isOpen={true}
        onClose={() => {
          const oid = directQrisData.orderId;
          setDirectQrisData(null);
          onClose();
          window.location.href = directQrisData.invoiceUrl || `/orders/${oid}`;
        }}
        orderId={directQrisData.orderId}
        orderNumber={directQrisData.orderNumber}
        amountIdr={directQrisData.amountIdr}
        qrImage={directQrisData.qrImage}
        qrString={directQrisData.qrString}
        invoiceUrl={directQrisData.invoiceUrl}
        onPaymentSuccess={() => {
          clearCheckoutIdempotencyKey();
          if (isCartCheckout) clearCart();
        }}
      />
    );
  }

  // Tampilan Sukses Pengajuan 3D Custom (Menunggu Review Workshop)
  if (submittedDesignReview) {
    return createPortal(
      <div className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn`}>
        <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-md">
            <Sparkles size={32} />
          </div>
          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
              Antrean Kurasi Workshop
            </span>
            <h3 className="font-sans text-xl font-bold text-text-primary">
              Desain Berhasil Diajukan!
            </h3>
            <p className="font-mono text-xs text-text-muted">
              Nomor Pesanan: <span className="font-bold text-text-primary">{submittedDesignReview.orderNumber}</span>
            </p>
          </div>
          <p className="font-sans text-xs text-text-muted leading-relaxed">
            Pesanan sablon kustom Anda telah diterima tim Kaos Kami Makassar. Kami akan memverifikasi ketajaman artwork 300 DPI dan ketersediaan kain polos. Setelah disetujui, tagihan QRIS akan aktif di dashboard Anda.
          </p>
          <div className="space-y-2 pt-2">
            <Link
              href="/dashboard/orders"
              onClick={() => {
                clearCheckoutIdempotencyKey();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Pantau di Dashboard Pesanan</span>
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => {
                clearCheckoutIdempotencyKey();
                setSubmittedDesignReview(null);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary font-sans font-semibold text-xs transition-all cursor-pointer"
            >
              Tutup &amp; Kembali ke Studio
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Wajib Login untuk Pemesanan 3D Custom
  if (isCustomOrder && !session?.user) {
    return createPortal(
      <div className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn`}>
        <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center mx-auto shadow-md">
            <User size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="font-sans text-lg sm:text-xl font-bold text-text-primary">
              Masuk untuk Pesanan 3D Custom
            </h3>
            <p className="font-sans text-xs text-text-muted leading-relaxed">
              Pesanan sablon kustom membutuhkan akun agar file desain Anda aman tersimpan di Wardrobe dan tim workshop dapat berkoordinasi langsung jika ada penyesuaian file sablon.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Masuk / Buat Akun</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary font-sans font-semibold text-xs transition-all cursor-pointer"
            >
              Kembali ke Studio
            </button>
          </div>
        </div>

        {/* AuthModal terhubung langsung agar tombol Masuk / Buat Akun membuka login */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>,
      document.body
    );
  }

  return createPortal(
      <div
        className={`fixed inset-0 ${Z_CLASS_MODAL} flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto transition-opacity duration-200 opacity-100`}
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout pesanan Kaos Kami"
    >
      <div
        ref={panelRef}
        data-lenis-prevent="true"
        className="relative w-full max-w-3xl max-h-[92dvh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden"
      >
        {/* Garis aksen atas standar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border-subtle" />

        {/* Header Modal */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-border-subtle flex items-center justify-between bg-surface/90 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 shadow-[0_0_12px_rgba(37,99,235,0.2)]">
              {isCustomOrder ? <Sparkles size={18} /> : <ShoppingBag size={18} />}
            </div>
            <div className="min-w-0">
              <h2 className="font-sans text-sm sm:text-base font-bold uppercase tracking-tight text-text-primary truncate">
                {isCustomOrder ? "PENGAJUAN PESANAN 3D CUSTOM" : "CHECKOUT BELANJA KAOS KAMI"}
              </h2>
              <p className="font-sans text-[10px] sm:text-[11px] text-text-muted truncate">
                {isCustomOrder
                  ? "Workshop Sablon DTF Makassar · Kurasi Desain & Produksi"
                  : "Kaos Kami Makassar · Pengiriman Langsung & Siap Pakai"}
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-border-subtle transition-all flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper 2-Tahap Bersih (Desktop & Mobile) */}
        <div
          className="px-5 sm:px-6 py-2.5 border-b border-border-subtle bg-surface/50 shrink-0 flex items-center justify-between font-sans text-xs"
          aria-label="Tahap checkout"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleBackToAddress}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer font-bold ${
                step === 1
                  ? "bg-brand-accent text-white border-brand-accent shadow-xs"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? "bg-white text-brand-accent" : "bg-emerald-500 text-white"}`}>
                {step === 2 ? "✓" : "1"}
              </span>
              <span>1. Alamat &amp; Kurir</span>
            </button>

            <span className="text-text-muted" aria-hidden="true">→</span>

            <button
              type="button"
              onClick={handleNextToPayment}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer font-bold ${
                step === 2
                  ? "bg-brand-accent text-white border-brand-accent shadow-xs"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? "bg-white text-brand-accent" : "bg-surface-elevated text-text-muted"}`}>
                2
              </span>
              <span>2. {isCustomOrder ? "Ringkasan & Ajukan Desain" : "Ringkasan & Bayar QRIS"}</span>
            </button>
          </div>

          <span className="text-xs text-text-muted font-medium hidden sm:inline">
            {step === 1 ? "Langkah 1 dari 2" : "Langkah 2 dari 2"}
          </span>
        </div>

        {/* BODY CONTAINER */}
        <form
          ref={bodyScrollRef}
          onSubmit={handleCheckoutSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-brand-accent/30"
        >
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="max-w-2xl mx-auto w-full">
            {/* TAHAP 1: Kontak + Metode + Alamat GPS + ongkir */}
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                <div className="flex items-center space-x-2 text-xs font-sans font-bold text-text-primary uppercase tracking-wider">
                  <MapPin size={13} className="text-brand-accent" />
                  <span>TAHAP 1 · INFORMASI PENGIRIMAN</span>
                </div>
                <span className="text-[10px] text-text-muted hidden md:inline">1. Alamat &amp; Kurir</span>
              </div>

            {/* Account Status Banner (Guest or Logged In) */}
            {!session?.user ? (
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-bold text-text-primary">
                      Checkout Cepat (Tamu)
                    </p>
                    <p className="font-sans text-[10px] text-text-muted">
                      Bisa langsung pesan tanpa akun. Punya akun?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="shrink-0 px-3 py-1 rounded-lg text-[10px] font-sans font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent hover:text-canvas transition-all"
                >
                  Masuk Akun
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-bold text-xs shrink-0">
                    {session.user.name?.[0]?.toUpperCase() || <User size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-bold text-text-primary truncate">
                      {session.user.name || "Akun Pelanggan"}
                    </p>
                    <p className="font-sans text-[10px] text-text-muted truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  <span>Akun Terhubung</span>
                </span>
              </div>
            )}

              {/* Section 1: Customer Contact & WhatsApp OTP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                  <div className="flex items-center space-x-2 text-xs font-sans font-bold text-text-primary uppercase tracking-wider">
                    <Phone size={13} className="text-brand-accent" />
                    <span>1 · INFORMASI PEMESAN & WHATSAPP</span>
                  </div>
                  {session?.user && (
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(!isEditingContact)}
                      className="text-[11px] font-sans font-bold text-brand-accent hover:underline cursor-pointer"
                    >
                      {isEditingContact ? "Batal / Pakai Data Akun" : "✏️ Ubah Kontak"}
                    </button>
                  )}
                </div>

                {session?.user && !isEditingContact ? (
                  /* Kartu Profil Terverifikasi Akun (Tidak perlu ketik ulang) */
                  <div className="p-3.5 rounded-2xl bg-brand-accent/5 border border-brand-accent/25 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center font-bold text-brand-accent shrink-0 text-sm">
                          {session.user.name?.[0]?.toUpperCase() || <User size={15} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-sans text-xs font-bold text-text-primary truncate">
                            {recipientName || session.user.name || "Akun Pelanggan"}
                          </p>
                          <p className="font-mono text-[11px] text-text-secondary truncate">
                            {phoneNumber || (session.user as any)?.phoneNumber || "Nomor WA belum disetel"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        <span>Akun Terverifikasi</span>
                      </span>
                    </div>
                    {email && (
                      <p className="font-sans text-[10px] text-text-muted truncate border-t border-border-subtle/50 pt-1.5">
                        Faktur & notifikasi otomatis dikirim ke: <span className="text-text-primary font-medium">{email}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  /* Form Input Kontak (Untuk Tamu atau saat Ubah Data) */
                  <div className="space-y-3">
                    {!session?.user && (
                      <div className="p-2.5 rounded-xl bg-surface/80 border border-border-subtle text-[11px] text-text-muted flex items-center justify-between gap-2">
                        <span>Pemesanan tamu tanpa login.</span>
                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="font-bold text-brand-accent hover:underline shrink-0"
                        >
                          Masuk Akun ↗
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[11px] text-text-muted uppercase mb-1">
                          Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Contoh: Muhammad Fadil"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-sans text-[11px] text-text-muted uppercase">
                            Nomor WhatsApp *
                          </label>
                          {isAccountPhoneVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 size={11} /> TERVERIFIKASI
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value);
                              setIsPhoneVerified(false);
                              setOtpSent(false);
                              setOtpCode("");
                            }}
                            placeholder="081234567890"
                            aria-label="Nomor WhatsApp"
                            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary font-sans focus:outline-none transition-colors"
                          />
                          {!isAccountPhoneVerified && (process.env.NEXT_PUBLIC_CHECKOUT_OTP_REQUIRED !== "false") && (
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={isSendingOtp || !phoneNumber || resendCooldown > 0}
                              className="px-3 py-2 rounded-xl bg-surface border border-brand-accent/40 text-brand-accent text-[11px] font-sans font-bold hover:bg-brand-accent hover:text-canvas disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                            >
                              {isSendingOtp
                                ? "..."
                                : resendCooldown > 0
                                ? `TUNGGU (${resendCooldown}s)`
                                : otpSent
                                ? "KIRIM ULANG"
                                : "KIRIM OTP"}
                            </button>
                          )}
                        </div>

                        {isAccountPhoneVerified ? (
                          <p className="text-[11px] font-sans text-emerald-400/90 mt-1.5 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                            <span>Nomor WhatsApp terverifikasi permanen untuk akun ini. OTP tidak diperlukan lagi!</span>
                          </p>
                        ) : (process.env.NEXT_PUBLIC_CHECKOUT_OTP_REQUIRED === "false") ? (
                          <p className="text-[11px] font-sans text-emerald-400/90 mt-1.5 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                            <span>Checkout Instan Aktif · Tanpa verifikasi OTP, langsung bayar via Direct QRIS.</span>
                          </p>
                        ) : sessionUser?.phoneVerified && sessionUser?.phoneNumber && cleanPhone(phoneNumber) !== cleanPhone(sessionUser?.phoneNumber) ? (
                          <p className="text-[11px] font-sans text-amber-400/90 mt-1.5 flex items-center gap-1.5 bg-amber-950/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                            <span>Nomor baru terdeteksi. Verifikasi diperlukan untuk nomor ini.</span>
                          </p>
                        ) : null}

                        {!isAccountPhoneVerified && otpSent && (
                          <div className="mt-2 space-y-1.5 animate-fadeIn">
                            <div className="relative">
                              <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                                  setOtpCode(val);
                                  if (val.length === 6) {
                                    setIsPhoneVerified(true);
                                  } else {
                                    setIsPhoneVerified(false);
                                  }
                                }}
                                placeholder="Ketik 6 digit kode OTP"
                                aria-label="Kode OTP 6 digit dari WhatsApp"
                                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-brand-accent/60 text-sm text-text-primary font-sans tabular-nums tracking-widest focus:outline-none"
                                maxLength={6}
                              />
                              {otpCode.length === 6 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-emerald-400 text-xs font-sans font-bold">
                                  <CheckCircle2 size={15} />
                                  <span className="text-[10px]">SIAP</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {!isAccountPhoneVerified && otpMsg && (
                          <p className="text-[11px] font-sans mt-1 text-amber-400" role="status">
                            {otpMsg}
                          </p>
                        )}
                        {!isAccountPhoneVerified && (
                          <p className="text-[10px] font-sans text-text-muted mt-1 leading-snug">
                            Verifikasi nomor WhatsApp 1x per akun selamanya untuk konfirmasi dan keamanan transaksi.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Delivery Method (3 Symmetric Cards) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-sans font-bold text-text-primary uppercase tracking-wider pb-1 border-b border-border-subtle">
                  <Truck size={13} className="text-brand-accent" />
                  <span>2 · METODE PENGIRIMAN</span>
                </div>

                {addressDetectionNotice && (
                  <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-xs text-text-primary flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-accent shrink-0" />
                      <span className="font-medium">{addressDetectionNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddressDetectionNotice(null)}
                      className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {MAKASSAR_DELIVERY_OPTIONS.map((opt) => {
                    const isSelected = deliveryMethod === opt.method;
                    return (
                      <label
                        key={opt.method}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? "bg-brand-accent/15 border-brand-accent shadow-[0_0_12px_rgba(37,99,235,0.2)]"
                            : "bg-surface/50 border-border-subtle hover:border-border-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="deliveryMethod"
                              checked={isSelected}
                              onChange={() => {
                                setDeliveryMethod(opt.method);
                                setQuotes([]);
                                setSelectedQuoteKey("");
                                setQuoteMsg(null);
                              }}
                              className="accent-brand-accent mt-0.5"
                            />
                            <span className="font-sans text-xs font-bold text-text-primary">
                              {opt.method === "PICKUP"
                                ? "Ambil Sendiri"
                                : opt.method === "FREE_MAKASSAR"
                                ? "Kurir Internal"
                                : "Ekspedisi"}
                            </span>
                          </div>
                          {opt.method === "FREE_MAKASSAR" && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-sans font-bold bg-emerald-500/20 text-emerald-400">
                              GRATIS
                            </span>
                          )}
                          {opt.method === "PICKUP" && (
                            <span className="text-[10px] font-mono tabular-nums text-text-muted">
                              Rp 0
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-text-muted leading-tight">
                          {opt.method === "PICKUP"
                            ? "Ambil di workshop Tallo (Jl. Galangan Kapal, Lrg. Permandian 1) setelah sablon selesai."
                            : opt.method === "FREE_MAKASSAR"
                            ? "Gratis antar ke seluruh wilayah Kota Makassar."
                            : "Kirim keluar Makassar via JNE, J&T, atau SiCepat."}
                        </p>
                      </label>
                    );
                  })}
                </div>

                {/* Sub-card based on Delivery Method */}
                {deliveryMethod === "PICKUP" && (
                  <div className="p-3.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 space-y-2 animate-fadeIn">
                    <div className="flex items-center space-x-2 text-brand-accent font-sans text-xs font-bold">
                      <Store size={14} />
                      <span>LOKASI WORKSHOP KAOS KAMI MAKASSAR</span>
                    </div>
                    <p className="font-sans text-xs text-text-primary leading-relaxed">
                      {WORKSHOP_LOCATION.address}
                    </p>
                    <div>
                      <a
                        href={WORKSHOP_LOCATION.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent text-[11px] font-sans font-bold transition-colors"
                      >
                        <MapPin size={13} />
                        Buka Titik Lokasi di Google Maps (Navigasi) ↗
                      </a>
                    </div>
                    <p className="font-sans text-[10px] text-text-muted flex items-center gap-1.5 pt-0.5">
                      <Clock size={12} className="text-text-muted shrink-0" />
                      <span>Jam Operasional: {WORKSHOP_LOCATION.operatingHours}. Pesanan siap diambil setelah notifikasi selesai produksi.</span>
                    </p>
                  </div>
                )}

                {deliveryMethod === "FREE_MAKASSAR" && (
                  <div className="space-y-3.5 pt-1 animate-fadeIn">
                    {/* Panel Interaktif Deteksi Titik Presisi GPS & Peta OSM */}
                    <div className="p-3.5 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                          <Navigation size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-sans text-xs font-bold text-text-primary">
                            Titik Presisi Kurir Toko (Kota Makassar)
                          </h4>
                          <p className="font-sans text-[11px] text-text-muted leading-relaxed mt-0.5">
                            Kurir motor Kaos Kami membutuhkan koordinat GPS akurat agar pesanan diantar tepat ke depan gerbang / rumah Anda tanpa tersesat di lorong.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleUseGps}
                          disabled={gpsLoading}
                          className="px-3 py-2 rounded-xl bg-brand-accent text-canvas hover:opacity-95 font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {gpsLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Crosshair size={13} />
                          )}
                          <span>{gpsLoading ? "Mencari GPS..." : "Nyalakan GPS Otomatis"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsMapModalOpen(true)}
                          className="px-3 py-2 rounded-xl bg-surface border border-border-strong hover:border-brand-accent/50 text-text-primary font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          <MapPin size={13} className="text-brand-accent" />
                          <span>Pilih di Peta (OSM)</span>
                        </button>
                      </div>

                      {/* Preview Visual Peta Interaktif OpenStreetMap (OSM) */}
                      {gpsCoords ? (
                        <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5 space-y-2 animate-fadeIn p-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <MapPin size={13} className="text-emerald-400" />
                              <span>Peta OpenStreetMap (OSM) Terkunci</span>
                            </span>
                            <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                              {gpsCoords.lat.toFixed(5)}, {gpsCoords.lon.toFixed(5)}
                            </span>
                          </div>

                          {/* Native OSM Embed Visual Map */}
                          <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border-subtle bg-black/10">
                            <iframe
                              title="Titik Pengantaran OpenStreetMap"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              marginHeight={0}
                              marginWidth={0}
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(gpsCoords.lon - 0.006).toFixed(6)}%2C${(gpsCoords.lat - 0.004).toFixed(6)}%2C${(gpsCoords.lon + 0.006).toFixed(6)}%2C${(gpsCoords.lat + 0.004).toFixed(6)}&layer=mapnik&marker=${gpsCoords.lat.toFixed(6)}%2C${gpsCoords.lon.toFixed(6)}`}
                              className="w-full h-full opacity-90 contrast-105"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] text-white/80 pointer-events-none">
                              © OpenStreetMap contributors
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <button
                              type="button"
                              onClick={() => setIsMapModalOpen(true)}
                              className="text-[11px] font-sans font-bold text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Navigation size={11} />
                              <span>Ubah / Geser Titik di Peta</span>
                            </button>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${gpsCoords.lat}&mlon=${gpsCoords.lon}#map=17/${gpsCoords.lat}/${gpsCoords.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-text-muted hover:text-text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              <span>Buka OSM Penuh ↗</span>
                            </a>
                          </div>
                        </div>
                      ) : gpsMsg ? (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 flex items-start gap-2 animate-fadeIn">
                          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium leading-relaxed">{gpsMsg}</p>
                            <p className="text-[10px] text-text-muted mt-0.5">
                              Jika izin lokasi diblokir browser, klik ikon gembok pada address bar untuk mengizinkan, atau gunakan tombol &ldquo;Pilih di Peta (OSM)&rdquo;.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-sans text-[11px] text-text-muted uppercase">
                          Kecamatan di Kota Makassar *
                        </label>
                        <span className="text-[10px] text-text-muted font-mono">15 Kecamatan Resmi</span>
                      </div>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none"
                      >
                        {MAKASSAR_SUBDISTRICTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] text-text-muted uppercase mb-1">
                        Alamat Lengkap Pengiriman *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        placeholder="Nama jalan, nomor rumah, RT/RW, patokan lokasi / lorong"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] text-text-muted uppercase mb-1">
                        Catatan Kurir (Opsional)
                      </label>
                      <input
                        type="text"
                        value={courierNotes}
                        onChange={(e) => setCourierNotes(e.target.value)}
                        placeholder="Contoh: Rumah pagar hitam, depan warkop"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {deliveryMethod === "EXPEDITION_MANUAL" && (
                  <div className="p-3.5 rounded-xl bg-surface border border-brand-accent/40 space-y-3 animate-fadeIn">
                    <div>
                      <label className="block font-sans text-[11px] text-text-muted uppercase mb-1">
                        Kota / Kabupaten Tujuan (Luar Makassar) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => handleDestSearch(e.target.value)}
                          placeholder="cth: Gowa, Maros, Jakarta, Surabaya"
                          className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleCheckOngkir()}
                          disabled={quoteLoading}
                          className="px-3.5 py-2 rounded-xl bg-brand-accent text-canvas font-sans text-[11px] font-bold disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {quoteLoading ? "MENGECEK..." : "CEK ONGKIR"}
                        </button>
                      </div>
                      {locLoading && <p className="font-sans text-[10px] text-text-muted mt-1">Mencari lokasi...</p>}
                      {locSuggest.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {locSuggest.map((l) => (
                            <button
                              key={`${l.postalCode}-${l.label}`}
                              type="button"
                              onClick={() => {
                                const pickedCity = l.label.split(",")[0] || l.label;
                                setDestQuery(pickedCity);
                                setSelectedPostal(l.postalCode);
                                setLocSuggest([]);
                                void handleCheckOngkir(pickedCity, l.postalCode);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent font-sans text-[11px] text-text-primary flex justify-between cursor-pointer"
                            >
                              <span>{l.label}</span>
                              <span className="text-brand-accent font-bold font-sans tabular-nums">{l.postalCode}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {quoteMsg && <p className="font-sans text-[11px] text-rose-300">{quoteMsg}</p>}
                    {quoteSource === "zone" && (
                      <p className="font-sans text-[10px] text-amber-400">
                        Tarif estimasi tabel zona. Nilai final divalidasi server saat bayar.
                      </p>
                    )}
                    {quoteSource === "master" && (
                      <p className="font-sans text-[10px] text-emerald-400">
                        ✓ Tarif kurir resmi origin Makassar (Lion Parcel / JNE / J&T) aktif.
                      </p>
                    )}

                    {quotes.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-sans text-[10px] text-text-muted uppercase">PILIH LAYANAN KURIR:</label>
                        {quotes.map((q) => (
                          <label
                            key={q.key}
                            className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                              selectedQuoteKey === q.key
                                ? "bg-brand-accent/15 border-brand-accent"
                                : "bg-surface border-border-subtle hover:border-border-strong"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="radio"
                                name="expeditionQuote"
                                checked={selectedQuoteKey === q.key}
                                onChange={() => setSelectedQuoteKey(q.key)}
                                className="accent-brand-accent"
                              />
                              <div className="min-w-0">
                                <p className="font-sans text-xs font-bold text-text-primary truncate">
                                  {q.courier} {q.service}
                                </p>
                                <p className="font-sans text-[10px] text-text-muted">Estimasi {q.etd}</p>
                              </div>
                            </div>
                            <span className="font-mono tabular-nums text-xs font-bold text-emerald-400 shrink-0">
                              Rp {q.cost.toLocaleString("id-ID")}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-sans text-[11px] text-text-muted uppercase">
                          Alamat Lengkap Pengiriman *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleUseGps}
                            disabled={gpsLoading}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-brand-accent hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Crosshair size={12} />
                            <span>{gpsLoading ? "GPS..." : "Deteksi GPS"}</span>
                          </button>
                          <span className="text-text-muted text-[10px]">|</span>
                          <button
                            type="button"
                            onClick={() => setIsMapModalOpen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-brand-accent hover:underline cursor-pointer"
                          >
                            <MapPin size={12} />
                            <span>Pin Point Peta</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={fullAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFullAddress(val);
                          if (val.length > 5) {
                            const isMks = isMakassarAddress({ fullAddress: val, district: destQuery });
                            if (isMks) {
                              setDeliveryMethod("FREE_MAKASSAR");
                              setAddressDetectionNotice("Alamat Kota Makassar terdeteksi: Dialihkan ke Gratis Antar Tim Kaos Kami (Rp 0).");
                            }
                          }
                        }}
                        placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none leading-relaxed"
                      />
                      {gpsCoords && (
                        <div className="mt-1.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>Koordinat: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lon.toFixed(5)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

                {/* Navigasi Tahap 1 → 2 (Desktop & Mobile) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-surface/90 border border-border-subtle space-y-3 font-sans text-xs shadow-sm">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal ({totalQty} pcs)</span>
                    <span className="font-mono tabular-nums">Rp {effectiveSubtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>
                      Ongkos Kirim ({deliveryMethod === "PICKUP" ? "Ambil Sendiri" : deliveryMethod === "FREE_MAKASSAR" ? "Gratis Makassar" : "Ekspedisi"})
                    </span>
                    <span className={`font-mono tabular-nums ${shippingCost === 0 ? "text-emerald-400 font-bold" : ""}`}>
                      {shippingCost === 0 ? "Rp 0" : `Rp ${shippingCost.toLocaleString("id-ID")}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2.5 border-t border-border-subtle">
                    <span className="font-bold text-text-primary text-xs uppercase tracking-wider">Total Sementara:</span>
                    <span className="text-brand-accent font-bold text-xl font-mono tabular-nums">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextToPayment}
                    className="w-full py-3.5 px-5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer bg-brand-accent text-canvas shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:brightness-110 active:scale-[0.99]"
                  >
                    <span>Lanjut ke Ringkasan &amp; {isCustomOrder ? "Ajukan Desain" : "Pembayaran"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAHAP 2: Ringkasan & Pembayaran (Desktop & Mobile) */}
            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                  <div className="flex items-center space-x-2 text-xs font-sans font-bold text-text-primary uppercase tracking-wider">
                    {isCustomOrder ? <Sparkles size={13} className="text-brand-accent" /> : <CreditCard size={13} className="text-brand-accent" />}
                    <span>TAHAP 2 · RINGKASAN &amp; {isCustomOrder ? "AJUKAN DESAIN" : "BAYAR QRIS"}</span>
                  </div>
                  <span className="text-[10px] text-text-muted">Langkah 2 dari 2</span>
                </div>

                {/* Ringkasan alamat & kurir terpilih */}
                <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border-subtle font-sans text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <MapPin size={13} className="text-brand-accent" />
                      <span>Tujuan &amp; Kurir Pengiriman</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleBackToAddress}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-surface border border-border-subtle text-brand-accent hover:border-brand-accent hover:bg-brand-accent/10 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft size={12} />
                      <span>Ubah Alamat / Kurir</span>
                    </button>
                  </div>
                  <p className="text-text-primary font-bold text-sm">
                    {recipientName || "—"} · <span className="font-mono text-xs">{normalizePhoneId(phoneNumber) || phoneNumber || "—"}</span>
                  </p>
                  <p className="text-text-muted leading-relaxed">
                    {deliveryMethod === "PICKUP"
                      ? "Ambil sendiri — Workshop Kaos Kami Makassar (Jl. Pelita Raya / Workshop DTF)"
                      : deliveryMethod === "FREE_MAKASSAR"
                        ? `${district} — ${fullAddress || "—"}`
                        : `${destQuery || "—"} — ${fullAddress || "—"}`}
                    {selectedQuote ? ` · ${selectedQuote.courier} ${selectedQuote.service} (Rp ${selectedQuote.cost.toLocaleString("id-ID")})` : ""}
                    {deliveryMethod !== "EXPEDITION_MANUAL" && shippingCost === 0 ? " · Rp 0 (Gratis Ongkir)" : ""}
                  </p>
                </div>
                {/* Order Summary Box */}
                <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle space-y-3 font-sans text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="font-bold text-text-primary uppercase flex items-center gap-1.5">
                      <Sparkles size={13} className="text-brand-accent" />
                      <span>{isCartCheckout ? `KERANJANG (${cartItems.length})` : "PRODUK KUSTOM"}</span>
                    </span>
                    <span className="text-brand-accent font-bold font-mono tabular-nums">
                      Rp {effectiveSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {isCartCheckout ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {cartItems.map((item) => (
                        <div key={`${item.id}-${item.size}`} className="flex justify-between items-center text-[11px] border-b border-border-subtle pb-1.5">
                          <div className="flex items-center space-x-2 truncate max-w-[180px]">
                            <span className="text-brand-accent font-bold">x{item.quantity}</span>
                            <span className="text-text-primary truncate">{item.name}</span>
                            <span className="text-text-muted">({item.size})</span>
                          </div>
                          <span className="text-text-primary font-bold shrink-0 font-mono tabular-nums">
                            Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="font-sans font-semibold text-sm uppercase text-text-primary">
                          {activeApparel} (CUSTOM SABLON)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted">
                        <div className="p-2 rounded-lg bg-surface border border-border-subtle flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <span className="text-text-primary font-bold truncate">{activeColorName}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border-subtle">
                          <span className="opacity-75 block text-[9px]">UKURAN:</span>
                          <span className="text-text-primary font-bold">{selectedSize}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border-subtle">
                          <span className="opacity-75 block text-[9px]">SABLON:</span>
                          <span className="text-text-primary font-bold truncate">
                            {decals.length > 0 ? `${decals.length} Posisi Sablon` : "Kaos Polos"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border-subtle">
                          <span className="opacity-75 block text-[9px]">BAHAN & KETEBALAN:</span>
                          <span className="text-text-primary font-bold truncate">
                            {materialFinish === "combed-cotton" ? "Cotton Combed 30s" : materialFinish.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper & Bulk Size Matrix */}
                      <div className="pt-2 border-t border-border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted text-[11px]">JUMLAH KAOS:</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={useCustomSizeBreakdown}
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="w-8 h-8 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-text-primary text-sm">{quantity}</span>
                            <button
                              type="button"
                              disabled={useCustomSizeBreakdown}
                              onClick={() => setQuantity(quantity + 1)}
                              className="w-8 h-8 rounded-lg bg-surface border border-border-subtle text-text-primary font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setUseCustomSizeBreakdown(!useCustomSizeBreakdown)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                              useCustomSizeBreakdown
                                ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                            }`}
                          >
                            {useCustomSizeBreakdown ? "Rincian Ukuran Aktif" : "Bagi Ukuran (S–XXL)"}
                          </button>
                        </div>

                        {useCustomSizeBreakdown && (
                          <div className="p-2.5 rounded-xl bg-surface border border-border-subtle space-y-1.5 animate-fadeIn mt-2">
                            <span className="block text-[10px] text-text-muted">
                              Tentukan jumlah per ukuran untuk sablon:
                            </span>
                            <div className="grid grid-cols-5 gap-1 text-center">
                              {["S", "M", "L", "XL", "XXL"].map((sz) => (
                                <div key={sz} className="p-1.5 rounded-lg bg-surface border border-border-subtle">
                                  <span className="block text-[10px] font-bold text-text-muted">{sz}</span>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSizeCountChange(sz, -1)}
                                      className="w-5 h-5 rounded bg-surface text-text-primary flex items-center justify-center text-[10px] font-bold hover:bg-brand-accent hover:text-canvas cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-text-primary text-[11px] w-3">
                                      {sizeDistribution[sz] || 0}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleSizeCountChange(sz, 1)}
                                      className="w-5 h-5 rounded bg-surface text-text-primary flex items-center justify-center text-[10px] font-bold hover:bg-brand-accent hover:text-canvas cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coupon Code Card */}
                <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1.5 font-sans text-xs">
                  <label htmlFor="coupon-input" className="block text-[11px] text-text-muted uppercase">
                    Kode Kupon Diskon (Opsional)
                  </label>
                  <input
                    id="coupon-input"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32))}
                    placeholder="Contoh: PROMO10"
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary uppercase placeholder:normal-case placeholder:text-text-muted text-xs focus:border-brand-accent focus:outline-none font-sans tabular-nums"
                  />
                </div>

                {/* Cost Breakdown & Total */}
                <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2.5 font-sans text-xs">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal Kaos & Sablon ({totalQty} pcs)</span>
                    <span className="font-mono tabular-nums">Rp {effectiveSubtotal.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between text-text-muted">
                    <span>
                      Ongkos Kirim {deliveryMethod === "FREE_MAKASSAR" ? "(Gratis Makassar)" : ""}
                    </span>
                    <span className={shippingCost === 0 ? "text-emerald-400 font-bold" : ""}>
                      <span className="font-mono tabular-nums">{shippingCost === 0 ? "Rp 0" : `Rp ${shippingCost.toLocaleString("id-ID")}`}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2.5 border-t border-border-subtle">
                    <span className="font-bold text-text-primary text-xs">TOTAL PEMBAYARAN:</span>
                    <span className="text-brand-accent font-bold text-xl tracking-tight font-mono tabular-nums">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Turnstile Anti-bot */}
                {turnstileEnabled && !adminBypassActive && (
                  <TurnstileWidget
                    onVerify={(t) => setTurnstileToken(t)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                    size="flexible"
                  />
                )}

                {/* Card Khusus Pengujian Admin (Bypass Pembayaran) */}
                {isAdmin && (
                  <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 space-y-3 font-sans text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-black flex items-center justify-center font-black">
                          <Zap size={14} className="fill-black" />
                        </div>
                        <div>
                          <span className="font-extrabold text-amber-500 uppercase tracking-wider block">
                            Mode Pengujian Admin
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {adminBypassActive ? "Bypass pembayaran AKTIF" : "Bypass pembayaran NONAKTIF"}
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminBypassActive}
                          onChange={(e) => setAdminBypassActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {adminBypassActive ? (
                      <div className="space-y-2 pt-2 border-t border-amber-500/20 text-[11px]">
                        <p className="text-text-muted leading-relaxed">
                          <strong>Bypass Pembayaran Aktif:</strong> Biaya Rp 0 (tanpa tagihan gateway &amp; verifikasi OTP dilewati). Pesanan diberi tanda <code className="text-amber-400 font-bold">[TEST]</code> agar omzet toko tetap akurat.
                        </p>
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <input
                              type="radio"
                              name="adminDirectConfirm"
                              checked={adminDirectConfirm}
                              onChange={() => setAdminDirectConfirm(true)}
                              className="accent-amber-500"
                            />
                            <span>
                              <strong className="text-amber-400">Langsung Lunas</strong> &amp; Terbitkan Tiket Produksi di Kanban
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <input
                              type="radio"
                              name="adminDirectConfirm"
                              checked={!adminDirectConfirm}
                              onChange={() => setAdminDirectConfirm(false)}
                              className="accent-amber-500"
                            />
                            <span>
                              <strong className="text-blue-400">Antrean Review Desain</strong> (Simulasi alur ACC admin)
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-muted">
                        Saklar OFF: Anda bertindak sebagai pembeli biasa 100% (alur normal QRIS & OTP).
                      </p>
                    )}
                  </div>
                )}

                {/* Primary Action CTA — Desktop & Mobile Tahap 2 */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 px-5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas shadow-lg ${
                      adminBypassActive
                        ? "bg-amber-500 text-black hover:brightness-110 shadow-amber-500/20"
                        : "bg-brand-accent text-canvas hover:brightness-110 shadow-brand-accent/25"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>MENGIRIM PESANAN...</span>
                      </>
                    ) : adminBypassActive ? (
                      <>
                        <ShieldCheck size={16} className="stroke-[2.5]" />
                        <span>PESAN UJI COBA (BYPASS RP 0)</span>
                        <ArrowRight size={14} />
                      </>
                    ) : isCustomOrder ? (
                      <>
                        <Sparkles size={15} />
                        <span>AJUKAN DESAIN KE WORKSHOP</span>
                        <ArrowRight size={14} />
                      </>
                    ) : (
                      <>
                        <CreditCard size={15} />
                        <span>BAYAR SEKARANG (DIRECT QRIS)</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <ShopClosedNotice />
                  <div className="pt-2 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-mono font-bold text-text-muted">
                      {["QRIS", "BCA", "MANDIRI", "BRI", "BNI", "GOPAY", "OVO", "DANA", "SHOPEEPAY"].map((brand) => (
                        <span key={brand} className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle tracking-wider">
                          {brand}
                        </span>
                      ))}
                    </div>
                    <p className="text-center font-sans text-[10px] text-text-muted flex items-center justify-center gap-1.5">
                      <Lock size={11} className="text-emerald-400 shrink-0" />
                      <span>
                        {adminBypassActive
                          ? "Mode pengujian admin — transaksi simulasi internal"
                          : "QRIS Dinamis Resmi BI · Langsung Muncul di Layar · Bebas Biaya"}
                      </span>
                    </p>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleBackToAddress}
                        className="text-xs text-text-muted hover:text-text-primary underline font-medium cursor-pointer"
                      >
                        ← Kembali ke Ubah Alamat &amp; Kurir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

          {/* AuthModal untuk tamu yang ingin masuk akun saat checkout */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          {/* Modal Pemilihan Titik Lokasi Peta (Leaflet + OpenStreetMap) */}
          <LocationPickerModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            initialCoords={gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lon } : null}
            onSelectLocation={handleLocationPicked}
            title={deliveryMethod === "FREE_MAKASSAR" ? "Tentukan Titik Antar di Kota Makassar" : "Tentukan Titik Pengantaran di Peta"}
          />
        </div>
      </div>,
      document.body
    );
  };
