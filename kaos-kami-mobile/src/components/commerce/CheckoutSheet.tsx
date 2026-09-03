"use client";

import React, { useState } from 'react';
import { Check, ShieldCheck, MapPin, QrCode, CreditCard, Truck, ChevronRight } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { useMobileCartStore } from '@/store/useMobileCartStore';
import { MAKASSAR_DELIVERY_OPTIONS, DeliveryOption } from '@/lib/shipping/deliveryOptionsMobile';
import { haptic } from '@/lib/bridge/haptics';

export interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderSuccess: (orderId: string) => void;
}

export function CheckoutSheet({ open, onOpenChange, onOrderSuccess }: CheckoutSheetProps) {
  const { items, getSubtotal, clearCart } = useMobileCartStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [customerName, setCustomerName] = useState('Hengki Setiawan');
  const [customerPhone, setCustomerPhone] = useState('0882020685076');
  const [customerAddress, setCustomerAddress] = useState('Jl. Perintis Kemerdekaan KM 10, Tamalanrea, Makassar');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption>(MAKASSAR_DELIVERY_OPTIONS[0]);
  const [selectedPayment, setSelectedPayment] = useState<'QRIS' | 'VA_BCA' | 'MAXIM_COD'>('QRIS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = getSubtotal();
  const deliveryFee = selectedDelivery.price;
  const grandTotal = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    haptic.tapHeavy();

    setTimeout(() => {
      const newOrderId = `KK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      setIsSubmitting(false);
      clearCart();
      haptic.success();
      onOpenChange(false);
      onOrderSuccess(newOrderId);
    }, 1200);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={step === 1 ? 'Data Penerima' : step === 2 ? 'Pengiriman Makassar' : 'Metode Pembayaran'}
      description="Pesanan akan diverifikasi oleh Admin Workshop sebelum pembayaran dibuka."
    >
      <div className="space-y-4 py-2 pb-6">
        {/* Step Indicator Tabs */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-800">
          {[
            { num: 1, label: 'Alamat' },
            { num: 2, label: 'Kurir' },
            { num: 3, label: 'Bayar' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num <= step) setStep(s.num as any);
              }}
              className={`flex items-center gap-1.5 text-xs cursor-pointer ${
                step === s.num ? 'text-[#FF6B35] font-bold' : 'text-zinc-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ========================================================= */}
        {/* STEP 1: ALAMAT MAKASSAR */}
        {/* ========================================================= */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Nama Lengkap:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Nomor WhatsApp (Aktif):</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Alamat Pengiriman (Kota Makassar):</label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs outline-none focus:border-[#FF6B35]"
              />
            </div>

            <HapticButton
              variant="primary"
              onClick={() => setStep(2)}
              className="w-full mt-2"
            >
              <span>Lanjut ke Opsi Kurir</span>
              <ChevronRight className="w-4 h-4" />
            </HapticButton>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: OPSI KURIR MAKASSAR */}
        {/* ========================================================= */}
        {step === 2 && (
          <div className="space-y-2.5">
            {MAKASSAR_DELIVERY_OPTIONS.map((opt) => {
              const isSelected = selectedDelivery.id === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    haptic.selection();
                    setSelectedDelivery(opt);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-orange-500/30'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Syne']">
                      <Truck className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {opt.name}
                    </span>
                    <Badge variant={opt.price === 0 ? 'success' : 'neutral'}>
                      {opt.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">{opt.description}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Estimasi: {opt.estimatedTime}</p>
                </div>
              );
            })}

            <div className="flex gap-2 pt-2">
              <HapticButton
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1 text-xs"
              >
                Kembali
              </HapticButton>
              <HapticButton
                variant="primary"
                onClick={() => setStep(3)}
                className="flex-1 text-xs"
              >
                <span>Metode Bayar</span>
                <ChevronRight className="w-4 h-4" />
              </HapticButton>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: PEMBAYARAN & ORDER SUBMISSION */}
        {/* ========================================================= */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="space-y-2">
              {[
                { id: 'QRIS', title: 'QRIS Instant (Gojek, ShopeePay, Dana, BCA)', badge: 'Paling Populer', icon: QrCode },
                { id: 'VA_BCA', title: 'BCA Virtual Account (Otomatis)', badge: 'Verifikasi Otomatis', icon: CreditCard },
                { id: 'MAXIM_COD', title: 'Bayar Tunai ke Kurir Maxim (COD)', badge: 'Bayar saat Tiba', icon: ShieldCheck },
              ].map((pm) => {
                const isSelected = selectedPayment === pm.id;
                const Icon = pm.icon;
                return (
                  <div
                    key={pm.id}
                    onClick={() => {
                      haptic.selection();
                      setSelectedPayment(pm.id as any);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-orange-500/30'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-[#FF6B35]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{pm.title}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{pm.badge}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#FF6B35]" />}
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} Kaos):</span>
                <span className="text-white font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Ongkir ({selectedDelivery.name}):</span>
                <span className="text-emerald-400 font-medium">
                  {deliveryFee === 0 ? 'Gratis' : `Rp ${deliveryFee.toLocaleString('id-ID')}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-800 pt-1.5 mt-1 font-['Syne']">
                <span>Total Bayar:</span>
                <span className="text-[#FF6B35]">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Submit Button */}
            <HapticButton
              variant="primary"
              hapticStyle="success"
              loading={isSubmitting}
              onClick={handlePlaceOrder}
              className="w-full py-4 text-sm font-bold shadow-xl shadow-orange-600/40"
            >
              Ajukan Desain & Pesan Sekarang
            </HapticButton>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
