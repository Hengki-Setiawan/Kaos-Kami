"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  MAKASSAR_DELIVERY_OPTIONS,
  MAKASSAR_SUBDISTRICTS,
  WORKSHOP_LOCATION,
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
  ShieldCheck,
  AlertCircle,
  Package,
  Store,
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { AuthModal } from "@/components/ui/AuthModal";
import { useCartStore } from "@/store/useCartStore";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { fetchJson } from "@/lib/fetchJson";
import { fetchServerPriceMap, formatIdr } from "@/lib/cartPriceRefresh";
import { getMasterDataUrl, isHttpsMasterUrl } from "@/lib/imageEditPipeline";
import { normalizePhoneId } from "@/lib/phone";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutMode?: "custom-3d" | "cart";
}

// P0-2: Idempotency-Key UNIK per klik BAYAR
function newIdempotencyKey(): string {
  try {
    const u = globalThis?.crypto?.randomUUID?.();
    if (typeof u === "string" && u.length >= 8) return u;
  } catch {}
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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

  // Session & Auth Gate
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PICKUP");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sessionUser = session?.user as any;
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
    source: "live" | "zone";
    zoneId?: string;
    courierCode?: string;
    serviceCode?: string;
  }
  const [destQuery, setDestQuery] = useState("");
  const [locSuggest, setLocSuggest] = useState<{ postalCode: string; label: string }[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedPostal, setSelectedPostal] = useState("");
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [quoteSource, setQuoteSource] = useState<"live" | "zone" | "">("");
  const [selectedQuoteKey, setSelectedQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartPriceNotice, setCartPriceNotice] = useState<{ oldTotal: number; newTotal: number; diff: number } | null>(null);
  const [cartPriceChecking, setCartPriceChecking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prefill otomatis saat akun login terdeteksi
  useEffect(() => {
    if (session?.user) {
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
    }
  }, [session, recipientName, email, phoneNumber]);

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
      const data = await fetchJson<{ success?: boolean; mock?: boolean; code?: string }>("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: norm }),
      });
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

  // Cek ongkir kurir
  const handleCheckOngkir = async () => {
    setQuoteMsg(null);
    if (!selectedPostal && destQuery.trim().length < 2) {
      setQuoteMsg("Pilih kota dari saran atau ketik manual min. 2 huruf.");
      return;
    }
    setQuoteLoading(true);
    try {
      const params = new URLSearchParams({
        city: destQuery.trim(),
        weightGrams: String(Math.max(250, totalQty * 250)),
      });
      if (selectedPostal) params.set("postalCode", selectedPostal);
      const j = await fetchJson<any>(`/api/shipping/quote?${params.toString()}`, undefined, 20000);
      if (j.source === "live" && Array.isArray(j.rates)) {
        setQuoteSource("live");
        const opts: QuoteOption[] = j.rates.map((x: any) => ({
          key: `live:${x.courierCode}:${x.serviceCode}`,
          courier: x.courierName,
          service: x.serviceName,
          cost: x.costIdr,
          etd: x.etdText,
          source: "live" as const,
          courierCode: x.courierCode,
          serviceCode: x.serviceCode,
        }));
        setQuotes(opts);
        setSelectedQuoteKey(opts[0]?.key || "");
        if (!opts.length) setQuoteMsg("Tarif tidak ditemukan untuk kode pos ini.");
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
            12000
          );
          const g = j?.result;
          if (g?.displayName) setFullAddress(g.displayName);
          if (g?.district && MAKASSAR_SUBDISTRICTS.includes(g.district)) setDistrict(g.district);
          if (g?.city && deliveryMethod === "EXPEDITION_MANUAL") handleDestSearch(g.city);
          setGpsMsg(g ? `Lokasi: ${[g.district, g.city].filter(Boolean).join(", ") || "terisi"}` : "Gagal membaca lokasi GPS.");
        } catch (e: any) {
          setGpsMsg(e?.message || "Gagal membaca lokasi GPS.");
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

  const effectiveSubtotal = isCartCheckout ? getCartTotalPrice() : pricing.totalPriceIdr;
  const grandTotal = effectiveSubtotal + shippingCost;

  if (!isOpen || !isClient || typeof document === "undefined") return null;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Wajib Login Gate
    if (!session?.user) {
      setIsAuthModalOpen(true);
      return;
    }

    const normPhone = normalizePhoneId(phoneNumber);
    if (normPhone) setPhoneNumber(normPhone);

    if (!recipientName.trim()) {
      setErrorMessage("Nama lengkap penerima wajib diisi.");
      return;
    }
    if (!normPhone || normPhone.replace(/[^0-9]/g, "").length < 9) {
      setErrorMessage("Nomor WhatsApp tidak valid (contoh: 081234567890).");
      return;
    }
    if (deliveryMethod !== "PICKUP" && !fullAddress.trim()) {
      setErrorMessage("Alamat lengkap pengiriman wajib diisi.");
      return;
    }
    if (deliveryMethod === "EXPEDITION_MANUAL" && !selectedQuote) {
      setErrorMessage("Silakan cek ongkir & pilih kurir ekspedisi terlebih dahulu.");
      return;
    }

    // Blokir produk belum siap order
    const slugs: string[] = isCartCheckout
      ? (cartItems as any[]).map((it) => String(it?.apparelSlug ?? ""))
      : [String(activeApparel)];
    const blocked = slugs.find((s) => !APPAREL_CATALOG[s as ApparelType]?.orderable);
    if (blocked) {
      const opt = APPAREL_CATALOG[blocked as ApparelType];
      setErrorMessage(
        opt
          ? `${opt.name} belum bisa dipesan saat ini.`
          : `Apparel "${blocked}" tidak dikenal.`
      );
      return;
    }

    const sessionUser = session?.user as any;
    const cleanPhone = (p?: string | null) => (p || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const isAccountPhoneVerified =
      Boolean(sessionUser?.phoneVerified) &&
      Boolean(sessionUser?.phoneNumber) &&
      Boolean(normPhone) &&
      cleanPhone(normPhone) === cleanPhone(sessionUser?.phoneNumber);

    if (!isAccountPhoneVerified && !/^\d{6}$/.test(otpCode.trim())) {
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
        email: email || session.user.email || undefined,
        otpCode: isAccountPhoneVerified ? undefined : otpCode.trim(),
        deliveryMethod,
        turnaroundTier,
        district: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : deliveryMethod !== "PICKUP" ? district : undefined,
        destinationCity: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : undefined,
        destinationPostalCode: deliveryMethod === "EXPEDITION_MANUAL" && selectedPostal ? selectedPostal : undefined,
        expeditionZoneId: selectedQuote?.source === "zone" ? selectedQuote.zoneId : undefined,
        expeditionCourier: selectedQuote?.source === "live" ? selectedQuote.courierCode : undefined,
        expeditionService: selectedQuote?.source === "live" ? selectedQuote.serviceCode : undefined,
        fullAddress: deliveryMethod === "PICKUP" ? "Workshop Kaos Kami Makassar (Self Pick-up)" : fullAddress,
        courierNotes,
        items: itemsPayload,
        turnstileToken: turnstileToken || undefined,
        couponCode: couponCode.trim() || undefined,
      };

      const data = await fetchJson<{
        orderId: string;
        reference?: string;
        paymentUrl?: string;
        invoiceUrl?: string;
        orderNumber?: string;
      }>("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey() },
        body: JSON.stringify(payload),
      }, 30000);

      const clearCartOnConfirmed = () => {
        if (isCartCheckout) clearCart();
      };

      const duitkuPay = () => {
        if (typeof window !== "undefined" && (window as any).checkout && data.reference) {
          try {
            (window as any).checkout.process(data.reference, {
              defaultLanguage: "id",
              successEvent: function () {
                clearCartOnConfirmed();
                window.location.href = `/orders/${data.orderId}?status=success`;
              },
              pendingEvent: function () {
                window.location.href = `/orders/${data.orderId}?status=pending`;
              },
              errorEvent: function () {
                window.location.href = `/orders/${data.orderId}?status=error`;
              },
              closeEvent: function () {
                window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
              },
            });
            return;
          } catch (e) {
            console.warn("Duitku pop error, fallback to URL:", e);
          }
        }

        clearCartOnConfirmed();
        if (data.paymentUrl && !data.paymentUrl.includes("mock")) {
          window.location.href = data.paymentUrl;
        } else {
          window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
        }
      };

      duitkuPay();
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

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout pesanan sablon DTF"
    >
      <div
        ref={panelRef}
        data-lenis-prevent="true"
        className="relative w-full max-w-4xl lg:max-w-5xl max-h-[94dvh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden"
      >
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-accent via-amber-500 to-brand-accent" />

        {/* Header Modal */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-border-subtle flex items-center justify-between bg-surface/90 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 shadow-[0_0_12px_rgba(230,81,0,0.2)]">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-tight text-text-primary truncate">
                CHECKOUT PESANAN SABLON DTF
              </h2>
              <p className="font-mono text-[10px] sm:text-[11px] text-text-muted truncate">
                Workshop Makassar · Jaminan Kualitas Sablon DTF & Cotton Combed
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-border-subtle transition-all flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY CONTAINER */}
        {!session?.user ? (
          /* AUTH REQUIRED GATE */
          <div className="p-8 sm:p-14 text-center flex flex-col items-center justify-center space-y-4 my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center shadow-[0_0_24px_rgba(230,81,0,0.25)]">
              <User size={30} />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-text-primary">
                Login Diperlukan untuk Checkout
              </h3>
              <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed">
                Masuk atau daftar akun terlebih dahulu agar pesanan sablon otomatis tersimpan di portal akun Anda dan status produksi dapat dipantau langsung.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="mt-2 px-8 py-3.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(230,81,0,0.4)] flex items-center space-x-2 cursor-pointer"
            >
              <User size={15} />
              <span>MASUK / DAFTAR AKUN</span>
            </button>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
          </div>
        ) : (
          /* FULL 2-COLUMN CHECKOUT FORM */
          <form
            onSubmit={handleCheckoutSubmit}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6 md:space-y-0 md:grid md:grid-cols-12 md:gap-7 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-brand-accent/30"
          >
            {/* LEFT COLUMN: Data Pemesan, WhatsApp & Pengiriman (7 Cols) */}
            <div className="md:col-span-7 space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Connected User Account Banner */}
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent flex items-center justify-center font-bold text-xs shrink-0">
                    {session.user.name?.[0]?.toUpperCase() || <User size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-text-primary truncate">
                      {session.user.name || "Akun Pelanggan"}
                    </p>
                    <p className="font-mono text-[10px] text-text-muted truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  <span>Akun Terhubung</span>
                </span>
              </div>

              {/* Section 1: Customer Contact & WhatsApp OTP */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-text-primary uppercase tracking-wider pb-1 border-b border-border-subtle">
                  <Phone size={13} className="text-brand-accent" />
                  <span>1 · INFORMASI PEMESAN & WHATSAPP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Sultan Hasanuddin"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-mono text-[11px] text-text-muted uppercase">
                        Nomor WhatsApp *
                      </label>
                      {isAccountPhoneVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
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
                        className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-sm text-text-primary font-mono focus:outline-none transition-colors"
                      />
                      {!isAccountPhoneVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !phoneNumber || resendCooldown > 0}
                          className="px-3 py-2 rounded-xl bg-surface border border-brand-accent/40 text-brand-accent text-[11px] font-mono font-bold hover:bg-brand-accent hover:text-canvas disabled:opacity-50 transition-all shrink-0 cursor-pointer"
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
                    ) : sessionUser?.phoneVerified && sessionUser?.phoneNumber && cleanPhone(phoneNumber) !== cleanPhone(sessionUser?.phoneNumber) ? (
                      <p className="text-[11px] font-sans text-amber-400/90 mt-1.5 flex items-center gap-1.5 bg-amber-950/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                        <span>⚠️ Nomor baru terdeteksi. Silakan klik KIRIM OTP untuk memverifikasi nomor baru ini.</span>
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
                            className="w-full px-3.5 py-2 rounded-xl bg-surface border border-brand-accent/60 text-sm text-text-primary font-mono tracking-widest focus:outline-none"
                            maxLength={6}
                          />
                          {otpCode.length === 6 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-emerald-400 text-xs font-mono font-bold">
                              <CheckCircle2 size={15} />
                              <span className="text-[10px]">SIAP</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {!isAccountPhoneVerified && otpMsg && (
                      <p className="text-[11px] font-mono mt-1 text-amber-400" role="status">
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

              {/* Section 2: Delivery Method (3 Symmetric Cards) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-text-primary uppercase tracking-wider pb-1 border-b border-border-subtle">
                  <Truck size={13} className="text-brand-accent" />
                  <span>2 · METODE PENGIRIMAN</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {MAKASSAR_DELIVERY_OPTIONS.map((opt) => {
                    const isSelected = deliveryMethod === opt.method;
                    return (
                      <label
                        key={opt.method}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? "bg-brand-accent/15 border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.2)]"
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
                            <span className="font-mono text-xs font-bold text-text-primary">
                              {opt.method === "PICKUP"
                                ? "Ambil Sendiri"
                                : opt.method === "FREE_MAKASSAR"
                                ? "Kurir Internal"
                                : "Ekspedisi"}
                            </span>
                          </div>
                          {opt.method === "FREE_MAKASSAR" && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                              GRATIS
                            </span>
                          )}
                          {opt.method === "PICKUP" && (
                            <span className="text-[10px] font-mono text-text-muted">
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
                    <div className="flex items-center space-x-2 text-brand-accent font-mono text-xs font-bold">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent text-[11px] font-mono font-bold transition-colors"
                      >
                        <MapPin size={13} />
                        Buka Titik Lokasi di Google Maps (Navigasi) ↗
                      </a>
                    </div>
                    <p className="font-mono text-[10px] text-text-muted">
                      🕒 Jam Operasional: {WORKSHOP_LOCATION.operatingHours}. Pesanan siap diambil setelah notifikasi selesai produksi.
                    </p>
                  </div>
                )}

                {deliveryMethod === "FREE_MAKASSAR" && (
                  <div className="space-y-3 pt-1 animate-fadeIn">
                    <div>
                      <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                        Kecamatan di Kota Makassar *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-mono text-text-primary focus:outline-none"
                        >
                          {MAKASSAR_SUBDISTRICTS.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleUseGps}
                          disabled={gpsLoading}
                          className="px-3 py-2 rounded-xl bg-surface border border-border-subtle text-[11px] font-mono text-brand-accent hover:bg-brand-accent/10 disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <MapPin size={13} />
                          <span>{gpsLoading ? "BACA GPS..." : "GPS"}</span>
                        </button>
                      </div>
                      {gpsMsg && <p className="font-mono text-[10px] text-text-muted mt-1">{gpsMsg}</p>}
                      {gpsCoords && (
                        <div className="mt-1">
                          <a
                            href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-accent hover:underline"
                          >
                            <span>Buka titik di Google Maps</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                        Alamat Lengkap Pengiriman *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        placeholder="Nama jalan, nomor rumah, RT/RW, patokan lokasi"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                        Catatan Kurir (Opsional)
                      </label>
                      <input
                        type="text"
                        value={courierNotes}
                        onChange={(e) => setCourierNotes(e.target.value)}
                        placeholder="e.g. Rumah pagar hitam, depan warkop"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {deliveryMethod === "EXPEDITION_MANUAL" && (
                  <div className="p-3.5 rounded-xl bg-surface border border-brand-accent/40 space-y-3 animate-fadeIn">
                    <div>
                      <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
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
                          onClick={handleCheckOngkir}
                          disabled={quoteLoading}
                          className="px-3.5 py-2 rounded-xl bg-brand-accent text-canvas font-mono text-[11px] font-bold disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {quoteLoading ? "MENGECEK..." : "CEK ONGKIR"}
                        </button>
                      </div>
                      {locLoading && <p className="font-mono text-[10px] text-text-muted mt-1">Mencari lokasi...</p>}
                      {locSuggest.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {locSuggest.map((l) => (
                            <button
                              key={`${l.postalCode}-${l.label}`}
                              type="button"
                              onClick={() => {
                                setDestQuery(l.label.split(",")[0] || l.label);
                                setSelectedPostal(l.postalCode);
                                setLocSuggest([]);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent font-mono text-[11px] text-text-primary flex justify-between cursor-pointer"
                            >
                              <span>{l.label}</span>
                              <span className="text-brand-accent font-bold">{l.postalCode}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {quoteMsg && <p className="font-mono text-[11px] text-rose-300">{quoteMsg}</p>}
                    {quoteSource === "zone" && (
                      <p className="font-mono text-[10px] text-amber-400">
                        Tarif estimasi tabel zona. Nilai final divalidasi server saat bayar.
                      </p>
                    )}

                    {quotes.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-mono text-[10px] text-text-muted uppercase">PILIH LAYANAN KURIR:</label>
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
                                <p className="font-mono text-xs font-bold text-text-primary truncate">
                                  {q.courier} {q.service}
                                </p>
                                <p className="font-mono text-[10px] text-text-muted">Estimasi {q.etd}</p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                              Rp {q.cost.toLocaleString("id-ID")}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                        Alamat Lengkap Pengiriman *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle focus:border-brand-accent text-xs font-sans text-text-primary focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Ringkasan Produk, Biaya & Tombol Bayar (5 Cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="md:sticky md:top-0 space-y-4">
                {/* Order Summary Box */}
                <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="font-bold text-text-primary uppercase flex items-center gap-1.5">
                      <Sparkles size={13} className="text-brand-accent" />
                      <span>{isCartCheckout ? `KERANJANG (${cartItems.length})` : "PRODUK KUSTOM"}</span>
                    </span>
                    <span className="text-brand-accent font-bold">
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
                          <span className="text-text-primary font-bold shrink-0">
                            Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="font-display font-bold text-sm uppercase text-text-primary">
                          {activeApparel} (SABLON DTF)
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
                          <span className="opacity-75 block text-[9px]">BAHAN:</span>
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
                            {useCustomSizeBreakdown ? "✓ Rincian Ukuran Aktif" : "⚡ Bagi Ukuran (S–XXL)"}
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
                <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1.5 font-mono text-xs">
                  <label htmlFor="coupon-input" className="block text-[11px] text-text-muted uppercase">
                    Kode Kupon Diskon (Opsional)
                  </label>
                  <input
                    id="coupon-input"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32))}
                    placeholder="Contoh: PROMO10"
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary uppercase placeholder:normal-case placeholder:text-text-muted text-xs focus:border-brand-accent focus:outline-none"
                  />
                </div>

                {/* Cost Breakdown & Total */}
                <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal Kaos & Sablon ({totalQty} pcs)</span>
                    <span>Rp {effectiveSubtotal.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between text-text-muted">
                    <span>
                      Ongkos Kirim {deliveryMethod === "FREE_MAKASSAR" ? "(Gratis Makassar)" : ""}
                    </span>
                    <span className={shippingCost === 0 ? "text-emerald-400 font-bold" : ""}>
                      {shippingCost === 0 ? "Rp 0" : `Rp ${shippingCost.toLocaleString("id-ID")}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2.5 border-t border-border-subtle">
                    <span className="font-bold text-text-primary text-xs">TOTAL PEMBAYARAN:</span>
                    <span className="text-brand-accent font-bold text-xl tracking-tight">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Turnstile Anti-bot */}
                {turnstileEnabled && (
                  <TurnstileWidget
                    onVerify={(t) => setTurnstileToken(t)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                    size="flexible"
                  />
                )}

                {/* Desktop Primary Action CTA */}
                <div className="hidden md:block space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas shadow-[0_0_20px_rgba(230,81,0,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>MEMPROSES PEMBAYARAN...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={15} />
                        <span>BAYAR VIA QRIS</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <p className="text-center font-mono text-[10px] text-text-muted flex items-center justify-center gap-1">
                    <Lock size={11} className="text-emerald-400" />
                    <span>Pembayaran Instan & Aman via QRIS / Duitku</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Bottom Sticky Bar (< md) */}
            <div className="md:hidden sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 bg-surface/95 border-t border-border-subtle backdrop-blur-xl flex items-center justify-between gap-3 shadow-2xl z-20">
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase">TOTAL BAYAR</p>
                <p className="text-base font-mono font-bold text-brand-accent">
                  Rp {grandTotal.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="py-2.5 px-5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>MEMPROSES...</span>
                  </>
                ) : (
                  <>
                    <span>BAYAR SEKARANG</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
