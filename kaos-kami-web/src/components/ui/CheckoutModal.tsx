"use client";

import React, { useState } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import {
  MAKASSAR_DELIVERY_OPTIONS,
  MAKASSAR_SUBDISTRICTS,
  PRODUCTION_TURNAROUND_OPTIONS,
  type DeliveryMethod,
} from "@/lib/shipping/deliveryOptions";
import { calculate6VariablePrice } from "@/lib/pricingEngine";
import {
  X,
  ShoppingBag,
  MapPin,
  Truck,
  Clock,
  CreditCard,
  Phone,
  User,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import { useCartStore } from "@/store/useCartStore";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutMode?: "custom-3d" | "cart";
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
  } = useConfiguratorStore();

  const { items: cartItems, getTotalPrice: getCartTotalPrice, clearCart } = useCartStore();

  const isCartCheckout = checkoutMode === "cart" && cartItems.length > 0;

  const [quantity, setQuantity] = useState(1);
  const [useCustomSizeBreakdown, setUseCustomSizeBreakdown] = useState(false);
  const [sizeDistribution, setSizeDistribution] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 1,
    XL: 0,
    XXL: 0,
    XXXL: 0,
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
  const [district, setDistrict] = useState(MAKASSAR_SUBDISTRICTS[0] || "Tallo");
  const [fullAddress, setFullAddress] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [turnaroundTier, setTurnaroundTier] = useState<"REGULER" | "EXPRESS_24H">("REGULER");
  // Kode kupon (opsional) — validasi + potongan 100% dihitung server.
  const [couponCode, setCouponCode] = useState("");
  // Ekspedisi luar kota: autocomplete kota→kode pos + daftar kurir server.
  // Harga tampil = estimasi; FINAL di-resolve server saat checkout.
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

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Token anti-bot Turnstile (opsional — wajib hanya bila server mengonfigurasi secret).
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  // WA OTP saat bayar (hemat Fonnte: cuma 1x per checkout, bukan per daftar)
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setOtpMsg("Isi WA dulu");
      return;
    }
    setIsSendingOtp(true);
    setOtpMsg(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        // Kode mock HANYA tampil di dev lokal; server prod tidak pernah mengirim code.
        const showMock = data.mock && data.code && process.env.NODE_ENV !== "production";
        setOtpMsg(showMock ? `Kode mock: ${data.code} (Fonnte mock)` : "Kode OTP terkirim ke WA");
      } else setOtpMsg(data.error || "Gagal kirim OTP");
    } catch {
      setOtpMsg("Gagal kirim OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setOtpMsg("Isi kode 6 digit");
      return;
    }
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPhoneVerified(true);
        setOtpMsg("✅ WA terverifikasi");
      } else setOtpMsg(data.error || "Kode salah");
    } catch {
      setOtpMsg("Gagal verifikasi");
    }
  };

  // Update total quantity when size distribution changes
  const handleSizeCountChange = (sizeKey: string, delta: number) => {
    const nextVal = Math.max(0, (sizeDistribution[sizeKey] || 0) + delta);
    const nextDist = { ...sizeDistribution, [sizeKey]: nextVal };
    setSizeDistribution(nextDist);
    const sum = Object.values(nextDist).reduce((a, b) => a + b, 0);
    setQuantity(Math.max(1, sum));
  };

  // Dynamic 6-Variable Pricing
  const pricing = calculate6VariablePrice({
    apparelSlug: activeApparel,
    size: selectedSize,
    colorHex: selectedColor,
    decals,
    quantity,
  });

  const selectedDelivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
  // Berat estimasi-mo: ±250g per pcs (konsisten dengan server).
  const totalQty = isCartCheckout
    ? cartItems.reduce((a, c: any) => a + (c.quantity || 0), 0)
    : quantity;
  const selectedQuote = quotes.find((q) => q.key === selectedQuoteKey) || null;
  const shippingCost =
    deliveryMethod === "EXPEDITION_MANUAL" && selectedQuote
      ? selectedQuote.cost
      : selectedDelivery?.costIdr || 0;

  // Autocomplete kota → kode pos (proxy server, key aman).
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
      const r = await fetch(`/api/shipping/locations?q=${encodeURIComponent(q.trim())}`);
      const j = await r.json();
      if (Array.isArray(j.locations)) setLocSuggest(j.locations.slice(0, 6));
      else setLocSuggest([]);
    } catch {
      setLocSuggest([]);
    } finally {
      setLocLoading(false);
    }
  };

  // Ambil daftar kurir (live bila key ada, else tabel zona).
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
      const r = await fetch(`/api/shipping/quote?${params.toString()}`);
      const j = await r.json();
      if (j.source === "live" && Array.isArray(j.rates)) {
        setQuoteSource("live");
        const opts: QuoteOption[] = j.rates.map((x: any, i: number) => ({
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
        setQuoteMsg(j.error || "Gagal cek ongkir.");
      }
    } catch {
      setQuoteMsg("Gagal cek ongkir. Coba lagi.");
    } finally {
      setQuoteLoading(false);
    }
  };

  // GPS via proxy server (bukan direct Nominatim dari browser).
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsMsg("GPS tidak didukung browser ini.");
      return;
    }
    setGpsLoading(true);
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const j = await r.json();
          const g = j?.result;
          if (g?.displayName) setFullAddress(g.displayName);
          if (g?.district && MAKASSAR_SUBDISTRICTS.includes(g.district)) setDistrict(g.district);
          if (g?.city && deliveryMethod === "EXPEDITION_MANUAL") handleDestSearch(g.city);
          setGpsMsg(g ? `Lokasi: ${[g.district, g.city].filter(Boolean).join(", ") || "terisi"}` : "Gagal baca lokasi. Isi manual.");
        } catch {
          setGpsMsg("Gagal baca lokasi. Isi manual.");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsMsg("Izin lokasi ditolak. Isi manual.");
      },
      { timeout: 15000, maximumAge: 60000 }
    );
  };

  const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
  const turnaroundSurcharge = selectedTurnaround?.surchargeIdr || 0;

  const effectiveSubtotal = isCartCheckout ? getCartTotalPrice() : pricing.totalPriceIdr;
  const grandTotal = effectiveSubtotal + shippingCost + turnaroundSurcharge;

  if (!isOpen) return null;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientName.trim()) {
      setErrorMessage("Nama penerima wajib diisi.");
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setErrorMessage("Nomor WhatsApp tidak valid.");
      return;
    }
    if (deliveryMethod !== "PICKUP" && !fullAddress.trim()) {
      setErrorMessage("Alamat lengkap pengiriman wajib diisi.");
      return;
    }
    if (deliveryMethod === "EXPEDITION_MANUAL" && !selectedQuote) {
      setErrorMessage("Cek ongkir & pilih kurir dulu untuk ekspedisi luar kota.");
      return;
    }

    try {
      setIsLoading(true);

      const itemsPayload = isCartCheckout
        ? cartItems.map((item) => ({
            apparelSlug: (item.apparelSlug as any) || "tshirt",
            productVariantId: item.productVariantId,
            colorHex: item.colorHex || "#121214",
            colorName: item.colorName || "Obsidian Black",
            size: item.size || "L",
            quantity: item.quantity,
            decals: [],
            title: item.name,
          }))
        : useCustomSizeBreakdown
        ? // Rincian ukuran = item terpisah per size agar surcharge size tepat.
          Object.entries(sizeDistribution)
            .filter(([_, qty]) => qty > 0)
            .map(([s, q]) => ({
              apparelSlug: activeApparel,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: s,
              quantity: q,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
            }))
        : [
            {
              apparelSlug: activeApparel,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: selectedSize,
              quantity,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
            },
          ];

      const payload = {
        recipientName,
        phoneNumber,
        email: email || undefined,
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

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || "Gagal memproses pesanan.");
        setIsLoading(false);
        return;
      }

      if (isCartCheckout) {
        clearCart();
      }

      // Trigger Duitku Pop Modal or redirect to paymentUrl
      const duitkuPay = () => {
        if (typeof window !== "undefined" && (window as any).checkout && data.reference) {
          try {
            (window as any).checkout.process(data.reference, {
              defaultLanguage: "id",
              successEvent: function () {
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

        // Fallback: Direct redirect to Duitku paymentUrl or Invoice
        if (data.paymentUrl && !data.paymentUrl.includes("mock")) {
          window.location.href = data.paymentUrl;
        } else {
          window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
        }
      };

      duitkuPay();
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan koneksi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#141416] border border-white/10 rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden">
        {/* Top Orange Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-accent via-amber-500 to-brand-accent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent">
              <ShoppingBag size={17} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
                CHECKOUT PESANAN SABLON DTF
              </h2>
              <p className="font-mono text-[11px] text-text-muted">
                UMKM Kaos Kami — Kota Makassar Hyperlocal Fulfillment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
            aria-label="Tutup checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Order Summary Card */}
          <div className="p-4 rounded-xl bg-surface/70 border border-white/5 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="font-bold text-white uppercase">
                {isCartCheckout ? `KERANJANG BELANJA (${cartItems.length} ITEM)` : `${activeApparel} (SABLON DTF)`}
              </span>
              <span className="text-brand-accent font-bold">
                Rp {effectiveSubtotal.toLocaleString("id-ID")}
              </span>
            </div>

            {isCartCheckout ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-1.5">
                    <div className="flex items-center space-x-2 truncate max-w-[240px]">
                      <span className="text-brand-accent font-bold">x{item.quantity}</span>
                      <span className="text-white truncate">{item.name}</span>
                      <span className="text-text-muted">({item.size})</span>
                    </div>
                    <span className="text-white font-bold shrink-0">
                      Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-text-muted">
                <div>
                  <span className="block opacity-75">WARNA:</span>
                  <span className="text-white font-bold">{activeColorName}</span>
                </div>
                <div>
                  <span className="block opacity-75">UKURAN:</span>
                  <span className="text-white font-bold">{selectedSize}</span>
                </div>
                <div>
                  <span className="block opacity-75">SABLON:</span>
                  <span className="text-white font-bold">{decals.length} Layer DTF</span>
                </div>
                <div>
                  <span className="block opacity-75">FINISH:</span>
                  <span className="text-white font-bold">{materialFinish.toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* Quantity Selector & Bulk Size Breakdown Matrix (Only for 3D single item) */}
            {!isCartCheckout && (
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-[11px]">TOTAL JUMLAH:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={useCustomSizeBreakdown}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-white text-sm">{quantity}</span>
                    <button
                      type="button"
                      disabled={useCustomSizeBreakdown}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUseCustomSizeBreakdown(!useCustomSizeBreakdown)}
                  className={`text-[10px] px-2 py-1 rounded border font-bold transition-all ${
                    useCustomSizeBreakdown
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-surface border-white/10 text-text-muted hover:text-white"
                  }`}
                >
                  {useCustomSizeBreakdown ? "✓ RINCIAN UKURAN AKTIF" : "⚡ BAGI UKURAN (S/M/L/XL)"}
                </button>
              </div>

              {/* Size Breakdown Matrix Grid (For Event / Class / Community) */}
              {useCustomSizeBreakdown && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fadeIn">
                  <span className="block text-[10px] text-text-muted">
                    Tentukan jumlah kaos per ukuran untuk workshop sablon:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {["S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
                      <div key={sz} className="p-2 rounded-lg bg-surface border border-white/5 text-center">
                        <span className="block text-[10px] font-bold text-text-muted">{sz}</span>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleSizeCountChange(sz, -1)}
                            className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-brand-accent"
                          >
                            -
                          </button>
                          <span className="font-bold text-white text-xs w-4">
                            {sizeDistribution[sz] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSizeCountChange(sz, 1)}
                            className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-brand-accent"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pricing.discountPercentage > 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex justify-between items-center">
                  <span>Diskon Grosir Komunitas/Lusinan ({pricing.discountPercentage}%)</span>
                  <span>-Rp {pricing.discountAmountIdr.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <User size={13} className="text-brand-accent" />
              <span>INFORMASI PEMESAN (GUEST / WHATSAPP)</span>
            </h3>

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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                  Nomor WhatsApp * {isPhoneVerified && <span className="text-emerald-400">✅ terverifikasi</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setIsPhoneVerified(false);
                      setOtpSent(false);
                    }}
                    placeholder="081234567890"
                    aria-label="Nomor WhatsApp untuk OTP"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !phoneNumber}
                    className="px-3 py-2.5 rounded-xl bg-surface border border-brand-accent/40 text-brand-accent text-xs font-mono font-bold hover:bg-brand-accent hover:text-canvas disabled:opacity-40"
                  >
                    {isSendingOtp ? "..." : otpSent ? "KIRIM ULANG" : "KIRIM OTP"}
                  </button>
                </div>
                {otpSent && !isPhoneVerified && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6 digit OTP"
                      aria-label="Kode OTP 6 digit dari WhatsApp"
                      className="flex-1 px-3 py-2 rounded-xl bg-surface border border-white/10 text-sm text-white font-mono focus:outline-none"
                      maxLength={6}
                    />
                    <button type="button" onClick={handleVerifyOtp} className="px-3 py-2 rounded-xl bg-brand-accent text-canvas text-xs font-bold">
                      VERIFIKASI
                    </button>
                  </div>
                )}
                {otpMsg && <p className="text-[11px] font-mono mt-1 text-amber-400">{otpMsg}</p>}
                <p className="text-[10px] font-mono text-text-muted mt-1">OTP cuma saat bayar (hemat Fonnte) — login Google/Email tanpa WA</p>
              </div>
            </div>
          </div>

          {/* Section 3: Hyperlocal Makassar Delivery Method */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Truck size={13} className="text-brand-accent" />
              <span>METODE PENGIRIMAN (MAKASSAR HYPERLOCAL)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MAKASSAR_DELIVERY_OPTIONS.map((opt) => (
                <label
                  key={opt.method}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    deliveryMethod === opt.method
                      ? "bg-brand-accent/15 border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.2)]"
                      : "bg-surface/50 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === opt.method}
                        onChange={() => {
                          setDeliveryMethod(opt.method);
                          setQuotes([]);
                          setSelectedQuoteKey("");
                          setQuoteMsg(null);
                        }}
                        className="accent-brand-accent"
                      />
                      <span className="font-mono text-xs font-bold text-white">{opt.name}</span>
                    </div>
                  </div>
                  <p className="font-sans text-[11px] text-text-muted mt-1 leading-snug">
                    {opt.description}
                  </p>
                </label>
              ))}
            </div>

            {/* Address fields (if not pickup) */}
            {deliveryMethod !== "PICKUP" && (
              <div className="pt-2 space-y-3 animate-fadeIn">
                {deliveryMethod === "EXPEDITION_MANUAL" ? (
                  <div className="p-3 rounded-xl bg-surface border border-brand-accent/40 space-y-2.5">
                    <label className="block font-mono text-[11px] text-text-muted uppercase">
                      Kota tujuan (luar Makassar) *
                    </label>
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => handleDestSearch(e.target.value)}
                      placeholder="cth: Gowa, Jakarta, Surabaya"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-brand-accent text-xs text-white focus:outline-none"
                    />
                    {locLoading && <p className="font-mono text-[11px] text-text-muted">Mencari kota...</p>}
                    {locSuggest.length > 0 && (
                      <div className="space-y-1">
                        {locSuggest.map((l) => (
                          <button
                            key={`${l.postalCode}-${l.label}`}
                            type="button"
                            onClick={() => {
                              setDestQuery(l.label.split(",")[0] || l.label);
                              setSelectedPostal(l.postalCode);
                              setLocSuggest([]);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-brand-accent font-mono text-[11px] text-white"
                          >
                            {l.label}{" "}
                            <span className="text-brand-accent font-bold">{l.postalCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCheckOngkir}
                      disabled={quoteLoading}
                      className="w-full py-2 rounded-lg bg-brand-accent text-canvas font-mono text-[11px] font-bold disabled:opacity-50"
                    >
                      {quoteLoading ? "MENGECEK..." : "CEK ONGKIR (PILIH TERMURAH)"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUseGps}
                      disabled={gpsLoading}
                      className="w-full py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-brand-accent disabled:opacity-50"
                    >
                      {gpsLoading ? "MEMBACA GPS..." : "📍 ISI KOTA DARI GPS HP"}
                    </button>
                    {gpsMsg && <p className="font-mono text-[10px] text-text-muted">{gpsMsg}</p>}
                    {quoteMsg && <p className="font-mono text-[11px] text-rose-300">{quoteMsg}</p>}
                    {quoteSource === "zone" && (
                      <p className="font-mono text-[10px] text-amber-400">
                        Tarif estimasi tabel (live belum aktif). Final dihitung server.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {quotes.map((q) => (
                        <label
                          key={q.key}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                            selectedQuoteKey === q.key
                              ? "bg-brand-accent/15 border-brand-accent"
                              : "bg-black/40 border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="expeditionQuote"
                              checked={selectedQuoteKey === q.key}
                              onChange={() => setSelectedQuoteKey(q.key)}
                              className="accent-brand-accent"
                            />
                            <div>
                              <p className="font-mono text-xs font-bold text-white">
                                {q.courier} {q.service}
                              </p>
                              <p className="font-mono text-[10px] text-text-muted">Estimasi {q.etd}</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            Rp {q.cost.toLocaleString("id-ID")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                  Kecamatan di Kota Makassar *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-xs font-mono text-white focus:outline-none"
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
                  className="mt-1.5 w-full py-1.5 rounded-lg bg-surface border border-white/10 text-[11px] font-mono text-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
                >
                  {gpsLoading ? "MEMBACA GPS..." : "📍 PAKAI LOKASI SAAT INI (GPS)"}
                </button>
                {gpsMsg && <p className="font-mono text-[10px] text-text-muted mt-1">{gpsMsg}</p>}
              </div>
                </div>
                )}

                  <div>
                    <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                      Catatan Patokan / Kurir (Opsional)
                    </label>
                    <input
                      type="text"
                      value={courierNotes}
                      onChange={(e) => setCourierNotes(e.target.value)}
                      placeholder="e.g. Dekat Pintu 1 Unhas / Pagar Putih"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white focus:outline-none font-sans"
                    />
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
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-xs font-sans text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Production Turnaround SLA (Reguler vs Express 24 Jam) */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock size={13} className="text-brand-accent" />
              <span>WAKTU PRODUKSI WORKSHOP (SLA)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRODUCTION_TURNAROUND_OPTIONS.map((sla) => (
                <label
                  key={sla.tier}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    turnaroundTier === sla.tier
                      ? "bg-brand-accent/15 border-brand-accent"
                      : "bg-surface/50 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="turnaroundTier"
                      checked={turnaroundTier === sla.tier}
                      onChange={() => setTurnaroundTier(sla.tier)}
                      className="accent-brand-accent"
                    />
                    <div>
                      <span className="font-mono text-xs font-bold text-white block">{sla.label}</span>
                      <span className="font-sans text-[11px] text-text-muted">{sla.description}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 5: Total Calculation & Submit Button */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal Kaos & Sablon ({quantity} pcs)</span>
              <span>Rp {pricing.totalPriceIdr.toLocaleString("id-ID")}</span>
            </div>

            {shippingCost > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>
                  Ongkos Kirim{deliveryMethod === "EXPEDITION_MANUAL" && selectedQuote ? ` (${selectedQuote.courier} ${selectedQuote.service})` : ""}
                </span>
                <span>Rp {shippingCost.toLocaleString("id-ID")}</span>
              </div>
            )}
            {deliveryMethod === "FREE_MAKASSAR" && (
              <div className="flex justify-between text-emerald-400">
                <span>Diantar tim kami — Gratis Makassar</span>
                <span>Rp 0</span>
              </div>
            )}

            {turnaroundSurcharge > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Layanan Express 24 Jam</span>
                <span>+Rp {turnaroundSurcharge.toLocaleString("id-ID")}</span>
              </div>
            )}

            {/* Kupon (opsional) — potongan dihitung & divalidasi server */}
            <div>
              <label htmlFor="coupon-code" className="block text-text-muted mb-1">
                Kode kupon (jika ada)
              </label>
              <input
                id="coupon-code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32))}
                placeholder="cth: HEMAT10"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white uppercase placeholder:normal-case placeholder:text-text-muted"
              />
              <p className="text-text-muted text-[11px] mt-1">
                Potongan dihitung otomatis oleh server saat bayar.
              </p>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm sm:text-base font-bold text-white">
              <span>TOTAL PEMBAYARAN:</span>
              <span className="text-brand-accent text-lg sm:text-xl">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Anti-bot Turnstile (aktif hanya bila site key dikonfigurasi) */}
          {turnstileEnabled && (
            <TurnstileWidget
              onVerify={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              size="flexible"
            />
          )}

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas shadow-[0_0_20px_rgba(230,81,0,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>MEMPROSES DUITKU...</span>
              </>
            ) : (
              <>
                <CreditCard size={15} />
                <span>BAYAR SEKARANG (QRIS / GO-PAY / VA)</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
