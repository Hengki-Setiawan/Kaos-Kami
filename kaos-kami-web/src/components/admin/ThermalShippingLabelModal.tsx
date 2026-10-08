"use client";

import React, { useRef } from "react";
import { X, Printer, Package, MapPin, Phone, Truck } from "lucide-react";
import { SHOP_WORKSHOP_ADDRESS, SHOP_CONTACT_WHATSAPP } from "@/lib/shop";

export interface DeliveryLabelOrder {
  id: string;
  orderNumber: string;
  trackingNumber: string | null;
  deliveryMethod: string;
  courierNotes: string | null;
  user: {
    name: string;
    phoneNumber: string | null;
  };
  shippingAddress: any;
  items: {
    snapshotName?: string;
    snapshotSize?: string;
    snapshotColorName?: string;
    quantity: number;
    productVariant?: any;
  }[];
}

interface ThermalShippingLabelModalProps {
  order: DeliveryLabelOrder;
  onClose: () => void;
}

export function ThermalShippingLabelModal({ order, onClose }: ThermalShippingLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const recipientName =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.recipientName) ||
    order.user?.name ||
    "Pelanggan";

  const rawPhone =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.phoneNumber) ||
    order.user?.phoneNumber ||
    "—";

  const fullAddress =
    typeof order.shippingAddress === "object" && order.shippingAddress
      ? [
          order.shippingAddress.fullAddress,
          order.shippingAddress.district ? `Kec. ${order.shippingAddress.district}` : null,
          order.shippingAddress.city || "Makassar",
          order.shippingAddress.province,
          order.shippingAddress.postalCode,
        ]
          .filter(Boolean)
          .join(", ")
      : typeof order.shippingAddress === "string" && order.shippingAddress.trim()
      ? order.shippingAddress
      : "Alamat tidak dicantumkan";

  const totalPcs = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-surface border border-border-subtle rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Controls (Hidden when Printing) */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between print:hidden">
          <div>
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wide flex items-center gap-2">
              <Printer size={16} className="text-brand-accent" />
              <span>Label Resi Pengiriman (Thermal 100×150 mm)</span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Siap cetak ke printer thermal resi ekspedisi atau kertas A6.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-brand-accent text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
            >
              <Printer size={13} />
              <span>Cetak Label</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Thermal Label Sheet (Standard 4x6 / 100x150 mm Format) */}
        <div className="p-6 overflow-y-auto max-h-[75vh] flex justify-center bg-canvas print:p-0 print:bg-white print:max-h-none">
          <div
            ref={printRef}
            className="w-[380px] bg-white text-black p-5 border-2 border-black rounded-lg space-y-3 font-mono text-xs shadow-md print:w-full print:border-2 print:border-black print:shadow-none print:rounded-none"
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-black pb-2 flex justify-between items-start">
              <div>
                <h1 className="text-base font-black tracking-tight uppercase leading-tight">
                  KAOS KAMI MAKASSAR
                </h1>
                <p className="text-[10px] text-gray-700 font-bold">
                  SABLON DTF & APPAREL MAKASSAR
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black uppercase block">
                  {order.deliveryMethod === "FREE_MAKASSAR"
                    ? "KURIR INTERNAL"
                    : order.deliveryMethod === "PICKUP"
                    ? "PICKUP WORKSHOP"
                    : "EKSPEDISI"}
                </span>
                <span className="text-[9px] text-gray-600 block">
                  {new Date().toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>

            {/* Tracking / Order Barcode Simulation */}
            <div className="p-2 border border-black text-center bg-gray-50 space-y-0.5">
              <span className="text-[10px] text-gray-600 uppercase block font-sans">
                {order.trackingNumber ? "NOMOR RESI PELACAKAN:" : "NOMOR PESANAN:"}
              </span>
              <span className="text-base font-black tracking-widest block font-mono select-all">
                {order.trackingNumber || order.orderNumber}
              </span>
              <span className="text-[9px] text-gray-500 block">
                Ref: {order.orderNumber}
              </span>
            </div>

            {/* Recipient Details */}
            <div className="border-b border-black pb-2 space-y-1">
              <span className="text-[10px] text-gray-600 uppercase font-sans font-bold block">
                PENERIMA:
              </span>
              <p className="text-sm font-black text-black">{recipientName}</p>
              <p className="text-xs font-bold text-black">{rawPhone}</p>
              <p className="text-xs text-black leading-snug pt-0.5">{fullAddress}</p>
              {order.courierNotes && (
                <p className="text-[10px] font-bold text-gray-800 italic pt-1">
                  Catatan: {order.courierNotes}
                </p>
              )}
            </div>

            {/* Sender Details */}
            <div className="border-b border-black pb-2 text-[10px] space-y-0.5 text-gray-800">
              <span className="text-[10px] text-gray-600 uppercase font-sans font-bold block">
                PENGIRIM:
              </span>
              <p className="font-bold text-black">Workshop Kaos Kami Makassar</p>
              <p>Alamat: {SHOP_WORKSHOP_ADDRESS}</p>
              <p>WhatsApp: +{SHOP_CONTACT_WHATSAPP}</p>
            </div>

            {/* Items Checklist */}
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between font-bold border-b border-gray-400 pb-0.5">
                <span>ISI PAKET</span>
                <span>TOTAL: {totalPcs} PCS</span>
              </div>
              <ul className="space-y-0.5 pt-0.5 text-[10px]">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span className="truncate pr-2">
                        [ ] {it.snapshotName || "Kaos Sablon DTF"} ({it.snapshotSize || "-"} / {it.snapshotColorName || "-"})
                      </span>
                      <span className="font-bold shrink-0">{it.quantity} pcs</span>
                    </li>
                  ))
                ) : (
                  <li>[ ] 1x Kaos Sablon DTF Kaos Kami</li>
                )}
              </ul>
            </div>

            {/* Footer QR / Sign */}
            <div className="pt-2 border-t-2 border-black flex justify-between items-center text-[9px] text-gray-600">
              <span>QC Workshop: PASSED</span>
              <span>www.kaoskami.biz.id</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden when Printing) */}
        <div className="p-3 bg-canvas border-t border-border-subtle flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-bold text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-brand-accent text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
          >
            <Printer size={13} />
            <span>Cetak Thermal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
