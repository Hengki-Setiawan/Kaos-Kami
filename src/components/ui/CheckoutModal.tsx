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

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const {
    activeApparel,
    selectedColor,
    activeColorName,
    selectedSize,
    decals,
    materialFinish,
  } = useConfiguratorStore();

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
  const [district, setDistrict] = useState(MAKASSAR_SUBDISTRICTS[0] || "Tamalanrea");
  const [fullAddress, setFullAddress] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [turnaroundTier, setTurnaroundTier] = useState<"REGULER" | "EXPRESS_24H">("REGULER");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const shippingCost = selectedDelivery?.costIdr || 0;

  const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
  const turnaroundSurcharge = selectedTurnaround?.surchargeIdr || 0;

  const grandTotal = pricing.totalPriceIdr + shippingCost + turnaroundSurcharge;

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

    try {
      setIsLoading(true);

      const payload = {
        recipientName,
        phoneNumber,
        email: email || undefined,
        deliveryMethod,
        turnaroundTier,
        district: deliveryMethod !== "PICKUP" ? district : undefined,
        fullAddress: deliveryMethod === "PICKUP" ? "Workshop Kaos Kami Makassar (Self Pick-up)" : fullAddress,
        courierNotes: useCustomSizeBreakdown
          ? `[RINCIAN UKURAN: ${Object.entries(sizeDistribution)
              .filter(([_, qty]) => qty > 0)
              .map(([s, q]) => `${s}=${q}pcs`)
              .join(", ")}] ${courierNotes}`.trim()
          : courierNotes,
        items: [
          {
            apparelSlug: activeApparel,
            colorHex: selectedColor,
            colorName: activeColorName,
            size: useCustomSizeBreakdown
              ? Object.entries(sizeDistribution)
                  .filter(([_, qty]) => qty > 0)
                  .map(([s, q]) => `${s}:${q}`)
                  .join("/")
              : selectedSize,
            quantity,
            decals,
            title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
          },
        ],
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

      // Check for window.snap (Midtrans Snap Script)
      if (typeof window !== "undefined" && (window as any).snap && data.snapToken) {
        (window as any).snap.pay(data.snapToken, {
          onSuccess: () => {
            window.location.href = `/orders/${data.orderId}?status=success`;
          },
          onPending: () => {
            window.location.href = `/orders/${data.orderId}?status=pending`;
          },
          onError: () => {
            window.location.href = `/orders/${data.orderId}?status=error`;
          },
          onClose: () => {
            window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
          },
        });
      } else {
        // Fallback directly to invoice receipt page
        window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
      }
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
              <span className="font-bold text-white uppercase">{activeApparel} (Sablon DTF)</span>
              <span className="text-brand-accent font-bold">{pricing.formattedTotal}</span>
            </div>

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

            {/* Quantity Selector & Bulk Size Breakdown Matrix */}
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
                  Nomor WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white font-mono focus:outline-none"
                />
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
                        onChange={() => setDeliveryMethod(opt.method)}
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
                  </div>

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
                <span>Ongkos Kirim Flat Makassar</span>
                <span>Rp {shippingCost.toLocaleString("id-ID")}</span>
              </div>
            )}

            {turnaroundSurcharge > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Layanan Express 24 Jam</span>
                <span>+Rp {turnaroundSurcharge.toLocaleString("id-ID")}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm sm:text-base font-bold text-white">
              <span>TOTAL PEMBAYARAN:</span>
              <span className="text-brand-accent text-lg sm:text-xl">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas shadow-[0_0_20px_rgba(230,81,0,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>MEMPROSES MIDTRANS SNAP...</span>
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
